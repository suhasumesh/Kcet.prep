import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const KINDS = new Set(['blur', 'fullscreen-exit', 'tab-hidden', 'copy', 'contextmenu', 'resize']);

/** Record that the student left the test window. Capped so it cannot be spammed. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { kind } = await req.json().catch(() => ({}));
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).select('submittedAt violations');
  if (!attempt) return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  if (attempt.submittedAt) return NextResponse.json({ ok: true, count: attempt.violations.length });

  if (attempt.violations.length < 200) {
    await Attempt.updateOne({ _id: attempt._id }, { $push: { violations: { kind, at: new Date() } } });
  }
  return NextResponse.json({ ok: true, count: Math.min(attempt.violations.length + 1, 200) });
}
