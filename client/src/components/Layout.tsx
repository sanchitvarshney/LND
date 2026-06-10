import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LayoutDashboard, BookOpen, Users, BarChart3, Award, ShieldCheck, LogOut, Menu, X, GraduationCap, FileText } from 'lucide-react';

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
      {/* Sidebar */}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-brand-950 text-slate-100 flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-brand-500 grid place-items-center"><GraduationCap size={18} /></div>
          <div className="font-extrabold tracking-tight text-lg">LearnGuard</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <it.icon size={18} /> {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{user?.fullName}</div>
            <div className="capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={() => { logout(); nav('/login'); }} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 sticky top-0 z-20">
          <button className="lg:hidden btn-ghost !px-2 !py-2" onClick={() => setOpen(true)}><Menu size={18} /></button>
          <div className="hidden lg:block text-sm text-slate-400">Enterprise Learning &amp; Compliance</div>
          <div className="flex items-center gap-3">
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 capitalize">{user?.role?.replace('_', ' ')}</span>
            <div className="h-9 w-9 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-bold">
              {user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
