import { useEffect, useRef } from 'react';

/**
 * Ambient brand backdrop — a barely-there dot lattice with slow-drifting
 * teal light fields. Light-theme, enterprise-quiet: it adds depth without
 * ever competing with content. Pure canvas, zero dependencies.
 * Respects prefers-reduced-motion (renders one static frame).
 */
export default function Background3D({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0.5, y: 0.5 };

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    const GAP = 34 / Math.max(0.6, density);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Drifting light fields
      const fields = [
        { x: 0.85 + Math.sin(t * 0.00012) * 0.06, y: 0.12 + Math.cos(t * 0.0001) * 0.05, r: 420, c: 'rgba(4,176,168,' },
        { x: 0.08 + Math.cos(t * 0.00009) * 0.05, y: 0.75 + Math.sin(t * 0.00011) * 0.06, r: 380, c: 'rgba(14,165,233,' },
      ];
      for (const f of fields) {
        const g = ctx.createRadialGradient(f.x * w, f.y * h, 0, f.x * w, f.y * h, f.r);
        g.addColorStop(0, `${f.c}0.07)`);
        g.addColorStop(1, `${f.c}0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // Dot lattice with a soft "spotlight" that follows the cursor
      const sx = mouse.x * w, sy = mouse.y * h;
      for (let x = GAP / 2; x < w; x += GAP) {
        for (let y = GAP / 2; y < h; y += GAP) {
          const d = Math.hypot(x - sx, y - sy);
          const lift = Math.max(0, 1 - d / 320);
          const a = 0.05 + lift * 0.16;
          ctx.beginPath();
          ctx.arc(x, y, 1 + lift * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = lift > 0.04 ? `rgba(4,176,168,${a.toFixed(3)})` : `rgba(2,8,23,${a.toFixed(3)})`;
          ctx.fill();
        }
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [density]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden print:hidden" aria-hidden>
      <canvas ref={ref} className="w-full h-full" />
    </div>
  );
}
