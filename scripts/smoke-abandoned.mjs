/**
 * The abandoned-test fix: answer a few questions, let the clock run out
 * without submitting, then confirm the work is scored and reaches analytics.
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
  const t = await res.text();
  let body; try { body = JSON.parse(t); } catch { body = t.slice(0, 200); }
  return { status: res.status, body };
}
const fails = [];
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails.push(n); };

const email = `aband${Date.now()}@example.com`;
await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Ab', email, password: 'Testpass123' }) });
await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Testpass123' }) });

const before = await api('/api/analytics');
check('starts with no tests', (before.body?.totals?.tests ?? -1) === 0);

// a 60s test is the shortest the API allows
const r = await api('/api/attempts', { method: 'POST',
  body: JSON.stringify({ mode: 'chapter', subjects: ['Physics'], chapters: ['Current Electricity'],
    count: 5, durationSec: 60, secureMode: false }) });
await api(`/api/attempts/${r.body.id}/start`, { method: 'POST' });
const a = await api(`/api/attempts/${r.body.id}`);
for (let i = 0; i < 3; i++) {
  await api(`/api/attempts/${r.body.id}/answer`, { method: 'POST',
    body: JSON.stringify({ index: i, selected: a.body.questions[i].options[0].letter }) });
}
console.log('answered 3 of 5, now abandoning (waiting out the 60s clock)...');
await new Promise((res) => setTimeout(res, 63_000));

// the student never submits; they just come back to the app later
const after = await api('/api/analytics');
check('abandoned test now counted in analytics', (after.body?.totals?.tests ?? 0) === 1,
  `tests=${after.body?.totals?.tests}`);
check('its answers were marked', (after.body?.totals?.questions ?? 0) === 3,
  `questions=${after.body?.totals?.questions}`);

const res2 = await api(`/api/attempts/${r.body.id}`);
check('attempt reads as submitted', Boolean(res2.body?.attempt?.submittedAt),
  `submittedAt=${res2.body?.attempt?.submittedAt}`);
check('marked as auto-submitted', res2.body?.attempt?.autoSubmitted === true);
check('score recorded on the attempt', typeof res2.body?.attempt?.score === 'number',
  `score=${res2.body?.attempt?.score}`);
check('answer key revealed after close-out', Boolean(res2.body?.questions?.[0]?.answer));

const re = await api(`/api/attempts/${r.body.id}/submit`, { method: 'POST' });
check('a late submit is a harmless no-op', re.status === 200 && re.body.alreadySubmitted === true);

console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nAll checks passed.');
process.exit(fails.length ? 1 : 0);
