import { SESSION_KEYS } from './storageService';

/** Persiste e-mail enquanto a confirmação está pendente (signup sem sessão). */
export function salvarPendingEmailConfirm(email: string): void {
  if (typeof window === 'undefined') return;
  const v = email.trim().toLowerCase();
  if (!v) return;
  sessionStorage.setItem(SESSION_KEYS.pendingEmailConfirm, v);
}

export function lerPendingEmailConfirm(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(SESSION_KEYS.pendingEmailConfirm);
}

export function limparPendingEmailConfirm(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEYS.pendingEmailConfirm);
}
