import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Badge, Spinner } from '../components/ui/Primitives';
import { TYPE_LABEL } from '../components/QuestionRenderer';
import { isYouTube } from '../lib/video';
import { fetchYouTubeDuration } from '../lib/youtubeApi';
import { Plus, FileText, HelpCircle, X, Check, Trash2, Film, UserPlus, Users, CalendarPlus, Youtube, Loader2, Sparkles, KeyRound, Pencil, Settings2, Power, ListChecks } from 'lucide-react';
import { useAiStatus, generateQuestions } from '../lib/ai';

const ROLE_TONE: any = { admin: 'brand', manager: 'amber', learner: 'slate', super_admin: 'brand' };

export default function Admin() {
  const qc = useQueryClient();
  const { data: mods, isLoading } = useQuery({ queryKey: ['adminModules'], queryFn: async () => (await api.get('/modules')).data.data });
  const { data: users } = useQuery({ queryKey: ['adminUsers'], queryFn: async () => (await api.get('/users')).data.data });
  const [showModule, setShowModule] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [qFor, setQFor] = useState<any>(null);
  const [vFor, setVFor] = useState<any>(null);
  const [aFor, setAFor] = useState<any>(null);
  const [pwFor, setPwFor] = useState<any>(null);
  const [editMod, setEditMod] = useState<any>(null);
  const [manageMod, setManageMod] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);

  const refreshModules = () => qc.invalidateQueries({ queryKey: ['adminModules'] });
  const refreshUsers = () => qc.invalidateQueries({ queryKey: ['adminUsers'] });

  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-display font-bold text-slate-900">Manage Training</h1><p className="text-slate-500 text-sm mt-0.5">Create users, modules, videos, questions and assignments — all stored in your database.</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowUser(true)} className="btn-ghost"><UserPlus size={16} /> New user</button>
          <button onClick={() => setShowModule(true)} className="btn-primary"><Plus size={16} /> New module</button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} /> Modules</h2>
        {(mods || []).length === 0 && <div className="card p-8 text-center text-slate-400 text-sm">No modules yet. Click &ldquo;New module&rdquo; to create one.</div>}
        {(mods || []).map((m: any) => (
          <div key={m.id} className={`card p-5 ${m.status === 'archived' ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-700 grid place-items-center"><FileText size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><h3 className="font-bold text-slate-800">{m.title}</h3><Badge tone="slate">{m.category}</Badge>{m.status === 'archived' && <Badge tone="amber">Archived</Badge>}</div>
                <p className="text-xs text-slate-400 mt-0.5">{m.videoCount} videos · {m.questionCount} questions · Pass &ge; {m.passThreshold}%</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={() => setVFor(m)} className="btn-ghost !py-1.5 text-xs"><Film size={14} /> Add video</button>
                <button onClick={() => setQFor(m)} className="btn-ghost !py-1.5 text-xs"><HelpCircle size={14} /> Add question</button>
                <button onClick={() => setManageMod(m)} className="btn-ghost !py-1.5 text-xs"><ListChecks size={14} /> Manage</button>
                <button onClick={() => setAFor(m)} className="btn-ghost !py-1.5 text-xs"><CalendarPlus size={14} /> Assign</button>
                <button onClick={() => setEditMod(m)} className="btn-ghost !py-1.5 text-xs"><Settings2 size={14} /> Settings</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} /> Users</h2>
        <div className="card overflow-hidden">
          {(users || []).length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">Only your admin account exists. Click &ldquo;New user&rdquo; to add learners and managers.</div> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Department</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody>
                {(users || []).map((u: any) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold text-slate-800">{u.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-1.5"><Badge tone={ROLE_TONE[u.role] || 'slate'}>{u.role}</Badge>{u.status === 'inactive' && <Badge tone="red">inactive</Badge>}</div></td>
                    <td className="px-5 py-3 text-slate-500">{u.department || '—'}</td>
                    <td className="px-5 py-3"><div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)} className="btn-ghost !py-1.5 !px-2 text-xs" title="Edit user"><Pencil size={14} /></button>
                      <button onClick={() => setPwFor(u)} className="btn-ghost !py-1.5 !px-2 text-xs" title="Set password"><KeyRound size={14} /></button>
                      <UserStatusButton user={u} onChanged={refreshUsers} />
                      <UserDeleteButton user={u} onChanged={refreshUsers} />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showModule && <ModuleModal onClose={() => setShowModule(false)} onSaved={() => { setShowModule(false); refreshModules(); }} />}
      {showUser && <UserModal users={users || []} onClose={() => setShowUser(false)} onSaved={() => { setShowUser(false); refreshUsers(); }} />}
      {qFor && <QuestionModal module={qFor} onClose={() => setQFor(null)} onSaved={() => { setQFor(null); refreshModules(); }} />}
      {vFor && <VideoModal module={vFor} onClose={() => setVFor(null)} onSaved={() => { setVFor(null); refreshModules(); }} />}
      {aFor && <AssignModal module={aFor} users={(users || []).filter((u: any) => u.role === 'learner' || u.role === 'manager')} onClose={() => setAFor(null)} onSaved={() => setAFor(null)} />}
      {pwFor && <PasswordModal user={pwFor} onClose={() => setPwFor(null)} onSaved={() => setPwFor(null)} />}
      {editMod && <ModuleSettingsModal module={editMod} onClose={() => setEditMod(null)} onSaved={() => { setEditMod(null); refreshModules(); }} />}
      {manageMod && <ManageContentModal module={manageMod} onClose={() => setManageMod(null)} onChanged={refreshModules} />}
      {editUser && <UserEditModal user={editUser} users={users || []} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); refreshUsers(); }} />}
    </div>
  );
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

function ModuleModal({ onClose, onSaved }: any) {
  const [f, setF] = useState({ title: '', description: '', category: 'Compliance', passThreshold: 70 });
  const m = useMutation({ mutationFn: () => api.post('/modules', { ...f, isMandatory: true }), onSuccess: onSaved });
  return (
    <Modal title="New training module" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label">Description</label><textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Category</label><input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          <div><label className="label">Passing score %</label><input className="input" type="number" value={f.passThreshold} onChange={(e) => setF({ ...f, passThreshold: +e.target.value })} /></div>
        </div>
        {m.isError && <p className="text-sm text-red-600">Could not save. Check fields.</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !f.title} className="btn-primary w-full">Create module</button>
      </div>
    </Modal>
  );
}

function UserModal({ onClose, onSaved, users }: any) {
  const [f, setF] = useState({ fullName: '', email: '', role: 'learner', password: '', department: '', managerId: '' });
  const managers = (users || []).filter((u: any) => u.role === 'manager');
  const m = useMutation({
    mutationFn: () => api.post('/users', {
      fullName: f.fullName, email: f.email, role: f.role, password: f.password,
      department: f.department || undefined, managerId: f.role === 'learner' && f.managerId ? f.managerId : undefined,
    }),
    onSuccess: onSaved,
  });
  return (
    <Modal title="New user" onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Full name</label><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="learner">Learner</option><option value="manager">Manager</option><option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Temporary password</label><input className="input" type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="min 8 chars" /></div>
          <div><label className="label">Department</label><input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
        </div>
        {f.role === 'learner' && managers.length > 0 && (
          <div><label className="label">Manager (optional)</label>
            <select className="input" value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })}>
              <option value="">— none —</option>
              {managers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        )}
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not create user.'}</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !f.fullName || !f.email || f.password.length < 8} className="btn-primary w-full">Create user</button>
      </div>
    </Modal>
  );
}

function PasswordModal({ user, onClose, onSaved }: any) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const m = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}/password`, { password: pw }),
    onSuccess: () => { setDone(true); setTimeout(onSaved, 800); },
  });
  const tooShort = pw.length < 8;
  const mismatch = confirm.length > 0 && pw !== confirm;
  return (
    <Modal title={`Set password \u00b7 ${user.fullName}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Set a new password for <b className="text-slate-700">{user.email}</b>. They can sign in with it immediately.</p>
        <div><label className="label">New password</label><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" /></div>
        <div><label className="label">Confirm password</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {mismatch && <p className="text-sm text-red-600">Passwords do not match.</p>}
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not update password.'}</p>}
        {done ? (
          <p className="text-sm text-emerald-600 flex items-center gap-1"><Check size={15} /> Password updated.</p>
        ) : (
          <button onClick={() => m.mutate()} disabled={m.isPending || tooShort || mismatch || !confirm} className="btn-primary w-full"><KeyRound size={16} /> Update password</button>
        )}
      </div>
    </Modal>
  );
}

function VideoModal({ module, onClose, onSaved }: any) {
  const [f, setF] = useState({ title: '', sourceUrl: '', durationSeconds: 60 });
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const yt = isYouTube(f.sourceUrl);

  // When a YouTube link is pasted, fetch the real duration automatically so the
  // admin really can just paste the link. Debounced to avoid probing on every keystroke.
  useEffect(() => {
    if (!yt) { setDetectMsg(''); return; }
    let alive = true;
    setDetecting(true); setDetectMsg('');
    const url = f.sourceUrl;
    const t = setTimeout(() => {
      fetchYouTubeDuration(parseIdSafe(url))
        .then((secs) => { if (!alive || f.sourceUrl !== url) return; setF((s) => ({ ...s, durationSeconds: secs })); setDetectMsg(`Detected length: ${fmtDur(secs)}`); })
        .catch(() => { if (alive) setDetectMsg("Couldn't read length automatically — please enter it below."); })
        .finally(() => { if (alive) setDetecting(false); });
    }, 600);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.sourceUrl]);

  const m = useMutation({
    mutationFn: () => api.post(`/modules/${module.id}/videos`, { title: f.title, sourceUrl: f.sourceUrl.trim(), durationSeconds: Number(f.durationSeconds) }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={`Add video · ${module.title}`} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Video title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label">Video URL</label>
          <input className="input" placeholder="https://www.youtube.com/watch?v=…  or  https://…/video.mp4" value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} />
          {yt ? (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><Youtube size={13} /> YouTube link detected — it plays in the secure player with skipping disabled. Only the link is stored, not the video.</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Paste a YouTube link, or a direct video file (MP4 / HLS .m3u8). Only the link is stored in the database.</p>
          )}
        </div>
        <div><label className="label">Duration (seconds)</label>
          <div className="relative">
            <input className="input" type="number" value={f.durationSeconds} onChange={(e) => setF({ ...f, durationSeconds: +e.target.value })} />
            {detecting && <Loader2 size={16} className="animate-spin text-brand-500 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">{detectMsg || 'Used for the 100%-watched completion gate.'}</p>
        </div>
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not add video (check the URL is valid).'}</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !f.title || !f.sourceUrl || f.durationSeconds < 1} className="btn-primary w-full">Add video</button>
      </div>
    </Modal>
  );
}

function parseIdSafe(url: string): string {
  const m = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}
function fmtDur(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}m ${sec}s`; }

function AssignModal({ module, users, onClose, onSaved }: any) {
  const [mode, setMode] = useState('person');
  const [userId, setUserId] = useState('');
  const [department, setDepartment] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [msg, setMsg] = useState('');
  const depts: string[] = Array.from(new Set((users || []).map((u: any) => u.department).filter(Boolean)));
  const m = useMutation({
    mutationFn: () => {
      if (mode === 'person') return api.post('/assignments', { userId, moduleId: module.id, dueAt: dueAt || undefined });
      const body: any = { moduleId: module.id, dueAt: dueAt || undefined };
      if (mode === 'all-learners') body.role = 'learner';
      else if (mode === 'all-managers') body.role = 'manager';
      else if (mode === 'department') body.department = department;
      return api.post('/assignments/bulk', body);
    },
    onSuccess: (r: any) => { const n = r?.data?.data?.assigned; setMsg(mode === 'person' ? 'Assigned \u2713' : `Assigned to ${n} ${n === 1 ? 'person' : 'people'} \u2713`); setTimeout(onSaved, 1000); },
  });
  const disabled = m.isPending || (mode === 'person' && !userId) || (mode === 'department' && !department);
  return (
    <Modal title={`Assign \u00b7 ${module.title}`} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Assign to</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="person">A specific person</option>
            <option value="all-learners">All learners</option>
            <option value="all-managers">All managers</option>
            <option value="department">Everyone in a department</option>
          </select>
        </div>
        {mode === 'person' && (
          <div><label className="label">Person</label>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">— select a person —</option>
              {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
            </select>
          </div>
        )}
        {mode === 'department' && (
          <div><label className="label">Department</label>
            <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">— select a department —</option>
              {depts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {depts.length === 0 && <p className="text-xs text-slate-400 mt-1">No departments set on users yet.</p>}
          </div>
        )}
        <div><label className="label">Due date (optional)</label><input className="input" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not assign.'}</p>}
        <button onClick={() => m.mutate()} disabled={disabled} className="btn-primary w-full">Assign training</button>
      </div>
    </Modal>
  );
}

function UserStatusButton({ user, onChanged }: any) {
  const active = user.status !== 'inactive';
  const m = useMutation({ mutationFn: () => api.patch(`/users/${user.id}`, { status: active ? 'inactive' : 'active' }), onSuccess: onChanged, onError: (e: any) => alert(e?.response?.data?.error || 'Could not change status.') });
  return <button onClick={() => m.mutate()} disabled={m.isPending} title={active ? 'Deactivate' : 'Activate'} className={`btn-ghost !py-1.5 !px-2 text-xs ${active ? 'text-amber-600' : 'text-emerald-600'}`}><Power size={14} /></button>;
}

function UserDeleteButton({ user, onChanged }: any) {
  const m = useMutation({ mutationFn: () => api.delete(`/users/${user.id}`), onSuccess: onChanged, onError: (e: any) => alert(e?.response?.data?.error || 'Could not delete user.') });
  return <button onClick={() => { if (confirm(`Delete ${user.fullName}? This cannot be undone. (Tip: deactivate instead if they have records.)`)) m.mutate(); }} disabled={m.isPending} title="Delete user" className="btn-ghost !py-1.5 !px-2 text-xs text-red-600"><Trash2 size={14} /></button>;
}

function ModuleSettingsModal({ module, onClose, onSaved }: any) {
  const [f, setF] = useState({ title: module.title, description: module.description || '', category: module.category || 'Compliance', passThreshold: module.passThreshold ?? 70, validityDays: module.validityDays ?? '', status: module.status || 'published' });
  const [as, setAs] = useState<any>(null);
  useEffect(() => { (async () => { try { const full = (await api.get(`/modules/${module.id}`)).data.data; const a = full.assessment; setAs({ id: a.id, maxAttempts: a.maxAttempts ?? 3, timeLimitMin: a.timeLimitSeconds ? Math.round(a.timeLimitSeconds / 60) : 0, shuffleQuestions: !!a.shuffleQuestions, showAnswers: a.showAnswers !== false }); } catch {} })(); }, [module.id]);
  const m = useMutation({
    mutationFn: async () => {
      await api.patch(`/modules/${module.id}`, { title: f.title, description: f.description, category: f.category, passThreshold: Number(f.passThreshold), validityDays: f.validityDays === '' ? null : Number(f.validityDays), status: f.status });
      if (as) await api.patch(`/assessments/${as.id}`, { maxAttempts: Number(as.maxAttempts), timeLimitSeconds: as.timeLimitMin ? Number(as.timeLimitMin) * 60 : 0, shuffleQuestions: as.shuffleQuestions, showAnswers: as.showAnswers });
    },
    onSuccess: onSaved,
  });
  return (
    <Modal title={`Module settings \u00b7 ${module.title}`} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Title</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label">Description</label><textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Category</label><input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          <div><label className="label">Passing score %</label><input className="input" type="number" value={f.passThreshold} onChange={(e) => setF({ ...f, passThreshold: +e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Recertify after (days)</label><input className="input" type="number" placeholder="never" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: e.target.value === '' ? '' : +e.target.value } as any)} /><p className="text-[11px] text-slate-400 mt-1">Blank = no expiry.</p></div>
          <div><label className="label">Status</label><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></div>
        </div>
        {as && (
          <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assessment</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Max attempts</label><input className="input" type="number" value={as.maxAttempts} onChange={(e) => setAs({ ...as, maxAttempts: +e.target.value })} /></div>
              <div><label className="label">Time limit (min)</label><input className="input" type="number" placeholder="0 = none" value={as.timeLimitMin} onChange={(e) => setAs({ ...as, timeLimitMin: +e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={as.shuffleQuestions} onChange={(e) => setAs({ ...as, shuffleQuestions: e.target.checked })} /> Shuffle question &amp; option order</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={as.showAnswers} onChange={(e) => setAs({ ...as, showAnswers: e.target.checked })} /> Show correct answers after submit</label>
          </div>
        )}
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not save settings.'}</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !f.title} className="btn-primary w-full">Save settings</button>
      </div>
    </Modal>
  );
}

function ManageContentModal({ module, onClose, onChanged }: any) {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['manage', module.id],
    queryFn: async () => {
      const full = (await api.get(`/modules/${module.id}`)).data.data;
      const qs = (await api.get(`/assessments/${full.assessment.id}/questions`)).data.data.questions;
      return { videos: full.videos || [], questions: qs || [] };
    },
  });
  const delVideo = async (id: string) => { if (!confirm('Delete this video?')) return; await api.delete(`/videos/${id}`); await refetch(); onChanged(); };
  const delQ = async (id: string) => { if (!confirm('Delete this question?')) return; await api.delete(`/questions/${id}`); await refetch(); onChanged(); };
  return (
    <Modal title={`Manage content \u00b7 ${module.title}`} onClose={onClose}>
      {isLoading ? <div className="py-6 grid place-items-center"><Loader2 className="animate-spin text-brand-500" /></div> : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Videos ({data?.videos.length || 0})</p>
            <div className="space-y-2">
              {(data?.videos || []).map((v: any) => (
                <div key={v.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-3 py-2">
                  <Film size={15} className="text-slate-400" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-800 truncate">{v.title}</div><div className="text-[11px] text-slate-400 truncate">{v.sourceUrl}</div></div>
                  <button onClick={() => delVideo(v.id)} className="text-red-600 hover:bg-red-50 rounded-md p-1.5" title="Delete video"><Trash2 size={15} /></button>
                </div>
              ))}
              {(data?.videos || []).length === 0 && <p className="text-sm text-slate-400">No videos.</p>}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Questions ({data?.questions.length || 0})</p>
            <div className="space-y-2">
              {(data?.questions || []).map((q: any) => (
                <div key={q.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200 px-3 py-2">
                  <Badge tone="slate">{TYPE_LABEL[q.type] || q.type}</Badge>
                  <div className="flex-1 min-w-0 text-sm text-slate-700 truncate">{q.prompt}</div>
                  <button onClick={() => delQ(q.id)} className="text-red-600 hover:bg-red-50 rounded-md p-1.5" title="Delete question"><Trash2 size={15} /></button>
                </div>
              ))}
              {(data?.questions || []).length === 0 && <p className="text-sm text-slate-400">No questions.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function UserEditModal({ user, users, onClose, onSaved }: any) {
  const [f, setF] = useState({ fullName: user.fullName, role: user.role, department: user.department || '', managerId: user.managerId || '' });
  const managers = (users || []).filter((u: any) => u.role === 'manager');
  const m = useMutation({
    mutationFn: () => api.patch(`/users/${user.id}`, { fullName: f.fullName, role: f.role, department: f.department || null, managerId: f.managerId || null }),
    onSuccess: onSaved,
  });
  return (
    <Modal title={`Edit user \u00b7 ${user.email}`} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="label">Full name</label><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Role</label><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="learner">Learner</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
          <div><label className="label">Department</label><input className="input" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} /></div>
        </div>
        <div><label className="label">Manager</label><select className="input" value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })}><option value="">— none —</option>{managers.map((mgr: any) => <option key={mgr.id} value={mgr.id}>{mgr.fullName}</option>)}</select></div>
        {m.isError && <p className="text-sm text-red-600">{(m.error as any)?.response?.data?.error || 'Could not save.'}</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !f.fullName} className="btn-primary w-full">Save changes</button>
      </div>
    </Modal>
  );
}

function QuestionModal({ module, onClose, onSaved }: any) {
  const [type, setType] = useState('mcq');
  const [prompt, setPrompt] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState([{ id: 'a', label: '', isCorrect: false }, { id: 'b', label: '', isCorrect: false }]);
  const [shortVal, setShortVal] = useState('');
  const { enabled: aiEnabled } = useAiStatus();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<any[]>([]);
  const [aiError, setAiError] = useState('');

  const draftWithAi = async () => {
    setAiBusy(true); setAiError('');
    try {
      const aid = (await api.get(`/modules/${module.id}`)).data.data.assessment.id;
      setAiDrafts(await generateQuestions(aid, 5));
    } catch (e: any) {
      setAiError(e?.response?.data?.error || 'Could not generate drafts.');
    } finally { setAiBusy(false); }
  };

  const useDraft = (d: any) => {
    setType(d.type); setPrompt(d.prompt); setExplanation(d.explanation || '');
    if (d.type === 'mcq' || d.type === 'multi_select') setOptions(d.options || []);
    else if (d.type === 'true_false') setShortVal(d.options?.find((o: any) => o.isCorrect)?.id || 'true');
    else if (d.type === 'short_answer') setShortVal(d.answerKey?.value || '');
    setAiDrafts(aiDrafts.filter((x) => x !== d));
  };

  const m = useMutation({
    mutationFn: async () => {
      const aid = (await api.get(`/modules/${module.id}`)).data.data.assessment.id;
      const body: any = { type, prompt, explanation, points: 1 };
      if (type === 'short_answer') body.answerKey = { matchType: 'keyword', value: shortVal, caseSensitive: false };
      else if (type === 'true_false') body.options = [{ id: 'true', label: 'True', isCorrect: shortVal === 'true' }, { id: 'false', label: 'False', isCorrect: shortVal === 'false' }];
      else body.options = options;
      return api.post(`/assessments/${aid}/questions`, body);
    }, onSuccess: onSaved,
  });

  const setOpt = (i: number, patch: any) => setOptions(options.map((o, j) => j === i ? { ...o, ...patch } : o));

  return (
    <Modal title={`Add question · ${module.title}`} onClose={onClose}>
      <div className="space-y-3">
        {aiEnabled && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-6 w-6 rounded-md grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Sparkles size={12} /></span>
                AI question drafts
              </div>
              <button onClick={draftWithAi} disabled={aiBusy} className="btn-ghost !py-1.5 !px-3 text-xs">
                {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiDrafts.length ? 'Regenerate' : 'Draft 5 questions'}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-600 mt-2">{aiError}</p>}
            {aiDrafts.length > 0 && (
              <div className="mt-2.5 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {aiDrafts.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-white/10 px-2.5 py-2">
                    <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200 shrink-0 !text-[10px]">{TYPE_LABEL[d.type]}</span>
                    <span className="flex-1 text-xs text-slate-600 leading-snug">{d.prompt}</span>
                    <button onClick={() => useDraft(d)} className="text-xs text-brand-600 font-semibold hover:underline shrink-0">Use</button>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 pt-0.5">Click "Use" to load a draft into the form below — review before saving.</p>
              </div>
            )}
          </div>
        )}
        <div><label className="label">Question type</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setType(k)} className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${type === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>{v}</button>
            ))}
          </div>
        </div>
        <div><label className="label">Prompt</label><textarea className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></div>

        {(type === 'mcq' || type === 'multi_select') && (
          <div>
            <label className="label">Options {type === 'mcq' ? '(select one correct)' : '(select all correct)'}</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => setOpt(i, { isCorrect: !o.isCorrect })} className={`h-7 w-7 shrink-0 rounded-md grid place-items-center ${o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Check size={15} /></button>
                  <input className="input !py-1.5" placeholder={`Option ${o.id.toUpperCase()}`} value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} />
                  {options.length > 2 && <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>}
                </div>
              ))}
              <button onClick={() => setOptions([...options, { id: String.fromCharCode(97 + options.length), label: '', isCorrect: false }])} className="text-sm text-brand-600 font-semibold">+ Add option</button>
            </div>
          </div>
        )}
        {type === 'true_false' && (
          <div><label className="label">Correct answer</label>
            <div className="flex gap-2">{['true', 'false'].map((v) => <button key={v} onClick={() => setShortVal(v)} className={`flex-1 rounded-lg border-2 py-2 font-medium capitalize ${shortVal === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>{v}</button>)}</div>
          </div>
        )}
        {type === 'short_answer' && (
          <div><label className="label">Accepted keyword</label><input className="input" placeholder="e.g. phishing" value={shortVal} onChange={(e) => setShortVal(e.target.value)} /><p className="text-xs text-slate-400 mt-1">Answers containing this keyword (case-insensitive) are marked correct.</p></div>
        )}
        <div><label className="label">Explanation (shown after submit)</label><input className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} /></div>
        {m.isError && <p className="text-sm text-red-600">Could not save question.</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending || !prompt} className="btn-primary w-full">Save question</button>
      </div>
    </Modal>
  );
}
