import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Badge, Spinner } from '../components/ui/Primitives';
import { TYPE_LABEL } from '../components/QuestionRenderer';
import { isYouTube } from '../lib/video';
import { fetchYouTubeDuration } from '../lib/youtubeApi';
import { Plus, FileText, HelpCircle, X, Check, Trash2, Film, UserPlus, Users, CalendarPlus, Youtube, Loader2, Sparkles } from 'lucide-react';
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
          <div key={m.id} className="card p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-700 grid place-items-center"><FileText size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">{m.title}</h3><Badge tone="slate">{m.category}</Badge></div>
                <p className="text-xs text-slate-400 mt-0.5">{m.videoCount} videos · {m.questionCount} questions · Pass &ge; {m.passThreshold}%</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setVFor(m)} className="btn-ghost !py-1.5 text-xs"><Film size={14} /> Add video</button>
                <button onClick={() => setQFor(m)} className="btn-ghost !py-1.5 text-xs"><HelpCircle size={14} /> Add question</button>
                <button onClick={() => setAFor(m)} className="btn-ghost !py-1.5 text-xs"><CalendarPlus size={14} /> Assign</button>
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
              <thead><tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Department</th></tr></thead>
              <tbody>
                {(users || []).map((u: any) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold text-slate-800">{u.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role] || 'slate'}>{u.role}</Badge></td>
                    <td className="px-5 py-3 text-slate-500">{u.department || '—'}</td>
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
  const [userId, setUserId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [done, setDone] = useState(false);
  const m = useMutation({
    mutationFn: () => api.post('/assignments', { userId, moduleId: module.id, dueAt: dueAt || undefined }),
    onSuccess: () => { setDone(true); setUserId(''); setTimeout(onSaved, 700); },
  });
  return (
    <Modal title={`Assign · ${module.title}`} onClose={onClose}>
      <div className="space-y-3">
        {users.length === 0 ? <p className="text-sm text-slate-500">Create a learner or manager first, then assign this module to them.</p> : (
          <>
            <div><label className="label">Assign to</label>
              <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">— select a person —</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}
              </select>
            </div>
            <div><label className="label">Due date (optional)</label><input className="input" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
            {done && <p className="text-sm text-emerald-600">Assigned ✓</p>}
            {m.isError && <p className="text-sm text-red-600">Could not assign.</p>}
            <button onClick={() => m.mutate()} disabled={m.isPending || !userId} className="btn-primary w-full">Assign training</button>
          </>
        )}
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
