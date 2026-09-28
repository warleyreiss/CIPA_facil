export function MultiStateCheckbox({
  value,
  options = [],
  optionValue = 'value',
  onChange,
}: {
  value?: unknown;
  options?: Array<Record<string, unknown>>;
  optionValue?: string;
  onChange?: (e: { value: unknown }) => void;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o[optionValue] === value),
  );
  return (
    <button
      type="button"
      className="rounded-[3px] border border-border px-2 py-1 text-[0.75rem]"
      onClick={() => {
        const next = options[(idx + 1) % Math.max(options.length, 1)];
        onChange?.({ value: next?.[optionValue] });
      }}
    >
      {String(value ?? '—')}
    </button>
  );
}
