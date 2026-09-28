import type { MouseEvent, ReactNode } from 'react';
import { Button } from '../ui/Button';
import type { ButtonProps } from '../ui/Button';

interface TableRowActionsProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/** Wrapper padronizado da coluna Ações nas DataTables */
export function TableRowActions({ children, onClick }: TableRowActionsProps) {
  return (
    <div className="cepi-table-actions flex align-items-center justify-content-center gap-1" onClick={onClick}>
      {children}
    </div>
  );
}

export type TableActionButtonProps = {
  icon: ButtonProps['icon'];
  onClick: ButtonProps['onClick'];
  tooltip?: string;
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  className?: string;
  severity?: ButtonProps['severity'];
};

/** Botão ícone compacto (26px) para linhas de tabela */
export function TableActionButton({
  icon,
  tooltip,
  onClick,
  disabled,
  loading,
  className,
  severity,
  'aria-label': ariaLabel,
}: TableActionButtonProps) {
  const isDanger =
    severity === 'danger' || Boolean(className?.split(/\s+/).includes('p-button-danger'));
  const resolvedSeverity = severity ?? (isDanger ? 'danger' : 'secondary');
  const btn = (
    <Button
      type="button"
      icon={icon}
      className={[
        'p-button-text',
        isDanger ? 'p-button-danger' : 'p-button-secondary',
        'p-button-sm',
        'p-button-rounded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      tooltip={disabled ? undefined : tooltip}
      title={disabled ? undefined : tooltip}
      aria-label={ariaLabel ?? tooltip}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      text
      rounded
      size="icon-sm"
      severity={resolvedSeverity}
    />
  );

  // Botão disabled não recebe hover (pointer-events: none) — tooltip no wrapper
  if (disabled && tooltip) {
    return (
      <span className="inline-flex" title={tooltip} aria-label={tooltip}>
        {btn}
      </span>
    );
  }

  return btn;
}
