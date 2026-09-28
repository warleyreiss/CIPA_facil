import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Input } from './Input';

export interface PasswordProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  invalid?: boolean;
  toggleMask?: boolean;
  inputClassName?: string;
  inputId?: string;
  feedback?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  pt?: any;
  promptLabel?: string;
  weakLabel?: string;
  mediumLabel?: string;
  strongLabel?: string;
}

export const Password = React.forwardRef<HTMLInputElement, PasswordProps>(
  (
    {
      className,
      inputClassName,
      invalid,
      toggleMask = true,
      placeholder = ' ',
      inputId,
      id,
      feedback: _feedback,
      header: _header,
      footer: _footer,
      pt: _pt,
      promptLabel: _promptLabel,
      weakLabel: _weakLabel,
      mediumLabel: _mediumLabel,
      strongLabel: _strongLabel,
      ...props
    },
    ref,
  ) => {
    void _feedback;
    void _header;
    void _footer;
    void _pt;
    void _promptLabel;
    void _weakLabel;
    void _mediumLabel;
    void _strongLabel;
    const [visible, setVisible] = React.useState(false);
    return (
      <div className={cn('relative w-full', className)}>
        <Input
          ref={ref}
          id={inputId || id}
          type={visible ? 'text' : 'password'}
          invalid={invalid}
          placeholder={placeholder}
          className={cn(toggleMask && 'pr-10', inputClassName)}
          {...props}
        />
        {toggleMask ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    );
  },
);
Password.displayName = 'Password';
