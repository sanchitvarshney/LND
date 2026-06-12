import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { GraduationCap, ShieldCheck, Loader2 } from 'lucide-react';
import Background3D from '../components/ui/Background3D';

export default function Setup() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/auth/setup-status')
      .then((r) => { if (!r.data.needsSetup) nav('/login', { replace: true }); else setChecking(false); })
      .catch(() => setChecking(false));
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (form.password.length < 8) return setErr('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/setup', { email: form.email, fullName: form.fullName, password: form.password });
      nav('/login', { replace: true, state: { setup: true } });
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Setup failed.');
    } finally { setBusy(false); }
  };

  if (checking) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-brand-600" /></div>;

  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center p-6">
      <Background3D density={1} />
      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="h-10 w-10 rounded-xl grid place-items-center text-white shadow-glow" style={{ background: 'linear-gradient(135deg,#04b0a8,#017b75)' }}><GraduationCap size={20} /></div>
          <span className="font-display font-bold text-xl text-slate-900">LearnGuard</span>
        </div>
        <div className="card p-8 shadow-soft">
          <div className="flex items-center gap-2 text-brand-700 mb-1"><ShieldCheck size={18} /><span className="text-xs font-bold tracking-wide uppercase">First-time setup</span></div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Create your admin account</h1>
          <p className="text-slate-500 text-sm mt-1 mb-6">This is the first and only account created automatically. You'll add everyone else from the admin panel.</p>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">Full name</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              <div><label className="label">Confirm</label><input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /></div>
            </div>
            {err && <div role="alert" className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200 animate-fade-in">{err}</div>}
            <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={18} /> : null} Create admin &amp; continue</button>
          </form>
        </div>
      </div>
    </div>
  );
}
