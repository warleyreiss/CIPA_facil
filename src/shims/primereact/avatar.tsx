import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';

/** Dimensões alinhadas ao PrimeReact Avatar (size normal ≈ 2rem). */
function dimForSize(size?: string): string {
  if (size === 'xlarge' || size === 'xl') return '4rem';
  if (size === 'large' || size === 'lg') return '3rem';
  if (size === 'normal' || size === 'md' || !size) return '2rem';
  return '2rem';
}

export function Avatar({
  label,
  image,
  shape,
  size,
  style,
  className,
  icon,
}: {
  label?: string;
  image?: string;
  shape?: string;
  size?: string;
  style?: CSSProperties;
  className?: string;
  icon?: string;
  [key: string]: unknown;
}) {
  const dim = dimForSize(size);
  const isCircle = shape === 'circle';

  return (
    <div
      className={cn(
        'p-avatar p-component inline-flex items-center justify-center overflow-hidden font-semibold',
        isCircle ? 'p-avatar-circle rounded-full' : 'rounded-[var(--border-radius,3px)]',
        size === 'large' || size === 'lg' ? 'p-avatar-lg' : '',
        size === 'xlarge' || size === 'xl' ? 'p-avatar-xl' : 'p-avatar-normal',
        className,
      )}
      style={{
        width: style?.width ?? dim,
        height: style?.height ?? dim,
        fontSize: style?.fontSize,
        ...style,
      }}
      aria-hidden={image ? true : undefined}
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : label ? (
        <span className="p-avatar-text">{label}</span>
      ) : icon ? (
        <i className={icon} />
      ) : (
        '?'
      )}
    </div>
  );
}
