import * as React from 'react';

export function Inplace({
  children,
  active,
  onToggle,
  className,
}: {
  children?: React.ReactNode;
  active?: boolean;
  onToggle?: (e: { value: boolean }) => void;
  className?: string;
  [key: string]: any;
}) {
  const [open, setOpen] = React.useState(!!active);
  React.useEffect(() => {
    if (active != null) setOpen(active);
  }, [active]);

  const kids = React.Children.toArray(children);
  const display = kids.find(
    (k) => React.isValidElement(k) && (k.type as any)?.displayName === 'InplaceDisplay',
  );
  const content = kids.find(
    (k) => React.isValidElement(k) && (k.type as any)?.displayName === 'InplaceContent',
  );

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          className="text-left text-[0.8125rem] text-green hover:underline"
          onClick={() => {
            setOpen(true);
            onToggle?.({ value: true });
          }}
        >
          {display}
        </button>
      ) : (
        <div>
          {content}
          <button
            type="button"
            className="mt-1 text-[0.75rem] text-text-3"
            onClick={() => {
              setOpen(false);
              onToggle?.({ value: false });
            }}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export function InplaceDisplay({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
InplaceDisplay.displayName = 'InplaceDisplay';

export function InplaceContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
InplaceContent.displayName = 'InplaceContent';
