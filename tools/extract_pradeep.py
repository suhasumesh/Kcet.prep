"""
Extract the single-correct MCQs from the Pradeep reference books.

Structure these volumes follow: a run of numbered MCQs, then a block listing
their answers -- sometimes at the foot of the same page, sometimes several
pages later at the end of the section. So questions are collected into a
pending run and bound to the next answer block that plainly belongs to them.

Two sources of truth are used deliberately:

  * the embedded text layer, for *positions* -- where the question numbers,
    option markers and the answer block sit on the page
  * the page pixels, for *content* -- each question is cropped as one band so
    the structures, graphs and equations survive exactly as printed

The embedded text is a poor OCR pass ("UD" where the page reads "(b)", "(fl)"
for "(a)"), so it is never trusted for an answer. Each answer block is re-read
from pixels at high resolution, where it comes back clean.

Correctness guards, in order of importance:

  * a block only counts as an answer key if the numbers it lists overlap the
    pending questions by at least half -- that is what stops a page of figure
    references, "Fig. 0.5 (a)", from being mistaken for a key
  * only single-letter answers are kept, which drops the "One or More than One
    Correct", assertion-reason and matching sections automatically
  * a pending run that never finds its key is discarded, never guessed
"""
import os
import io
import re
import sys
import json
import argparse
import unicodedata

import numpy as np
import pymupdf
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syllabus import SUBJECTS

QMARK = re.compile(r'^\s*(\d{1,3})\s*[.)]\s*\S')
OPTION = re.compile(r'\(\s*([a-d])\s*\)')
RUNHEAD = re.compile(r'\b(\d{1,2})\s*/\s*(\d{1,3})\b')
ANSWER_PAIR = re.compile(r'(\d{1,3})\s*[.)]?\s*\(\s*([a-d])\s*\)', re.I)
MULTI_PAIR = re.compile(r'(\d{1,3})\s*[.)]?\s*\(\s*[a-d]\s*[,&]')
ANSWER_HEAD = re.compile(r'^ANSWERS?\s*[:.\-]?\s*$', re.I)
TITLE = re.compile(r'^[A-Z][A-Z \-&,\'()]{6,60}$')

CROP_DPI = 200
_engine = None


def ocr(img):
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    result, _ = _engine(np.array(img))
    return [r[1].strip() for r in (result or [])]


def clean(s):
    s = unicodedata.normalize('NFKC', s.replace(' ', ' '))
    return re.sub(r'\s+', ' ', s).strip()


def text_blocks(page):
    return [b for b in page.get_text('blocks') if b[6] == 0 and b[4].strip()]


def fold(text):
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()


# Series branding that sits in the running head and is not a chapter name
NOT_A_TITLE = re.compile(
    r'pradeep|fundamental|new course|physics \(x|chemistry \(x|volume|vol\.|'
    r'competition focus|answers|solutions|exemplar|index|contents', re.I)


def chapter_titles(doc, subject):
    """
    chapter number -> printed chapter title.

    Pradeep sets a running head of "<chapter>/<page within chapter>" on every
    page and prints the chapter name beside it. The name is matched against the
    syllabus rather than taken on trust: these scans OCR the head inconsistently
    and the series branding sits in the same place, so "Pradeep's" would
    otherwise become a chapter. Anything that is not a recognised chapter of
    this subject is ignored, and the chapter keeps its number until a page
    names it properly.
    """
    known = {fold(name): name for (name, _puc, _s, _w) in SUBJECTS.get(subject, [])}
    titles = {}
    for i in range(len(doc)):
        lines = [l.strip() for l in doc[i].get_text().splitlines()[:8] if l.strip()]
        head = next((RUNHEAD.search(l) for l in lines if RUNHEAD.search(l)), None)
        if not head:
            continue
        ch = int(head.group(1))
        if ch in titles:
            continue
        for l in lines:
            if len(l) < 6 or NOT_A_TITLE.search(l):
                continue
            f = fold(l)
            if f in known:
                titles[ch] = known[f]
                break
            # OCR often drops or adds a word; accept a confident containment
            hit = next((orig for k, orig in known.items()
                        if len(k) > 10 and (k in f or f in k)), None)
            if hit:
                titles[ch] = hit
                break
    return titles


