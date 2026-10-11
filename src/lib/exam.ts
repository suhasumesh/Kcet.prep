/**
 * KCET (Karnataka Examinations Authority) paper rules.
 *
 * The real exam is one 80-minute paper of 60 single-correct MCQs per subject,
 * 1 mark each, and -- unlike JEE -- there is NO negative marking. Scoring here
 * mirrors that, so a practice score is directly comparable to a real one.
 */
export const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const MARKS_CORRECT = 1;
export const MARKS_WRONG = 0; // KCET does not deduct for a wrong answer
export const QUESTIONS_PER_SUBJECT = 60;
export const MINUTES_PER_SUBJECT = 80;

export const SUBJECT_STYLE: Record<string, { chip: string; dot: string; bar: string; text: string }> = {
  Physics: {
    chip: 'bg-[#3b5bdb]/8 text-[#2b44b0] ring-[#3b5bdb]/20',
    dot: 'bg-[#3b5bdb]', bar: 'bg-[#3b5bdb]', text: 'text-[#2b44b0]',
  },
  Chemistry: {
    chip: 'bg-[#0e8a6b]/8 text-[#0a6b53] ring-[#0e8a6b]/20',
    dot: 'bg-[#0e8a6b]', bar: 'bg-[#0e8a6b]', text: 'text-[#0a6b53]',
  },
  Mathematics: {
    chip: 'bg-[#6d4aff]/8 text-[#5436d4] ring-[#6d4aff]/20',
    dot: 'bg-[#6d4aff]', bar: 'bg-[#6d4aff]', text: 'text-[#5436d4]',
  },
};

export const NEUTRAL_CHIP = 'bg-ink-100 text-ink-600 ring-line';

export type Mode = 'full' | 'subject' | 'chapter' | 'pyq';

export const MODE_LABEL: Record<Mode, string> = {
  full: 'Full mock test',
  subject: 'Subject mock test',
  chapter: 'Chapter practice',
  pyq: 'Previous year paper',
};

/** Suggested duration: the real exam allows 80 minutes for 60 questions. */
export function suggestedSeconds(count: number) {
  return Math.max(5 * 60, Math.round((count * MINUTES_PER_SUBJECT * 60) / QUESTIONS_PER_SUBJECT));
}

export function scoreOf(correct: number) {
  return correct * MARKS_CORRECT;
}

export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDuration(ms: number) {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Day key in IST, so streaks roll over at local midnight for Indian students. */
export function istDayKey(d: Date = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}
