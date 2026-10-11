'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from '@/lib/clsx';
import { SUBJECT_STYLE } from '@/lib/exam';
import type { PlanDay } from '@/lib/planner';

type PlanResponse = {
  days: PlanDay[];
  focus: { subject: string; chapter: string; why: string }[];
  dailyMinutes: number;
};

const PRESETS = [45, 60, 90, 120, 180];

/** Local, per-browser tick list; the plan itself is regenerated from results. */
function useDoneSet(key: string) {
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDone(new Set(JSON.parse(raw)));
    } catch {
      /* private mode, or storage blocked */
    }
  }, [key]);
  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  return { done, toggle };
}

export default function PlanView() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [days, setDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const { done, toggle } = useDoneSet('kcet-plan-done');

  async function load(d = days) {
    const res = await fetch(`/api/plan?days=${d}`);
    setPlan(await res.json());
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function setMinutes(m: number) {
    setSaving(true);
    await fetch('/api/plan', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dailyMinutes: m }),
    });
    await load();
    setSaving(false);
  }

  if (!plan) return <p className="text-sm text-ink-500">Building your plan…</p>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Study plan</h1>
          <p className="mt-1 max-w-prose text-sm text-ink-600">
            Built from the chapters you actually get wrong, rebalanced every time you finish a test.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <p className="label">Time you can give each day</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              disabled={saving}
              className={clsx(
                'rounded-lg border px-4 py-2 text-sm font-medium tabular-nums transition-colors',
                plan.dailyMinutes === m
                  ? 'border-navy-900 bg-coral-500 text-white'
                  : 'border-line bg-white text-ink-700 hover:border-ink-300',
              )}
            >
              {m >= 60 ? `${m / 60}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-ink-200" />
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                days === d
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-line bg-white text-ink-700 hover:border-ink-300',
              )}
            >
              {d} days
            </button>
          ))}
        </div>
      </section>

      {plan.focus.length > 0 && (
        <section className="card p-5">
          <h2 className="text-base font-semibold text-ink-900">What matters most right now</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {plan.focus.map((f) => (
              <li key={`${f.subject}|${f.chapter}`} className="flex items-center gap-2.5 rounded-lg bg-paper px-3 py-2.5">
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', SUBJECT_STYLE[f.subject]?.dot)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink-900">{f.chapter}</span>
                  <span className="text-xs text-ink-500">{f.subject} — {f.why}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        {plan.days.map((day, di) => {
          const isToday = day.date === today;
          return (
            <div key={day.date} className={clsx('card p-4', isToday && 'border-coral-200 ring-1 ring-coral-200')}>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink-900">
                  {isToday ? 'Today' : day.label}
                  {isToday && <span className="ml-2 text-xs font-normal text-ink-500">{day.label}</span>}
                </h3>
                <span className="text-xs tabular-nums text-ink-500">{day.minutes} min</span>
              </div>
              <ul className="space-y-2">
                {day.tasks.map((t, ti) => {
                  const id = `${day.date}:${ti}`;
                  const checked = done.has(id);
                  const href =
                    t.kind === 'chapter'
                      ? `/practice?mode=chapter&subject=${encodeURIComponent(t.subject!)}&chapter=${encodeURIComponent(t.chapter!)}`
                      : t.kind === 'subject'
                        ? `/practice?mode=subject&subject=${encodeURIComponent(t.subject!)}`
                        : t.kind === 'full'
                          ? '/practice?mode=full'
                          : '/tests';
                  return (
                    <li
                      key={id}
                      className={clsx(
                        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                        checked ? 'border-emerald-200 bg-emerald-50/50' : 'border-line hover:bg-ink-50/60',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-emerald-600 focus:ring-emerald-500"
                        aria-label="Mark done"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={clsx('text-sm font-medium', checked ? 'text-ink-400 line-through' : 'text-ink-900')}>
                          {t.kind === 'chapter' && `${t.subject}: ${t.chapter}`}
                          {t.kind === 'subject' && `${t.subject} — full timed paper`}
                          {t.kind === 'full' && 'Full mock test, all three subjects'}
                          {t.kind === 'revise' && 'Review the solutions from your last test'}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {t.minutes} min
                          {t.count ? ` · about ${t.count} questions` : ''} · {t.reason}
                        </p>
                      </div>
                      <Link href={href} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                        {t.kind === 'revise' ? 'Open' : 'Start'}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
