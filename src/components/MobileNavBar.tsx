import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { BRAND } from '../lib/brandAssets';
import '../assets/css/especificos/mobile-nav.css';

interface MobileNavBarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpen?: () => void;
  children: ReactNode;
  planoSlot?: ReactNode;
  footerSlot?: ReactNode;
}

const CLOSE_THRESHOLD_PX = 72;
const OPEN_THRESHOLD_PX = 56;
const VELOCITY_CLOSE = 0.45; // px/ms

export default function MobileNavBar({
  isOpen,
  onToggle,
  onClose,
  onOpen,
  children,
  planoSlot,
  footerSlot,
}: MobileNavBarProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastTs: number;
    origin: 'sheet' | 'bar';
    dragging: boolean;
  } | null>(null);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragRef.current = null;
    setDragY(0);
    setDragging(false);
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  }, []);

  useEffect(() => {
    if (!isOpen) resetDrag();
  }, [isOpen, resetDrag]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const applySheetTransform = (offsetY: number) => {
    if (!sheetRef.current) return;
    const y = Math.max(0, offsetY);
    sheetRef.current.style.transform = `translateY(${y}px)`;
  };

  const endSheetDrag = (clientY: number) => {
    const state = dragRef.current;
    if (!state?.dragging) {
      resetDrag();
      return;
    }

    const delta = Math.max(0, clientY - state.startY);
    const dt = Math.max(1, performance.now() - state.lastTs);
    const velocity = (clientY - state.lastY) / dt;

    resetDrag();

    if (delta > CLOSE_THRESHOLD_PX || velocity > VELOCITY_CLOSE) {
      onClose();
    }
  };

  const onSheetPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!isOpen) return;
    // Só inicia arraste a partir do handle / topo; scroll interno continua livre
    const target = e.target as HTMLElement;
    const fromHandle = Boolean(target.closest('.mobile-nav-sheet__handle-hit'));
    const scrollEl = sheetRef.current?.querySelector('.mobile-nav-sheet__scroll') as HTMLElement | null;
    if (!fromHandle && scrollEl && scrollEl.scrollTop > 0) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTs: performance.now(),
      origin: 'sheet',
      dragging: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onSheetPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== e.pointerId || state.origin !== 'sheet') return;

    const delta = e.clientY - state.startY;
    if (!state.dragging) {
      if (delta < 8) return;
      state.dragging = true;
      setDragging(true);
    }

    state.lastY = e.clientY;
    state.lastTs = performance.now();
    const y = Math.max(0, delta);
    setDragY(y);
    applySheetTransform(y);
  };

  const onSheetPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== e.pointerId || state.origin !== 'sheet') return;
    endSheetDrag(e.clientY);
  };

  const onBarPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (isOpen) return;
    // Evita conflito com o botão de toggle
    if ((e.target as HTMLElement).closest('.mobile-bottom-bar__toggle')) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTs: performance.now(),
      origin: 'bar',
      dragging: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onBarPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== e.pointerId || state.origin !== 'bar') return;

    const deltaUp = state.startY - e.clientY;
    if (!state.dragging) {
      if (deltaUp < 10) return;
      state.dragging = true;
      setDragging(true);
    }

    state.lastY = e.clientY;
    state.lastTs = performance.now();
  };

  const onBarPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== e.pointerId || state.origin !== 'bar') return;

    const deltaUp = state.startY - e.clientY;
    const wasDragging = state.dragging;
    resetDrag();

    if (wasDragging && deltaUp > OPEN_THRESHOLD_PX) {
      onOpen?.();
    }
  };

  const sheetStyle =
    dragging && isOpen && dragY > 0
      ? { transform: `translateY(${dragY}px)`, transition: 'none' as const }
      : undefined;

  return (
    <>
      <div
        className={`mobile-nav-backdrop ${isOpen ? 'mobile-nav-backdrop--visible' : ''} ${dragging ? 'mobile-nav-backdrop--dragging' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
        style={
          isOpen && dragging
            ? { opacity: Math.max(0.15, 1 - dragY / 280) }
            : undefined
        }
      />

      <aside
        ref={sheetRef}
        id="mobile-nav-sheet"
        className={[
          'mobile-nav-sheet',
          isOpen ? 'mobile-nav-sheet--open' : '',
          dragging ? 'mobile-nav-sheet--dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        style={sheetStyle}
        onPointerDown={onSheetPointerDown}
        onPointerMove={onSheetPointerMove}
        onPointerUp={onSheetPointerUp}
        onPointerCancel={onSheetPointerUp}
      >
        <div
          className="mobile-nav-sheet__handle-hit"
          role="button"
          tabIndex={isOpen ? 0 : -1}
          aria-label="Arraste para baixo para fechar o menu"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <div className="mobile-nav-sheet__handle" aria-hidden />
          <span className="mobile-nav-sheet__handle-hint">Arraste para fechar</span>
        </div>
        <div className="mobile-nav-sheet__scroll">
          <nav className="mobile-nav-sheet__links">{children}</nav>
          {planoSlot ? (
            <div className="mobile-nav-sheet__plano">{planoSlot}</div>
          ) : null}
          {footerSlot ? (
            <div className="mobile-nav-sheet__footer">{footerSlot}</div>
          ) : null}
        </div>
      </aside>

      <footer
        className="mobile-bottom-bar"
        role="navigation"
        aria-label="Menu principal"
        onPointerDown={onBarPointerDown}
        onPointerMove={onBarPointerMove}
        onPointerUp={onBarPointerUp}
        onPointerCancel={onBarPointerUp}
      >
        <div className="mobile-bottom-bar__brand">
          <img
            src={BRAND.logomarca}
            alt={BRAND.name}
            className="mobile-bottom-bar__logo"
            draggable={false}
          />
        </div>
        <button
          type="button"
          className={`mobile-bottom-bar__toggle ${isOpen ? 'mobile-bottom-bar__toggle--open' : ''}`}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-sheet"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <i className={`pi ${isOpen ? 'pi-times' : 'pi-bars'}`} aria-hidden />
        </button>
      </footer>
    </>
  );
}
