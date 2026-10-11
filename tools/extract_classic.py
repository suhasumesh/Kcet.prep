"""
Extractor for the older "CET - SUBJECT - YEAR" papers (e.g. 2012).

These are single-column, full-width pages whose text comes from Word equation
fields: block boxes overlap and interleave, so block-level segmentation fails.
Instead this works at word level, finds the y of each marker, and crops
full-width horizontal bands.

  1.  <question text>
  a) ...   b) ...   c) ...   d) ...        (options share one or more rows)
  Ans: (a)
"""
import pymupdf
import re
import os
import json
import argparse
import unicodedata

QNUM = re.compile(r'^(\d{1,3})\.$')
OPT = re.compile(r'^\(?([a-dA-D])\)$')
ANS = re.compile(r'^Ans', re.I)
ANSLET = re.compile(r'Ans\s*[:.]?\s*\(?\s*([a-dA-D])', re.I)


def clean(s):
    s = unicodedata.normalize('NFKC', s.replace(' ', ' '))
    s = re.sub(r'[ \t]+', ' ', s)
    return re.sub(r'\n{3,}', '\n\n', s).strip()


def page_words(page):
    """Words as (x0, y0, x1, y1, text), reading order."""
    return [w[:5] for w in page.get_text('words')]


def rows(words, tol=5.0):
    """Group words into horizontal rows keyed by rounded baseline."""
    out = []
    for w in sorted(words, key=lambda w: (w[1], w[0])):
        if out and abs(w[1] - out[-1][0]) <= tol:
            out[-1][1].append(w)
        else:
            out.append([w[1], [w]])
    return [(y, sorted(ws, key=lambda w: w[0])) for y, ws in out]


def content_box(page):
    """Vertical span actually occupied by body text, excluding the title band."""
    ws = page_words(page)
    if not ws:
        return None
    return (min(w[0] for w in ws), min(w[1] for w in ws),
            max(w[2] for w in ws), max(w[3] for w in ws))


def markers(page):
    """
    Locate question numbers, option letters and answer tags on a page.
    Returns a list of dicts sorted by y.
    """
    found = []
    for y, ws in rows(page_words(page)):
        for w in ws:
            t = w[4].strip()
            m = QNUM.match(t)
            if m and w[0] < 70:                       # question numbers hug the left margin
                found.append(dict(kind='q', num=int(m.group(1)),
                                  x=w[0], x1=w[2], y=w[1], y1=w[3]))
                continue
            o = OPT.match(t)
            if o:
                found.append(dict(kind='o', letter=o.group(1).upper(),
                                  x=w[0], x1=w[2], y=w[1], y1=w[3]))
                continue
            if ANS.match(t) and w[0] < 110:
                found.append(dict(kind='a', x=w[0], y=w[1], y1=w[3]))
    return sorted(found, key=lambda m: (m['y'], m['x']))


def render(page, rect, path, dpi):
    r = pymupdf.Rect(*rect) & page.rect
    if r.width <= 2 or r.height <= 2:
        return None
    pix = page.get_pixmap(clip=r, dpi=dpi)
    pix.save(path)
    return dict(w=pix.width, h=pix.height)


