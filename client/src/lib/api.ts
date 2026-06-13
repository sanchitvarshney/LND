import axios from 'axios';

// Same-origin by default (frontend served by the API in prod, Vite proxy in dev).
// Override with VITE_API_URL when hosting the frontend separately.
const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';
export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

let accessToken: string | null = null;
export function setToken(t: string | null) { accessToken = t; }
export function getToken() { return accessToken; }

// Refresh token is persisted client-side so the session survives reloads even when
// the httpOnly cookie is blocked as a third-party cookie (frontend + API on different domains).
const RT_KEY = 'lnd_refresh_token';
export function setRefreshToken(t: string | null) {
  try { if (t) localStorage.setItem(RT_KEY, t); else localStorage.removeItem(RT_KEY); } catch { /* ignore */ }
}
export function getRefreshToken(): string | null {
  try { return localStorage.getItem(RT_KEY); } catch { return null; }
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On 401, try a single silent refresh then retry
let refreshing: Promise<string | null> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken: getRefreshToken() }).then((res) => res.data.accessToken).catch(() => null);
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) { setToken(newToken); original.headers.Authorization = `Bearer ${newToken}`; return api(original); }
      } catch { /* fall through */ }
    }
    return Promise.reject(error);
  }
);
