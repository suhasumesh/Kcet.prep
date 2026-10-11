"""
Re-cut a chapterwise crop whose first line was clipped off the top.

The band splitter in extract_chapterwise_ocr.py puts the top of each band at
the question number, but a fraction, an integral sign or a limit reaches
*above* the number's line -- so the numerator, the upper limit or an exponent
is sliced away and the question becomes unanswerable.

The crops listed in data/solutions/_clipped.json are re-rendered from the PDF
with extra room at the top, written back to the *same* PNG filename so that
nothing is renumbered and no hand-written solution is orphaned.

    python tools/uncrop_top.py --check     # report, change nothing
    python tools/uncrop_top.py             # re-cut them

The band is located from the OCR cache: the question number's own box fixes
the line the band should start on, and the crop's stored pixel size fixes how
far down and across it ran.
"""
import os
import re
import sys
import json
import argparse

import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, 'data', 'solutions')
CHAPTERWISE = os.path.join(ROOT, 'data', 'chapterwise')
CROPS = os.path.join(CHAPTERWISE, 'crops')
CACHE = os.path.join(ROOT, 'data', 'ocr-cache')
BOOKS = os.path.join(ROOT, 'Ref_Books')

DPI = 200
PT = 72.0 / DPI          # points per pixel at the crop DPI
EXTRA = 26               # points of headroom to restore (about two lines)
LEFT_PAD = 10            # points of margin left of the question number

LABEL = {
    'MTG Karnataka-CET Chapterwise · Mathematics': 'mtg-maths',
    'MTG Karnataka-CET Chapterwise · Physics': 'mtg-physics',
}


def index_rows():
    """bank key -> extracted row, for every chapterwise question."""
    out = {}
    for f in sorted(os.listdir(CHAPTERWISE)):
        if not f.endswith('.json'):
            continue
        for q in json.load(open(os.path.join(CHAPTERWISE, f), encoding='utf-8')):
            label = [k for k, v in LABEL.items() if v == q['source']]
            if not label:
                continue
            key = '|'.join(str(x) for x in (
                'kcet', q['subject'], q.get('year') or 0, q['number'],
                label[0], q['page'], q['seq']))
            out[key] = q
    return out


def number_box(cache, page, number):
    """The OCR box of the question's own number on that page, if it is there."""
    want = re.compile(r'^\(?%d\s*[.)]' % number)
    best = None
    for x0, y0, x1, y1, text, conf in cache['pages'][page]:
        if want.match(text.strip()) and (best is None or y0 < best[1]):
            best = (x0, y0, x1, y1)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    listed = json.load(open(os.path.join(STORE, '_clipped.json'), encoding='utf-8'))
    rows = index_rows()
    caches, docs = {}, {}
    done, missed = [], []

    for key in listed:
        if key.startswith('_'):
            continue
        q = rows.get(key)
        if not q:
            missed.append((key, 'no extracted row')); continue
        src = q['source']
        if src not in caches:
            p = os.path.join(CACHE, src + '.json')
            if not os.path.exists(p):
                missed.append((key, 'no OCR cache for ' + src)); continue
            caches[src] = json.load(open(p, encoding='utf-8'))
            docs[src] = pymupdf.open(os.path.join(BOOKS, caches[src]['pdf']))
        cache, doc = caches[src], docs[src]

        box = number_box(cache, q['page'], q['number'])
        if not box:
            missed.append((key, 'question number %d not found on page %d'
                           % (q['number'], q['page']))); continue

        w_pt = q['image']['w'] * PT
        h_pt = q['image']['h'] * PT
        x0 = box[0] - LEFT_PAD
        top = box[1] - EXTRA
        rect = pymupdf.Rect(x0, max(0, top), x0 + w_pt, box[1] + h_pt)

        path = os.path.join(CROPS, q['image']['src'].replace('/', os.sep))
        print('%-46s  %+dpt headroom -> %.0f x %.0f pt'
              % (os.path.basename(path), EXTRA, rect.width, rect.height))
        if not a.check:
            backup = path + '.orig'
            if not os.path.exists(backup):
                os.replace(path, backup)
            doc[q['page']].get_pixmap(clip=rect, dpi=DPI).save(path)
        done.append(key)

    print('\nre-cut %d, could not re-cut %d' % (len(done), len(missed)))
    for key, why in missed:
        print('  %s\n    %s' % (key, why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
