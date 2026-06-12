import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, ProgressRing, Stat, SkeletonRow, EmptyState } from '../components/ui/Primitives';
import { dueState, fmtDate } from '../lib/format';
import { BookOpen, Clock, AlertTriangle, CheckCircle2, PlayCircle, Award, ArrowRight } from 'lucide-react';

export default function LearnerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['modules'], queryFn: async () => (await api.get('/modules')).data.data });

  if (isLoading) return (
    <div className="space-y-4">
      <SkeletonRow lines={2} />
      <div className="grid sm:grid-cols-3 gap-4"><SkeletonRow lines={1} /><SkeletonRow lines={1} /><SkeletonRow lines={1} /></div>
      <SkeletonRow /><SkeletonRow />
    </div>
  );
  const mods = data || [];
  const overdue = mods.filter((m: any) => m.assignment?.dueAt && new Date(m.assignment.dueAt) < new Date() && m.assignment.status !== 'completed').length;
  const done = mods.filter((m: any) => m.assignment?.status === 'completed').length;
  const inProgress = mods.filter((m: any) => m.assignment && m.assignment.status !== 'completed').length;
  // The single most relevant thing to do next: first incomplete module.
  const nextUp = mods.find((m: any) => m.assignment && m.assignment.status !== 'completed');
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6 lg:p-8">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="absolute -bottom-20 right-32 h-40 w-40 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle,#22d3ee,transparent 70%)' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">
              {greeting}, <span className="gradient-text">{user?.fullName?.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">
              {inProgress > 0
                ? <>You have <b className="text-slate-700">{inProgress}</b> training{inProgress !== 1 ? 's' : ''} in progress{overdue > 0 && <> — <b className="text-red-600">{overdue} overdue</b></>}.</>
                : done > 0 ? 'You’re fully up to date. Well done.' : 'Your assigned training will appear here.'}
            </p>
          </div>
          {nextUp && (
            <Link to={`/modules/${nextUp.id}`} className="btn-primary !px-5 !py-3 group">
              <PlayCircle size={18} />
              <span className="text-left leading-tight">
                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">Continue learning</span>
                <span className="block max-w-[220px] truncate">{nextUp.title}</span>
              </span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Assigned" value={mods.length} tone="brand" icon={<BookOpen size={20} />} />
        <Stat label="In progress" value={inProgress} tone="amber" icon={<Clock size={20} />} />
        <Stat label="Completed" value={done} tone="emerald" icon={<CheckCircle2 size={20} />} />
      </div>

      <div>
        <h2 className="font-display font-bold text-slate-800 mb-3">Your training</h2>
        {mods.length === 0 ? (
          <EmptyState title="All caught up!" subtitle="You have no training assigned right now." icon={<Award size={22} />} />
        ) : (
          <div className="space-y-3">
            {mods.map((m: any) => {
              const ds = dueState(m.assignment?.dueAt, m.assignment?.status);
              const cta = m.assignment?.status === 'completed' ? 'View certificate' : m.videosCompleted ? 'Take assessment' : m.percentWatched > 0 ? 'Resume' : 'Start';
              return (
                <Link key={m.id} to={`/modules/${m.id}`} className="card p-5 flex items-center gap-5 transition-all duration-300 group hover:shadow-soft hover:border-brand-400/40 hover:-translate-y-1 hover:shadow-glow">
                  <ProgressRing value={m.assignment?.status === 'completed' ? 100 : m.percentWatched} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-800 truncate group-hover:text-brand-300 transition">{m.title}</h3>
                      {m.isMandatory && <Badge tone="brand">Mandatory</Badge>}
                      <Badge tone={ds.tone}>{ds.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{m.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>{m.videoCount} video{m.videoCount !== 1 ? 's' : ''}</span>·
                      <span>{m.questionCount} questions</span>·
                      <span>Pass ≥ {m.passThreshold}%</span>
                      {m.assignment?.dueAt && <><span>·</span><span>Due {fmtDate(m.assignment.dueAt)}</span></>}
                    </div>
                  </div>
                  <span className="btn-primary shrink-0 group-hover:shadow-glow-lg"><PlayCircle size={16} /> {cta}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {overdue > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-red-700 text-sm font-medium">
          <AlertTriangle size={18} /> You have {overdue} overdue training module{overdue !== 1 ? 's' : ''}. Please complete {overdue !== 1 ? 'them' : 'it'} as soon as possible.
        </div>
      )}
    </div>
  );
}
