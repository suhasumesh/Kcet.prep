"""
Extract from a chapterwise book that has no text layer at all.

The Mathematics volume of the MTG "Karnataka-CET Chapterwise Solutions" is a
pure image scan -- 180 pages, not one character of embedded text. So the same
job the text-layer extractor does is done here from OCR: find the chapter, the
question numbers, the answer key and the worked explanations, then crop the
questions straight out of the page image so every formula and figure survives
exactly as printed.

OCR is used only to locate things and to read the answer letters. It is never
shown to a student: the crop is.

Three things make this book tractable:

  * every page carries a running head naming its chapter, which is a far
    steadier signal than the display banner OCR scrambles into
    "CHAPTER ~ 5 ~ Inequalities ~ Linear"
  * each chapter ends with an ANSWER KEY and then EXPLANATIONS
  * every question is tagged with the year it was asked

The book's own chapter names do not always match the state syllabus, so they
are mapped onto it. A heading that covers two syllabus chapters at once --
"Matrices and Determinants" -- is not guessed at; each of its questions is
sent to the keyword classifier to be split between the two.
"""
import os
import re
import sys
import json
import argparse
import unicodedata
from collections import OrderedDict

import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syllabus import SUBJECTS                      # noqa: E402
from classify import compile_subject, classify     # noqa: E402
import ocr_cache                                   # noqa: E402

LEAD_NUMBER = re.compile(r'^(\d{1,3})\s*[.)]')
OPTION = re.compile(r'\(\s*([a-d])\s*\)')
ANSWER_PAIR = re.compile(r'(?<!\d)(\d{1,3})\s*[.,)]?\s*\(\s*([a-d])\s*\)', re.I)
MULTI_PAIR = re.compile(r'(?<!\d)(\d{1,3})\s*[.,)]?\s*\(\s*[a-d]\s*[,&]')
YEAR_TAG = re.compile(r'\(\s*(19|20)(\d{2})\s*\)')
SOLUTION_OPEN = re.compile(r'^\s*(\d{1,3})\s*[.,)]\s*\(?\s*([a-d])\s*[).:]', re.I)
PAGE_NUMBER = re.compile(r'^\d{1,3}[-.]?$')
# one cell of the answer-key grid, as OCR hands it over: the number and the
# letter arrive as two boxes, and the letter is often clipped to "(c" or "c)"
NUMBER_CELL = re.compile(r'^\)?\s*(\d{1,3})\s*[.,)]?\s*\(?$')
LETTER_CELL = re.compile(r'^[(\[]?\s*([a-d])\s*[)\].,]?$', re.I)
CELL_GAP = (8, 46)     # points from a number's left edge to its letter's
CELL_SKEW = 7          # ... and how far the scan tilts within one row

HEAD_BAND = 0.085      # the running head starts within the top 8.5% of a page
BANNER_BAND = 0.30     # a chapter banner is always within the top third
BANNER_DEPTH = 0.20    # ... and its words finish within a fifth of it
FOOT_BAND = 0.975
CROP_DPI = 200

# What the book calls a chapter, against what the syllabus calls it. Keys are
# squeezed to letters, because OCR runs the words together.
ALIAS = {
    'trigonometry': 'Trigonometric Functions',
    'binomialtheoremandmathematicalinduction': 'Binomial Theorem',
    'inverstrigonometricfunctions': 'Inverse Trigonometric Functions',
    'introductiontothreedimensionalgeometry': 'Introduction to Three Dimensional Geometry',
}
# Headings the book runs together that the syllabus keeps apart. Each question
# under one of these is classified individually.
# Matched on words rather than on the whole phrase, because a banner wraps and
# OCR returns its lines in whatever order the boxes sort into.
SPLIT = [
    (('matrices', 'determinants'), ('Matrices', 'Determinants')),
    (('trigonometry',), ('Trigonometric Functions', 'Inverse Trigonometric Functions')),
]
# A sign that settles a split outright, tried before the keyword classifier.
# The inverse functions are a chapter of their own in the syllabus but share
# the book's "Trigonometry", and the keyword lists cannot see them: in a scan
# "sin-1 x" is what "sin to the minus one x" looks like, and the prose form
# the keywords look for -- "arcsin", "sin inverse" -- never appears.
DISCRIMINATOR = {
    'Inverse Trigonometric Functions':
        re.compile(r'(sin|cos|tan|cot|sec|cosec)\s*[-−]\s*[1¹\']', re.I),
}
# lines that are furniture, not a chapter name
FURNITURE = re.compile(r'(karnataka|chapterwise|solutions|mathematics|physics|chemistry|mtg|wtg)')


