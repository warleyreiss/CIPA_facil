export function RadioButton({
  inputId,
  id,
  name,
  value,
  checked,
  onChange,
  disabled,
}: {
  inputId?: string;
  id?: string;
  name?: string;
  value?: unknown;
  checked?: boolean;
  onChange?: (e: { value: unknown; checked: boolean }) => void;
  disabled?: boolean;
  [key: string]: any;
}) {
  return (
    <input
      id={inputId || id}
      type="radio"
      name={name}
      checked={!!checked}
      disabled={disabled}
      onChange={() => onChange?.({ value, checked: true })}
      className="h-4 w-4 accent-[var(--green)]"
    />
  );
}
