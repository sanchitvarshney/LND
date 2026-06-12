import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Spinner } from '../components/ui/Primitives';
import { api } from '../lib/api';
import { CheckCircle2, XCircle, Award, RotateCcw, Check, X } from 'lucide-react';

export default function Result() {
  const { id } = useParams();
  const state = (useLocation().state || {}) as any;
  const { data, isLoading } = useQuery({ queryKey: ['attempt', id], queryFn: async () => (await api.get(`/attempts/${id}`)).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const passed = data.passed;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Outcome — a deliberate moment, not just a message */}
      <div className={`card p-10 text-center overflow-hidden relative animate-fade-up ${passed ? 'ring-1 ring-emerald-200' : ''}`}>
        {passed && <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg,#10b981,#04b0a8,#0ea5e9)' }} />}
        <div className="relative mx-auto h-20 w-20">
          {passed && <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ripple" />}
          {passed && <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ripple" style={{ animationDelay: '.5s' }} />}
          <div className={`relative h-20 w-20 rounded-full grid place-items-center animate-check-pop ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
            {passed ? <CheckCircle2 size={42} strokeWidth={2.2} /> : <XCircle size={42} strokeWidth={2.2} />}
          </div>
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mt-5">{passed ? 'Congratulations — you passed!' : 'Not quite there yet'}</h1>
        <p className="text-slate-500 mt-1.5">
          You scored <b className={passed ? 'text-emerald-600' : 'text-slate-800'}>{data.score}%</b>
          {passed ? '. Your certificate has been issued.' : ` — you need ${state.passingScore ?? ''}% to pass. Review the material and try again.`}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          {passed && state.certificateId && <Link to={`/certificates/${state.certificateId}`} className="btn-primary !px-5"><Award size={17} /> View certificate</Link>}
          {!passed && <Link to={`/modules/${state.moduleId || ''}`} className="btn-primary"><RotateCcw size={16} /> Retry training</Link>}
          <Link to="/" className="btn-ghost">Back to dashboard</Link>
        </div>
      </div>

      <div className="card p-6 animate-fade-up" style={{ animationDelay: '.1s' }}>
        <h2 className="font-display font-bold text-slate-800 mb-4">Answer review</h2>
        <div className="space-y-4">
          {data.questions.map((q: any, i: number) => (
            <div key={q.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 h-5 w-5 rounded-full grid place-items-center text-white ${q.isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>{q.isCorrect ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{i + 1}. {q.prompt}</p>
                  {q.options?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((o: any) => {
                        const chosen = (q.yourResponse || []).includes(o.id);
                        const correct = (q.correctOptions || []).includes(o.id);
                        return (
                          <div key={o.id} className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-2 ${correct ? 'bg-emerald-50 text-emerald-800' : chosen ? 'bg-red-50 text-red-700' : 'text-slate-500'}`}>
                            {correct ? <Check size={12} /> : chosen ? <X size={12} /> : <span className="w-3" />} {o.label}
                            {chosen && <span className="ml-auto font-semibold">your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'short_answer' && <p className="text-xs text-slate-500 mt-1">Your answer: <span className="font-medium text-slate-700">{q.yourResponse || '—'}</span></p>}
                  {q.explanation && <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-md px-2.5 py-1.5"><b>Why:</b> {q.explanation}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