def clean(s):
    s = unicodedata.normalize('NFKC', s.replace('\xa0', ' '))
    return re.sub(r'\s+', ' ', s).strip()


def squeeze(t):
    return re.sub(r'[^a-z0-9]+', '', t.lower())


# ---------------------------------------------------------------- chapters

def chapter_names(subject):
    """Squeezed syllabus name -> the name itself, plus the book's aliases."""
    out = {}
    for name, _puc, _s, _w in SUBJECTS.get(subject, []):
        out[squeeze(name)] = name
    for key, name in ALIAS.items():
        out[key] = name
    return out


def running_head(lines, height, names):
    """
    The chapter named by the running head at the top of the page, or None.

    Every line in the band is tried rather than only the first, because the
    head sits on the left of one page and the right of the next with the folio
    on the other side. Only a line that actually names a syllabus chapter
    counts: a stray first line of question text must not be able to move the
    whole page into another chapter because it mentions sets.
    """
    for x0, y0, x1, y1, text, _conf in lines:
        if y0 > height * HEAD_BAND:
            break
        t = clean(text)
        # The band has to reach far enough down to catch a head set at 10pt,
        # and that is far enough to catch the first line of the first question
        # too. A running head is short, is not a folio, and never opens with a
        # question number.
        if (len(t) > 44 or PAGE_NUMBER.match(t) or LEAD_NUMBER.match(t)
                or FURNITURE.search(t.lower())):
            continue
        hit = name_of(t, names)
        if hit:
            return hit
    return None


def banner_chapter(lines, height, y, names):
    """
    The chapter a banner announces, read from the banner itself.

    The words are set large and wrap, and OCR returns them in whatever order
    the boxes happen to sort into -- "CHAPTER / 5 / Inequalities / Linear".
    So the banner is matched on its words as a set: a chapter fits when every
    word of its name is somewhere in the banner, and the longest such name
    wins.
    """
    sq = squeeze(' '.join(ln[4] for ln in lines
                          if y - 4 <= ln[1] <= y + height * BANNER_DEPTH))
    if not sq:
        return None
    for words, pair in SPLIT:
        if all(w in sq for w in words):
            return pair
    best = None
    for key, name in names.items():
        words = [w for w in re.split(r'[^a-z0-9]+', name.lower()) if len(w) >= 3]
        if words and all(w in sq for w in words):
            if best is None or len(squeeze(name)) > len(squeeze(best)):
                best = name
    return best


def banner_y(lines, height):
    """y of the "CHAPTER" banner that opens a chapter, or None."""
    for x0, y0, x1, y1, text, _conf in lines:
        if y0 > height * BANNER_BAND:
            break
        if 'chapter' in squeeze(text) and 'chapterwise' not in squeeze(text):
            return y0
    return None


def name_of(text, names):
    """
    The chapter a heading names, as one name or a pair to split later.

    Matched on the letters alone: the scan drops spaces and the odd character,
    so "ContinuityandDifferentiability" and "Continuity and Differentiability"
    have to be the same string before they can be compared.
    """
    if not text:
        return None
    sq = squeeze(text)
    for words, pair in SPLIT:
        if all(w in sq for w in words):
            return pair
    best = None
    for key, name in names.items():
        if len(key) >= 4 and key in sq:
            if best is None or len(key) > len(squeeze(best)):
                best = name
    return best


# ---------------------------------------------------------------- geometry

def marks_in(lines, width):
    """Lines that open with a question number, as (number, line)."""
    out = []
    for ln in lines:
        m = LEAD_NUMBER.match(ln[4].lstrip())
        if m and ln[0] < width * 0.72:
            out.append((int(m.group(1)), ln))
    return out


