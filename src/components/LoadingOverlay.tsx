import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BRAND } from '../lib/brandAssets';
import '../assets/css/especificos/loadingOverlay.css';

/** Deve bater com --boot-exit-ms no CSS */
export const BOOT_VIGNETTE_EXIT_MS = 850;

const FRASES_BOOT = [
  'Preparando seu ambiente…',
  'Sincronizando dados…',
  'Quase lá…',
  'Tudo pronto.',
];

export type LoadingOverlayProps = {
  /** Se false, dispara dissolve para transparente e depois desmonta. */
  visible?: boolean;
  /** timed: ciclo curto + onComplete. hold: fica até visible=false. */
  mode?: 'timed' | 'hold';
  /** Mensagem fixa (hold) ou sobrescreve o ciclo. */
  message?: string;
  /** Duração mínima do modo timed (ms). */
  durationMs?: number;
  onComplete?: () => void;
  /** Porta para body (fullscreen real). Default true. */
  portal?: boolean;
};

/**
 * Vinheta de boot leve (logo + atmosfera) com dissolve para transparente na saída.
 */
export default function LoadingOverlay({
  visible = true,
  mode = 'timed',
  message,
  durationMs = 1600,
  onComplete,
  portal = true,
}: LoadingOverlayProps) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExiting(false);
      setIndex(0);
      setFade(true);
      return;
    }

    if (!mounted) return;

    // Garante 1 frame no estado “cheio” antes do dissolve (transição CSS)
    const frame = window.requestAnimationFrame(() => {
      setExiting(true);
    });
    const t = window.setTimeout(() => setMounted(false), BOOT_VIGNETTE_EXIT_MS + 32);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, [visible, mounted]);

  useEffect(() => {
    if (!visible || mode !== 'timed') return;

    const n = FRASES_BOOT.length;
    const porFrase = Math.max(280, Math.floor((durationMs - 80) / n));
    let i = 0;

    const tick = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        i = Math.min(i + 1, n - 1);
        setIndex(i);
        setFade(true);
      }, 90);
    }, porFrase);

    const done = window.setTimeout(() => {
      window.clearInterval(tick);
      window.requestAnimationFrame(() => {
        setExiting(true);
        window.setTimeout(() => {
          setMounted(false);
          onComplete?.();
        }, BOOT_VIGNETTE_EXIT_MS);
      });
    }, durationMs);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [visible, mode, durationMs, onComplete]);

  if (!mounted) return null;

  const frase = message ?? (mode === 'timed' ? FRASES_BOOT[index] : 'Carregando…');

  const node = (
    <div
      className={`boot-vignette${exiting ? ' boot-vignette--exit' : ''}`}
      data-mode={mode}
      style={
        {
          '--boot-duration': `${durationMs}ms`,
          '--boot-exit-ms': `${BOOT_VIGNETTE_EXIT_MS}ms`,
        } as CSSProperties
      }
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={frase}
    >
      <div className="boot-vignette__atmosphere" aria-hidden>
        <span className="boot-vignette__glow boot-vignette__glow--a" />
        <span className="boot-vignette__glow boot-vignette__glow--b" />
        <span className="boot-vignette__grain" />
      </div>

      <div className="boot-vignette__stage">
        <div className="boot-vignette__mark">
          <div className="boot-vignette__orbit" aria-hidden>
            <span className="boot-vignette__arc" />
            <span className="boot-vignette__dot" />
          </div>
          <div className="boot-vignette__logo-wrap">
            <img
              src={BRAND.logotipo}
              alt=""
              className="boot-vignette__logo"
              width={72}
              height={72}
              decoding="async"
            />
          </div>
        </div>

        <p className={`boot-vignette__msg${fade ? '' : ' boot-vignette__msg--out'}`}>{frase}</p>

        <div className="boot-vignette__bar" aria-hidden>
          <span className="boot-vignette__bar-fill" />
        </div>

        <span className="boot-vignette__brand">{BRAND.name}</span>
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(node, document.body);
  }
  return node;
}
