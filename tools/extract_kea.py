"""
Extractor for official KEA question booklets that still carry a text layer
(the 2017 papers).

These are printed bilingually, side by side: English in the left half of the
page, Kannada in the right. Only the left half is cropped. Each question is
one band -- stem and all four options together -- because the options sit in
a 2x2 arrangement that is far more legible kept as printed than sliced apart.

Answers come from the official KEA key, read separately by read_kea_key.py.
"""
import os
import re
import json
import argparse
import unicodedata

import pymupdf

QMARK = re.compile(r'^\s*(\d{1,3})\s*\.\s*\S')
OPTION = re.compile(r'\(\s*([A-D])\s*\)')
# the booklet repeats "Question Id : 11" under every question
FURNITURE = re.compile(r'Question\s*Id|SPACE FOR ROUGH WORK|^\s*\d{1,3}\s*$', re.I)
CROP_DPI = 170


def clean(s):
    s = unicodedata.normalize('NFKC', s.replace('\xa0', ' '))
    return re.sub(r'\s+', ' ', s).strip()


def english_blocks(page):
    """
    Blocks from the English half, split into content and page furniture.

    The two languages are set as parallel columns, so the divide is the page
    midpoint; everything right of it is the Kannada rendering of the same
    question and must not reach the crop. The furniture -- the "Question Id"
    line printed under every question -- is kept separately because its
    position is what tells the crop where to stop.
    """
    mid = page.rect.width * 0.5
    content, furniture = [], []
    for b in page.get_text('blocks'):
        if b[6] != 0 or b[0] >= mid or not b[4].strip():
            continue
        (furniture if FURNITURE.search(b[4].strip()) else content).append(b)
    return sorted(content, key=lambda b: b[1]), sorted(furniture, key=lambda b: b[1])


def ink_bottom(page, x0, x1, top, limit):
    """
    Lowest mark of any kind between `top` and `limit` in this column.

    Text block boxes under-report where a line really ends: a Lewis structure's
    lone-pair dots, an overline or a subscript all sit outside them. Measuring
    against drawings and images as well keeps those from being sliced off.
    """
    low = top
    rects = [tuple(b['bbox']) for b in page.get_text('dict')['blocks'] if b.get('type') == 1]
    try:
        rects += [tuple(d['rect']) for d in page.get_drawings()]
    except Exception:
        pass
    for r in rects:
        if r[0] < x1 and r[2] > x0 and top <= r[1] < limit:
            low = max(low, min(r[3], limit))
    return low


def extract(pdf_path, out_dir, subject, year, answer_key=None, dpi=CROP_DPI):
    doc = pymupdf.open(pdf_path)
    slug = '%s-%d' % (subject.lower(), year)
    crop_dir = os.path.join(out_dir, 'crops', slug)
    os.makedirs(crop_dir, exist_ok=True)

    key = answer_key or {}
    results, seen, last = [], set(), 0

    for pi in range(len(doc)):
        page = doc[pi]
        blocks, furniture = english_blocks(page)
        if not blocks:
            continue
        mid = page.rect.width * 0.5
        left = min(b[0] for b in blocks)
        # The English column overhangs the midpoint slightly, so the right edge
        # is measured from the text itself; cutting at the midpoint lopped the
        # last word off almost every line.
        right = min(mid + 14, max(b[2] for b in blocks) + 8)
        bottom = max(b[3] for b in blocks)

        marks = [b for b in blocks if QMARK.match(b[4])]
        # the paper is numbered 1..60 in order; a reading that does not
        # continue the sequence is a page number or a stray, not a question
        ordered = []
        for b in marks:
            n = int(QMARK.match(b[4]).group(1))
            if last < n <= last + 3 and n <= 60:
                ordered.append((n, b))
                last = n

        for i, (n, b) in enumerate(ordered):
            top = b[1] - 4
            limit = (ordered[i + 1][1][1] - 4) if i + 1 < len(ordered) else bottom + 6
            if limit - top < 30 or n in seen:
                continue
            inside = [x for x in blocks if top <= x[1] < limit]
            if len({m.group(1) for x in inside for m in OPTION.finditer(x[4])}) < 3:
                continue
            # end at this question's own last line, and never below the
            # "Question Id" stamp that follows it
            # a little padding: a text block's box stops at the baseline, so
            # lone-pair dots and descenders sit just below it
            end = max(max(x[3] for x in inside),
                      ink_bottom(page, left, right, top, limit)) + 10
            for fb in furniture:
                if top < fb[1] < limit:
                    end = min(end, fb[1] - 1)
                    break
            end = min(end, limit)
            if end - top < 30:
                continue

            # start past the printed number so the app can number questions itself
            body = [x[0] for x in inside if not QMARK.match(x[4])]
            x0 = max(left - 4, min(body) - 6 if body else left)
            rect = pymupdf.Rect(x0, top, right, end)
            if rect.width < 40 or rect.height < 30:
                continue

            fn = 'q%03d-stem0.png' % n
            pix = page.get_pixmap(clip=rect, dpi=dpi)
            pix.save(os.path.join(crop_dir, fn))
            seen.add(n)

            results.append(dict(
                number=n, subject=subject, year=year,
                source=os.path.basename(pdf_path),
                stemText=clean(' '.join(x[4] for x in inside))[:700],
                stemImages=[dict(src='%s/%s' % (slug, fn), w=pix.width, h=pix.height)],
                # options are printed inside the band, as in the booklet
                options=[dict(letter=L, text='', img=None) for L in 'ABCD'],
                answer=key.get(str(n)) or key.get(n),
                solutionText='', solutionImages=[],
                optionsInImage=True,
            ))

    results.sort(key=lambda r: r['number'])
    doc.close()
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--key')
    ap.add_argument('--dpi', type=int, default=CROP_DPI)
    a = ap.parse_args()

    key = json.load(open(a.key, encoding='utf-8')) if a.key and os.path.exists(a.key) else {}
    res = extract(a.pdf, a.out, a.subject, a.year, key, a.dpi)
    os.makedirs(a.out, exist_ok=True)
    scored = [r for r in res if r['answer']]
    with open(os.path.join(a.out, '%s-%d.json' % (a.subject.lower(), a.year)),
              'w', encoding='utf-8') as f:
        json.dump(scored, f, ensure_ascii=False, indent=1)
    print('%-14s %3d questions found, %3d with a key'
          % ('%s-%d' % (a.subject, a.year), len(res), len(scored)))


if __name__ == '__main__':
    main()
