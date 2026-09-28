import { SESSION_KEYS } from './storageService';

const LOCAL_BACKUP_KEY = 'cepi_pending_registration_backup';
const TTL_MS = 2 * 60 * 60 * 1000; // 2h — cobre checkout Stripe + OAuth

export type PendingRegistrationData = {
  nome_completo?: string;
  cnpj?: string | null;
  assinatura_tipo?: 'AUTONOMO' | 'EMPRESARIAL';
  assinatura_id?: string | null;
  contato?: string;
  email?: string;
  origem_cadastro?: string;
  parceiro_codigo?: string | null;
  /** Após Stripe, retomar OAuth Google com este pending */
  continuar_com_google?: boolean;
  /** Após Stripe, reabrir wizard e-mail/senha */
  continuar_com_email?: boolean;
  /** Epoch ms — backup localStorage */
  _saved_at?: number;
};

function parsePending(raw: string | null): PendingRegistrationData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PendingRegistrationData;
    if (data._saved_at && Date.now() - data._saved_at > TTL_MS) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function lerPendingRegistration(): PendingRegistrationData | null {
  if (typeof window === 'undefined') return null;

  const fromSession = parsePending(sessionStorage.getItem(SESSION_KEYS.pendingRegistration));
  if (fromSession) return fromSession;

  const fromLocal = parsePending(localStorage.getItem(LOCAL_BACKUP_KEY));
  if (fromLocal) {
    // Restaura na sessão da aba atual
    sessionStorage.setItem(SESSION_KEYS.pendingRegistration, JSON.stringify(fromLocal));
    return fromLocal;
  }

  return null;
}

export function salvarPendingRegistration(data: PendingRegistrationData): void {
  if (typeof window === 'undefined') return;
  const payload: PendingRegistrationData = { ...data, _saved_at: Date.now() };
  const raw = JSON.stringify(payload);
  sessionStorage.setItem(SESSION_KEYS.pendingRegistration, raw);
  localStorage.setItem(LOCAL_BACKUP_KEY, raw);
}

export function mesclarPendingRegistration(
  patch: Partial<PendingRegistrationData>,
): PendingRegistrationData {
  const atual = lerPendingRegistration() ?? {};
  const merged = { ...atual, ...patch };
  salvarPendingRegistration(merged);
  return merged;
}

export function limparPendingRegistration(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEYS.pendingRegistration);
  localStorage.removeItem(LOCAL_BACKUP_KEY);
}