def extract(pdf_path, out_dir, subject, year, dpi=170):
    doc = pymupdf.open(pdf_path)
    slug = '%s-%d' % (subject.lower(), year)
    crop_dir = os.path.join(out_dir, 'crops', slug)
    os.makedirs(crop_dir, exist_ok=True)

    # flatten all marker events across pages, in reading order
    events = []
    for pi, page in enumerate(doc):
        box = content_box(page)
        if not box:
            continue
        for m in markers(page):
            m['page'] = pi
            events.append(m)

    results = []
    cur = None
    for i, ev in enumerate(events):
        if ev['kind'] == 'q':
            if cur:
                results.append(cur)
            cur = dict(num=ev['num'], page=ev['page'], y0=ev['y'], opts=[], ans=None, end=None)
        elif cur is not None and ev['kind'] == 'o':
            cur['opts'].append(ev)
        elif cur is not None and ev['kind'] == 'a':
            cur['ans'] = ev
            cur['end'] = ev['y']
    if cur:
        results.append(cur)

    out = []
    seen = set()
    for q in results:
        n = q['num']
        if n in seen or not q['opts']:
            continue
        seen.add(n)
        page = doc[q['page']]
        box = content_box(page)
        left, right = box[0] - 4, box[2] + 4

        # ---- stem: from the question number down to the first option row
        first_opt = min(o['y'] for o in q['opts'] if o['page'] == q['page']) if \
            any(o['page'] == q['page'] for o in q['opts']) else box[3]
        # The "52." label hangs left of the wrapped body text. Cropping from the
        # body indent drops it, so the app can number the question itself.
        body_xs = [w[0] for w in page_words(page)
                   if q['y0'] - 3 <= w[1] < first_opt - 2 and w[0] > q.get('x1', 0) + 1]
        stem_left = min(body_xs) - 3 if body_xs else left
        stem_rect = (stem_left, q['y0'] - 3, right, first_opt - 2)
        fn = 'q%03d-stem0.png' % n
        stem_img = render(page, stem_rect, os.path.join(crop_dir, fn), dpi)
        stem_text = clean(page.get_text('text', clip=pymupdf.Rect(*stem_rect)))
        stem_text = re.sub(r'^\s*%d\s*\.\s*' % n, '', stem_text)

        # ---- options: group markers into rows, split each row at marker x
        by_row = {}
        for o in q['opts']:
            by_row.setdefault((o['page'], round(o['y'] / 6)), []).append(o)
        row_keys = sorted(by_row)
        # bottom of the final option row = the "Ans:" line, or next question
        tail = q['ans']['y'] - 2 if q['ans'] else box[3]

        options = []
        for ri, key in enumerate(row_keys):
            row = sorted(by_row[key], key=lambda o: o['x'])
            rpage = doc[key[0]]
            rtop = min(o['y'] for o in row) - 3
            if ri + 1 < len(row_keys) and row_keys[ri + 1][0] == key[0]:
                rbot = min(o['y'] for o in by_row[row_keys[ri + 1]]) - 2
            else:
                rbot = tail if key[0] == q['page'] else content_box(rpage)[3]
            for oi, o in enumerate(row):
                # start after the "a)" label; the interface draws its own badge
                x0 = o.get('x1', o['x']) + 1
                x1 = (row[oi + 1]['x'] - 4) if oi + 1 < len(row) else right
                if x1 - x0 < 12:
                    x0 = o['x'] - 3
                rect = (x0, rtop, x1, rbot)
                fn = 'q%03d-opt%s.png' % (n, o['letter'])
                img = render(rpage, rect, os.path.join(crop_dir, fn), dpi)
                t = clean(rpage.get_text('text', clip=pymupdf.Rect(*rect)))
                t = re.sub(r'^\(?[a-dA-D]\)\s*', '', t)
                t = re.sub(r'\bAns\s*[:.]?\s*\(?[a-dA-D]\)?\s*$', '', t).strip()
                options.append(dict(letter=o['letter'], text=t,
                                    img=dict(src='%s/%s' % (slug, fn), **img) if img else None))

        dedup = {}
        for o in options:
            dedup.setdefault(o['letter'], o)
        options = [dedup[L] for L in 'ABCD' if L in dedup]

        answer = None
        if q['ans']:
            line = doc[q['ans']['page']].get_text(
                'text', clip=pymupdf.Rect(left, q['ans']['y'] - 3, right, q['ans']['y1'] + 3))
            m = ANSLET.search(line)
            if m:
                answer = m.group(1).upper()

        out.append(dict(
            number=n, subject=subject, year=year, source=os.path.basename(pdf_path),
            stemText=clean(stem_text),
            stemImages=[dict(src='%s/%s' % (slug, 'q%03d-stem0.png' % n), **stem_img)] if stem_img else [],
            options=options, answer=answer, solutionText='', solutionImages=[],
        ))

    out.sort(key=lambda r: r['number'])
    doc.close()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--subject', required=True)
    ap.add_argument('--year', type=int, required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--dpi', type=int, default=170)
    a = ap.parse_args()

    res = extract(a.pdf, a.out, a.subject, a.year, a.dpi)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, '%s-%d.json' % (a.subject.lower(), a.year)),
              'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print('%-14s %4d questions | 4-opt %3d | answers %3d'
          % ('%s-%d' % (a.subject, a.year), len(res),
             sum(1 for r in res if len(r['options']) == 4),
             sum(1 for r in res if r['answer'])))


if __name__ == '__main__':
    main()
