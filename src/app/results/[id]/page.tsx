import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { sessionUserId } from '@/lib/auth';
import { SUBJECT_STYLE, formatDuration } from '@/lib/exam';
import clsx from '@/lib/clsx';
import Review, { type ReviewRow } from './Review';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Results' };

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white p-3.5 ring-1 ring-line">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className={clsx('mt-0.5 text-xl font-bold tabular-nums', tone ?? 'text-ink-900')}>{value}</p>
    </div>
  );
}

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ended?: string };
}) {
  const userId = sessionUserId();
  if (!userId) redirect('/login');

  await connectDB();
  const attempt = await Attempt.findOne({ _id: params.id, user: userId }).lean<any>();
  if (!attempt) notFound();
  if (!attempt.submittedAt) redirect(`/test/${params.id}`);

  const docs = await Question.find({ _id: { $in: attempt.questions } }).lean<any[]>();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const respByQ = new Map((attempt.responses ?? []).map((r: any) => [String(r.question), r]));

  const rows: ReviewRow[] = attempt.questions
    .map((qid: any) => {
      const d = byId.get(String(qid));
      if (!d) return null;
      const r: any = respByQ.get(String(qid)) ?? {};
      return {
        q: {
          id: String(qid),
          subject: d.subject,
          chapter: d.chapter,
          year: d.year,
          number: d.number,
          bank: d.bank ?? 'kcet',
          book: d.book ?? '',
          optionStyle: d.optionStyle ?? 'number',
          stemText: d.stemText,
          stemImages: d.stemImages ?? [],
          options: (d.options ?? []).map((o: any) => ({ letter: o.letter, text: o.text, img: o.img ?? null })),
          answer: d.answer,
          solutionText: d.solutionText,
          solutionSource: d.solutionSource ?? '',
          solutionImages: d.solutionImages ?? [],
        },
        selected: r.selected ?? null,
        correct: Boolean(r.selected && r.selected === d.answer),
        timeSpentMs: r.timeSpentMs ?? 0,
        markedForReview: Boolean(r.markedForReview),
      };
    })
    .filter(Boolean) as ReviewRow[];

  const total = rows.length;
  const accuracy = attempt.correct + attempt.wrong
    ? Math.round((attempt.correct / (attempt.correct + attempt.wrong)) * 100)
    : 0;
  const percent = total ? Math.round((attempt.score / total) * 100) : 0;
  const timeMs = rows.reduce((s, r) => s + r.timeSpentMs, 0);

  // Per-chapter breakdown so the weakest topics in this paper are obvious.
  const perChapter = new Map<string, { subject: string; chapter: string; n: number; ok: number }>();
  for (const r of rows) {
    const k = `${r.q.subject}|${r.q.chapter}`;
    const e = perChapter.get(k) ?? { subject: r.q.subject, chapter: r.q.chapter, n: 0, ok: 0 };
    e.n++;
    if (r.correct) e.ok++;
    perChapter.set(k, e);
  }
  const chapterRows = [...perChapter.values()]
    .map((c) => ({ ...c, pct: Math.round((c.ok / c.n) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.n - a.n);
  const weakHere = chapterRows.filter((c) => c.pct < 60 && c.chapter !== 'Unclassified');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-coral-600 hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900">{attempt.title}</h1>
          <p className="mt-0.5 text-sm text-ink-600">
            Submitted {new Date(attempt.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            {attempt.autoSubmitted && ' · submitted automatically'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/practice" className="btn-secondary">New test</Link>
          <Link href="/analytics" className="btn-primary">See analytics</Link>
        </div>
      </header>

      {searchParams.ended === 'violations' && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          This test was submitted automatically because the test window was left too many times.
        </p>
      )}
      {searchParams.ended === 'time' && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          Time ran out, so the test was submitted with the answers you had given.
        </p>
      )}

      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="label">Score</p>
            <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-ink-900">
              {attempt.score}
              <span className="text-xl font-semibold text-ink-400"> / {total}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-600">{percent}% of the paper</p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Correct" value={String(attempt.correct)} tone="text-emerald-700" />
            <Stat label="Wrong" value={String(attempt.wrong)} tone="text-rose-700" />
            <Stat label="Blank" value={String(attempt.unattempted)} tone="text-ink-500" />
            <Stat label="Accuracy" value={`${accuracy}%`} />
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-500">
          KCET does not deduct marks for a wrong answer, so a guess always beats a blank.
          {attempt.unattempted > 0 && ` You left ${attempt.unattempted} blank.`}
          {timeMs > 0 && ` Total time on questions: ${formatDuration(timeMs)}.`}
        </p>
      </section>

      {chapterRows.length > 1 && (
        <section className="card mb-5 p-5">
          <h2 className="text-base font-semibold text-ink-900">How each chapter went</h2>
          {weakHere.length > 0 && (
            <p className="mt-1 text-sm text-ink-600">
              Weakest here: {weakHere.slice(0, 3).map((c) => c.chapter).join(', ')}.
            </p>
          )}
          <ul className="mt-4 space-y-2.5">
            {chapterRows.map((c) => (
              <li key={`${c.subject}|${c.chapter}`} className="flex items-center gap-3">
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', SUBJECT_STYLE[c.subject]?.dot)} />
                <span className="w-48 shrink-0 truncate text-sm text-ink-800 sm:w-64">{c.chapter}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className={clsx(
                      'block h-full rounded-full',
                      c.pct >= 75 ? 'bg-emerald-500' : c.pct >= 50 ? 'bg-amber-400' : 'bg-rose-500',
                    )}
                    style={{ width: `${Math.max(3, c.pct)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm tabular-nums text-ink-600">
                  {c.ok}/{c.n}
                </span>
                {c.chapter !== 'Unclassified' && (
                  <Link
                    href={`/practice?mode=chapter&subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`}
                    className="shrink-0 text-sm font-medium text-coral-600 hover:underline"
                  >
                    Drill
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 text-base font-semibold text-ink-900">Question by question</h2>
      <Review rows={rows} />
    </div>
  );
}
