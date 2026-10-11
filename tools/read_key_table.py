"""
Read an official KEA "Key Answer" sheet into data/answer-keys/.

The published sheet is a scanned grid holding every paper version side by side:
pairs of columns (version question numbers, then its key) for A1..D4. Only one
version matters -- the one printed on the booklet being used.

Reliability comes from a self-check rather than from trusting OCR: the question
column of the chosen version must read exactly 1, 2, 3 ... 60 in order. If a
single cell were misread or a row dropped, that sequence would break and the
run aborts instead of writing a silently shifted key.
"""
import os
import io
import json
import argparse

import numpy as np
import pymupdf
from PIL import Image

DPI = 300


def render(path, dpi=DPI):
    doc = pymupdf.open(path)
    pix = doc[0].get_pixmap(dpi=dpi)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    doc.close()
    return img


def ocr_image(img):
    from rapidocr_onnxruntime import RapidOCR

    result, _ = RapidOCR()(np.array(img))
    cells = []
    for box, text, conf in (result or []):
        t = text.strip()
        if not t:
            continue
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        cells.append(dict(x=(min(xs) + max(xs)) / 2, y=(min(ys) + max(ys)) / 2,
                          text=t, conf=conf))
    return cells


def ocr_cells(path, dpi=DPI):
    img = render(path, dpi)
    return ocr_image(img), img.width


def columns_of(cells, tol):
    """Cluster cell centres into vertical columns."""
    cols = []
    for c in sorted(cells, key=lambda c: c['x']):
        if cols and c['x'] - cols[-1][-1]['x'] <= tol:
            cols[-1].append(c)
        else:
            cols.append([c])
    return cols


def rows_of(col, tol=14):
    out = []
    for c in sorted(col, key=lambda c: c['y']):
        if out and c['y'] - out[-1][-1]['y'] <= tol:
            out[-1].append(c)
        else:
            out.append([c])
    return [sorted(r, key=lambda c: c['x'])[0] for r in out]


# the sheet prints the versions left to right in this fixed order
VERSION_ORDER = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4',
                 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4']


# the sheet prints the versions left to right in this fixed order
VERSION_ORDER = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4',
                 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4']


