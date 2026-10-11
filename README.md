# KCET Prep

Free, unlimited practice for the Karnataka Common Entrance Test — full mock
tests, subject and chapter papers built from real previous-year questions,
step-by-step solutions, weakness tracking and a study plan that follows your
results.

Everything in the stack is free: Next.js, MongoDB Atlas' free tier, and SMTP
from whichever free provider you point it at.

---

## What is in the question bank

Built from the papers in `KCET Question Papers PY/`, the official KEA booklets
downloaded alongside them, and the reference volumes in `Ref_Books/`:

| Source | Files | Questions | Answer key | Worked solution |
|---|---|---|---|---|
| PhysicsWallah compilations and KEA originals, 2012–2026 | 29 | 1,624 | in the file, or the official key | 1,080 |
| Official KEA booklets, 2004–2015, OCR'd | 34 | 1,024 | official A-1 key | no |
| MTG chapterwise solutions (Physics, Mathematics) | 2 | 829 | printed in the book | 483 |
| **KCET bank** | | **3,276** | **all** | **1,563** |
| Pradeep reference volumes (Physics, Chemistry) | 4 | 829 | printed in the book | no |
| **Shipped total** | | **4,105** | **all** | **1,563** |

KCET bank: Mathematics 1,437 · Physics 1,006 · Chemistry 833. Reference bank:
Chemistry 619 · Physics 210, practised from its own tab and never mixed into a
KCET test. 87% of questions are tagged to a syllabus chapter; the rest sit in
an `Unclassified` bucket that still appears in mock and past-paper tests.

The chapterwise books are the same KCET questions as the papers, sorted by
topic instead of by year, so they carry a year but are marked `paper: false`:
a year replay still means the sixty questions of that year's paper, and a
question the books reprint from a paper already loaded is dropped rather than
offered twice.

