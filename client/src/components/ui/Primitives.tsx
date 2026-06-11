import { ReactNode, useId } from 'react';

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  slate: 'bg-white/[0.06] text-slate-600 ring-1 ring-white/10',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
};
const GLOWS: Record<string, string> = {
  emerald: 'shadow-glow-emerald', amber: '', red: '', slate: '', brand: 'shadow-glow',
};
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}

export function ProgressRing({ value, size = 56, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const done = value >= 100;
  const gid = useId();
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          {done
            ? (<><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#22d3ee" /></>)
            : (<><stop offset="0%" stopColor="#6478ff" /><stop offset="100%" stopColor="#22d3ee" /></>)}
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .4s ease', filter: `drop-shadow(0 0 6px ${done ? 'rgba(52,211,153,.6)' : 'rgba(100,120,255,.6)'})` }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="rotate-90 origin-center fill-slate-800 font-bold" style={{ fontSize: size * 0.26 }}>
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export function Stat({ label, value, tone = 'brand', icon }: { label: string; value: ReactNode; tone?: keyof typeof TONES; icon?: ReactNode }) {
  return (
    <div className="card p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft hover:border-white/20">
      {icon && <div className={`h-11 w-11 rounded-xl grid place-items-center ${TONES[tone]} ${GLOWS[tone]}`}>{icon}</div>}
      <div>
        <div className="text-2xl font-extrabold font-display text-slate-900 leading-none">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="relative h-8 w-8">
      <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-400 animate-spin shadow-glow" />
    </div>
  );
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl glass grid place-items-center text-brand-300 animate-float shadow-glow">{icon}</div>
      <h3 className="font-semibold font-display text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
