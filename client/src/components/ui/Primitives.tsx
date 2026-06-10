import { ReactNode } from 'react';

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
};
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`chip ${TONES[tone]}`}>{children}</span>;
}

export function ProgressRing({ value, size = 56, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const done = value >= 100;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? '#059669' : '#2c4a7c'} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .4s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="rotate-90 origin-center fill-slate-700 font-bold" style={{ fontSize: size * 0.26 }}>
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export function Stat({ label, value, tone = 'brand', icon }: { label: string; value: ReactNode; tone?: keyof typeof TONES; icon?: ReactNode }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      {icon && <div className={`h-11 w-11 rounded-lg grid place-items-center ${TONES[tone]}`}>{icon}</div>}
      <div>
        <div className="text-2xl font-extrabold text-slate-900 leading-none">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="h-5 w-5 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />;
}

export function EmptyState({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-slate-100 grid place-items-center text-slate-400">{icon}</div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
