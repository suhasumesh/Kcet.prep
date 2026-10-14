import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Place a question in a topic within its chapter.
 *
 * Shared by the seeder, which stores the result on each question, and by
 * nothing else: the app reads the stored field rather than working this out
 * again. The taxonomy is read from data/topics.json, which is also what
 * src/lib/topics.ts imports, so the two can never drift apart.
 */
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TOPICS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'topics.json'), 'utf8'));

/**
 * The weight of a keyword is its word count, and it matters more than it
 * looks. Nearly every mechanics question mentions "kinetic energy", so a
 * topic holding that phrase swallows its whole chapter if each hit counts
 * one. Scoring "work energy theorem" three and "collision" one lets the
 * specific phrase win when both appear.
 */
function compile(keywords) {
  return keywords.map((term) => {
    const esc = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const lead = /[a-z0-9]/i.test(term[0]) ? '\\b' : '';
    const tail = /[a-z0-9]/i.test(term[term.length - 1]) ? '\\b' : '';
    return { rx: new RegExp(lead + esc + tail, 'i'), w: term.trim().split(/\s+/).length };
  });
}

const cache = new Map();
function topicsFor(subject, chapter) {
  const key = `${subject}|${chapter}`;
  if (!cache.has(key)) {
    const list = TOPICS[subject]?.[chapter] ?? [];
    cache.set(key, list.map((t) => ({ t, rx: compile(t.keywords) })));
  }
  return cache.get(key);
}

/** @returns {{topic: string, formula: string}} empty strings when unplaced. */
export function tagTopic(q) {
  const list = topicsFor(q.subject, q.chapter);
  if (!list.length) return { topic: '', formula: '' };
  const text = [
    q.stemText ?? '',
    ...(q.options ?? []).map((o) => o?.text ?? ''),
    (q.solutionText ?? '').slice(0, 900),
  ].join(' ').replace(/\s+/g, ' ');
  if (text.length < 12) return { topic: '', formula: '' };

  let best = null;
  let bestScore = 0;
  for (const { t, rx } of list) {
    let score = 0;
    for (const r of rx) if (r.rx.test(text)) score += r.w;
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return best ? { topic: best.topic, formula: best.formula } : { topic: '', formula: '' };
}
