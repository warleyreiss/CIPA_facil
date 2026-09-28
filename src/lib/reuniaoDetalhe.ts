import { supabase } from './supabaseClient';
import type { Acao } from './acaoService';
import { textoDaAta } from './ataHtml';
import { extrairMensagemErro } from './errorUtils';
import type { MembroCipa, ReuniaoCipa } from './gestaoCipaService';
import { isoData } from './eleicao/etapasEleicao';

export type SituacaoPresenca = 'presente' | 'faltante' | 'justificado';

export type PresencaReuniao = {
  id?: string;
  reuniao_id: string;
  membro_id: string;
  situacao: SituacaoPresenca;
  justificativa: string | null;
};

export type LogReuniao = {
  id: string;
  reuniao_id: string;
  quando: string;
  evento: string;
  detalhe: string | null;
  apos_conclusao: boolean;
  versao_anterior?: string | null;
};

export type StatusVisual = 'agendada' | 'andamento' | 'aberta' | 'concluida' | 'cancelada';

const ROTULO: Record<StatusVisual, string> = {
  agendada: 'Agendada',
  andamento: 'Em andamento',
  aberta: 'Ata pendente',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export function statusVisual(reuniao: ReuniaoCipa, hoje = isoData(new Date())): { id: StatusVisual; rotulo: string } {
  if (reuniao.status === 'concluida') return { id: 'concluida', rotulo: ROTULO.concluida };
  if (reuniao.status === 'cancelada') return { id: 'cancelada', rotulo: ROTULO.cancelada };
  if (reuniao.data_reuniao > hoje) return { id: 'agendada', rotulo: ROTULO.agendada };
  if (reuniao.data_reuniao === hoje) return { id: 'andamento', rotulo: ROTULO.andamento };
  return { id: 'aberta', rotulo: ROTULO.aberta };
}

/** Quanto a reunião pesa na conformidade: concluída vale o critério inteiro; os demais status valem uma fração. */
export function pesoStatusReuniao(reuniao: ReuniaoCipa, hoje = isoData(new Date())): number {
  const visual = statusVisual(reuniao, hoje);
  if (visual.id === 'concluida') return 1;
  if (visual.id === 'cancelada') return 0;
  if (visual.id === 'andamento') return 0.6;
  if (visual.id === 'agendada') return 0.4;
  return reuniao.ata?.trim() ? 0.75 : 0.25;
}

function falhaDeColuna(erro: unknown): boolean {
  const texto = extrairMensagemErro(erro);
  return /schema cache|could not find the|PGRST204|PGRST205|does not exist/i.test(texto);
}

function falhar(erro: unknown): never {
  throw new Error(extrairMensagemErro(erro));
}

/** A súmula prevista é gravada como texto, um item por linha. */
export function itensSumula(reuniao: Pick<ReuniaoCipa, 'sumula' | 'pauta'>): string[] {
  return (reuniao.sumula || reuniao.pauta || '')
    .split(/\r?\n/)
    .map((linha) => linha.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function textoSumula(itens: string[]): string | null {
  const limpos = itens.map((item) => item.trim()).filter(Boolean);
  return limpos.length ? limpos.join('\n') : null;
}

export type AgendaReuniao = { horaInicio: string; horaFim: string; local: string };

/** Retorna true quando a base ainda não tem as colunas de horário e local. */
async function gravarAgenda(id: string, agenda: AgendaReuniao): Promise<boolean> {
  const { error } = await supabase
    .from('cipa_reunioes')
    .update({
      hora_inicio: agenda.horaInicio || null,
      hora_fim: agenda.horaInicio && agenda.horaFim ? agenda.horaFim : null,
      local: agenda.local.trim() || null,
    })
    .eq('id', id);
  if (!error) return false;
  if (falhaDeColuna(error)) return Boolean(agenda.horaInicio || agenda.horaFim || agenda.local.trim());
  falhar(error);
}

export async function criarReuniao(dados: {
  projetoId: string;
  data: string;
  tipo: ReuniaoCipa['tipo'];
  sumula: string[];
  agenda: AgendaReuniao;
}): Promise<{ id: string; agendaIgnorada: boolean }> {
  const texto = textoSumula(dados.sumula);
  const linha = { projeto_id: dados.projetoId, data_reuniao: dados.data, tipo: dados.tipo, pauta: texto };
  const inserir = (valores: Record<string, unknown>) =>
    supabase.from('cipa_reunioes').insert(valores).select('id').single();
  let resposta = await inserir({ ...linha, sumula: texto });
  if (resposta.error && falhaDeColuna(resposta.error)) resposta = await inserir(linha);
  if (resposta.error) falhar(resposta.error);
  const id = resposta.data.id as string;
  return { id, agendaIgnorada: await gravarAgenda(id, dados.agenda) };
}

export async function editarReuniao(
  id: string,
  dados: { data: string; tipo: ReuniaoCipa['tipo']; sumula: string[]; agenda: AgendaReuniao },
): Promise<{ agendaIgnorada: boolean }> {
  const texto = textoSumula(dados.sumula);
  const { error } = await supabase
    .from('cipa_reunioes')
    .update({ data_reuniao: dados.data, tipo: dados.tipo, pauta: texto })
    .eq('id', id);
  if (error) falhar(error);
  const extra = await supabase.from('cipa_reunioes').update({ sumula: texto }).eq('id', id);
  if (extra.error && !falhaDeColuna(extra.error)) falhar(extra.error);
  return { agendaIgnorada: await gravarAgenda(id, dados.agenda) };
}

export type AgendaPublica = {
  data_reuniao: string;
  tipo: ReuniaoCipa['tipo'];
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  sumula: string | null;
  status: string | null;
  empresa: string;
};

export async function buscarAgendaPublica(token: string): Promise<AgendaPublica | null> {
  const { data, error } = await supabase.rpc('agenda_reuniao', { p_token: token });
  if (error) {
    if (falhaDeColuna(error)) throw new Error('O link de agenda ainda não está ativo nesta base.');
    falhar(error);
  }
  const linhas = (data ?? []) as AgendaPublica[];
  return linhas[0] ?? null;
}

/** Depois da conclusão, o motivo vai junto e o banco guarda a versão anterior no histórico. */
export async function guardarTextoReuniao(reuniao: ReuniaoCipa, ata: string, motivo?: string): Promise<void> {
  const texto = ata.trim() || null;
  if (motivo?.trim()) {
    const { error } = await supabase
      .from('cipa_reunioes')
      .update({ ata: texto, motivo_alteracao: motivo.trim() })
      .eq('id', reuniao.id);
    if (!error) return;
    if (!falhaDeColuna(error)) falhar(error);
  }
  const { error } = await supabase.from('cipa_reunioes').update({ ata: texto }).eq('id', reuniao.id);
  if (error) falhar(error);
}

export async function concluirReuniao(id: string): Promise<void> {
  const { error } = await supabase
    .from('cipa_reunioes')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('id', id);
  if (!error) return;
  if (!falhaDeColuna(error)) falhar(error);
  throw new Error('A reunião foi guardada, mas a base ainda não aceita o status concluída. Atualize o banco da CIPA para gravar a conclusão.');
}

export async function cancelarReuniao(id: string): Promise<void> {
  const { error } = await supabase.from('cipa_reunioes').update({ status: 'cancelada' }).eq('id', id);
  if (error) falhar(error);
}

export async function listarPresencaProjeto(reuniaoIds: string[]): Promise<PresencaReuniao[]> {
  if (!reuniaoIds.length) return [];
  const { data, error } = await supabase
    .from('cipa_reuniao_presenca')
    .select('id, reuniao_id, membro_id, situacao, justificativa')
    .in('reuniao_id', reuniaoIds);
  if (error) {
    if (falhaDeColuna(error)) return [];
    falhar(error);
  }
  return (data ?? []) as PresencaReuniao[];
}

/** Conta só as reuniões com chamada gravada para o membro. */
export function resumoFrequencia(
  membro: Pick<MembroCipa, 'id' | 'inicio_mandato' | 'fim_mandato' | 'situacao'>,
  reunioes: ReuniaoCipa[],
  presencas: PresencaReuniao[],
  hoje: string,
): { presentes: number; faltas: number; justificadas: number } {
  const marcas = new Map(
    presencas.filter((item) => item.membro_id === membro.id).map((item) => [item.reuniao_id, item.situacao]),
  );
  let presentes = 0;
  let faltas = 0;
  let justificadas = 0;
  for (const reuniao of reunioes) {
    if (reuniao.status === 'cancelada') continue;
    if (reuniao.data_reuniao > hoje || reuniao.data_reuniao < membro.inicio_mandato) continue;
    if (membro.fim_mandato && reuniao.data_reuniao > membro.fim_mandato) continue;
    const situacao = marcas.get(reuniao.id);
    if (!situacao) continue;
    if (situacao === 'faltante') faltas += 1;
    else if (situacao === 'justificado') justificadas += 1;
    else presentes += 1;
  }
  return { presentes, faltas, justificadas };
}

/** A NR-05 tira o mandato do titular que falta a mais de quatro reuniões ordinárias sem justificativa. */
export function faltasOrdinariasSemJustificativa(
  membro: Pick<MembroCipa, 'id' | 'inicio_mandato' | 'fim_mandato'>,
  reunioes: ReuniaoCipa[],
  presencas: PresencaReuniao[],
  hoje: string,
): number {
  const ordinarias = new Set(
    reunioes
      .filter((item) => item.tipo === 'ordinaria' && item.status !== 'cancelada')
      .filter((item) => item.data_reuniao <= hoje && item.data_reuniao >= membro.inicio_mandato)
      .filter((item) => !membro.fim_mandato || item.data_reuniao <= membro.fim_mandato)
      .map((item) => item.id),
  );
  return presencas.filter(
    (item) => item.membro_id === membro.id && item.situacao === 'faltante' && ordinarias.has(item.reuniao_id),
  ).length;
}

export async function listarPresenca(reuniaoId: string): Promise<PresencaReuniao[]> {
  const { data, error } = await supabase
    .from('cipa_reuniao_presenca')
    .select('id, reuniao_id, membro_id, situacao, justificativa')
    .eq('reuniao_id', reuniaoId);
  if (error) {
    if (falhaDeColuna(error)) return [];
    falhar(error);
  }
  return (data ?? []) as PresencaReuniao[];
}

/** Grava todas as linhas, inclusive presentes: sem linha, o membro conta como ausente. */
export async function guardarPresenca(reuniaoId: string, linhas: PresencaReuniao[]): Promise<void> {
  if (linhas.length) {
    const { error } = await supabase.from('cipa_reuniao_presenca').upsert(
      linhas.map((linha) => ({
        reuniao_id: reuniaoId,
        membro_id: linha.membro_id,
        situacao: linha.situacao,
        justificativa: linha.situacao === 'justificado' ? linha.justificativa?.trim() || null : null,
        atualizado_em: new Date().toISOString(),
      })),
      { onConflict: 'reuniao_id,membro_id' },
    );
    if (error) throw error;
  }
}

export async function listarLog(reuniaoId: string): Promise<LogReuniao[]> {
  const consultar = (colunas: string) =>
    supabase
      .from('cipa_reuniao_log')
      .select(colunas)
      .eq('reuniao_id', reuniaoId)
      .order('quando', { ascending: false });
  const basicas = 'id, reuniao_id, quando, evento, detalhe, apos_conclusao';
  let resposta = await consultar(`${basicas}, versao_anterior`);
  if (resposta.error && falhaDeColuna(resposta.error)) resposta = await consultar(basicas);
  if (resposta.error) {
    if (falhaDeColuna(resposta.error)) return [];
    falhar(resposta.error);
  }
  // Registros de antes da conclusão (gravados por versões antigas do gatilho) não entram no histórico.
  return ((resposta.data ?? []) as unknown as LogReuniao[]).filter(
    (item) => item.apos_conclusao || item.evento.includes('Reunião concluída'),
  );
}

export async function guardarEmailMembro(membroId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('cipa_membros')
    .update({ email: email.trim() || null })
    .eq('id', membroId);
  if (error) throw error;
}

/** Sem `conclusao`, a ação só fica vinculada e continua aberta na fila de prazos. */
export async function vincularAcao(
  acao: Acao,
  reuniao: Pick<ReuniaoCipa, 'id' | 'data_reuniao'>,
  conclusao?: { realizado: string },
): Promise<void> {
  const { error } = await supabase
    .from('acoes')
    .update({
      reuniao_id: reuniao.id,
      ...(conclusao
        ? {
            status: 'concluida',
            concluida_em: new Date().toISOString(),
            data_finalizacao: reuniao.data_reuniao,
            realizado: conclusao.realizado.trim(),
          }
        : {}),
    })
    .eq('id', acao.id);
  if (error) falhar(error);
}

export async function desvincularAcao(acao: Acao): Promise<void> {
  const { error } = await supabase.from('acoes').update({ reuniao_id: null }).eq('id', acao.id);
  if (error) falhar(error);
}

export function textoAtaImpressao(
  reuniao: ReuniaoCipa,
  nomeProjeto: string,
  membros: MembroCipa[],
  presenca: PresencaReuniao[],
  acoes: Acao[],
): string {
  const mapa = new Map(presenca.map((item) => [item.membro_id, item]));
  const linha = (membro: MembroCipa) => {
    const marca = mapa.get(membro.id);
    const situacao = marca?.situacao ?? 'faltante';
    const extra = situacao === 'justificado' && marca?.justificativa ? ` — ${marca.justificativa}` : '';
    return `${membro.nome} (${situacao}${extra})`;
  };
  const daReuniao = acoes.filter((acao) => acao.reuniao_id === reuniao.id);
  return [
    `ATA DE REUNIÃO — ${nomeProjeto}`,
    `Data: ${reuniao.data_reuniao} · ${reuniao.tipo === 'ordinaria' ? 'Ordinária' : 'Extraordinária'}`,
    reuniao.status === 'concluida' ? 'Situação: concluída' : 'Situação: em aberto',
    '',
    'SÚMULA PREVISTA',
    ...(itensSumula(reuniao).length
      ? itensSumula(reuniao).map((item, indice) => `${indice + 1}. ${item}`)
      : ['Sem súmula.']),
    '',
    'ATA',
    textoDaAta(reuniao.ata) || 'Sem ata.',
    '',
    'PRESENÇA',
    ...membros.map(linha),
    '',
    'AÇÕES DESTA REUNIÃO',
    ...(daReuniao.length ? daReuniao.map((acao) => `${acao.titulo} — ${acao.status}`) : ['Nenhuma ação vinculada.']),
  ].join('\n');
}
