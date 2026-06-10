import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { Award, Download, ArrowLeft, ShieldCheck, Printer } from 'lucide-react';

export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['cert', id], queryFn: async () => (await api.get(`/certificates/${id}`)).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;
  const verifyUrl = `${location.origin}/verify/${data.verificationHash}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/certificates" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> My certificates</Link>
        <button onClick={() => window.print()} className="btn-ghost"><Printer size={16} /> Print / Save PDF</button>
      </div>

      {/* Certificate */}
      <div className="card p-10 relative overflow-hidden bg-gradient-to-br from-white to-brand-50/40 border-4 border-double border-brand-200">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-100/50" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-brand-100/40" />
        <div className="relative text-center">
          <div className="mx-auto h-14 w-14 rounded-xl bg-brand-700 text-white grid place-items-center"><Award size={28} /></div>
          <p className="mt-4 text-xs font-bold tracking-[0.3em] text-brand-600 uppercase">Certificate of Completion</p>
          <h1 className="mt-4 text-sm text-slate-500">This certifies that</h1>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{data.user?.fullName || user?.fullName}</p>
          <p className="mt-3 text-sm text-slate-500">has successfully completed</p>
          <p className="text-xl font-bold text-brand-800 mt-1">{data.module.title}</p>
          <p className="mt-2 text-sm text-slate-500">with a score of <b className="text-emerald-600">{data.score}%</b></p>

          <div className="mt-8 flex items-end justify-between">
            <div className="text-left">
              <div className="text-xs text-slate-400">Issued</div>
              <div className="font-semibold text-slate-700">{fmtDate(data.issuedAt)}</div>
              {data.expiresAt && <><div className="text-xs text-slate-400 mt-2">Valid until</div><div className="font-semibold text-slate-700">{fmtDate(data.expiresAt)}</div></>}
            </div>
            <img src={qr} alt="Verification QR" className="rounded-lg bg-white p-1 shadow-sm" width={88} height={88} />
            <div className="text-right">
              <div className="text-xs text-slate-400">Serial</div>
              <div className="font-mono text-xs font-semibold text-slate-700">{data.serialNo}</div>
              <div className="flex items-center gap-1 justify-end mt-2 text-xs text-emerald-600 font-semibold"><ShieldCheck size={13} /> Verifiable</div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 print:hidden">Verify authenticity at <span className="font-mono">{verifyUrl}</span></p>
    </div>
  );
}
