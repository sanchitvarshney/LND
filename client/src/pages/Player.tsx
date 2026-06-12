import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import YouTubeSecurePlayer from '../components/YouTubeSecurePlayer';
import { isYouTube } from '../lib/video';
import { ArrowLeft, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';

export default function Player() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['module', id], queryFn: async () => (await api.get(`/modules/${id}`)).data.data });
  const [idx, setIdx] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => { setJustCompleted(false); }, [idx]);
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const m = data;
  const video = m.videos[idx];
  const allWatched = m.videos.every((v: any, i: number) => i === idx ? justCompleted || v.progress?.status === 'video_completed' : v.progress?.status === 'video_completed');
  const isLast = idx === m.videos.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link to={`/modules/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> {m.title}</Link>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-display font-bold text-slate-900">{video.title}</h1>
          <span className="text-sm text-slate-400">Video {idx + 1} of {m.videos.length}</span>
        </div>
        {isYouTube(video.sourceUrl) ? (
          <YouTubeSecurePlayer key={video.id} video={video} initialStatus={video.progress?.status}
            onComplete={() => { setJustCompleted(true); refetch(); qc.invalidateQueries({ queryKey: ['modules'] }); }} />
        ) : (
          <SecureVideoPlayer key={video.id} video={video} initialStatus={video.progress?.status}
            onComplete={() => { setJustCompleted(true); refetch(); qc.invalidateQueries({ queryKey: ['modules'] }); }} />
        )}
      </div>

      {(justCompleted || video.progress?.status === 'video_completed') && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={18} /> Video completed — your progress has been recorded.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={14} /> Completion is verified server-side from your watch history.</div>
        <div className="flex gap-2">
          {!isLast && (justCompleted || video.progress?.status === 'video_completed') && (
            <button onClick={() => setIdx(idx + 1)} className="btn-ghost">Next video <ChevronRight size={16} /></button>
          )}
          {isLast && allWatched && (
            <button onClick={() => nav(`/modules/${id}/assessment`)} className="btn-primary">Continue to assessment <ChevronRight size={16} /></button>
          )}
        </div>
      </div>
    </div>
  );
}
