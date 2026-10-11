"""
Extract from the MTG "Karnataka-CET Chapterwise Solutions" books.

These are the most useful source in the pile: every question is already filed
under a syllabus chapter, tagged with the year it was asked, and followed by a
printed answer key and a worked explanation. So a question extracted here
arrives with everything the app wants -- chapter, answer and a step-by-step
solution.

Each chapter runs: questions (two columns) -> ANSWER KEY -> EXPLANATIONS, and
a chapter can start halfway down a page. Pages are therefore sliced into
segments by the headings on them, and each segment is filed under the chapter
and section it belongs to. Only once the whole book has been read are a
chapter's questions paired with its key -- pairing page by page loses every
chapter whose key happens to be unreadable on one page.

Questions and explanations are both cropped from the page, because the maths
is typeset and the text layer of these scans interleaves the two columns.

Correctness guards:
  * the chapter name is read from the display-size type, not from body text,
    and matched against the syllabus; an unrecognised heading does not
    inherit the previous chapter's name
  * a key must cover at least half the chapter's questions to be believed
  * a band holding two sets of option labels is dropped, not guessed at
  * a worked solution is attached only when the letter it opens with matches
    the answer key, so a misread number cannot move a solution onto the
    wrong question
  * a question with no answer is never shipped
"""
import os
import re
import sys
import json
import difflib
import argparse
import unicodedata
from collections import OrderedDict

import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syllabus import SUBJECTS  # noqa: E402

NUMBER = re.compile(r'^(\d{1,3})[.)]$')
OPTION = re.compile(r'\(\s*([a-d])\s*\)')
# The scan drops and swaps characters freely, so the key is read loosely:
# "3, (a)" is as common as "3. (a)", and the heading above it has come
# out as "ANSWIR KEY". The leading (?<!\d) stops a year tag -- "(2020) (a)"
# -- from being read as question 20 answered (a).
ANSWER_PAIR = re.compile(r'(?<!\d)(\d{1,3})\s*[.,)]?\s*\(\s*([a-d])\s*\)', re.I)
MULTI_PAIR = re.compile(r'(?<!\d)(\d{1,3})\s*[.,)]?\s*\(\s*[a-d]\s*[,&]')
# Both headings are set in capitals, and that is what tells them apart from
# the body text around them: case-insensitively, "EXPLANATIONS" also matches
# "a shell ... explodes into two". The scan does not always separate them
# from their neighbours ("sttEXPLANATIONS 29"), so neither is anchored.
ANSWER_WORD = re.compile(r'^[A-Z]{5,7}[.,:]?$')     # ANSWER, and OCR's ANSWIR
KEY_WORD = re.compile(r'^KEY')
MERGED_KEY = re.compile(r'^[A-Z]{5,7}KEY')
EXPLAIN_HEAD = re.compile(r'EXPLANATIONS?')
# the word sits in its own block; the number and name follow in display type
CHAPTER_HEAD = re.compile(r'^\s*CHAPTER\b', re.I)
YEAR_TAG = re.compile(r'\((19|20)\d{2}\)')
# "3. (d): because ..." -- the letter an explanation opens with
SOLUTION_OPEN = re.compile(r'^\s*(\d{1,3})\s*[.)]\s*\(?\s*([a-d])\s*[).:]', re.I)

TITLE_PT = 26          # display type; body text in these scans tops out ~22pt
CROP_DPI = 200


def clean(s):
    s = unicodedata.normalize('NFKC', s.replace('\xa0', ' '))
    return re.sub(r'\s+', ' ', s).strip()


def squeeze(t):
    """Letters and digits only -- the scans drop and invent spaces freely."""
    return re.sub(r'[^a-z0-9]+', '', t.lower())


def text_blocks(page):
    return [b for b in page.get_text('blocks') if b[6] == 0 and b[4].strip()]


# ---------------------------------------------------------------- chapters

