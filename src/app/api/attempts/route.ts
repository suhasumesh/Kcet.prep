import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import { Attempt } from '@/lib/models/Attempt';
import { requireUserId } from '@/lib/auth';
import { SUBJECTS, QUESTIONS_PER_SUBJECT, suggestedSeconds, MODE_LABEL } from '@/lib/exam';

export const dynamic = 'force-dynamic';

const Body = z.object({
  mode: z.enum(['full', 'subject', 'chapter', 'pyq']),
  bank: z.enum(['kcet', 'pradeep']).default('kcet'),
  book: z.string().optional(),
  subjects: z.array(z.enum(SUBJECTS)).default([]),
  chapters: z.array(z.string()).default([]),
  year: z.number().int().nullable().default(null),
  count: z.number().int().min(1).max(240).optional(),
  durationSec: z.number().int().min(60).max(6 * 3600).optional(),
  secureMode: z.boolean().default(true),
});

/** Pick `n` random questions matching a filter, using the server's own RNG. */
async function sample(filter: Record<string, unknown>, n: number) {
  return Question.aggregate([{ $match: filter }, { $sample: { size: n } }, { $project: { _id: 1 } }]);
}

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Sign in to start a test.' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'That test setup is not valid.' }, { status: 400 });
  }
  const { mode, chapters, year, secureMode, bank, book } = parsed.data;
  let subjects = parsed.data.subjects;

  await connectDB();

  // A test never mixes the exam papers with the reference book.
  const inBank = bank === 'pradeep' ? { bank: 'pradeep' } : { bank: { $ne: 'pradeep' } };
  const scope = book ? { ...inBank, book } : inBank;

  let ids: string[] = [];
  let title = MODE_LABEL[mode];

  if (mode === 'full') {
    // The real exam is 60 questions per subject, taken as three papers.
    subjects = [...SUBJECTS];
    for (const s of SUBJECTS) {
      const got = await sample({ ...scope, subject: s }, QUESTIONS_PER_SUBJECT);
      ids.push(...got.map((g) => String(g._id)));
    }
    title = 'Full mock test · Physics, Chemistry, Mathematics';
  } else if (mode === 'subject') {
    if (subjects.length !== 1) {
      return NextResponse.json({ error: 'Choose one subject.' }, { status: 400 });
    }
    const n = parsed.data.count ?? QUESTIONS_PER_SUBJECT;
    const got = await sample({ ...scope, subject: subjects[0] }, n);
    ids = got.map((g) => String(g._id));
    title = bank === 'pradeep'
      ? `Pradeep · ${subjects[0]} mixed set`
      : `${subjects[0]} mock test`;
  } else if (mode === 'chapter') {
    if (subjects.length !== 1 || chapters.length === 0) {
      return NextResponse.json({ error: 'Choose a subject and at least one chapter.' }, { status: 400 });
    }
    const n = parsed.data.count ?? 20;
    const got = await sample({ ...scope, subject: subjects[0], chapter: { $in: chapters } }, n);
    ids = got.map((g) => String(g._id));
    const what = chapters.length === 1 ? chapters[0] : `${chapters.length} chapters`;
    title = bank === 'pradeep'
      ? `Pradeep · ${subjects[0]} · ${what}`
      : `${subjects[0]} · ${what}`;
  } else {
    if (!year || subjects.length !== 1) {
      return NextResponse.json({ error: 'Choose a subject and a year.' }, { status: 400 });
    }
    // A past paper is taken in its original order, not shuffled, and only
    // from rows that came off that paper -- the chapterwise books reprint the
    // same questions out of order, and mixing them in would make a sixty
    // question paper two hundred questions long.
    const got = await Question.find({ ...scope, paper: true, subject: subjects[0], year })
      .sort({ number: 1 })
      .select('_id')
      .lean();
    ids = got.map((g) => String(g._id));
    title = `KCET ${year} · ${subjects[0]}`;
  }

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'No questions match that selection yet. Try another chapter or subject.' },
      { status: 400 },
    );
  }

  const durationSec = parsed.data.durationSec ?? suggestedSeconds(ids.length);
  const attempt = await Attempt.create({
    user: userId,
    mode,
    bank,
    title,
    subjects,
    chapters,
    year,
    durationSec,
    questions: ids,
    responses: ids.map((q) => ({ question: q })),
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + durationSec * 1000),
    secureMode,
  });

  return NextResponse.json({ id: String(attempt._id) });
}

/** Past attempts, newest first. */
export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  await connectDB();
  const rows = await Attempt.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('title mode subjects year score correct wrong unattempted questions submittedAt startedAt durationSec autoSubmitted')
    .lean();

  return NextResponse.json({
    attempts: rows.map((a: any) => ({
      id: String(a._id),
      title: a.title,
      mode: a.mode,
      subjects: a.subjects,
      year: a.year,
      total: a.questions.length,
      score: a.score,
      correct: a.correct,
      wrong: a.wrong,
      unattempted: a.unattempted,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      durationSec: a.durationSec,
      autoSubmitted: a.autoSubmitted,
    })),
  });
}
