import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { User } from '@/lib/models/User';
import { requireUserId } from '@/lib/auth';
import { istDayKey } from '@/lib/exam';
import { scoreResponses } from '@/lib/grade';

export const dynamic = 'force-dynamic';

/**
 * Finish a test and score it.
 *
 * Scoring happens on the server and nowhere else: the correct answers never
 * reach the browser before submission, so the score cannot be computed or
 * altered client-side. Re-submitting is a no-op rather than an error, which
 * keeps the auto-submit-on-timeout path safe to retry.
 *
 * The marking itself lives in lib/grade, because a test whose clock ran out
 * with the browser closed is scored by the same code on the next page load.
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

  const { correct, wrong, unattempted, score } = await scoreResponses(
    attempt.questions,
    attempt.responses,
  );

  attempt.correct = correct;
  attempt.wrong = wrong;
  attempt.unattempted = unattempted;
  attempt.score = score;
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
