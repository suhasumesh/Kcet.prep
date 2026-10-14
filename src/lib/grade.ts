import { connectDB } from '@/lib/db';
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

/** Tally responses against an already-loaded key. */
function markAgainst(
  responses: { question: unknown; selected?: string | null }[],
  answerOf: Map<string, string | null>,
): Scored {
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

/** Mark the responses against the key. The key never leaves the server. */
export async function scoreResponses(
  questionIds: unknown[],
  responses: { question: unknown; selected?: string | null }[],
): Promise<Scored> {
  await connectDB();
  const keys = await Question.find({ _id: { $in: questionIds } })
    .select('answer')
    .lean<{ _id: unknown; answer: string | null }[]>();
  return markAgainst(responses, new Map(keys.map((k) => [String(k._id), k.answer])));
}

/**
 * Score any of this user's tests whose time ran out without a submission.
 *
 * Deliberately does **not** touch the streak. The streak records the days a
 * student actually sat down to work; awarding one now, for a test abandoned
 * last week, would be back-dating a fact about their effort.
 */
export async function closeExpiredAttempts(userId: string): Promise<number> {
  // Buffering is off, so nothing may query before the connection is up. Cheap
  // when it already is.
  await connectDB();
  // This runs on every page that lists or summarises tests, and almost always
  // finds nothing, so it has to be cheap when there is nothing to do: one
  // indexed lookup returning no rows, and no writes.
  const stale = await Attempt.find({
    user: userId,
    submittedAt: null,
    expiresAt: { $lte: new Date() },
  })
    .select('questions responses expiresAt')
    .lean<{ _id: unknown; questions: unknown[];
      responses: { question: unknown; selected?: string | null }[]; expiresAt: Date }[]>();

  if (!stale.length) return 0;

  // One key lookup for all of them rather than one per attempt, then a single
  // round trip to write the scores back.
  const ids = [...new Set(stale.flatMap((a) => a.questions.map(String)))];
  const keys = await Question.find({ _id: { $in: ids } })
    .select('answer')
    .lean<{ _id: unknown; answer: string | null }[]>();
  const answerOf = new Map(keys.map((k) => [String(k._id), k.answer]));

  const writes = stale.map((a) => {
    const s = markAgainst(a.responses, answerOf);
    return {
      updateOne: {
        filter: { _id: a._id },
        update: {
          $set: {
            ...s,
            // the submission time is when the clock ran out, not when we noticed
            submittedAt: a.expiresAt,
            autoSubmitted: true,
          },
        },
      },
    };
  });
  await Attempt.bulkWrite(writes);
  return writes.length;
}