def column_edges(marks, width):
    """
    Left edge of each column, and the x the first column has to stop at.

    The two columns are set hard against a wide gutter, so the left edge of
    the right-hand column is the only boundary that matters.
    """
    xs = sorted(ln[0] for _n, ln in marks)
    if not xs:
        return []
    left = xs[0]
    rights = [x for x in xs if width * 0.42 <= x <= width * 0.70]
    return [left, min(rights)] if rights else [left]


def bands(lines, width, top, floor, require_options):
    """
    Numbered bands between `top` and `floor`.

    A band is cropped across the full width of its column rather than only as
    wide as the text OCR happened to find, because what OCR misses in these
    pages is exactly what matters: the displayed fractions, the matrices and
    the figures. Cropping to the column cannot cut them off.
    """
    inside = [ln for ln in lines if top <= ln[1] < floor]
    marks = marks_in(inside, width)
    if not marks:
        return []
    edges = column_edges(marks, width)
    out = []
    for ci, left in enumerate(edges):
        right = (edges[ci + 1] - 3) if ci + 1 < len(edges) else width * 0.97
        # A line belongs to a column by where it starts, but the crop runs a
        # little past that boundary: OCR clips its boxes a point or two short
        # of the ink, and the first thing to fall off the right edge is the
        # bracket of the year tag.
        edge = (edges[ci + 1] - 1) if ci + 1 < len(edges) else width * 0.98
        col = [ln for ln in inside if left - 8 <= ln[0] < right]
        col_marks = sorted([(n, ln) for n, ln in marks if left - 8 <= ln[0] < left + 18],
                           key=lambda nl: nl[1][1])
        # Numbers run up the column. One that steps backwards is a misread --
        # a "4." that is really part of "1/4." -- and splitting on it would
        # cut a question in half.
        kept, last = [], 0
        for n, ln in col_marks:
            if n > last:
                kept.append((n, ln))
                last = n
        for mi, (n, ln) in enumerate(kept):
            ytop = ln[1] - 3
            yend = min(kept[mi + 1][1][1] - 3 if mi + 1 < len(kept) else floor, floor)
            if yend - ytop < 18:
                continue
            body = [c for c in col if ytop <= c[1] < yend]
            if not body:
                continue
            text = clean(' '.join(c[4] for c in body))
            if require_options:
                labels = [m.group(1) for m in OPTION.finditer(text)]
                if len(set(labels)) < 3:
                    continue
                if min(labels.count(L) for L in 'abcd') >= 2:
                    continue        # two questions landed in one band
            out.append(dict(number=n, column=ci, rect=(left - 4, ytop, edge, yend),
                            text=text[:900]))
    return out


def parse_answers(lines, top, floor):
    """
    Read the answer key, pairing each number with the letter printed beside it.

    The key is a grid of sixteen cells a row, and OCR returns the number and
    the letter of every cell as separate boxes. The scan is very slightly
    skewed, so a row's boxes drift two or three points upwards as they go
    right -- enough that sorting them by y interleaves the rows and hands
    question 8 the letter belonging to question 7. Reading the key as a
    stream of text got half of this book's answers wrong, and a wrong answer
    is worse than no answer: the student is marked down for being right.

    So a letter is matched to the number it sits beside: immediately to its
    right, nearer than the next number, and on the same line give or take the
    skew. Where OCR did return a whole cell as one box ("5.(c)6.(b)"), the
    order inside the box is reliable and is used as it stands.
    """
    items = [ln for ln in lines if top <= ln[1] < floor]
    out, nums, letters = {}, [], []
    for ln in items:
        t = clean(ln[4])
        pairs = list(ANSWER_PAIR.finditer(t))
        if pairs:
            for m in pairs:
                n = int(m.group(1))
                if 1 <= n <= 300:
                    out.setdefault(n, m.group(2).lower())
            continue
        m = NUMBER_CELL.match(t)
        if m:
            nums.append((int(m.group(1)), ln))
            continue
        m = LETTER_CELL.match(t)
        if m:
            letters.append((m.group(1).lower(), ln))

    for n, nb in nums:
        if not 1 <= n <= 300:
            continue
        mid = (nb[1] + nb[3]) / 2
        near = [(lb[0] - nb[0], letter) for letter, lb in letters
                if CELL_GAP[0] < lb[0] - nb[0] < CELL_GAP[1]
                and abs((lb[1] + lb[3]) / 2 - mid) <= CELL_SKEW]
        if near:
            out.setdefault(n, min(near)[1])

    # "(a, c)" -- more than one option is correct, so it cannot be marked
    joined = ' '.join(clean(ln[4]) for ln in items)
    for m in MULTI_PAIR.finditer(joined):
        out.pop(int(m.group(1)), None)
    return out


