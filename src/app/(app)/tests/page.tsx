import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { SUBJECT_STYLE, MODE_LABEL, type Mode } from '@/lib/exam';
import clsx from '@/lib/clsx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My tests' };

export default async function TestsPage() {
  const user = (await currentUser()) as any;
  if (!user) redirect('/login');

  await connectDB();
  const rows = await Attempt.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('title mode subjects year score correct wrong unattempted questions submittedAt createdAt expiresAt autoSubmitted violations')
    .lean<any[]>();

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="label">History</p>
        <h1 className="display mt-2 text-3xl">No tests yet</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-600">
          Your past papers and scores will be listed here, each with its full solutions.
        </p>
        <Link href="/practice" className="btn-primary mt-5">Take your first test</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">History</p>
          <h1 className="display mt-2 text-4xl">Your tests</h1>
          <p className="mt-2 font-mono text-[12px] text-ink-500">
            {rows.length} {rows.length === 1 ? 'test' : 'tests'}, newest first.
          </p>
        </div>
        <Link href="/practice" className="btn-primary">New test</Link>
      </header>

      <ul className="space-y-2.5">
        {rows.map((a) => {
          const total = a.questions.length;
          const live = !a.submittedAt && new Date(a.expiresAt) > new Date();
          const abandoned = !a.submittedAt && !live;
          const pct = total && a.submittedAt ? Math.round((a.score / total) * 100) : 0;
          return (
            <li key={String(a._id)} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-900">{a.title}</p>
                  {a.subjects?.map((s: string) => (
                    <span key={s} className={clsx('chip', SUBJECT_STYLE[s]?.chip)}>{s}</span>
                  ))}
                  {live && <span className="chip bg-coral-50 text-coral-600 ring-coral-200">In progress</span>}
                  {abandoned && <span className="chip bg-ink-100 text-ink-600 ring-line">Not finished</span>}
                  {a.autoSubmitted && (
                    <span className="chip bg-amber-50 text-amber-700 ring-amber-200">Auto-submitted</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {MODE_LABEL[a.mode as Mode]} · {total} questions ·{' '}
                  {new Date(a.submittedAt ?? a.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {a.violations?.length > 0 && ` · ${a.violations.length} window warnings`}
                </p>
              </div>

              {a.submittedAt ? (
                <>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="font-mono text-[17px] font-semibold tabular-nums text-ink-900">{a.score}<span className="text-sm text-ink-400">/{total}</span></p>
                      <p className="label mt-0.5">Score</p>
                    </div>
                    <div>
                      <p className="font-mono text-[17px] font-semibold tabular-nums text-emerald-700">{a.correct}</p>
                      <p className="label mt-0.5">Right</p>
                    </div>
                    <div>
                      <p className="font-mono text-[17px] font-semibold tabular-nums text-rose-700">{a.wrong}</p>
                      <p className="label mt-0.5">Wrong</p>
                    </div>
                    <div>
                      <p className="font-mono text-[17px] font-semibold tabular-nums text-ink-500">{a.unattempted}</p>
                      <p className="label mt-0.5">Blank</p>
                    </div>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-500',
                        )}
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[11px] tabular-nums text-ink-500">{pct}%</p>
                  </div>
                  <Link href={`/results/${a._id}`} className="btn-secondary shrink-0">Solutions</Link>
                </>
              ) : live ? (
                <Link href={`/test/${a._id}`} className="btn-primary shrink-0">Resume</Link>
              ) : (
                <Link href={`/results/${a._id}`} className="btn-secondary shrink-0">View</Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
