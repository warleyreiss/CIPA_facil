import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

type ConfirmOpts = {
  message?: React.ReactNode;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClassName?: string;
  accept?: () => void;
  reject?: () => void;
};

/** Pilha de instâncias montadas — o último ConfirmDialog ativo recebe o confirmDialog(). */
const listeners: Array<(opts: ConfirmOpts) => void> = [];

export function confirmDialog(opts: ConfirmOpts) {
  const handler = listeners[listeners.length - 1];
  if (!handler) {
    console.warn('[confirmDialog] Nenhum <ConfirmDialog /> montado.');
    return;
  }
  handler(opts);
}

function isDangerAccept(className?: string) {
  return !!className && /p-button-danger|danger|destructive/i.test(className);
}

export function ConfirmDialog() {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => setOpts(o), []);

  useEffect(() => {
    listeners.push(confirm);
    return () => {
      const idx = listeners.lastIndexOf(confirm);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [confirm]);

  const fechar = (acionarReject = false) => {
    if (acionarReject) opts?.reject?.();
    setOpts(null);
  };

  return (
    <Dialog
      visible={!!opts}
      onHide={() => fechar(true)}
      header={opts?.header ?? 'Confirmação'}
      style={{ width: 'min(420px, 92vw)' }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            label={opts?.rejectLabel ?? 'Não'}
            variant="secondary"
            onClick={() => fechar(true)}
          />
          <Button
            type="button"
            label={opts?.acceptLabel ?? 'Sim'}
            variant={isDangerAccept(opts?.acceptClassName) ? 'danger' : 'primary'}
            onClick={() => {
              const accept = opts?.accept;
              setOpts(null);
              accept?.();
            }}
          />
        </div>
      }
    >
      <div className="flex items-start gap-2 text-[0.8125rem] text-text-2">
        {opts?.icon ? <i className={`${opts.icon} text-warning mt-0.5`} aria-hidden /> : null}
        <div>{opts?.message}</div>
      </div>
    </Dialog>
  );
}
