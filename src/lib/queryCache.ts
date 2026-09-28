/**
 * Cache em memória com TTL para reduzir egress (mesmos dados pedidos por
 * Alertas, Dashboard e listagens na mesma sessão).
 */

type Entrada = { expiraEm: number; valor: unknown };

const store = new Map<string, Entrada>();

export function cacheGet<T>(chave: string): T | undefined {
  const e = store.get(chave);
  if (!e) return undefined;
  if (Date.now() > e.expiraEm) {
    store.delete(chave);
    return undefined;
  }
  return e.valor as T;
}

export function cacheSet<T>(chave: string, valor: T, ttlMs: number): T {
  store.set(chave, { valor, expiraEm: Date.now() + ttlMs });
  return valor;
}

/** Remove entradas cuja chave começa com o prefixo (ex.: `controle:${projetoId}`). */
export function cacheInvalidatePrefix(prefixo: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefixo)) store.delete(k);
  }
}

export function cacheInvalidateAll(): void {
  store.clear();
}

export async function cacheGetOrFetch<T>(
  chave: string,
  ttlMs: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(chave);
  if (hit !== undefined) return hit;
  const valor = await fetchFn();
  return cacheSet(chave, valor, ttlMs);
}

/** TTLs padrão (ms) */
export const CACHE_TTL = {
  /** Listas operacionais compartilhadas entre telas */
  lista: 60_000,
  /** Snapshot de alertas / resumos */
  alertas: 90_000,
  /** Dados de projeto (flags) */
  projeto: 120_000,
} as const;
