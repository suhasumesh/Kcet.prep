"""
OCR a scanned book once and keep the result.

The chapterwise Mathematics book has no text layer at all, so every heading,
question number and answer letter has to come from OCR -- and OCR of 180 pages
takes half an hour. Caching it as plain JSON means the parsing rules above it
can be rewritten and re-run in seconds.

Boxes are stored in PDF points, not pixels, so the cache stays valid whatever
DPI the crops are later taken at.

    python tools/ocr_cache.py <pdf> --label mtg-maths
"""
import io
import os
import sys
import json
import argparse

import numpy as np
import pymupdf
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_scanned import ocr_engine, for_ocr  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'data', 'ocr-cache')
OCR_DPI = 200          # enough for 9pt body type; 300 is 2x slower for no gain


def page_lines(page, dpi=OCR_DPI):
    """[(x0, y0, x1, y1, text, conf)] for one page, in PDF points."""
    pix = page.get_pixmap(dpi=dpi)
    img = for_ocr(Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'))
    result, _ = ocr_engine()(np.array(img))
    scale = 72.0 / dpi
    out = []
    for box, text, conf in (result or []):
        text = text.strip()
        if not text:
            continue
        xs = [p[0] * scale for p in box]
        ys = [p[1] * scale for p in box]
        out.append([round(min(xs), 2), round(min(ys), 2),
                    round(max(xs), 2), round(max(ys), 2), text, round(float(conf), 3)])
    out.sort(key=lambda w: (w[1], w[0]))
    return out


def build(pdf_path, label, dpi=OCR_DPI):
    os.makedirs(CACHE, exist_ok=True)
    target = os.path.join(CACHE, '%s.json' % label)
    doc = pymupdf.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        pages.append(page_lines(doc[i], dpi))
        print('  page %d/%d  %d lines' % (i + 1, len(doc), len(pages[-1])), flush=True)
    doc.close()
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(dict(pdf=os.path.basename(pdf_path), dpi=dpi, pages=pages), f)
    print('wrote %s (%d pages, %d lines)'
          % (target, len(pages), sum(len(p) for p in pages)))
    return target


def load(label):
    with open(os.path.join(CACHE, '%s.json' % label), encoding='utf-8') as f:
        return json.load(f)['pages']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--label', required=True)
    ap.add_argument('--dpi', type=int, default=OCR_DPI)
    a = ap.parse_args()
    build(a.pdf, a.label, a.dpi)


if __name__ == '__main__':
    main()
