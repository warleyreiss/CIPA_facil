import { supabase } from './supabaseClient';

export type MembroCipa = {
  id: string;
  projeto_id: string;
  nome: string;
  representacao: 'organizacao' | 'empregados';
  condicao: 'titular' | 'suplente' | 'reservista';
  funcao: 'membro' | 'presidente' | 'vice';
  inicio_mandato: string;
  fim_mandato: string;
  situacao: 'em_exercicio' | 'afastado' | 'encerrado';
  email?: string | null;
  fim_real?: string | null;
  motivo_desligamento?: MotivoDesligamento | null;
  motivo_descricao?: string | null;
  substituido_por?: string | null;
  substitui?: string | null;
  forma_ingresso?: FormaIngresso | null;
};

export type MotivoDesligamento =
  | 'faltas_sem_justificativa'
  | 'desligamento_organizacao'
  | 'renuncia'
  | 'afastamento_definitivo'
  | 'falecimento'
  | 'redesignacao_organizacao'
  | 'outro';

export type FormaIngresso = 'eleicao' | 'designacao' | 'suplente_assumiu' | 'eleicao_extraordinaria' | 'escolha_titulares';

export const MOTIVOS_DESLIGAMENTO: Record<MotivoDesligamento, string> = {
  faltas_sem_justificativa: 'Mais de quatro faltas em reuniões ordinárias sem justificativa',
  desligamento_organizacao: 'Deixou de trabalhar na organização',
  renuncia: 'Renúncia ao mandato',
  afastamento_definitivo: 'Afastamento definitivo',
  falecimento: 'Falecimento',
  redesignacao_organizacao: 'Organização designou outra pessoa',
  outro: 'Outro motivo',
};

export const FORMAS_INGRESSO: Record<FormaIngresso, string> = {
  eleicao: 'Eleição',
  designacao: 'Designação da organização',
  suplente_assumiu: 'Suplente assumiu a vaga',
  eleicao_extraordinaria: 'Eleição extraordinária',
  escolha_titulares: 'Escolhido pelos titulares dos empregados',
};

export type Substituicao = {
  saindo: MembroCipa;
  motivo: MotivoDesligamento;
  descricao: string;
  fimReal: string;
  inicioSubstituto: string;
  /** Membro já existente que assume o cargo de quem sai. */
  promovido?: MembroCipa | null;
  /** Suplente que assume a vaga de titular deixada pelo promovido (ex.: novo vice escolhido entre titulares). */
  suplenteDaVaga?: MembroCipa | null;
  /** Pessoa nova, designada ou eleita em eleição extraordinária. */
  novaPessoa?: { nome: string; forma: FormaIngresso } | null;
};

function erroDeColuna(mensagem: string) {
  return /schema cache|could not find the|PGRST204|does not exist/i.test(mensagem);
}

async function atualizarMembro(id: string, dados: Partial<MembroCipa>): Promise<void> {
  const { error } = await supabase.from('cipa_membros').update(dados).eq('id', id);
  if (!error) return;
  if (erroDeColuna(error.message)) {
    throw new Error('A tabela de membros ainda não tem os campos de desligamento. Aplique a migration 20260927130000_desligamento_membro.sql.');
  }
  throw error;
}

