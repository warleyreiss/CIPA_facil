import { SESSION_KEYS } from './storageService';

const CODIGO_REGEX = /^[A-Za-z0-9_-]{2,40}$/;

export function normalizarCodigoParceiro(codigo: string): string | null {
  const limpo = codigo.trim().toLowerCase();
  if (!limpo || !CODIGO_REGEX.test(limpo)) return null;
  return limpo;
}

export function salvarCodigoParceiro(codigo: string): string | null {
  const normalizado = normalizarCodigoParceiro(codigo);
  if (!normalizado || typeof window === 'undefined') return null;
  sessionStorage.setItem(SESSION_KEYS.parceiroCodigo, normalizado);
  return normalizado;
}

/** Lê ?ref= ou ?parceiro= da URL e persiste na sessão do navegador. */
export function capturarParceiroDaUrl(search?: string): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(search ?? window.location.search);
  const codigo = params.get('ref') ?? params.get('parceiro');

  if (!codigo) return obterCodigoParceiro();

  return salvarCodigoParceiro(codigo) ?? obterCodigoParceiro();
}

export function obterCodigoParceiro(): string | null {
  if (typeof window === 'undefined') return null;
  const codigo = sessionStorage.getItem(SESSION_KEYS.parceiroCodigo);
  return codigo?.trim() || null;
}

export function limparCodigoParceiro(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEYS.parceiroCodigo);
}
