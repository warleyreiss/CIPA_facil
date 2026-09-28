import * as React from 'react';

export function Accordion({
  children,
  className,
  multiple: _multiple,
}: {
  children?: React.ReactNode;
  className?: string;
  multiple?: boolean;
  [key: string]: any;
}) {
  return <div className={className}>{children}</div>;
}

export function AccordionTab({
  header,
  children,
}: {
  header?: React.ReactNode;
  children?: React.ReactNode;
  [key: string]: any;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-2 rounded-[3px] border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[0.8125rem] font-semibold"
        onClick={() => setOpen((v) => !v)}
      >
        {header}
        <span>{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="border-t border-border px-3 py-2">{children}</div> : null}
    </div>
  );
}
