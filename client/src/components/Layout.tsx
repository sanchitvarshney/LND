import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, BookOpen, Users, BarChart3, Award, ShieldCheck, LogOut, Menu, GraduationCap, FileText } from 'lucide-react';
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

  return (
    <div className="min-h-screen lg:flex">
      <Background3D density={0.8} />

      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen z-40 inset-y-0 left-0 w-64 flex flex-col transition-transform border-r border-white/[0.07] bg-[#0a0f20]/90 backdrop-blur-2xl ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/[0.07]">
          <img src="/brand/mscorpres-mark-light.svg" alt="MsCorpres Automation" className="h-8 w-auto" />
          <div className="leading-tight">
            <div className="font-display font-bold tracking-tight text-[15px] text-white">L&amp;D Portal</div>
            <div className="text-[10px] font-medium text-slate-400 tracking-wide">MsCorpres Automation</div>
          </div>
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
          <div className="glass rounded-xl px-3 py-2.5 mb-2">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.fullName}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
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
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 capitalize">{user?.role?.replace('_', ' ')}</span>
            <div className="h-9 w-9 rounded-full text-white grid place-items-center text-sm font-bold shadow-glow ring-2 ring-white/15"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
              {user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8 max-w-7xl mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
