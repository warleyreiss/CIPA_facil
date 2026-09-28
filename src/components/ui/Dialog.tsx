import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';
import { Button } from './Button';

export interface DialogProps {
  visible: boolean;
  onHide: () => void;
  header?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dismissableMask?: boolean;
  closable?: boolean;
  modal?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  showHeader?: boolean;
  blockScroll?: boolean;
  position?: string;
  maximizable?: boolean;
  keepInViewport?: boolean;
  focusOnShow?: boolean;
  [key: string]: any;
}

export function Dialog({
  visible,
  onHide,
  header,
  children,
  footer,
  className,
  style,
  dismissableMask = true,
  closable = true,
  closeOnEscape = true,
  showHeader = true,
}: DialogProps) {
  const showTitleBar = showHeader && (header != null || closable);
  const podeDispensar = closable || dismissableMask || closeOnEscape;

  return (
    <DialogPrimitive.Root
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          if (!podeDispensar) return;
          onHide();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(cepi.modal.overlay, 'data-[state=open]:animate-in data-[state=closed]:animate-out')} />
        <DialogPrimitive.Content
          className={cn(
            cepi.modal.content,
            'overflow-auto focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
            className,
          )}
          style={style}
          onPointerDownOutside={(e) => {
            if (!dismissableMask) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!dismissableMask) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (!closeOnEscape) e.preventDefault();
          }}
        >
          {showTitleBar ? (
            <div className={cepi.modal.header}>
              <DialogPrimitive.Title className="m-0 text-[0.9375rem] font-semibold text-text-1">
                {header}
              </DialogPrimitive.Title>
              {closable ? (
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Fechar" icon={<X className="h-4 w-4" />} />
                </DialogPrimitive.Close>
              ) : null}
            </div>
          ) : null}
          <div className={cepi.modal.body}>{children}</div>
          {footer ? <div className={cepi.modal.footer}>{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
