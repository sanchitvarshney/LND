import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken } from './api';

export interface User { id: string; email: string; fullName: string; role: string; department?: string; }

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // attempt silent refresh + me on boot
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setToken(data.accessToken);
        const me = await api.get('/auth/me');
        setUser(me.data);
      } catch { setUser(null); }
      finally { setLoading(false); }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.accessToken);
    setUser(data.user);
  };
  const logout = () => { api.post('/auth/logout').catch(() => {}); setToken(null); setUser(null); };
  const refresh = async () => {
    try { const me = await api.get('/auth/me'); setUser(me.data); } catch { /* ignore */ }
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}
