import { ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, BookOpen, Users, BarChart3, Award, ShieldCheck, LogOut, Menu, GraduationCap, FileText, Bell, LifeBuoy } from 'lucide-react';
import Background3D from './ui/Background3D';

const NAV: Record<string, { to: string; label: string; icon: any }[]> = {
  learner: [
    { to: '/', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/catalog', label: 'Training Catalog', icon: BookOpen },
    { to: '/certificates', label: 'My Certificates', icon: Award },
  ],
  manager: [
    { to: '/', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/team', label: 'Team Tracking', icon: Users },
    { to: '/catalog', label: 'Training Catalog', icon: BookOpen },
    { to: '/certificates', label: 'My Certificates', icon: Award },
  ],
  admin: [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin', label: 'Manage Training', icon: FileText },
    { to: '/team', label: 'Team Tracking', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/audit', label: 'Audit Log', icon: ShieldCheck },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV[user?.role === 'super_admin' ? 'admin' : (user?.role || 'learner')] || NAV.learner;
  // unread notifications badge (refreshes every minute)
  const { data: notes } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.data,
    refetchInterval: 60000, retry: false,
  });
  const unread = (notes || []).filter((n: any) => !n.readAt).length;

  return (
    <div className="min-h-screen lg:flex">
      <Background3D density={0.8} />

      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen z-40 inset-y-0 left-0 w-64 flex flex-col transition-transform border-r border-white/[0.07] bg-[#0a0f20]/90 backdrop-blur-2xl ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/[0.07]">
          <div className="bg-white rounded-lg px-2 py-1.5 shadow-sm"><img src="https://www.mscorpres.com/assets/mscorpreslogo.jpeg" alt="MsCorpres Automation" className="h-6 w-auto" /></div>
          <div className="font-display font-bold tracking-tight text-[13px] text-white leading-tight">L&amp;D&nbsp;Portal</div>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-glow bg-gradient-to-r from-brand-600/80 to-brand-700/60 border border-brand-400/30'
                  : 'text-slate-500 border border-transparent hover:bg-white/[0.05] hover:text-slate-800 hover:translate-x-1'
              }`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent-cyan shadow-glow-cyan" />}
                  <it.icon size={18} className={isActive ? 'text-accent-cyan' : ''} /> {it.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.07]">
          <Link to="/profile" onClick={() => setOpen(false)} className="block glass rounded-xl px-3 py-2.5 mb-2 transition hover:border-brand-400/40" title="My profile">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.fullName}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')} · View profile</div>
          </Link>
          <NavLink to="/help" onClick={() => setOpen(false)}
            className={({ isActive }) => `w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'text-slate-900 bg-white/[0.06]' : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-800'}`}>
            <LifeBuoy size={18} /> Help &amp; Support
          </NavLink>
          <button onClick={() => { logout(); nav('/login'); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 transition">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 glass !bg-[#0a0f20]/70 border-b border-white/[0.07] flex items-center justify-between px-5 sticky top-0 z-20">
          <button className="lg:hidden btn-ghost !px-2 !py-2" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <div className="hidden lg:block text-sm text-slate-400">Enterprise Learning &amp; Compliance</div>
          <div className="flex items-center gap-3">
            <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative h-9 w-9 rounded-xl grid place-items-center text-slate-500 border border-white/10 bg-white/5 transition hover:text-slate-900 hover:border-white/20">
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-bold text-white shadow-glow"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 capitalize">{user?.role?.replace('_', ' ')}</span>
            <Link to="/profile" title="My profile" className="h-9 w-9 rounded-full text-white grid place-items-center text-sm font-bold shadow-glow ring-2 ring-white/15 transition hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
              {user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </Link>
          </div>
        </header>
        <main className="p-5 lg:p-8 max-w-7xl mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
