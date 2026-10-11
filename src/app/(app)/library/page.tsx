import { Suspense } from 'react';
import { connectDB } from '@/lib/db';
import { Question } from '@/lib/models/Question';
import PracticeBuilder from '../practice/PracticeBuilder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pradeep practice' };

export default async function LibraryPage() {
  await connectDB();
  const [total, books] = await Promise.all([
    Question.countDocuments({ bank: 'pradeep' }),
    Question.distinct('book', { bank: 'pradeep' }),
  ]);

  if (total === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="label">Reference books</p>
        <h1 className="display mt-2 text-3xl">Nothing loaded yet</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-600">
          Put the Pradeep volumes in <code className="font-mono text-[13px]">Ref_Books/</code> and
          run <code className="font-mono text-[13px]">python tools/extract_pradeep_all.py</code>,
          then re-seed. Their chapter-wise MCQs will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="label">Reference books</p>
        <h1 className="display mt-2 text-4xl">Pradeep practice</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          {total.toLocaleString('en-IN')} single-correct MCQs taken chapter by chapter from{' '}
          {books.sort().join(', ')}. Scored and reviewed exactly like a KCET paper, but kept
          separate so your exam analytics stay clean.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-ink-400">Loading the books…</p>}>
        <PracticeBuilder bank="pradeep" />
      </Suspense>
    </div>
  );
}
