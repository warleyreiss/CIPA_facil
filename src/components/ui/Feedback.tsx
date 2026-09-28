import * as React from 'react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';
import { Loader2 } from 'lucide-react';

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 className={cn('animate-spin text-green', className)} style={{ width: size, height: size }} />;
}

/** PrimeReact ProgressSpinner alias */
export function ProgressSpinner({
  style,
  className,
}: {
  style?: React.CSSProperties;
  className?: string;
  strokeWidth?: string;
  [key: string]: any;
}) {
  const size = typeof style?.width === 'string' ? parseInt(style.width, 10) || 24 : 24;
  return <Spinner className={className} size={size} />;
}

export function Progress({
  value,
  className,
  showValue = true,
  mode,
  style,
}: {
  value?: number;
  className?: string;
  showValue?: boolean;
  mode?: 'determinate' | 'indeterminate';
  style?: React.CSSProperties;
  pt?: any;
  [key: string]: any;
}) {
  const indeterminate = mode === 'indeterminate' || value == null;
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)} style={style}>
      {indeterminate ? (
        <div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-green" style={{ animation: 'progress-indeterminate 1.2s ease-in-out infinite' }} />
      ) : (
        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      )}
      {showValue && !indeterminate ? (
        <span className="sr-only">{value}%</span>
      ) : null}
      <style>{`@keyframes progress-indeterminate { 0% { left: -30%; } 100% { left: 100%; } }`}</style>
    </div>
  );
}

export const ProgressBar = Progress;

export function Separator({
  className,
  layout,
  style,
  type,
}: {
  className?: string;
  layout?: 'horizontal' | 'vertical' | string;
  style?: React.CSSProperties;
  type?: string;
  [key: string]: any;
}) {
  if (layout === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('mx-2 w-px self-stretch bg-border', className)}
        style={style}
      />
    );
  }
  return <hr className={cn('my-3 border-0 border-t border-border', className)} style={style} data-type={type} />;
}

export const Divider = Separator;

export function Card({
  children,
  className,
  title,
  header,
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  header?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  return (
    <div className={cn(cepi.card.root, className)} style={style}>
      {(header || title) && (
        <div className={cepi.card.header}>{header ?? title}</div>
      )}
      <div className={cepi.card.body}>{children}</div>
    </div>
  );
}

export function Panel({
  children,
  header,
  headerTemplate,
  legend,
  className,
  toggleable,
  collapsed,
}: {
  children?: React.ReactNode;
  header?: React.ReactNode;
  headerTemplate?: any;
  legend?: React.ReactNode;
  className?: string;
  toggleable?: boolean;
  collapsed?: boolean;
  [key: string]: any;
}) {
  const [open, setOpen] = React.useState(!(collapsed ?? false));
  React.useEffect(() => {
    if (collapsed != null) setOpen(!collapsed);
  }, [collapsed]);

  const toggle = React.useCallback(() => {
    if (toggleable) setOpen((v) => !v);
  }, [toggleable]);

  const title = header ?? legend;
  const customHeader =
    typeof headerTemplate === 'function'
      ? headerTemplate({ collapsed: !open, onTogglerClick: toggle })
      : null;

  return (
    <div className={cn('cepi-card p-panel', className)}>
      {customHeader ? (
        <div className="p-panel-header">{customHeader}</div>
      ) : (
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-2 text-left text-[0.8125rem] font-semibold text-text-1"
          onClick={toggle}
        >
          {title}
          {toggleable ? <span className="text-text-3">{open ? '−' : '+'}</span> : null}
        </button>
      )}
      {open ? (
        <div className="p-panel-content border-t border-border">{children}</div>
      ) : null}
    </div>
  );
}

export const Fieldset = Panel;
