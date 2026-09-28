/**
 * Contagem de usuários ativos para prova social (marketing).
 * Base: 01/11/2026 → 1.213 usuários; sobe 9 por dia (calendário local).
 */

export const USUARIOS_MARKETING_DATA_INICIAL = new Date(2026, 10, 1); // 01/11/2026
export const USUARIOS_MARKETING_BASE = 1213;
export const USUARIOS_MARKETING_POR_DIA = 9;

function inicioDoDiaLocal(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Total de usuários ativos exibido na prova social (nunca abaixo da base). */
export function calcularUsuariosAtivosMarketing(agora: Date = new Date()): number {
  const inicio = inicioDoDiaLocal(USUARIOS_MARKETING_DATA_INICIAL);
  const hoje = inicioDoDiaLocal(agora);
  const dias = Math.floor((hoje - inicio) / 86_400_000);
  return USUARIOS_MARKETING_BASE + USUARIOS_MARKETING_POR_DIA * Math.max(0, dias);
}

/**
 * Formato marketing compacto: 1213 → "1.2k", 6450 → "6.4k"
 * Usa piso em décimos de milhar para o "Mais de" permanecer conservador.
 */
export function formatarUsuariosMarketing(total: number): string {
  if (total < 1000) return String(total);
  const k = Math.floor(total / 100) / 10;
  const texto = Number.isInteger(k) ? String(k) : k.toFixed(1);
  return `${texto}k`;
}
