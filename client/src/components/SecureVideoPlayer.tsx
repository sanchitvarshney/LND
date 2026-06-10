import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  video: { id: string; sourceUrl: string; durationSeconds: number; binSizeSeconds: number };
  initialStatus?: string;
  onComplete: () => void;
}

export default function SecureVideoPlayer({ video, initialStatus, onComplete }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const covered = useRef<Set<number>>(new Set());
  const maxWatched = useRef(0);              // high-water mark (seconds) — forward seeking beyond this is blocked
  const unsynced = useRef<Set<number>>(new Set());
  const seekingGuard = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [percent, setPercent] = useState(0);
  const [completed, setCompleted] = useState(initialStatus === 'video_completed');
  const [blockedMsg, setBlockedMsg] = useState(false);

  const totalBins = Math.max(1, Math.ceil(video.durationSeconds / video.binSizeSeconds));

  const recompute = useCallback(() => {
    setPercent(Math.min(100, (covered.current.size / totalBins) * 100));
  }, [totalBins]);

  const sync = useCallback(async (force = false) => {
    if (unsynced.current.size === 0 && !force) return;
    const bins = Array.from(unsynced.current);
    unsynced.current.clear();
    try {
      await api.post(`/videos/${video.id}/progress`, { coveredBins: bins, maxPositionSeconds: Math.floor(maxWatched.current) });
    } catch { bins.forEach((b) => unsynced.current.add(b)); }
  }, [video.id]);

  // Restore prior progress from server
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/videos/${video.id}/progress`);
        const bitmap: string = data.data.watchedBitmap || '';
        bitmap.split('').forEach((c, i) => { if (c === '1') covered.current.add(i); });
        maxWatched.current = data.data.maxPositionSeconds || 0;
        if (data.data.status === 'video_completed') { setCompleted(true); covered.current = new Set(Array.from({ length: totalBins }, (_, i) => i)); }
        recompute();
        if (ref.current && maxWatched.current > 0 && !completed) ref.current.currentTime = Math.min(maxWatched.current, video.durationSeconds - 0.3);
      } catch { /* ignore */ }
    })();
    const t = setInterval(() => sync(), 5000);
    const onHide = () => { if (document.hidden) ref.current?.pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onHide); sync(true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  const onTimeUpdate = () => {
    const v = ref.current; if (!v) return;
    const t = v.currentTime;
    setCurrent(t);
    // advance high-water mark only through contiguous playback
    if (t <= maxWatched.current + 1.2) {
      maxWatched.current = Math.max(maxWatched.current, t);
      const bin = Math.floor(t / video.binSizeSeconds);
      if (bin >= 0 && bin < totalBins && !covered.current.has(bin)) { covered.current.add(bin); unsynced.current.add(bin); recompute(); }
    }
  };

  // Forward-seek guard: snap back if user jumps ahead of the high-water mark
  const onSeeking = () => {
    const v = ref.current; if (!v) return;
    if (seekingGuard.current) { seekingGuard.current = false; return; }
    if (v.currentTime > maxWatched.current + 1.2 && !completed) {
      seekingGuard.current = true;
      v.currentTime = maxWatched.current;
      setBlockedMsg(true);
      setTimeout(() => setBlockedMsg(false), 2200);
    }
  };

  const onEnded = async () => {
    setPlaying(false);
    // fill any trailing bins reached
    const lastBin = Math.floor((video.durationSeconds - 0.01) / video.binSizeSeconds);
    for (let i = 0; i <= lastBin; i++) if (maxWatched.current >= video.durationSeconds - 1.1 && !covered.current.has(i)) { covered.current.add(i); unsynced.current.add(i); }
    recompute();
    await sync(true);
    if (covered.current.size / totalBins >= 0.999) {
      try { await api.post(`/videos/${video.id}/complete`); setCompleted(true); onComplete(); } catch { /* server denied */ }
    }
  };

  const toggle = () => { const v = ref.current!; if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } };

  // click-to-seek: only backward (<= maxWatched) allowed
  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = ref.current; if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const target = ratio * video.durationSeconds;
    if (target <= maxWatched.current + 0.4) v.currentTime = target;
    else { setBlockedMsg(true); setTimeout(() => setBlockedMsg(false), 2200); }
  };

  const unlockedPct = Math.min(100, (maxWatched.current / video.durationSeconds) * 100);
  const playPct = (current / video.durationSeconds) * 100;

  return (
    <div className="card overflow-hidden">
      <div className="relative bg-black aspect-video group">
        <video ref={ref} src={video.sourceUrl} className="w-full h-full" onTimeUpdate={onTimeUpdate} onSeeking={onSeeking}
          onEnded={onEnded} onClick={toggle} onContextMenu={(e) => e.preventDefault()} playsInline preload="metadata" />

        {/* Compliance banner */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2.5 py-1.5 text-white text-xs font-medium">
          <Lock size={13} /> Forward skipping disabled for compliance
        </div>
        {completed && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-white text-xs font-semibold">
            <CheckCircle2 size={14} /> Completed
          </div>
        )}
        {blockedMsg && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-white text-sm font-medium animate-pulse">
              <ShieldCheck size={18} className="text-amber-400" /> You can't skip ahead — please watch the full video.
            </div>
          </div>
        )}
        {!playing && (
          <button onClick={toggle} className="absolute inset-0 grid place-items-center bg-black/20 hover:bg-black/30 transition">
            <span className="h-16 w-16 rounded-full bg-white/95 grid place-items-center shadow-lg"><Play className="text-brand-700 ml-1" size={28} /></span>
          </button>
        )}

        {/* Custom control bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
          {/* read-only progress: watched coverage (green) + unlocked region + playhead */}
          <div className="relative h-2 rounded-full bg-white/25 cursor-pointer mb-2.5" onClick={onScrub} title="Backward review only">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${unlockedPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80" style={{ width: `${percent}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-brand-600" style={{ left: `calc(${playPct}% - 7px)` }} />
          </div>
          <div className="flex items-center gap-3 text-white">
            <button onClick={toggle} className="hover:scale-110 transition">{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <button onClick={() => { const v = ref.current!; v.muted = !v.muted; setMuted(v.muted); }} className="hover:scale-110 transition">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <span className="text-xs font-mono tabular-nums">{fmt(current)} / {fmt(video.durationSeconds)}</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-semibold">{Math.round(percent)}% watched</span>
              <button onClick={() => ref.current?.requestFullscreen?.()} className="hover:scale-110 transition"><Maximize size={17} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number) { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; }
