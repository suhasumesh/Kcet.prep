import { Suspense } from 'react';
import PracticeBuilder from './PracticeBuilder';

export const metadata = { title: 'Practice' };

export default function PracticePage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="label">Karnataka CET</p>
        <h1 className="display mt-2 text-4xl">Build a test</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-600">
          Every question comes from a real KCET paper. One mark each, nothing deducted for a wrong
          answer.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-ink-400">Loading the question bank…</p>}>
        <PracticeBuilder bank="kcet" />
      </Suspense>
    </div>
  );
}