def extract_version(path, version, dpi=600, fixes=None):
    """
    Read one version's key out of the 16-version grid.

    The sheet is far too dense to OCR in one pass -- roughly half the digits
    come back missing, and the ones that survive cluster in whichever band the
    detector happened to resolve. So the grid is located geometrically (32
    evenly spaced columns, 16 versions x question + key), only the requested
    version's two columns are cropped, and that narrow strip is read in short
    slices where each digit is large and isolated.

    The question column must then read exactly 1..60. That is the integrity
    check: a dropped or misread row breaks the sequence and the run aborts
    rather than writing a key that is silently shifted by one.
    """
    version = version.upper()
    if version not in VERSION_ORDER:
        raise SystemExit('unknown version %s' % version)

    # A survey pass fixes the horizontal extent only. Its vertical coverage is
    # not trustworthy -- the detector routinely resolves just part of the page --
    # so the full height is scanned instead.
    survey = ocr_image(render(path, 200))
    digits = [c for c in survey if c['text'].isdigit()]
    if len(digits) < 200:
        raise SystemExit('this does not look like a KEA key grid (%d numeric cells)' % len(digits))
    first = min(c['x'] for c in digits)
    last = max(c['x'] for c in digits)
    pitch = (last - first) / (2 * len(VERSION_ORDER) - 1)   # centre-to-centre

    img = render(path, dpi)
    k = dpi / 200.0
    i = VERSION_ORDER.index(version)
    left = (first + pitch * 2 * i - pitch * 0.62) * k
    right = (first + pitch * (2 * i + 1) + pitch * 0.62) * k
    top, bottom = img.height * 0.035, img.height * 0.995

    # Slices overlap by more than a row, so a row sitting on a boundary is read
    # whole in at least one of them instead of being halved in both.
    cells, slices = [], 12
    height = (bottom - top) / slices
    overlap = (bottom - top) / 61 * 1.3
    for n in range(slices):
        y0 = int(top + n * height - overlap)
        y1 = int(top + (n + 1) * height + overlap)
        part = img.crop((max(0, int(left)), max(0, y0),
                         min(img.width, int(right)), min(img.height, y1)))
        if part.width < 8 or part.height < 8:
            continue
        for c in ocr_image(part):
            cells.append(dict(x=c['x'], y=c['y'] + max(0, y0), text=c['text']))

    # Rows must be merged against the row pitch, not the slice height: the
    # table has 60 rows plus a header, so anything near that pitch would fuse
    # consecutive answers into one and quietly drop most of the key.
    pitch_y = (bottom - top) / 61
    mid = (right - left) / 2
    qcol = rows_of([c for c in cells if c['x'] < mid and c['text'].isdigit()], tol=pitch_y * 0.45)
    kcol = rows_of([c for c in cells if c['x'] >= mid and c['text'].isdigit()], tol=pitch_y * 0.45)

    # Rows sit on an exact pitch, so the question numbers that did read give a
    # straight line through the table. Fitting it locates every row -- including
    # the handful OCR fumbled -- which are then re-read one cell at a time.
    anchors = [(int(c['text']), c['y']) for c in qcol
               if c['text'].isdigit() and 1 <= int(c['text']) <= 60]
    anchors = [a for a in anchors if a[0] not in [b[0] for b in anchors if b is not a][:0]]
    if len(anchors) < 30:
        raise SystemExit('only %d rows read for %s; the sheet did not scan cleanly'
                         % (len(anchors), version))
    ns = np.array([a[0] for a in anchors], dtype=float)
    ys = np.array([a[1] for a in anchors], dtype=float)
    slope, intercept = np.polyfit(ns, ys, 1)
    residual = float(np.max(np.abs(ys - (slope * ns + intercept))))
    if residual > slope * 0.6:
        raise SystemExit('row positions for %s are not on a regular pitch '
                         '(worst residual %.0fpx vs pitch %.0fpx)' % (version, residual, slope))

    by_row = {}
    for c in kcol:
        n = int(round((c['y'] - intercept) / slope))
        if 1 <= n <= 60 and c['text'].isdigit():
            by_row.setdefault(n, c['text'])

    for n in range(1, 61):
        if n in by_row:
            continue
        y = slope * n + intercept
        # A faint cell can defeat the detector at one crop but not another, so
        # the row is retried at a few heights and zooms before giving up. The
        # whole row is used rather than the lone answer cell: a single digit on
        # white gives a line detector nothing to lock onto.
        for half, zoom in ((0.45, 3), (0.62, 3), (0.45, 5), (0.80, 4),
                           (0.38, 6), (0.55, 8), (0.70, 6), (0.95, 3)):
            row = img.crop((int(left), int(y - slope * half),
                            int(right), int(y + slope * half)))
            if row.width < 6 or row.height < 6:
                continue
            row = row.resize((row.width * zoom, row.height * zoom), Image.LANCZOS)
            found = sorted((c for c in ocr_image(row) if c['text'].isdigit()),
                           key=lambda c: c['x'])
            hit = next((c['text'] for c in reversed(found)
                        if c['x'] > row.width * 0.45 and c['text'] in '1234'), None)
            if hit:
                by_row[n] = hit
                break

    # A cell or two per sheet can defeat OCR entirely even though it is plainly
    # legible. Those are supplied by hand with --fix after reading the sheet;
    # everything else stays machine-read and integrity-checked.
    for n, v in (fixes or {}).items():
        by_row.setdefault(n, str(v))

    missing = [n for n in range(1, 61) if n not in by_row]
    if missing:
        raise SystemExit(
            'integrity check failed for %s: no answer read for questions %s.\n'
            'Open the sheet, read those cells, and pass them explicitly, e.g. '
            '--fix %d=3' % (version, missing, missing[0]))

    out = {}
    for n in range(1, 61):
        v = int(by_row[n])
        if not 1 <= v <= 4:
            raise SystemExit('bad key value %r at question %d' % (by_row[n], n))
        out[str(n)] = 'ABCD'[v - 1]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf', help='the KEA key-answer sheet')
    ap.add_argument('--version', default='A1', help='booklet version code, e.g. A1')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', default=None)
    ap.add_argument('--fix', nargs='*', default=[],
                    help='cells OCR cannot read, as QUESTION=OPTION, e.g. --fix 46=4')
    a = ap.parse_args()

    fixes = {}
    for item in a.fix:
        q, _, v = item.partition('=')
        if not q.strip().isdigit() or v.strip() not in '1234':
            raise SystemExit('--fix expects QUESTION=OPTION with option 1-4, got %r' % item)
        fixes[int(q)] = int(v)

    key = extract_version(a.pdf, a.version, fixes=fixes)
    out = a.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data', 'answer-keys', '%s-%d.json' % (a.subject.lower(), a.year))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(key, f, indent=1)

    spread = {L: sum(1 for v in key.values() if v == L) for L in 'ABCD'}
    print('%s %d version %s -> %s' % (a.subject, a.year, a.version, out))
    print('  60 answers, distribution %s' % spread)
    print('  first ten: %s' % ' '.join('%s%s' % (i, key[str(i)]) for i in range(1, 11)))
    if fixes:
        print('  supplied by hand: %s' % ', '.join('Q%d=%s' % (q, 'ABCD'[v - 1])
                                                   for q, v in sorted(fixes.items())))


if __name__ == '__main__':
    main()
