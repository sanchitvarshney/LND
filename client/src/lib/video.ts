// Helpers for detecting and parsing video sources.
// YouTube videos are stored in the DB as the plain URL (never the file);
// the secure player streams them via the YouTube IFrame API.

const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];

/** Extract the 11-char YouTube video id from any common URL shape, or null. */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (!YT_HOSTS.includes(host)) return null;

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = u.pathname.split('/').filter(Boolean)[0];
    return isId(id) ? id : null;
  }
  // youtube.com/watch?v=<id>
  const v = u.searchParams.get('v');
  if (isId(v)) return v as string;

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const parts = u.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live' || p === 'v');
  if (i >= 0 && isId(parts[i + 1])) return parts[i + 1];

  return null;
}

export function isYouTube(url: string): boolean {
  return parseYouTubeId(url) != null;
}

function isId(s: string | null | undefined): boolean {
  return !!s && /^[a-zA-Z0-9_-]{11}$/.test(s);
}
