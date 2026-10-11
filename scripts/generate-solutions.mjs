/**
 * Write a step-by-step solution for every question that has no printed one.
 *
 *   node --env-file=.env.local scripts/generate-solutions.mjs --limit 50
 *   node --env-file=.env.local scripts/generate-solutions.mjs          # all
 *
 * The official KEA booklets and the Pradeep volumes print an answer key but
 * no working, so roughly 2,500 questions in the bank are correctly answered
 * and completely unexplained. This fills that in.
 *
 * The important part is what it refuses to keep. The correct option is
 * already known and verified, so the model is never asked what the answer is
 * -- it is told, and asked to show how you get there. Every reply has to end
 * in `ANSWER: <letter>` matching the key, and anything that ends anywhere
 * else is thrown away and retried once. A solution that argues its way to the
 * wrong option is exactly the thing that would cost a student marks, so it
 * never reaches the database.
 *
 * What is kept is marked `solutionSource: 'generated'`, and the app labels it,
 * because a student deserves to know the difference between the examiner's
 * working and a machine's.
 *
 * Needs GEMINI_API_KEY (ai.google.dev -- the free tier covers this bank) or
 * ANTHROPIC_API_KEY in .env.local.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'public', 'questions');

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? true);
};
const LIMIT = Number(arg('limit', 0)) || 0;
const SUBJECT = arg('subject');
const CONCURRENCY = Number(arg('concurrency', 4));
const DRY = process.argv.includes('--dry-run');

const GEMINI = process.env.GEMINI_API_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
if (!GEMINI && !ANTHROPIC) {
  console.error('Set GEMINI_API_KEY (free tier: https://ai.google.dev) or ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }

const PROMPT = (q) => `You are writing the worked solution for one multiple-choice question from the
Karnataka CET exam (${q.subject}, chapter: ${q.chapter}${q.year ? `, asked in ${q.year}` : ''}).

The question, with its four options, is in the image. Read it from the image.

The correct option is ${q.answer}. This is taken from the official answer key
and is not in doubt. Your job is to show a student how to get there.

Write the solution for a 17-year-old revising for this exam:
- go step by step, and state the formula or principle each step uses
- keep the algebra visible; do not jump to the result
- use plain text with unicode symbols (θ, √, ², ₀, ×, ⇒, π, Δ, ∴), no LaTeX, no markdown
- 4 to 10 short lines
- if options must be eliminated rather than derived, say why each wrong one fails
- do not restate the question

If the image is unreadable or the correct option genuinely cannot be ${q.answer},
reply with exactly: CANNOT

Otherwise end with a final line, exactly:
ANSWER: ${q.answer}`;

async function callGemini(prompt, b64, mime) {
  const model = 'gemini-2.0-flash';
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
      }),
    },
  );
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
}

async function callAnthropic(prompt, b64, mime) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 900,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return (j.content ?? []).map((c) => c.text ?? '').join('').trim();
}

const ask = GEMINI ? callGemini : callAnthropic;

/** Keep the working, but only if it lands on the option the key gives. */
function accept(reply, answer) {
  if (!reply || /^CANNOT\b/i.test(reply)) return null;
  const m = reply.match(/ANSWER:\s*\(?\s*([A-Da-d])\s*\)?\s*$/);
  if (!m || m[1].toUpperCase() !== answer) return null;
  const body = reply.slice(0, m.index).trim();
  // Too short to be working; it has just asserted the answer back at us.
  if (body.length < 40) return null;
  return body;
}

const QuestionSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Question = mongoose.model('Question', QuestionSchema, 'questions');

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

  const filter = {
    answer: { $in: ['A', 'B', 'C', 'D'] },
    solutionText: { $in: ['', null] },
    solutionImages: { $size: 0 },
    'stemImages.0': { $exists: true },
    ...(SUBJECT ? { subject: SUBJECT } : {}),
  };
  let todo = await Question.find(filter)
    .select('subject chapter year answer stemImages source')
    .lean();
  if (LIMIT) todo = todo.slice(0, LIMIT);

  console.log(`${todo.length} question(s) need a worked solution` +
              `${DRY ? ' (dry run, nothing will be written)' : ''}`);
  if (!todo.length) { await mongoose.disconnect(); return; }

  let done = 0, written = 0, rejected = 0, failed = 0;
  const queue = [...todo];

  async function worker() {
    for (;;) {
      const q = queue.shift();
      if (!q) return;
      done++;
      const rel = q.stemImages?.[0]?.src;
      const file = rel && path.join(ASSETS, rel);
      if (!file || !fs.existsSync(file)) { failed++; continue; }
      const b64 = fs.readFileSync(file).toString('base64');
      const mime = file.endsWith('.webp') ? 'image/webp' : 'image/png';

      let body = null;
      for (let attempt = 0; attempt < 2 && !body; attempt++) {
        try {
          body = accept(await ask(PROMPT(q), b64, mime), q.answer);
        } catch (e) {
          if (String(e).includes('429') || String(e).includes('503')) {
            await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
          } else if (attempt === 1) {
            failed++;
          }
        }
      }
      if (!body) { rejected++; }
      else {
        written++;
        if (!DRY) {
          await Question.updateOne({ _id: q._id },
            { $set: { solutionText: body, solutionSource: 'generated' } });
        }
      }
      if (done % 25 === 0 || done === todo.length) {
        process.stdout.write(
          `  ${done}/${todo.length}  written ${written}  rejected ${rejected}  failed ${failed}\r`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n\nwrote ${written}, rejected ${rejected} for disagreeing with the key, ${failed} errored`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
