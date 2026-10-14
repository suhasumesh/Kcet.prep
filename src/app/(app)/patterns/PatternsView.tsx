'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from '@/lib/clsx';
import { SUBJECT_STYLE } from '@/lib/exam';
import type { ChapterRow, PatternReport } from '@/lib/patterns';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'] as const;

/**
 * The pattern report.
 *
 * A student plans revision around one number: how many marks is this chapter
 * worth? So that number leads every row, in marks per paper rather than a
 * total, because "6.1 marks every year" is a decision and "90 questions since
 * 2004" is trivia.
 *
 * The per-year strip beneath it is the evidence for that number, and it marks
 * the years we hold only part of — the old papers came off scans and some are
 * short. Those years are excluded from the average and shown hollow, so a
 * sparse bar never reads as a quiet year in the exam when it is really a thin
 * year in the archive.
 */

function Spark({
  perYear, years, thin, max,
}: {
  perYear: Record<string, number>; years: number[]; thin: number[]; max: number;
}) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {years.map((y) => {
        const n = perYear[String(y)] ?? 0;
        const isThin = thin.includes(y);
        const h = max > 0 ? Math.round((n / max) * 26) : 0;
        return (
          <div key={y} className="group/bar relative flex h-[26px] w-[7px] items-end">
            <div
              className={clsx(
                'w-full rounded-[1px] transition-colors',
                n === 0 ? 'bg-ink-200/60' : isThin ? 'bg-navy-300' : 'bg-navy-600',
              )}
              style={{ height: `${Math.max(h, n > 0 ? 3 : 1)}px` }}
            />
            <span
              className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden
                         -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-0.5
                         font-mono text-[10px] text-white group-hover/bar:block"
            >
              {y}: {n}
              {isThin ? ' (partial)' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendTag({ trend, delta }: { trend: string; delta: number }) {
  if (trend === 'steady') {
    return <span className="font-mono text-[11px] text-ink-400">steady</span>;
  }
  const up = trend === 'rising';
  return (
    <span
      className={clsx(
        'font-mono text-[11px] font-medium',
        up ? 'text-chemistry' : 'text-coral-600',
      )}
    >
      {up ? '▲' : '▼'} {up ? '+' : ''}{delta}
    </span>
  );
}

export default function PatternsView({ report }: { report: PatternReport }) {
  const router = useRouter();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('Physics');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const r = report.subjects[subject];
  const style = SUBJECT_STYLE[subject];

  const chapters = useMemo(
    () => r.chapters.filter((c) => c.chapter !== 'Unclassified' && c.puc !== 0),
    [r],
  );
  const legacy = useMemo(() => r.chapters.filter((c) => c.puc === 0), [r]);
  const maxYear = useMemo(
    () => Math.max(1, ...chapters.flatMap((c) => Object.values(c.perYear))),
    [chapters],
  );
  const covered = chapters.reduce((a, c) => a + c.perPaper, 0);

  async function practise(body: Record<string, unknown>, tag: string) {
    setBusy(tag);
    setError('');
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bank: 'kcet', secureMode: false, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start that set.');
      router.push(`/test/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start that set.');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- subject tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => { setSubject(s); setOpen(null); }}
            className={clsx(
              'rounded-full px-4 py-1.5 text-[13px] font-medium ring-1 transition-colors',
              s === subject
                ? 'bg-navy-900 text-white ring-navy-900'
                : 'bg-white text-ink-600 ring-line hover:bg-ink-50',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------- what this rests on */}
      <div className="card flex flex-wrap items-baseline gap-x-6 gap-y-2 p-4 text-[13px]">
        <span className="text-ink-700">
          <strong className="font-semibold text-ink-900">{r.completeYears.length}</strong> complete
          papers averaged
          <span className="ml-1.5 font-mono text-[11px] text-ink-400">
            {r.completeYears.join(' · ')}
          </span>
        </span>
        <span className="text-ink-500">
          {r.total} questions held · {r.classified} placed in a chapter
          {r.unclassified > 0 && <> · {r.unclassified} unplaced</>}
        </span>
        {r.thinYears.length > 0 && (
          <span className="text-ink-400">
            partial years shown hollow and left out of the average:{' '}
            <span className="font-mono text-[11px]">{r.thinYears.join(' ')}</span>
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-coral-200 bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------- table */}
      <div className="card divide-y divide-line overflow-hidden">
        <div className="flex items-center gap-3 bg-ink-50/70 px-4 py-2 font-mono text-[10px] uppercase tracking-label text-ink-400">
          <span className="w-14 text-right">marks</span>
          <span className="flex-1">chapter</span>
          <span className="hidden w-[150px] sm:block">{r.years[0]} → {r.years[r.years.length - 1]}</span>
          <span className="w-16 text-right">trend</span>
          <span className="w-8" />
        </div>

        {chapters.map((c) => (
          <ChapterBlock
            key={c.chapter}
            c={c}
            years={r.years}
            thin={r.thinYears}
            max={maxYear}
            subject={subject}
            accent={style.text}
            isOpen={open === c.chapter}
            onToggle={() => setOpen(open === c.chapter ? null : c.chapter)}
            onPractise={practise}
            busy={busy}
          />
        ))}
      </div>

      <p className="px-1 text-[13px] text-ink-500">
        These {chapters.length} chapters account for about{' '}
        <strong className="font-semibold text-ink-800">{Math.round(covered)}</strong> of the{' '}
        {report.paperSize} marks in a {subject} paper.
      </p>

      {/* What qualifies the marks column is the unplaced count inside the
          averaged years, not the overall one: a question missing from a year
          already excluded as partial costs that column nothing. Both are
          reported, because a reader deserves to know the difference. */}
      {r.unclassifiedInCompleteYears === 0 ? (
        <p className="px-1 text-[13px] text-ink-500">
          Every question in those {r.completeYears.length} complete papers is placed in a chapter,
          so the marks column accounts for all {report.paperSize} marks.
          {r.unclassified > 0 && (
            <>
              {' '}
              A further {r.unclassified} question{r.unclassified === 1 ? '' : 's'} from the partial
              years could not be placed; those years are left out of the average anyway, so the
              bars show them only as history.
            </>
          )}
        </p>
      ) : (
        <div className="card border-amber-300/70 bg-amber-50 p-4">
          <p className="label text-amber-700">Where this is incomplete</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900">
            <strong className="font-semibold">{r.unclassifiedInCompleteYears}</strong> of the{' '}
            {r.questionsInCompleteYears} questions in the averaged papers (
            {Math.round((100 * r.unclassifiedInCompleteYears) / r.questionsInCompleteYears)}%) are
            not placed in any chapter, so the marks column understates by about that much. Nearly
            all of them are questions printed as images — an equation or a diagram with almost no
            text — which the extractor could not read well enough to file.
          </p>
        </div>
      )}

      {legacy.length > 0 && (
        <div className="card p-4">
          <p className="label">Dropped from the syllabus</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
            KCET examined these in older papers and does not any more, so they are left out of the
            counts above:{' '}
            {legacy.map((c, i) => (
              <span key={c.chapter}>
                {i > 0 && ', '}
                <span className="text-ink-800">{c.chapter.replace(' (old syllabus)', '')}</span>{' '}
                <span className="font-mono text-[11px] text-ink-400">{c.total}</span>
              </span>
            ))}
            .
          </p>
        </div>
      )}
    </div>
  );
}

function ChapterBlock({
  c, years, thin, max, subject, accent, isOpen, onToggle, onPractise, busy,
}: {
  c: ChapterRow; years: number[]; thin: number[]; max: number; subject: string;
  accent: string; isOpen: boolean; onToggle: () => void;
  onPractise: (b: Record<string, unknown>, tag: string) => void; busy: string | null;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-50/70"
      >
        <span className={clsx('w-14 text-right font-mono text-[15px] font-semibold', accent)}>
          {c.perPaper.toFixed(1)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink-900">{c.chapter}</span>
          <span className="font-mono text-[11px] text-ink-400">
            {c.total} asked{c.topics.length > 0 && <> · {c.topics.length} topics</>}
          </span>
        </span>
        <span className="hidden w-[150px] sm:block">
          <Spark perYear={c.perYear} years={years} thin={thin} max={max} />
        </span>
        <span className="w-16 text-right">
          <TrendTag trend={c.trend} delta={c.trendDelta} />
        </span>
        <span className={clsx('w-8 text-center text-ink-300 transition-transform', isOpen && 'rotate-90')}>
          ›
        </span>
      </button>

      {isOpen && (
        <div className="space-y-1.5 border-t border-line bg-ink-50/40 px-4 py-3">
          {c.topics.length === 0 && (
            <p className="text-[13px] text-ink-500">
              No topic breakdown for this chapter yet — practise it whole.
            </p>
          )}
          {c.topics.map((t) => (
            <div
              key={t.topic}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 ring-1 ring-line"
            >
              <span className="w-8 text-right font-mono text-[14px] font-semibold text-ink-800">
                {t.n}
              </span>
              <span className="min-w-[9rem] flex-1 text-[13.5px] text-ink-800">{t.topic}</span>
              <code className="order-last w-full rounded bg-navy-50/70 px-2 py-1 font-mono text-[12px] text-navy-800 sm:order-none sm:w-auto sm:flex-1">
                {t.formula}
              </code>
              <button
                onClick={() => onPractise(
                  { mode: 'topic', subjects: [subject], chapters: [c.chapter], topic: t.topic },
                  `${c.chapter}|${t.topic}`,
                )}
                disabled={busy !== null}
                className="rounded-md px-2 py-1 font-mono text-[11px] text-navy-700 ring-1 ring-navy-200
                           transition-colors hover:bg-navy-50 disabled:opacity-40"
              >
                {busy === `${c.chapter}|${t.topic}` ? 'starting…' : 'drill'}
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {c.untagged > 0 && (
              <p className="text-[12px] text-ink-400">
                {c.untagged} question{c.untagged === 1 ? '' : 's'} in this chapter did not match any
                topic above and are counted only in the chapter total.
              </p>
            )}
            <button
              onClick={() => onPractise(
                { mode: 'chapter', subjects: [subject], chapters: [c.chapter], count: 20 },
                c.chapter,
              )}
              disabled={busy !== null}
              className="btn-ghost ml-auto text-[12px]"
            >
              {busy === c.chapter ? 'starting…' : `Practise ${c.chapter} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
