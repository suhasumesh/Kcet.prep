import mongoose, { Schema, InferSchemaType } from 'mongoose';

/**
 * One MCQ from a KCET paper.
 *
 * Both a text and an image form are stored for every part. The source PDFs
 * render all mathematics as images, so `*Images` is the faithful rendering and
 * `*Text` is what remains searchable and classifiable. The UI shows the image
 * whenever one exists and falls back to the text otherwise.
 */
const ImageSchema = new Schema(
  { src: String, w: Number, h: Number },
  { _id: false },
);

const OptionSchema = new Schema(
  {
    letter: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: String, default: '' },
    img: { type: ImageSchema, default: null },
  },
  { _id: false },
);

const QuestionSchema = new Schema(
  {
    subject: { type: String, required: true, index: true },
    chapter: { type: String, default: 'Unclassified', index: true },
    // which collection this came from: the KCET papers, or a reference book.
    // They are practised separately, so every query carries this.
    bank: { type: String, enum: ['kcet', 'pradeep'], default: 'kcet', index: true },
    book: { type: String, default: '' },
    puc: { type: Number, default: 0 },
    year: { type: Number, required: true, index: true },
    number: { type: Number, required: true },
    stemText: { type: String, default: '' },
    stemImages: { type: [ImageSchema], default: [] },
    options: { type: [OptionSchema], default: [] },
    answer: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    solutionText: { type: String, default: '' },
    solutionImages: { type: [ImageSchema], default: [] },
    chapterConfidence: { type: String, default: 'none' },
    // The topic inside the chapter, and the relation it tests, both decided
    // by the seeder. Computing these at request time meant reading the stem,
    // options and solution of every question in the bank on each cold start
    // — about 2,600 full documents and the better part of two seconds — to
    // answer a question whose answer only changes when the bank is re-seeded.
    topic: { type: String, default: '' },
    topicFormula: { type: String, default: '' },
    source: { type: String, default: '' },
    page: { type: Number, default: 0 },
    seq: { type: Number, default: 0 },
    // True only for a row that came off a whole exam paper. The chapterwise
    // books reprint the same questions sorted by topic, so they carry a year
    // but cannot stand in for the paper: a year replay filters on this.
    paper: { type: Boolean, default: false, index: true },
    // a scanned question is cropped as one band, its options inside the image
    optionsInImage: { type: Boolean, default: false },
    // and when they are, how that source marks them: the KEA booklets print
    // (1)..(4), every book in the bank prints (a)..(d). The answer buttons
    // copy this, so a student is never asked to translate one into the other.
    optionStyle: { type: String, enum: ['letter', 'number'], default: 'number' },
  },
  { timestamps: true },
);

// a reference-book question has no exam year, so its identity is the book and
// the page and position it was cropped from
QuestionSchema.index({ bank: 1, subject: 1, year: 1, number: 1, book: 1, page: 1, seq: 1 },
  { unique: true });
QuestionSchema.index({ bank: 1, subject: 1, chapter: 1 });

export type QuestionDoc = InferSchemaType<typeof QuestionSchema>;
export const Question =
  mongoose.models.Question || mongoose.model('Question', QuestionSchema);