/** Encerra quem sai com fim real e motivo, e coloca alguém no mesmo cargo até o fim previsto da vaga. */
export async function registrarSubstituicao(dados: Substituicao): Promise<void> {
  const { saindo, promovido, suplenteDaVaga, novaPessoa } = dados;
  let substitutoId: string | null = null;

  await atualizarMembro(saindo.id, {
    situacao: 'encerrado',
    fim_real: dados.fimReal,
    motivo_desligamento: dados.motivo,
    motivo_descricao: dados.descricao.trim(),
  });

  if (promovido) {
    const assumeComoTitular = saindo.condicao === 'titular';
    await atualizarMembro(promovido.id, {
      funcao: saindo.funcao,
      condicao: assumeComoTitular ? 'titular' : promovido.condicao,
      substitui: saindo.id,
      forma_ingresso: promovido.condicao === 'suplente' ? 'suplente_assumiu' : saindo.funcao === 'vice' ? 'escolha_titulares' : 'designacao',
      fim_mandato: saindo.fim_mandato,
    });
    substitutoId = promovido.id;
  } else if (novaPessoa) {
    const { data, error } = await supabase
      .from('cipa_membros')
      .insert({
        projeto_id: saindo.projeto_id,
        nome: novaPessoa.nome.trim(),
        representacao: saindo.representacao,
        condicao: saindo.condicao,
        funcao: saindo.funcao,
        inicio_mandato: dados.inicioSubstituto,
        fim_mandato: saindo.fim_mandato,
        situacao: 'em_exercicio',
        substitui: saindo.id,
        forma_ingresso: novaPessoa.forma,
      })
      .select('id')
      .single();
    if (error) {
      if (erroDeColuna(error.message)) {
        throw new Error('A tabela de membros ainda não tem os campos de desligamento. Aplique a migration 20260927130000_desligamento_membro.sql.');
      }
      throw error;
    }
    substitutoId = data.id as string;
  }

  if (suplenteDaVaga) {
    await atualizarMembro(suplenteDaVaga.id, {
      condicao: 'titular',
      funcao: 'membro',
      forma_ingresso: 'suplente_assumiu',
      substitui: promovido?.id ?? saindo.id,
    });
  }

  if (substitutoId) await atualizarMembro(saindo.id, { substituido_por: substitutoId });
}

export type ReuniaoCipa = {
  id: string;
  projeto_id: string;
  data_reuniao: string;
  tipo: 'ordinaria' | 'extraordinaria';
  pauta: string | null;
  ata: string | null;
  presentes: string | null;
  status?: 'agendada' | 'concluida' | 'cancelada';
  sumula?: string | null;
  concluida_em?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  local?: string | null;
  token_agenda?: string | null;
};

export async function listarMembros(projetoId: string): Promise<MembroCipa[]> {
  const { data, error } = await supabase
    .from('cipa_membros')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('inicio_mandato', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MembroCipa[];
}

/** Retorna emailIgnorado quando a base ainda não tem a coluna email. */
export async function salvarMembro(membro: Omit<MembroCipa, 'id'> & { id?: string }): Promise<{ emailIgnorado: boolean }> {
  const linha: Record<string, unknown> = {
    projeto_id: membro.projeto_id,
    nome: membro.nome.trim(),
    representacao: membro.representacao,
    condicao: membro.condicao,
    funcao: membro.funcao,
    inicio_mandato: membro.inicio_mandato,
    fim_mandato: membro.fim_mandato,
    situacao: membro.situacao,
  };
  if (membro.email !== undefined) linha.email = membro.email?.trim().toLowerCase() || null;
  const gravar = (dados: Record<string, unknown>) =>
    membro.id
      ? supabase.from('cipa_membros').update(dados).eq('id', membro.id)
      : supabase.from('cipa_membros').insert(dados);
  const { error } = await gravar(linha);
  if (!error) return { emailIgnorado: false };
  const semColunaEmail = 'email' in linha && /email/i.test(error.message ?? '') && /schema cache|could not find|does not exist|PGRST204/i.test(`${error.code ?? ''} ${error.message ?? ''}`);
  if (!semColunaEmail) throw error;
  const { email: _email, ...semEmail } = linha;
  void _email;
  const segunda = await gravar(semEmail);
  if (segunda.error) throw segunda.error;
  return { emailIgnorado: true };
}

export async function listarReunioes(projetoId: string): Promise<ReuniaoCipa[]> {
  const { data, error } = await supabase
    .from('cipa_reunioes')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('data_reuniao', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReuniaoCipa[];
}

export async function salvarReuniao(reuniao: Omit<ReuniaoCipa, 'id'> & { id?: string }): Promise<void> {
  const linha = {
    projeto_id: reuniao.projeto_id,
    data_reuniao: reuniao.data_reuniao,
    tipo: reuniao.tipo,
    pauta: reuniao.pauta?.trim() || null,
    ata: reuniao.ata?.trim() || null,
    presentes: reuniao.presentes?.trim() || null,
  };
  const consulta = reuniao.id
    ? supabase.from('cipa_reunioes').update(linha).eq('id', reuniao.id)
    : supabase.from('cipa_reunioes').insert(linha);
  const { error } = await consulta;
  if (error) throw error;
}
