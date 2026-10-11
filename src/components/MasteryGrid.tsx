'use client';

import { useState } from 'react';
import Link from 'next/link';
import clsx from '@/lib/clsx';
import type { ChapterStat } from '@/lib/analytics';

/** Five mastery bands, weak to strong — the same visual language as the activity map. */
function bandOf(m: number) {
  if (m >= 80) return 4;
  if (m >= 68) return 3;
  if (m >= 55) return 2;
  if (m >= 42) return 1;
  return 0;
}

const BAND_CLASS = [
  'bg-rose-500 text-white',
  'bg-orange-400 text-white',
  'bg-amber-300 text-amber-950',
  'bg-emerald-300 text-emerald-950',
  'bg-emerald-600 text-white',
];

const BAND_LABEL = ['Weak', 'Shaky', 'Mixed', 'Good', 'Strong'];

export default function MasteryGrid({ chapters }: { chapters: ChapterStat[] }) {
  const [subject, setSubject] = useState<string>('All');
  const subjects = ['All', ...new Set(chapters.map((c) => c.subject))];
  const shown = chapters.filter((c) => subject === 'All' || c.subject === subject);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={clsx(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              subject === s
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-line bg-white text-ink-700 hover:border-ink-300',
            )}
          >
            {s}
          </button>
        ))}
        <span className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          {BAND_CLASS.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className={clsx('h-3 w-3 rounded', c.split(' ')[0])} />
              <span className="hidden sm:inline">{BAND_LABEL[i]}</span>
            </span>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink-600">No chapters practised in this subject yet.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <Link
              key={`${c.subject}|${c.chapter}`}
              href={`/practice?mode=chapter&subject=${encodeURIComponent(c.subject)}&chapter=${encodeURIComponent(c.chapter)}`}
              className="group flex items-center gap-3 rounded-lg border border-line bg-white p-2.5 transition-colors hover:border-coral-200"
              title={`${c.chapter} — ${c.accuracy}% over ${c.attempted} questions`}
            >
              <span
                className={clsx(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums',
                  BAND_CLASS[bandOf(c.mastery)],
                )}
              >
                {c.mastery}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900 group-hover:text-coral-800">
                  {c.chapter}
                </span>
                <span className="text-xs text-ink-500">
                  {c.subject} · {c.correct}/{c.attempted} · {c.avgTimeSec}s avg
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
