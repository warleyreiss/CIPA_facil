import * as React from 'react';
import { cn } from '../../lib/cn';
import { cepi } from '../../lib/cepi-ui';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = 'text', placeholder = ' ', ...props }, ref) => {
    const isInvalid = Boolean(invalid || className?.includes('p-invalid'));
    // Remove props de API Prime que não existem no DOM
    const { inputId: _inputId, ...domProps } = props as InputProps & { inputId?: string };
    return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      className={cn(
        cepi.control.input,
        'ui-float-control',
        isInvalid && cepi.control.invalid,
        className,
      )}
      {...domProps}
    />
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  invalid?: boolean;
  autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, placeholder = ' ', autoResize, ...props }, ref) => {
    void autoResize;
    return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      className={cn(
        cepi.control.textarea,
        invalid && cepi.control.invalid,
        className,
      )}
      {...props}
    />
    );
  },
);
Textarea.displayName = 'Textarea';
