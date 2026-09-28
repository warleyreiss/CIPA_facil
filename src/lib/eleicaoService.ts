import { supabase } from './supabaseClient';
import {
  ETAPAS,
  dataDaEtapa,
  isoData,
  lerData,
  somarDias,
  somarUmAno,
  type CodigoEtapa,
} from './eleicao/etapasEleicao';

export type Eleicao = {
  id: string;
  projeto_id: string;
  data_termino_mandato: string;
  data_inicio: string;
  status: 'em_andamento' | 'concluida' | 'cancelada';
  primeira: boolean;
  criado_em: string;
};

export type EtapaEleicao = {
  id: string;
  eleicao_id: string;
  codigo: CodigoEtapa;
  ordem: number;
  titulo: string;
  norma: string;
  data_prevista: string;
  concluida_em: string | null;
  observacao: string | null;
};

export type Apuracao = {
  total_empregados: number;
  total_votos: number;
  dia_votacao: number;
  valida: boolean;
  motivo: string;
};

export function avaliarApuracao(totalEmpregados: number, totalVotos: number, dia: number): Apuracao {
  const base: Apuracao = {
    total_empregados: totalEmpregados,
    total_votos: totalVotos,
    dia_votacao: dia,
    valida: false,
    motivo: '',
  };

  if (totalEmpregados <= 0 || totalVotos < 0 || totalVotos > totalEmpregados) {
    base.motivo = 'Informe o total de empregados e uma quantidade de votos possível.';
    return base;
  }

  const percentual = totalVotos / totalEmpregados;

  if (dia === 1) {
    if (percentual < 0.5) {
      base.motivo = 'Menos de 50% votaram. Não apure os votos. Prorrogue para o dia seguinte e avise o sindicato (NR-05, 5.5.4).';
      return base;
    }
    base.valida = true;
    base.motivo = 'Participação de 50% ou mais. A apuração pode seguir.';
    return base;
  }

  if (dia === 2) {
    if (percentual < 1 / 3) {
      base.motivo = 'Menos de um terço votou no segundo dia. Não apure. Prorrogue para o dia seguinte e avise o sindicato (NR-05, 5.5.4.1).';
      return base;
    }
    base.valida = true;
    base.motivo = 'Participação de pelo menos um terço. A apuração do segundo dia é válida.';
    return base;
  }

  base.valida = true;
  base.motivo = 'No terceiro dia a votação é válida com qualquer número de empregados (NR-05, 5.5.4.1).';
  return base;
}

export function montarCronograma(dataAncoraIso: string, primeira: boolean) {
  const ancora = lerData(dataAncoraIso);
  const linhas = ETAPAS.map((etapa) => ({
    codigo: etapa.codigo,
    ordem: etapa.ordem,
    titulo: etapa.titulo,
    norma: etapa.norma,
    data_prevista: isoData(dataDaEtapa(ancora, etapa, primeira)),
  }));
  if (!primeira) return linhas;
  return [...linhas]
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista) || a.ordem - b.ordem)
    .map((etapa, indice) => ({ ...etapa, ordem: indice + 1 }));
}

export function sugerirInicio(dataTerminoMandatoAtual: string | null, hoje = new Date()): string {
  const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (!dataTerminoMandatoAtual) return isoData(hojeLimpo);
  return isoData(somarDias(lerData(dataTerminoMandatoAtual), -60));
}

export async function listarEleicoes(projetoId: string): Promise<Eleicao[]> {
  const { data, error } = await supabase
    .from('eleicoes')
    .select('*')
    .eq('projeto_id', projetoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Eleicao[];
}

export async function listarEtapas(eleicaoId: string): Promise<EtapaEleicao[]> {
  const { data, error } = await supabase
    .from('eleicao_etapas')
    .select('*')
    .eq('eleicao_id', eleicaoId)
    .order('ordem', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EtapaEleicao[];
}

export async function criarEleicao(params: {
  projetoId: string;
  /** Renovação: fim do mandato em curso. Primeira CIPA: data da posse. */
  dataAncora: string;
  primeira: boolean;
}): Promise<string> {
  const cronograma = montarCronograma(params.dataAncora, params.primeira);
  const dataInicio = cronograma[0]?.data_prevista ?? sugerirInicio(params.primeira ? null : params.dataAncora);
  const terminoMandato = params.primeira ? somarUmAno(params.dataAncora) : params.dataAncora;

  const { data, error } = await supabase
    .from('eleicoes')
    .insert({
      projeto_id: params.projetoId,
      data_termino_mandato: terminoMandato,
      data_inicio: dataInicio,
      status: 'em_andamento',
      primeira: params.primeira,
    })
    .select('id')
    .single();
  if (error) throw error;

  const linhas = cronograma.map((etapa) => ({
    eleicao_id: data.id,
    codigo: etapa.codigo,
    ordem: etapa.ordem,
    titulo: etapa.titulo,
    norma: etapa.norma,
    data_prevista: etapa.data_prevista,
  }));

  const etapas = await supabase.from('eleicao_etapas').insert(linhas);
  if (etapas.error) throw etapas.error;
  return data.id as string;
}

export async function concluirEtapa(etapaId: string, observacao: string | null) {
  const { error } = await supabase
    .from('eleicao_etapas')
    .update({
      concluida_em: new Date().toISOString(),
      observacao,
    })
    .eq('id', etapaId);
  if (error) throw error;
}

export async function encerrarEleicaoSeCompleta(eleicaoId: string) {
  const etapas = await listarEtapas(eleicaoId);
  if (etapas.length === 0 || etapas.some((etapa) => !etapa.concluida_em)) return;
  const { error } = await supabase
    .from('eleicoes')
    .update({ status: 'concluida' })
    .eq('id', eleicaoId);
  if (error) throw error;
}
