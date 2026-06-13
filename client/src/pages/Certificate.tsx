import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui/Primitives';
import { fmtDate } from '../lib/format';
import { ArrowLeft, Printer } from 'lucide-react';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const CSS = `
.bc-stage{display:flex;justify-content:center}
.bc-cert{position:relative;width:100%;max-width:1000px;aspect-ratio:1.414/1;container-type:inline-size;
  background:radial-gradient(120% 120% at 50% 0%, #fffdf7 0%, #fbf6ea 55%, #f5edd8 100%);
  color:#1d2430;overflow:hidden;border-radius:6px;box-shadow:0 24px 70px rgba(15,23,42,.35);
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.bc-guilloche{position:absolute;inset:0;opacity:.06;background-image:
  repeating-radial-gradient(circle at 50% 40%, #8a6a1c 0 1px, transparent 1px 9px),
  repeating-radial-gradient(circle at 50% 40%, #0f8c84 0 1px, transparent 1px 22px)}
.bc-frame{position:absolute;inset:2.2cqw;border:0.25cqw solid #b58a2b}
.bc-frame:before{content:"";position:absolute;inset:0.6cqw;border:0.1cqw solid #8a6a1c;opacity:.6}
.bc-corner{position:absolute;width:7.4cqw;height:7.4cqw;color:#b58a2b}
.bc-corner svg{width:100%;height:100%}
.bc-tl{top:1.4cqw;left:1.4cqw}.bc-tr{top:1.4cqw;right:1.4cqw;transform:scaleX(-1)}
.bc-bl{bottom:1.4cqw;left:1.4cqw;transform:scaleY(-1)}.bc-br{bottom:1.4cqw;right:1.4cqw;transform:scale(-1,-1)}
.bc-content{position:absolute;left:7cqw;right:7cqw;top:5.2cqw;display:flex;flex-direction:column;align-items:center;text-align:center}
.bc-logo{height:4.2cqw;margin-top:.2cqw}
.bc-eyebrow{margin-top:1.3cqw;font-size:1.15cqw;letter-spacing:.42em;text-transform:uppercase;color:#0f8c84;font-weight:700;font-family:Inter,sans-serif}
.bc-title{font-family:'Playfair Display',serif;font-weight:800;font-size:4.7cqw;line-height:1;margin-top:1.3cqw;color:#1d2430}
.bc-title i{font-weight:600;color:#8a6a1c}
.bc-rule{display:flex;align-items:center;gap:1.2cqw;margin-top:1.3cqw}
.bc-rule .ln{height:1px;width:12cqw;background:linear-gradient(90deg,transparent,#b58a2b)}
.bc-rule .ln.r{background:linear-gradient(90deg,#b58a2b,transparent)}
.bc-rule .dia{width:.8cqw;height:.8cqw;background:#b58a2b;transform:rotate(45deg)}
.bc-present{margin-top:2cqw;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:2.1cqw;color:#5b5446}
.bc-name{font-family:'Playfair Display',serif;font-weight:700;font-size:5.4cqw;margin-top:.3cqw;color:#1d2430;line-height:1.04}
.bc-nameline{width:40cqw;height:2px;margin:1cqw auto 0;background:linear-gradient(90deg,transparent,#b58a2b,transparent)}
.bc-body{margin-top:1.7cqw;font-family:'Cormorant Garamond',serif;font-size:2.15cqw;color:#4a4438;max-width:72cqw;line-height:1.4}
.bc-module{font-family:'Playfair Display',serif;font-style:italic;font-weight:600;font-size:2.7cqw;color:#0f8c84;margin-top:.4cqw}
.bc-score{margin-top:1cqw;font-family:Inter,sans-serif;font-size:1.35cqw;letter-spacing:.04em;color:#6b6452}
.bc-score b{color:#0f8c84}
.bc-footer{position:absolute;left:7cqw;right:7cqw;bottom:4.4cqw;display:flex;align-items:flex-end;justify-content:space-between}
.bc-sig{width:25cqw;text-align:center}
.bc-sig .scriptname{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:2.3cqw;color:#2a3340;margin-bottom:.1cqw}
.bc-sig .line{border-top:1.5px solid #6b6452;padding-top:.6cqw}
.bc-sig .nm{font-family:'Playfair Display',serif;font-weight:600;font-size:1.5cqw;color:#1d2430}
.bc-sig .ttl{font-family:Inter,sans-serif;font-size:1.02cqw;letter-spacing:.1em;text-transform:uppercase;color:#8a8270;margin-top:.2cqw}
.bc-seal{width:14cqw;height:15.5cqw;margin-bottom:-.6cqw}
.bc-seal svg{width:100%;height:100%}
.bc-qr{position:absolute;top:6.2cqw;right:7cqw;width:8cqw;height:8cqw;border:.35cqw solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.12);background:#fff}
.bc-verify{position:absolute;left:7cqw;right:7cqw;bottom:1.7cqw;display:flex;align-items:center;justify-content:space-between;font-family:Inter,sans-serif;font-size:1cqw;color:#8a8270}
.bc-verify .mono{font-family:ui-monospace,Menlo,monospace;color:#5b5446}
@media print{.bc-cert{box-shadow:none;border-radius:0}.bc-noprint{display:none!important}}
`;

