import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Checkbox({
  checked,
  value,
  onChange,
  inputId,
  id,
  disabled,
  className,
}: {
  checked?: boolean;
  value?: boolean | any;
  onChange?: (e: { checked: boolean; value?: boolean }) => void;
  inputId?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}) {
  // `value` no PrimeReact Checkbox costuma ser o item (ex.: id), não o boolean —
  // só usar value como fallback quando for boolean explícito.
  const isChecked =
    checked !== undefined ? !!checked : typeof value === 'boolean' ? value : false;
  return (
    <CheckboxPrimitive.Root
      id={inputId || id}
      checked={isChecked}
      disabled={disabled}
      onCheckedChange={(v) => onChange?.({ checked: v === true, value: v === true })}
      className={cn(
        'cepi-checkbox p-checkbox flex h-4 w-4 shrink-0 grow-0 basis-4 items-center justify-center overflow-visible rounded-[3px] border border-border bg-surface text-[#fff] data-[state=checked]:border-green data-[state=checked]:bg-green data-[state=checked]:text-[#fff]',
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="cepi-checkbox__indicator flex items-center justify-center text-[#fff]">
        <Check className="cepi-checkbox__icon h-3 w-3" strokeWidth={3} color="#fff" aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  className,
  inputId,
  id,
}: {
  checked?: boolean;
  onChange?: (e: { value: boolean }) => void;
  disabled?: boolean;
  className?: string;
  inputId?: string;
  id?: string;
  [key: string]: any;
}) {
  return (
    <SwitchPrimitive.Root
      id={inputId || id}
      checked={!!checked}
      disabled={disabled}
      onCheckedChange={(v) => onChange?.({ value: v })}
      className={cn(
        'cepi-switch relative inline-flex h-5 w-9 shrink-0 grow-0 basis-9 rounded-full bg-border transition-colors data-[state=checked]:bg-green',
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 shrink-0 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[1.125rem]" />
    </SwitchPrimitive.Root>
  );
}

/** PrimeReact InputSwitch alias */
export const InputSwitch = Switch;

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
  optionLabel = 'label',
  optionValue = 'value',
  disabled,
}: {
  value?: T | null;
  options: Array<Record<string, any>>;
  onChange?: (e: { value: T }) => void;
  className?: string;
  optionLabel?: string;
  optionValue?: string;
  disabled?: boolean;
  [key: string]: any;
}) {
  return (
    <div className={cn('inline-flex rounded-[3px] border border-border bg-surface-2 p-0.5', className)}>
      {options.map((opt) => {
        const v = opt[optionValue] as T;
        const active = value === v;
        return (
          <button
            key={String(v)}
            type="button"
            disabled={disabled}
            className={cn(
              'rounded-[3px] px-3 py-1.5 text-[0.75rem] font-medium transition-colors',
              active ? 'bg-green text-white' : 'text-text-2 hover:bg-surface-hover',
              disabled && 'opacity-60',
            )}
            onClick={() => onChange?.({ value: v })}
          >
            {opt[optionLabel]}
          </button>
        );
      })}
    </div>
  );
}

export const SelectButton = SegmentedControl;
