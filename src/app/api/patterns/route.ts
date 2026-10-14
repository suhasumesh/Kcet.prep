import { NextResponse } from 'next/server';
import { getReport } from '@/lib/patterns';

export const dynamic = 'force-dynamic';

/** The exam-pattern report: what KCET asks, chapter by chapter, year by year. */
export async function GET() {
  return NextResponse.json(await getReport());
}
