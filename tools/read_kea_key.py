"""
Read an official KEA answer-key PDF that still has a text layer.

Two shapes appear across the years:

  grid   2016-style. One page per subject, a table of 16 version columns
         (A1..D4). The booklet's version code picks the column.
  master 2017/2018-style. One page per subject, a flat "Q-01  A" listing that
         applies to the master paper, with no version columns.

Both are read from word positions rather than the flattened text, because the
flattened form runs the columns of a row together and loses which value
belongs to which version.
"""
import os
import re
import sys
import json
import argparse

import pymupdf

_ocr_engine = None


def ocr_words(img):
    """Recognised words as (x_centre, y_centre, text)."""
    global _ocr_engine
    if _ocr_engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr_engine = RapidOCR()
    import numpy as np
    out = []
    result, _ = _ocr_engine(np.array(img))
    for box, text, _conf in (result or []):
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        out.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, text.strip()))
    return out


VERSIONS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4',
            'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4']
SUBJECT_IN_TITLE = re.compile(r'(PHYSICS|CHEMISTRY|MATHEMATICS|MATHS|BIOLOGY)', re.I)
MASTER_PAIR = re.compile(r'Q\s*[-‐‑]\s*(\d{1,3})')


def rows_of_words(page, tol=6.0):
    """Page words grouped into visual rows, each sorted left to right."""
    rows = []
    for w in sorted(page.get_text('words'), key=lambda w: (w[1], w[0])):
        if rows and abs(w[1] - rows[-1][0]) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([w[1], [w]])
    return [sorted(ws, key=lambda w: w[0]) for _y, ws in rows]


def page_subject(page):
    # Not just the first few hundred characters: extraction order is not visual
    # order on these sheets, and the grid of numbers often comes out ahead of
    # the heading that names the subject.
    m = SUBJECT_IN_TITLE.search(page.get_text())
    if not m:
        return None
    s = m.group(1).upper()
    return 'Mathematics' if s in ('MATHS', 'MATHEMATICS') else s.capitalize()


def parse_grid(page, version):
    """
    2016 shape: "<q> <A1> <A2> ... <D4>" repeated along each row.

    A row of the printed table holds several question blocks side by side, so
    the words are walked in reading order and every run of 17 numbers is taken
    as one question plus its sixteen version answers.
    """
    col = VERSIONS.index(version)
    out = {}
    for words in rows_of_words(page):
        nums = [w[4] for w in words if re.fullmatch(r'\d{1,3}', w[4])]
        i = 0
        while i + 16 < len(nums):
            q = int(nums[i])
            block = nums[i + 1:i + 17]
            # each option must be a single digit 1-4; `'12' in '1234'` is
            # True in Python, so membership alone would admit '12' as valid
            if 1 <= q <= 60 and all(len(v) == 1 and v in '1234' for v in block):
                out[str(q)] = 'ABCD'[int(block[col]) - 1]
                i += 17
            else:
                i += 1
    return out


MASTER_FLAT = re.compile(r'Q\s*[-‐‑‒–]\s*(\d{1,3})\s*([A-D])', re.I)


def parse_master(page):
    """
    2017/2018 shape: "Q-07" immediately followed by its letter.

    Read from the flattened text rather than word rows. The sheet prints three
    question/key column pairs side by side, so a visual row holds six values
    from three different questions, whereas the extraction order keeps each
    "Q-07  B" together.
    """
    out = {}
    text = ' '.join(page.get_text().split())
    for m in MASTER_FLAT.finditer(text):
        n = int(m.group(1))
        if 1 <= n <= 60:
            out.setdefault(str(n), m.group(2).upper())
    return out


SCANNED_ORDER = ['Physics', 'Chemistry', 'Mathematics', 'Biology']