def chapter_heading(page):
    """
    (title text, y) of the chapter heading on this page, or (None, None).

    The title is read from the display-size spans beside the word CHAPTER. A
    scan of this quality mangles the letters ("Particlees", "Motion ina
    Plane") but gets the size right, so type size is a far steadier signal
    than spelling. Spans elsewhere on the page can also be large -- a
    displayed fraction runs to 30pt -- so only those next to the heading
    count.
    """
    head = next((b for b in text_blocks(page) if CHAPTER_HEAD.search(b[4])), None)
    if head is None:
        return None, None
    y = head[1]
    spans = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        for line in b['lines']:
            for s in line['spans']:
                if (s['size'] >= TITLE_PT and s['text'].strip()
                        and y - 30 <= s['bbox'][1] <= y + 120):
                    spans.append((s['bbox'][1], s['bbox'][0], s['text']))
    spans.sort()
    return clean(' '.join(s[2] for s in spans)), y


def match_chapter(title, known):
    """
    The syllabus chapter a heading names, or None.

    Matched on the letters alone, then -- for headings the scan misspelled --
    on the closest window of the same length. The threshold is high enough
    that "Waves" cannot be dragged onto "Wave Optics".
    """
    sq = squeeze(title)
    if not sq:
        return None
    best = None
    for name in known:
        key = squeeze(name)
        if len(key) >= 4 and key in sq:
            if best is None or len(key) > len(squeeze(best)):
                best = name
    if best:
        return best
    score = 0.0
    for name in known:
        key = squeeze(name)
        if len(key) < 7:
            continue       # too short to fuzzy-match safely
        for i in range(max(1, len(sq) - len(key) + 1)):
            r = difflib.SequenceMatcher(None, key, sq[i:i + len(key)]).ratio()
            if r > score:
                score, best = r, name
    return best if score >= 0.86 else None


# ---------------------------------------------------------------- geometry

def find_gutter(words, width, lo=0.40, hi=0.66):
    """
    The x of the column gutter: the widest run of page-middle positions that
    no word overlaps. Returns None when the text really does span the width.
    """
    step = 2.0
    start, end = width * lo, width * hi
    free, run_start, best = [], None, None
    x = start
    while x < end:
        if any(w[0] < x + step and w[2] > x for w in words):
            if run_start is not None:
                free.append((run_start, x))
                run_start = None
        elif run_start is None:
            run_start = x
        x += step
    if run_start is not None:
        free.append((run_start, end))
    for a, b in free:
        if b - a >= 8 and (best is None or b - a > best[1] - best[0]):
            best = (a, b)
    return (best[0] + best[1]) / 2 if best else None


def columns(words, marks, width):
    """Left edge of each column on this slice of the page."""
    xs = sorted(w[0] for w in marks)
    edges = [xs[0]]
    rights = [x for x in xs if 0.42 * width <= x <= 0.70 * width]
    if rights:
        edges.append(min(rights))
    else:
        # No number was read in the right column, but the column is still
        # there. The gutter keeps a crop from running on into the item
        # printed beside it.
        g = find_gutter(words, width)
        if g is not None:
            edges.append(g)
    return edges


