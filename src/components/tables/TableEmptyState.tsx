import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type EmptyIcon = 'box' | 'search' | 'clipboard' | 'layers' | 'filter' | 'users';

const ICON_CLASSES: Record<EmptyIcon, string> = {
  box: 'pi-box',
  search: 'pi-search',
  clipboard: 'pi-clipboard',
  layers: 'pi-clone',
  filter: 'pi-filter',
  users: 'pi-users',
};

interface TableEmptyStateProps {
  icon?: EmptyIcon;
  iconNode?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Padding e tipografia menores (listagens). */
  compact?: boolean;
  /** Ainda mais enxuto — sidebars / cards mistos. */
  dense?: boolean;
}

/** Estado vazio padronizado para DataTables */
export function TableEmptyState({
  icon,
  iconNode,
  title,
  description,
  action,
  compact = false,
  dense = false,
}: TableEmptyStateProps) {
  const size = dense ? 'dense' : compact ? 'compact' : 'default';

  return (
    <div
      className={cn(
        'flex flex-column align-items-center text-center',
        size === 'dense' && 'py-2 gap-1',
        size === 'compact' && 'py-3 gap-1.5',
        size === 'default' && 'py-6 gap-2',
      )}
    >
      {iconNode ??
        (icon ? (
          <i
            className={cn('pi text-color-secondary', ICON_CLASSES[icon])}
            style={{
              fontSize: size === 'dense' ? '1.15rem' : size === 'compact' ? '1.75rem' : '2.5rem',
            }}
            aria-hidden
          />
        ) : null)}
      <h4
        className={cn(
          'm-0 font-semibold',
          size === 'dense' && 'mt-0.5 text-sm',
          size === 'compact' && 'mt-1 text-base',
          size === 'default' && 'mt-2 text-xl',
        )}
      >
        {title}
      </h4>
      {description ? (
        <p
          className={cn(
            'm-0 text-color-secondary',
            size === 'dense' ? 'text-xs' : 'text-sm',
          )}
          style={{ maxWidth: size === 'dense' ? '18rem' : '28rem' }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className={size === 'dense' ? 'mt-1' : 'mt-2'}>{action}</div> : null}
    </div>
  );
}