const CORNER = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor">
 <path d="M6 46 V12 A6 6 0 0 1 12 6 H46" stroke-width="2.5"/>
 <path d="M15 37 V20 A5 5 0 0 1 20 15 H37" stroke-width="1.1" opacity=".65"/>
 <path d="M6 70 C 6 34, 34 6, 70 6" stroke-width="1" opacity=".5"/>
 <path d="M20 20 q16 3 21 21 q-18 -5 -21 -21 Z" fill="currentColor" stroke="none" opacity=".85"/>
 <circle cx="9.5" cy="9.5" r="2.1" fill="currentColor" stroke="none"/></svg>`;

const SEAL = `<svg viewBox="0 0 140 160">
 <defs><radialGradient id="bcsealg" cx="0.5" cy="0.38" r="0.75">
  <stop offset="0" stop-color="#f3dc97"/><stop offset="0.55" stop-color="#cba63f"/><stop offset="1" stop-color="#8a6a1c"/></radialGradient>
  <path id="bcArcTop" d="M24 70 a46 46 0 0 1 92 0" fill="none"/>
  <path id="bcArcBot" d="M26 70 a44 44 0 0 0 88 0" fill="none"/></defs>
 <path d="M54 104 L40 156 L57 143 L66 158 L74 110 Z" fill="#0f8c84"/>
 <path d="M86 104 L100 156 L83 143 L74 158 L66 110 Z" fill="#0b6f68"/>
 <circle cx="70" cy="70" r="54" fill="url(#bcsealg)"/>
 <circle cx="70" cy="70" r="54" fill="none" stroke="#8a6a1c" stroke-width="3.5" stroke-dasharray="1.5 5.6"/>
 <circle cx="70" cy="70" r="50" fill="url(#bcsealg)"/>
 <circle cx="70" cy="70" r="41" fill="#fbf6ea"/>
 <circle cx="70" cy="70" r="41" fill="none" stroke="#b58a2b" stroke-width="2"/>
 <circle cx="70" cy="70" r="46" fill="none" stroke="#8a6a1c" stroke-width="0.8" opacity="0.5"/>
 <text font-family="Inter,sans-serif" font-size="8" font-weight="700" letter-spacing="1.6" fill="#7d5f18"><textPath href="#bcArcTop" startOffset="50%" text-anchor="middle">MSCORPRES AUTOMATION</textPath></text>
 <text font-family="Inter,sans-serif" font-size="8.5" font-weight="700" letter-spacing="3.5" fill="#7d5f18"><textPath href="#bcArcBot" startOffset="50%" text-anchor="middle">CERTIFIED</textPath></text>
 <circle cx="70" cy="70" r="19" fill="#0f8c84"/>
 <circle cx="70" cy="70" r="19" fill="none" stroke="#0b6f68" stroke-width="1.5"/>
 <path d="M61 70 l6.2 6.2 l12.5 -13.5" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function Certificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['cert', id], queryFn: async () => (await api.get(`/certificates/${id}`)).data.data });
  if (isLoading) return <div className="grid place-items-center py-20"><Spinner /></div>;

  const name = data.user?.fullName || user?.fullName || '';
  const verifyUrl = `${location.origin}/verify/${data.verificationHash}`;
  const host = location.host;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verifyUrl)}`;

  const inner = `
    <div class="bc-guilloche"></div>
    <div class="bc-frame"></div>
    <div class="bc-corner bc-tl">${CORNER}</div>
    <div class="bc-corner bc-tr">${CORNER}</div>
    <div class="bc-corner bc-bl">${CORNER}</div>
    <div class="bc-corner bc-br">${CORNER}</div>
    <img class="bc-qr" src="${qr}" alt="Verification QR code" />
    <div class="bc-content">
      <img class="bc-logo" src="https://www.mscorpres.com/assets/mscorpreslogo.jpeg" alt="MsCorpres Automation" />
      <div class="bc-eyebrow">Learning &amp; Development Portal</div>
      <div class="bc-title">Certificate <i>of</i> Completion</div>
      <div class="bc-rule"><span class="ln"></span><span class="dia"></span><span class="ln r"></span></div>
      <div class="bc-present">This is proudly presented to</div>
      <div class="bc-name">${esc(name)}</div>
      <div class="bc-nameline"></div>
      <div class="bc-body">for successfully completing the training module</div>
      <div class="bc-module">${esc(data.module.title)}</div>
      <div class="bc-score">Assessment score <b>${esc(data.score)}%</b> &nbsp;&middot;&nbsp; all compliance requirements met</div>
    </div>
    <div class="bc-footer">
      <div class="bc-sig">
        <div class="scriptname">MsCorpres Automation</div>
        <div class="line"><div class="nm">Authorised Signatory</div><div class="ttl">Learning &amp; Development</div></div>
      </div>
      <div class="bc-seal">${SEAL}</div>
      <div class="bc-sig">
        <div class="scriptname">${esc(fmtDate(data.issuedAt))}</div>
        <div class="line"><div class="nm">Date of Issue</div><div class="ttl">${data.expiresAt ? 'Valid until ' + esc(fmtDate(data.expiresAt)) : 'MsCorpres Automation'}</div></div>
      </div>
    </div>
    <div class="bc-verify">
      <div>Certificate No.&nbsp; <span class="mono">${esc(data.serialNo)}</span></div>
      <div>Verify authenticity at <span class="mono">${esc(host)}/verify</span></div>
    </div>`;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <style>{CSS}</style>
      <div className="flex items-center justify-between bc-noprint">
        <Link to="/certificates" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> My certificates</Link>
        <button onClick={() => window.print()} className="btn-ghost"><Printer size={16} /> Print / Save PDF</button>
      </div>
      <div className="bc-stage">
        <div className="bc-cert" dangerouslySetInnerHTML={{ __html: inner }} />
      </div>
      <p className="text-center text-xs text-slate-400 bc-noprint">Verify authenticity at <span className="font-mono">{verifyUrl}</span></p>
    </div>
  );
}
