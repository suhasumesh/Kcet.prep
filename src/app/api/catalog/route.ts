import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';

export const dynamic = 'force-dynamic';

/**
 * What the question bank actually holds: chapters and years per subject with
 * live counts. The test builder reads this so it can never offer a chapter
 * that has no questions behind it.
 */
// Four aggregations over the whole bank, on a collection that only changes
// when it is re-seeded. Every visit to the practice builder was paying for
// them again, which on a cold start is the slowest thing the app does.
const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 10 * 60 * 1000;

export async function GET(req: Request) {
  // 'kcet' is the exam papers; 'pradeep' is the reference-book bank. They are
  // never mixed in a test, so the catalogue is always scoped to one.
  const bank = new URL(req.url).searchParams.get('bank') === 'pradeep' ? 'pradeep' : 'kcet';

  const hit = cache.get(bank);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.body);

  await connectDB();
  const match = { $match: { bank: bank === 'kcet' ? { $ne: 'pradeep' } : 'pradeep' } };

  const [chapters, years, totals, books] = await Promise.all([
    Question.aggregate([
      match,
      { $group: { _id: { subject: '$subject', chapter: '$chapter', puc: '$puc' }, count: { $sum: 1 } } },
      { $sort: { '_id.subject': 1, '_id.puc': 1, '_id.chapter': 1 } },
    ]),
    Question.aggregate([
      match,
      // only whole papers can be offered as a year to sit end to end
      { $match: { year: { $gt: 0 }, paper: true } },
      { $group: { _id: { subject: '$subject', year: '$year' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1 } },
    ]),
    Question.aggregate([match, { $group: { _id: '$subject', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Question.aggregate([
      match,
      { $match: { book: { $ne: '' } } },
      { $group: { _id: { subject: '$subject', book: '$book' }, count: { $sum: 1 } } },
      { $sort: { '_id.book': 1 } },
    ]),
  ]);

  type Entry = {
    chapters: { name: string; puc: number; count: number }[];
    years: { year: number; count: number }[];
    books: { book: string; count: number }[];
    total: number;
  };
  const bySubject: Record<string, Entry> = {};
  const ensure = (s: string) => (bySubject[s] ??= { chapters: [], years: [], books: [], total: 0 });

  for (const t of totals) ensure(t._id).total = t.count;
  for (const c of chapters) {
    ensure(c._id.subject).chapters.push({ name: c._id.chapter, puc: c._id.puc ?? 0, count: c.count });
  }
  for (const y of years) ensure(y._id.subject).years.push({ year: y._id.year, count: y.count });
  for (const b of books) ensure(b._id.subject).books.push({ book: b._id.book, count: b.count });

  const allYears = [...new Set(years.map((y) => y._id.year))].sort((a, b) => b - a);

  const body = { bank, subjects: bySubject, years: allYears };
  cache.set(bank, { at: Date.now(), body });
  return NextResponse.json(body);
}
