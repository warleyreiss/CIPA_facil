import { ChevronDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function SplitButton({
  label,
  model = [],
  onClick,
  className,
  severity,
  disabled,
  menuClassName,
  onMenuCloseAutoFocus,
}: {
  label?: string;
  model?: Array<{ label?: string; command?: () => void; disabled?: boolean; motivo?: string; className?: string }>;
  onClick?: () => void;
  className?: string;
  menuClassName?: string;
  onMenuCloseAutoFocus?: (event: Event) => void;
  severity?: any;
  disabled?: boolean;
}) {
  return (
    <div className={`inline-flex ${className ?? ''}`}>
      <Button label={label} severity={severity} className="rounded-r-none" onClick={onClick} disabled={disabled} />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            severity={severity}
            className="rounded-l-none border-l border-white/20 px-2"
            icon={<ChevronDown className="h-4 w-4" />}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={`z-[13000] min-w-[16rem] rounded-[3px] border border-border bg-surface p-1 shadow-lg ${menuClassName ?? ''}`}
            onCloseAutoFocus={onMenuCloseAutoFocus}
          >
            {model.map((item, i) => (
              <DropdownMenu.Item
                key={i}
                disabled={item.disabled}
                className={`wizard-split__item cursor-pointer rounded-[3px] px-3 py-1.5 text-[0.8125rem] outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-[#eff6ff] ${item.className ?? ''}`}
                onSelect={() => {
                  if (item.disabled) return;
                  item.command?.();
                }}
              >
                <span className="block">{item.label}</span>
                {item.disabled && item.motivo ? <span className="mt-0.5 block text-[0.7rem] leading-snug opacity-80">{item.motivo}</span> : null}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
