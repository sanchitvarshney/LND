import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';
import { QuestionRenderer, AnswerValue, TYPE_LABEL } from '../components/QuestionRenderer';
import { ArrowLeft, ArrowRight, Send, Loader2, AlertCircle } from 'lucide-react';

export default function Assessment() {
  const { id } = useParams(); // module id
  const nav = useNavigate();
  const { data: mod } = useQuery({ queryKey: ['module', id], queryFn: async () => (await api.get(`/modules/${id}`)).data.data });
  const assessmentId = mod?.assessment?.id;
  const { data, isLoading, error } = useQuery({
    enabled: !!assessmentId,
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const q = (await api.get(`/assessments/${assessmentId}/questions`)).data.data;
      const att = (await api.post(`/assessments/${assessmentId}/attempts`)).data.data;
      return { ...q, attemptId: att.attemptId, attemptNo: att.attemptNo };
    },
    retry: false,
  });
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [cur, setCur] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => { if (data?.timeLimitSeconds && remaining === null) setRemaining(data.timeLimitSeconds); }, [data, remaining]);
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) { submitRef.current(); return; }
    const t = setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  if (!mod || isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  if (error) {
    const msg = (error as any)?.response?.data?.error || 'Unable to start assessment.';
    return (
      <div className="max-w-lg mx-auto card p-8 text-center">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={28} />
        <h2 className="font-bold text-slate-800">Assessment unavailable</h2>
        <p className="text-slate-500 text-sm mt-1">{msg}</p>
        <Link to={`/modules/${id}`} className="btn-primary mt-5 inline-flex">Back to module</Link>
      </div>
    );
  }

  const qs = data.questions;
  const q = qs[cur];
  const answered = Object.keys(answers).filter((k) => { const v = answers[k]; return Array.isArray(v) ? v.length : (v as string)?.trim?.(); }).length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = { answers: qs.map((x: any) => ({ questionId: x.id, response: answers[x.id] ?? (x.type === 'short_answer' ? '' : []) })) };
      const res = (await api.post(`/attempts/${data.attemptId}/submit`, payload)).data.data;
      nav(`/attempts/${data.attemptId}/result`, { state: res });
    } catch (e) { setSubmitting(false); }
  };
  submitRef.current = submit;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link to={`/modules/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> {mod.title}</Link>
        <div className="flex items-center gap-2">
          {remaining !== null && <span className={`chip font-mono ${remaining <= 30 ? 'bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>⏱ {fmtTime(remaining)}</span>}
          <span className="text-sm text-slate-400">Attempt #{data.attemptNo} · Pass ≥ {data.passingScore}%</span>
        </div>
      </div>

      {/* progress bar */}
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((review ? qs.length : cur + 1) / qs.length) * 100}%` }} /></div>

      {!review ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">{TYPE_LABEL[q.type]}</span>
            <span className="text-sm text-slate-400">Question {cur + 1} of {qs.length}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-5">{q.prompt}</h2>
          <QuestionRenderer q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
          <div className="flex items-center justify-between mt-6">
            <button disabled={cur === 0} onClick={() => setCur(cur - 1)} className="btn-ghost"><ArrowLeft size={16} /> Previous</button>
            {cur < qs.length - 1 ? (
              <button onClick={() => setCur(cur + 1)} className="btn-primary">Next <ArrowRight size={16} /></button>
            ) : (
              <button onClick={() => setReview(true)} className="btn-primary">Review &amp; submit <ArrowRight size={16} /></button>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Review your answers</h2>
          <p className="text-sm text-slate-500 mb-4">You answered {answered} of {qs.length} questions.</p>
          <ol className="space-y-2 mb-6">
            {qs.map((x: any, i: number) => {
              const v = answers[x.id]; const has = Array.isArray(v) ? v.length : (v as string)?.trim?.();
              return (
                <li key={x.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-400 w-5">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-600 truncate">{x.prompt}</span>
                  <span className={`chip ${has ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>{has ? 'Answered' : 'Skipped'}</span>
                  <button onClick={() => { setReview(false); setCur(i); }} className="text-xs text-brand-600 font-semibold hover:underline">Edit</button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between">
            <button onClick={() => setReview(false)} className="btn-ghost"><ArrowLeft size={16} /> Back to questions</button>
            <button onClick={submit} disabled={submitting} className="btn-success">{submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Submit assessment</button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtTime(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; }