def section_heads(lines):
    """y of the ANSWER KEY and EXPLANATIONS headings on a page."""
    ay = ey = None
    for ln in lines:
        sq = squeeze(ln[4])
        # "ANSWER KEY" comes back as ANSWERKEY, ANSWIRKEY, ANSWERKFY ...
        if ay is None and re.search(r'ans\w{0,4}k\w?[ey]y?', sq):
            ay = ln[1]
        # the heading stands alone; "explanation" inside a sentence does not
        if ey is None and 'explanation' in sq and len(sq) <= 20:
            ey = ln[1]
    return ay, ey


# -------------------------------------------------------------------- pass

def extract(pdf_path, out_dir, subject, label, dpi=CROP_DPI):
    pages = ocr_cache.load(label)
    doc = pymupdf.open(pdf_path)
    if len(pages) != len(doc):
        raise SystemExit('OCR cache has %d pages, the PDF has %d -- rebuild it'
                         % (len(pages), len(doc)))
    crop_dir = os.path.join(out_dir, 'crops', label)
    os.makedirs(crop_dir, exist_ok=True)
    names = chapter_names(subject)
    compiled = compile_subject(SUBJECTS[subject])

    book = OrderedDict()
    chapter, section = None, 'q'

    def bucket(name):
        return book.setdefault(name, dict(questions=[], answers={}, solutions=[]))

    for i, lines in enumerate(pages):
        if not lines:
            continue
        page = doc[i]
        width, height = page.rect.width, page.rect.height
        top, floor = height * HEAD_BAND, height * FOOT_BAND

        by = banner_y(lines, height)
        # Before the first banner the book reprints two whole solved papers,
        # labelling each question with its chapter inline. Those labels look
        # like running heads and would file a page of mixed questions under
        # whichever one sat at the top of it -- and the papers are already in
        # the bank, year by year, from their own PDFs. So nothing counts until
        # the chapterwise part begins.
        head = running_head(lines, height, names) if chapter is not None else None
        if by is not None:
            # A new chapter opens here. The banner is read first; where its
            # wrapped, scrambled words name nothing, the running head of the
            # page that follows does, because every later page of the chapter
            # prints it plainly. The following page cannot be trusted ahead of
            # the banner: two chapters can open on consecutive pages, and then
            # the page after this one belongs to the *next* chapter.
            new = banner_chapter(lines, height, by, names)
            if not new:
                for j in range(i + 1, min(i + 3, len(pages))):
                    if banner_y(pages[j], height) is not None:
                        break        # the next chapter starts before any head
                    new = running_head(pages[j], height, names)
                    if new:
                        break
            chapter, section = new or 'Unclassified', 'q'
            # Clear the banner's own words without reaching the first
            # question, which on these pages starts barely below it. The
            # banner's big chapter number carries no full stop, so it cannot
            # be mistaken for a question number further down.
            top = max(top, by + height * 0.04)
        elif head and head != chapter:
            chapter, section = head, 'q'
        if chapter is None:
            continue        # front matter, before the first chapter

        ay, ey = section_heads(lines)
        marks = sorted([(y, k) for y, k in ((ay, 'a'), (ey, 'e')) if y is not None])

        y = top
        for my, kind in marks + [(floor, None)]:
            if my > y:
                seg = (y, min(my, floor))
                if section == 'q':
                    bucket(chapter)['questions'].append((i, bands(lines, width, *seg, True)))
                elif section == 'a':
                    for n, letter in parse_answers(lines, *seg).items():
                        bucket(chapter)['answers'].setdefault(n, letter)
                else:
                    bucket(chapter)['solutions'].append((i, bands(lines, width, *seg, False)))
            y = my
            if kind:
                section = kind

    results = emit(doc, book, crop_dir, subject, label, compiled, dpi)
    doc.close()
    return results


