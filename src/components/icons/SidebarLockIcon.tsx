import { cn as classNames } from '../../lib/cn';

interface SidebarLockIconProps {
  locked: boolean;
  size?: number;
  className?: string;
}

/** Layout sidebar esquerda (base). Espelhado quando fixado (`locked`). */
export function SidebarLockIcon({
  locked,
  size = 16,
  className,
}: SidebarLockIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNames(
        'sidebar-lock-icon',
        locked && 'sidebar-lock-icon--mirrored',
        className
      )}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <line
        x1="5.25"
        y1="2"
        x2="5.25"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export default SidebarLockIcon;
