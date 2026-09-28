/**
 * Google AdSense — Anúncios automáticos (script global).
 * Exibição controlada no app: somente landing (/) e área logada no plano Iniciante.
 */
export const ADSENSE = {
  client: 'ca-pub-1646922689945004',
  /** Desligue com VITE_ADSENSE_ENABLED=false se necessário. */
  enabled: import.meta.env.VITE_ADSENSE_ENABLED !== 'false',
} as const;

/** Preferência de cookies de publicidade: 'all' | 'essential' */
export const CONSENT_MODE_KEY = 'lgpd_consent_mode';
