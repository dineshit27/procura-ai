import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react';
import { cn } from '../../lib/utils';
import './klyv-animated-beam.css';

export interface AnimatedBeamProps {
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  beamColor?: string;
  beamLength?: number;
  paused?: boolean;
  className?: string;
}

interface Geometry {
  width: number;
  height: number;
  d: string;
  length: number;
}

function center(container: DOMRect, node: DOMRect) {
  return {
    x: node.left - container.left + node.width / 2,
    y: node.top - container.top + node.height / 2,
  };
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 60,
  reverse = false,
  duration = 3,
  delay = 0,
  pathColor = 'rgba(59, 130, 246, 0.18)',
  pathWidth = 1.75,
  pathOpacity = 1,
  beamColor = '#3b82f6',
  beamLength = 46,
  paused = false,
  className,
}: AnimatedBeamProps) {
  const id = useId();
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!container || !from || !to) return;

    const measure = () => {
      const box = container.getBoundingClientRect();
      const start = center(box, from.getBoundingClientRect());
      const end = center(box, to.getBoundingClientRect());
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const span = Math.hypot(dx, dy) || 1;
      const controlX = (start.x + end.x) / 2 + (-dy / span) * curvature;
      const controlY = (start.y + end.y) / 2 + (dx / span) * curvature;
      const d = `M ${start.x},${start.y} Q ${controlX},${controlY} ${end.x},${end.y}`;
      const legs =
        Math.hypot(controlX - start.x, controlY - start.y) +
        Math.hypot(end.x - controlX, end.y - controlY);

      setGeometry({ width: box.width, height: box.height, d, length: (span + legs) / 2 });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(from);
    observer.observe(to);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, fromRef, toRef, curvature]);

  if (!geometry) return null;
  const total = Math.max(1, Math.round(geometry.length));
  const travel = reverse ? total + beamLength : -(total + beamLength);

  return (
    <svg
      aria-hidden="true"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      fill="none"
      className={cn('pointer-events-none absolute left-0 top-0', className)}
    >
      <path d={geometry.d} stroke={pathColor} strokeWidth={pathWidth} strokeOpacity={pathOpacity} strokeLinecap="round" />
      <defs>
        <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={beamColor} stopOpacity="0" />
          <stop offset="50%" stopColor={beamColor} stopOpacity="1" />
          <stop offset="100%" stopColor={beamColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="klyv-beam-motion"
        d={geometry.d}
        stroke={`url(#beam-${id})`}
        strokeWidth={pathWidth + 1.25}
        strokeLinecap="round"
        strokeDasharray={`${beamLength} ${total}`}
        style={
          {
            '--beam-travel': `${travel}px`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            animationPlayState: paused ? 'paused' : 'running',
          } as CSSProperties
        }
      />
    </svg>
  );
}

export default AnimatedBeam;