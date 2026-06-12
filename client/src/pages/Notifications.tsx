import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SkeletonRow, EmptyState } from '../components/ui/Primitives';
import { Bell, Award, CheckCheck, AlertTriangle, BookOpen } from 'lucide-react';

const ICONS: Record<string, any> = { completed: Award, assigned: BookOpen, overdue: AlertTriangle };

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: async () => (await api.get('/notifications')).data.data });
  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <div className="space-y-3"><SkeletonRow lines={1} /><SkeletonRow lines={1} /><SkeletonRow lines={1} /></div>;
  const notes = data || [];
  const unread = notes.filter((n: any) => !n.readAt).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">{unread ? `${unread} unread notification${unread !== 1 ? 's' : ''}.` : 'You\u2019re all caught up.'}</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending} className="btn-ghost !py-2 text-xs">
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notifications yet" subtitle="Training assignments, reminders and certificates will show up here." icon={<Bell size={22} />} />
      ) : (
        <div className="space-y-2.5">
          {notes.map((n: any, i: number) => {
            const Icon = ICONS[n.type] || Bell;
            const unreadItem = !n.readAt;
            return (
              <button key={n.id} onClick={() => unreadItem && markRead.mutate(n.id)}
                className={`w-full text-left card p-4 flex items-start gap-3.5 transition-all duration-200 animate-fade-up hover:-translate-y-0.5 ${unreadItem ? 'border-brand-200 shadow-glow cursor-pointer' : 'opacity-75'}`}
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                <span className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${unreadItem ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${unreadItem ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</span>
                    {unreadItem && <span className="h-2 w-2 rounded-full bg-brand-500 shadow-glow shrink-0" />}
                  </span>
                  <span className="block text-sm text-slate-500 mt-0.5">{n.body}</span>
                  <span className="block text-xs text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</span>
                </span>
              </button>
            );
          })}
          <p className="text-center text-xs text-slate-400 pt-1">Click an unread notification to mark it as read.</p>
        </div>
      )}
    </div>
  );
}
