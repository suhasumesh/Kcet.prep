import { Attempt } from '@/lib/models/Attempt';
import { Question } from '@/lib/models/Question';
import { MARKS_CORRECT } from '@/lib/exam';

/**
 * Scoring, and the closing of tests nobody submitted.
 *
 * Scoring lives here rather than in the submit route because two paths need
 * it. The ordinary one is a student pressing Submit. The other is a student
 * who answered thirty questions and then shut the laptop: the clock runs out,
 * the answers are already saved, and without this nothing ever scores them.
 * That attempt would sit unsubmitted for ever, absent from history, from
 * analytics and from the chapter accuracy that drives the study plan — the
 * work silently lost.
 *
 * Closing out happens lazily, when the student next loads a page that would
 * show the attempt, so it needs no scheduler.
 */

type Scored = { correct: number; wrong: number; unattempted: number; score: number };

/** Mark the responses against the key. The key never leaves the server. */
export async function scoreResponses(
  questionIds: unknown[],
  responses: { question: unknown; selected?: string | null }[],
): Promise<Scored> {
  const keys = await Question.find({ _id: { $in: questionIds } })
    .select('answer')
    .lean<{ _id: unknown; answer: string | null }[]>();
  const answerOf = new Map(keys.map((k) => [String(k._id), k.answer]));

  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  for (const r of responses) {
    const key = answerOf.get(String(r.question));
    if (!r.selected) unattempted++;
    else if (key && r.selected === key) correct++;
    else wrong++;
  }
  // KCET does not deduct for a wrong answer, so the score is the correct count
  return { correct, wrong, unattempted, score: correct * MARKS_CORRECT };
}

/**
 * Score any of this user's tests whose time ran out without a submission.
 *
 * Deliberately does **not** touch the streak. The streak records the days a
 * student actually sat down to work; awarding one now, for a test abandoned
 * last week, would be back-dating a fact about their effort.
 */
export async function closeExpiredAttempts(userId: string): Promise<number> {
  const stale = await Attempt.find({
    user: userId,
    submittedAt: null,
    expiresAt: { $lte: new Date() },
  }).select('questions responses expiresAt');

  let closed = 0;
  for (const a of stale) {
    const s = await scoreResponses(a.questions, a.responses);
    a.correct = s.correct;
    a.wrong = s.wrong;
    a.unattempted = s.unattempted;
    a.score = s.score;
    // the submission time is when the clock ran out, not when we noticed
    a.submittedAt = a.expiresAt;
    a.autoSubmitted = true;
    await a.save();
    closed++;
  }
  return closed;
}
