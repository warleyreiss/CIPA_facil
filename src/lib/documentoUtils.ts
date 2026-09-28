import { cnpj as cnpjValidator } from 'cpf-cnpj-validator';

/** Máscara CNPJ: 00.000.000/0000-00 */
export function formatarCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** CNPJ opcional: vazio ok; se preenchido, exige 14 dígitos válidos. */
export function cnpjOpcionalValido(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return true;
  return digits.length === 14 && cnpjValidator.isValid(digits);
}

/** CNPJ obrigatório: 14 dígitos e dígitos verificadores válidos. */
export function cnpjObrigatorioValido(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits.length === 14 && cnpjValidator.isValid(digits);
}

/** Razão social obrigatória (mín. 2 caracteres após trim). */
export function razaoSocialObrigatoriaValida(raw: string | null | undefined): boolean {
  return (raw ?? '').trim().length >= 2;
}

/** Máscara CEP: 00000-000 */
export function formatarCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** CEP opcional: vazio ok; se preenchido, exige 8 dígitos. */
export function cepOpcionalValido(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return true;
  return digits.length === 8;
}

/** Inscrição estadual/municipal: alfanumérico, sem espaços extras. */
export function formatarInscricao(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9./-]/g, '').slice(0, 20);
}
