import { ReactNode, useId } from 'react';

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
  const gid = useId();
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" role="img" aria-label={`${Math.round(value)}% complete`}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          {done
            ? (<><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#04b0a8" /></>)
            : (<><stop offset="0%" stopColor="#04b0a8" /><stop offset="100%" stopColor="#0ea5e9" /></>)}
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8edf1" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.21,.61,.35,1)' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="rotate-90 origin-center fill-slate-800 font-bold" style={{ fontSize: size * 0.26 }}>
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export function Stat({ label, value, tone = 'brand', icon }: { label: string; value: ReactNode; tone?: keyof typeof TONES; icon?: ReactNode }) {
  return (
    <div className="card card-hover p-5 flex items-center gap-4">
      {icon && <div className={`h-11 w-11 rounded-xl grid place-items-center ${TONES[tone]}`}>{icon}</div>}
      <div>
        <div className="text-2xl font-display font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="relative h-8 w-8" role="status" aria-label="Loading">
      <div className="absolute inset-0 rounded-full border-2 border-brand-100" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
    </div>
  );
}

/** Skeleton loaders — quieter than a spinner for content-shaped waits. */
export function SkeletonRow({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${85 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="skeleton h-28 !rounded-none" />
          <div className="p-4 space-y-2.5">
            <div className="skeleton h-3.5 w-2/5" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-3.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card p-12 text-center animate-fade-up">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-brand-50 ring-1 ring-brand-100 grid place-items-center text-brand-500 animate-float">{icon}</div>
      <h3 className="font-display font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Consistent page header — slab title, quiet subtitle, optional actions. */
export function PageHeader({ title, accent, subtitle, actions }: { title: string; accent?: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl lg:text-[1.75rem] font-display font-bold text-slate-900">
          {title}{accent && <> <span className="gradient-text">{accent}</span></>}
        </h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
