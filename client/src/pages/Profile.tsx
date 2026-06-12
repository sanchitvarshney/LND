import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Stat, SkeletonRow } from '../components/ui/Primitives';
import { Award, CheckCircle2, BookOpen, Loader2, Save, KeyRound, ShieldCheck, CheckCheck } from 'lucide-react';

export default function Profile() {
  const { user, refresh } = useAuth();
  const { data: mods, isLoading: l1 } = useQuery({ queryKey: ['modules'], queryFn: async () => (await api.get('/modules')).data.data });
  const { data: certs, isLoading: l2 } = useQuery({ queryKey: ['certs'], queryFn: async () => (await api.get('/certificates/me')).data.data });

  const [f, setF] = useState({ fullName: user?.fullName || '', department: user?.department || '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setSaved(false); setSaveErr('');
    try {
      await api.patch('/auth/me', { fullName: f.fullName.trim(), department: f.department.trim() });
      await refresh();
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: any) { setSaveErr(err?.response?.data?.error || 'Could not save profile.'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwMsg(null);
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' });
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: 'Passwords do not match.' });
    setPwBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password updated successfully.' });
    } catch (err: any) { setPwMsg({ ok: false, text: err?.response?.data?.error || 'Could not change password.' }); }
    finally { setPwBusy(false); }
  };

  if (l1 || l2) return <div className="space-y-4"><SkeletonRow lines={2} /><SkeletonRow /><SkeletonRow /></div>;

  const completed = (mods || []).filter((m: any) => m.assignment?.status === 'completed').length;
  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your account, training record and security settings.</p>
      </div>

      {/* Identity card */}
      <div className="card relative overflow-hidden p-6 lg:p-8 flex flex-wrap items-center gap-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="h-20 w-20 rounded-2xl grid place-items-center text-2xl font-display font-bold text-white shadow-glow shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
          {initials}
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-display font-bold text-slate-900 truncate">{user?.fullName}</h2>
            <Badge tone="brand"><span className="capitalize">{user?.role?.replace('_', ' ')}</span></Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{user?.email}</p>
          {user?.department && <p className="text-xs text-slate-400 mt-0.5">Department · {user.department}</p>}
        </div>
        <div className="relative flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck size={14} className="text-emerald-600" /> Account active
        </div>
      </div>

      {/* Training record */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Assigned trainings" value={(mods || []).length} tone="brand" icon={<BookOpen size={20} />} />
        <Stat label="Completed" value={completed} tone="emerald" icon={<CheckCircle2 size={20} />} />
        <Stat label="Certificates earned" value={(certs || []).length} tone="amber" icon={<Award size={20} />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Profile details */}
        <form onSubmit={saveProfile} className="card p-6 space-y-4">
          <h2 className="font-display font-bold text-slate-800">Profile details</h2>
          <div><label className="label">Full name</label><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required /></div>
          <div><label className="label">Department</label><input className="input" placeholder="e.g. Operations" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled /><p className="text-xs text-slate-400 mt-1">Email changes are managed by your administrator.</p></div>
          {saveErr && <div role="alert" className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">{saveErr}</div>}
          <button className="btn-primary" disabled={saving || !f.fullName.trim()}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCheck size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={changePassword} className="card p-6 space-y-4">
          <h2 className="font-display font-bold text-slate-800 flex items-center gap-2"><KeyRound size={17} /> Change password</h2>
          <div><label className="label">Current password</label><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">New password</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required /></div>
            <div><label className="label">Confirm</label><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required /></div>
          </div>
          <p className="text-xs text-slate-400">At least 8 characters. You will stay signed in on this device.</p>
          {pwMsg && (
            <div role="alert" className={`rounded-xl text-sm px-3 py-2 ring-1 ${pwMsg.ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>{pwMsg.text}</div>
          )}
          <button className="btn-ghost" disabled={pwBusy}>
            {pwBusy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Update password
          </button>
        </form>
      </div>
    </div>
  );
}
