import { ADSENSE, CONSENT_MODE_KEY } from '../config/adsense';
import { lerLgpdAceite, salvarLgpdAceite } from './storageService';

const SCRIPT_ID = 'adsense-script';
const CONSENT_EVENT = 'adsense-consent';

/** Superfícies ativas (home ou Layout Iniciante) — evita ads fora do escopo. */
let activeSurfaces = 0;

export type ConsentMode = 'all' | 'essential';

export function getConsentMode(): ConsentMode | null {
  if (typeof window === 'undefined') return null;
  if (!lerLgpdAceite()) return null;
  const mode = localStorage.getItem(CONSENT_MODE_KEY);
  if (mode === 'essential' || mode === 'all') return mode;
  // Aceite legado (antes do modo granular) → trata como "todos"
  return 'all';
}

export function adsConsentGranted() {
  return getConsentMode() === 'all';
}

export function initConsentDefaults() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });
}

export function updateConsent(mode: ConsentMode) {
  if (typeof window === 'undefined') return;
  const granted = mode === 'all';
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  window.gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

/**
 * Persiste escolha do banner. Não carrega o script sozinho —
 * só as superfícies autorizadas (AdSenseGate) disparam o load.
 */
export function saveConsent(mode: ConsentMode) {
  salvarLgpdAceite();
  localStorage.setItem(CONSENT_MODE_KEY, mode);
  updateConsent(mode);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
  syncAdSenseScript();
}

export function loadAdSenseScript() {
  if (typeof document === 'undefined' || !ADSENSE.enabled || !ADSENSE.client) return;
  if (!adsConsentGranted()) return;
  if (activeSurfaces <= 0) return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.client}`;
  document.head.appendChild(script);
}

export function unloadAdSenseScript() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
}

export function syncAdSenseScript() {
  if (activeSurfaces > 0 && adsConsentGranted() && ADSENSE.enabled) {
    loadAdSenseScript();
  } else {
    unloadAdSenseScript();
  }
}

/** Chamado ao entrar numa superfície autorizada (home ou app Iniciante). */
export function claimAdsSurface() {
  activeSurfaces += 1;
  syncAdSenseScript();
}

/** Chamado ao sair da superfície; desliga o script se nenhuma restante. */
export function releaseAdsSurface() {
  activeSurfaces = Math.max(0, activeSurfaces - 1);
  syncAdSenseScript();
}

export function onAdsConsentChange(handler: () => void) {
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

export function ensureAdsReadyFromStorage() {
  initConsentDefaults();
  const mode = getConsentMode();
  if (!mode) return;
  updateConsent(mode);
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    adsbygoogle: unknown[];
  }
}