Papers still missing an answer key are not loaded — see
[Adding the scanned papers](#adding-the-scanned-papers).

Every question is stored twice over: as a **cropped image** of the exact region
of the original paper, and as whatever **text** could be extracted. The crop is
what students see. This matters because these PDFs render every formula, graph
and circuit diagram as an image, so a text-only extraction silently drops the
mathematics. The text is kept for search, for screen readers, and to drive
chapter classification.

Chapters are assigned by a deterministic keyword classifier
(`tools/syllabus.py`, `tools/classify.py`) against the Karnataka PUC syllabus.
Nothing is force-fitted into a chapter it does not belong to — a question the
classifier is not sure about stays `Unclassified` and is still used in mock and
past-paper tests.

---

## Running it

```bash
npm install
cp .env.example .env.local        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                      # loads data/extracted/*.json into MongoDB
npm run dev
```

`public/questions/` must contain the WebP crops. They are generated, not
committed — see the pipeline below.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas free tier is enough |
| `JWT_SECRET` | yes | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `APP_URL` | yes in production | used to build links in emails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | no | with SMTP unset, confirmation and reset links are printed to the server console so sign-up still works locally |

---

## The books in `Ref_Books/`

Two different kinds of book, handled two different ways.

The **MTG *Karnataka-CET Chapterwise Solutions*** volumes are past KCET papers
sorted by topic, each question tagged with the year it was asked and followed
by the official answer and a worked explanation. They go into the main bank,
because they are the same exam: `tools/extract_chapterwise.py` reads the
Physics volume from its text layer, and `tools/extract_chapterwise_ocr.py`
reads the Mathematics one, which has no text layer at all, from a cached OCR
pass over all 180 pages.

Both state every answer twice — once in the grid at the end of a chapter, once
at the head of the worked explanation — and both are read, so the two can be
checked against each other. That check earned its place: the key is a grid of
sixteen cells a row, and the scan is tilted just enough that sorting the OCR
boxes by y hands question 8 the letter belonging to question 7. Read as a
stream of text, **half** the Mathematics answers came out wrong and agreed
with the explanations only 48% of the time. Pairing each number with the
letter printed beside it took that to 99.8%. Where the two still disagree the
question is dropped: a wrong answer is worse than no question, because it
marks a student down for being right.

The **Pradeep volumes** are a textbook's own exercises, not past papers, so
they get a second, separate bank with its own tab ("Pradeep") that never mixes
with the exam papers in a test — KCET analytics stay about KCET.

`tools/extract_pradeep.py` works the same way as the paper extractors -- text
layer for positions, pixels for content -- with three correctness guards that
matter more here, because the OCR in these volumes is poor:

- an answer block is only accepted as a key when the numbers it lists **overlap
  the preceding run of questions by at least half**, which is what stops a page
  of "Fig. 0.5 (a)" references being read as answers
- only single-letter answers are kept, which drops the multi-correct,
  assertion-reason and matching sections automatically
- a crop containing **two** sets of option labels is split only when the
  numbering proves exactly one question is hidden, and otherwise discarded

`tools/audit_pradeep.py` re-opens every source page afterwards and checks that
each question number is really printed there, that the recorded answer is one
of the options visible in the crop, and that no crop holds two questions.
`--sheet N` additionally writes a contact sheet of N random crops captioned
with their recorded answers, for checking by eye.

```bash
python tools/extract_pradeep_all.py
python tools/classify.py          # also names chapters the books left unnamed
python tools/audit_pradeep.py
python tools/build_assets.py
node --env-file=.env.local scripts/seed.mjs
```

Chapter names come from the running head where it is legible, matched against
the syllabus so series branding cannot become a chapter. Where a volume never
names a chapter, every question in it is classified and the group votes on the
name — one question's keywords can mislead, forty rarely do.

---

## The data pipeline

```
KCET Question Papers PY/**.pdf
          │
          ├─ tools/extract_all.py        PDFs that have a text layer
          │     ├─ extract_pyq.py        PhysicsWallah layout (2020-2025)
          │     └─ extract_classic.py    "CET - SUBJECT - YEAR" layout (2012)
          │
          ├─ tools/extract_scans_all.py  PDFs with no text layer (OCR)
          │     └─ extract_scanned.py
          │
          ├─ tools/extract_pradeep_all.py  the Pradeep reference volumes
          │     └─ extract_pradeep.py
          │
          ├─ tools/extract_chapterwise.py      MTG chapterwise, text layer
          │     └─ extract_chapterwise_ocr.py  ... and the one without
          │           └─ ocr_cache.py          OCR once, parse many times
          │
          ├─ tools/classify.py           tags each question with a chapter
          ├─ tools/build_assets.py       PNG crops -> public/questions/*.webp
          ├─ tools/verify_bank.py        integrity check before shipping
          └─ scripts/seed.mjs            -> MongoDB

tools/read_key_table.py   reads an official KEA key sheet into data/answer-keys/
```

Run the whole thing:

```bash
pip install pymupdf pillow rapidocr-onnxruntime
python tools/extract_all.py        # papers with a text layer
python tools/extract_scans_all.py  # scanned booklets (needs answer keys)
python tools/extract_pradeep_all.py
python tools/extract_chapterwise.py Ref_Books/<physics-chapterwise>.pdf \
    --subject Physics --label mtg-physics --out data/chapterwise
python tools/ocr_cache.py Ref_Books/<maths-chapterwise>.pdf --label mtg-maths
python tools/extract_chapterwise_ocr.py Ref_Books/<maths-chapterwise>.pdf \
    --subject Mathematics --label mtg-maths --out data/chapterwise
python tools/classify.py           # chapter tags
python tools/build_assets.py --purge
python tools/verify_bank.py        # refuses to ship a broken question
node --env-file=.env.local scripts/seed.mjs
```

### How the extractors work

The PhysicsWallah papers are two- or three-column, and the grid shifts from
page to page, so the column boundaries are **measured** rather than assumed:
`Q<n>` labels and `(A)` markers are clustered to find each column's left edge.
Several things that look like details are load-bearing, and each one was a bug
first:

- the edge is a cluster's **minimum**, not its mean — a mean drifts right and
  leaks a column's first block into its neighbour
- a column runs to just before the *next* column's edge, not to the midpoint
  between edges, which would clip every wide line in half
- column width is measured against images and drawings too, not just text,
  because the formulae *are* images
- a single stray marker does not get to invent a column
- a formula image that overhangs the divider is followed to its true edge, and
  the neighbouring column's text is masked out of the crop

### Adding the scanned papers

`tools/extract_scanned.py` recovers the 2010/2011/2016/2026 booklets, which have
no text layer at all. OCR is used only to *locate* question numbers and option
markers; the content is cropped from the page image, so diagrams survive intact.
Each question is cropped as **one band** covering its stem and all four options,
and the interface shows bare 1–4 buttons beside it — the markers the booklets
themselves print. The books in `Ref_Books/` letter their options (a) to (d)
instead, so their questions get lettered buttons; `optionStyle` on the question
decides, and the buttons always match the page the student is reading.

Three deliberate restrictions keep the output trustworthy rather than large:

- a question is emitted only when its **printed number was actually read** —
  numbering by position would shift every later question and silently misalign
  the answer key
- a band must contain **exactly one** set of four option markers, or it is
  dropped as having swallowed its neighbour
- the booklet's **cover is skipped**. Its instructions are a numbered list, and
  item 5 of it looks exactly like question 5 to a number-driven extractor: a
  number at the left margin with a paragraph beside it. It was shipping as a
  question in 21 papers, and worse, it set the running count to 5, so the real
  questions 1 to 4 of each of those papers were then rejected for going
  backwards. A page with no option markers whose words are the cover's words
  is not a page of questions.

That yields roughly half of each paper, correctly numbered.

Both drivers take a `SUBJECT-YEAR` filter, because OCR of one paper takes
minutes and a fix that affects a few of them should not re-read all thirty:

```bash
python tools/extract_scans_all.py physics-2016 chemistry-2016
python tools/extract_kea_scans.py physics-2015 mathematics-2013
```

These booklets contain no answer key, so nothing from them is loaded until you
supply one. KEA publishes a key sheet covering all sixteen booklet versions;
`tools/read_key_table.py` reads one straight into place:

```bash
python tools/read_key_table.py key-sheet.pdf --version A1 --subject Physics --year 2026
```

It locates the requested version's columns geometrically, reads them in slices,
and refuses to write anything unless the question column reads exactly 1..60 —
so a misread row aborts the run instead of shifting the key by one. A cell that
defeats OCR entirely is supplied after reading it yourself, with `--fix 46=4`.

Failing that, write the file by hand at `data/answer-keys/<subject>-<year>.json`:

```json
{ "1": "C", "2": "D", "3": "A" }
```

Letters `A`–`D` map to the printed options `(1)`–`(4)`; plain integers `1`–`4`
work too. Then:

```bash
python tools/extract_scans_all.py
python tools/classify.py
python tools/build_assets.py
node --env-file=.env.local scripts/seed.mjs
```

Questions without a key are held back rather than guessed. Use the official KEA
key for the **same version code** as the booklet (the papers here are version
A-1) — a key from another version will be shuffled and wrong.

---

## How the app works

**Scoring follows KEA.** One mark per correct answer and **nothing deducted for
a wrong one**, so a practice score is directly comparable to a real one, and the
results page says plainly that a guess always beats a blank.

**Answers are never in the browser during a test.** The question payload is
fetched without the key; scoring happens server-side on submit, and only then
does the key reach the client. The deadline is set server-side on first entry,
so neither a tampered clock nor a reload extends it, and the clock does not
start while the instructions are on screen.

**Exam mode** runs full screen, blocks copy/cut/paste, right-click and the
developer-tools shortcuts, and records every time the window is left. Three
warnings and the test submits itself.

> A web page cannot stop other applications or windows from being opened — no
> browser exposes that, and any product claiming otherwise is either a desktop
> app or wrong. What this mode does is make leaving obvious and recorded, the
> way an invigilated centre would.

**Weakness tracking** is confidence-weighted: raw accuracy on three questions is
noise, so chapter mastery is pulled toward 50% until enough evidence exists. A
chapter has to be demonstrated repeatedly before it reads as strong.

**The study plan** is generated from what you actually get wrong, interleaved
across subjects so it never becomes three days of only Mathematics, with a
weekly timed paper and a review day after it.

---

## Checking it still works

With the server running:

```bash
npm run smoke
```

Registers a throwaway account, builds a past paper, answers it, submits,
and then asserts the things that matter: that the answer key is absent from the
payload until submission, that a late answer is refused, that re-submitting is a
no-op, that the score adds up with no negative marking, and that one account
cannot read another's attempt. Forty checks, all of which must pass.

`python tools/verify_bank.py` does the same for the data, across all four
sources: no duplicates, four options everywhere, every answer in A–D, every
chapter in the syllabus, every referenced crop present on disk.

```bash
node scripts/ui.mjs ./shots Mathematics "Inverse Trigonometric"
```

drives the real browser the way a student would — sign up, build the test,
click through it, submit, open a solution, then analytics and the plan — and
reports anything the page logs, any request that fails, any crop that did not
load, and whether the layout fits a 390px screen. Screenshots are written for
review by eye. The subject and chapter arguments aim it at whatever part of
the bank has just changed: a chapter served by only one source is the
sharpest test of that source.

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel                            # first deploy, links the project
vercel env add MONGODB_URI        # and JWT_SECRET, APP_URL, the SMTP_* vars
vercel --prod
```

Three things matter on a free plan.

**The crops ship with the app.** `public/questions/` is committed, not
generated at build time — the PDFs and the Python pipeline are not available
on a build server. `tools/build_assets.py` keeps that directory to roughly
70 MB by writing greyscale WebP at 1000px, and by refusing to emit an image no
question refers to. The pages are black ink on white paper, so the colour
channels hold nothing but scanner noise.

**They are cached for a week.** Vercel serves `public/` with
`must-revalidate`, which costs a round trip per image, and a test loads sixty
of them. `vercel.json` overrides that for `/questions/*`. It is a week rather
than a year because re-running an extractor can change a crop under the same
name.

**The images can move off the deployment entirely.** Set
`NEXT_PUBLIC_ASSET_BASE` to the public URL of a bucket holding the contents of
`public/questions/` — Cloudflare R2 charges nothing for egress, and Vercel
Blob has a free tier — and every crop loads from there instead. Nothing else
changes.

Atlas's free tier allows 500 connections in total, so each serverless instance
keeps a pool of five and skips the index check on cold start; the seeder owns
the indexes.

---

## Layout

```
src/app/(app)/      overview, practice builder, Pradeep bank, history, analytics, plan
src/app/test/[id]/  the test runner (its own shell, no navigation)
src/app/results/    score breakdown and question-by-question solutions
src/app/api/        auth, catalog, attempts, analytics, plan
src/lib/            db, auth, mail, exam rules, analytics, planner
tools/              the Python extraction pipeline
scripts/seed.mjs    loads extracted JSON into MongoDB
scripts/smoke.mjs   end-to-end API test
```

---

## Licensing note

Questions are reproduced from previous-year KCET papers that circulate
publicly, for study purposes, and the app is free to use.

Two of the sources are commercially published compilations. The Pradeep bank
is cropped from the Pradeep volumes, and the chapterwise bank from the MTG
*Karnataka-CET Chapterwise Solutions* books; in both cases what is reproduced
is the page image. The books themselves are kept out of the repository
(`Ref_Books/` is ignored) and the crops are rebuildable only by someone who
owns a copy, but the crops under `public/questions/` are the publishers'
typesetting. Anyone putting this online at scale should look at that first.
The KCET questions in those books are past papers, which the state publishes;
the typesetting and the worked solutions are not.
