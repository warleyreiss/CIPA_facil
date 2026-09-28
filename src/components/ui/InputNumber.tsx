import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface InputNumberProps {
  id?: string;
  inputId?: string;
  value?: number | null;
  onChange?: (e: { value: number | null }) => void;
  onValueChange?: (e: { value: number | null }) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  showButtons?: boolean;
  mode?: 'decimal' | 'currency';
  currency?: string;
  currencyDisplay?: string;
  locale?: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  placeholder?: string;
  invalid?: boolean;
  [key: string]: any;
}

export function InputNumber({
  id,
  inputId,
  value,
  onChange,
  onValueChange,
  min,
  max,
  step = 1,
  disabled,
  className,
  inputClassName,
  showButtons,
  placeholder = ' ',
  invalid,
}: InputNumberProps) {
  const isInvalid = Boolean(invalid || className?.includes('p-invalid'));
  const emit = (v: number | null) => {
    onChange?.({ value: v });
    onValueChange?.({ value: v });
  };

  const parse = (raw: string) => {
    if (raw.trim() === '') return null;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const clamp = (n: number | null) => {
    if (n == null) return null;
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };

  const input = (
    <input
      id={inputId || id}
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      onChange={(e) => emit(clamp(parse(e.target.value)))}
      className={cn(
        'ui-float-control h-[var(--float-control-h)] w-full rounded-[var(--fr)] border border-border bg-surface px-3 text-[0.8125rem] text-text-1 outline-none focus:border-green focus:shadow-none disabled:opacity-60',
        isInvalid && 'border-danger p-invalid',
        inputClassName,
      )}
    />
  );

  if (!showButtons) {
    return <div className={cn('ui-float-slot w-full', className)}>{input}</div>;
  }

  return (
    <div className={cn('ui-float-slot flex w-full items-stretch gap-1', className)}>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled={disabled}
        icon={<Minus className="h-3.5 w-3.5" />}
        onClick={() => emit(clamp((value ?? 0) - step))}
      />
      {input}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled={disabled}
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => emit(clamp((value ?? 0) + step))}
      />
    </div>
  );
}
