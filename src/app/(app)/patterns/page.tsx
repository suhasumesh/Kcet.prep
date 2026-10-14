import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getReport } from '@/lib/patterns';
import PatternsView from './PatternsView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Patterns' };

export default async function PatternsPage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const report = await getReport();

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Twenty-one years of papers</p>
        <h1 className="display mt-2 text-4xl">What KCET actually asks</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Every chapter, how many marks it has been worth in a real paper, which way it is
          trending, and the formula behind each repeat. Practise any row with one tap.
        </p>
      </header>
      <PatternsView report={report} />
    </div>
  );
}
