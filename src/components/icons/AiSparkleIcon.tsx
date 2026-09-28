import { cn } from '../../lib/cn';

interface AiSparkleIconProps {
  size?: number;
  className?: string;
}

/** Path oficial do spark Gemini (4 pontas curvas, viewBox 0–24). */
const SPARK =
  'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81';

/**
 * Sparkles estilo Gemini: estrela grande + dois brilhos menores, cluster centrado.
 */
export function AiSparkleIcon({ size = 20, className }: AiSparkleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('ai-sparkle-icon', className)}
      aria-hidden
      focusable="false"
    >
      {/* grande — centrada no viewBox */}
      <g transform="translate(1.8 1.8) scale(0.7)">
        <path d={SPARK} />
      </g>
      {/* médio — topo direita */}
      <g transform="translate(15.2 0.4) scale(0.3)">
        <path d={SPARK} />
      </g>
      {/* pequeno — direita, abaixo do médio */}
      <g transform="translate(18.2 8.6) scale(0.2)">
        <path d={SPARK} />
      </g>
    </svg>
  );
}
