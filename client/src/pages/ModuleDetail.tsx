import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Badge, Spinner } from '../components/ui/Primitives';
import { ArrowLeft, Film, CheckCircle2, Lock, PlayCircle, FileQuestion } from 'lucide-react';

export default function ModuleDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['module', id], queryFn: async () => (await api.get(`/modules/${id}`)).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const m = data;
  const allWatched = m.videos.length > 0 && m.videos.every((v: any) => v.progress?.status === 'video_completed');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back</button>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge tone="slate">{m.category}</Badge>
          {m.isMandatory && <Badge tone="brand">Mandatory</Badge>}
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900">{m.title}</h1>
        <p className="text-slate-600 mt-2">{m.description}</p>
        <div className="flex gap-6 mt-4 text-sm text-slate-500">
          <span>Passing score: <b className="text-slate-700">{m.passThreshold}%</b></span>
          <span>Videos: <b className="text-slate-700">{m.videos.length}</b></span>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-slate-800 mb-4">Course content</h2>
        <ol className="space-y-2">
          {m.videos.map((v: any, i: number) => {
            const done = v.progress?.status === 'video_completed';
            return (
              <li key={v.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{done ? <CheckCircle2 size={17} /> : i + 1}</span>
                <div className="flex-1"><div className="font-medium text-slate-700 flex items-center gap-2"><Film size={15} className="text-slate-400" /> {v.title}</div>
                  {v.progress && v.progress.percentComplete > 0 && !done && <div className="text-xs text-amber-600 mt-0.5">{Math.round(v.progress.percentComplete)}% watched</div>}
                </div>
                <Link to={`/modules/${id}/player`} className="btn-ghost !py-1.5 !px-3 text-xs">{done ? 'Rewatch' : v.progress?.percentComplete > 0 ? 'Resume' : 'Start'}</Link>
              </li>
            );
          })}
          {/* Assessment row (locked until videos done) */}
          <li className={`flex items-center gap-3 rounded-lg border-2 border-dashed p-3 ${allWatched ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'}`}>
            <span className={`h-8 w-8 rounded-full grid place-items-center ${allWatched ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}`}>{allWatched ? <FileQuestion size={17} /> : <Lock size={15} />}</span>
            <div className="flex-1"><div className="font-medium text-slate-700">Assessment</div><div className="text-xs text-slate-400">{allWatched ? 'Unlocked — test your knowledge' : 'Complete all videos to unlock'}</div></div>
            <button disabled={!allWatched} onClick={() => nav(`/modules/${id}/assessment`)} className="btn-primary !py-1.5 !px-3 text-xs">Take quiz</button>
          </li>
        </ol>
      </div>

      <div className="flex justify-end">
        {allWatched ? (
          <button onClick={() => nav(`/modules/${id}/assessment`)} className="btn-primary"><FileQuestion size={17} /> Go to assessment</button>
        ) : (
          <Link to={`/modules/${id}/player`} className="btn-primary"><PlayCircle size={17} /> {m.videos.some((v: any) => v.progress?.percentComplete > 0) ? 'Resume training' : 'Start training'}</Link>
        )}
      </div>
    </div>
  );
}
