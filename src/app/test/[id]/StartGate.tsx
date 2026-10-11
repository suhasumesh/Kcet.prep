'use client';

import { useState } from 'react';
import Runner from './Runner';
import type { QData } from '@/components/QuestionView';
import { formatClock } from '@/lib/exam';

type Payload = {
  attempt: { id: string; title: string; secureMode: boolean; expiresAt: string; durationSec: number };
  questions: QData[];
  responses: any[];
  serverNow: number;
};

const RULES = [
  'The test opens full screen and stays there until you submit.',
  'Switching tabs, minimising, or leaving this window is recorded. After three warnings the test is submitted automatically.',
  'Copy, paste, right-click and the developer-tools shortcuts are disabled.',
  'One mark for each correct answer. Nothing is deducted for a wrong one, so never leave a question blank.',
  'Your answers save as you go — a dropped connection will not lose your work.',
];

/**
 * Full screen can only be entered from a genuine user gesture, so exam mode
 * begins behind this screen rather than on page load.
 */
export default function StartGate({ payload }: { payload: Payload }) {
  const [started, setStarted] = useState(false);

  async function begin() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Some browsers and embedded webviews refuse; the test still runs, and
      // leaving the window is still recorded.
    }
    setStarted(true);
  }

  if (started) return <Runner {...payload} />;

  return (
    <div className="grid min-h-dvh place-items-center bg-paper p-4">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <p className="label">Exam mode</p>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight text-ink-900">{payload.attempt.title}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {payload.questions.length} questions · {formatClock(payload.attempt.durationSec)}
        </p>

        <ul className="mt-5 space-y-2.5">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />
              {r}
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200">
          A web page cannot stop other applications from being opened — no browser allows that. What
          this mode does is make leaving obvious and recorded, the way a real invigilated centre would.
        </div>

        <button onClick={begin} className="btn-primary mt-6 w-full">
          Start the test
        </button>
        <p className="mt-3 text-center text-xs text-ink-500">The timer starts as soon as you tap start.</p>
      </div>
    </div>
  );
}
