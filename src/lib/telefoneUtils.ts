/** Normaliza telefone para envio WhatsApp (apenas dígitos, com DDI quando omitido no Brasil). */
export function normalizarTelefoneWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function telefoneWhatsAppValido(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const n = normalizarTelefoneWhatsApp(raw);
  return n.length >= 12 && n.length <= 15;
}

export function formatarTelefoneDigitacao(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

/** Máscara BR: (00) 0000-0000 ou (00) 00000-0000. */
export function formatarTelefoneBr(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Máscara WhatsApp (foco BR): +55 (11) 99999-8888.
 * Aceita digitação local sem DDI; números com 55 ou >11 dígitos usam +DDI.
 */
export function formatarTelefoneWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (!digits) return '';

  if (digits === '5') return '+5';

  if (digits.startsWith('55') || digits.length > 11) {
    const ddi = digits.slice(0, 2);
    const national = digits.slice(2, 13);
    if (!national) return `+${ddi}`;
    return `+${ddi} ${formatarTelefoneBr(national)}`;
  }

  return formatarTelefoneBr(digits);
}

/** Telefone opcional: vazio ok; se preenchido, exige 10 ou 11 dígitos (com DDD). */
export function telefoneBrOpcionalValido(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return true;
  return digits.length === 10 || digits.length === 11;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail opcional: vazio ok; se preenchido, valida formato. */
export function emailOpcionalValido(raw: string | null | undefined): boolean {
  const email = (raw ?? '').trim();
  if (!email) return true;
  return EMAIL_REGEX.test(email);
}

/** E-mail obrigatório com formato válido. */
export function emailValido(raw: string | null | undefined): boolean {
  const email = (raw ?? '').trim();
  return !!email && EMAIL_REGEX.test(email);
}

/** Normaliza digitação de e-mail (sem espaços, minúsculo). */
export function formatarEmailDigitacao(raw: string): string {
  return raw.replace(/\s/g, '').toLowerCase();
}

/** WhatsApp opcional: vazio ok; se preenchido, exige formato válido. */
export function telefoneWhatsAppOpcionalValido(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true;
  return telefoneWhatsAppValido(raw);
}
