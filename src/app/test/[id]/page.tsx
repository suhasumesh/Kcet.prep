import { notFound, redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { sessionUserId } from '@/lib/auth';
import Runner from './Runner';
import StartGate from './StartGate';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Test in progress', robots: { index: false } };

export default async function TestPage({ params }: { params: { id: string } }) {
  const userId = sessionUserId();
  if (!userId) redirect('/login');

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).lean<any>();
  if (!attempt) notFound();

  // A finished test is a results page, never a runner.
  if (attempt.submittedAt) redirect(`/results/${params.id}`);

  // Questions are fetched here without the answer key, so the correct options
  // are never sent to the browser while the test is live.
  const docs = await Question.find({ _id: { $in: attempt.questions } })
    .select('subject chapter year number stemText stemImages options bank book optionStyle')
    .lean<any[]>();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const questions = attempt.questions
    .map((qid: any) => {
      const q = byId.get(String(qid));
      if (!q) return null;
      return {
        id: String(qid),
        subject: q.subject,
        chapter: q.chapter,
        year: q.year,
        number: q.number,
        bank: q.bank ?? 'kcet',
        book: q.book ?? '',
        optionStyle: q.optionStyle ?? 'number',
        stemText: q.stemText,
        stemImages: q.stemImages ?? [],
        options: (q.options ?? []).map((o: any) => ({ letter: o.letter, text: o.text, img: o.img ?? null })),
      };
    })
    .filter(Boolean);

  const responses = (attempt.responses ?? []).map((r: any) => ({
    question: String(r.question),
    selected: r.selected ?? null,
    markedForReview: Boolean(r.markedForReview),
    visited: Boolean(r.visited),
    timeSpentMs: r.timeSpentMs ?? 0,
  }));

  const payload = {
    attempt: {
      id: String(attempt._id),
      title: attempt.title,
      secureMode: Boolean(attempt.secureMode),
      expiresAt: new Date(attempt.expiresAt).toISOString(),
      durationSec: attempt.durationSec,
    },
    questions,
    responses,
    serverNow: Date.now(),
  };

  // Full screen can only be requested from a real user gesture, so exam mode
  // opens behind a start screen that doubles as the instructions page.
  if (attempt.secureMode) {
    return <StartGate payload={payload} />;
  }
  return <Runner {...payload} />;
}
