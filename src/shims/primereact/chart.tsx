import { Chart as ChartJS, registerables } from 'chart.js';
import { useEffect, useRef, type CSSProperties } from 'react';

ChartJS.register(...registerables);

export function Chart({
  type = 'bar',
  data,
  options,
  className,
  style,
}: {
  type?: string;
  data?: any;
  options?: any;
  className?: string;
  style?: CSSProperties;
  [key: string]: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new ChartJS(canvasRef.current, {
      type: type as any,
      data: data ?? { labels: [], datasets: [] },
      options: options ?? {},
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type, data, options]);

  return <canvas ref={canvasRef} className={className} style={style} />;
}
