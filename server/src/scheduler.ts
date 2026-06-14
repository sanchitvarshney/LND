/**
 * Lightweight in-process scheduler (no external cron needed).
 * Runs once ~30s after boot and then once per calendar day:
 *  - marks overdue assignments, sends due-soon / overdue reminders
 *  - sends certificate-expiry reminders and reopens assignments for recertification
 * Reminders are de-duplicated so a learner gets at most one of each type per ~20h.
 */
import { prisma } from './db.js';
import { sendMail, brandEmail, appUrl } from './mailer.js';

const DAY = 86400000;

async function alreadyNotified(userId: string, type: string, title: string): Promise<boolean> {
  const since = new Date(Date.now() - 20 * 3600 * 1000);
  const n = await prisma.notification.findFirst({ where: { userId, type, title, createdAt: { gt: since } } });
  return !!n;
}

async function notify(userId: string, type: string, title: string, body: string) {
  if (await alreadyNotified(userId, type, title)) return false;
  await prisma.notification.create({ data: { userId, type, title, body } });
  return true;
}

async function runReminders() {
  const now = new Date();
  const soon = new Date(Date.now() + 3 * DAY);
  const url = appUrl();

  // --- Due-soon / overdue assignments ---
  const assignments = await prisma.assignment.findMany({
    where: { status: { in: ['assigned', 'in_progress', 'overdue'] }, dueAt: { not: null } },
    include: { user: true, module: true },
  });
  for (const a of assignments) {
    if (!a.dueAt) continue;
    const overdue = a.dueAt < now;
    const dueSoon = a.dueAt >= now && a.dueAt <= soon;
    if (overdue && a.status !== 'overdue') await prisma.assignment.update({ where: { id: a.id }, data: { status: 'overdue' } });
    if (!overdue && !dueSoon) continue;
    const title = overdue ? 'Training overdue' : 'Training due soon';
    const when = a.dueAt.toDateString();
    const fresh = await notify(a.userId, 'reminder', title, `"${a.module.title}" is ${overdue ? 'overdue (was due ' + when + ')' : 'due ' + when}.`);
    if (fresh) {
      await sendMail(a.user.email, `${title}: ${a.module.title}`,
        brandEmail(title, `Your training <b>${a.module.title}</b> is ${overdue ? 'now <b>overdue</b> (was due ' + when + ')' : 'due on <b>' + when + '</b>'}. Please complete it to stay compliant.`,
          url ? { text: 'Go to my training', url } : undefined));
    }
  }

  // --- Certificate expiry / recertification ---
  const certs = await prisma.certificate.findMany({
    where: { revoked: false, expiresAt: { not: null } },
    include: { user: true, module: true },
  });
  for (const c of certs) {
    if (!c.expiresAt) continue;
    const expired = c.expiresAt < now;
    const expSoon = c.expiresAt >= now && c.expiresAt <= new Date(Date.now() + 30 * DAY);
    if (expired) {
      // reopen the assignment so the learner must recertify
      await prisma.assignment.updateMany({ where: { userId: c.userId, moduleId: c.moduleId }, data: { status: 'assigned', completedAt: null } });
      const fresh = await notify(c.userId, 'recertification', 'Recertification required', `Your certification for "${c.module.title}" has expired. Please complete the training again.`);
      if (fresh) await sendMail(c.user.email, `Recertification required: ${c.module.title}`,
        brandEmail('Recertification required', `Your certification for <b>${c.module.title}</b> has <b>expired</b>. Please retake the training to remain compliant.`, url ? { text: 'Start recertification', url } : undefined));
    } else if (expSoon) {
      const when = c.expiresAt.toDateString();
      const fresh = await notify(c.userId, 'recertification', 'Certification expiring soon', `Your certification for "${c.module.title}" expires on ${when}.`);
      if (fresh) await sendMail(c.user.email, `Certification expiring soon: ${c.module.title}`,
        brandEmail('Certification expiring soon', `Your certification for <b>${c.module.title}</b> expires on <b>${when}</b>. Plan to recertify before then.`, url ? { text: 'View training', url } : undefined));
    }
  }
}

let started = false;
let lastRunDay = '';
export function startScheduler() {
  if (started) return;
  started = true;
  const tick = async () => {
    const day = new Date().toISOString().slice(0, 10);
    if (day === lastRunDay) return;
    lastRunDay = day;
    try { await runReminders(); console.log('[scheduler] reminders run for', day); }
    catch (e: any) { console.error('[scheduler] error:', e?.message); }
  };
  setTimeout(tick, 30000);
  setInterval(tick, 6 * 3600 * 1000);
}
