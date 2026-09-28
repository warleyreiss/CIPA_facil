import {
  limparCodigoParceiro,
  normalizarCodigoParceiro,
  obterCodigoParceiro,
  salvarCodigoParceiro,
} from './parceiroStorage';

export interface ResultadoIndicacaoParceiro {
  ok: boolean;
  motivo?: string;
  fornecedor_id?: string;
  projeto_id?: string;
}

export type ParceiroPublico = {
  codigo: string;
  razao_social: string;
};

export type ValidacaoIndicacao =
  | { ok: true; parceiro: ParceiroPublico }
  | { ok: false; motivo: 'formato' | 'nao_encontrado'; codigoTentado: string };

/**
 * Consulta parceiro ativo pelo código (RLS: só ativos são visíveis ao público).
 */
export async function buscarParceiroAtivoPorCodigo(
  codigoRaw: string
): Promise<ParceiroPublico | null> {
  const codigo = normalizarCodigoParceiro(codigoRaw);
  if (!codigo) return null;
  return null;
}

/** Valida e, se ok, grava na sessão. Se falhar, limpa qualquer código antigo. */
export async function registrarIndicacaoSeValida(codigoRaw: string): Promise<ValidacaoIndicacao> {
  const codigo = normalizarCodigoParceiro(codigoRaw);
  if (!codigo) {
    limparCodigoParceiro();
    return { ok: false, motivo: 'formato', codigoTentado: String(codigoRaw || '').trim() };
  }

  const parceiro = await buscarParceiroAtivoPorCodigo(codigo);
  if (!parceiro) {
    limparCodigoParceiro();
    return { ok: false, motivo: 'nao_encontrado', codigoTentado: codigo };
  }

  salvarCodigoParceiro(parceiro.codigo);
  return { ok: true, parceiro };
}

/** Revalida o código já salvo na sessão (ex.: antes de abrir o cadastro). */
export async function revalidarIndicacaoPendente(): Promise<ValidacaoIndicacao | null> {
  const codigo = obterCodigoParceiro();
  if (!codigo) return null;
  return registrarIndicacaoSeValida(codigo);
}

/** Aplica indicação pendente (idempotente). Usado como fallback após login OAuth. */
export async function aplicarIndicacaoParceiroPendente(): Promise<ResultadoIndicacaoParceiro | null> {
  const codigo = obterCodigoParceiro();
  if (!codigo) return null;

  limparCodigoParceiro();
  return { ok: false, motivo: 'indicacao_indisponivel' };
}
