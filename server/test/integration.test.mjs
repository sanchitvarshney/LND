// Comprehensive integration test suite for LearnGuard API (Node 18+ global fetch)
const BASE = process.env.BASE || 'http://localhost:4090';
const API = `${BASE}/api/v1`;

let pass = 0, fail = 0; const failures = [];
function ok(cond, name) { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; failures.push(name); console.log(`  ✗ ${name}`); } }
function section(t) { console.log(`\n━━ ${t} ━━`); }

async function req(method, path, { token, body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return raw ? { status: res.status, data, res } : { status: res.status, data };
}
async function login(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  return r;
}

const FULL_BINS = Array.from({ length: 15 }, (_, i) => i);

async function run() {
  // ---------- AUTH ----------
  section('Authentication');
  let r = await req('GET', '/health'.replace('/api/v1',''));
  const health = await fetch(BASE + '/health').then(x => x.json()).catch(() => null);
  ok(health?.status === 'ok', 'GET /health returns ok');

  r = await login('learner@acme.com', 'Learner@123');
  ok(r.status === 200 && r.data.accessToken, 'login (learner) succeeds with token');
  const learner = r.data.accessToken;
  ok(r.data.user.role === 'learner', 'login returns correct role');

  r = await login('learner@acme.com', 'wrongpass');
  ok(r.status === 401, 'login with wrong password -> 401');

  r = await login('nobody@acme.com', 'x');
  ok(r.status === 401, 'login unknown user -> 401');

  r = await req('GET', '/auth/me', { token: learner });
  ok(r.status === 200 && r.data.email === 'learner@acme.com', 'GET /auth/me returns current user');

  r = await req('GET', '/auth/me');
  ok(r.status === 401, 'GET /auth/me without token -> 401');

  r = await req('GET', '/auth/me', { token: 'garbage.token.here' });
  ok(r.status === 401, 'GET /auth/me with invalid token -> 401');

  const admin = (await login('admin@acme.com', 'Admin@123')).data.accessToken;
  const manager = (await login('manager@acme.com', 'Manager@123')).data.accessToken;
  ok(!!admin && !!manager, 'admin + manager login succeed');

  // ---------- CATALOG / RBAC ----------
  section('Catalog & RBAC scoping');
  r = await req('GET', '/modules', { token: learner });
  ok(r.status === 200 && Array.isArray(r.data.data), 'learner GET /modules ok');
  const learnerModuleCount = r.data.data.length;
  ok(r.data.data.every(m => m.assignment), 'learner only sees assigned modules');
  const secMod = r.data.data.find(m => m.title.startsWith('Information'));
  ok(!!secMod, 'security module present for learner');

  r = await req('GET', '/modules', { token: admin });
  ok(r.status === 200, 'admin GET /modules ok');

  r = await req('GET', `/modules/${secMod.id}`, { token: learner });
  ok(r.status === 200 && r.data.data.videos.length === 1, 'GET /modules/:id returns videos');
  const video = r.data.data.videos[0];
  const assessmentId = r.data.data.assessment.id;

  // ---------- VIDEO GATE (the signature feature) ----------
  section('Unskippable video gate');
  r = await req('POST', `/assessments/${assessmentId}/attempts`, { token: learner });
  ok(r.status === 403, 'cannot start quiz before watching video -> 403');

  r = await req('GET', `/videos/${video.id}/progress`, { token: learner });
  ok(r.status === 200 && 'totalBins' in r.data.data, 'GET video progress initializes record');

  // partial coverage
  r = await req('POST', `/videos/${video.id}/progress`, { token: learner, body: { coveredBins: [0,1,2,3,4,5,6,7], maxPositionSeconds: 8 } });
  ok(r.status === 200 && Math.round(r.data.data.percentComplete) === 53, 'partial coverage (8/15) ~53%');

  r = await req('POST', `/videos/${video.id}/complete`, { token: learner });
  ok(r.status === 409, 'completion DENIED at partial coverage -> 409');

  // skip-ahead simulation: jump to last bin only, should NOT allow completion
  r = await req('POST', `/videos/${video.id}/progress`, { token: learner, body: { coveredBins: [14], maxPositionSeconds: 15 } });
  r = await req('POST', `/videos/${video.id}/complete`, { token: learner });
  ok(r.status === 409, 'jumping to end without watching middle still -> 409 (no skip)');

  // full coverage
  r = await req('POST', `/videos/${video.id}/progress`, { token: learner, body: { coveredBins: FULL_BINS, maxPositionSeconds: 15 } });
  ok(Math.round(r.data.data.percentComplete) === 100, 'full coverage -> 100%');
  r = await req('POST', `/videos/${video.id}/complete`, { token: learner });
  ok(r.status === 200 && r.data.data.status === 'video_completed', 'completion granted at 100%');

  // ---------- ASSESSMENT ENGINE ----------
  section('Assessment engine & grading');
  r = await req('GET', `/assessments/${assessmentId}/questions`, { token: learner });
  ok(r.status === 200, 'learner can fetch questions after watching');
  const qs = r.data.data.questions;
  ok(qs.length === 4, 'assessment has 4 questions');
  ok(['mcq','multi_select','true_false','short_answer'].every(t => qs.some(q => q.type === t)), 'all 4 question types present');
  const leak = qs.some(q => (q.options||[]).some(o => 'isCorrect' in o)) || qs.some(q => q.answerKey);
  ok(!leak, 'answer keys NOT leaked to learner');

  // admin sees keys
  r = await req('GET', `/assessments/${assessmentId}/questions`, { token: admin });
  const adminLeak = r.data.data.questions.some(q => (q.options||[]).some(o => 'isCorrect' in o) || q.answerKey);
  ok(adminLeak, 'admin DOES see answer keys');

  // helper to start an attempt and submit answers map by type
  async function attemptWith(mapper) {
    const a = await req('POST', `/assessments/${assessmentId}/attempts`, { token: learner });
    if (a.status !== 201) return { start: a.status };
    const attemptId = a.data.data.attemptId;
    const qd = (await req('GET', `/assessments/${assessmentId}/questions`, { token: learner })).data.data.questions;
    const answers = qd.map(q => ({ questionId: q.id, response: mapper(q) }));
    const s = await req('POST', `/attempts/${attemptId}/submit`, { token: learner, body: { answers } });
    return { start: a.status, attemptId, ...s.data.data };
  }

  // all correct
  let res = await attemptWith(q => q.type==='mcq'?['c']:q.type==='multi_select'?['a','b','d']:q.type==='true_false'?['false']:'phishing');
  ok(res.score === 100 && res.passed === true, 'all-correct submission -> 100% pass');
  ok(!!res.certificateId, 'passing issues a certificate');

  // multi-select partial should be wrong (all-or-nothing)
  res = await attemptWith(q => q.type==='mcq'?['c']:q.type==='multi_select'?['a','b']:q.type==='true_false'?['false']:'phishing');
  ok(res.score === 75, 'multi-select partial credit = 0 (all-or-nothing) -> 75% total');

  // short answer case-insensitive keyword
  res = await attemptWith(q => q.type==='mcq'?['c']:q.type==='multi_select'?['a','b','d']:q.type==='true_false'?['false']:'PHISHING attack');
  ok(res.score === 100, 'short-answer keyword match is case-insensitive & substring');

  // attempt limit: we've now used >=3 attempts (max 3)
  let limited = await req('POST', `/assessments/${assessmentId}/attempts`, { token: learner });
  ok(limited.status === 403, 'attempt limit enforced (4th start -> 403)');

  // result detail with explanations
  r = await req('GET', `/attempts/${res.attemptId}`, { token: learner });
  ok(r.status === 200 && r.data.data.questions.every(q => q.explanation !== undefined), 'attempt result returns explanations');

  // ---------- CERTIFICATES ----------
  section('Certificates & public verification');
  r = await req('GET', '/certificates/me', { token: learner });
  ok(r.status === 200 && r.data.data.length >= 1, 'learner has >=1 certificate');
  const cert = r.data.data[0];
  ok(/^CERT-/.test(cert.serialNo) && cert.verificationHash.length === 64, 'certificate has serial + sha256 hash');

  r = await fetch(`${API}/verify/${cert.verificationHash}`).then(x => x.json());
  ok(r.valid === true && r.status === 'valid', 'public verify (valid cert) works WITHOUT auth');
  ok(r.data.recipient === 'Lee Learner', 'verify returns recipient name');

  r = await fetch(`${API}/verify/deadbeef`).then(x => x.json());
  ok(r.valid === false, 'public verify (bad hash) -> invalid');

  // learner cannot view another user's cert by guessing? (own only) - check forbidden path
  r = await req('GET', `/certificates/${cert.id}`, { token: learner });
  ok(r.status === 200, 'learner can view own certificate detail');

  // ---------- MANAGER ----------
  section('Manager team tracking & scoping');
  r = await req('GET', '/reports/team', { token: manager });
  ok(r.status === 200 && r.data.data.length === 2, 'manager sees exactly their 2 reports');
  const lee = r.data.data.find(x => x.name === 'Lee Learner');
  ok(lee && lee.completed >= 1, 'team rollup reflects Lee\'s completion');

  r = await req('GET', '/reports/team', { token: learner });
  ok(r.status === 403, 'learner blocked from /reports/team -> 403');

  r = await req('GET', '/users', { token: manager });
  ok(r.status === 200 && r.data.data.every(u => u.managerId), 'manager /users scoped to direct reports');

  // ---------- ADMIN ----------
  section('Admin reporting, authoring & audit');
  r = await req('GET', '/reports/compliance', { token: admin });
  ok(r.status === 200 && 'compliancePct' in r.data.data, 'admin compliance report ok');

  r = await req('GET', '/reports/compliance', { token: learner });
  ok(r.status === 403, 'learner blocked from /reports/compliance -> 403');
  r = await req('GET', '/reports/compliance', { token: manager });
  ok(r.status === 403, 'manager blocked from admin compliance -> 403');

  // create a module (admin)
  r = await req('POST', '/modules', { token: admin, body: { title: 'Test Module X', description: 'created by test', category: 'QA', passThreshold: 60 } });
  ok(r.status === 201 && r.data.data.id, 'admin creates module');
  const newModuleId = r.data.data.id;

  // learner cannot create module
  r = await req('POST', '/modules', { token: learner, body: { title: 'Hack', description: 'x' } });
  ok(r.status === 403, 'learner cannot create module -> 403');

  // add a question of each type to the new module
  const aid = (await req('GET', `/modules/${newModuleId}`, { token: admin })).data.data.assessment.id;
  const qtypes = [
    { type:'mcq', prompt:'Pick A', options:[{id:'a',label:'A',isCorrect:true},{id:'b',label:'B',isCorrect:false}] },
    { type:'multi_select', prompt:'Pick A and B', options:[{id:'a',label:'A',isCorrect:true},{id:'b',label:'B',isCorrect:true},{id:'c',label:'C',isCorrect:false}] },
    { type:'true_false', prompt:'Sky is blue', options:[{id:'true',label:'True',isCorrect:true},{id:'false',label:'False',isCorrect:false}] },
    { type:'short_answer', prompt:'Type apple', answerKey:{matchType:'keyword',value:'apple',caseSensitive:false} },
  ];
  let created = 0;
  for (const q of qtypes) { const rr = await req('POST', `/assessments/${aid}/questions`, { token: admin, body: q }); if (rr.status === 201) created++; }
  ok(created === 4, 'admin authors all 4 question types');

  r = await req('GET', '/audit-logs', { token: admin });
  ok(r.status === 200 && r.data.data.length > 0, 'audit log populated');
  ok(r.data.data.some(l => l.action === 'video.completed'), 'audit captured video.completed');
  ok(r.data.data.some(l => l.action === 'attempt.submit'), 'audit captured attempt.submit');
  ok(r.data.data.some(l => l.action === 'module.create'), 'audit captured module.create');

  r = await req('GET', '/audit-logs', { token: learner });
  ok(r.status === 403, 'learner blocked from audit log -> 403');

  // ---------- ASSIGNMENTS / NOTIFICATIONS ----------
  section('Assignments & notifications');
  r = await req('GET', '/assignments/me', { token: learner });
  ok(r.status === 200 && r.data.data.length >= 2, 'learner assignments listed');
  const completedAssignment = r.data.data.find(a => a.module.title.startsWith('Information'));
  ok(completedAssignment.status === 'completed', 'completed module assignment marked completed');

  // admin assigns the new module to the learner
  const learnerId = (await req('GET','/auth/me',{token:learner})).data.id;
  r = await req('POST', '/assignments', { token: admin, body: { userId: learnerId, moduleId: newModuleId } });
  ok(r.status === 201, 'admin assigns module to learner');

  r = await req('GET', '/notifications', { token: learner });
  ok(r.status === 200 && r.data.data.length >= 1, 'learner has notifications');

  // ---------- SUMMARY ----------
  console.log(`\n═════ RESULTS: ${pass} passed, ${fail} failed ═════`);
  if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('ALL TESTS PASSED');
}
run().catch(e => { console.error('TEST RUNNER ERROR:', e); process.exit(2); });
