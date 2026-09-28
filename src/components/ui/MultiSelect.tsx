import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '../../lib/cn';

export interface MultiSelectProps {
  inputId?: string;
  id?: string;
  value?: any;
  options?: Array<Record<string, any>> | any[];
  optionLabel?: string;
  optionValue?: string;
  onChange?: (e: { value: any }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  filter?: boolean;
  display?: 'chip' | 'comma';
  maxSelectedLabels?: number;
  invalid?: boolean;
  appendTo?: any;
  selectedItemsLabel?: string;
  filterPlaceholder?: string;
  [key: string]: any;
}

export function MultiSelect({
  inputId,
  id,
  value,
  options = [],
  optionLabel = 'label',
  optionValue = 'value',
  onChange,
  placeholder = 'Selecione',
  className,
  disabled,
  filter,
  display = 'chip',
  maxSelectedLabels = 3,
  invalid,
  filterPlaceholder,
  selectAll = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected: any[] = Array.isArray(value) ? value : [];

  const filtered = React.useMemo(() => {
    if (!filter || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => String(o[optionLabel] ?? '').toLowerCase().includes(q));
  }, [options, filter, query, optionLabel]);

  const toggle = (v: string | number) => {
    const exists = selected.some((x) => String(x) === String(v));
    const next = exists ? selected.filter((x) => String(x) !== String(v)) : [...selected, v];
    onChange?.({ value: next });
  };

  const selecionarTodosVisiveis = () => {
    const ids = filtered.map((o) => o[optionValue]);
    const merged = [...selected];
    ids.forEach((id) => {
      if (!merged.some((x) => String(x) === String(id))) merged.push(id);
    });
    onChange?.({ value: merged });
  };

  const labels = selected
    .map((v) => options.find((o) => String(o[optionValue]) === String(v))?.[optionLabel])
    .filter(Boolean) as string[];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={inputId || id}
          type="button"
          disabled={disabled}
          data-has-value={selected.length ? 'true' : 'false'}
          className={cn(
            'ui-float-control cepi-ms-trigger flex min-h-9 w-full items-center justify-between gap-2 rounded-[3px] border border-border bg-surface px-2.5 py-1.5 text-left text-[0.8125rem] outline-none focus:border-green focus:ring-1 focus:ring-green-line disabled:opacity-60',
            invalid && 'border-danger',
            className,
          )}
        >
          <div className="cepi-ms-chips flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selected.length === 0 ? (
              <span className="text-text-3">{placeholder}</span>
            ) : display === 'chip' ? (
              labels.slice(0, maxSelectedLabels).map((l) => (
                <span
                  key={l}
                  className="cepi-ms-chip inline-flex max-w-full items-center truncate rounded-[3px] bg-green-soft px-2 py-0.5 text-[0.6875rem] font-medium leading-tight text-green-deep"
                >
                  {l}
                </span>
              ))
            ) : (
              <span className="truncate">{labels.join(', ')}</span>
            )}
            {labels.length > maxSelectedLabels ? (
              <span className="cepi-ms-chip cepi-ms-chip--more inline-flex items-center rounded-[3px] bg-surface-3 px-2 py-0.5 text-[0.6875rem] font-semibold leading-tight text-text-2">
                +{labels.length - maxSelectedLabels}
              </span>
            ) : null}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-3" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-[1200] max-h-72 w-[var(--radix-popover-trigger-width)] overflow-auto rounded-[3px] border border-border bg-surface p-1 shadow-lg"
        >
          {filter ? (
            <input
              className="mb-1 w-full rounded-[3px] border border-border px-2 py-1.5 text-[0.8125rem] outline-none"
              placeholder={filterPlaceholder ?? 'Buscar...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}
          {(selectAll || selected.length > 0) && (
            <div className="mb-1 flex items-center gap-1 border-b border-border pb-1">
              {selectAll && filtered.length > 0 ? (
                <button
                  type="button"
                  className="flex flex-1 items-center gap-1 rounded-[3px] px-2 py-1.5 text-[0.75rem] font-semibold text-green-deep hover:bg-green-ghost"
                  onClick={selecionarTodosVisiveis}
                >
                  <Check className="h-3.5 w-3.5" /> Selecionar todos
                </button>
              ) : null}
              {selected.length > 0 ? (
                <button
                  type="button"
                  className="flex flex-1 items-center gap-1 rounded-[3px] px-2 py-1.5 text-[0.75rem] text-text-3 hover:bg-surface-hover"
                  onClick={() => onChange?.({ value: [] })}
                >
                  <X className="h-3.5 w-3.5" /> Limpar
                </button>
              ) : null}
            </div>
          )}
          {filtered.map((opt) => {
            const v = opt[optionValue];
            const active = selected.some((x) => String(x) === String(v));
            return (
              <button
                key={String(v)}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[0.8125rem] hover:bg-green-ghost',
                  active && 'bg-green-ghost',
                )}
                onClick={() => toggle(v)}
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded-[3px] border', active ? 'border-green bg-green text-white' : 'border-border')}>
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
                {opt[optionLabel]}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
