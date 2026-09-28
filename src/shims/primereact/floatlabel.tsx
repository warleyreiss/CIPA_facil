import * as React from 'react';
import { FloatField } from '../../components/ui/FloatField';

/** PrimeReact FloatLabel API: children = [control, label] or [label, control] */
export function FloatLabel({
  children,
  className,
  align: _align,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: string;
  [key: string]: any;
}) {
  const kids = React.Children.toArray(children);
  let labelText = '';
  let control: React.ReactElement | null = null;
  for (const k of kids) {
    if (!React.isValidElement(k)) continue;
    if (k.type === 'label') {
      labelText = String((k.props as { children?: React.ReactNode }).children ?? '');
    } else {
      control = k as React.ReactElement;
    }
  }
  if (!control) return <div className={className}>{children}</div>;
  const props = control.props as { id?: string; inputId?: string };
  const id = props.id || props.inputId;
  return (
    <FloatField id={id} label={labelText || ' '} className={className}>
      {control}
    </FloatField>
  );
}
