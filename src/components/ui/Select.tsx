import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectOption {
  label: string;
  value?: string | number | null;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface SelectProps {
  id?: string;
  inputId?: string;
  value?: string | number | null;
  options?: any[];
  optionLabel?: string;
  optionValue?: string;
  onChange?: (e: { value: any; originalEvent?: unknown }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  filter?: boolean;
  filterBy?: string;
  invalid?: boolean;
  itemTemplate?: (option: any) => React.ReactNode;
  valueTemplate?: (option: any, props: { placeholder?: string }) => React.ReactNode;
  optionDisabled?: (option: any) => boolean;
  emptyMessage?: string;
  emptyFilterMessage?: string;
  loading?: boolean;
  appendTo?: any;
  showClear?: boolean;
  [key: string]: any;
}

function getOptLabel(opt: any, optionLabel = 'label') {
  return String(opt?.[optionLabel] ?? opt?.label ?? opt ?? '');
}

function getOptValue(opt: any, optionValue = 'value') {
  return opt?.[optionValue] ?? opt?.value ?? opt;
}

export function Select({
  id,
  inputId,
  value,
  options = [],
  optionLabel = 'label',
  optionValue = 'value',
  onChange,
  placeholder = 'Selecione',
  className,
  disabled,
  filter,
  filterBy,
  invalid,
  itemTemplate,
  valueTemplate,
  optionDisabled,
  emptyMessage = 'Nenhuma opção',
  emptyFilterMessage,
}: SelectProps) {
  const [query, setQuery] = React.useState('');
  const strValue = value == null || value === '' ? undefined : String(value);
  const isInvalid = Boolean(invalid || className?.includes('p-invalid'));

  const filtered = React.useMemo(() => {
    if (!filter || !query.trim()) return options;
    const q = query.toLowerCase();
    const fields = (filterBy || optionLabel).split(',');
    return options.filter((opt) =>
      fields.some((f) => String(opt[f.trim()] ?? getOptLabel(opt, optionLabel)).toLowerCase().includes(q)),
    );
  }, [options, filter, query, filterBy, optionLabel]);

  const selected = options.find((o) => String(getOptValue(o, optionValue)) === strValue);

  return (
    <SelectPrimitive.Root
      value={strValue}
      onValueChange={(v) => onChange?.({ value: options.find((o) => String(getOptValue(o, optionValue)) === v)?.[optionValue] ?? v })}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <SelectPrimitive.Trigger
        id={inputId || id}
        data-has-value={strValue ? 'true' : 'false'}
        className={cn(
          'ui-float-control flex w-full min-h-[var(--float-control-h)] items-center justify-between gap-2 rounded-[var(--fr)] border border-border bg-surface px-3 text-left text-[0.8125rem] text-text-1 outline-none focus:border-green focus:shadow-none disabled:cursor-not-allowed disabled:opacity-60',
          isInvalid && 'border-danger p-invalid',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder}>
            {selected
              ? valueTemplate
                ? valueTemplate(selected, { placeholder })
                : getOptLabel(selected, optionLabel)
              : null}
          </SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon className="shrink-0">
          <ChevronDown className="h-3.5 w-3.5 text-text-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="cepi-select-panel z-[13000] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--radius,3px)] border border-border bg-surface shadow-[0_8px_24px_rgba(15,23,42,0.12),0_1px_4px_rgba(15,23,42,0.06)]"
        >
          {filter ? (
            <div className="cepi-select-panel__search flex items-center gap-2 border-b border-border bg-surface-2 px-2.5 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden />
              <input
                className="w-full min-w-0 bg-transparent text-[0.8125rem] text-text-1 outline-none placeholder:text-text-4"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                onKeyDown={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          ) : null}
          <SelectPrimitive.Viewport className="cepi-select-panel__list p-1.5">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-2.5 text-[0.75rem] text-text-3">
                {query.trim() ? emptyFilterMessage ?? emptyMessage : emptyMessage}
              </div>
            ) : (
              filtered.map((opt) => {
                const v = String(getOptValue(opt, optionValue));
                const label = getOptLabel(opt, optionLabel);
                return (
                  <SelectPrimitive.Item
                    key={v}
                    value={v}
                    disabled={!!opt.disabled || !!optionDisabled?.(opt)}
                    title={label}
                    className={cn(
                      'cepi-select-panel__item relative flex cursor-pointer select-none items-center gap-2 rounded-[3px]',
                      'px-2.5 py-1.5 text-[0.8125rem] leading-snug text-text-1 outline-none',
                      'data-[highlighted]:bg-green-ghost data-[highlighted]:text-text-1',
                      'data-[state=checked]:bg-green-soft data-[state=checked]:font-semibold data-[state=checked]:text-green-deep',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
                    )}
                  >
                    <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
                      {itemTemplate ? itemTemplate(opt) : label}
                    </SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="ml-auto shrink-0 text-green">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                );
              })
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
