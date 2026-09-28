import { supabase } from './supabaseClient';
import { diasAte, formatarDataBr } from './eleicao/etapasEleicao';

export type GrupoAcao = 'validade' | 'eleicao' | 'habitual';
export type StatusAcao = 'planejada' | 'em_execucao' | 'concluida' | 'cancelada';
export type NaturezaAcao = 'correcao' | 'prevencao';

export type Acao = {
  id: string;
  projeto_id: string;
  titulo: string;
  grupo: GrupoAcao;
  detalhe: string | null;
  prazo: string;
  status: StatusAcao;
  origem: string | null;
  criada_em: string;
  iniciada_em: string | null;
  concluida_em: string | null;
  reuniao_id?: string | null;
  natureza?: NaturezaAcao | null;
  descricao?: string | null;
  membro_id?: string | null;
  data_finalizacao?: string | null;
  realizado?: string | null;
};

export type AcaoOperacional = {
  id?: string;
  projetoId: string;
  titulo: string;
  natureza: NaturezaAcao;
  descricao: string;
  membroId: string | null;
  prazo: string;
  dataFinalizacao: string;
  realizado: string;
  status: StatusAcao;
};

export function ehAcaoRotina(acao: Acao): boolean {
  return acao.natureza === 'correcao' || acao.natureza === 'prevencao';
}

export type NovaAcao = {
  projetoId: string;
  titulo: string;
  grupo: GrupoAcao;
  detalhe: string;
  prazo: string;
  origem?: string | null;
};

export function avisarAcoesAtualizadas() {
  window.dispatchEvent(new Event('acoes-atualizadas'));
}

export async function listarAcoes(projetoId: string): Promise<Acao[]> {
  const { data, error } = await supabase
    .from('acoes')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('prazo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Acao[];
}

export async function salvarAcaoOperacional(acao: AcaoOperacional): Promise<void> {
  const finalizada = acao.status === 'concluida';
  const linha = {
    projeto_id: acao.projetoId,
    titulo: acao.titulo.trim(),
    grupo: 'habitual' as const,
    natureza: acao.natureza,
    descricao: acao.descricao.trim() || null,
    detalhe: acao.descricao.trim() || null,
    membro_id: acao.membroId,
    prazo: acao.prazo,
    data_finalizacao: finalizada ? acao.dataFinalizacao || null : null,
    realizado: acao.realizado.trim() || null,
    status: acao.status,
    concluida_em: finalizada ? new Date().toISOString() : null,
  };
  const consulta = acao.id
    ? supabase.from('acoes').update(linha).eq('id', acao.id)
    : supabase.from('acoes').insert(linha);
  const { error } = await consulta;
  if (error) throw error;
}

export async function criarAcao(nova: NovaAcao): Promise<void> {
  const { error } = await supabase.from('acoes').insert({
    projeto_id: nova.projetoId,
    titulo: nova.titulo.trim(),
    grupo: nova.grupo,
    detalhe: nova.detalhe.trim() || null,
    prazo: nova.prazo,
    origem: nova.origem ?? null,
    status: 'planejada',
  });
  if (error) throw error;
}

export async function executarAcao(id: string): Promise<void> {
  const { error } = await supabase
    .from('acoes')
    .update({ status: 'em_execucao', iniciada_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function concluirAcao(id: string): Promise<void> {
  const { error } = await supabase
    .from('acoes')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function cancelarAcao(id: string): Promise<void> {
  const { error } = await supabase.from('acoes').update({ status: 'cancelada' }).eq('id', id);
  if (error) throw error;
}

export function resumirPrazos(acoes: Acao[], hoje = new Date()): string {
  const proximas = acoes
    .filter((acao) => acao.status === 'planejada' || acao.status === 'em_execucao')
    .sort((a, b) => a.prazo.localeCompare(b.prazo));
  if (proximas.length === 0) return 'Nenhuma ação com prazo aberto';
  const primeira = proximas[0];
  const falta = diasAte(primeira.prazo, hoje);
  const quando = falta < 0 ? 'atrasada' : falta === 0 ? 'hoje' : `em ${falta} dia(s)`;
  const extra = proximas.length > 1 ? ` · +${proximas.length - 1}` : '';
  return `${primeira.titulo} · ${formatarDataBr(primeira.prazo)} (${quando})${extra}`;
}