def parse_scanned_a1(page, dpi=400):
    """
    Read the older sheets, which have no text layer at all.

    2004-2015 print a single narrow table of "Qnno | A1" -- one row per
    question, 60 rows, with "G" where a grace mark was awarded instead of an
    answer. The page is nearly empty otherwise, so one OCR pass finds every
    cell; they are then split into two columns by x and paired by row.

    Grace rows are dropped rather than guessed: there is no single correct
    option to show a student.
    """
    import io as _io
    from PIL import Image, ImageOps  # noqa: F401  (Image used by the repair pass)

    pix = page.get_pixmap(dpi=dpi)
    img = Image.open(_io.BytesIO(pix.tobytes('png'))).convert('L')
    img = ImageOps.autocontrast(img, cutoff=1).convert('RGB')

    cells = [(x, y, t) for x, y, t in ocr_words(img)
             if re.fullmatch(r'\d{1,3}|G', t, re.I)]
    if len(cells) < 60:
        return {}

    # two columns: question numbers on the left, answers on the right
    xs = sorted(c[0] for c in cells)
    split = (xs[0] + xs[-1]) / 2
    left = [c for c in cells if c[0] < split and c[2].isdigit()]
    right = [c for c in cells if c[0] >= split]

    # Pair by row rather than by position in the list. A cell the detector
    # missed would otherwise shift every later pairing by one and silently
    # hand each question its neighbour's answer.
    out, rows, grace = {}, {}, set()
    for x, y, t in left:
        n = int(t)
        if not 1 <= n <= 60 or str(n) in out:
            continue
        same_row = [c for c in right if abs(c[1] - y) <= 12]
        if len(same_row) != 1:
            continue
        v = same_row[0][2]
        rows[n] = y
        # "G" marks a grace question: no single correct option to show
        if v.upper() == 'G' or not v.isdigit() or not 1 <= int(v) <= 4:
            grace.add(n)
            continue
        out[str(n)] = 'ABCD'[int(v) - 1]

    # The rows sit on an exact pitch, so the ones that did read give a straight
    # line through the table. Fitting it locates the handful the detector
    # fumbled, which are then re-read one row at a time, enlarged.
    missing = [n for n in range(1, 61)
               if str(n) not in out and n not in grace]
    if missing and len(rows) >= 25:
        import numpy as np
        ns = np.array(sorted(rows), dtype=float)
        ys = np.array([rows[int(n)] for n in ns], dtype=float)
        slope, intercept = np.polyfit(ns, ys, 1)
        if abs(slope) > 1:
            x0 = int(min(c[0] for c in left) - 60)
            x1 = int(max(c[0] for c in right) + 60)
            for n in missing:
                y = slope * n + intercept
                for half, zoom in ((0.45, 4), (0.62, 4), (0.45, 7)):
                    box = (max(0, x0), int(y - slope * half),
                           min(img.width, x1), int(y + slope * half))
                    if box[2] - box[0] < 8 or box[3] - box[1] < 8:
                        continue
                    strip = img.crop(box)
                    strip = strip.resize((strip.width * zoom, strip.height * zoom),
                                         Image.LANCZOS)
                    found = sorted(ocr_words(strip), key=lambda c: c[0])
                    digits = [t for _x, _y, t in found if re.fullmatch(r'\d{1,3}|G', t, re.I)]
                    if len(digits) >= 2 and digits[0] == str(n):
                        v = digits[-1]
                        if v.upper() == 'G':
                            break
                        if v.isdigit() and 1 <= int(v) <= 4:
                            out[str(n)] = 'ABCD'[int(v) - 1]
                            break
    return out


def extract(path, version='A1'):
    """subject -> {question: letter} for every subject page in the file."""
    doc = pymupdf.open(path)
    keys = {}
    scanned = sum(len(p.get_text().strip()) for p in doc) < 200
    for i, page in enumerate(doc):
        if scanned:
            # no text layer: the sheets run Physics, Chemistry, Maths, Biology
            subject = SCANNED_ORDER[i] if i < len(SCANNED_ORDER) else None
            got = parse_scanned_a1(page) if subject else {}
            if got:
                keys[subject] = got
            continue
        subject = page_subject(page)
        if not subject:
            continue
        text = page.get_text()
        if any(v in text for v in ('A1', 'A2')) and 'Q' in text:
            got = parse_grid(page, version)
        else:
            got = {}
        if len(got) < 40:
            alt = parse_master(page)
            if len(alt) > len(got):
                got = alt
        if got:
            keys[subject] = got
    doc.close()
    return keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--version', default='A1')
    ap.add_argument('--out', default=None)
    ap.add_argument('--subjects', nargs='*', default=['Physics', 'Chemistry', 'Mathematics'])
    a = ap.parse_args()

    keys = extract(a.pdf, a.version)
    out_dir = a.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'answer-keys')
    os.makedirs(out_dir, exist_ok=True)

    for subject, key in sorted(keys.items()):
        if subject not in a.subjects:
            continue
        # A partial key is still worth writing: questions it does not cover are
        # simply not shipped, so 48 answers means 48 more questions a student
        # can practise, not a broken paper.
        if len(key) < 40:
            print('%-12s only %d answers read -- too few, skipped' % (subject, len(key)))
            continue
        path = os.path.join(out_dir, '%s-%d.json' % (subject.lower(), a.year))
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(key, f, indent=1)
        spread = {L: sum(1 for v in key.values() if v == L) for L in 'ABCD'}
        print('%-12s %d answers -> %s  %s' % (subject, len(key), os.path.basename(path), spread))
    if not keys:
        print('no answer pages recognised in %s' % a.pdf)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
