import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { ShieldCheck, ShieldX, GraduationCap } from 'lucide-react';
import Background3D from '../components/ui/Background3D';

export default function Verify() {
  const { hash } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['verify', hash], queryFn: async () => (await api.get(`/verify/${hash}`)).data, retry: false });

  return (
    <div className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <Background3D density={0.9} />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center mb-6"><img src="/brand/mscorpres-logo.svg" alt="MsCorpres Automation" className="h-10 w-auto" /></div>
        <div className="card p-8 text-center">
          {isLoading ? <Spinner /> : (error || !data?.valid) ? (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 text-red-600 grid place-items-center"><ShieldX size={32} /></div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-4">Certificate {data?.status || 'not found'}</h1>
              <p className="text-slate-500 text-sm mt-1">{data?.status === 'expired' ? 'This certificate has expired.' : data?.status === 'revoked' ? 'This certificate has been revoked.' : 'No matching certificate could be found.'}</p>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center shadow-glow-emerald"><ShieldCheck size={32} /></div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-4">Verified authentic</h1>
              <div className="mt-5 text-left space-y-2 text-sm">
                <Row k="Recipient" v={data.data.recipient} />
                <Row k="Training" v={data.data.module} />
                <Row k="Score" v={`${data.data.score}%`} />
                <Row k="Issued" v={fmtDate(data.data.issuedAt)} />
                {data.data.expiresAt && <Row k="Valid until" v={fmtDate(data.data.expiresAt)} />}
                <Row k="Serial" v={data.data.serialNo} mono />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-400">{k}</span><span className={`font-semibold text-slate-700 ${mono ? 'font-mono text-xs' : ''}`}>{v}</span></div>;
}
