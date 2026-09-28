import * as React from 'react';
import { cn } from '../../lib/cn';

export interface FloatFieldProps {
  id?: string;
  label: string;
  className?: string;
  invalid?: boolean;
  children: React.ReactElement;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return false;
}

function readValueFromControl(control: React.ReactElement): unknown {
  const props = control.props as Record<string, unknown>;
  if (!isEmptyValue(props.value)) return props.value;
  if (!isEmptyValue(props.modelValue)) return props.modelValue;
  return props.value;
}

/** Wraps an input-like control with a floating label (PrimeReact FloatLabel equivalent). */
export function FloatField({ id, label, className, invalid, children }: FloatFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const child = React.Children.only(children);
  const childProps = child.props as Record<string, unknown>;
  const value = readValueFromControl(child);
  const placeholderProp = childProps.placeholder;
  /** Placeholder visível (ex.: "Selecione o motivo") — label deve flutuar para não embolar. */
  const hasVisiblePlaceholder =
    typeof placeholderProp === 'string' && placeholderProp.trim().length > 0;
  const hasValue = !isEmptyValue(value) || hasVisiblePlaceholder;
  const resolvedId =
    id ?? (childProps.id as string | undefined) ?? (childProps.inputId as string | undefined);

  // Nunca repassar `inputId` aqui: Input/Textarea espalham props no DOM e o React avisa.
  // Controles compostos (Select, Switch, etc.) devem ler `id` (com fallback de inputId).
  const control = React.cloneElement(child, {
    id: resolvedId,
    placeholder: hasVisiblePlaceholder ? placeholderProp : ((placeholderProp as string | undefined) ?? ' '),
    className: cn(childProps.className as string | undefined, 'peer'),
  } as never);

  return (
    <div
      className={cn(
        'ui-float',
        hasValue && 'has-value',
        focused && 'is-focused',
        invalid && 'is-invalid',
        className,
      )}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) setFocused(false);
      }}
    >
      {control}
      <label htmlFor={resolvedId}>{label}</label>
    </div>
  );
}
