/**
 * End-to-end smoke test: register, build a test, answer it like a student,
 * submit, then read the results and analytics back.
 */
const BASE = 'http://localhost:3000';
let cookie = '';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body };
}

const log = (...a) => console.log(...a);
const fails = [];
function check(name, ok, detail = '') {
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails.push(name);
}

const email = `smoke${Date.now()}@kcetprep.test`;

// --- 1. auth -----------------------------------------------------------------
let r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name: 'Asha Rao', email, password: 'testpass123' }),
});
check('register', r.status === 200 && r.body.ok);

r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name: 'Asha Rao', email, password: 'testpass123' }),
});
check('duplicate email rejected', r.status === 409, `got ${r.status}`);

r = await api('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password: 'wrongpass' }),
});
check('wrong password rejected', r.status === 401, `got ${r.status}`);

r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'testpass123' }) });
check('login', r.status === 200);

// --- 2. build a test ---------------------------------------------------------
r = await api('/api/attempts', {
  method: 'POST',
  body: JSON.stringify({ mode: 'pyq', subjects: ['Physics'], year: 2024, secureMode: false }),
});
check('create PYQ attempt', r.status === 200 && r.body.id, JSON.stringify(r.body).slice(0, 120));
const id = r.body.id;

r = await api(`/api/attempts/${id}`);
const state = r.body;
check('fetch attempt', r.status === 200 && state.questions?.length === 60, `${state.questions?.length} questions`);
check('answer key hidden before submit', state.questions.every((q) => q.answer === undefined));
check('every question has 4 options', state.questions.every((q) => q.options.length === 4));
check('every question has a stem image', state.questions.every((q) => q.stemImages.length > 0));

// --- 3. start the clock ------------------------------------------------------
r = await api(`/api/attempts/${id}/start`, { method: 'POST' });
const firstDeadline = r.body.expiresAt;
check('start sets a deadline', r.status === 200 && Boolean(firstDeadline), firstDeadline);
r = await api(`/api/attempts/${id}/start`, { method: 'POST' });
check('re-start does not extend the clock', r.body.expiresAt === firstDeadline);

// --- 4. answer like a student -----------------------------------------------
// Fetch the key straight from the DB view so we can answer deterministically:
// answer the first 40 correctly-ish by pattern, leave 10 blank.
const letters = ['A', 'B', 'C', 'D'];
let answered = 0;
for (let i = 0; i < 50; i++) {
  const sel = letters[i % 4];
  const res = await api(`/api/attempts/${id}/answer`, {
    method: 'POST',
    body: JSON.stringify({ index: i, selected: sel, visited: true, addTimeMs: 4000 + i * 10 }),
  });
  if (res.status === 200) answered++;
}
check('answers saved', answered === 50, `${answered}/50`);

r = await api(`/api/attempts/${id}/answer`, {
  method: 'POST',
  body: JSON.stringify({ index: 3, markedForReview: true }),
});
check('mark for review', r.status === 200);

r = await api(`/api/attempts/${id}/answer`, {
  method: 'POST',
  body: JSON.stringify({ index: 999, selected: 'A' }),
});
check('out-of-range index rejected', r.status === 400, `got ${r.status}`);

// --- 5. violations -----------------------------------------------------------
r = await api(`/api/attempts/${id}/violation`, { method: 'POST', body: JSON.stringify({ kind: 'blur' }) });
check('violation recorded', r.status === 200 && r.body.count === 1, JSON.stringify(r.body));
r = await api(`/api/attempts/${id}/violation`, { method: 'POST', body: JSON.stringify({ kind: 'nonsense' }) });
check('unknown violation kind rejected', r.status === 400);

// --- 6. submit ---------------------------------------------------------------
r = await api(`/api/attempts/${id}/submit`, { method: 'POST' });
const result = r.body;
check('submit', r.status === 200 && result.ok, JSON.stringify(result));
check('scoring adds up', result.correct + result.wrong + result.unattempted === 60,
  `${result.correct}+${result.wrong}+${result.unattempted}`);
