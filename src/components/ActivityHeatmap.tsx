'use client';

import { useMemo, useState } from 'react';
import clsx from '@/lib/clsx';

export type ActivityDay = { date: string; questions: number; correct: number; tests: number; minutes: number };

const DAY_MS = 86400000;
const WEEKDAYS = ['Mon', 'Wed', 'Fri'];

/** Five buckets, quiet to loud, like a contribution graph. */
function levelOf(questions: number) {
  if (questions <= 0) return 0;
  if (questions < 10) return 1;
  if (questions < 25) return 2;
  if (questions < 50) return 3;
  return 4;
}

const LEVEL_CLASS = [
  'bg-ink-100',
  'bg-coral-100',
  'bg-coral-300',
  'bg-coral-500',
  'bg-navy-900',
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * A year of practice at a glance.
 *
 * The grid is built backwards from today and padded to whole weeks so the
 * columns line up on Mondays, which is what makes the shape readable.
 */
export default function ActivityHeatmap({
  activity,
  weeks = 53,
}: {
  activity: ActivityDay[];
  weeks?: number;
}) {
  const [hover, setHover] = useState<ActivityDay | null>(null);
  const byDate = useMemo(() => new Map(activity.map((a) => [a.date, a])), [activity]);

  const { columns, months } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Walk back to the most recent Sunday so every column is a full week.
    const end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
    const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY_MS);

    const cols: { date: string; inFuture: boolean }[][] = [];
    const monthMarks: { col: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const col: { date: string; inFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
        col.push({ date: iso(day), inFuture: day > today });
        if (d === 0 && day.getMonth() !== lastMonth) {
          lastMonth = day.getMonth();
          monthMarks.push({ col: w, label: day.toLocaleDateString('en-IN', { month: 'short' }) });
        }
      }
      cols.push(col);
    }
    return { columns: cols, months: monthMarks };
  }, [weeks]);

  const total = activity.reduce((s, a) => s + a.questions, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-600">
          <span className="font-semibold text-ink-900">{total.toLocaleString('en-IN')}</span> questions
          practised across <span className="font-semibold text-ink-900">{activity.length}</span> active{' '}
          {activity.length === 1 ? 'day' : 'days'}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <span>Less</span>
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={clsx('h-[11px] w-[11px] rounded-[3px]', c)} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-[3px]">
          {/* weekday rail */}
          <div className="mr-1 flex w-7 shrink-0 flex-col gap-[3px] pt-[18px] text-[10px] leading-[11px] text-ink-400">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-[11px]">
                {i === 1 ? WEEKDAYS[0] : i === 3 ? WEEKDAYS[1] : i === 5 ? WEEKDAYS[2] : ''}
              </div>
            ))}
          </div>

          <div>
            <div className="relative mb-1 h-[14px]">
              {months.map((m) => (
                <span
                  key={`${m.col}-${m.label}`}
                  className="absolute text-[10px] text-ink-400"
                  style={{ left: m.col * 14 }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell) => {
                    const day = byDate.get(cell.date);
                    const lvl = cell.inFuture ? -1 : levelOf(day?.questions ?? 0);
                    return (
                      <div
                        key={cell.date}
                        onMouseEnter={() =>
                          setHover(day ?? { date: cell.date, questions: 0, correct: 0, tests: 0, minutes: 0 })
                        }
                        onMouseLeave={() => setHover(null)}
                        className={clsx(
                          'h-[11px] w-[11px] rounded-[3px]',
                          lvl === -1 ? 'bg-transparent' : LEVEL_CLASS[lvl],
                          lvl > 0 && 'cursor-pointer',
                        )}
                        title={
                          cell.inFuture
                            ? undefined
                            : `${day?.questions ?? 0} questions on ${new Date(cell.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 h-5 text-xs text-ink-600">
        {hover && (
          <span>
            <span className="font-semibold text-ink-900">
              {new Date(hover.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            {hover.questions > 0
              ? ` — ${hover.questions} questions, ${hover.correct} correct, ${hover.tests} test${hover.tests === 1 ? '' : 's'}`
              : ' — no practice'}
          </span>
        )}
      </div>
    </div>
  );
}
