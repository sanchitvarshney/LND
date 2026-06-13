import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Stat, Spinner } from '../components/ui/Primitives';
import { Users, BookOpen, Award, AlertTriangle, BarChart3, FileText, ShieldCheck } from 'lucide-react';
import AiDigestCard from '../components/AiDigestCard';

export default function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['compliance'], queryFn: async () => (await api.get('/reports/compliance')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const d = data;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-bold text-slate-900">Organization Overview</h1><p className="text-slate-500 text-sm mt-0.5">Compliance status across all training.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Overall compliance" value={`${d.compliancePct}%`} tone="emerald" icon={<ShieldCheck size={20} />} />
        <Stat label="Active learners" value={d.learners} tone="brand" icon={<Users size={20} />} />
        <Stat label="Training modules" value={d.modules} tone="brand" icon={<BookOpen size={20} />} />
        <Stat label="Overdue assignments" value={d.overdue} tone={d.overdue ? 'red' : 'slate'} icon={<AlertTriangle size={20} />} />
      </div>

      <AiDigestCard />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-bold text-slate-800 mb-4">Completion by module</h2>
          <div className="space-y-4">
            {d.modules_breakdown.map((m: any) => {
              const pct = m.assigned ? Math.round((m.completed / m.assigned) * 100) : 0;
              return (
                <div key={m.title}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium text-slate-700">{m.title}</span><span className="text-slate-400">{m.completed}/{m.assigned} · {pct}%</span></div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            {d.modules_breakdown.length === 0 && <p className="text-sm text-slate-400">No modules yet.</p>}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-bold text-slate-800 mb-3">Certificates issued</h2>
            <div className="text-4xl font-extrabold text-brand-700">{d.certificates}</div>
            <p className="text-sm text-slate-400 mt-1">Total valid certifications</p>
          </div>
          <div className="card p-5 space-y-2">
            <Link to="/admin" className="btn-ghost w-full justify-start"><FileText size={16} /> Manage training &amp; questions</Link>
            <Link to="/reports" className="btn-ghost w-full justify-start"><BarChart3 size={16} /> View reports</Link>
            <Link to="/team" className="btn-ghost w-full justify-start"><Users size={16} /> Team tracking</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
