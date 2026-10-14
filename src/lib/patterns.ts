import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import { TOPICS, type Topic } from '@/lib/topics';

/**
 * What KCET actually asks, chapter by chapter and topic by topic.
 *
 * Two honesty problems shape this whole module, and both are carried in the
 * output rather than smoothed away.
 *
 * **Incomplete papers.** Every KCET paper sets 60 questions per subject, but
 * the older ones were recovered from scans and some came out short — Physics
 * 2010 yielded ten. Counting raw across all years would make 2010 look like a
 * quiet year for every chapter, which is false: it is a quiet year for the
 * extractor. So `perPaper` — the figure a student plans revision around — is
 * computed only over years we hold in full, and the raw per-year counts are
 * published beside it with the thin years marked.
 *
 * **Imperfect tagging.** Chapters come from keyword classification, not from a
 * human reading 2,600 questions, and some of the bank is still unplaced. Every
 * figure carries the sample it rests on, and the unclassified remainder is
 * reported as its own row rather than dropped from the denominator.
 */

/** Questions per subject in a real KCET paper. */
export const PAPER_SIZE = 60;
/** A year counts towards the averages only if we hold nearly all of it. */
const COMPLETE_AT = 0.95;

export type TopicRow = {
  topic: string;
  formula: string;
  n: number;
  perPaper: number;
  perYear: Record<string, number>;
};

export type ChapterRow = {
  chapter: string;
  puc: number;
  total: number;
  inCompleteYears: number;
  perPaper: number;
  trend: 'rising' | 'falling' | 'steady';
  trendDelta: number;
  perYear: Record<string, number>;
  untagged: number;
  topics: TopicRow[];
};

export type SubjectReport = {
  years: number[];
  completeYears: number[];
  thinYears: number[];
  counts: Record<string, number>;
  classified: number;
  unclassified: number;
  total: number;
  /**
   * Unplaced questions sitting in the years we actually average over. This,
   * not the overall figure, is what qualifies the marks-per-paper column: an
   * unplaced question in a year already excluded as partial costs that column
   * nothing.
   */
  unclassifiedInCompleteYears: number;
  questionsInCompleteYears: number;
  chapters: ChapterRow[];
};

export type PatternReport = {
  builtAt: string;
  paperSize: number;
  subjects: Record<string, SubjectReport>;
};

type Row = {
  subject: string;
  chapter: string;
  year: number;
  stemText?: string;
  options?: { text?: string }[];
  solutionText?: string;
};

/**
 * Case-insensitive whole-term match, tolerant of runs of whitespace, carrying
 * a weight.
 *
 * The weight is the number of words in the term, and it matters more than it
 * looks. Nearly every mechanics question mentions "kinetic energy", so a topic
 * holding that phrase will swallow its whole chapter if each hit counts one.
 * Scoring "work energy theorem" three and "collision" one lets the specific
 * phrase win when both appear, which is what a reader would conclude too.
 */
function compile(keywords: string[]): { rx: RegExp; w: number }[] {
  return keywords.map((term) => {
    const esc = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const lead = /[a-z0-9]/i.test(term[0]) ? '\\b' : '';
    const tail = /[a-z0-9]/i.test(term[term.length - 1]) ? '\\b' : '';
    return { rx: new RegExp(lead + esc + tail, 'i'), w: term.trim().split(/\s+/).length };
  });
}

const compiled = new Map<string, { topic: Topic; rx: { rx: RegExp; w: number }[] }[]>();
function topicsFor(subject: string, chapter: string) {
  const key = `${subject}|${chapter}`;
  let got = compiled.get(key);
  if (!got) {
    const list = TOPICS[subject]?.[chapter] ?? [];
    got = list.map((t) => ({ topic: t, rx: compile(t.keywords) }));
    compiled.set(key, got);
  }
  return got;
}

function haystack(q: Row): string {
  const bits = [q.stemText ?? ''];
  for (const o of q.options ?? []) bits.push(o.text ?? '');
  bits.push((q.solutionText ?? '').slice(0, 900));
  return bits.join(' ').replace(/\s+/g, ' ');
}

