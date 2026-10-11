/**
 * Flag hand-written solutions whose working contradicts the answer the
 * question ships with.
 *
 *   node --env-file=.env.local tools/audit_solutions.mjs
 *
 * The solutions are written against the crop and mark the right choice with a
 * tick and the wrong ones with a cross. Where the working settles on a letter
 * that is not the keyed one, either the key is wrong and was not corrected, or
 * the working is -- and a student shown both would see the contradiction. Both
 * cases need a human, so they are listed rather than fixed.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import mongoose from 'mongoose';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const SOLUTIONS = path.join(ROOT, 'data', 'solutions');

/** Letters the working marks correct, and letters it marks wrong. */
function verdicts(text) {
  const good = new Set();
  const bad = new Set();
  for (const line of String(text).split('\n')) {
    // "(c) ... ✓"  or  "**(c)** ... ✗" -- the mark applies to the option the
    // line opens with, so only the first marker on the line is considered.
    const m = line.match(/^\s*\**\(?\s*\**\(?([a-e])\)/i);
    if (!m) continue;
    const letter = m[1].toUpperCase();
    if (line.includes('✓')) good.add(letter);
    if (line.includes('✗')) bad.add(letter);
  }
  // an explicit closing statement outranks the line marks
  const close = String(text).match(/∴\s*option\s*\(?([a-e])\)?/i);
  if (close) return { good: new Set([close[1].toUpperCase()]), bad };
  return { good, bad };
}

await mongoose.connect(process.env.MONGODB_URI);
const Question = mongoose.connection.collection('questions');
const live = new Map();
for (const d of await Question.find({}).project(
  { bank: 1, subject: 1, year: 1, number: 1, book: 1, page: 1, seq: 1, answer: 1 }).toArray()) {
  live.set([d.bank || 'kcet', d.subject, d.year || 0, d.number, d.book || '', d.page || 0,
    d.seq || 0].join('|'), d.answer);
}

let checked = 0;
const clashes = [];
for (const file of fs.readdirSync(SOLUTIONS).sort()) {
  if (!file.endsWith('.json') || file.startsWith('_')) continue;
  for (const [key, entry] of Object.entries(JSON.parse(fs.readFileSync(path.join(SOLUTIONS, file), 'utf8')))) {
    const text = typeof entry === 'string' ? entry : entry.s;
    const answer = live.get(key);
    if (!answer || !text) continue;
    const { good, bad } = verdicts(text);
    checked++;
    if (good.size === 1 && !good.has(answer)) {
      clashes.push({ file, key, answer, says: [...good][0] });
    }
    // A cross against the keyed letter is NOT evidence of a clash: in a
    // "which statement is false" question the working marks the answer with a
    // cross and everything else with a tick. Flagging those buried the one
    // real contradiction among ten false alarms.
  }
}

console.log(`checked ${checked} solution(s) against the shipped key`);
console.log(`${clashes.length} contradict it:\n`);
for (const c of clashes) console.log(`  ${c.file}  ${c.key}\n    ships ${c.answer}, working says ${c.says}`);
await mongoose.disconnect();
