'use client';

import { useMemo, useState } from 'react';
import clsx from '@/lib/clsx';
import { SUBJECT_STYLE, formatDuration } from '@/lib/exam';
import { Stem, OptionBody, Solution, optionsInImage, optionMarkers, sourceLabel, type QData } from '@/components/QuestionView';

export type ReviewRow = {
  q: QData;
  selected: 'A' | 'B' | 'C' | 'D' | null;
  correct: boolean;
  timeSpentMs: number;
  markedForReview: boolean;
};

type Filter = 'all' | 'wrong' | 'correct' | 'skipped' | 'marked';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'wrong', label: 'Got wrong' },
  { id: 'skipped', label: 'Left blank' },
  { id: 'marked', label: 'Marked' },
  { id: 'correct', label: 'Got right' },
  { id: 'all', label: 'Everything' },
];

export default function Review({ rows }: { rows: ReviewRow[] }) {
  const [filter, setFilter] = useState<Filter>('wrong');
  const [open, setOpen] = useState<Set<number>>(new Set());

  const counts = useMemo(
    () => ({
      all: rows.length,
      wrong: rows.filter((r) => r.selected && !r.correct).length,
      correct: rows.filter((r) => r.correct).length,
      skipped: rows.filter((r) => !r.selected).length,
      marked: rows.filter((r) => r.markedForReview).length,
    }),
    [rows],
  );

  const shown = useMemo(() => {
    const picked = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => {
        if (filter === 'all') return true;
        if (filter === 'wrong') return r.selected && !r.correct;
        if (filter === 'correct') return r.correct;
        if (filter === 'skipped') return !r.selected;
        return r.markedForReview;
      });
    return picked;
  }, [rows, filter]);

  // Default to the most useful view: if nothing was wrong, show everything.
  const effective = shown.length === 0 && filter === 'wrong' ? rows.map((r, i) => ({ r, i })) : shown;

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const allOpen = effective.length > 0 && effective.every(({ i }) => open.has(i));

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f.id
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-line bg-white text-ink-700 hover:border-ink-300',
            )}
          >
            {f.label}
            <span className={clsx('ml-1.5 tabular-nums', filter === f.id ? 'text-ink-300' : 'text-ink-400')}>
              {counts[f.id]}
            </span>
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => setOpen(allOpen ? new Set() : new Set(effective.map(({ i }) => i)))}
          className="text-sm font-medium text-coral-600 hover:underline"
        >
          {allOpen ? 'Collapse all' : 'Expand all solutions'}
        </button>
      </div>

      {effective.length === 0 ? (
        <p className="card p-6 text-sm text-ink-600">Nothing in this group.</p>
      ) : (
        <ol className="space-y-3">
          {effective.map(({ r, i }) => {
            const expanded = open.has(i);
            const verdict = r.correct ? 'correct' : r.selected ? 'wrong' : 'blank';
            return (
              <li key={r.q.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-ink-50/60 px-4 py-2.5">
                  <span className="grid h-6 min-w-6 place-items-center rounded bg-ink-900 px-1.5 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span
                    className={clsx(
                      'chip',
                      verdict === 'correct' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                      verdict === 'wrong' && 'bg-rose-50 text-rose-700 ring-rose-200',
                      verdict === 'blank' && 'bg-ink-100 text-ink-600 ring-line',
                    )}
                  >
                    {verdict === 'correct' ? 'Correct' : verdict === 'wrong' ? 'Wrong' : 'Not answered'}
                  </span>
                  <span className={clsx('chip', SUBJECT_STYLE[r.q.subject]?.chip)}>{r.q.subject}</span>
                  {r.q.chapter !== 'Unclassified' && (
                    <span className="chip bg-white text-ink-600 ring-line">{r.q.chapter}</span>
                  )}
                  <span className="chip bg-white text-ink-500 ring-line">{sourceLabel(r.q)}</span>
                  <span className="flex-1" />
                  {r.timeSpentMs > 0 && (
                    <span className="text-xs tabular-nums text-ink-500">
                      {formatDuration(r.timeSpentMs)}
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <Stem q={r.q} />

                  <div className={clsx('mt-4', optionsInImage(r.q) ? 'flex flex-wrap gap-2' : 'space-y-2')}>
                    {(['A', 'B', 'C', 'D'] as const).map((L, li) => {
                      const opt = r.q.options.find((o) => o.letter === L);
                      if (!opt) return null;
                      if (optionsInImage(r.q)) {
                        const isKey = r.q.answer === L;
                        const isPick = r.selected === L;
                        return (
                          <span
                            key={L}
                            className={clsx(
                              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold',
                              isKey && 'border-emerald-300 bg-emerald-50 text-emerald-800',
                              !isKey && isPick && 'border-rose-300 bg-rose-50 text-rose-800',
                              !isKey && !isPick && 'border-line text-ink-500',
                            )}
                          >
                            Option {optionMarkers(r.q)[li]}
                            {isKey && <span className="text-xs font-medium">correct</span>}
                            {!isKey && isPick && <span className="text-xs font-medium">your answer</span>}
                          </span>
                        );
                      }
                      const isKey = r.q.answer === L;
                      const isPick = r.selected === L;
                      return (
                        <div
                          key={L}
                          className={clsx(
                            'flex items-start gap-3 rounded-lg border p-2.5',
                            isKey && 'border-emerald-300 bg-emerald-50/70',
                            !isKey && isPick && 'border-rose-300 bg-rose-50/70',
                            !isKey && !isPick && 'border-line',
                          )}
                        >
                          <span
                            className={clsx(
                              'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold',
                              isKey && 'border-emerald-600 bg-emerald-600 text-white',
                              !isKey && isPick && 'border-rose-600 bg-rose-600 text-white',
                              !isKey && !isPick && 'border-ink-300 text-ink-500',
                            )}
                          >
                            {L}
                          </span>
                          <span className="min-w-0 flex-1 text-ink-900">
                            <OptionBody opt={opt} />
                          </span>
                          <span className="shrink-0 self-center text-xs font-medium">
                            {isKey && <span className="text-emerald-700">Correct answer</span>}
                            {!isKey && isPick && <span className="text-rose-700">You chose this</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => toggle(i)}
                    className="btn-secondary mt-4 w-full sm:w-auto"
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Hide solution' : 'Show step-by-step solution'}
                  </button>

                  {expanded && (
                    <div className="mt-3 rounded-lg border border-coral-200 bg-coral-50/40 p-4">
                      <p className="label mb-2 text-coral-800">Solution</p>
                      <Solution q={r.q} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
