"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailEnabled = mailEnabled;
exports.appUrl = appUrl;
exports.brandEmail = brandEmail;
exports.sendMail = sendMail;
/**
 * Email layer — SMTP via nodemailer. Fully optional: if SMTP_* env vars are not
 * set, every send is a graceful no-op (the app still works, in-app notifications remain).
 *
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for 465),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (defaults to SMTP_USER),
 *   APP_PUBLIC_URL (used for buttons/links in emails; falls back to CLIENT_ORIGIN)
 */
const nodemailer_1 = __importDefault(require("nodemailer"));
let transporter;
function init() {
    if (transporter !== undefined)
        return;
    const host = process.env.SMTP_HOST;
    if (!host) {
        transporter = null;
        return;
    }
    transporter = nodemailer_1.default.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '') === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
}
function mailEnabled() { init(); return !!transporter; }
function appUrl() {
    return (process.env.APP_PUBLIC_URL || (process.env.CLIENT_ORIGIN || '').split(',')[0] || '').replace(/\/+$/, '');
}
function brandEmail(heading, bodyHtml, cta) {
    const btn = cta ? `<tr><td style="padding:8px 0 4px"><a href="${cta.url}" style="display:inline-block;background:#0f8c84;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:8px;font-size:14px">${cta.text}</a></td></tr>` : '';
    return `<div style="background:#f4f6fb;padding:28px 0;font-family:Inter,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e8ecf3">
      <tr><td style="background:#0b1220;padding:18px 28px"><img src="https://www.mscorpres.com/assets/mscorpreslogo.jpeg" alt="MsCorpres Automation" height="30" style="height:30px;background:#fff;border-radius:6px;padding:4px"/></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a">${heading}</h1>
        <div style="font-size:14px;line-height:1.6;color:#475569">${bodyHtml}</div>
        <table role="presentation" cellpadding="0" cellspacing="0">${btn}</table>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:11px">Learning &amp; Development Portal · MsCorpres Automation. This is an automated message.</td></tr>
    </table>
  </td></tr></table></div>`;
}
async function sendMail(to, subject, html) {
    init();
    if (!transporter || !to)
        return false;
    try {
        await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html });
        return true;
    }
    catch (e) {
        console.error('[mail] send failed:', e?.message);
        return false;
    }
}
