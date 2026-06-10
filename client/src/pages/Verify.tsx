import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { ShieldCheck, ShieldX, GraduationCap } from 'lucide-react';

export default function Verify() {
  const { hash } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['verify', hash], queryFn: async () => (await api.get(`/verify/${hash}`)).data, retry: false });

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6"><div className="h-9 w-9 rounded-lg bg-brand-700 text-white grid place-items-center"><GraduationCap size={20} /></div><span className="font-extrabold text-xl text-brand-900">LearnGuard</span></div>
        <div className="card p-8 text-center">
          {isLoading ? <Spinner /> : (error || !data?.valid) ? (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 text-red-600 grid place-items-center"><ShieldX size={32} /></div>
              <h1 className="text-xl font-extrabold text-slate-900 mt-4">Certificate {data?.status || 'not found'}</h1>
              <p className="text-slate-500 text-sm mt-1">{data?.status === 'expired' ? 'This certificate has expired.' : data?.status === 'revoked' ? 'This certificate has been revoked.' : 'No matching certificate could be found.'}</p>
            </>
          ) : (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center"><ShieldCheck size={32} /></div>
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
