import { useAuth } from '../lib/auth';
import { PlayCircle, FileQuestion, Award, ShieldCheck, Mail, ChevronDown, LifeBuoy, Lock, RefreshCw } from 'lucide-react';

const STEPS = [
  { icon: PlayCircle, title: 'Watch your training', text: 'Open an assigned module and watch every video. Forward-skipping is disabled — progress is verified on the server as you watch.' },
  { icon: FileQuestion, title: 'Take the assessment', text: 'Once all videos are complete, the assessment unlocks. Answer every question and review before submitting.' },
  { icon: Award, title: 'Earn your certificate', text: 'Pass the assessment and your certificate is issued instantly, with a public verification link and QR code.' },
  { icon: ShieldCheck, title: 'Stay compliant', text: 'Everything is recorded in an audit-ready log. Managers can track team compliance in real time.' },
];

const FAQ = [
  { q: 'Why can\u2019t I skip ahead in videos?', a: 'This is a compliance platform — completion must be provable. The player only advances your verified progress through continuous playback. You can always rewind and rewatch sections you\u2019ve already covered.' },
  { q: 'I closed the browser mid-video. Did I lose progress?', a: 'No. Your watch progress is saved to the server every few seconds. When you return, the video resumes from your verified position.' },
  { q: 'What happens if I fail an assessment?', a: 'Nothing bad — you can review the material and retake it. Your result page shows exactly which topics to revisit, and the AI review plan can point you to the right videos.' },
  { q: 'How do retakes work?', a: 'Open the module and start the assessment again. Your best score counts; each attempt is numbered and recorded.' },
  { q: 'How do I share or verify a certificate?', a: 'Open the certificate and use Print / Save PDF. Every certificate carries a QR code and a public verification link that anyone can use to confirm authenticity — no login needed.' },
  { q: 'Why is a training marked overdue?', a: 'Your L&D team set a due date for the assignment and it has passed. Complete the module as soon as possible — your manager can see overdue items.' },
  { q: 'Can I change my email address?', a: 'Email addresses are managed by your administrator. You can update your name, department and password from My Profile.' },
];

export default function Help() {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="card relative overflow-hidden p-6 lg:p-8">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle,#22d3ee,transparent 70%)' }} />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl grid place-items-center text-white shadow-glow shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}><LifeBuoy size={24} /></div>
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900">Help &amp; Support</h1>
            <p className="text-slate-500 text-sm mt-0.5">How the portal works, answers to common questions, and how to reach the L&amp;D team.</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="font-display font-bold text-slate-800 mb-3">How training works</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card p-5 animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200 grid place-items-center shrink-0"><s.icon size={17} /></span>
                <span className="text-xs font-bold text-slate-400">STEP {i + 1}</span>
              </div>
              <h3 className="font-semibold text-slate-800">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-slate-800 mb-3">Frequently asked questions</h2>
        <div className="space-y-2.5">
          {FAQ.map((f) => (
            <details key={f.q} className="card group">
              <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-slate-800">{f.q}</span>
                <ChevronDown size={16} className="text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0" />
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1.5"><Mail size={16} className="text-brand-600" /> Contact L&amp;D</div>
          <p className="text-sm text-slate-500">Stuck on something not covered here? Reach out and we’ll help.</p>
          <a href={`mailto:ld-support@mscorpres.in?subject=L%26D%20Portal%20support%20request%20from%20${encodeURIComponent(user?.fullName || '')}`} className="btn-ghost mt-4 !py-2 text-xs inline-flex"><Mail size={14} /> Email support</a>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1.5"><Lock size={16} className="text-brand-600" /> Account &amp; password</div>
          <p className="text-sm text-slate-500">Update your name, department or password anytime from your profile.</p>
          <a href="/profile" className="btn-ghost mt-4 !py-2 text-xs inline-flex"><RefreshCw size={14} /> Go to My Profile</a>
        </div>
      </section>
    </div>
  );
}
