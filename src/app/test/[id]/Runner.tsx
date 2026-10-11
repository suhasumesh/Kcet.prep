'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from '@/lib/clsx';
import { formatClock, SUBJECT_STYLE } from '@/lib/exam';
import { Stem, OptionBody, optionsInImage, optionMarkers, sourceLabel, type QData } from '@/components/QuestionView';

type Resp = {
  question: string;
  selected: 'A' | 'B' | 'C' | 'D' | null;
  markedForReview: boolean;
  visited: boolean;
  timeSpentMs: number;
};

type Props = {
  attempt: {
    id: string;
    title: string;
    secureMode: boolean;
    expiresAt: string;
    durationSec: number;
  };
  questions: QData[];
  responses: Resp[];
  serverNow: number;
};

/** How many times a student may leave the window before the test is ended. */
const VIOLATION_LIMIT = 3;

const LETTERS = ['A', 'B', 'C', 'D'] as const;

export default function Runner({ attempt, questions, responses: initial, serverNow }: Props) {
  const router = useRouter();

  const [responses, setResponses] = useState<Resp[]>(initial);
  const [current, setCurrent] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [needsFullscreen, setNeedsFullscreen] = useState(false);

  // The deadline is the server's; the local clock is only used to tick towards it.
  const skewRef = useRef(Date.now() - serverNow);
  const [deadline, setDeadline] = useState(() => new Date(attempt.expiresAt).getTime());
  const [clockReady, setClockReady] = useState(false);
  const [remaining, setRemaining] = useState(attempt.durationSec);

  const submittedRef = useRef(false);
  const enteredAtRef = useRef(Date.now());
  const currentRef = useRef(0);
  currentRef.current = current;

  const q = questions[current];
  const resp = responses[current];
  // Some sources carry the four choices inside the question image, so the
  // buttons mirror the markers printed there rather than repeating the text.
  const compact = optionsInImage(q);
  const markers = optionMarkers(q);

  /* ------------------------------------------------------------------ submit */

  const submit = useCallback(
    async (reason?: 'time' | 'violations') => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      // Bank the time spent on the question that is open when the test ends.
      const spent = Date.now() - enteredAtRef.current;
      await fetch(`/api/attempts/${attempt.id}/answer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ index: currentRef.current, addTimeMs: spent }),
      }).catch(() => {});
      await fetch(`/api/attempts/${attempt.id}/submit`, { method: 'POST' }).catch(() => {});
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      // Drop the client router cache before leaving. The pages that count
      // this test -- the overview, analytics, the plan -- are all dynamic on
      // the server, but Next keeps their last payload on the client for
      // thirty seconds, so without this the student submits a test and then
      // finds their own result missing from their numbers.
      router.refresh();
      router.replace(`/results/${attempt.id}${reason ? `?ended=${reason}` : ''}`);
    },
    [attempt.id, router],
  );

  /* ------------------------------------------------------------------- timer */

  // Fix the deadline server-side on entry, so time spent on the instructions
  // screen is not charged and a reload cannot restart the clock.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attempt.id}/start`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.expiresAt) return;
        skewRef.current = Date.now() - d.serverNow;
        setDeadline(new Date(d.expiresAt).getTime());
        setClockReady(true);
      })
      .catch(() => setClockReady(true));
    return () => {
      cancelled = true;
    };
  }, [attempt.id]);

  useEffect(() => {
    if (!clockReady) return;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - (Date.now() - skewRef.current)) / 1000));
      setRemaining(left);
      if (left <= 0) submit('time');
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, submit, clockReady]);

  /* ------------------------------------------------------------- persistence */

  const patch = useCallback(
    (index: number, body: Record<string, unknown>) => {
      fetch(`/api/attempts/${attempt.id}/answer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ index, ...body }),
      }).catch(() => {});
    },
    [attempt.id],
  );

  /** Move to another question, banking the time spent on the one being left. */
  const goto = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length || index === currentRef.current) return;
      const spent = Date.now() - enteredAtRef.current;
      patch(currentRef.current, { addTimeMs: spent, visited: true });
      setResponses((prev) => {
        const next = [...prev];
        next[currentRef.current] = {
          ...next[currentRef.current],
          visited: true,
          timeSpentMs: next[currentRef.current].timeSpentMs + spent,
        };
        return next;
      });
      enteredAtRef.current = Date.now();
      setCurrent(index);
      setPaletteOpen(false);
    },
    [patch, questions.length],
  );

  const choose = useCallback(
    (letter: 'A' | 'B' | 'C' | 'D') => {
      const i = currentRef.current;
      // Clicking the chosen option again clears it, as in the real CBT interface.
      const selected = responses[i]?.selected === letter ? null : letter;
      setResponses((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], selected, visited: true };
        return next;
      });
      patch(i, { selected, visited: true });
    },
    [patch, responses],
  );

  const toggleReview = useCallback(() => {
    const i = currentRef.current;
    const markedForReview = !responses[i]?.markedForReview;
    setResponses((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], markedForReview };
      return next;
    });
    patch(i, { markedForReview });
  }, [patch, responses]);

  /* --------------------------------------------------------------- exam mode */

  const flagViolation = useCallback(
    async (kind: string, message: string) => {
      if (submittedRef.current) return;
      setWarning(message);
      const res = await fetch(`/api/attempts/${attempt.id}/violation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
        .then((r) => r.json())
        .catch(() => null);
      const count = res?.count ?? violations + 1;
      setViolations(count);
      if (count >= VIOLATION_LIMIT) submit('violations');
    },
    [attempt.id, submit, violations],
  );

  useEffect(() => {
    if (!attempt.secureMode) return;

    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        flagViolation('tab-hidden', 'You left the test window. Doing this again will end the test.');
      }
    };
    const onBlur = () => flagViolation('blur', 'The test window lost focus. Stay on this window.');
    const onFsChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        setNeedsFullscreen(true);
        flagViolation('fullscreen-exit', 'You left full screen. Return to full screen to carry on.');
      }
    };
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const blocked =
        (e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 's', 'u', 'a'].includes(k);
      const devtools = k === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k));
      if (blocked || devtools) {
        e.preventDefault();
        setWarning('That shortcut is disabled during the test.');
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [attempt.secureMode, flagViolation]);

  // Keyboard shortcuts for answering, which is how fast students actually work.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (['a', 'b', 'c', 'd'].includes(k) && !e.ctrlKey && !e.metaKey) {
        choose(k.toUpperCase() as 'A');
      } else if ('1234'.includes(k) && !e.ctrlKey && !e.metaKey) {
        choose(LETTERS[Number(k) - 1]);
      } else if (e.key === 'ArrowRight') goto(currentRef.current + 1);
      else if (e.key === 'ArrowLeft') goto(currentRef.current - 1);
      else if (k === 'm') toggleReview();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, goto, toggleReview, confirmOpen]);

  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(null), 6000);
    return () => clearTimeout(t);
  }, [warning]);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setNeedsFullscreen(false);
    } catch {
      setNeedsFullscreen(false); // some browsers refuse; the test still runs
    }
  }

  /* ------------------------------------------------------------------- stats */

  const stats = useMemo(() => {
    let answered = 0, marked = 0, seen = 0;
    for (const r of responses) {
      if (r.selected) answered++;
      if (r.markedForReview) marked++;
      if (r.visited || r.selected) seen++;
    }
    return { answered, marked, seen, left: responses.length - answered };
  }, [responses]);

  const low = remaining <= 300;

  return (
    <div className="flex min-h-dvh flex-col bg-paper select-none">
      {/* ------------------------------------------------------------- header */}
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{attempt.title}</p>
            <p className="text-xs text-ink-500">
              Question {current + 1} of {questions.length}
              {attempt.secureMode && <span className="ml-2 text-amber-700">· Exam mode</span>}
            </p>
          </div>

          <div
            className={clsx(
              'rounded-lg px-3 py-1.5 text-center tabular-nums',
              low ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200' : 'bg-ink-100 text-ink-900',
            )}
            role="timer"
            aria-live="off"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">Time left</span>
            <span className="block text-lg font-bold leading-5">{formatClock(remaining)}</span>
          </div>

          <button onClick={() => setConfirmOpen(true)} className="btn-primary hidden sm:inline-flex">
            Submit
          </button>
          <button
            onClick={() => setPaletteOpen((p) => !p)}
            className="btn-secondary px-3 lg:hidden"
            aria-label="Question palette"
          >
            {current + 1}/{questions.length}
          </button>
        </div>

        {warning && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
            {warning}
            {violations > 0 && (
              <span className="ml-2 font-normal">
                ({violations} of {VIOLATION_LIMIT} warnings used)
              </span>
            )}
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-3 py-4 sm:px-4">
        {/* -------------------------------------------------------- question */}
        <main className="min-w-0 flex-1">
          <div className="card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="grid h-7 min-w-7 place-items-center rounded-md bg-ink-900 px-2 text-xs font-bold text-white">
                {current + 1}
              </span>
              <span className={clsx('chip', SUBJECT_STYLE[q.subject]?.chip ?? 'bg-ink-100 text-ink-700 ring-line')}>
                {q.subject}
              </span>
              {q.chapter && q.chapter !== 'Unclassified' && (
                <span className="chip bg-ink-100 text-ink-600 ring-line">{q.chapter}</span>
              )}
              <span className="chip bg-paper text-ink-500 ring-line">{sourceLabel(q)}</span>
            </div>

            <Stem q={q} eager />

            {compact ? (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-ink-500">
                  Choose the option as marked in the question above.
                </p>
                <div className="grid grid-cols-4 gap-2 sm:max-w-md">
                  {LETTERS.map((L, i) => {
                    const picked = resp?.selected === L;
                    return (
                      <button
                        key={L}
                        onClick={() => choose(L)}
                        className={clsx(
                          'rounded-xl border py-3 text-base font-bold transition-colors',
                          picked
                            ? 'border-navy-900 bg-coral-500 text-white'
                            : 'border-line bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50',
                        )}
                      >
                        {markers[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-2.5">
                {LETTERS.map((L) => {
                  const opt = q.options.find((o) => o.letter === L);
                  if (!opt) return null;
                  const picked = resp?.selected === L;
                  return (
                    <button
                      key={L}
                      onClick={() => choose(L)}
                      className={clsx(
                        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                        picked
                          ? 'border-navy-900 bg-coral-50 ring-1 ring-navy-900'
                          : 'border-line bg-white hover:border-ink-300 hover:bg-ink-50/60',
                      )}
                    >
                      <span
                        className={clsx(
                          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold',
                          picked ? 'border-navy-900 bg-coral-500 text-white' : 'border-ink-300 text-ink-600',
                        )}
                      >
                        {L}
                      </span>
                      <span className="min-w-0 flex-1 text-ink-900">
                        <OptionBody opt={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => goto(current - 1)} disabled={current === 0} className="btn-secondary">
              Previous
            </button>
            <button onClick={toggleReview} className={clsx('btn', resp?.markedForReview
              ? 'bg-violet-600 text-white hover:bg-violet-700'
              : 'border border-line bg-white text-ink-800 hover:bg-ink-50')}>
              {resp?.markedForReview ? 'Marked for review' : 'Mark for review'}
            </button>
            {resp?.selected && (
              <button onClick={() => choose(resp.selected!)} className="btn-ghost">Clear answer</button>
            )}
            <span className="flex-1" />
            {current === questions.length - 1 ? (
              <button onClick={() => setConfirmOpen(true)} className="btn-primary">Submit test</button>
            ) : (
              <button onClick={() => goto(current + 1)} className="btn-primary">Save &amp; next</button>
            )}
          </div>

          <p className="mt-3 text-xs text-ink-400">
            Shortcuts: {compact ? `${markers[0]}–${markers[3]}` : 'A–D'} to answer · ← → to move · M to mark for review
          </p>
        </main>

        {/* --------------------------------------------------------- palette */}
        <aside
          className={clsx(
            'w-64 shrink-0 lg:block',
            paletteOpen
              ? 'fixed inset-x-3 bottom-3 top-28 z-40 w-auto overflow-y-auto rounded-xl bg-white p-4 shadow-xl ring-1 ring-line'
              : 'hidden',
          )}
        >
          <div className="card p-4">
            <p className="label mb-3">Questions</p>
            <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {responses.map((r, i) => {
                const state = r.markedForReview
                  ? 'review'
                  : r.selected
                    ? 'answered'
                    : r.visited
                      ? 'skipped'
                      : 'untouched';
                return (
                  <button
                    key={i}
                    onClick={() => goto(i)}
                    className={clsx(
                      'grid h-9 place-items-center rounded-md text-xs font-semibold tabular-nums transition-colors',
                      i === current && 'ring-2 ring-ink-900 ring-offset-1',
                      state === 'answered' && 'bg-emerald-500 text-white',
                      state === 'review' && 'bg-violet-500 text-white',
                      state === 'skipped' && 'bg-rose-100 text-rose-700',
                      state === 'untouched' && 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs">
              {[
                ['Answered', stats.answered, 'bg-emerald-500'],
                ['Marked for review', stats.marked, 'bg-violet-500'],
                ['Seen, not answered', stats.seen - stats.answered, 'bg-rose-100'],
                ['Not seen', responses.length - stats.seen, 'bg-ink-100'],
              ].map(([label, n, cls]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className={clsx('h-3 w-3 rounded', cls as string)} />
                  <dt className="flex-1 text-ink-600">{label as string}</dt>
                  <dd className="font-semibold tabular-nums text-ink-900">{n as number}</dd>
                </div>
              ))}
            </dl>

            <button onClick={() => setConfirmOpen(true)} className="btn-primary mt-4 w-full">
              Submit test
            </button>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------ fullscreen gate */}
      {attempt.secureMode && needsFullscreen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/85 p-4 backdrop-blur-sm">
          <div className="card max-w-md p-6 text-center">
            <h2 className="text-lg font-semibold text-ink-900">Return to full screen</h2>
            <p className="mt-2 text-sm text-ink-600">
              Exam mode runs full screen. Your timer is still running.
            </p>
            <button onClick={enterFullscreen} className="btn-primary mt-5 w-full">
              Go full screen
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-ink-900">Submit this test?</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              You cannot change your answers afterwards. The solutions open straight away.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['Answered', stats.answered],
                ['Not answered', stats.left],
                ['Marked', stats.marked],
              ].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-paper p-3">
                  <dd className="text-xl font-bold tabular-nums text-ink-900">{v as number}</dd>
                  <dt className="text-xs text-ink-600">{l as string}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary flex-1">
                Keep working
              </button>
              <button onClick={() => submit()} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
