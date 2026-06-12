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

function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-10 w-10 rounded-xl' : 'h-9 w-9 rounded-xl';
  return (
    <div className={`${s} grid place-items-center text-white shadow-glow shrink-0`}
      style={{ background: 'linear-gradient(135deg,#04b0a8,#017b75)' }}>
      <GraduationCap size={size === 'lg' ? 20 : 18} />
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV[user?.role === 'super_admin' ? 'admin' : (user?.role || 'learner')] || NAV.learner;

  return (
    <div className="min-h-screen lg:flex">
      <Background3D density={0.9} />

      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen z-40 inset-y-0 left-0 w-64 flex flex-col transition-transform duration-300 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200/80">
          <BrandMark />
          <div>
            <div className="font-display font-bold tracking-tight text-lg text-slate-900 leading-none">LearnGuard</div>
            <div className="text-[10px] font-semibold tracking-[0.14em] text-brand-600 uppercase mt-0.5">Expert in Execution</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1" aria-label="Main">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
              }`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-500" />}
                  <it.icon size={18} className={isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'} /> {it.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200/80">
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2.5 mb-2">
            <div className="text-sm font-semibold text-slate-800 truncate">{user?.fullName}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={() => { logout(); nav('/login'); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={18} /> Sign out
          </button>
          <div className="px-3 pt-3 text-[10px] text-slate-300 font-medium">An MSCorpres platform</div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 glass border-b !border-slate-200/80 flex items-center justify-between px-5 sticky top-0 z-20">
          <button className="lg:hidden btn-ghost !px-2 !py-2" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
          <div className="hidden lg:block text-sm text-slate-400">Enterprise Learning &amp; Compliance</div>
          <div className="flex items-center gap-3">
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 capitalize">{user?.role?.replace('_', ' ')}</span>
            <div className="h-9 w-9 rounded-full text-white grid place-items-center text-sm font-bold ring-2 ring-white shadow-card"
              style={{ background: 'linear-gradient(135deg,#04b0a8,#075f5b)' }} title={user?.fullName}>
              {user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8 max-w-7xl mx-auto animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
