/**
 * Load the extracted question bank into MongoDB.
 *
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Idempotent: questions are keyed on (subject, year, number), so re-running
 * after a re-extract updates in place rather than duplicating.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTRACTED = path.join(ROOT, 'data', 'extracted');
const SOLUTIONS = path.join(ROOT, 'data', 'solutions');

/** The batch files, in the order they are applied. Leading "_" marks a note. */
function solutionFiles() {
  if (!fs.existsSync(SOLUTIONS)) return [];
  return fs.readdirSync(SOLUTIONS).sort()
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
}

/** Just the keys, needed before the batches themselves are read. */
function solutionKeys() {
  const out = new Set();
  for (const f of solutionFiles()) {
    for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(SOLUTIONS, f), 'utf8')))) {
      out.add(k);
    }
  }
  return out;
}
const PRADEEP = path.join(ROOT, 'data', 'pradeep');
const CHAPTERWISE = path.join(ROOT, 'data', 'chapterwise');
const KEA = path.join(ROOT, 'data', 'extracted-kea');
const ASSETS = path.join(ROOT, 'public', 'questions');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed.mjs');
  process.exit(1);
}

const syllabus = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'syllabus.json'), 'utf8'));
const pucOf = new Map();
const canonical = new Map();
const fold = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
for (const [subject, chapters] of Object.entries(syllabus)) {
  for (const c of chapters) {
    pucOf.set(`${subject}|${c.name}`, c.puc);
    canonical.set(`${subject}|${fold(c.name)}`, c.name);
  }
}

/**
 * The books print their own chapter titles ("Haloalkanes And Haloarenes").
 * Folding them onto the syllabus spelling keeps one chapter from appearing
 * twice in the analytics, once per source.
 */
function canonicalChapter(subject, chapter) {
  if (!chapter) return 'Unclassified';
  // "Chapter 1" is what is left when a book never printed a chapter name the
  // extractor could read and too few of its questions agreed on one. Showing
  // it in the chapter list would offer a drill no student could interpret.
  if (/^chapter\s*\d+$/i.test(chapter.trim())) return 'Unclassified';
  return canonical.get(`${subject}|${fold(chapter)}`) ?? chapter;
}

/** Point an image at the WebP the asset build produced, if it exists. */
function toAsset(img) {
  if (!img?.src) return null;
  const webp = img.src.replace(/\.png$/i, '.webp');
  if (!fs.existsSync(path.join(ASSETS, webp))) return null;
  return { src: webp, w: img.w, h: img.h };
}

const QuestionSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Question = mongoose.model('Question', QuestionSchema, 'questions');

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log('connected to', mongoose.connection.name);

  // Indexes first. An index from an earlier shape of the data -- back when a
  // question was identified by (subject, year, number) alone -- rejects every
  // reference-book row, so it has to go before anything is written.
  await Question.collection.dropIndexes().catch(() => {});
  await Question.collection.createIndex(
    { bank: 1, subject: 1, year: 1, number: 1, book: 1, page: 1, seq: 1 },
    { unique: true },
  );
  await Question.collection.createIndex({ bank: 1, subject: 1, chapter: 1 });

  // Rows written before the bank/seq fields existed cannot be matched by the
  // upsert filter, so they would survive as duplicates beside their rewritten
  // selves. They are derived data, so clearing them is safe.
  const legacy = await Question.deleteMany({
    $or: [{ bank: { $exists: false } }, { seq: { $exists: false } }],
  });
  if (legacy.deletedCount) {
    console.log(`cleared ${legacy.deletedCount} row(s) from an older schema`);
  }

  const read = (dir, file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const listed = (dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      : [];

  // Two sources can hold the same subject and year: the user's own copies and
  // the official KEA booklets downloaded alongside them. They are the same
  // paper, so only the fuller extraction is shipped -- loading both would put
  // the same question in the bank twice.
  const papers = new Map();
  for (const file of listed(EXTRACTED)) papers.set(file, read(EXTRACTED, file));
  for (const file of listed(KEA)) {
    const rows = read(KEA, file);
    const existing = papers.get(file);
    if (!existing || rows.length > existing.length) papers.set(file, rows);
  }

  let ops = [];
  let skipped = 0;
  // A question that reached the bank twice -- once from the paper it was set
  // in, once from a chapterwise book that reprints it -- would come up twice
  // in the same practice set. The paper is loaded first and wins.
  // Compared on the opening of the stem with everything but letters and
  // digits removed: the two sources number and space a question differently,
  // and one of them has been through OCR, so only the shape of the first few
  // words is reliably the same in both.
  const fromPapers = new Set();
  const fingerprint = (subject, year, stem) =>
    `${subject}|${year}|` +
    String(stem)
      .toLowerCase()
      .replace(/^\s*\d{1,3}\s*[.)]\s*/, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 40);

  for (const [file, rows] of [...papers.entries()].sort()) {
    for (const q of rows) {
      // Only complete, scorable questions ship: a missing key cannot be marked,
      // and a question whose extraction lost an option would be unanswerable.
      const letters = (q.options || []).map((o) => o.letter).join('');
      if (!['A', 'B', 'C', 'D'].includes(q.answer) || letters !== 'ABCD') {
        skipped++;
        continue;
      }
      const doc = {
        subject: q.subject,
        chapter: q.chapter || 'Unclassified',
        puc: pucOf.get(`${q.subject}|${q.chapter}`) ?? 0,
        year: q.year,
        number: q.number,
        stemText: q.stemText || '',
        stemImages: (q.stemImages || []).map(toAsset).filter(Boolean),
        options: (q.options || []).map((o) => ({
          letter: o.letter,
          text: o.text || '',
          img: toAsset(o.img),
        })),
        answer: q.answer,
        solutionText: q.solutionText || '',
        solutionImages: (q.solutionImages || []).map(toAsset).filter(Boolean),
        chapterConfidence: q.chapterConfidence || 'none',
        source: q.source || '',
        bank: 'kcet',
        book: '',
        page: 0,
        seq: 0,
        // This row came off a whole paper, so it can be replayed in order as
        // "KCET 2016 Physics". Chapterwise and reference-book rows cannot.
        paper: true,
        // scanned papers are cropped as one band, options included, and the
        // KEA booklets number those options (1) to (4)
        optionsInImage: Boolean(q.optionsInImage),
        optionStyle: 'number',
      };
      fromPapers.add(fingerprint(doc.subject, doc.year, doc.stemText));
      ops.push({
        updateOne: {
          filter: {
            bank: 'kcet', subject: doc.subject, year: doc.year,
            number: doc.number, book: '', page: 0, seq: 0,
          },
          update: { $set: doc },
          upsert: true,
        },
      });
    }
  }

  // A crop from a book is only a question if the four choices are printed in
  // it. Some bands caught revision notes, a worked answer, a multi-part
  // exercise or two questions at once -- 34 of them in the Pradeep volumes --
  // and a student meeting one of those mid-test has been handed something
  // unanswerable. Three of the four markers is the test, which tolerates one
  // the OCR missed while still excluding prose.
  //
  // The test is on the OCR text, which is not perfect, so a crop I have
  // already read and written working for is kept whatever the text looks
  // like: having been solved by hand is better evidence than three bracketed
  // letters. Two real questions were lost to the gate before this exception
  // was added.
  const OPTION_MARK = /\(\s*([a-d])\s*\)/g;
  const solvedByHand = solutionKeys();
  function looksLikeQuestion(text, key) {
    if (key && solvedByHand.has(key)) return true;
    const seen = new Set();
    for (const m of String(text || '').matchAll(OPTION_MARK)) seen.add(m[1]);
    return seen.size >= 3;
  }
  let notQuestions = 0;

  // ---- reference-book questions, kept in their own bank ------------------
  const BOOK_LABEL = {
    'pradeep-physics-11': 'Pradeep Physics · Class 11',
    'pradeep-physics-12': 'Pradeep Physics · Class 12',
    'pradeep-chemistry-11': 'Pradeep Chemistry · Class 11',
    'pradeep-chemistry-12': 'Pradeep Chemistry · Class 12',
  };
  let pradeepCount = 0;
  if (fs.existsSync(PRADEEP)) {
    for (const file of fs.readdirSync(PRADEEP).filter((f) => f.endsWith('.json')).sort()) {
      const rows = JSON.parse(fs.readFileSync(path.join(PRADEEP, file), 'utf8'));
      for (const q of rows) {
        const img = toAsset(q.image);
        // the crop is the whole question; without it there is nothing to show
        if (!img || !['A', 'B', 'C', 'D'].includes(q.answer)) {
          skipped++;
          continue;
        }
        const label = BOOK_LABEL[q.source] || q.source;
        const bankKey = ['pradeep', q.subject, 0, q.number, label, q.page || 0, q.seq || 0].join('|');
        if (!looksLikeQuestion(q.stemText, bankKey)) {
          notQuestions++;
          continue;
        }
        const chapter = canonicalChapter(q.subject, q.chapter);
        const doc = {
          subject: q.subject,
          chapter,
          puc: pucOf.get(`${q.subject}|${chapter}`) ?? 0,
          bank: 'pradeep',
          book: label,
          year: 0,
          number: q.number,
          page: q.page,
          seq: q.seq ?? 0,
          stemText: q.stemText || '',
          stemImages: [img],
          // options are printed inside the crop, as in the book
          options: ['A', 'B', 'C', 'D'].map((letter) => ({ letter, text: '', img: null })),
          answer: q.answer,
          solutionText: '',
          solutionImages: [],
          chapterConfidence: q.chapterConfidence || 'none',
          source: q.source || '',
          paper: false,
          optionsInImage: true,
          optionStyle: 'letter',       // the books print (a) to (d)
        };
        pradeepCount++;
        ops.push({
          updateOne: {
            filter: {
              bank: 'pradeep', subject: doc.subject, year: 0,
              number: doc.number, book: label, page: doc.page, seq: doc.seq,
            },
            update: { $set: doc },
            upsert: true,
          },
        });
      }
    }
    console.log(`found ${pradeepCount} reference-book questions` +
                (notQuestions ? ` (${notQuestions} crops dropped: no printed options)` : ''));
  }

  // ---- chapterwise books: real past papers, already filed by chapter ------
  // These sit in the main bank, because they are the same exam questions the
  // papers hold -- just sorted by topic instead of by year, and with the
  // publisher's worked solution attached. They are marked paper:false so a
  // year replay still means the sixty questions of that year's paper.
  const CHAPTER_BOOK = {
    'mtg-physics': 'MTG Karnataka-CET Chapterwise · Physics',
    'mtg-maths': 'MTG Karnataka-CET Chapterwise · Mathematics',
    'mtg-chemistry': 'MTG Karnataka-CET Chapterwise · Chemistry',
  };
  let chapterwiseCount = 0;
  let reprints = 0;
  if (fs.existsSync(CHAPTERWISE)) {
    for (const file of fs.readdirSync(CHAPTERWISE).filter((f) => f.endsWith('.json')).sort()) {
      const rows = JSON.parse(fs.readFileSync(path.join(CHAPTERWISE, file), 'utf8'));
      for (const q of rows) {
        const img = toAsset(q.image);
        if (!img || !['A', 'B', 'C', 'D'].includes(q.answer)) {
          skipped++;
          continue;
        }
        if (fromPapers.has(fingerprint(q.subject, q.year, q.stemText))) {
          reprints++;
          continue;
        }
        const label = CHAPTER_BOOK[q.source] || q.source;
        const chapter = canonicalChapter(q.subject, q.chapter);
        const doc = {
          subject: q.subject,
          chapter,
          puc: pucOf.get(`${q.subject}|${chapter}`) ?? 0,
          bank: 'kcet',
          book: label,
          year: q.year || 0,
          number: q.number,
          page: q.page,
          seq: q.seq ?? 0,
          stemText: q.stemText || '',
          stemImages: [img],
          options: ['A', 'B', 'C', 'D'].map((letter) => ({ letter, text: '', img: null })),
          answer: q.answer,
          solutionText: '',
          solutionImages: (q.solutionImages || []).map(toAsset).filter(Boolean),
          chapterConfidence: q.chapterConfidence || 'high',
          source: q.source || '',
          paper: false,
          optionsInImage: true,
          optionStyle: 'letter',       // the books print (a) to (d)
        };
        chapterwiseCount++;
        ops.push({
          updateOne: {
            filter: {
              bank: 'kcet', subject: doc.subject, year: doc.year,
              number: doc.number, book: label, page: doc.page, seq: doc.seq,
            },
            update: { $set: doc },
            upsert: true,
          },
        });
      }
    }
    console.log(`found ${chapterwiseCount} chapterwise questions ` +
                `(${reprints} skipped as reprints of a paper already loaded)`);
  }

  // ---- hand-written solutions ------------------------------------------
  // The official booklets and the Pradeep volumes print an answer key and no
  // working at all. Those solutions are written against the question crop --
  // the OCR text of a scanned paper interleaves lines across question
  // boundaries, so it cannot be trusted to say which question is which --
  // and kept here, keyed the same way the bank is, so a re-extract or a
  // reseed never loses them.
  const handWritten = new Map();
  if (fs.existsSync(SOLUTIONS)) {
    for (const file of solutionFiles()) {
      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(SOLUTIONS, file), 'utf8'));
      } catch (e) {
        // Name the file. A bare "Unexpected token" after the upsert has already
        // run tells you nothing about which batch of solutions is malformed.
        throw new Error(`data/solutions/${file} is not valid JSON: ${e.message}`);
      }
      for (const [k, v] of Object.entries(parsed)) handWritten.set(k, v);
    }
  }
  let applied = 0;
  let retagged = 0;
  let regraded = 0;
  for (const op of ops) {
    const f = op.updateOne.filter;
    const doc = op.updateOne.update.$set;
    // An entry is the solution text, or {s, ch} when reading the question
    // also showed the chapter classifier had put it in the wrong place.
    const entry = handWritten.get(
      [f.bank, f.subject, f.year, f.number, f.book, f.page, f.seq].join('|'));
    if (!entry) continue;
    const text = typeof entry === 'string' ? entry : entry.s;
    // Never overwrite the examiner's own working with ours.
    if (text && !doc.solutionText && !doc.solutionImages.length) {
      doc.solutionText = text;
      doc.solutionSource = 'written';
      applied++;
    }
    // A key that is demonstrably wrong is corrected rather than shipped: a
    // question that marks a student down for the right answer is worse than
    // no question at all. Only used where the chemistry is unambiguous, and
    // always alongside a solution that shows the working.
    if (typeof entry === 'object' && entry.answer
        && ['A', 'B', 'C', 'D'].includes(entry.answer)) {
      if (doc.answer !== entry.answer) {
        doc.answer = entry.answer;
        regraded++;
      }
    }
    if (typeof entry === 'object' && entry.ch) {
      doc.chapter = canonicalChapter(doc.subject, entry.ch);
      doc.puc = pucOf.get(`${doc.subject}|${doc.chapter}`) ?? doc.puc;
      doc.chapterConfidence = 'high';
      retagged++;
    }
  }
  if (retagged) console.log(`re-tagged ${retagged} question(s) read by hand`);
  if (regraded) console.log(`corrected the answer key on ${regraded} question(s)`);
  if (handWritten.size) {
    console.log(`applied ${applied} hand-written solution(s) of ${handWritten.size} on file`);
  }

  // ---- questions withdrawn after being read ------------------------------
  // Reading every crop to write solutions turned up two kinds of row that
  // must not reach a student: a crop that is not a complete question (prose,
  // revision notes, options cut off at the foot of the band) and a question
  // whose printed key is wrong or undecidable. Both were noted by hand in
  // _broken.json and _suspect.json, which until now only kept them out of my
  // own work queue -- they still shipped. They are dropped here instead.
  //
  // The two lists are overridden differently. _suspect.json records a doubt
  // about the answer, and writing the working settles it, so a hand-written
  // solution releases the question. _broken.json records a defect in the crop
  // -- prose, a cut-off option, two questions in one band -- and understanding
  // the question does nothing to repair the picture the student is shown, so
  // the solution is kept on file against a future re-crop but the question
  // stays out of the bank until the crop itself is fixed.
  const withdrawn = new Set();
  for (const [file, releasedBySolution] of [['_broken.json', false], ['_suspect.json', true]]) {
    const p = path.join(SOLUTIONS, file);
    if (!fs.existsSync(p)) continue;
    for (const k of Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')))) {
      if (k.startsWith('_')) continue;          // free-text notes, not keys
      if (releasedBySolution && handWritten.has(k)) continue;
      withdrawn.add(k);
    }
  }
  const kept = ops.filter((op) => {
    const f = op.updateOne.filter;
    return !withdrawn.has([f.bank, f.subject, f.year, f.number, f.book, f.page, f.seq].join('|'));
  });
  if (kept.length !== ops.length) {
    console.log(`withdrew ${ops.length - kept.length} question(s) flagged unusable by hand`);
  }
  ops = kept;

  console.log(`upserting ${ops.length} questions (${skipped} skipped for missing answer key)...`);
  for (let i = 0; i < ops.length; i += 500) {
    const res = await Question.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    process.stdout.write(`  ${Math.min(i + 500, ops.length)}/${ops.length}  (+${res.upsertedCount} new)\r`);
  }
  console.log('\n');

  // The extraction is the source of truth: anything in the collection that it
  // no longer produces -- a question later found to be incomplete, say -- is
  // removed, so a re-run cannot leave a broken row behind.
  const keyOf = (d) => `${d.bank || 'kcet'}|${d.subject}|${d.year || 0}|${d.number}|${d.book || ''}|${d.page || 0}|${d.seq || 0}`;
  const live = new Set(ops.map((o) => keyOf(o.updateOne.filter)));
  const stale = (await Question.find({}).select('bank subject year number book page seq').lean())
    .filter((d) => !live.has(keyOf(d)))
    .map((d) => d._id);
  if (stale.length) {
    await Question.deleteMany({ _id: { $in: stale } });
    console.log(`removed ${stale.length} question(s) no longer produced by the extraction`);
  }

  const bySubject = await Question.aggregate([
    { $group: { _id: { bank: '$bank', subject: '$subject' }, n: { $sum: 1 },
                chapters: { $addToSet: '$chapter' } } },
    { $sort: { '_id.bank': 1, '_id.subject': 1 } },
  ]);
  for (const s of bySubject) {
    console.log(`${(s._id.bank || 'kcet').padEnd(8)} ${s._id.subject.padEnd(12)} ` +
                `${String(s.n).padStart(4)} questions across ${s.chapters.length} chapters`);
  }
  const withImages = await Question.countDocuments({ 'stemImages.0': { $exists: true } });
  const withSolution = await Question.countDocuments({
    $or: [{ solutionText: { $ne: '' } }, { 'solutionImages.0': { $exists: true } }],
  });
  console.log(`\ntotal ${await Question.countDocuments()} | with crops ${withImages} | with worked solution ${withSolution}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
