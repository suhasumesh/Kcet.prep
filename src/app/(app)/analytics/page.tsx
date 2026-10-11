import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';
import { SUBJECT_STYLE, formatDuration } from '@/lib/exam';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import MasteryGrid from '@/components/MasteryGrid';
import ScoreTrend from '@/components/ScoreTrend';
import clsx from '@/lib/clsx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const user = (await currentUser()) as any;
  if (!user) redirect('/login');

  const a = await buildAnalytics(String(user._id));

  if (a.totals.tests === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="label">Analytics</p>
        <h1 className="display mt-2 text-3xl">Nothing to analyse yet</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-600">
          Take one test and this page fills up with your accuracy per chapter, where your time goes,
          and what to fix first.
        </p>
        <Link href="/practice" className="btn-primary mt-5">Take a test</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Your record</p>
        <h1 className="display mt-2 text-4xl">Analytics</h1>
        <p className="mt-2 font-mono text-[12px] text-ink-500">
          {a.totals.tests} {a.totals.tests === 1 ? 'test' : 'tests'} ·{' '}
          {a.totals.questions.toLocaleString('en-IN')} questions answered ·{' '}
          {formatDuration(a.totals.timeSec * 1000)} spent
        </p>
      </header>

      <section className="card p-6">
        <p className="label">Activity</p>
          <h2 className="display mt-1.5 text-xl">Practice activity</h2>
        <p className="mb-5 mt-1.5 text-[14px] text-ink-500">
          Consistency beats intensity — keep the squares filled.
        </p>
        <ActivityHeatmap activity={a.activity} />
      </section>

      {a.trend.length > 1 && (
        <section className="card p-6">
          <p className="label">Progress</p>
          <h2 className="display mt-1.5 text-xl">Score trend</h2>
          <p className="mb-5 mt-1.5 text-[14px] text-ink-500">Percentage scored in each test, oldest first.</p>
          <ScoreTrend trend={a.trend} />
        </section>
      )}

      <section className="card p-6">
        <p className="label">Mastery</p>
          <h2 className="display mt-1.5 text-xl">Chapter mastery</h2>
        <p className="mb-5 mt-1.5 text-[14px] text-ink-500">
          Confidence-weighted, so a chapter has to be proved more than once before it counts as strong.
        </p>
        <MasteryGrid chapters={a.chapters} />
      </section>

      {a.weakest.length > 0 && (
        <section className="card p-6">
          <p className="label">Priority</p>
          <h2 className="display mt-1.5 text-xl">Fix these first</h2>
          <ul className="mt-3 divide-y divide-line">
            {a.weakest.map((c) => (
              <li key={`${c.subject}|${c.chapter}`} className="flex flex-wrap items-center gap-3 py-3">
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', SUBJECT_STYLE[c.subject]?.dot)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{c.chapter}</span>
                  <span className="text-xs text-ink-500">
                    {c.subject} · {c.correct}/{c.attempted} correct · about {c.avgTimeSec}s per question
                  </span>
                </span>
                <span className="w-24 shrink-0">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full rounded-full bg-rose-500" style={{ width: `${Math.max(4, c.accuracy)}%` }} />
                  </span>
                </span>
                <Link
                  href={`/practice?mode=chapter&subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`}
                  className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                >
                  Practise
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.untested.length > 0 && (
        <section className="card p-6">
          <p className="label">Coverage</p>
          <h2 className="display mt-1.5 text-xl">Not touched yet</h2>
          <p className="mb-4 mt-1.5 text-[14px] text-ink-500">
            {a.untested.length} chapters in the bank you have not practised.
          </p>
          <div className="flex flex-wrap gap-2">
            {a.untested.slice(0, 30).map((u) => (
              <Link
                key={`${u.subject}|${u.chapter}`}
                href={`/practice?mode=chapter&subject=${encodeURIComponent(u.subject)}&chapter=${encodeURIComponent(u.chapter)}`}
                className="chip bg-white text-ink-700 ring-line hover:ring-coral-200"
              >
                <span className={clsx('h-1.5 w-1.5 rounded-full', SUBJECT_STYLE[u.subject]?.dot)} />
                {u.chapter}
                <span className="text-ink-400">{u.available}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
