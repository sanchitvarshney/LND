import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { GraduationCap, ShieldCheck, Lock, Loader2, Award, PlayCircle, Sparkles } from 'lucide-react';
import Background3D from '../components/ui/Background3D';
import TiltCard from '../components/ui/TiltCard';

const FEATURES = [
  { icon: PlayCircle, text: 'Unskippable, server-verified video tracking' },
  { icon: Award, text: 'Automatic certificates with public verification' },
  { icon: ShieldCheck, text: 'Role-based access & audit-ready records' },
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
      <Background3D density={1.3} />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2 max-w-7xl mx-auto">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-14">
          <div className="flex items-center gap-3 animate-fade-up">
            <img src="https://www.mscorpres.com/assets/mscorpreslogo.jpeg" alt="MsCorpres Automation" className="h-12 w-auto bg-white rounded-lg p-1.5 shadow-sm" />
          </div>

          <div>
            <div className="chip glass text-brand-300 mb-6 animate-fade-up"><Sparkles size={13} /> Learning &amp; Development Portal</div>
            <h1 className="text-5xl font-display font-bold leading-[1.1] text-slate-900 animate-fade-up" style={{ animationDelay: '.08s' }}>
              Compliance training,<br /><span className="gradient-text">provably complete.</span>
            </h1>
            <p className="mt-5 text-slate-500 max-w-md text-lg animate-fade-up" style={{ animationDelay: '.16s' }}>
              Watch. Learn. Get certified. Every second of progress verified on the server — no shortcuts, no doubts.
            </p>
            <div className="mt-9 space-y-3 animate-fade-up" style={{ animationDelay: '.24s' }}>
              {FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-3 glass rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:border-white/20 hover:translate-x-1">
                  <f.icon size={18} className="text-accent-cyan shrink-0" /> {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">© 2026 MsCorpres Automation · Learning &amp; Development Portal</div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center p-6">
          <TiltCard max={4} className="w-full max-w-md">
            <div className="card p-8 sm:p-10 shadow-soft animate-fade-up">
              <div className="lg:hidden flex items-center mb-8">
                <img src="https://www.mscorpres.com/assets/mscorpreslogo.jpeg" alt="MsCorpres Automation" className="h-10 w-auto bg-white rounded-lg p-1.5" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 text-sm mt-1 mb-7">Sign in to continue your training journey.</p>
              <form onSubmit={submit} className="space-y-4">
                <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
                <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
                {err && <div className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">{err}</div>}
                <button className="btn-primary w-full !py-3" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />} Sign in
                </button>
              </form>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
