import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { GraduationCap, ShieldCheck, Lock, Loader2, Award, PlayCircle } from 'lucide-react';
import Background3D from '../components/ui/Background3D';
import TiltCard from '../components/ui/TiltCard';

const FEATURES = [
  { icon: PlayCircle, title: 'Verified watch progress', text: 'Unskippable video with server-side completion checks.' },
  { icon: Award, title: 'Automatic certification', text: 'Certificates issued instantly, publicly verifiable.' },
  { icon: ShieldCheck, title: 'Audit-ready records', text: 'Role-based access with an immutable activity log.' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // If no admin exists yet, send the user to first-time setup.
  useEffect(() => {
    api.get('/auth/setup-status').then((r) => { if (r.data.needsSetup) nav('/setup', { replace: true }); }).catch(() => {});
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e?.response?.data?.error || 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden scene-3d">
      <Background3D density={1.1} />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2 max-w-7xl mx-auto">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-14">
          <div className="flex items-center gap-3 animate-fade-up">
            <div className="h-11 w-11 rounded-xl grid place-items-center text-white shadow-glow"
              style={{ background: 'linear-gradient(135deg,#04b0a8,#017b75)' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-slate-900 tracking-tight leading-none">LearnGuard</div>
              <div className="text-[10px] font-semibold tracking-[0.16em] text-brand-600 uppercase mt-1">Expert in Execution</div>
            </div>
          </div>

          <div>
            <div className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 mb-6 animate-fade-up">Enterprise learning, done right</div>
            <h1 className="text-[2.9rem] font-display font-bold leading-[1.12] text-slate-900 animate-fade-up" style={{ animationDelay: '.07s' }}>
              Compliance training,<br /><span className="gradient-text">provably complete.</span>
            </h1>
            <p className="mt-5 text-slate-500 max-w-md text-lg animate-fade-up" style={{ animationDelay: '.14s' }}>
              Watch. Learn. Get certified. Every minute of progress is verified on the server — no shortcuts, no doubts.
            </p>
            <div className="mt-9 space-y-3 animate-fade-up" style={{ animationDelay: '.21s' }}>
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3.5 card px-4 py-3.5 transition-all duration-200 hover:border-brand-200 hover:shadow-lift hover:translate-x-1">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0"><f.icon size={18} /></div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{f.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">© 2026 LearnGuard · An MSCorpres platform</div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center p-6">
          <TiltCard max={3} className="w-full max-w-md">
            <div className="card p-8 sm:p-10 shadow-soft animate-fade-up">
              <div className="lg:hidden flex items-center gap-2.5 mb-8">
                <div className="h-10 w-10 rounded-xl grid place-items-center text-white shadow-glow" style={{ background: 'linear-gradient(135deg,#04b0a8,#017b75)' }}><GraduationCap size={20} /></div>
                <span className="font-display font-bold text-xl text-slate-900">LearnGuard</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1 mb-7">Sign in to continue your training.</p>
              <form onSubmit={submit} className="space-y-4">
                <div><label className="label" htmlFor="lg-email">Work email</label><input id="lg-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@company.com" required /></div>
                <div><label className="label" htmlFor="lg-pass">Password</label><input id="lg-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" required /></div>
                {err && <div role="alert" className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200 animate-fade-in">{err}</div>}
                <button className="btn-primary w-full !py-3" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />} Sign in
                </button>
              </form>
              <hr className="neon-divider my-7" />
              <p className="text-xs text-slate-400 text-center">Access is provisioned by your administrator.<br />Contact your L&amp;D team if you need an account.</p>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
