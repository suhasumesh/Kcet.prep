import { connectDB } from './db';
import { Attempt } from './models/Attempt';
import { Question } from './models/Question';
import { istDayKey } from './exam';

export type ChapterStat = {
  subject: string;
  chapter: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avgTimeSec: number;
  /** 0-100. Blends accuracy with how much evidence there is behind it. */
  mastery: number;
  status: 'strong' | 'steady' | 'shaky' | 'weak' | 'untested';
};

export type Analytics = {
  totals: { tests: number; questions: number; correct: number; accuracy: number; timeSec: number };
  bySubject: { subject: string; attempted: number; correct: number; accuracy: number }[];
  chapters: ChapterStat[];
  weakest: ChapterStat[];
  trend: { date: string; title: string; score: number; total: number; accuracy: number }[];
  untested: { subject: string; chapter: string; available: number }[];
  /** One entry per day practised, for the activity heatmap. */
  activity: { date: string; questions: number; correct: number; tests: number; minutes: number }[];
  activeDays: number;
};

/**
 * Confidence-weighted mastery.
 *
 * Raw accuracy is noisy on small samples -- 2 right out of 2 is not mastery.
 * The score is pulled towards 50% until enough questions have been seen, so a
 * chapter has to be demonstrated repeatedly before it reads as strong.
 */
function masteryOf(correct: number, attempted: number) {
  if (attempted === 0) return 0;
  const prior = 6; // questions' worth of "unknown" mixed in
  return Math.round(((correct + 0.5 * prior) / (attempted + prior)) * 100);
}

function statusOf(mastery: number, attempted: number): ChapterStat['status'] {
  if (attempted === 0) return 'untested';
  if (mastery >= 75) return 'strong';
  if (mastery >= 60) return 'steady';
  if (mastery >= 45) return 'shaky';
  return 'weak';
}

/**
 * How many questions each chapter holds.
 *
 * This is a group over the whole collection and it only changes when the bank
 * is reseeded, so it is held for a few minutes rather than recomputed for
 * every student opening their analytics page.
 */
let countsCache: { at: number; rows: any[] } | null = null;
const COUNTS_TTL_MS = 10 * 60 * 1000;

async function chapterCounts() {
  if (countsCache && Date.now() - countsCache.at < COUNTS_TTL_MS) return countsCache.rows;
  const rows = await Question.aggregate([
    { $group: { _id: { subject: '$subject', chapter: '$chapter' }, n: { $sum: 1 } } },
  ]);
  countsCache = { at: Date.now(), rows };
  return rows;
}

export async function buildAnalytics(userId: string): Promise<Analytics> {
  await connectDB();

  const attempts = await Attempt.find({ user: userId, submittedAt: { $ne: null } })
    .sort({ submittedAt: 1 })
    .select('title responses questions score submittedAt correct')
    .lean<any[]>();

  const allQIds = [...new Set(attempts.flatMap((a) => a.questions.map((q: any) => String(q))))];
  const qdocs = await Question.find({ _id: { $in: allQIds } })
    .select('subject chapter answer')
    .lean<any[]>();
  const meta = new Map(qdocs.map((q) => [String(q._id), q]));

  type Acc = { attempted: number; correct: number; timeMs: number };
  const perChapter = new Map<string, Acc>();
  const perSubject = new Map<string, Acc>();
  const perDay = new Map<string, { questions: number; correct: number; tests: number; ms: number }>();
  const totals: Acc = { attempted: 0, correct: 0, timeMs: 0 };

  for (const a of attempts) {
    const day = istDayKey(new Date(a.submittedAt));
    const d = perDay.get(day) ?? { questions: 0, correct: 0, tests: 0, ms: 0 };
    d.tests++;
    perDay.set(day, d);

    for (const r of a.responses || []) {
      const q = meta.get(String(r.question));
      if (!q) continue;
      const hit = r.selected && r.selected === q.answer ? 1 : 0;
      // Unanswered questions still count as attempted exposure for timing, but
      // only answered ones say anything about whether the chapter is understood.
      if (!r.selected) continue;

      const ck = `${q.subject}|${q.chapter}`;
      const c = perChapter.get(ck) ?? { attempted: 0, correct: 0, timeMs: 0 };
      c.attempted++; c.correct += hit; c.timeMs += r.timeSpentMs || 0;
      perChapter.set(ck, c);

      const s = perSubject.get(q.subject) ?? { attempted: 0, correct: 0, timeMs: 0 };
      s.attempted++; s.correct += hit; s.timeMs += r.timeSpentMs || 0;
      perSubject.set(q.subject, s);

      totals.attempted++; totals.correct += hit; totals.timeMs += r.timeSpentMs || 0;

      d.questions++; d.correct += hit; d.ms += r.timeSpentMs || 0;
    }
  }

  const chapters: ChapterStat[] = [...perChapter.entries()]
    .map(([key, v]) => {
      const [subject, chapter] = key.split('|');
      const mastery = masteryOf(v.correct, v.attempted);
      return {
        subject,
        chapter,
        attempted: v.attempted,
        correct: v.correct,
        accuracy: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
        avgTimeSec: v.attempted ? Math.round(v.timeMs / v.attempted / 1000) : 0,
        mastery,
        status: statusOf(mastery, v.attempted),
      };
    })
    .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted);

  // Chapters never practised, so the plan can send the student somewhere new.
  const bankCounts = await chapterCounts();
  const seen = new Set(chapters.map((c) => `${c.subject}|${c.chapter}`));
  const untested = bankCounts
    .filter((b) => !seen.has(`${b._id.subject}|${b._id.chapter}`) && b._id.chapter !== 'Unclassified')
    .map((b) => ({ subject: b._id.subject, chapter: b._id.chapter, available: b.n }))
    .sort((a, b) => b.available - a.available);

  return {
    totals: {
      tests: attempts.length,
      questions: totals.attempted,
      correct: totals.correct,
      accuracy: totals.attempted ? Math.round((totals.correct / totals.attempted) * 100) : 0,
      timeSec: Math.round(totals.timeMs / 1000),
    },
    bySubject: [...perSubject.entries()]
      .map(([subject, v]) => ({
        subject,
        attempted: v.attempted,
        correct: v.correct,
        accuracy: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject)),
    chapters,
    weakest: chapters.filter((c) => c.attempted >= 3 && c.mastery < 65).slice(0, 12),
    trend: attempts.slice(-20).map((a) => ({
      date: new Date(a.submittedAt).toISOString().slice(0, 10),
      title: a.title,
      score: a.score,
      total: a.questions.length,
      accuracy: a.questions.length ? Math.round((a.correct / a.questions.length) * 100) : 0,
    })),
    untested,
    activity: [...perDay.entries()]
      .map(([date, v]) => ({
        date,
        questions: v.questions,
        correct: v.correct,
        tests: v.tests,
        minutes: Math.round(v.ms / 60000),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    activeDays: perDay.size,
  };
}
