import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { lerLgpdAceite } from '../lib/storageService';
import { saveConsent, type ConsentMode } from '../lib/adsenseConsent';
import { BRAND } from '../lib/brandAssets';
import '../assets/css/especificos/lgpd-banner.css';

export default function LgpdBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!lerLgpdAceite()) setVisivel(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const escolher = (mode: ConsentMode) => {
    saveConsent(mode);
    setVisivel(false);
  };

  if (!visivel || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="lgpd-banner"
      role="dialog"
      aria-modal="false"
      aria-labelledby="lgpd-banner-title"
      aria-describedby="lgpd-banner-desc"
    >
      <div className="lgpd-banner__panel">
        <div className="lgpd-banner__accent" aria-hidden />

        <div className="lgpd-banner__body">
          <div className="lgpd-banner__brand">
            <img src={BRAND.logotipo} alt="" className="lgpd-banner__logo" width={36} height={36} />
            <div className="lgpd-banner__copy">
              <p id="lgpd-banner-title" className="lgpd-banner__title">
                Cookies e privacidade
              </p>
              <p id="lgpd-banner-desc" className="lgpd-banner__text">
                O <strong>{BRAND.name}</strong> guarda, na sua conta, os dados da gestão da CIPA:
                membros, reuniões, atas e eleição. Cookies essenciais mantêm o acesso seguro. Com o
                seu consentimento, a home e o plano Iniciante também usam cookies de publicidade do
                Google AdSense. Consulte os{' '}
                <Link to="/termos-de-uso">Termos</Link>, a{' '}
                <Link to="/politica-privacidade">Privacidade</Link> e a{' '}
                <Link to="/politica-cookies">Política de Cookies</Link>.
              </p>
            </div>
          </div>

          <div className="lgpd-banner__actions">
            <button
              type="button"
              className="lgpd-banner__btn lgpd-banner__btn--ghost"
              onClick={() => escolher('essential')}
            >
              Apenas essenciais
            </button>
            <button
              type="button"
              className="lgpd-banner__btn lgpd-banner__btn--primary"
              onClick={() => escolher('all')}
            >
              Aceitar todos
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
