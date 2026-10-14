import mongoose, { Schema, InferSchemaType } from 'mongoose';

/**
 * A single sitting of a test.
 *
 * Responses are stored as a parallel array to `questions` so a running test can
 * be patched one answer at a time without rewriting the document, and so a
 * dropped connection never loses more than the last answer.
 */
const ResponseSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selected: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    markedForReview: { type: Boolean, default: false },
    visited: { type: Boolean, default: false },
    timeSpentMs: { type: Number, default: 0 },
  },
  { _id: false },
);

const ViolationSchema = new Schema(
  {
    kind: { type: String, required: true }, // blur | fullscreen-exit | tab-hidden | copy | contextmenu | devtools
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    mode: { type: String, enum: ['full', 'subject', 'chapter', 'pyq', 'topic'], required: true },
    // which bank the questions came from, so history can be filtered by it
    bank: { type: String, enum: ['kcet', 'pradeep'], default: 'kcet', index: true },
    title: { type: String, required: true },
    subjects: { type: [String], default: [] },
    chapters: { type: [String], default: [] },
    year: { type: Number, default: null },

    durationSec: { type: Number, required: true },
    questions: { type: [{ type: Schema.Types.ObjectId, ref: 'Question' }], default: [] },
    responses: { type: [ResponseSchema], default: [] },

    startedAt: { type: Date, default: Date.now },
    // The clock starts when the student actually enters the test, not when the
    // attempt is created -- exam mode shows an instructions screen first.
    beganAt: { type: Date, default: null },
    // authoritative deadline, set server-side so a tampered clock cannot extend it
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },

    secureMode: { type: Boolean, default: true },
    violations: { type: [ViolationSchema], default: [] },

    score: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AttemptSchema.index({ user: 1, submittedAt: -1 });

export type AttemptDoc = InferSchemaType<typeof AttemptSchema>;
export const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);
