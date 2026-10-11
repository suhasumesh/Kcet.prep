import type { Analytics } from './analytics';
import { SUBJECTS } from './exam';

export type PlanTask = {
  kind: 'chapter' | 'subject' | 'full' | 'revise';
  subject?: string;
  chapter?: string;
  minutes: number;
  count?: number;
  reason: string;
};

export type PlanDay = {
  date: string;
  label: string;
  minutes: number;
  tasks: PlanTask[];
};

const MIN_PER_QUESTION = 1.4; // KCET pace: 80 minutes for 60 questions, plus review

/**
 * Build a rolling study plan from what the student has actually got wrong.
 *
 * The plan is deliberately simple and legible rather than clever: weak chapters
 * come first, chapters never attempted are mixed in so coverage keeps widening,
 * every seventh day is a full mock, and the day after a mock is kept light for
 * reviewing it. Minutes come from what the student said they can give per day.
 */
export function buildPlan(
  analytics: Analytics,
  opts: { dailyMinutes: number; days: number; targetDate?: Date | null },
): { days: PlanDay[]; focus: { subject: string; chapter: string; why: string }[] } {
  const dailyMinutes = Math.max(20, Math.min(600, opts.dailyMinutes || 90));
  const horizon = Math.max(3, Math.min(60, opts.days || 14));

  // Queue of things worth doing, most valuable first.
  const queue: { subject: string; chapter: string; why: string; weight: number }[] = [];

  for (const c of analytics.chapters) {
    if (c.attempted >= 2 && c.mastery < 70) {
      queue.push({
        subject: c.subject,
        chapter: c.chapter,
        why: `${c.accuracy}% correct over ${c.attempted} question${c.attempted === 1 ? '' : 's'}`,
        weight: 100 - c.mastery + (c.attempted >= 5 ? 10 : 0),
      });
    }
  }
  for (const u of analytics.untested) {
    queue.push({
      subject: u.subject,
      chapter: u.chapter,
      why: 'not practised yet',
      weight: 40 + Math.min(20, u.available / 2),
    });
  }
  queue.sort((a, b) => b.weight - a.weight);

  // Interleave subjects so a plan never becomes three days of only Maths.
  const bySubject = new Map<string, typeof queue>();
  for (const q of queue) {
    if (!bySubject.has(q.subject)) bySubject.set(q.subject, []);
    bySubject.get(q.subject)!.push(q);
  }
  const roundRobin: typeof queue = [];
  for (let i = 0; roundRobin.length < queue.length; i++) {
    for (const s of SUBJECTS) {
      const list = bySubject.get(s);
      if (list && list[i]) roundRobin.push(list[i]);
    }
    if (i > 200) break;
  }

  const days: PlanDay[] = [];
  let cursor = 0;
  const start = new Date();

  for (let d = 0; d < horizon; d++) {
    const date = new Date(start.getTime() + d * 86400000);
    const iso = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const tasks: PlanTask[] = [];
    let left = dailyMinutes;

    const isMockDay = d > 0 && (d + 1) % 7 === 0;
    const isReviewDay = d > 0 && d % 7 === 0;

    if (isMockDay && dailyMinutes >= 90) {
      tasks.push({
        kind: 'subject',
        subject: SUBJECTS[d % SUBJECTS.length],
        minutes: 80,
        count: 60,
        reason: 'weekly timed paper at exam pace',
      });
      left -= 80;
    } else if (isReviewDay) {
      tasks.push({
        kind: 'revise',
        minutes: Math.round(dailyMinutes * 0.4),
        reason: 'go back through the solutions of the last paper',
      });
      left -= Math.round(dailyMinutes * 0.4);
    }

    while (left >= 20 && cursor < roundRobin.length) {
      const item = roundRobin[cursor++];
      const minutes = Math.min(left, 30);
      tasks.push({
        kind: 'chapter',
        subject: item.subject,
        chapter: item.chapter,
        minutes,
        count: Math.max(8, Math.round(minutes / MIN_PER_QUESTION)),
        reason: item.why,
      });
      left -= minutes;
    }

    if (tasks.length === 0) {
      tasks.push({
        kind: 'full',
        minutes: dailyMinutes,
        reason: 'everything is covered — sit a full mock to keep sharp',
      });
    }

    days.push({ date: iso, label, minutes: tasks.reduce((s, t) => s + t.minutes, 0), tasks });
  }

  return {
    days,
    focus: roundRobin.slice(0, 6).map((q) => ({ subject: q.subject, chapter: q.chapter, why: q.why })),
  };
}