def bands(page, top, floor, require_options):
    """
    Numbered bands between `top` and `floor`, one dict per band.

    Worked at word level, not block level. In these books a single text block
    routinely spans both columns -- "1. For ordinary terrestrial experiments,
    the | 6. observ..." -- so banding on blocks merges four items into one
    crop. Words carry their own coordinates and can be split by column.
    """
    width = page.rect.width
    words = [w for w in page.get_text('words') if top <= w[1] < floor]
    marks = [w for w in words if NUMBER.match(w[4])]
    if not marks:
        return []

    out = []
    edges = columns(words, marks, width)
    for ci, left in enumerate(edges):
        right = (edges[ci + 1] - 4) if ci + 1 < len(edges) else width - 4
        col_words = [w for w in words if left - 6 <= w[0] < right]
        col_marks = sorted([w for w in marks if left - 6 <= w[0] < left + 14],
                           key=lambda w: w[1])
        # A number that steps backwards down the column is a misread, not a
        # new item, and splitting on it would cut a question in half.
        kept, last = [], 0
        for m in col_marks:
            n = int(NUMBER.match(m[4]).group(1))
            if n > last:
                kept.append((n, m))
                last = n
        for mi, (n, m) in enumerate(kept):
            ytop = m[1] - 3
            yend = min(kept[mi + 1][1][1] - 3 if mi + 1 < len(kept) else floor, floor)
            if yend - ytop < 20:
                continue
            inside = [w for w in col_words if ytop <= w[1] < yend]
            if not inside:
                continue
            labels = [mm.group(1) for w in inside for mm in OPTION.finditer(w[4])]
            if require_options:
                if len(set(labels)) < 3:
                    continue
                if min(labels.count(L) for L in 'abcd') >= 2:
                    continue          # two questions landed in one band
            body = [w[0] for w in inside if w is not m]
            x0 = max(left - 3, min(min(body) - 4 if body else left, left + 11))
            x1 = min(max(w[2] for w in inside) + 6, right)
            if x1 - x0 < 60:
                continue
            out.append(dict(
                number=n, page=page.number, column=ci,
                rect=(x0, ytop, x1, max(w[3] for w in inside) + 3),
                letters=set(labels),
                text=clean(' '.join(w[4] for w in inside))[:700],
            ))
    return out


def parse_answers(page, top, floor):
    """Read "1. (a) 2. (d)" pairs between `top` and `floor`."""
    text = ' '.join(page.get_text(
        'text', clip=pymupdf.Rect(0, top, page.rect.width, floor)).split())
    out = {}
    for m in ANSWER_PAIR.finditer(text):
        n = int(m.group(1))
        if 1 <= n <= 300:
            out.setdefault(n, m.group(2).lower())
    for m in MULTI_PAIR.finditer(text):
        out.pop(int(m.group(1)), None)     # more than one correct option
    return out


# ---------------------------------------------------------------- the pass

def section_heads(page):
    """
    y of the ANSWER KEY and EXPLANATIONS headings, found word by word.

    Block coordinates are no good here: the scan often swallows the heading
    into the paragraph beside it, and on one page the answer key and the
    EXPLANATIONS below it share a single block, so the block's top would put
    the boundary above the key and throw it away. A word carries its own y.
    """
    words = page.get_text('words')
    ay = ey = None
    for i, w in enumerate(words):
        t = w[4]
        if ey is None and EXPLAIN_HEAD.search(t):
            ey = w[1]
        if ay is None:
            if MERGED_KEY.match(t):
                ay = w[1]
            elif KEY_WORD.match(t) and i and abs(words[i - 1][1] - w[1]) < 6 \
                    and ANSWER_WORD.match(words[i - 1][4]):
                ay = w[1]
    return ay, ey


def page_segments(page, known, chapter, section):
    """
    Slice a page at the headings printed on it.

    Returns (segments, chapter, section), each segment a
    (chapter, section, y0, y1) tuple. A chapter heading resets the section to
    'q': what follows it is that chapter's questions, whatever section the
    previous chapter was in when the page began.
    """
    blocks = text_blocks(page)
    if not blocks:
        return [], chapter, section
    bottom = max(b[3] for b in blocks) + 4

    marks = []
    title, cy = chapter_heading(page)
    if title is not None:
        marks.append((cy, 'chapter', match_chapter(title, known) or 'Unclassified'))
    ay, ey = section_heads(page)
    if ay is not None:
        marks.append((ay, 'a', None))
    if ey is not None:
        marks.append((ey, 'e', None))
    marks.sort(key=lambda m: m[0])

    segs, y = [], 0.0
    for my, kind, name in marks:
        if my > y:
            segs.append((chapter, section, y, min(my, bottom)))
        y = my
        if kind == 'chapter':
            chapter, section = name, 'q'
        else:
            section = kind
    if y < bottom:
        segs.append((chapter, section, y, bottom))
    return segs, chapter, section


