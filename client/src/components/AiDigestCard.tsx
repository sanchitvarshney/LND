import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useAiStatus, getComplianceDigest } from '../lib/ai';

/** One-click AI compliance digest for managers and admins. */
export default function AiDigestCard() {
  const { enabled } = useAiStatus();
  const [digest, setDigest] = useState('');
  const [at, setAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!enabled) return null;

  const run = async () => {
    setBusy(true); setError('');
    try { const d = await getComplianceDigest(); setDigest(d.digest); setAt(d.generatedAt); }
    catch (e: any) { setError(e?.response?.data?.error || 'Could not generate the digest.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Sparkles size={14} /></span>
          AI compliance digest
        </h2>
        {digest && <button onClick={run} disabled={busy} className="btn-ghost !py-1.5 !px-3 text-xs"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Refresh</button>}
      </div>
      {!digest && !busy && (
        <>
          <p className="text-sm text-slate-500 mb-4">Summarize your team's training status — who needs attention, what's due, and the next best action.</p>
          <button onClick={run} className="btn-primary"><Sparkles size={15} /> Generate digest</button>
        </>
      )}
      {busy && !digest && <div className="flex items-center gap-2 text-slate-400 text-sm py-3"><Loader2 size={15} className="animate-spin" /> Analyzing team status…</div>}
      {digest && (
        <div className="mt-3">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{digest}</p>
          <p className="text-[11px] text-slate-400 mt-3">Generated {new Date(at).toLocaleString()} · AI-written, verify before acting</p>
        </div>
      )}
      {error && <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2 mt-3">{error}</div>}
    </div>
  );
}
