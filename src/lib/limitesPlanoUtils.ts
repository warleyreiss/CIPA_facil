import { supabase } from './supabaseClient';

export interface LimitesPlano {
  quantidade_projetos: number;
}

export function isLimiteIlimitado(limite: number): boolean {
  return limite === 0;
}

export function dentroDoLimitePlano(uso: number, limite: number): boolean {
  if (isLimiteIlimitado(limite)) return true;
  return uso <= limite;
}

export function rotuloLimitePlano(limite: number): string {
  return isLimiteIlimitado(limite) ? 'Ilimitado' : String(limite);
}

export function limiteConsumoAtingido(uso: number, limite: number): boolean {
  if (isLimiteIlimitado(limite)) return false;
  return uso >= limite;
}

export function limiteSeriaUltrapassado(
  uso: number,
  limite: number,
  quantidadeNova: number
): boolean {
  if (isLimiteIlimitado(limite) || quantidadeNova <= 0) return false;
  return uso + quantidadeNova > limite;
}

export function calcularExcedenteLimite(
  uso: number,
  limite: number,
  quantidadeNova: number
): number {
  if (isLimiteIlimitado(limite) || quantidadeNova <= 0) return 0;
  return Math.max(0, uso + quantidadeNova - limite);
}

export function vagasRestantesPlano(uso: number, limite: number): number | null {
  if (isLimiteIlimitado(limite)) return null;
  return Math.max(0, limite - uso);
}

export function resolverLimitesPlano(assinatura: any): LimitesPlano {
  const planoTipo = assinatura?.plano_tipo || 'INICIANTE';

  let regras: LimitesPlano = {
    quantidade_projetos: planoTipo === 'INICIANTE' ? 1 : planoTipo === 'PRO' ? 3 : 5,
  };

  let regraContexto = assinatura?.plano_regras;
  if (Array.isArray(regraContexto)) regraContexto = regraContexto[0];

  if (regraContexto) {
    regras = {
      quantidade_projetos: Number(regraContexto.quantidade_projetos ?? regras.quantidade_projetos),
    };
  }

  return regras;
}

export async function buscarLimitesPlanoComFallback(assinatura: any): Promise<LimitesPlano> {
  const regras = resolverLimitesPlano(assinatura);

  let regraContexto = assinatura?.plano_regras;
  if (Array.isArray(regraContexto)) regraContexto = regraContexto[0];

  if (regraContexto) return regras;

  const targetId = assinatura?.plano_regra_id || assinatura?.stripe_price_id;
  if (!targetId) return regras;

  const { data: regraBanco } = await supabase
    .from('plano_regras')
    .select('quantidade_projetos')
    .eq('stripe_price_id', targetId)
    .maybeSingle();

  if (!regraBanco) return regras;

  return {
    quantidade_projetos: Number(regraBanco.quantidade_projetos ?? 0),
  };
}

export async function contarProjetosAssinatura(
  assinaturaId: string,
  projetoIdAtivo: string | null = null
): Promise<number> {
  const { count, error } = await supabase
    .from('projetos')
    .select('*', { count: 'exact', head: true })
    .eq('assinatura_id', assinaturaId);

  if (error) throw error;

  const total = count ?? 0;
  if (total === 0 && projetoIdAtivo) return 1;
  return total;
}

const PREFIXO_ERRO_LIMITE = 'LIMITE_PLANO:';

/** Extrai mensagem amigável de erro do Supabase/Postgres quando o limite do plano é ultrapassado. */
export function mensagemErroLimitePlano(erro: unknown): string {
  const bruto =
    (erro as { message?: string })?.message ??
    (erro as { error_description?: string })?.error_description ??
    (typeof erro === 'string' ? erro : '');

  if (bruto.includes(PREFIXO_ERRO_LIMITE)) {
    return bruto.split(PREFIXO_ERRO_LIMITE).pop()?.trim() || bruto;
  }

  return bruto || 'Não foi possível concluir o cadastro.';
}

export function isErroLimitePlano(erro: unknown): boolean {
  const bruto = (erro as { message?: string })?.message ?? '';
  return bruto.includes(PREFIXO_ERRO_LIMITE);
}
