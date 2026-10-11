import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const u = user as any;
  return NextResponse.json({
    user: {
      id: String(u._id),
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      streak: u.streak,
      longestStreak: u.longestStreak,
      dailyMinutes: u.dailyMinutes,
      targetYear: u.targetYear,
    },
  });
}
