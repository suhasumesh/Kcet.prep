import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Start (or resume) the clock.
 *
 * The deadline is fixed the first time the student actually enters the test, so
 * time spent on the instructions screen is not charged to them. Calling again
 * just returns the existing deadline, which makes resuming after a refresh safe.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).select(
    'beganAt expiresAt durationSec submittedAt',
  );
  if (!attempt) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

  if (!attempt.beganAt && !attempt.submittedAt) {
    const now = new Date();
    attempt.beganAt = now;
    attempt.expiresAt = new Date(now.getTime() + attempt.durationSec * 1000);
    await attempt.save();
  }

  return NextResponse.json({
    expiresAt: attempt.expiresAt.toISOString(),
    submitted: Boolean(attempt.submittedAt),
    serverNow: Date.now(),
  });
}
