import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge, Spinner, EmptyState } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { Users } from 'lucide-react';

export default function Team() {
  const { data, isLoading } = useQuery({ queryKey: ['team'], queryFn: async () => (await api.get('/reports/team')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const rows = data || [];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-bold text-slate-900">Team Tracking</h1><p className="text-slate-500 text-sm mt-0.5">Compliance status for your team.</p></div>
      {rows.length === 0 ? <EmptyState title="No team members" icon={<Users size={22} />} /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase">
              <th className="px-5 py-3">Employee</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Assigned</th><th className="px-5 py-3">Completed</th><th className="px-5 py-3">Overdue</th><th className="px-5 py-3 w-40">Compliance</th>
            </tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.userId} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-5 py-3"><div className="font-semibold text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.email}</div></td>
                  <td className="px-5 py-3 text-slate-600">{r.department || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{r.assigned}</td>
                  <td className="px-5 py-3 text-slate-600">{r.completed}</td>
                  <td className="px-5 py-3">{r.overdue > 0 ? <Badge tone="red">{r.overdue}</Badge> : <span className="text-slate-400">0</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${r.compliance >= 80 ? 'bg-emerald-500' : r.compliance >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.compliance}%` }} /></div>
                      <span className="text-xs font-semibold text-slate-600 w-9">{r.compliance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
