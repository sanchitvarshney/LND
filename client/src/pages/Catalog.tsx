import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Spinner, EmptyState } from '../components/ui/Primitives';
import { BookOpen, Film, HelpCircle } from 'lucide-react';

export default function Catalog() {
  const { data, isLoading } = useQuery({ queryKey: ['modules'], queryFn: async () => (await api.get('/modules')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const mods = data || [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-extrabold text-slate-900">Training Catalog</h1><p className="text-slate-500 text-sm mt-0.5">Browse available training modules.</p></div>
      {mods.length === 0 ? <EmptyState title="No modules available" icon={<BookOpen size={22} />} /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mods.map((m: any) => (
            <Link key={m.id} to={`/modules/${m.id}`} className="card overflow-hidden hover:shadow-soft transition group">
              <div className="h-28 bg-gradient-to-br from-brand-700 to-brand-500 relative">
                <div className="absolute inset-0 grid place-items-center text-white/90"><BookOpen size={34} /></div>
                {m.passed && <span className="absolute top-2 right-2 chip bg-emerald-500 text-white">Passed</span>}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge tone="slate">{m.category}</Badge>
                  {m.isMandatory && <Badge tone="brand">Mandatory</Badge>}
                </div>
                <h3 className="font-bold text-slate-800 group-hover:text-brand-700 transition">{m.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Film size={13} /> {m.videoCount}</span>
                  <span className="flex items-center gap-1"><HelpCircle size={13} /> {m.questionCount}</span>
                  <span className="ml-auto font-semibold text-slate-500">Pass ≥ {m.passThreshold}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
