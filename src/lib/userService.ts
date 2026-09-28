import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { nomeExibicaoDoUsuario } from './authService';
import { limparCodigoParceiro } from './parceiroStorage';
import { SESSION_KEYS } from './storageService';
import {
  limparPendingRegistration,
  lerPendingRegistration,
} from './pendingRegistration';

async function usuarioJaExiste(userId: string): Promise<boolean> {
  const { data } = await supabase.from('usuarios').select('id').eq('id', userId).maybeSingle();
  return !!data;
}

async function aguardarTriggerCadastro(userId: string, tentativas = 4): Promise<boolean> {
  for (let i = 0; i < tentativas; i++) {
    if (await usuarioJaExiste(userId)) return true;
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return false;
}

async function vincularCheckoutPendenteSeHouver(): Promise<void> {
  const pending = lerPendingRegistration();
  if (!pending?.assinatura_id) return;

  const { error } = await supabase.rpc('fn_vincular_assinatura_checkout_pendente', {
    p_assinatura_id: pending.assinatura_id,
  });

  if (error) {
    console.warn('Não foi possível vincular assinatura paga pendente:', error.message);
  }
}

/**
 * Garante que usuários OAuth (Google) tenham perfil, assinatura e projeto criados.
 * Também aplica metadados pendentes do fluxo de cadastro na landing (incl. ass_id pós-Stripe).
 */
export async function provisionarUsuarioOAuthIfNeeded(user: User): Promise<void> {
  if (await usuarioJaExiste(user.id)) {
    // Conta já existia (ex.: login Google após pagar no cadastro) — tenta claim do pagamento
    await vincularCheckoutPendenteSeHouver();
    limparPendingRegistration();
    return;
  }

  const origem = user.user_metadata?.origem_cadastro as string | undefined;

  if (origem === 'CONVIDADO') {
    const criado = await aguardarTriggerCadastro(user.id);
    if (!criado) {
      console.warn('Usuário convidado ainda sem perfil após OAuth — aguardando trigger.');
    }
    return;
  }

  if (origem === 'DONO') {
    const criado = await aguardarTriggerCadastro(user.id);
    if (criado) {
      await vincularCheckoutPendenteSeHouver();
      limparPendingRegistration();
      return;
    }
  }

  const pending = lerPendingRegistration();

  if (pending?.parceiro_codigo && typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEYS.parceiroCodigo, String(pending.parceiro_codigo).trim());
  }

  const nome =
    pending?.nome_completo?.trim() ||
    nomeExibicaoDoUsuario(user);

  const { error } = await supabase.rpc('fn_provisionar_gestor_oauth', {
    p_nome_completo: nome,
    p_assinatura_tipo: pending?.assinatura_tipo ?? 'AUTONOMO',
    p_cnpj: pending?.cnpj ?? null,
    p_assinatura_id: pending?.assinatura_id ?? null,
    p_contato: pending?.contato ?? null,
  });

  if (error) {
    if (await usuarioJaExiste(user.id)) {
      await vincularCheckoutPendenteSeHouver();
      limparPendingRegistration();
      return;
    }
    throw error;
  }

  if (pending?.parceiro_codigo) limparCodigoParceiro();
  limparPendingRegistration();
}

export const atualizarPerfilUsuario = async (
  userId: string,
  dados: { nome_completo: string; telefone: string; foto_url: string }
) => {
  const { error } = await supabase.from('usuarios').update(dados).eq('id', userId);
  if (error) throw error;
  return { success: true };
};
