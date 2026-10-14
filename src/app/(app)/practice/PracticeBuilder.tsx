'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from '@/lib/clsx';
import { suggestedSeconds, formatClock, SUBJECT_STYLE } from '@/lib/exam';

type Catalog = {
  subjects: Record<string, {
    chapters: { name: string; puc: number; count: number }[];
    years: { year: number; count: number }[];
    books: { book: string; count: number }[];
    total: number;
  }>;
};

type Mode = 'full' | 'subject' | 'chapter' | 'pyq';
export type Bank = 'kcet' | 'pradeep';

const KCET_MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'full', title: 'Full mock', blurb: 'All three subjects, 180 questions, exam conditions.' },
  { id: 'subject', title: 'Subject mock', blurb: '60 questions from one subject in 80 minutes.' },
  { id: 'chapter', title: 'Chapter drill', blurb: 'Pick the chapters you want to work on.' },
  { id: 'pyq', title: 'Past paper', blurb: 'A real KCET paper, in its original order.' },
];

const BOOK_MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'chapter', title: 'Chapter drill', blurb: 'Work through one chapter of the book at a time.' },
  { id: 'subject', title: 'Mixed set', blurb: 'A random spread across the whole subject.' },
];

export default function PracticeBuilder({ bank = 'kcet' }: { bank?: Bank }) {
  const router = useRouter();
  const params = useSearchParams();
  const modes = bank === 'pradeep' ? BOOK_MODES : KCET_MODES;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [mode, setMode] = useState<Mode>(
    (params.get('mode') as Mode) || (bank === 'pradeep' ? 'chapter' : 'subject'),
  );
  const [subject, setSubject] = useState(params.get('subject') || 'Physics');
  const [chapters, setChapters] = useState<string[]>(
    params.get('chapter') ? [params.get('chapter')!] : [],
  );
  const [year, setYear] = useState<number | null>(null);
  const [count, setCount] = useState(20);
  const [secureMode, setSecureMode] = useState(bank === 'kcet');
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/catalog?bank=${bank}`)
      .then((r) => r.json())
      .then((c: Catalog) => {
        setCatalog(c);
        const names = Object.keys(c.subjects);
        if (names.length && !names.includes(subject)) setSubject(names[0]);
      })
      .catch(() => setError('Could not load the question bank.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);

  const info = catalog?.subjects[subject];
  const available = info?.chapters ?? [];

  const selected = useMemo(() => {
    if (!catalog) return 0;
    if (mode === 'full') return 180;
    if (mode === 'subject') return Math.min(count, info?.total ?? 0);
    if (mode === 'pyq') return info?.years.find((y) => y.year === year)?.count ?? 0;
    const pool = available.filter((c) => chapters.includes(c.name)).reduce((s, c) => s + c.count, 0);
    return Math.min(count, pool);
  }, [catalog, mode, count, info, year, chapters, available]);

  const durationSec = customMinutes ? customMinutes * 60 : suggestedSeconds(selected || 1);

  useEffect(() => {
    setChapters([]);
    const ys = catalog?.subjects[subject]?.years ?? [];
    setYear(ys.length ? ys[0].year : null);
  }, [subject, catalog]);

  useEffect(() => {
    if (mode === 'subject') setCount(bank === 'pradeep' ? 25 : 60);
    if (mode === 'chapter') setCount(20);
  }, [mode, bank]);

  async function start() {
    setBusy(true);
    setError('');
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        bank,
        mode,
        subjects: mode === 'full' ? [] : [subject],
        chapters: mode === 'chapter' ? chapters : [],
        year: mode === 'pyq' ? year : null,
        count: mode === 'subject' || mode === 'chapter' ? count : undefined,
        durationSec: customMinutes ? customMinutes * 60 : undefined,
        secureMode,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not start the test.');
      setBusy(false);
      return;
    }
    router.push(`/test/${data.id}`);
  }

  const canStart =
    !busy && selected > 0 &&
    (mode !== 'chapter' || chapters.length > 0) &&
    (mode !== 'pyq' || Boolean(year));

  const grouped = useMemo(() => {
    const g = [
      { label: '1st PUC', items: available.filter((c) => c.puc === 1) },
      { label: '2nd PUC', items: available.filter((c) => c.puc === 2) },
      { label: 'Other', items: available.filter((c) => c.puc !== 1 && c.puc !== 2) },
    ];
    return g.filter((x) => x.items.length);
  }, [available]);

  return (
    <div className="space-y-9">
      <section>
        <p className="label mb-3">Format</p>
        <div className={clsx('rule-grid', modes.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2')}>
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                'p-5 text-left transition-colors',
                mode === m.id ? '!bg-navy-900' : 'hover:!bg-ink-50',
              )}
            >
              <p className={clsx('text-[15px] font-semibold', mode === m.id ? 'text-white' : 'text-ink-900')}>
                {m.title}
              </p>
              <p className={clsx('mt-1.5 text-[13px] leading-relaxed', mode === m.id ? 'text-navy-100/75' : 'text-ink-500')}>
                {m.blurb}
              </p>
            </button>
          ))}
        </div>
      </section>

      {mode !== 'full' && (
        <section>
          <p className="label mb-3">Subject</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(catalog?.subjects ?? {}).map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={clsx('pill', subject === s && 'pill-on')}
              >
                <span className={clsx('h-1.5 w-1.5 rounded-full', SUBJECT_STYLE[s]?.dot ?? 'bg-ink-400')} />
                {s}
                <span className={clsx('font-mono text-[11px]', subject === s ? 'text-white/55' : 'text-ink-400')}>
                  {catalog?.subjects[s].total}
                </span>
              </button>
            ))}
          </div>
          {bank === 'pradeep' && (info?.books?.length ?? 0) > 0 && (
            <p className="mt-2.5 text-[13px] text-ink-500">
              From {info!.books.map((b) => b.book).join(' and ')}.
            </p>
          )}
        </section>
      )}

      {mode === 'pyq' && (
        <section>
          <p className="label mb-3">Year</p>
          <div className="flex flex-wrap gap-2">
            {(info?.years ?? []).map((y) => (
              <button
                key={y.year}
                onClick={() => setYear(y.year)}
                className={clsx('pill font-mono tabular-nums', year === y.year && 'pill-on')}
              >
                {y.year}
                <span className={clsx('text-[11px]', year === y.year ? 'text-white/55' : 'text-ink-400')}>
                  {y.count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'chapter' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Chapters</p>
            <div className="flex gap-4 text-[13px]">
              <button onClick={() => setChapters(available.map((c) => c.name))}
                className="font-medium text-coral-600 hover:underline">Select all</button>
              <button onClick={() => setChapters([])}
                className="font-medium text-ink-400 hover:underline">Clear</button>
            </div>
          </div>
          <div className="card max-h-[23rem] space-y-5 overflow-y-auto p-5">
            {grouped.map((g) => (
              <div key={g.label}>
                <p className="label mb-2.5">{g.label}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {g.items.map((c) => {
                    const on = chapters.includes(c.name);
                    return (
                      <label
                        key={c.name}
                        className={clsx(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors',
                          on ? 'bg-navy-50 text-navy-900' : 'text-ink-700 hover:bg-ink-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setChapters((p) => (p.includes(c.name) ? p.filter((x) => x !== c.name) : [...p, c.name]))
                          }
                          className="h-4 w-4 rounded border-ink-300 text-navy-900 focus:ring-navy-500"
                        />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="shrink-0 font-mono text-[11px] text-ink-400">{c.count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(mode === 'subject' || mode === 'chapter') && (
        <section>
          <p className="label mb-3">How many questions</p>
          <div className="flex flex-wrap gap-2">
            {(mode === 'subject'
              ? [20, 30, 45, 60, 100, 150, 180]
              : [10, 15, 20, 30, 50, 100, 150, 180]
            ).map((n) => (
              <button key={n} onClick={() => setCount(n)}
                className={clsx('pill font-mono tabular-nums', count === n && 'pill-on')}>
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-5 p-6">
          <div>
            <p className="label">This test</p>
            <p className="display mt-1.5 text-[2rem] leading-none">
              {selected} <span className="text-ink-400">{selected === 1 ? 'question' : 'questions'}</span>
            </p>
            <p className="mt-2 font-mono text-[12px] text-ink-500">
              {formatClock(durationSec)}
              {mode === 'chapter' && chapters.length > 0 && ` · ${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="label" htmlFor="mins">Minutes</label>
            <input
              id="mins" type="number" min={1} max={360}
              value={customMinutes ?? Math.round(durationSec / 60)}
              onChange={(e) => setCustomMinutes(Number(e.target.value) || null)}
              className="input w-24 font-mono tabular-nums"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 border-t border-line bg-ink-50/60 p-5">
          <input
            type="checkbox"
            checked={secureMode}
            onChange={(e) => setSecureMode(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-navy-900 focus:ring-navy-500"
          />
          <span className="text-[13px]">
            <span className="font-semibold text-ink-900">Exam mode</span>
            <span className="mt-0.5 block leading-relaxed text-ink-500">
              Runs full screen, blocks copy and right-click, and records every time you leave the
              window. Leaving three times ends the test.
            </span>
          </span>
        </label>

        {error && (
          <p className="border-t border-coral-100 bg-coral-50 px-5 py-3 text-[13px] text-coral-800">{error}</p>
        )}

        <div className="border-t border-line p-5">
          <button onClick={start} disabled={!canStart} className="btn-primary w-full sm:w-auto">
            {busy ? 'Setting up…' : 'Start test'}
          </button>
        </div>
      </section>
    </div>
  );
}
