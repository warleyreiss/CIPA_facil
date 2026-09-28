import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '../../lib/cn';

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = new Date(value);
  return isValid(d) ? d : null;
}

export interface DatePickerProps {
  id?: string;
  inputId?: string;
  value?: Date | string | null | (Date | null)[];
  onChange?: (e: { value: any }) => void;
  dateFormat?: string;
  showIcon?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  selectionMode?: 'single' | 'range';
  readOnlyInput?: boolean;
  invalid?: boolean;
  appendTo?: any;
  style?: React.CSSProperties;
  [key: string]: any;
}

export function DatePicker({
  id,
  inputId,
  value,
  onChange,
  dateFormat = 'dd/mm/yy',
  showIcon = true,
  className,
  disabled,
  placeholder = ' ',
  selectionMode = 'single',
  invalid,
}: DatePickerProps) {
  const isInvalid = Boolean(invalid || className?.includes('p-invalid'));
  // date-fns tokens
  const dateFnsFmt = dateFormat.includes('yy')
    ? dateFormat.replace('dd', 'dd').replace('mm', 'MM').replace('yy', 'yy').replace('yyyy', 'yyyy')
    : 'dd/MM/yy';
  const niceFmt = dateFnsFmt.replace(/y{2,4}/, (m) => (m.length === 2 ? 'yy' : 'yyyy')).replace('mm', 'MM');

  const single = selectionMode === 'single' ? toDate(value as any) : null;
  const range = selectionMode === 'range' ? ((value as (Date | null)[]) ?? [null, null]) : null;

  const display =
    selectionMode === 'range'
      ? [toDate(range?.[0]), toDate(range?.[1])]
          .map((d) => (d ? format(d, niceFmt.includes('yyyy') ? 'dd/MM/yyyy' : 'dd/MM/yy') : ''))
          .filter(Boolean)
          .join(' — ')
      : single
        ? format(single, niceFmt.includes('yyyy') ? 'dd/MM/yyyy' : 'dd/MM/yy')
        : '';

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  React.useEffect(() => {
    setDraft(display);
  }, [display]);

  const applyText = (text: string) => {
    if (selectionMode === 'range') {
      const parts = text.split(/[—\-]/).map((s) => s.trim()).filter(Boolean);
      const parsed = parts.map((p) => {
        const d = parse(p, 'dd/MM/yyyy', new Date());
        const d2 = isValid(d) ? d : parse(p, 'dd/MM/yy', new Date());
        return isValid(d2) ? d2 : null;
      });
      onChange?.({ value: [parsed[0] ?? null, parsed[1] ?? null] });
      return;
    }
    if (!text.trim()) {
      onChange?.({ value: null });
      return;
    }
    let d = parse(text, 'dd/MM/yyyy', new Date());
    if (!isValid(d)) d = parse(text, 'dd/MM/yy', new Date());
    onChange?.({ value: isValid(d) ? d : null });
  };

  const pickDay = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    if (selectionMode === 'single') {
      onChange?.({ value: d });
      setOpen(false);
      return;
    }
    const [a, b] = range ?? [null, null];
    if (!a || (a && b)) {
      onChange?.({ value: [d, null] });
    } else {
      const start = a <= d ? a : d;
      const end = a <= d ? d : a;
      onChange?.({ value: [start, end] });
      setOpen(false);
    }
  };

  const todayIso = format(new Date(), 'yyyy-MM-dd');

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'ui-float-slot w-full',
          showIcon && 'ui-has-trailing-icon',
          className,
        )}
      >
        <input
          id={inputId || id}
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => applyText(draft)}
          onFocus={() => setOpen(true)}
          className={cn(
            'ui-float-control h-[var(--float-control-h)] w-full rounded-[var(--fr)] border border-border bg-surface px-3 text-[0.8125rem] text-text-1 outline-none focus:border-green focus:shadow-none disabled:opacity-60',
            isInvalid && 'border-danger p-invalid',
          )}
        />
        {showIcon ? (
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="ui-float-slot__trigger"
              aria-label="Abrir calendário"
            >
              <CalendarIcon aria-hidden />
            </button>
          </Popover.Trigger>
        ) : null}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[1200] w-[280px] rounded-[3px] border border-border bg-surface p-3 shadow-lg"
        >
          <input
            type="date"
            className="mb-2 h-9 w-full rounded-[3px] border border-border px-2 text-[0.8125rem]"
            defaultValue={single ? format(single, 'yyyy-MM-dd') : todayIso}
            onChange={(e) => e.target.value && pickDay(e.target.value)}
          />
          <div className="text-[0.6875rem] text-text-3">
            {selectionMode === 'range' ? 'Selecione início e fim' : 'Selecione a data'}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** PrimeReact Calendar alias */
export const Calendar = DatePicker;
