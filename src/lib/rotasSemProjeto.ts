/** Rotas acessíveis sem projeto ativo (conta, billing, suporte). */
export const ROTAS_SEM_PROJETO = [
  '/upgrade',
  '/downgrade',
  '/suporte',
  '/perfil',
  '/meus-dados',
  '/Perfil',
  '/sucesso-upgrade',
  '/colaboracao',
] as const;

export function normalizarPathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function rotaSemProjeto(pathname: string): boolean {
  return ROTAS_SEM_PROJETO.includes(normalizarPathname(pathname) as (typeof ROTAS_SEM_PROJETO)[number]);
}
