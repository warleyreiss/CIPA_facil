import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';

const buttonVariants = cva(
  cn(cepi.btn.base, cepi.btn.sm),
  {
    variants: {
      variant: {
        primary: cepi.btn.primary,
        secondary: cepi.btn.secondary,
        outline: cepi.btn.outline,
        ghost: cepi.btn.ghost,
        danger: cepi.btn.danger,
        success: cepi.btn.primary,
        text: cepi.btn.text,
      },
      size: {
        sm: cepi.btn.sm,
        md: cepi.btn.md,
        lg: cepi.btn.lg,
        icon: cepi.btn.icon,
        'icon-sm': cn(cepi.btn.icon, 'cepi-btn--sm'),
        'icon-xs': cn(cepi.btn.icon, 'cepi-btn--xs'),
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'sm',
    },
  },
);

type CvaSize = VariantProps<typeof buttonVariants>['size'];

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    Omit<VariantProps<typeof buttonVariants>, 'size'> {
  /** Accepts cva sizes plus PrimeReact `"small"` alias. */
  size?: CvaSize | 'small' | any;
  loading?: boolean;
  label?: string;
  icon?: React.ReactNode | string;
  iconPos?: 'left' | 'right';
  severity?: 'success' | 'info' | 'warning' | 'danger' | 'help' | 'primary' | 'secondary' | 'contrast';
  outlined?: boolean;
  text?: boolean;
  rounded?: boolean;
  raised?: boolean;
  link?: boolean;
  tooltip?: string;
  tooltipOptions?: any;
}

function hasPrimeClass(className: string | undefined, token: string) {
  if (!className) return false;
  return className.split(/\s+/).includes(token);
}

function severityFromClassName(className?: string): ButtonProps['severity'] | undefined {
  if (hasPrimeClass(className, 'p-button-danger')) return 'danger';
  if (hasPrimeClass(className, 'p-button-secondary')) return 'secondary';
  if (hasPrimeClass(className, 'p-button-help')) return 'help';
  if (hasPrimeClass(className, 'p-button-success')) return 'success';
  if (hasPrimeClass(className, 'p-button-warning')) return 'warning';
  if (hasPrimeClass(className, 'p-button-info')) return 'info';
  return undefined;
}

function resolveVariant(
  variant: ButtonProps['variant'],
  severity?: ButtonProps['severity'],
  outlined?: boolean,
  text?: boolean,
  link?: boolean,
  className?: string,
): ButtonProps['variant'] {
  if (variant) return variant;

  const sev = severity ?? severityFromClassName(className);
  const isText = Boolean(text || link || hasPrimeClass(className, 'p-button-text') || hasPrimeClass(className, 'p-button-link'));
  const isOutlined = Boolean(outlined || hasPrimeClass(className, 'p-button-outlined'));

  if (isText) {
    if (sev === 'danger') return 'danger';
    // text/ghost neutro — verde só no CTA sólido
    if (sev === 'secondary' || sev === 'help' || !sev) return 'ghost';
    return 'text';
  }

  if (isOutlined) {
    if (sev === 'danger') return 'danger';
    if (sev === 'secondary' || sev === 'help') return 'secondary';
    return 'outline';
  }

  if (sev === 'danger') return 'danger';
  if (sev === 'secondary' || sev === 'help') return 'secondary';
  if (sev === 'success') return 'success';
  return 'primary';
}

function resolveSize(size?: ButtonProps['size'], className?: string, iconOnly?: boolean): CvaSize {
  if (size === 'small') return iconOnly ? 'icon-sm' : 'sm';
  if (size === 'sm' || size === 'md' || size === 'lg' || size === 'icon' || size === 'icon-sm' || size === 'icon-xs') {
    return size;
  }
  const sm = hasPrimeClass(className, 'p-button-sm');
  const lg = hasPrimeClass(className, 'p-button-lg');
  if (iconOnly) {
    if (sm) return 'icon-sm';
    if (lg) return 'icon';
    return 'icon-sm';
  }
  if (sm) return 'sm';
  if (lg) return 'lg';
  return undefined;
}

function renderIcon(icon?: React.ReactNode | string) {
  if (!icon) return null;
  if (typeof icon === 'string') return <i className={icon} aria-hidden />;
  return icon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      label,
      icon,
      iconPos = 'left',
      severity,
      outlined,
      text,
      link,
      rounded,
      raised: _raised,
      tooltip,
      tooltipOptions: _tooltipOptions,
      children,
      type = 'button',
      title,
      ...props
    },
    ref,
  ) => {
    void _raised;
    void _tooltipOptions;
    const content = children ?? label;
    const iconOnly = Boolean(icon) && content == null;
    const resolved = resolveVariant(variant, severity, outlined, text, link, className);
    const resolvedSize = resolveSize(size, className, iconOnly);
    const iconNode = renderIcon(icon);
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        title={tooltip ?? title}
        className={cn(
          buttonVariants({
            variant: resolved,
            size: rounded && !resolvedSize ? 'icon' : resolvedSize,
          }),
          rounded && 'rounded-full',
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {!loading && iconNode && iconPos === 'left' ? iconNode : null}
        {content ? <span>{content}</span> : null}
        {!loading && iconNode && iconPos === 'right' ? iconNode : null}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
