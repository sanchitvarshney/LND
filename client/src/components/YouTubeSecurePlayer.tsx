import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { loadYouTubeApi } from '../lib/youtubeApi';
import { parseYouTubeId } from '../lib/video';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  video: { id: string; sourceUrl: string; durationSeconds: number; binSizeSeconds: number };
  initialStatus?: string;
  onComplete: () => void;
}

// Secure YouTube player: same server-verified, unskippable tracking as the MP4 player,
// driven through the YouTube IFrame API (native controls + keyboard seeking disabled).
export default function YouTubeSecurePlayer({ video, initialStatus, onComplete }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const covered = useRef<Set<number>>(new Set());
  const maxWatched = useRef(0);               // high-water mark (seconds); forward seeking beyond this is blocked
  const unsynced = useRef<Set<number>>(new Set());
  const ready = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [percent, setPercent] = useState(0);
  const [completed, setCompleted] = useState(initialStatus === 'video_completed');
  const [blockedMsg, setBlockedMsg] = useState(false);
  const completedRef = useRef(completed);
  completedRef.current = completed;

  const videoId = parseYouTubeId(video.sourceUrl) || '';
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

  const flash = () => { setBlockedMsg(true); setTimeout(() => setBlockedMsg(false), 2200); };

  // Advance coverage only through contiguous playback; block + snap back on forward jumps.
  const observe = useCallback((t: number) => {
    setCurrent(t);
    if (t <= maxWatched.current + 1.6) {
      maxWatched.current = Math.max(maxWatched.current, t);
      const bin = Math.floor(t / video.binSizeSeconds);
      if (bin >= 0 && bin < totalBins && !covered.current.has(bin)) { covered.current.add(bin); unsynced.current.add(bin); recompute(); }
    } else if (!completedRef.current) {
      // jumped ahead of the high-water mark — pull back
      player.current?.seekTo(maxWatched.current, true);
      flash();
    }
  }, [video.binSizeSeconds, totalBins, recompute]);

  const finishVideo = useCallback(async () => {
    setPlaying(false);
    // fill any trailing bins once playback has genuinely reached the end
    if (maxWatched.current >= video.durationSeconds - 1.6) {
      for (let i = 0; i < totalBins; i++) if (!covered.current.has(i)) { covered.current.add(i); unsynced.current.add(i); }
      recompute();
    }
    await sync(true);
    if (covered.current.size / totalBins >= 0.999) {
      try { await api.post(`/videos/${video.id}/complete`); setCompleted(true); onComplete(); } catch { /* server denied */ }
    }
  }, [video.id, video.durationSeconds, totalBins, recompute, sync, onComplete]);

  // Boot the player + restore prior progress
  useEffect(() => {
    let interval: any;
    let cancelled = false;
    (async () => {
      // restore server progress first
      try {
        const { data } = await api.get(`/videos/${video.id}/progress`);
        const bitmap: string = data.data.watchedBitmap || '';
        bitmap.split('').forEach((c, i) => { if (c === '1') covered.current.add(i); });
        maxWatched.current = data.data.maxPositionSeconds || 0;
        if (data.data.status === 'video_completed') { setCompleted(true); covered.current = new Set(Array.from({ length: totalBins }, (_, i) => i)); }
        recompute();
      } catch { /* ignore */ }

      const YT = await loadYouTubeApi().catch(() => null);
      if (!YT || cancelled || !hostRef.current) return;

      player.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0,
          playsinline: 1, iv_load_policy: 3, origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ready.current = true;
            setMuted(!!player.current?.isMuted?.());
            if (maxWatched.current > 0 && !completedRef.current) {
              player.current.seekTo(Math.min(maxWatched.current, video.durationSeconds - 0.3), true);
            }
          },
          onStateChange: (e: any) => {
            // 1 PLAYING, 2 PAUSED, 0 ENDED, 3 BUFFERING
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2 || e.data === 3) setPlaying(false);
            else if (e.data === 0) finishVideo();
          },
        },
      });

      // poll currentTime while ready (drives coverage + the forward-seek guard)
      interval = setInterval(() => {
        const p = player.current;
        if (!ready.current || !p?.getCurrentTime) return;
        try { if (p.getPlayerState?.() === 1) observe(p.getCurrentTime()); } catch { /* ignore */ }
      }, 350);
    })();

    const syncTimer = setInterval(() => sync(), 5000);
    const onHide = () => { if (document.hidden) player.current?.pauseVideo?.(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      cancelled = true;
      clearInterval(interval); clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', onHide);
      sync(true);
      try { player.current?.destroy?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  const toggle = () => {
    const p = player.current; if (!p || !ready.current) return;
    if (p.getPlayerState?.() === 1) p.pauseVideo(); else p.playVideo();
  };
  const toggleMute = () => {
    const p = player.current; if (!p) return;
    if (p.isMuted?.()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  };
  const goFullscreen = () => {
    const el = containerRef.current as any; if (!el) return;
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
    }
  };

  // backward-only scrub
  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = player.current; if (!p || !ready.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const target = ratio * video.durationSeconds;
    if (target <= maxWatched.current + 0.4) { p.seekTo(target, true); setCurrent(target); }
    else flash();
  };

  const unlockedPct = Math.min(100, (maxWatched.current / video.durationSeconds) * 100);
  const playPct = (current / video.durationSeconds) * 100;

  return (
    <div className="card overflow-hidden">
      <div ref={containerRef} className="yt-fs relative bg-black aspect-video group">
        {/* Fullscreen sizing is scoped to the player host + iframe ONLY —
            a broad `>div` selector would also stretch the badge/banner overlays
            into screen-covering sheets (the "red screen" bug). */}
        <style>{`.yt-fs:fullscreen{width:100vw!important;height:100vh!important;aspect-ratio:auto!important;border-radius:0}.yt-fs:fullscreen .yt-host{width:100%!important;height:100%!important}.yt-fs:fullscreen .yt-host iframe,.yt-fs:fullscreen>iframe{width:100%!important;height:100%!important}`}</style>
        <div ref={hostRef} className="yt-host w-full h-full pointer-events-none" />

        {/* Click-catcher: intercepts all interaction so YouTube's own UI (title, share, "watch on YouTube") can't be seen or used */}
        <button aria-label="Play/pause" onClick={toggle} className="absolute inset-0 z-10 cursor-pointer" onContextMenu={(e) => e.preventDefault()} />
        {/* Top scrim — masks the source/title strip that can briefly appear on start */}
        <div className="absolute top-0 inset-x-0 h-14 z-10 bg-gradient-to-b from-black/85 to-transparent pointer-events-none" />

        {/* Compliance banner */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2.5 py-1.5 text-white text-xs font-medium pointer-events-none">
          <Lock size={13} /> Forward skipping disabled for compliance
        </div>
        {completed && (
          <div className="absolute top-12 right-3 z-20 flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-white text-xs font-semibold pointer-events-none">
            <CheckCircle2 size={14} /> Completed
          </div>
        )}
        {blockedMsg && (
          <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
            <div className="flex items-center gap-2 rounded-lg bg-black/80 px-4 py-3 text-white text-sm font-medium animate-pulse">
              <ShieldCheck size={18} className="text-amber-400" /> You can't skip ahead — please watch the full video.
            </div>
          </div>
        )}
        {!playing && (
          <button onClick={toggle} className="absolute inset-0 z-20 grid place-items-center bg-black hover:bg-black/95 transition">
            <span className="h-16 w-16 rounded-full bg-white/95 grid place-items-center shadow-lg shadow-glow animate-pulse-glow"><Play className="ml-1" size={28} style={{ color: '#4f46e5' }} /></span>
          </button>
        )}

        {/* Custom control bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
          <div className="relative h-2 rounded-full bg-white/25 cursor-pointer mb-2.5" onClick={onScrub} title="Backward review only">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${unlockedPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80" style={{ width: `${percent}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-brand-600" style={{ left: `calc(${playPct}% - 7px)` }} />
          </div>
          <div className="flex items-center gap-3 text-white">
            <button onClick={toggle} className="hover:scale-110 transition">{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <button onClick={toggleMute} className="hover:scale-110 transition">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <span className="text-xs font-mono tabular-nums">{fmt(current)} / {fmt(video.durationSeconds)}</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs font-semibold">{Math.round(percent)}% watched</span>
              <button onClick={goFullscreen} className="hover:scale-110 transition" aria-label="Toggle fullscreen"><Maximize size={17} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number) { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; }
