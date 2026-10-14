import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';

/**
 * How many questions each bank holds.
 *
 * Two counts over the whole collection, shown as a headline on the dashboard,
 * for a number that changes only when the bank is re-seeded. Every visit was
 * paying for both. Held for ten minutes instead.
 */
let cache: { at: number; kcet: number; pradeep: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function bankTotals(): Promise<{ kcet: number; pradeep: number }> {
  if (cache && Date.now() - cache.at < TTL_MS) return { kcet: cache.kcet, pradeep: cache.pradeep };
  await connectDB();
  const [kcet, pradeep] = await Promise.all([
    Question.countDocuments({ bank: { $ne: 'pradeep' } }),
    Question.countDocuments({ bank: 'pradeep' }),
  ]);
  cache = { at: Date.now(), kcet, pradeep };
  return { kcet, pradeep };
}
