import { useEffect } from 'react';
import {
  claimAdsSurface,
  onAdsConsentChange,
  releaseAdsSurface,
  syncAdSenseScript,
} from '../lib/adsenseConsent';

/**
 * Habilita Anúncios automáticos do AdSense apenas enquanto montado e `allow` for true.
 * Usar na landing e no Layout quando o plano for Iniciante.
 */
export default function AdSenseGate({ allow }: { allow: boolean }) {
  useEffect(() => {
    if (!allow) {
      syncAdSenseScript();
      return;
    }

    claimAdsSurface();
    const off = onAdsConsentChange(() => syncAdSenseScript());
    return () => {
      off();
      releaseAdsSurface();
    };
  }, [allow]);

  return null;
}
