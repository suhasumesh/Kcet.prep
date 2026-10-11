/**
 * Dump the questions that still have no worked solution, for solution_sheets.py.
 *
 *   node --env-file=.env.local tools/todo_inventory.mjs
 *
 * Read from the database rather than from the extracted JSON because the
 * seeder is where reprints are de-duplicated, chapters are re-tagged and
 * unusable crops are dropped: a queue built from the files would send me back
 * to questions that never ship.
 *
 * Ordered so a sheet holds one subject and one chapter wherever it can. The
 * solutions are written by hand, and staying inside one chapter keeps the
 * physics of a whole sheet in mind at once instead of switching every row.
 */
import process from 'node:process';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Run with --env-file=.env.local');
  process.exit(1);
}
await mongoose.connect(uri);
const Question = mongoose.connection.collection('questions');

const rows = await Question.find({
  solutionText: '',
  'solutionImages.0': { $exists: false },
}).project({
  bank: 1, subject: 1, chapter: 1, year: 1, number: 1, book: 1, page: 1,
  seq: 1, answer: 1, stemImages: 1,
}).toArray();

const out = [];
for (const q of rows) {
  const src = (q.stemImages || [])[0]?.src;
  if (!src) continue;                      // nothing to read the question from
  out.push({
    bank: q.bank || 'kcet',
    subject: q.subject,
    chapter: q.chapter || '',
    year: q.year || 0,
    number: q.number,
    book: q.book || '',
    page: q.page || 0,
    seq: q.seq || 0,
    answer: q.answer,
    src: String(src).replace(/^\/questions\//, ''),
    label: q.book ? `${q.book} Q${q.number}` : `KCET ${q.year} Q${q.number}`,
  });
}

const rank = (q) => `${q.subject}|${q.book || ''}|${q.chapter}|${String(q.year).padStart(4, '0')}|${String(q.page).padStart(5, '0')}|${String(q.number).padStart(3, '0')}`;
out.sort((a, b) => (rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0));

process.stdout.write(JSON.stringify(out));
console.error(`${out.length} question(s) without a worked solution`);
await mongoose.disconnect();
