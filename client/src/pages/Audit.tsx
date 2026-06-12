import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';
import { ShieldCheck } from 'lucide-react';

export default function Audit() {
  const { data, isLoading } = useQuery({ queryKey: ['audit'], queryFn: async () => (await api.get('/audit-logs')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-bold text-slate-900">Audit Log</h1><p className="text-slate-500 text-sm mt-0.5">Immutable record of platform activity.</p></div>
      <div className="card divide-y divide-slate-100 overflow-hidden">
        {(data || []).map((l: any) => (
          <div key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-slate-50">
            <div className="h-8 w-8 rounded-lg bg-slate-100 grid place-items-center text-slate-400"><ShieldCheck size={16} /></div>
            <code className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{l.action}</code>
            <span className="text-slate-500">{l.entityType}</span>
            <span className="ml-auto text-slate-400">{l.actor} · {new Date(l.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
