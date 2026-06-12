import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, SkeletonGrid, EmptyState, PageHeader } from '../components/ui/Primitives';
import TiltCard from '../components/ui/TiltCard';
import { BookOpen, Film, HelpCircle, ShieldCheck, Cpu, Scale, Users } from 'lucide-react';

// Corporate banner system — MSCorpres teal/ink families, rotated per card.
const BANNERS = [
  { bg: 'linear-gradient(135deg,#032f2d,#017b75 55%,#04b0a8)', icon: ShieldCheck },
  { bg: 'linear-gradient(135deg,#020817,#1e3a5f 60%,#0ea5e9)', icon: Cpu },
  { bg: 'linear-gradient(135deg,#0a4d4a,#03938c 60%,#35c7bb)', icon: Scale },
  { bg: 'linear-gradient(135deg,#111827,#075f5b 60%,#04b0a8)', icon: Users },
];

export default function Catalog() {
  const { data, isLoading } = useQuery({ queryKey: ['modules'], queryFn: async () => (await api.get('/modules')).data.data });
  if (isLoading) return <div className="space-y-6"><div className="skeleton h-9 w-72" /><SkeletonGrid cards={6} /></div>;
  const mods = data || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Training" accent="Catalog" subtitle="Browse available training modules." />
      {mods.length === 0 ? <EmptyState title="No modules available" subtitle="Published training will appear here." icon={<BookOpen size={22} />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 scene-3d">
          {mods.map((m: any, i: number) => {
            const banner = BANNERS[i % BANNERS.length];
            const Icon = banner.icon;
            return (
              <TiltCard key={m.id} max={6}>
                <Link to={`/modules/${m.id}`} className="card overflow-hidden block group h-full transition-shadow duration-300 hover:shadow-lift">
                  <div className="h-28 relative overflow-hidden" style={{ background: banner.bg }}>
                    <div className="absolute inset-0 opacity-[0.13]"
                      style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, rgba(255,255,255,.5) 1px, transparent 1.5px), radial-gradient(circle at 70% 65%, rgba(255,255,255,.4) 1px, transparent 1.5px)', backgroundSize: '44px 44px, 60px 60px' }} />
                    <div className="absolute inset-0 grid place-items-center text-white/90 transition-transform duration-300 group-hover:scale-110">
                      <Icon size={34} strokeWidth={1.6} />
                    </div>
                    {m.passed && <span className="absolute top-2.5 right-2.5 chip bg-white/95 text-emerald-700 shadow-card"><ShieldCheck size={12} /> Passed</span>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone="slate">{m.category}</Badge>
                      {m.isMandatory && <Badge tone="brand">Mandatory</Badge>}
                    </div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors">{m.title}</h3>
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
