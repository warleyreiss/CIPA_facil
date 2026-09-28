import type { StatusOnboarding } from '../types/projetoContext.types';
import type { AssinaturaModel } from '../../lib/assinaturaService';

function normalizarPlanoRegras(regras: unknown) {
  if (!regras) return null;
  const regra = Array.isArray(regras) ? regras[0] : regras;
  if (!regra || typeof regra !== 'object') return null;
  const r = regra as Record<string, unknown>;
  return {
    id: r.id ?? null,
    nome_plano: r.nome_plano ?? null,
    quantidade_projetos: r.quantidade_projetos ?? null,
  };
}

export function assinaturaSemanticamenteIgual(
  a: Partial<AssinaturaModel> | null | undefined,
  b: Partial<AssinaturaModel> | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const regraA = normalizarPlanoRegras((a as Record<string, unknown>).plano_regras);
  const regraB = normalizarPlanoRegras((b as Record<string, unknown>).plano_regras);

  return (
    a.id === b.id &&
    a.plano_status === b.plano_status &&
    a.plano_tipo === b.plano_tipo &&
    a.plano_regra_id === b.plano_regra_id &&
    a.stripe_price_id === b.stripe_price_id &&
    a.dias_tolerancia === b.dias_tolerancia &&
    a.data_falha_pagamento === b.data_falha_pagamento &&
    a.plano_fim_periodo === b.plano_fim_periodo &&
    a.proxima_fatura === b.proxima_fatura &&
    a.cancel_at_period_end === b.cancel_at_period_end &&
    !!a.cortesia === !!b.cortesia &&
    !!a.encerrar_conta_agendado === !!b.encerrar_conta_agendado &&
    (a as Record<string, unknown>).motivo_falha === (b as Record<string, unknown>).motivo_falha &&
    (a as Record<string, unknown>).billing_portal_url ===
      (b as Record<string, unknown>).billing_portal_url &&
    JSON.stringify(regraA) === JSON.stringify(regraB)
  );
}

export function userDataSemanticoIgual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const assA = Array.isArray(a.assinaturas) ? a.assinaturas[0] : a.assinaturas;
  const assB = Array.isArray(b.assinaturas) ? b.assinaturas[0] : b.assinaturas;

  return (
    a.id === b.id &&
    a.email === b.email &&
    a.nome_completo === b.nome_completo &&
    a.foto_url === b.foto_url &&
    a.status === b.status &&
    a.onboarding_concluido === b.onboarding_concluido &&
    assinaturaSemanticamenteIgual(assA, assB)
  );
}

export function statusOnboardingIgual(
  a: StatusOnboarding | null | undefined,
  b: StatusOnboarding | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.temEquipamento === b.temEquipamento &&
    a.temCargo === b.temCargo &&
    a.temColaborador === b.temColaborador &&
    a.onboardingConcluido === b.onboardingConcluido &&
    a.isNovato === b.isNovato &&
    a.periodicidadeTroca === b.periodicidadeTroca &&
    a.controleEstoque === b.controleEstoque &&
    a.diasIminenciaTroca === b.diasIminenciaTroca &&
    a.guiaTamanhosAtiva === b.guiaTamanhosAtiva
  );
}

export function mesclarAssinatura(
  atual: Partial<AssinaturaModel> | null,
  patch: Record<string, unknown>
): Partial<AssinaturaModel> {
  return { ...(atual ?? {}), ...patch } as Partial<AssinaturaModel>;
}
