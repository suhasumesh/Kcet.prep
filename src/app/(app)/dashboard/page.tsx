import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { buildAnalytics } from '@/lib/analytics';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { bankTotals } from '@/lib/bankStats';
import { SUBJECT_STYLE, formatDuration } from '@/lib/exam';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import clsx from '@/lib/clsx';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview' };

const STATUS: Record<string, string> = {
  strong: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  steady: 'bg-sky-50 text-sky-700 ring-sky-200',
  shaky: 'bg-amber-50 text-amber-800 ring-amber-200',
  weak: 'bg-coral-50 text-coral-700 ring-coral-200',
  untested: 'bg-ink-100 text-ink-500 ring-line',
};

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-5">
      <p className="label">{label}</p>
      <p className="display mt-2 text-[1.9rem] leading-none">{value}</p>
      {sub && <p className="mt-1.5 font-mono text-[11px] text-ink-400">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = (await currentUser()) as any;
  if (!user) redirect('/login');

  await connectDB();
  const [analytics, totalsOfBank, running] = await Promise.all([
    buildAnalytics(String(user._id)),
    bankTotals(),
    Attempt.findOne({ user: user._id, submittedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .select('title expiresAt questions')
      .lean<any>(),
  ]);
  const bankTotal = totalsOfBank.kcet;
  const pradeepTotal = totalsOfBank.pradeep;

  const { totals, bySubject, weakest } = analytics;
  const firstName = String(user.name).split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="display-lg mt-2 text-4xl sm:text-[2.8rem]">
            {totals.tests === 0 ? 'Welcome, ' : 'Welcome back, '}
            <span className="text-coral-500">{firstName}</span>
          </h1>
          <p className="mt-2 text-[15px] text-ink-600">
            {bankTotal.toLocaleString('en-IN')} real KCET questions
            {pradeepTotal > 0 && <> · {pradeepTotal.toLocaleString('en-IN')} from Pradeep</>} · free, always.
          </p>
        </div>
        <Link href="/practice" className="btn-primary">Start a test</Link>
      </header>

      {running && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-coral-200 bg-coral-50 p-5">
          <div>
            <p className="label text-coral-600">In progress</p>
            <p className="mt-1 text-[15px] font-semibold text-coral-900">{running.title}</p>
            <p className="font-mono text-[12px] text-coral-700/70">{running.questions.length} questions</p>
          </div>
          <Link href={`/test/${running._id}`} className="btn-primary">Resume</Link>
        </div>
      )}

      {totals.tests === 0 ? (
        <section className="card overflow-hidden">
          <div className="p-7">
            <h2 className="display text-2xl">Start here</h2>
            <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-600">
              Take one paper first. Afterwards you get the full working for every question, plus a
              breakdown of which chapters let you down.
            </p>
          </div>
          <div className="rule-grid border-0 border-t border-line sm:grid-cols-3">
            {[
              { href: '/practice?mode=pyq', n: '01', t: 'A past paper', b: 'Sit a real KCET paper exactly as it was set.' },
              { href: '/practice?mode=subject', n: '02', t: 'One subject', b: '60 mixed questions, 80 minutes, exam pace.' },
              { href: '/practice?mode=chapter', n: '03', t: 'One chapter', b: 'Short, focused practice on a single topic.' },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="group p-6 transition-colors hover:!bg-paper">
                <p className="label">{c.n}</p>
                <p className="mt-3 text-[15px] font-semibold text-ink-900 group-hover:text-coral-600">{c.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{c.b}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="rule-grid sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tests taken" value={String(totals.tests)} />
          <Metric label="Questions" value={totals.questions.toLocaleString('en-IN')} sub="answered" />
          <Metric label="Accuracy" value={`${totals.accuracy}%`} sub={`${totals.correct} correct`} />
          <Metric label="Time spent" value={formatDuration(totals.timeSec * 1000)} />
        </div>
      )}

      <section className="card p-6">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <p className="label">Activity</p>
            <h2 className="display mt-1.5 text-xl">Every day you practised</h2>
          </div>
        </div>
        <ActivityHeatmap activity={analytics.activity} />
      </section>

      {bySubject.length > 0 && (
        <section className="grid gap-5 lg:grid-cols-2">
          {/* min-w-0: a grid item defaults to min-width:auto, so one wide
              child -- a long chapter name, a mono figure that will not wrap
              -- stretches the whole card past the viewport and the page
              scrolls sideways on a phone. */}
          <div className="card min-w-0 p-6">
            <p className="label">By subject</p>
            <h2 className="display mt-1.5 text-xl">Where you stand</h2>
            <div className="mt-6 space-y-5">
              {bySubject.map((s) => (
                <div key={s.subject}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[14px] font-medium text-ink-800">{s.subject}</span>
                    <span className="font-mono text-[12px] tabular-nums text-ink-500">
                      {s.accuracy}% <span className="text-ink-300">· {s.correct}/{s.attempted}</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div className={clsx('h-full rounded-full', SUBJECT_STYLE[s.subject]?.bar ?? 'bg-navy-900')}
                      style={{ width: `${Math.max(2, s.accuracy)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card min-w-0 p-6">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="label">Priority</p>
                <h2 className="display mt-1.5 text-xl">Needs work</h2>
              </div>
              <Link href="/analytics" className="text-[13px] font-medium text-coral-600 hover:underline">
                All chapters
              </Link>
            </div>
            {weakest.length === 0 ? (
              <p className="mt-5 text-[14px] leading-relaxed text-ink-500">
                Nothing is clearly weak yet. Take a few more tests and the gaps will show up here.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {weakest.slice(0, 6).map((c) => (
                  <li key={`${c.subject}|${c.chapter}`} className="flex items-center gap-3 py-3">
                    <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', SUBJECT_STYLE[c.subject]?.dot)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink-900">{c.chapter}</span>
                      <span className="font-mono text-[11px] text-ink-400">{c.subject} · {c.correct}/{c.attempted}</span>
                    </span>
                    <span className={clsx('chip', STATUS[c.status])}>{c.accuracy}%</span>
                    <Link
                      href={`/practice?mode=chapter&subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`}
                      className="shrink-0 text-[13px] font-medium text-coral-600 hover:underline"
                    >
                      Drill
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {pradeepTotal > 0 && (
        <Link href="/library" className="group flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-6 transition-colors hover:border-ink-300">
          <div>
            <p className="label">Reference books</p>
            <h2 className="display mt-1.5 text-xl group-hover:text-coral-600">
              Practise from Pradeep
            </h2>
            <p className="mt-1.5 text-[14px] text-ink-500">
              {pradeepTotal.toLocaleString('en-IN')} chapter-wise MCQs, kept separate from your exam stats.
            </p>
          </div>
          <span className="btn-secondary">Open</span>
        </Link>
      )}
    </div>
  );
}
