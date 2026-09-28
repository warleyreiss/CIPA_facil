/**
 * Origin canônica do app — evita quebrar Stripe/OAuth quando há www vs apex
 * ou preview Vercel vs domínio final.
 *
 * Marca comercial: CIPA Fácil.
 * App local até existir o domínio definitivo.
 */
export const APP_SITE_URL_CANONICO = 'http://localhost:5173';

export function appOrigin(): string {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/$/, '');

  if (import.meta.env.PROD && configured) {
    return configured;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return configured || APP_SITE_URL_CANONICO;
}

export function appUrl(path: string): string {
  const base = appOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
