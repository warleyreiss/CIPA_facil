import { supabase } from './supabaseClient';
import type { StatusAcesso } from '../contexts/types/projetoContext.types';

export interface AssinaturaModel {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  proprietario_id: string | null;
  assinatura_tipo: 'AUTONOMO' | 'EMPRESARIAL' | null;
  plano_tipo: 'INICIANTE' | 'PRO' | 'GESTOR' | 'DESENVOLVIMENTO' | null;
  plano_status: string | null;
  plano_regra_id: string | null;
  dias_tolerancia: number;
  cancel_at_period_end: boolean;
  encerrar_conta_agendado?: boolean;
  data_inicio: string | null;
  proxima_fatura: string | null;
  plano_fim_periodo: string | null;
  data_falha_pagamento: string | null;
  usar_logo_padrao_projetos?: boolean;
  logo_padrao_url?: string | null;
  cortesia?: boolean;
  cortesia_em?: string | null;
  cortesia_motivo?: string | null;
  created_at: string | null;
  responsavel_nome?: string;
  responsavel_email?: string;
}

/** Data em que a inadimplência passou a contar (Stripe: falha no fim do período). */
export function obterDataReferenciaInadimplencia(
  assData: Pick<AssinaturaModel, 'data_falha_pagamento' | 'plano_fim_periodo' | 'proxima_fatura'> | null | undefined
): Date | null {
  const raw =
    assData?.data_falha_pagamento ??
    assData?.plano_fim_periodo ??
    assData?.proxima_fatura;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calcularDiasDesde(dataReferencia: Date): number {
  const diffMs = Date.now() - dataReferencia.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 3600 * 24)));
}

export function avaliarStatusAcesso(
  statusUsuario: boolean,
  assData: Partial<AssinaturaModel> | null | undefined
): StatusAcesso {
  if (statusUsuario === false) return 'INATIVO_ADMIN';
  if (!assData) return 'ATIVO';

  // Cortesia: libera acesso mesmo com status financeiro problemático no Stripe
  if (assData.cortesia) return 'ATIVO';

  if (assData.plano_status === 'canceled') return 'ASSINATURA_CANCELADA';

  // Bloqueio imediato (alinhado ao webhook)
  if (
    assData.plano_status === 'paused' ||
    assData.plano_status === 'incomplete' ||
    assData.plano_status === 'incomplete_expired' ||
    assData.plano_status === 'unpaid'
  ) {
    return 'ASSINATURA_INADIMPLENTE_BLOQUEADO';
  }

  if (assData.plano_status === 'past_due') {
    const diasTolerancia = assData.dias_tolerancia ?? 15;
    const dataRef = obterDataReferenciaInadimplencia({
      data_falha_pagamento: assData.data_falha_pagamento ?? null,
      plano_fim_periodo: assData.plano_fim_periodo ?? null,
      proxima_fatura: assData.proxima_fatura ?? null,
    });

    if (!dataRef) return 'ASSINATURA_INADIMPLENTE_TOLERANCIA';

    const diasDecorridos = calcularDiasDesde(dataRef);
    return diasDecorridos <= diasTolerancia
      ? 'ASSINATURA_INADIMPLENTE_TOLERANCIA'
      : 'ASSINATURA_INADIMPLENTE_BLOQUEADO';
  }

  return 'ATIVO';
}

export function calcularDiasRestantesTolerancia(
  assData: Partial<AssinaturaModel> | null | undefined
): number {
  if (!assData) return 0;

  const diasTolerancia = assData.dias_tolerancia ?? 15;
  const dataRef = obterDataReferenciaInadimplencia({
    data_falha_pagamento: assData.data_falha_pagamento ?? null,
    plano_fim_periodo: assData.plano_fim_periodo ?? null,
    proxima_fatura: assData.proxima_fatura ?? null,
  });

  if (!dataRef) return diasTolerancia;

  return Math.max(0, diasTolerancia - calcularDiasDesde(dataRef));
}

export function isBloqueioFinanceiro(statusAcesso: StatusAcesso): boolean {
  return (
    statusAcesso === 'ASSINATURA_INADIMPLENTE_BLOQUEADO' ||
    statusAcesso === 'ASSINATURA_CANCELADA'
  );
}

export const assinaturaService = {
  async getDadosAssinatura(assinaturaId: string): Promise<AssinaturaModel | null> {
    const { data: assinatura, error: errorAssinatura } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .maybeSingle();

    if (errorAssinatura) throw errorAssinatura;
    if (!assinatura) return null; // ✨ Corrigido de !assinaturas para !assinatura

    const dadosCompletos: AssinaturaModel = { ...assinatura };

    if (assinatura.proprietario_id) {
      try {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('nome_completo, email')
          .eq('id', assinatura.proprietario_id)
          .maybeSingle();

        if (usuario) {
          dadosCompletos.responsavel_nome = usuario.nome_completo;
          dadosCompletos.responsavel_email = usuario.email;
        }
      } catch (err) {
        console.warn("Não foi possível carregar os dados do proprietário:", err);
      }
    }

    return dadosCompletos;
  },

  async updateConfiguracoes(
    assinaturaId: string,
    dados: { assinatura_tipo: 'AUTONOMO' | 'EMPRESARIAL' }
  ): Promise<boolean> {
    const { error } = await supabase
      .from('assinaturas')
      .update(dados)
      .eq('id', assinaturaId);

    if (error) throw error;
    return true;
  },

  async salvarLogoPadrao(
    assinaturaId: string,
    logoUrl: string | null,
    usarEmTodosProjetos: boolean
  ): Promise<void> {
    const { error: errAssinatura } = await supabase
      .from('assinaturas')
      .update({
        logo_padrao_url: logoUrl,
        usar_logo_padrao_projetos: usarEmTodosProjetos,
      })
      .eq('id', assinaturaId);

    if (errAssinatura) throw errAssinatura;

    if (usarEmTodosProjetos && logoUrl) {
      const { error: errProjetos } = await supabase
        .from('projetos')
        .update({ logo_url: logoUrl })
        .eq('assinatura_id', assinaturaId);

      if (errProjetos) throw errProjetos;
    }
  },

  async cancelarAssinatura(assinaturaId: string, confirmacaoEmail: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('cancelar-assinatura', {
      body: { assinaturaId, confirmacaoEmail },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as {
      success: boolean;
      modo: 'agendado' | 'imediato';
      mensagem: string;
      dataEncerramento?: string | null;
    };
  },
};