check('blank count correct', result.unattempted === 10, `got ${result.unattempted}`);
check('score equals correct (no negative marking)', result.score === result.correct);

r = await api(`/api/attempts/${id}/submit`, { method: 'POST' });
check('re-submit is a no-op', r.status === 200 && r.body.alreadySubmitted === true);

r = await api(`/api/attempts/${id}/answer`, { method: 'POST', body: JSON.stringify({ index: 0, selected: 'A' }) });
check('cannot answer after submit', r.status === 409, `got ${r.status}`);

// --- 7. answers are revealed only now ---------------------------------------
r = await api(`/api/attempts/${id}`);
check('answer key revealed after submit', r.body.questions.every((q) => ['A', 'B', 'C', 'D'].includes(q.answer)));
const withSol = r.body.questions.filter((q) => q.solutionText || q.solutionImages?.length).length;
check('solutions present', withSol >= 55, `${withSol}/60 have a solution`);

// --- 8. analytics & plan -----------------------------------------------------
r = await api('/api/analytics');
const a = r.body;
check('analytics built', r.status === 200 && a.totals.tests === 1, JSON.stringify(a.totals));
check('analytics counts answered questions', a.totals.questions === 50, `got ${a.totals.questions}`);
check('chapters tracked', a.chapters.length > 0, `${a.chapters.length} chapters`);
check('activity heatmap has today', a.activity.length === 1, JSON.stringify(a.activity));

r = await api('/api/plan?days=7');
check('plan generated', r.status === 200 && r.body.days.length === 7);
check('plan has tasks', r.body.days.every((d) => d.tasks.length > 0));

r = await api('/api/plan', { method: 'PATCH', body: JSON.stringify({ dailyMinutes: 120 }) });
check('daily minutes saved', r.status === 200);
r = await api('/api/plan', { method: 'PATCH', body: JSON.stringify({ dailyMinutes: 5 }) });
check('absurd daily minutes rejected', r.status === 400);

// --- 9. other test modes -----------------------------------------------------
for (const [label, payload, expect] of [
  ['subject mock', { mode: 'subject', subjects: ['Chemistry'], count: 30, secureMode: false }, 30],
  ['chapter test', { mode: 'chapter', subjects: ['Mathematics'], chapters: ['Probability'], count: 10, secureMode: false }, 10],
  ['full mock', { mode: 'full', secureMode: false }, 180],
]) {
  const made = await api('/api/attempts', { method: 'POST', body: JSON.stringify(payload) });
  if (made.status !== 200) { check(label, false, JSON.stringify(made.body)); continue; }
  const got = await api(`/api/attempts/${made.body.id}`);
  check(label, got.body.questions.length === expect, `${got.body.questions.length} questions`);
}

const bad = await api('/api/attempts', {
  method: 'POST',
  body: JSON.stringify({ mode: 'chapter', subjects: ['Physics'], chapters: ['Does Not Exist'], count: 10 }),
});
check('empty chapter selection rejected', bad.status === 400, `got ${bad.status}`);

// --- 10. access control ------------------------------------------------------
const saved = cookie;
cookie = '';
r = await api(`/api/attempts/${id}`);
check('signed-out cannot read an attempt', r.status === 401, `got ${r.status}`);
r = await api('/api/analytics');
check('signed-out cannot read analytics', r.status === 401);
cookie = saved;

// another user must not see this attempt
const other = `other${Date.now()}@kcetprep.test`;
cookie = '';
await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Other', email: other, password: 'testpass123' }) });
r = await api(`/api/attempts/${id}`);
check("another user cannot read someone else's attempt", r.status === 404, `got ${r.status}`);

log('\n' + (fails.length ? `${fails.length} FAILING: ${fails.join(', ')}` : 'All checks passed.'));
process.exit(fails.length ? 1 : 0);
