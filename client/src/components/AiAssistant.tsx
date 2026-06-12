import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Loader2, Bot } from 'lucide-react';
import { useAiStatus, askModuleAssistant, AiChatMessage } from '../lib/ai';

/**
 * Floating learning assistant, grounded in the current training module.
 * Renders nothing if AI is not configured on the server.
 */
export default function AiAssistant({ moduleId, moduleTitle }: { moduleId: string; moduleTitle: string }) {
  const { enabled } = useAiStatus();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy, open]);

  if (!enabled) return null;

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(''); setError('');
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const answer = await askModuleAssistant(moduleId, q, history);
      setMsgs((m) => [...m, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'The assistant is unavailable right now.');
    } finally { setBusy(false); }
  };

  const SUGGESTIONS = ['Summarize what this module covers', 'Why can’t I skip ahead in videos?', 'How should I prepare for the assessment?'];

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open learning assistant"
          className="fixed bottom-6 right-6 z-40 h-13 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-glow-lg animate-pulse-glow transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <Sparkles size={17} /> Ask AI
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(26rem,calc(100vw-2rem))] card shadow-soft flex flex-col overflow-hidden animate-fade-up" style={{ height: 'min(34rem, calc(100vh - 6rem))' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
            <div className="h-8 w-8 rounded-lg grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Bot size={16} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900">Learning Assistant</div>
              <div className="text-[11px] text-slate-400 truncate">{moduleTitle}</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors" aria-label="Close assistant"><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Hi! I can explain topics from this module, help you prepare for the assessment, or answer questions about how training works.</p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="w-full text-left text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-600 transition hover:border-brand-400/50 hover:text-slate-800">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto text-white rounded-br-md' : 'bg-white/5 border border-white/10 text-slate-700 rounded-bl-md'}`}
                style={m.role === 'user' ? { background: 'linear-gradient(135deg,#6366f1,#7c5cf6)' } : undefined}>
                {m.content}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-slate-400 text-xs px-1"><Loader2 size={14} className="animate-spin" /> Thinking…</div>}
            {error && <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-white/10 flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this module…"
              className="input !py-2.5 flex-1" aria-label="Question for the assistant" />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary !px-3.5 !py-2.5 shrink-0" aria-label="Send"><Send size={16} /></button>
          </form>
          <p className="px-4 pb-2.5 text-[10px] text-slate-400">AI can make mistakes. It will never reveal assessment answers.</p>
        </div>
      )}
    </>
  );
}
