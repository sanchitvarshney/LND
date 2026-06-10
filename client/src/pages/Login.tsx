import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { GraduationCap, ShieldCheck, Lock, Loader2 } from 'lucide-react';

const DEMO = [
  { role: 'Learner', email: 'learner@acme.com', password: 'Learner@123' },
  { role: 'Manager', email: 'manager@acme.com', password: 'Manager@123' },
  { role: 'Admin', email: 'admin@acme.com', password: 'Admin@123' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('learner@acme.com');
  const [password, setPassword] = useState('Learner@123');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e?.response?.data?.error || 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-white/15 grid place-items-center"><GraduationCap size={20} /></div>
          <span className="font-extrabold text-xl">LearnGuard</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Compliance training,<br />provably complete.</h1>
          <p className="mt-4 text-brand-100 max-w-md">Unskippable video tracking, admin-built assessments, automatic certification, and audit-ready records — all in one platform.</p>
          <div className="mt-8 space-y-3 text-sm text-brand-100">
            <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-brand-300" /> Server-verified watch progress</div>
            <div className="flex items-center gap-2"><Lock size={18} className="text-brand-300" /> Role-based access &amp; audit logs</div>
          </div>
        </div>
        <div className="text-xs text-brand-200">© 2026 LearnGuard · Enterprise L&amp;D</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8"><div className="h-9 w-9 rounded-lg bg-brand-600 text-white grid place-items-center"><GraduationCap size={20} /></div><span className="font-extrabold text-xl text-brand-900">LearnGuard</span></div>
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome back</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Sign in to access your training.</p>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
            {err && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">{err}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={18} /> : null} Sign in</button>
          </form>
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-400 mb-2">DEMO ACCOUNTS — click to fill</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-700 transition">{d.role}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
