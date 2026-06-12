import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, SkeletonGrid, EmptyState } from '../components/ui/Primitives';
import TiltCard from '../components/ui/TiltCard';
import { BookOpen, Film, HelpCircle, ShieldCheck, Cpu, Flame, Lock } from 'lucide-react';

const BANNERS = [
  { bg: 'linear-gradient(135deg,#312e81,#6366f1 60%,#22d3ee)', icon: ShieldCheck },
  { bg: 'linear-gradient(135deg,#4a044e,#a855f7 60%,#e879f9)', icon: Cpu },
  { bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9 60%,#34d399)', icon: Flame },
  { bg: 'linear-gradient(135deg,#1e1b4b,#7c3aed 60%,#f472b6)', icon: Lock },
];

export default function Catalog() {
  const { data, isLoading } = useQuery({ queryKey: ['modules'], queryFn: async () => (await api.get('/modules')).data.data });
  if (isLoading) return <div className="space-y-6"><div className="skeleton h-9 w-72" /><SkeletonGrid cards={6} /></div>;
  const mods = data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Training <span className="gradient-text">Catalog</span></h1>
        <p className="text-slate-500 text-sm mt-0.5">Browse available training modules.</p>
      </div>
      {mods.length === 0 ? <EmptyState title="No modules available" icon={<BookOpen size={22} />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 scene-3d">
          {mods.map((m: any, i: number) => {
            const banner = BANNERS[i % BANNERS.length];
            const Icon = banner.icon;
            return (
              <TiltCard key={m.id} max={9}>
                <Link to={`/modules/${m.id}`} className="card overflow-hidden block group h-full">
                  <div className="h-28 relative overflow-hidden" style={{ background: banner.bg }}>
                    <div className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, rgba(255,255,255,.45) 1px, transparent 1.5px), radial-gradient(circle at 70% 65%, rgba(255,255,255,.35) 1px, transparent 1.5px)', backgroundSize: '46px 46px, 62px 62px' }} />
                    <div className="absolute inset-0 grid place-items-center text-white/90 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <Icon size={36} strokeWidth={1.6} />
                    </div>
                    {m.passed && <span className="absolute top-2 right-2 chip text-white shadow-glow-emerald" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>Passed</span>}
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone="slate">{m.category}</Badge>
                      {m.isMandatory && <Badge tone="brand">Mandatory</Badge>}
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-brand-300 transition">{m.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Film size={13} /> {m.videoCount}</span>
                      <span className="flex items-center gap-1"><HelpCircle size={13} /> {m.questionCount}</span>
                      <span className="ml-auto font-semibold text-slate-500">Pass ≥ {m.passThreshold}%</span>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
