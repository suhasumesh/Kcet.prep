import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { requireUserId } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';
import { buildPlan } from '@/lib/planner';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days') || 14);

  await connectDB();
  // Neither needs the other, and the analytics build is much the slower of
  // the two, so waiting for the settings row first simply added its round
  // trip to the total.
  const [user, analytics] = await Promise.all([
    User.findById(userId).select('dailyMinutes targetYear').lean<any>(),
    buildAnalytics(userId),
  ]);
  const plan = buildPlan(analytics, { dailyMinutes: user?.dailyMinutes ?? 90, days });

  return NextResponse.json({ ...plan, dailyMinutes: user?.dailyMinutes ?? 90 });
}

/** Update how much time the student can give each day, then re-plan. */
export async function PATCH(req: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { dailyMinutes } = await req.json().catch(() => ({}));
  const minutes = Number(dailyMinutes);
  if (!Number.isFinite(minutes) || minutes < 20 || minutes > 600) {
    return NextResponse.json({ error: 'Choose between 20 and 600 minutes.' }, { status: 400 });
  }
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { dailyMinutes: Math.round(minutes) } });
  return NextResponse.json({ ok: true });
}
