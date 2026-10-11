import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * The live state of a running test.
 *
 * While the test is unsubmitted the correct answers and solutions are stripped
 * out, so they are never present in the browser for a student to read off.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  await connectDB();

  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).lean<any>();
  if (!attempt) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  const submitted = Boolean(attempt.submittedAt);
  // bank/book/optionStyle are what the card and the answer buttons are
  // labelled from, so they ship whether or not the test has been submitted.
  const common = 'subject chapter year number bank book optionStyle stemText stemImages options';
  const fields = submitted ? `${common} answer solutionText solutionImages solutionSource` : common;

  const docs = await Question.find({ _id: { $in: attempt.questions } }).select(fields).lean<any[]>();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const questions = attempt.questions.map((qid: any, i: number) => {
    const q = byId.get(String(qid));
    if (!q) return null;
    return {
      id: String(qid),
      index: i,
      subject: q.subject,
      chapter: q.chapter,
      year: q.year,
      number: q.number,
      bank: q.bank ?? 'kcet',
      book: q.book ?? '',
      optionStyle: q.optionStyle ?? 'number',
      stemText: q.stemText,
      stemImages: q.stemImages,
      options: (q.options || []).map((o: any) => ({ letter: o.letter, text: o.text, img: o.img })),
      ...(submitted
        ? { answer: q.answer, solutionText: q.solutionText,
           solutionImages: q.solutionImages, solutionSource: q.solutionSource ?? '' }
        : {}),
    };
  }).filter(Boolean);

  return NextResponse.json({
    attempt: {
      id: String(attempt._id),
      title: attempt.title,
      mode: attempt.mode,
      subjects: attempt.subjects,
      year: attempt.year,
      durationSec: attempt.durationSec,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      autoSubmitted: attempt.autoSubmitted,
      secureMode: attempt.secureMode,
      violations: attempt.violations,
      score: attempt.score,
      correct: attempt.correct,
      wrong: attempt.wrong,
      unattempted: attempt.unattempted,
    },
    questions,
    responses: (attempt.responses || []).map((r: any) => ({
      question: String(r.question),
      selected: r.selected,
      markedForReview: r.markedForReview,
      visited: r.visited,
      timeSpentMs: r.timeSpentMs,
    })),
    serverNow: Date.now(),
  });
}
