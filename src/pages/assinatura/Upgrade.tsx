import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { stripeService } from '../../lib/stripeService';
import { useProjeto } from '../../contexts/ProjetoContext';
import { SESSION_KEYS } from '../../lib/storageService';
import { BRAND } from '../../lib/brandAssets';
import LinkAjudaSuporte from '../../components/LinkAjudaSuporte';
import {
  destaquesComerciaisPlano,
  taglineComercialPlano,
  ordenarPlanosUpgrade,
  filtrarPlanosComerciais,
  isPlanoGratuito,
  isProdutoPlanoGratuito,
} from '../../lib/recursosPlano';
import { isLimiteIlimitado } from '../../lib/limitesPlanoUtils';
import '../../assets/css/especificos/upgrade.css';

const SWIPE_THRESHOLD = 48;
const LOOP_COPIES = 3;
const LOOP_TRANSITION_MS = 560;

export default function Upgrade() {
  const { userData, assinatura } = useProjeto();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutCancelado = searchParams.get('cancelado') === '1';
  const [planos, setPlanos] = useState<any[]>([]);
  const [fetchingPlanos, setFetchingPlanos] = useState(true);
  const [loading, setLoading] = useState('');
  const [erroApi, setErroApi] = useState<string | null>(null);
  /** Índice no trilho (com clones). Com loop, vivemos na cópia do meio. */
  const [loopIndex, setLoopIndex] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [snapInstant, setSnapInstant] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragDelta = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchPlanosDinamicos = async () => {
      setErroApi(null);
      setFetchingPlanos(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-plans');
        if (error) throw error;
        if (data && Array.isArray(data) && data.length > 0) {
          setPlanos(ordenarPlanosUpgrade(filtrarPlanosComerciais(data)));
        }
      } catch (err: any) {
        console.error('Erro ao buscar planos:', err);
        setErroApi('Não foi possível sincronizar os preços do Stripe. Tente novamente em instantes.');
      } finally {
        setFetchingPlanos(false);
      }
    };
    fetchPlanosDinamicos();
  }, []);

  // Bloqueia o scroll do body enquanto o painel fullscreen está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isPlanoAtual = useCallback(
    (plano: any) => {
      if (plano?.id && (plano.id === assinatura?.plano_regra_id || plano.id === assinatura?.stripe_price_id)) {
        return true;
      }
      // Cadastro gratuito legado sem plano_regra_id: casa pelo nome/tipo INICIANTE
      if (
        !assinatura?.plano_regra_id &&
        !assinatura?.stripe_price_id &&
        isPlanoGratuito(assinatura?.plano_tipo) &&
        isProdutoPlanoGratuito(plano)
      ) {
        return true;
      }
      return false;
    },
    [assinatura?.plano_regra_id, assinatura?.stripe_price_id, assinatura?.plano_tipo],
  );

  const planoAtual = planos.find((p) => isPlanoAtual(p));
  const valorAtual = planoAtual?.valor_num || 0;
  const featuredPlanIndex = planos.length > 1 ? Math.min(1, planos.length - 1) : 0;

  const totalPlanos = planos.length;
  const loopAtivo = totalPlanos > 1;

  const slides = useMemo(() => {
    if (totalPlanos === 0) return [] as { plano: any; logical: number; key: string }[];
    const copies = loopAtivo ? LOOP_COPIES : 1;
    const out: { plano: any; logical: number; key: string }[] = [];
    for (let copy = 0; copy < copies; copy += 1) {
      planos.forEach((plano, logical) => {
        out.push({
          plano,
          logical,
          key: `${copy}-${plano.id ?? logical}`,
        });
      });
    }
    return out;
  }, [planos, totalPlanos, loopAtivo]);

  // Índice inicial: plano atual, senão o "mais popular" (cópia do meio na roleta)
  useEffect(() => {
    if (planos.length === 0) return;
    const currentIdx = planos.findIndex((p) => isPlanoAtual(p));
    const logical = currentIdx >= 0 ? currentIdx : featuredPlanIndex;
    const next = loopAtivo ? totalPlanos + logical : logical;
    setLoopIndex(next);
  }, [planos, isPlanoAtual, featuredPlanIndex, loopAtivo, totalPlanos]);

  const logicalIndex = totalPlanos > 0 ? ((loopIndex % totalPlanos) + totalPlanos) % totalPlanos : 0;

  const goToSlide = useCallback((slideIndex: number) => {
    setLoopIndex(slideIndex);
  }, []);

  const goToLogical = useCallback(
    (logical: number) => {
      if (totalPlanos === 0) return;
      const target = Math.max(0, Math.min(totalPlanos - 1, logical));
      if (!loopAtivo) {
        setLoopIndex(target);
        return;
      }
      const candidates = [target, target + totalPlanos, target + totalPlanos * 2];
      let best = candidates[1];
      let bestDist = Number.POSITIVE_INFINITY;
      for (const c of candidates) {
        const d = Math.abs(c - loopIndex);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      setLoopIndex(best);
    },
    [totalPlanos, loopAtivo, loopIndex],
  );

  const goPrev = useCallback(() => {
    if (totalPlanos === 0) return;
    setLoopIndex((i) => (loopAtivo ? i - 1 : Math.max(0, i - 1)));
  }, [totalPlanos, loopAtivo]);

  const goNext = useCallback(() => {
    if (totalPlanos === 0) return;
    setLoopIndex((i) => (loopAtivo ? i + 1 : Math.min(totalPlanos - 1, i + 1)));
  }, [totalPlanos, loopAtivo]);

  // Reposiciona silenciosamente na cópia do meio após atravessar as bordas
  useEffect(() => {
    if (!loopAtivo || totalPlanos === 0) return;
    if (loopIndex >= totalPlanos && loopIndex < totalPlanos * 2) return;

    const timer = window.setTimeout(() => {
      setSnapInstant(true);
      setLoopIndex((prev) => {
        let next = prev;
        while (next < totalPlanos) next += totalPlanos;
        while (next >= totalPlanos * 2) next -= totalPlanos;
        return next;
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSnapInstant(false));
      });
    }, LOOP_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [loopIndex, loopAtivo, totalPlanos]);

  const measureOffset = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const slideEls = track.querySelectorAll<HTMLElement>('.upgrade-carousel__slide');
    const activeSlide = slideEls[loopIndex];
    if (!activeSlide) return;

    const viewportWidth = viewport.clientWidth;
    const slideCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
    setTrackOffset(viewportWidth / 2 - slideCenter);
  }, [loopIndex]);

  useEffect(() => {
    measureOffset();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const ro = new ResizeObserver(() => measureOffset());
    ro.observe(viewport);
    window.addEventListener('resize', measureOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureOffset);
    };
  }, [measureOffset, slides.length, snapInstant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) return;
    pointerIdRef.current = e.pointerId;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setIsDragging(true);
    setDragOffset(0);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return;
    dragDelta.current = e.clientX - dragStartX.current;
    setDragOffset(dragDelta.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return;
    const delta = dragDelta.current;
    setIsDragging(false);
    setDragOffset(0);
    pointerIdRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      if (delta < 0) goNext();
      else goPrev();
    }
  };

  const handleSelect = async (plano: any) => {
    if (isPlanoAtual(plano)) return;

    // Plano gratuito (Iniciante) nunca vai para o checkout do Stripe.
    if (isProdutoPlanoGratuito(plano)) {
      sessionStorage.setItem(SESSION_KEYS.targetPlan, JSON.stringify(plano));
      navigate('/downgrade');
      return;
    }

    const valorNovo = plano.valor_num || 0;
    if (valorNovo < valorAtual) {
      sessionStorage.setItem(SESSION_KEYS.targetPlan, JSON.stringify(plano));
      navigate('/downgrade');
      return;
    }

    setLoading(plano.id);
    try {
      if (!assinatura?.id) throw new Error('Assinatura não carregada. Atualize a página.');
      sessionStorage.setItem(SESSION_KEYS.targetPlan, JSON.stringify(plano));
      sessionStorage.setItem(SESSION_KEYS.planoChangeMode, 'upgrade');
      const data = await stripeService.invokeCheckoutAutenticado({
        priceId: plano.id,
        assinaturaId: assinatura.id,
        userId: userData?.id,
        userEmail: userData?.email,
      });
      if (data?.mode === 'updated') {
        navigate('/sucesso-upgrade');
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      setErroApi('Erro ao iniciar o pagamento: ' + err.message);
    } finally {
      setLoading('');
    }
  };

  if (!userData) return null;

  const canNav = loopAtivo;

  return createPortal(
    <div className="upgrade-overlay">
      <div aria-hidden className="upgrade-grid-texture" />

      <div className="upgrade-shell">
        <header className="upgrade-header">
          <button type="button" onClick={() => navigate(-1)} className="upgrade-back">
            <i className="pi pi-arrow-left" />
            Voltar
          </button>

          <div className="upgrade-header__call">
            <span className="upgrade-badge">
              <i className="pi pi-bolt" />
              Planos e preços
            </span>
            <h1 className="upgrade-title">
              Escolha o plano que{' '}
              <span className="upgrade-title__accent">acompanha seu crescimento</span>
            </h1>
          </div>

          <div className="upgrade-brand">
            <img src={BRAND.logomarca} alt={BRAND.name} className="upgrade-brand__logo" />
          </div>
        </header>

        <div className="upgrade-main">
          {/* Carrossel */}
          <div className="upgrade-stage">
            {(checkoutCancelado || erroApi) && (
              <div className="upgrade-alerts">
                {checkoutCancelado && (
                  <div className="upgrade-alert upgrade-alert--warn">
                    <i className="pi pi-info-circle" />
                    <span>Pagamento cancelado. Nenhuma alteração foi feita na sua assinatura.</span>
                  </div>
                )}
                {erroApi && (
                  <div className="upgrade-alert upgrade-alert--error">
                    <i className="pi pi-exclamation-circle" />
                    <span>{erroApi}</span>
                  </div>
                )}
              </div>
            )}

            <div className="upgrade-content">
              {fetchingPlanos ? (
                <div className="upgrade-state">
                  <i className="pi pi-spin pi-spinner" />
                  <p>Carregando planos disponíveis...</p>
                </div>
              ) : planos.length === 0 ? (
                <div className="upgrade-state">
                  <i className="pi pi-inbox" />
                  <p>Nenhum plano disponível no momento.</p>
                </div>
              ) : (
                <div className="upgrade-carousel" aria-roledescription="carrossel" aria-label="Planos disponíveis">
                  <button
                    type="button"
                    className="upgrade-carousel__nav upgrade-carousel__nav--prev"
                    onClick={goPrev}
                    disabled={!canNav}
                    aria-label="Plano anterior"
                  >
                    <i className="pi pi-chevron-left" />
                  </button>

                  <div
                    ref={viewportRef}
                    className="upgrade-carousel__viewport"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <div
                      ref={trackRef}
                      className={[
                        'upgrade-carousel__track',
                        isDragging || snapInstant ? 'upgrade-carousel__track--dragging' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        transform: `translate3d(${trackOffset + dragOffset}px, 0, 0)`,
                      }}
                    >
                  {slides.map((slide, slideIndex) => {
                    const { plano, logical } = slide;
                    const atual = isPlanoAtual(plano);
                    const gratuito = isProdutoPlanoGratuito(plano);
                    const popular = logical === featuredPlanIndex && !atual;
                    const active = slideIndex === loopIndex;
                    const isUpgrade = (plano.valor_num || 0) > valorAtual;
                    const processando = loading === plano.id;
                    const distance = Math.abs(slideIndex - loopIndex);
                    const isPeekPrev = slideIndex === loopIndex - 1;
                    const isPeekNext = slideIndex === loopIndex + 1;

                    const slideClass = [
                      'upgrade-carousel__slide',
                      active ? 'upgrade-carousel__slide--active' : '',
                      isPeekPrev ? 'upgrade-carousel__slide--peek-prev' : '',
                      isPeekNext ? 'upgrade-carousel__slide--peek-next' : '',
                      distance > 1 ? 'upgrade-carousel__slide--far' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const cardClass = [
                      'upgrade-card',
                      active || popular ? 'upgrade-card--featured' : '',
                      atual ? 'upgrade-card--current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={slide.key}
                        className={slideClass}
                        aria-hidden={!active}
                        onClick={() => {
                          if (!active && Math.abs(dragDelta.current) < 8) goToSlide(slideIndex);
                        }}
                      >
                        <div className={cardClass}>
                          {popular && (
                            <span className="upgrade-card__ribbon upgrade-card__ribbon--featured">
                              <i className="pi pi-star-fill" aria-hidden />
                              Popular
                            </span>
                          )}
                          {atual && !popular && (
                            <span className="upgrade-card__ribbon upgrade-card__ribbon--current">
                              Seu plano
                            </span>
                          )}

                          <div className="upgrade-card__body">
                            <div className="upgrade-card__intro">
                              <div className="upgrade-card__head">
                                <h2 className="upgrade-card__name">{plano.nome}</h2>
                                <p className="upgrade-card__tagline">
                                  {taglineComercialPlano(plano.nome)}
                                </p>
                              </div>

                              <div className="upgrade-card__price">
                                <span className="upgrade-card__price-value">{plano.valor_formatado}</span>
                                {!gratuito && (
                                  <span className="upgrade-card__price-interval">/{plano.intervalo}</span>
                                )}
                              </div>

                              <div className="upgrade-card__limits">
                                <span>
                                  {isLimiteIlimitado(Number(plano.limite ?? 0))
                                    ? 'Projetos ilimitados'
                                    : (
                                      <>
                                        Até <strong>{plano.limite}</strong>{' '}
                                        {Number(plano.limite) === 1 ? 'projeto' : 'projetos'}
                                      </>
                                    )}
                                </span>
                              </div>
                            </div>

                            <ul className="upgrade-features">
                              {destaquesComerciaisPlano(plano.nome).map((feat) => (
                                <li key={feat}>
                                  <span className="upgrade-feature__check" aria-hidden>
                                    <i className="pi pi-check" />
                                  </span>
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="upgrade-card__footer">
                            {atual ? (
                              <div className="upgrade-card__active">
                                <i className="pi pi-check-circle" />
                                Plano ativo
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!active) {
                                    goToSlide(slideIndex);
                                    return;
                                  }
                                  handleSelect(plano);
                                }}
                                disabled={!!loading}
                                tabIndex={active ? 0 : -1}
                                className={[
                                  'upgrade-card__cta',
                                  active || popular
                                    ? 'upgrade-card__cta--featured'
                                    : 'upgrade-card__cta--outline',
                                ].join(' ')}
                              >
                                {processando ? (
                                  <>
                                    <i className="pi pi-spin pi-spinner" />
                                    Processando...
                                  </>
                                ) : !active ? (
                                  'Ver plano'
                                ) : gratuito ? (
                                  'Voltar ao Iniciante'
                                ) : isUpgrade ? (
                                  <>
                                    Fazer upgrade
                                    <i className="pi pi-arrow-right" />
                                  </>
                                ) : (
                                  'Trocar de plano'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="upgrade-carousel__nav upgrade-carousel__nav--next"
                onClick={goNext}
                disabled={!canNav}
                aria-label="Próximo plano"
              >
                <i className="pi pi-chevron-right" />
              </button>

              <div className="upgrade-carousel__dots" role="tablist" aria-label="Selecionar plano">
                {planos.map((plano, index) => (
                  <button
                    key={plano.id || index}
                    type="button"
                    role="tab"
                    aria-selected={index === logicalIndex}
                    aria-label={`Ir para ${plano.nome}`}
                    className={[
                      'upgrade-carousel__dot',
                      index === logicalIndex ? 'upgrade-carousel__dot--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => goToLogical(index)}
                  />
                ))}
              </div>
            </div>
              )}
            </div>
          </div>
        </div>

        <div className="upgrade-footer-help">
          <LinkAjudaSuporte tema="upgrade_plano" className="upgrade-help" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
