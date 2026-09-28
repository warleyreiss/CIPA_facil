import * as React from 'react';
import { createContext, useCallback, useContext, useImperativeHandle, useMemo, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error' | 'secondary';

export interface ToastMessage {
  id: string;
  severity?: ToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
}

interface ToastContextValue {
  show: (msg: Omit<ToastMessage, 'id'> | Omit<ToastMessage, 'id'>[]) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: (() => undefined) as ToastContextValue['show'],
      clear: () => undefined,
    };
  }
  return ctx;
}

export type ToastRef = ToastContextValue;

/** Allows `useRef<Toast>(null)` while keeping the Toast component value export. */
export type Toast = ToastRef;

const icons: Record<ToastSeverity, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green" />,
  info: <Info className="h-4 w-4 text-info" />,
  warn: <AlertTriangle className="h-4 w-4 text-warning" />,
  error: <XCircle className="h-4 w-4 text-danger" />,
  secondary: <Info className="h-4 w-4 text-text-3" />,
};

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);

  const clear = useCallback(() => setItems([]), []);

  const show = useCallback((msg: Omit<ToastMessage, 'id'> | Omit<ToastMessage, 'id'>[]) => {
    const list = Array.isArray(msg) ? msg : [msg];
    const withIds = list.map((m) => ({
      ...m,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      severity: m.severity ?? 'info',
      life: m.life ?? 3500,
    }));
    setItems((prev) => [...prev, ...withIds]);
    withIds.forEach((m) => {
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== m.id));
      }, m.life);
    });
  }, []);

  const value = useMemo(() => ({ show, clear }), [show, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[2000] flex w-[min(360px,92vw)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex gap-2 rounded-[3px] border bg-surface px-3 py-2 shadow-lg',
              item.severity === 'success' && 'border-green-line',
              item.severity === 'error' && 'border-danger-line',
              item.severity === 'warn' && 'border-warning-line',
              item.severity === 'info' && 'border-info-line',
              (!item.severity || item.severity === 'secondary') && 'border-border',
            )}
          >
            <div className="mt-0.5 shrink-0">{icons[item.severity ?? 'info']}</div>
            <div className="min-w-0 flex-1">
              {item.summary ? <div className="text-[0.8125rem] font-semibold text-text-1">{item.summary}</div> : null}
              {item.detail ? <div className="text-[0.75rem] text-text-2">{item.detail}</div> : null}
            </div>
            <button
              type="button"
              className="shrink-0 text-text-3 hover:text-text-1"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Drop-in for <Toast ref={toast} /> — bridges to ToasterProvider */
export const Toast = React.forwardRef<ToastRef, Record<string, unknown>>(function Toast(_props, ref) {
  const api = useToast();
  useImperativeHandle(ref, () => api, [api]);
  return null;
});