def read_answer_strip(page, top):
    """Re-read an answer block from pixels; the text layer mangles it."""
    strip = pymupdf.Rect(0, max(0, top - 8), page.rect.width,
                         min(page.rect.height, top + 150))
    pix = page.get_pixmap(clip=strip, dpi=360)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('L')
    img = ImageOps.autocontrast(img, cutoff=1).convert('RGB')
    text = ' '.join(ocr(img))

    out = {}
    for m in ANSWER_PAIR.finditer(text):
        n = int(m.group(1))
        if 1 <= n <= 300:
            out.setdefault(n, m.group(2).lower())
    # "(a, d)" style multi-answers must not be read as a plain "(a)"
    for m in MULTI_PAIR.finditer(text):
        out.pop(int(m.group(1)), None)
    return out


def answer_block_tops(page):
    """
    Candidate y positions of answer keys on this page, best first.

    A labelled "ANSWERS" heading is the clearest signal. Where OCR has destroyed
    the word -- the older volumes render it as mojibake -- a block dense with
    "<number> (<letter>)" pairs is used instead.
    """
    blocks = text_blocks(page)
    tops = [b[1] for b in blocks if ANSWER_HEAD.match(b[4].strip())]
    for b in blocks:
        if len(ANSWER_PAIR.findall(b[4])) >= 3:
            tops.append(b[1])
    return sorted(set(tops))


def column_edges(blocks, width):
    """
    Left edge of each column, from where the question numbers line up.

    These volumes are set in two columns, never more, so at most two edges are
    returned and the second is only believed if it sits near the middle of the
    page. Without that guard an indented sub-item invents a third column and
    every crop in the real one gets sliced down the middle.
    """
    xs = sorted(b[0] for b in blocks if QMARK.match(b[4]))
    first = xs[0] if xs else width * 0.08
    edges = [first]

    # The second column is confirmed from the question numbers when they were
    # read, and otherwise from where the body text itself starts. Relying on the
    # numbers alone fails on pages whose right-hand numbers OCR badly, and the
    # crop then spans both columns -- showing one question's options beside the
    # next question's stem.
    candidates = [x for x in xs if 0.40 * width <= x <= 0.68 * width]
    if candidates:
        edges.append(min(candidates))
    else:
        right_starts = sorted(b[0] for b in blocks if 0.40 * width <= b[0] <= 0.68 * width)
        if len(right_starts) >= 4:
            # cluster them; a real column edge attracts many blocks to one x
            best, run = None, [right_starts[0]]
            for x in right_starts[1:]:
                if x - run[-1] <= 14:
                    run.append(x)
                else:
                    if best is None or len(run) > len(best):
                        best = run
                    run = [x]
            if best is None or len(run) > len(best):
                best = run
            if len(best) >= 4:
                edges.append(min(best))
    return edges


def questions_on_page(page, chapter, floor):
    """Every numbered band that looks like an MCQ, above `floor`."""
    blocks = text_blocks(page)
    width = page.rect.width
    edges = column_edges(blocks, width)

    found = []
    for ci, left in enumerate(edges):
        right = (edges[ci + 1] - 6) if ci + 1 < len(edges) else width - 8
        col = sorted([b for b in blocks if left - 10 <= b[0] < right], key=lambda b: b[1])
        marks = [b for b in col if QMARK.match(b[4])]
        for mi, b in enumerate(marks):
            n = int(QMARK.match(b[4]).group(1))
            top = b[1] - 4
            end = min((marks[mi + 1][1] - 4) if mi + 1 < len(marks) else floor, floor)
            if end - top < 24:
                continue
            inside = [x for x in col if top <= x[1] < end]
            labels = [m.group(1) for x in inside for m in OPTION.finditer(x[4])]
            letters = set(labels)
            # a real MCQ shows at least three of its four option labels; this
            # also throws out worked examples and prose that happen to be numbered
            if len(letters) < 3:
                continue
            body = [x[0] for x in inside if not QMARK.match(x[4])]
            x0 = min(body) - 6 if body else left
            x0 = max(left - 4, min(x0, left + 12))

            # Two full sets of labels means the next question's number went
            # unread and this band swallowed it. It can be cut after the first
            # "(d)", but only when the numbering proves exactly one question is
            # hidden -- the following marker reads n+2 -- because the second
            # half has to be labelled n+1 for its answer to be the right one.
            # Any other case is dropped: one question fewer beats one question
            # shown above another's options.
            doubled = min(labels.count(L) for L in 'abcd') >= 2
            next_num = (int(QMARK.match(marks[mi + 1][4]).group(1))
                        if mi + 1 < len(marks) else None)
            if doubled:
                ends = sorted(x[3] for x in inside if re.search(r'\(\s*d\s*\)', x[4]))
                if next_num != n + 2 or len(ends) < 2:
                    continue
                halves = [(n, top, ends[0] + 4), (n + 1, ends[0] + 4, end)]
            else:
                halves = [(n, top, end)]

            for num, ytop, ybot in halves:
                if ybot - ytop < 24:
                    continue
                part = [x for x in inside if ytop - 2 <= x[1] < ybot]
                found.append(dict(
                    number=num, chapter=chapter, page=page.number,
                    rect=(x0, ytop, min(right + 6, width), ybot),
                    letters=({m.group(1) for x in part for m in OPTION.finditer(x[4])}
                             or letters),
                    text=clean(' '.join(x[4] for x in part))[:600],
            ))
    return found