def emit(doc, book, crop_dir, subject, label, compiled, dpi):
    """Pair each question with its answer and worked solution, and crop it."""
    results, seen, conflicts = [], set(), 0
    for ci, (chapter, data) in enumerate(book.items()):
        qs = [(p, b) for p, bs in data['questions'] for b in bs]
        if not qs:
            continue

        # The book states each answer twice: once in the grid at the end of
        # the chapter, and again at the head of the worked explanation. Both
        # are read, which covers the questions whose grid cell was unreadable
        # and -- more importantly -- lets the two be checked against each
        # other. Where they disagree one of them was misread and there is no
        # way to tell which, so the question is dropped rather than shipped
        # with an answer that might mark a right choice wrong.
        explained = {}
        for p, s in [(p, b) for p, bs in data['solutions'] for b in bs]:
            m = SOLUTION_OPEN.match(s['text'])
            if m and int(m.group(1)) == s['number']:
                explained.setdefault(s['number'], (m.group(2).lower(), p, s))

        answers = {n: v[0] for n, v in explained.items()}
        for n, letter in data['answers'].items():
            if n in answers and answers[n] != letter:
                conflicts += 1
                answers[n] = None
            else:
                answers[n] = letter
        answers = {n: v for n, v in answers.items() if v}
        if not answers:
            continue
        nums = {b['number'] for _p, b in qs}
        if len(nums & set(answers)) / len(nums) < 0.5:
            continue

        by_number = {n: (p, s) for n, (letter, p, s) in explained.items()
                     if answers.get(n) == letter}

        for p, q in qs:
            letter = answers.get(q['number'])
            key = (str(chapter), q['text'][:90])
            if not letter or key in seen:
                continue
            seen.add(key)
            name = resolve(chapter, q['text'], compiled)
            stem = '%s-c%02d-p%04d-q%03d' % (label, ci, p, q['number'])
            pix = doc[p].get_pixmap(clip=pymupdf.Rect(*q['rect']), dpi=dpi)
            pix.save(os.path.join(crop_dir, stem + '.png'))

            sol = []
            hit = by_number.get(q['number'])
            if hit is not None:
                sp, s = hit
                spix = doc[sp].get_pixmap(clip=pymupdf.Rect(*s['rect']), dpi=dpi)
                spix.save(os.path.join(crop_dir, stem + '-s.png'))
                sol.append(dict(src='%s/%s-s.png' % (label, stem),
                                w=spix.width, h=spix.height))

            year = YEAR_TAG.search(q['text'])
            results.append(dict(
                subject=subject, source=label, chapter=name,
                number=q['number'], page=p, seq=len(results) + 1,
                answer=letter.upper(), stemText=q['text'],
                year=int(year.group(1) + year.group(2)) if year else 0,
                image=dict(src='%s/%s.png' % (label, stem), w=pix.width, h=pix.height),
                solutionImages=sol,
                chapterConfidence='high',
            ))
    results.sort(key=lambda r: (r['chapter'], r['page'], r['number']))
    if conflicts:
        print('dropped %d question(s): the key and the worked solution gave '
              'different answers' % conflicts)
    return results


def resolve(chapter, text, compiled):
    """Split a two-chapter heading on the evidence of one question's words."""
    if isinstance(chapter, str):
        return chapter
    for candidate in chapter:
        rx = DISCRIMINATOR.get(candidate)
        if rx is not None and rx.search(text):
            return candidate
    best, score = chapter[0], -1
    for candidate in chapter:
        sub = [c for c in compiled if c[0] == candidate]
        name, s, _margin, _hits = classify(
            {'stemText': text, 'options': [], 'solutionText': ''}, sub)
        if name and s > score:
            best, score = candidate, s
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--label', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--dpi', type=int, default=CROP_DPI)
    a = ap.parse_args()

    res = extract(a.pdf, a.out, a.subject, a.label, a.dpi)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, '%s.json' % a.label), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    chapters, with_sol = {}, 0
    for r in res:
        chapters[r['chapter']] = chapters.get(r['chapter'], 0) + 1
        with_sol += bool(r['solutionImages'])
    print('%-24s %4d questions across %d chapters, %d with a worked solution'
          % (a.label, len(res), len(chapters), with_sol))
    for c, n in sorted(chapters.items(), key=lambda kv: -kv[1]):
        print('    %-46s %3d' % (c[:46], n))


if __name__ == '__main__':
    main()
