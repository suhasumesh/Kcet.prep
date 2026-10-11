import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json(await buildAnalytics(userId));
}
