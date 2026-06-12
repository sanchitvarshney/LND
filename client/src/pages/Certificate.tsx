import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui/Primitives';
import TiltCard from '../components/ui/TiltCard';
import { fmtDate } from '../lib/format';
import { Award, ArrowLeft, ShieldCheck, Printer } from 'lucide-react';

/**
 * The certificate itself uses explicit light colors (inline styles)
 * so it stays a printable "paper" document floating above the dark UI.
 */
export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['cert', id], queryFn: async () => (await api.get(`/certificates/${id}`)).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const verifyUrl = `${location.origin}/verify/${data.verificationHash}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-4 scene-3d">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/certificates" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> My certificates</Link>
        <button onClick={() => window.print()} className="btn-ghost"><Printer size={16} /> Print / Save PDF</button>
      </div>

      {/* Certificate — printable light "paper" on the dark stage */}
      <TiltCard max={3}>
        <div className="rounded-2xl p-10 relative overflow-hidden shadow-soft print:shadow-none"
          style={{ background: 'linear-gradient(150deg,#ffffff,#eef2ff 70%,#fdf4ff)', border: '4px double #c7d2fe' }}>
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full" style={{ background: 'rgba(99,102,241,.10)' }} />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full" style={{ background: 'rgba(34,211,238,.10)' }} />
          <div className="relative text-center">
            <img src="/brand/mscorpres-logo.svg" alt="MsCorpres Automation" className="mx-auto h-9 w-auto mb-6" />
            <div className="mx-auto h-14 w-14 rounded-xl grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#4f46e5,#06b6d4)' }}><Award size={28} /></div>
            <p className="mt-4 text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#4f46e5' }}>Certificate of Completion</p>
            <h1 className="mt-4 text-sm" style={{ color: '#64748b' }}>This certifies that</h1>
            <p className="text-3xl font-display font-bold mt-1" style={{ color: '#0f172a' }}>{data.user?.fullName || user?.fullName}</p>
            <p className="mt-3 text-sm" style={{ color: '#64748b' }}>has successfully completed</p>
            <p className="text-xl font-bold mt-1" style={{ color: '#4338ca' }}>{data.module.title}</p>
            <p className="mt-2 text-sm" style={{ color: '#64748b' }}>with a score of <b style={{ color: '#059669' }}>{data.score}%</b></p>

            <div className="mt-8 flex items-end justify-between">
              <div className="text-left">
                <div className="text-xs" style={{ color: '#94a3b8' }}>Issued</div>
                <div className="font-semibold" style={{ color: '#334155' }}>{fmtDate(data.issuedAt)}</div>
                {data.expiresAt && <><div className="text-xs mt-2" style={{ color: '#94a3b8' }}>Valid until</div><div className="font-semibold" style={{ color: '#334155' }}>{fmtDate(data.expiresAt)}</div></>}
              </div>
              <img src={qr} alt="Verification QR" className="rounded-lg p-1 shadow-sm" width={88} height={88} style={{ backgroundColor: '#ffffff' }} />
              <div className="text-right">
                <div className="text-xs" style={{ color: '#94a3b8' }}>Serial</div>
                <div className="font-mono text-xs font-semibold" style={{ color: '#334155' }}>{data.serialNo}</div>
                <div className="flex items-center gap-1 justify-end mt-2 text-xs font-semibold" style={{ color: '#059669' }}><ShieldCheck size={13} /> Verifiable</div>
              </div>
            </div>
          </div>
        </div>
      </TiltCard>
      <p className="text-center text-xs text-slate-400 print:hidden">Verify authenticity at <span className="font-mono">{verifyUrl}</span></p>
    </div>
  );
}
