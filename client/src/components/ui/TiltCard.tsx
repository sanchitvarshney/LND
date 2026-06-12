import { ReactNode, useRef } from 'react';

/**
 * 3D hover-tilt wrapper: tilts toward the cursor with a moving glare highlight.
 * Wrap any card; pass `max` to tune tilt strength (degrees).
 */
export default function TiltCard({ children, className = '', max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * max;
    const ry = (px - 0.5) * max;
    el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px) scale(1.015)`;
    if (glare.current) {
      glare.current.style.opacity = '1';
      glare.current.style.background = `radial-gradient(420px circle at ${px * 100}% ${py * 100}%, rgba(140,160,255,.14), transparent 55%)`;
    }
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
    if (glare.current) glare.current.style.opacity = '0';
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`relative will-change-transform transition-transform duration-200 ease-out ${className}`}
      style={{ transformStyle: 'preserve-3d' }}>
      {children}
      <div ref={glare} className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300" />
    </div>
  );
}
