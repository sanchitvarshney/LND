import { Check } from 'lucide-react';

export interface Question { id: string; type: string; prompt: string; points: number; options?: { id: string; label: string }[]; }
export type AnswerValue = string[] | string;

export function QuestionRenderer({ q, value, onChange }: { q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void }) {
  const arr = Array.isArray(value) ? value : value ? [value as string] : [];

  if (q.type === 'short_answer') {
    return (
      <textarea className="input min-h-[110px] resize-y" placeholder="Type your answer…"
        value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />
    );
  }

  const multi = q.type === 'multi_select';
  const toggle = (id: string) => {
    if (multi) onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    else onChange([id]);
  };

  return (
    <div className="space-y-2.5">
      {q.options?.map((o) => {
        const selected = arr.includes(o.id);
        return (
          <button key={o.id} type="button" onClick={() => toggle(o.id)}
            className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <span className={`shrink-0 grid place-items-center h-5 w-5 ${multi ? 'rounded-md' : 'rounded-full'} border-2 ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>
              {selected && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="text-sm font-medium text-slate-700">{o.label}</span>
          </button>
        );
      })}
      {multi && <p className="text-xs text-slate-400 pl-1">Select all that apply.</p>}
    </div>
  );
}

export const TYPE_LABEL: Record<string, string> = {
  mcq: 'Multiple Choice', multi_select: 'Multiple Select', true_false: 'True / False', short_answer: 'Short Answer',
};
