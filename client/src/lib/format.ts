export function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
export function dueState(dueAt?: string | Date | null, status?: string) {
  if (status === 'completed') return { label: 'Completed', tone: 'emerald' as const };
  if (!dueAt) return { label: 'No due date', tone: 'slate' as const };
  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Overdue by ${-days}d`, tone: 'red' as const };
  if (days <= 3) return { label: `Due in ${days}d`, tone: 'amber' as const };
  return { label: `Due in ${days}d`, tone: 'slate' as const };
}
