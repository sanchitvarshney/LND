import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../lib/api';
import { Badge, Spinner } from '../components/ui/Primitives';
import { TYPE_LABEL } from '../components/QuestionRenderer';
import { Plus, FileText, HelpCircle, X, Check, Trash2 } from 'lucide-react';

export default function Admin() {
  const qc = useQueryClient();
  const { data: mods, isLoading } = useQuery({ queryKey: ['adminModules'], queryFn: async () => (await api.get('/modules')).data.data });
  const [showModule, setShowModule] = useState(false);
  const [qFor, setQFor] = useState<any>(null); // module to add question to

  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-slate-900">Manage Training</h1><p className="text-slate-500 text-sm mt-0.5">Create modules and author assessment questions.</p></div>
        <button onClick={() => setShowModule(true)} className="btn-primary"><Plus size={16} /> New module</button>
      </div>

      <div className="space-y-3">
        {(mods || []).map((m: any) => (
          <div key={m.id} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-700 grid place-items-center"><FileText size={20} /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">{m.title}</h3><Badge tone="slate">{m.category}</Badge></div>
                <p className="text-xs text-slate-400 mt-0.5">{m.videoCount} videos · {m.questionCount} questions · Pass ≥ {m.passThreshold}%</p>
              </div>
              <button onClick={() => setQFor(m)} className="btn-ghost !py-1.5 text-xs"><HelpCircle size={14} /> Add question</button>
            </div>
          </div>
        ))}
      </div>

      {showModule && <ModuleModal onClose={() => setShowModule(false)} onSaved={() => { setShowModule(false); qc.invalidateQueries({ queryKey: ['adminModules'] }); }} />}
      {qFor && <QuestionModal module={qFor} onClose={() => setQFor(null)} onSaved={() => { setQFor(null); qc.invalidateQueries({ queryKey: ['adminModules'] }); }} />}
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

function QuestionModal({ module, onClose, onSaved }: any) {
  const [type, setType] = useState('mcq');
  const [prompt, setPrompt] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState([{ id: 'a', label: '', isCorrect: false }, { id: 'b', label: '', isCorrect: false }]);
  const [shortVal, setShortVal] = useState('');

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
