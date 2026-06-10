import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Stat, Spinner } from '../components/ui/Primitives';
import { BarChart3, CheckCircle2, AlertTriangle, Award, Download } from 'lucide-react';

export default function Reports() {
  const { data, isLoading } = useQuery({ queryKey: ['compliance'], queryFn: async () => (await api.get('/reports/compliance')).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const d = data;
  const exportCsv = () => {
    const rows = [['Module', 'Assigned', 'Completed', 'Completion %'], ...d.modules_breakdown.map((m: any) => [m.title, m.assigned, m.completed, m.assigned ? Math.round((m.completed / m.assigned) * 100) + '%' : '0%'])];
    const csv = rows.map((r) => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'compliance-report.csv'; a.click();
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Reports &amp; Analytics</h1><p className="text-slate-500 text-sm mt-0.5">Compliance tracking and completion analytics.</p></div>
        <button onClick={exportCsv} className="btn-ghost"><Download size={16} /> Export CSV</button>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="Total assignments" value={d.totalAssignments} tone="brand" icon={<BarChart3 size={20} />} />
        <Stat label="Completed" value={d.completed} tone="emerald" icon={<CheckCircle2 size={20} />} />
        <Stat label="Overdue" value={d.overdue} tone={d.overdue ? 'red' : 'slate'} icon={<AlertTriangle size={20} />} />
        <Stat label="Certificates" value={d.certificates} tone="brand" icon={<Award size={20} />} />
      </div>
      <div className="card p-6">
        <h2 className="font-bold text-slate-800 mb-4">Module completion breakdown</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-100"><th className="py-2">Module</th><th className="py-2">Assigned</th><th className="py-2">Completed</th><th className="py-2 w-48">Completion</th></tr></thead>
          <tbody>
            {d.modules_breakdown.map((m: any) => {
              const pct = m.assigned ? Math.round((m.completed / m.assigned) * 100) : 0;
              return (<tr key={m.title} className="border-b border-slate-50">
                <td className="py-3 font-medium text-slate-700">{m.title}</td><td className="py-3 text-slate-600">{m.assigned}</td><td className="py-3 text-slate-600">{m.completed}</td>
                <td className="py-3"><div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div><span className="text-xs font-semibold w-9">{pct}%</span></div></td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
