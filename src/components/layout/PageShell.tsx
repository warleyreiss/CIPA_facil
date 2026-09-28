import * as React from 'react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';

export interface PageShellProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Layout padrão de páginas autenticadas (src/pages). */
export function PageShell({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: PageShellProps) {
  const showHeader = title != null || description != null || actions != null;

  return (
    <div className={cn(cepi.page.root, className)}>
      {showHeader ? (
        <header className={cepi.page.header}>
          <div>
            {title != null ? <h1 className={cepi.page.title}>{title}</h1> : null}
            {description != null ? <p className={cepi.page.subtitle}>{description}</p> : null}
          </div>
          {actions ? <div className={cepi.page.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(cepi.page.body, bodyClassName)}>{children}</div>
    </div>
  );
}

export default PageShell;
