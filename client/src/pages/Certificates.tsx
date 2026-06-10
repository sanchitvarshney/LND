import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Spinner, EmptyState } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { Award } from 'lucide-react';

export default function Certificates() {
  const { data, isLoading } = useQuery({ queryKey: ['certs'], queryFn: async () => (await api.get('/certificates/me')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const certs = data || [];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-extrabold text-slate-900">My Certificates</h1><p className="text-slate-500 text-sm mt-0.5">Your earned training certifications.</p></div>
      {certs.length === 0 ? <EmptyState title="No certificates yet" subtitle="Complete a training module to earn your first certificate." icon={<Award size={22} />} /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {certs.map((c: any) => (
            <Link key={c.id} to={`/certificates/${c.id}`} className="card p-5 flex items-center gap-4 hover:shadow-soft transition">
              <div className="h-12 w-12 rounded-xl bg-brand-700 text-white grid place-items-center"><Award size={22} /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 truncate">{c.module.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Issued {fmtDate(c.issuedAt)} · Score {c.score}%</p>
                <p className="font-mono text-xs text-slate-400">{c.serialNo}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
