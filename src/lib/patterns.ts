import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';

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
  //
  // Counted in the database rather than pulled across the wire. This used to
  // fetch all 2,600 documents with their stem, options and solution so each
  // one could be re-tagged here, which took the better part of two seconds on
  // every cold start to rebuild something that only changes when the bank is
  // re-seeded. The topic is now decided once, by the seeder, and this is a
  // grouped count over an index.
  const grouped: {
    _id: { subject: string; chapter: string; year: number; puc: number;
      topic: string; formula: string };
    n: number;
  }[] = await Question.aggregate([
    // An equality match can use the index; $ne cannot. `bank` is only ever
    // 'kcet' or 'pradeep' and is never missing, so the two are equivalent.
    { $match: { bank: 'kcet', paper: true, year: { $gt: 0 } } },
    {
      $group: {
        _id: {
          subject: '$subject', chapter: '$chapter', year: '$year', puc: '$puc',
          topic: { $ifNull: ['$topic', ''] },
          formula: { $ifNull: ['$topicFormula', ''] },
        },
        n: { $sum: 1 },
      },
    },
  ]);

  const rows = grouped.map((g) => ({
    subject: g._id.subject,
    chapter: g._id.chapter || 'Unclassified',
    year: g._id.year,
    puc: g._id.puc ?? 0,
    topic: g._id.topic,
    formula: g._id.formula,
    n: g.n,
  }));

  const subjects: Record<string, SubjectReport> = {};

  for (const subject of ['Physics', 'Chemistry', 'Mathematics']) {
    const mine = rows.filter((r) => r.subject === subject);
    const counts = new Map<number, number>();
    for (const r of mine) counts.set(r.year, (counts.get(r.year) ?? 0) + r.n);
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
      acc.perYear.set(r.year, (acc.perYear.get(r.year) ?? 0) + r.n);

      // No topic stored means the question matched none of its chapter's
      // topics, or the chapter has no topic list at all. Either way it is
      // counted in the chapter and reported as untagged, not hidden.
      if (!r.topic) {
        acc.untagged += r.n;
        continue;
      }
      let tr = acc.topics.get(r.topic);
      if (!tr) {
        tr = { formula: r.formula, n: 0, perYear: new Map() };
        acc.topics.set(r.topic, tr);
      }
      tr.n += r.n;
      tr.perYear.set(r.year, (tr.perYear.get(r.year) ?? 0) + r.n);
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

    const subjectTotal = mine.reduce((a, r) => a + r.n, 0);
    const unplaced = out.find((c) => c.chapter === 'Unclassified');
    const unclassified = unplaced?.total ?? 0;
    subjects[subject] = {
      unclassifiedInCompleteYears: unplaced?.inCompleteYears ?? 0,
      questionsInCompleteYears: complete.reduce((a, y) => a + (counts.get(y) ?? 0), 0),
      years,
      completeYears: complete,
      thinYears: thin,
      counts: Object.fromEntries(years.map((y) => [String(y), counts.get(y) ?? 0])),
      total: subjectTotal,
      unclassified,
      classified: subjectTotal - unclassified,
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