/** Best-scoring topic within the question's own chapter, or null. */
export function tagTopic(q: Row): Topic | null {
  const list = topicsFor(q.subject, q.chapter);
  if (!list.length) return null;
  const text = haystack(q);
  if (text.length < 12) return null;
  let best: Topic | null = null;
  let bestScore = 0;
  for (const { topic, rx } of list) {
    let score = 0;
    for (const r of rx) if (r.rx.test(text)) score += r.w;
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Direction over the complete years only, as a plain word.
 *
 * Compares the mean of the three most recent complete years with the three
 * before. Anything inside half a question per paper is called steady: exam
 * boards do not move in straight lines, and a chapter that went 4, 3, 4 is
 * not "falling".
 */
function trendOf(perYear: Map<number, number>, complete: number[]) {
  if (complete.length < 4) return { trend: 'steady' as const, trendDelta: 0 };
  const recent = complete.slice(-3);
  const earlier = complete.slice(-6, -3).length ? complete.slice(-6, -3) : complete.slice(0, -3);
  const mean = (ys: number[]) => ys.reduce((a, y) => a + (perYear.get(y) ?? 0), 0) / ys.length;
  const d = mean(recent) - mean(earlier);
  const trend = d >= 0.5 ? 'rising' : d <= -0.5 ? 'falling' : 'steady';
  return { trend: trend as 'rising' | 'falling' | 'steady', trendDelta: Math.round(d * 100) / 100 };
}

export async function buildReport(): Promise<PatternReport> {
  await connectDB();

  // Only whole papers: the chapterwise books reprint the same questions out of
  // order and carry the original year, so counting them would inflate every
  // chapter they happen to cover.
  const rows = (await Question.find(
    { bank: { $ne: 'pradeep' }, paper: true, year: { $gt: 0 } },
    { subject: 1, chapter: 1, year: 1, puc: 1, stemText: 1, 'options.text': 1, solutionText: 1 },
  ).lean()) as unknown as (Row & { puc?: number })[];

  const subjects: Record<string, SubjectReport> = {};

  for (const subject of ['Physics', 'Chemistry', 'Mathematics']) {
    const mine = rows.filter((r) => r.subject === subject);
    const counts = new Map<number, number>();
    for (const r of mine) counts.set(r.year, (counts.get(r.year) ?? 0) + 1);
    const years = [...counts.keys()].sort((a, b) => a - b);
    const complete = years.filter((y) => (counts.get(y) ?? 0) >= PAPER_SIZE * COMPLETE_AT);
    const thin = years.filter((y) => !complete.includes(y));

    type Acc = {
      puc: number;
      perYear: Map<number, number>;
      untagged: number;
      topics: Map<string, { formula: string; n: number; perYear: Map<number, number> }>;
    };
    const chapters = new Map<string, Acc>();

    for (const r of mine) {
      const ch = r.chapter || 'Unclassified';
      let acc = chapters.get(ch);
      if (!acc) {
        acc = { puc: r.puc ?? 0, perYear: new Map(), untagged: 0, topics: new Map() };
        chapters.set(ch, acc);
      }
      acc.perYear.set(r.year, (acc.perYear.get(r.year) ?? 0) + 1);

      const t = ch === 'Unclassified' ? null : tagTopic(r);
      if (!t) {
        acc.untagged++;
        continue;
      }
      let tr = acc.topics.get(t.topic);
      if (!tr) {
        tr = { formula: t.formula, n: 0, perYear: new Map() };
        acc.topics.set(t.topic, tr);
      }
      tr.n++;
      tr.perYear.set(r.year, (tr.perYear.get(r.year) ?? 0) + 1);
    }

    const spread = (m: Map<number, number>) =>
      Object.fromEntries(years.map((y) => [String(y), m.get(y) ?? 0]));
    const overComplete = (m: Map<number, number>) =>
      complete.reduce((a, y) => a + (m.get(y) ?? 0), 0);
    const per = (m: Map<number, number>) =>
      complete.length ? Math.round((overComplete(m) / complete.length) * 100) / 100 : 0;

    const out: ChapterRow[] = [...chapters.entries()].map(([chapter, acc]) => ({
      chapter,
      puc: acc.puc,
      total: [...acc.perYear.values()].reduce((a, b) => a + b, 0),
      inCompleteYears: overComplete(acc.perYear),
      perPaper: per(acc.perYear),
      ...trendOf(acc.perYear, complete),
      perYear: spread(acc.perYear),
      untagged: acc.untagged,
      topics: [...acc.topics.entries()]
        .map(([topic, t]) => ({
          topic,
          formula: t.formula,
          n: t.n,
          perPaper: per(t.perYear),
          perYear: spread(t.perYear),
        }))
        .sort((a, b) => b.n - a.n),
    }));
    out.sort((a, b) => b.perPaper - a.perPaper || b.total - a.total);

    const unplaced = out.find((c) => c.chapter === 'Unclassified');
    const unclassified = unplaced?.total ?? 0;
    subjects[subject] = {
      unclassifiedInCompleteYears: unplaced?.inCompleteYears ?? 0,
      questionsInCompleteYears: complete.reduce((a, y) => a + (counts.get(y) ?? 0), 0),
      years,
      completeYears: complete,
      thinYears: thin,
      counts: Object.fromEntries(years.map((y) => [String(y), counts.get(y) ?? 0])),
      total: mine.length,
      unclassified,
      classified: mine.length - unclassified,
      chapters: out,
    };
  }

  return { builtAt: new Date().toISOString(), paperSize: PAPER_SIZE, subjects };
}

// Scanning and tagging ~2,600 questions takes a moment, and the bank only
// changes when it is re-seeded, so the report is held for an hour rather than
// rebuilt for every visitor.
let cache: { at: number; report: PatternReport } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function getReport(): Promise<PatternReport> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.report;
  const report = await buildReport();
  cache = { at: Date.now(), report };
  return report;
}
