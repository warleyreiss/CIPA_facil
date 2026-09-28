import * as React from 'react';
import { cn } from '../../lib/cn';

export function TabView({
  children,
  activeIndex = 0,
  onTabChange,
  className,
}: {
  children?: React.ReactNode;
  activeIndex?: number;
  onTabChange?: (e: { index: number }) => void;
  className?: string;
}) {
  const tabs = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[];
  const [index, setIndex] = React.useState(activeIndex);
  React.useEffect(() => setIndex(activeIndex), [activeIndex]);

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-3 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            className={cn(
              'border-b-2 px-3 py-2 text-[0.8125rem] font-medium transition-colors',
              i === index
                ? 'border-green text-green'
                : 'border-transparent text-text-3 hover:text-text-1',
            )}
            onClick={() => {
              setIndex(i);
              onTabChange?.({ index: i });
            }}
          >
            {(tab.props as { header?: React.ReactNode }).header}
          </button>
        ))}
      </div>
      <div>{tabs[index]}</div>
    </div>
  );
}

export function TabPanel({
  children,
}: {
  header?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return <div>{children}</div>;
}