def extract(pdf_path, out_dir, subject, label, dpi=CROP_DPI, solutions=True):
    doc = pymupdf.open(pdf_path)
    crop_dir = os.path.join(out_dir, 'crops', label)
    os.makedirs(crop_dir, exist_ok=True)
    known = [name for (name, _p, _s, _w) in SUBJECTS.get(subject, [])]

    book = OrderedDict()          # chapter -> {questions, answers, solutions}
    chapter, section = 'Unclassified', 'q'

    def bucket(name):
        return book.setdefault(name, dict(questions=[], answers={}, solutions=[]))

    for i in range(len(doc)):
        page = doc[i]
        segs, chapter, section = page_segments(page, known, chapter, section)
        for ch, sec, y0, y1 in segs:
            if y1 - y0 < 24:
                continue
            if sec == 'q':
                bucket(ch)['questions'].extend(bands(page, y0, y1, True))
            elif sec == 'a':
                for n, letter in parse_answers(page, y0, y1).items():
                    bucket(ch)['answers'].setdefault(n, letter)
            elif sec == 'e' and solutions:
                bucket(ch)['solutions'].extend(bands(page, y0, y1, False))

    results, seen, conflicts = [], set(), 0
    for ci, (ch, data) in enumerate(book.items()):
        qs = data['questions']
        if not qs:
            continue

        # The book states each answer twice: in the key at the end of the
        # chapter, and again at the head of the worked explanation. Reading
        # both covers the questions whose key line was unreadable, and lets
        # the two be checked against each other. Where they disagree one of
        # them was misread and there is no way to tell which, so the question
        # is dropped rather than shipped with an answer that might mark a
        # right choice wrong.
        explained = {}
        for s in data['solutions']:
            m = SOLUTION_OPEN.match(s['text'])
            if m and int(m.group(1)) == s['number']:
                explained.setdefault(s['number'], (m.group(2).lower(), s))

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
        nums = {q['number'] for q in qs}
        if len(nums & set(answers)) / len(nums) < 0.5:
            continue        # this key does not belong to these questions

        by_number = {n: s for n, (letter, s) in explained.items()
                     if answers.get(n) == letter}

        for q in qs:
            letter = answers.get(q['number'])
            key = (ch, q['text'][:90])
            if not letter or letter not in q['letters'] or key in seen:
                continue
            seen.add(key)
            stem = '%s-c%02d-p%04d-q%03d' % (label, ci, q['page'], q['number'])
            pix = doc[q['page']].get_pixmap(clip=pymupdf.Rect(*q['rect']), dpi=dpi)
            pix.save(os.path.join(crop_dir, stem + '.png'))

            sol_images = []
            s = by_number.get(q['number'])
            if s is not None:
                spix = doc[s['page']].get_pixmap(clip=pymupdf.Rect(*s['rect']), dpi=dpi)
                spix.save(os.path.join(crop_dir, stem + '-s.png'))
                sol_images.append(dict(src='%s/%s-s.png' % (label, stem),
                                       w=spix.width, h=spix.height))

            year = YEAR_TAG.search(q['text'])
            results.append(dict(
                subject=subject, source=label, chapter=ch,
                number=q['number'], page=q['page'], seq=len(results) + 1,
                answer=letter.upper(), stemText=q['text'],
                year=int(year.group(0)[1:5]) if year else 0,
                image=dict(src='%s/%s.png' % (label, stem), w=pix.width, h=pix.height),
                solutionImages=sol_images,
            ))

    results.sort(key=lambda r: (r['chapter'], r['page'], r['number']))
    if conflicts:
        print('dropped %d question(s): the key and the worked solution gave '
              'different answers' % conflicts)
    doc.close()
    return results


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
