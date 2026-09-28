import * as React from 'react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';

export function Steps({
  model,
  activeIndex = 0,
  className,
  readOnly = true,
  style,
}: {
  model: Array<{ label: string }>;
  activeIndex?: number;
  className?: string;
  readOnly?: boolean;
  onSelect?: (e: { index: number }) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-2', className)} style={style}>
      {model.map((item, i) => {
        const active = i === activeIndex;
        const done = i < activeIndex;
        return (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] font-bold',
                active && 'bg-green text-white',
                done && 'bg-green-soft text-green-deep',
                !active && !done && 'bg-surface-3 text-text-3',
              )}
            >
              {i + 1}
            </span>
            <span className={cn('text-[0.75rem]', active ? 'font-semibold text-text-1' : 'text-text-3')}>
              {item.label}
            </span>
            {i < model.length - 1 ? <span className="mx-1 h-px w-4 bg-border" /> : null}
          </li>
        );
      })}
      {readOnly ? null : null}
    </ol>
  );
}

export function Toolbar({
  start,
  end,
  className,
}: {
  start?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(cepi.table.toolbar, className)}>
      {start ? (
        <div className="p-toolbar-group-start flex min-w-0 flex-wrap items-center gap-2">{start}</div>
      ) : null}
      {end ? (
        <div className="p-toolbar-group-end flex min-w-0 flex-wrap items-center gap-2 justify-end">{end}</div>
      ) : null}
    </div>
  );
}

export function InputMask({
  id,
  value,
  onChange,
  mask,
  className,
  disabled,
  invalid,
  placeholder = ' ',
  ...rest
}: {
  id?: string;
  value?: string;
  onChange?: (e: { value: string; originalEvent?: React.ChangeEvent<HTMLInputElement> }) => void;
  mask?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  // Lightweight mask: keep digits/letters according to mask pattern (# = digit, a = letter, * = any)
  const applyMask = (raw: string) => {
    if (!mask) return raw;
    const cleaned = raw.replace(/[^\da-zA-Z]/g, '');
    let ri = 0;
    let out = '';
    for (let i = 0; i < mask.length && ri < cleaned.length; i++) {
      const m = mask[i];
      if (m === '9' || m === '#') {
        if (/\d/.test(cleaned[ri])) out += cleaned[ri++];
        else break;
      } else if (m === 'a') {
        if (/[a-zA-Z]/.test(cleaned[ri])) out += cleaned[ri++];
        else break;
      } else if (m === '*') {
        out += cleaned[ri++];
      } else {
        out += m;
      }
    }
    return out;
  };

  return (
    <input
      id={id}
      value={value ?? ''}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange?.({ value: applyMask(e.target.value), originalEvent: e })}
      className={cn(
        'h-9 w-full rounded-[3px] border border-border bg-surface px-3 text-[0.8125rem] text-text-1 outline-none focus:border-green focus:ring-1 focus:ring-green-line disabled:opacity-60',
        invalid && 'border-danger',
        className,
      )}
      {...rest}
    />
  );
}
