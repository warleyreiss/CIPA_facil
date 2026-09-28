import { supabase } from './supabaseClient';
import { SESSION_KEYS } from './storageService';
const INTERVALO_MINIMO_MS = 10 * 60 * 1000;

function podeRegistrar(userId: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEYS.throttleUltimoAcesso);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { userId: string; ts: number };
    if (parsed.userId !== userId) return true;
    return Date.now() - parsed.ts >= INTERVALO_MINIMO_MS;
  } catch {
    return true;
  }
}

function marcarRegistrado(userId: string): void {
  try {
    sessionStorage.setItem(
      SESSION_KEYS.throttleUltimoAcesso,
      JSON.stringify({ userId, ts: Date.now() })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Persiste o último acesso do usuário autenticado.
 * Throttle por aba (10 min) para evitar gravações repetidas em refreshs rápidos.
 */
export async function registrarUltimoAcesso(userId: string): Promise<void> {
  if (!userId || !podeRegistrar(userId)) return;

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from('usuarios')
    .update({ ultimo_acesso: agora })
    .eq('id', userId);

  if (error) {
    console.error('Falha ao registrar último acesso:', error.message);
    return;
  }

  marcarRegistrado(userId);
}

/** @deprecated Use limparDadosSessaoAplicacao() de storageService */
export function limparRegistroUltimoAcessoSessao(): void {
  try {
    sessionStorage.removeItem(SESSION_KEYS.throttleUltimoAcesso);
  } catch {
    /* ignore */
  }
}
