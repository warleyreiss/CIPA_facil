import * as React from 'react';
import { cn } from '../../lib/cn';

type BadgeSeverity = 'success' | 'info' | 'warn' | 'warning' | 'danger' | 'secondary' | 'contrast';

const severityClass: Record<BadgeSeverity, string> = {
  success: 'bg-green-soft text-green-deep border-green-line',
  info: 'bg-info-soft text-info border-info-line',
  warn: 'bg-warning-soft text-warning border-warning-line',
  warning: 'bg-warning-soft text-warning border-warning-line',
  danger: 'bg-danger-soft text-danger border-danger-line',
  secondary: 'bg-surface-2 text-text-2 border-border',
  contrast: 'bg-text-1 text-white border-text-1',
};

export function Badge({
  value,
  severity = 'secondary',
  className,
}: {
  value?: React.ReactNode;
  severity?: BadgeSeverity;
  className?: string;
  [key: string]: any;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[1.25rem] items-center justify-center rounded-[3px] border px-1.5 py-0.5 text-[0.6875rem] font-semibold',
        severityClass[severity],
        className,
      )}
    >
      {value}
    </span>
  );
}

export function Tag({
  value,
  severity = 'secondary',
  className,
  icon,
  style,
  cellStatus,
}: {
  value?: React.ReactNode;
  severity?: BadgeSeverity;
  className?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  cellStatus?: boolean;
  [key: string]: any;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[0.75rem] font-medium',
        severityClass[severity],
        cellStatus && 'cepi-tag--cell-status',
        className,
      )}
      style={style}
    >
      {icon}
      {value}
    </span>
  );
}

export function Alert({
  severity = 'info',
  text,
  content,
  children,
  className,
}: {
  severity?: 'success' | 'info' | 'warn' | 'error';
  text?: React.ReactNode;
  content?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  const map: Record<string, string> = {
    success: 'border-green-line bg-green-ghost text-green-deep',
    info: 'border-info-line bg-info-soft text-info',
    warn: 'border-warning-line bg-warning-soft text-warning',
    error: 'border-danger-line bg-danger-soft text-danger',
  };
  return (
    <div className={cn('flex w-full items-start gap-2 rounded-[3px] border px-3 py-2 text-[0.8125rem]', map[severity], className)}>
      {content ?? text ?? children}
    </div>
  );
}

/** Alias for PrimeReact Message */
export function Message(props: {
  severity?: 'success' | 'info' | 'warn' | 'error';
  text?: React.ReactNode;
  content?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return <Alert {...props} />;
}