def extract(pdf_path, out_dir, subject, label, dpi=CROP_DPI):
    doc = pymupdf.open(pdf_path)
    crop_dir = os.path.join(out_dir, 'crops', label)
    os.makedirs(crop_dir, exist_ok=True)

    titles = chapter_titles(doc, subject)
    results, seen = [], set()
    pending: list[dict] = []
    # A page can carry two sections that both start numbering at 1, so the
    # page-and-number pair is not unique. A running sequence is.
    nonlocal_seq = [0]

    def flush(answers):
        """Bind pending questions to a key, if the key plainly belongs to them."""
        nonlocal pending
        if not pending or not answers:
            return 0
        nums = {q['number'] for q in pending}
        overlap = len(nums & set(answers)) / len(nums)
        # A real key answers most of the run it follows. Anything less and this
        # is something else that merely looks like one.
        if overlap < 0.5:
            return 0

        taken = 0
        for q in pending:
            letter = answers.get(q['number'])
            key = (q['chapter'], q['text'][:90])
            if not letter or key in seen:
                continue
            # The recorded answer must be one of the options actually visible in
            # this band. Where it is not, either the crop lost an option or the
            # key was misread -- either way the question is unanswerable, so it
            # is dropped rather than shown.
            if letter not in q['letters']:
                continue
            nonlocal_seq[0] += 1
            page = doc[q['page']]
            fn = '%s-%05d-p%04d-q%03d.png' % (label, nonlocal_seq[0], q['page'], q['number'])
            pix = page.get_pixmap(clip=pymupdf.Rect(*q['rect']), dpi=dpi)
            pix.save(os.path.join(crop_dir, fn))
            seen.add(key)
            taken += 1
            results.append(dict(
                subject=subject, source=label, chapter=q['chapter'],
                number=q['number'], page=q['page'], seq=nonlocal_seq[0],
                answer=letter.upper(),
                stemText=q['text'],
                image=dict(src='%s/%s' % (label, fn), w=pix.width, h=pix.height),
            ))
        pending = []
        return taken

    for i in range(len(doc)):
        page = doc[i]
        raw = page.get_text()
        head = RUNHEAD.search(raw)
        ch = int(head.group(1)) if head else 0
        chapter = titles.get(ch, 'Chapter %d' % ch if ch else 'Unclassified')

        tops = answer_block_tops(page)
        floor = min(tops) if tops else page.rect.height
        pending.extend(questions_on_page(page, chapter, floor))

        for top in tops:
            flush(read_answer_strip(page, top))

        # a run that has wandered far past its key will never find one
        if len(pending) > 160:
            pending = pending[-80:]

    doc.close()
    results.sort(key=lambda r: (r['chapter'], r['page'], r['number']))
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--label', required=True, help='short slug, e.g. pradeep-physics-12')
    ap.add_argument('--out', required=True)
    ap.add_argument('--dpi', type=int, default=CROP_DPI)
    a = ap.parse_args()

    res = extract(a.pdf, a.out, a.subject, a.label, a.dpi)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, '%s.json' % a.label), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    chapters: dict[str, int] = {}
    for r in res:
        chapters[r['chapter']] = chapters.get(r['chapter'], 0) + 1
    print('%-26s %4d questions across %d chapters' % (a.label, len(res), len(chapters)))
    for c, n in sorted(chapters.items(), key=lambda kv: -kv[1])[:14]:
        print('    %-46s %3d' % (c[:46], n))


if __name__ == '__main__':
    main()
