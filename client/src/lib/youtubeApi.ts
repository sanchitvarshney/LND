// Loads the YouTube IFrame Player API exactly once and resolves with the global `YT` namespace.
let loader: Promise<any> | null = null;

export function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (loader) return loader;

  loader = new Promise((resolve) => {
    // Chain any pre-existing ready handler so we don't clobber it.
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') prev(); resolve(w.YT); };

    if (!document.getElementById('youtube-iframe-api')) {
      const s = document.createElement('script');
      s.id = 'youtube-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
    // Safety: if the API was already present but the global hook didn't fire.
    if (w.YT && w.YT.Player) resolve(w.YT);
  });
  return loader;
}

/** Read a YouTube video's duration (seconds) without showing a visible player. */
export function fetchYouTubeDuration(videoId: string, timeoutMs = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    loadYouTubeApi().then((YT) => {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;left:-9999px;top:-9999px;';
      document.body.appendChild(host);
      let done = false;
      const cleanup = () => { try { player?.destroy?.(); } catch {} host.remove(); };
      const finish = (fn: () => void) => { if (done) return; done = true; clearTimeout(timer); cleanup(); fn(); };
      const timer = setTimeout(() => finish(() => reject(new Error('timeout'))), timeoutMs);
      const player = new YT.Player(host, {
        videoId,
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: () => {
            const tryRead = (n: number) => {
              const d = Math.round(player.getDuration?.() || 0);
              if (d > 0) return finish(() => resolve(d));
              if (n <= 0) return finish(() => reject(new Error('no duration')));
              setTimeout(() => tryRead(n - 1), 300);
            };
            tryRead(6);
          },
          onError: () => finish(() => reject(new Error('yt error'))),
        },
      });
    }).catch(reject);
  });
}
