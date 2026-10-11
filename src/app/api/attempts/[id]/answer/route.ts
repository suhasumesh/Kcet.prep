import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  index: z.number().int().min(0),
  selected: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
  markedForReview: z.boolean().optional(),
  visited: z.boolean().optional(),
  addTimeMs: z.number().int().min(0).max(3_600_000).optional(),
});

/** Patch one response. Called as the student clicks, so it stays small. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const { index, selected, markedForReview, visited, addTimeMs } = parsed.data;

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).select(
    'submittedAt expiresAt responses',
  );
  if (!attempt) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  if (attempt.submittedAt) {
    return NextResponse.json({ error: 'This test has been submitted.' }, { status: 409 });
  }
  // The deadline is enforced here too: a late answer must not count.
  if (new Date() > attempt.expiresAt) {
    return NextResponse.json({ error: 'Time is up.', expired: true }, { status: 409 });
  }
  if (index >= attempt.responses.length) {
    return NextResponse.json({ error: 'Bad question index' }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  if (selected !== undefined) set[`responses.${index}.selected`] = selected;
  if (markedForReview !== undefined) set[`responses.${index}.markedForReview`] = markedForReview;
  if (visited !== undefined) set[`responses.${index}.visited`] = visited;

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (addTimeMs) update.$inc = { [`responses.${index}.timeSpentMs`]: addTimeMs };
  if (Object.keys(update).length) await Attempt.updateOne({ _id: attempt._id }, update);

  return NextResponse.json({ ok: true });
}
