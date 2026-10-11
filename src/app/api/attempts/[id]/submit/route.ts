import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { User } from '@/lib/models/User';
import { requireUserId } from '@/lib/auth';
import { MARKS_CORRECT, istDayKey } from '@/lib/exam';

export const dynamic = 'force-dynamic';

/**
 * Finish a test and score it.
 *
 * Scoring happens here and only here: the correct answers never reach the
 * browser before submission, so the score cannot be computed or altered
 * client-side. Re-submitting is a no-op rather than an error, which keeps the
 * auto-submit-on-timeout path safe to retry.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId });
  if (!attempt) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  if (attempt.submittedAt) {
    return NextResponse.json({ ok: true, alreadySubmitted: true, id: String(attempt._id) });
  }

  const keys = await Question.find({ _id: { $in: attempt.questions } })
    .select('answer')
    .lean<{ _id: unknown; answer: string | null }[]>();
  const answerOf = new Map(keys.map((k) => [String(k._id), k.answer]));

  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  for (const r of attempt.responses) {
    const key = answerOf.get(String(r.question));
    if (!r.selected) unattempted++;
    else if (key && r.selected === key) correct++;
    else wrong++;
  }

  attempt.correct = correct;
  attempt.wrong = wrong;
  attempt.unattempted = unattempted;
  attempt.score = correct * MARKS_CORRECT; // KCET has no negative marking
  attempt.submittedAt = new Date();
  attempt.autoSubmitted = new Date() > attempt.expiresAt;
  await attempt.save();

  await bumpStreak(userId);

  return NextResponse.json({
    ok: true,
    id: String(attempt._id),
    score: attempt.score,
    correct,
    wrong,
    unattempted,
    total: attempt.questions.length,
  });
}

/** Daily streak in IST: same day keeps it, yesterday extends it, a gap resets it. */
async function bumpStreak(userId: string) {
  const user = await User.findById(userId).select('streak longestStreak lastActiveDay');
  if (!user) return;

  const today = istDayKey();
  if (user.lastActiveDay === today) return;

  const yesterday = istDayKey(new Date(Date.now() - 24 * 3600 * 1000));
  user.streak = user.lastActiveDay === yesterday ? (user.streak || 0) + 1 : 1;
  user.longestStreak = Math.max(user.longestStreak || 0, user.streak);
  user.lastActiveDay = today;
  await user.save();
}
