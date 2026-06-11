import { useEffect, useRef } from 'react';

/**
 * Animated 3D background — a slowly rotating particle field with depth-projected
 * constellation lines and floating wireframe polyhedra. Pure canvas, no deps.
 * Respects prefers-reduced-motion (renders a single static frame).
 */

type V3 = { x: number; y: number; z: number };

const ICOSA_T = (1 + Math.sqrt(5)) / 2;
const ICOSA_VERTS: V3[] = [
  { x: -1, y: ICOSA_T, z: 0 }, { x: 1, y: ICOSA_T, z: 0 }, { x: -1, y: -ICOSA_T, z: 0 }, { x: 1, y: -ICOSA_T, z: 0 },
  { x: 0, y: -1, z: ICOSA_T }, { x: 0, y: 1, z: ICOSA_T }, { x: 0, y: -1, z: -ICOSA_T }, { x: 0, y: 1, z: -ICOSA_T },
  { x: ICOSA_T, y: 0, z: -1 }, { x: ICOSA_T, y: 0, z: 1 }, { x: -ICOSA_T, y: 0, z: -1 }, { x: -ICOSA_T, y: 0, z: 1 },
];
const ICOSA_EDGES: [number, number][] = [
  [0, 1], [0, 5], [0, 7], [0, 10], [0, 11], [1, 5], [1, 7], [1, 8], [1, 9], [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
  [3, 4], [3, 6], [3, 8], [3, 9], [4, 5], [4, 9], [4, 11], [5, 9], [5, 11], [6, 7], [6, 8], [6, 10], [7, 8], [7, 10], [8, 9], [10, 11],
];

function rotate(v: V3, ax: number, ay: number): V3 {
  const cy = Math.cos(ay), sy = Math.sin(ay);
  const cx = Math.cos(ax), sx = Math.sin(ax);
  const x1 = v.x * cy + v.z * sy;
  const z1 = -v.x * sy + v.z * cy;
  const y1 = v.y * cx - z1 * sx;
  const z2 = v.y * sx + z1 * cx;
  return { x: x1, y: y1, z: z2 };
}

export default function Background3D({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0 }; // -1..1 parallax

    const DEPTH = 900;
    const N = Math.round(110 * density);
    const stars = Array.from({ length: N }, () => ({
      x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * DEPTH,
      r: Math.random() * 1.6 + 0.4,
      hue: Math.random() < 0.75 ? 232 : Math.random() < 0.5 ? 188 : 285,
      tw: Math.random() * Math.PI * 2,
    }));

    const shapes = [
      { cx: 0.82, cy: 0.22, s: 120, speed: 0.00012, phase: 0, hue: 240 },
      { cx: 0.12, cy: 0.72, s: 90, speed: -0.00009, phase: 2, hue: 190 },
      { cx: 0.5, cy: -0.05, s: 70, speed: 0.00015, phase: 4, hue: 280 },
    ];

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const f = 420; // focal length

      // --- depth starfield ---
      const pts: { sx: number; sy: number; a: number; r: number; hue: number }[] = [];
      for (const s of stars) {
        s.z -= 0.18; // slow drift toward viewer
        if (s.z < 1) s.z = DEPTH;
        const k = f / (f + s.z);
        const px = (s.x * w * 0.7 + mouse.x * 30 * k) * k + cx;
        const py = (s.y * h * 0.7 + mouse.y * 30 * k) * k + cy;
        const tw = 0.55 + 0.45 * Math.sin(t * 0.0012 + s.tw);
        const a = (1 - s.z / DEPTH) * 0.85 * tw;
        pts.push({ sx: px, sy: py, a, r: s.r * k * 2, hue: s.hue });
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, s.r * k * 2), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 90%, 74%, ${a.toFixed(3)})`;
        ctx.fill();
      }

      // --- constellation links between near neighbours ---
      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].sx - pts[j].sx, dy = pts[i].sy - pts[j].sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            const a = (1 - Math.sqrt(d2) / 110) * 0.16 * Math.min(pts[i].a, pts[j].a) * 4;
            if (a <= 0.01) continue;
            ctx.strokeStyle = `hsla(230, 85%, 72%, ${a.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(pts[i].sx, pts[i].sy); ctx.lineTo(pts[j].sx, pts[j].sy); ctx.stroke();
          }
        }
      }

      // --- floating wireframe icosahedra ---
      for (const sh of shapes) {
        const ax = t * sh.speed + sh.phase;
        const ay = t * sh.speed * 1.4 + sh.phase;
        const ox = sh.cx * w + mouse.x * -22 + Math.sin(t * 0.0004 + sh.phase) * 14;
        const oy = sh.cy * h + mouse.y * -22 + Math.cos(t * 0.00035 + sh.phase) * 16;
        const proj = ICOSA_VERTS.map((v) => {
          const r = rotate(v, ax, ay);
          const k = f / (f + r.z * sh.s * 0.6 + 260);
          return { x: ox + r.x * sh.s * k, y: oy + r.y * sh.s * k, z: r.z };
        });
        for (const [a, b] of ICOSA_EDGES) {
          const za = (proj[a].z + proj[b].z) / 2;
          const alpha = 0.05 + (za + 2) * 0.035;
          ctx.strokeStyle = `hsla(${sh.hue}, 85%, 70%, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(proj[a].x, proj[a].y); ctx.lineTo(proj[b].x, proj[b].y); ctx.stroke();
        }
        for (const p of proj) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${sh.hue}, 90%, 75%, ${(0.12 + (p.z + 2) * 0.06).toFixed(3)})`;
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
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      <canvas ref={ref} className="w-full h-full" />
      {/* aurora orbs */}
      <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl animate-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,.55), transparent 65%)' }} />
      <div className="absolute top-1/3 -left-40 h-[26rem] w-[26rem] rounded-full opacity-20 blur-3xl animate-float"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,.45), transparent 65%)' }} />
      <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl animate-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,.5), transparent 65%)' }} />
    </div>
  );
}
