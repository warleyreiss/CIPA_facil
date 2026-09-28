import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';
import { Button } from './Button';

export interface SheetProps {
  visible: boolean;
  onHide: () => void;
  header?: React.ReactNode;
  children?: React.ReactNode;
  position?: 'right' | 'left' | string;
  className?: string;
  style?: React.CSSProperties;
  fullScreen?: boolean;
  showCloseIcon?: boolean;
  showHeader?: boolean;
  modal?: boolean;
  dismissableMask?: boolean;
  blockScroll?: boolean;
  overlayClassName?: string;
  [key: string]: any;
}

/** Side panel equivalent to PrimeReact Sidebar */
export function Sheet({
  visible,
  onHide,
  header,
  children,
  position = 'right',
  className,
  style,
  fullScreen,
  showCloseIcon = true,
  showHeader = true,
  overlayClassName,
}: SheetProps) {
  const side = position === 'left' ? 'left' : 'right';
  // Evita faixa vazia no topo (ex.: cadastro fullscreen com close customizado)
  const renderHeader = showHeader && (header != null || showCloseIcon);

  return (
    <DialogPrimitive.Root open={visible} onOpenChange={(open) => !open && onHide()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cn(cepi.modal.overlay, overlayClassName)} />
        <DialogPrimitive.Content
          className={cn(
            cepi.sheet.root,
            fullScreen ? 'inset-0 w-full' : 'w-[min(520px,94vw)]',
            !fullScreen && (side === 'right' ? 'right-0 border-l' : 'left-0 border-r'),
            className,
          )}
          style={style}
          aria-describedby={undefined}
        >
          {renderHeader ? (
            <div className="cepi-sheet__header flex items-center justify-between gap-3">
              <DialogPrimitive.Title className="m-0 text-[0.9375rem] font-semibold text-text-1">
                {header ?? 'Painel'}
              </DialogPrimitive.Title>
              {showCloseIcon ? (
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="cepi-sheet__close"
                    aria-label="Fechar"
                    icon={<X className="h-4 w-4" />}
                  />
                </DialogPrimitive.Close>
              ) : null}
            </div>
          ) : (
            <DialogPrimitive.Title className="sr-only">Painel</DialogPrimitive.Title>
          )}
          <div className={cn('cepi-sheet__body', fullScreen && 'cepi-sheet__body--flush')}>{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
