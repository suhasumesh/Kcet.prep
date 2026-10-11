"""
KCET PYQ extractor.

Reads PhysicsWallah-style KCET previous-year PDFs and emits, per paper:
  - <subject>-<year>.json : stem text, option texts, answer letter, solution text,
                            plus a manifest of crop images
  - crops/<slug>/*.png    : pixel-perfect crops of stem / each option / solution

Why crops: in these PDFs every mathematical expression is an embedded image, so a
pure text extraction silently drops the maths. Cropping the exact page region
keeps the question visually identical to the original paper.

Layout facts these papers obey (verified across the 2020-2025 PCM papers):
  * two text columns, split at page mid-x
  * every question starts with a block whose text begins "Q<n>"
  * options start with "(A)".."(D)"; two options may share one row
  * an "Answer Key" page maps Q<n> -> letter
  * a "Hints & Solutions" section repeats "Q<n>" followed by "Text Solution:"
"""
import pymupdf
import re
import os
import json
import argparse
import unicodedata

QRE = re.compile(r'^Q\s*(\d+)\b')
ORE = re.compile(r'^\(([A-D])\)')
OALL = re.compile(r'\(([A-D])\)')
NBSP = ' '
FOOTER_PAT = re.compile(r'Android App|iOS App|PW Website|^Vernacular$|scan the QR code', re.I)
# a block made only of pipes / bullets / whitespace is page chrome, never content
CHROME_ONLY = re.compile(r'^[\s|·•\-–—]*$')
HEADER_PAT = re.compile(r'^KCET PYQ|^(PHYSICS|CHEMISTRY|MATHEMATICS|MATHS)$|^Answer Key$|^Hints & Solutions$', re.I)


def clean(s):
    s = s.replace(NBSP, ' ')
    s = unicodedata.normalize('NFKC', s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def usable_blocks(page):
    """Text blocks minus running header/footer chrome."""
    out = []
    for b in page.get_text('blocks'):
        if b[6] != 0:
            continue
        t = b[4].replace(NBSP, ' ').strip()
        if not t or CHROME_ONLY.match(t) or FOOTER_PAT.search(t) or HEADER_PAT.match(t):
            continue
        out.append(b)
    return out


def column_edges(page, blocks):
    """
    Detect the left edge of each text column. These papers vary between two and
    three columns from page to page, so the grid is measured rather than assumed.

    Both "Q<n>" labels and "(A)" option markers are reliably flush to a column:
    the Q label sits on the edge, options sit at a fixed ~23pt indent. Using both
    gives enough samples to cluster even on a page with few questions.
    """
    samples = []
    for b in blocks:
        t = b[4].strip()
        if QRE.match(t):
            samples.append(b[0])
        elif ORE.match(t):
            samples.append(b[0] - 23.0)
    if len(samples) < 2:
        samples = [b[0] for b in blocks]
    samples.sort()

    groups, group = [], [samples[0]]
    for x in samples[1:]:
        if x - group[-1] <= 14:
            group.append(x)
        else:
            groups.append(group)
            group = [x]
    groups.append(group)

    # A real column attracts several markers. A single stray one -- a wide option
    # that happens to wrap, say -- would otherwise invent a column and clip the
    # genuine one short, so require corroboration before trusting an edge.
    strong = [g for g in groups if len(g) >= 2]
    if not strong:
        strong = [max(groups, key=len)]
    # the edge is where the column's leftmost marker sits; averaging the cluster
    # would drift right of it and leak that column's first block into its neighbour
    edges = [min(g) for g in strong]

    merged = [edges[0]]
    for e in edges[1:]:
        if e - merged[-1] >= 60:
            merged.append(e)
    return merged


def ink_rects(page):
    """
    Every mark on the page: text blocks, embedded images and vector drawings.
    Column widths must be measured against all three -- in these papers the
    maths and the diagrams are images, so sizing a column from its text alone
    crops the formulae off the right-hand edge.
    """
    rs = [tuple(b[:4]) for b in page.get_text('blocks')]
    rs += [tuple(b['bbox']) for b in page.get_text('dict')['blocks'] if b.get('type') == 1]
    try:
        for d in page.get_drawings():
            r = tuple(d['rect'])
            # the hairline between columns is a rule, not content; letting it
            # set the column width would draw it down the edge of every crop
            if (r[2] - r[0]) < 3 and (r[3] - r[1]) > 20:
                continue
            rs.append(r)
    except Exception:
        pass
    return rs


def columns(page, blocks):
    """Partition blocks into (blocks, x0, x1) per detected column, top-to-bottom."""
    if not blocks:
        return []
    edges = column_edges(page, blocks)
    ink = ink_rects(page)
    out = []
    for i, e in enumerate(edges):
        # a column runs from just left of its own edge to just left of the next
        # one -- NOT to the midpoint between edges, which would clip wide lines
        lo = 0.0 if i == 0 else max(0.0, e - 8)
        hi = page.rect.width if i == len(edges) - 1 else edges[i + 1] - 6
        col = sorted([b for b in blocks if lo <= b[0] < hi], key=lambda b: b[1])
        if not col:
            continue
        # trim dead margin, but measure against every mark in the band, not just text
        right = [r[2] for r in ink if lo - 2 <= r[0] < hi and r[2] <= hi + 1]
        hi = min(hi, max(right) + 6) if right else hi
        out.append((col, lo, hi))
    return out


def find_section_pages(doc):
    """Return (question_pages, answer_key_page, solution_pages)."""
    ans_page, sol_start = None, None
    for i, p in enumerate(doc):
        t = p.get_text()
        if ans_page is None and re.search(r'^\s*Answer Key\s*$', t, re.M):
            ans_page = i
        if sol_start is None and re.search(r'Hints\s*&\s*Solutions', t):
            sol_start = i
    n = len(doc)
    q_end = ans_page if ans_page is not None else (sol_start if sol_start is not None else n)
    q_pages = list(range(0, q_end))
    sol_pages = list(range(sol_start, n)) if sol_start is not None else []
    return q_pages, ans_page, sol_pages


def parse_answer_key(doc, ans_page):
    if ans_page is None:
        return {}
    txt = doc[ans_page].get_text().replace(NBSP, ' ')
    key = {}
    for m in re.finditer(r'Q\s*(\d+)\s*\n?\s*([A-D])\b', txt):
        key[int(m.group(1))] = m.group(2)
    return key


def collect_regions(doc, pages):
    """
    Walk pages in reading order and group slabs of column area under the question
    number that owns them. Returns [{'num': int, 'parts': [slab, ...]}, ...].
    """
    slabs = []
    for pi in pages:
        page = doc[pi]
        blocks = usable_blocks(page)
        if not blocks:
            continue
        for col_blocks, cx0, cx1 in columns(page, blocks):
            if not col_blocks:
                continue
            col_top = min(b[1] for b in col_blocks)
            col_bottom = max(b[3] for b in col_blocks)
            marks = [(b[1], int(QRE.match(b[4].strip()).group(1)))
                     for b in col_blocks if QRE.match(b[4].strip())]
            if not marks:
                slabs.append(dict(page=pi, x0=cx0, x1=cx1, y0=col_top, y1=col_bottom,
                                  num=None, blocks=col_blocks))
                continue
            # text above the first Q marker continues the previous question
            if marks[0][0] - col_top > 4:
                slabs.append(dict(page=pi, x0=cx0, x1=cx1, y0=col_top, y1=marks[0][0] - 2,
                                  num=None,
                                  blocks=[b for b in col_blocks if b[3] <= marks[0][0]]))
            for i, (y, num) in enumerate(marks):
                yend = marks[i + 1][0] - 2 if i + 1 < len(marks) else col_bottom
                slabs.append(dict(page=pi, x0=cx0, x1=cx1, y0=y - 2, y1=yend, num=num,
                                  blocks=[b for b in col_blocks
                                          if b[1] >= y - 2 and b[3] <= yend + 2]))
    questions, cur = [], None
    for s in slabs:
        if s['num'] is not None:
            cur = dict(num=s['num'], parts=[s])
            questions.append(cur)
        elif cur is not None:
            cur['parts'].append(s)
    return questions


def body_indent(parts, fallback_x0):
    """
    x where the question body starts. The "Q<n>" label hangs ~24pt to the left of
    it, so cropping from here drops the label without clipping any wording.
    """
    xs = [b[0] for s in parts for b in s['blocks'] if not QRE.match(b[4].strip())]
    return min(xs) if xs else fallback_x0 + 24.5


def marker_edges(page, rect):
    """
    Right edge of each "(A)".."(D)" label inside a row.

    The crop starts just after the label, because the interface already shows
    its own A/B/C/D badge and a second one baked into the image reads as a typo.
    """
    out = {}
    for w in page.get_text('words', clip=pymupdf.Rect(*rect)):
        m = re.fullmatch(r'\(([A-D])\)', w[4].strip())
        if m and m.group(1) not in out:
            out[m.group(1)] = (w[0], w[2])
    return out


def split_question(parts):
    """Locate option rows inside one question. Returns (stem_rects, option_rects)."""
    rows = []
    for s in parts:
        for b in s['blocks']:
            if ORE.match(b[4].strip()):
                rows.append(dict(page=s['page'], y0=b[1], y1=b[3],
                                 letters=OALL.findall(b[4]),
                                 cx0=s['x0'], cx1=s['x1'], slab=s))
    if not rows:
        return [(s['page'], s['x0'], s['y0'], s['x1'], s['y1']) for s in parts], []

    first = rows[0]
    stem = []
    for s in parts:
        if s['page'] < first['page'] or (s['page'] == first['page'] and s['y1'] <= first['y0']):
            stem.append((s['page'], s['x0'], s['y0'], s['x1'], s['y1']))
        elif s['page'] == first['page'] and s['y0'] < first['y0']:
            stem.append((s['page'], s['x0'], s['y0'], s['x1'], first['y0'] - 1))

    opts = []
    for i, r in enumerate(rows):
        nxt = rows[i + 1] if i + 1 < len(rows) else None
        limit = nxt['y0'] - 1 if (nxt and nxt['page'] == r['page']) else r['slab']['y1']
        # stop at the last real content block, so trailing page chrome stays out
        owned = [b[3] for b in r['slab']['blocks'] if b[1] >= r['y0'] - 1 and b[3] <= limit + 1]
        bottom = max(owned) if owned else min(r['y1'], limit)
        if len(r['letters']) >= 2:
            # two options share one row -> split horizontally at the column midpoint
            midx = (r['cx0'] + r['cx1']) / 2
            opts.append((r['letters'][0], r['page'], r['cx0'], r['y0'], midx, bottom, limit))
            opts.append((r['letters'][1], r['page'], midx, r['y0'], r['cx1'], bottom, limit))
        else:
            opts.append((r['letters'][0], r['page'], r['cx0'], r['y0'], r['cx1'], bottom, limit))

    seen = {}
    for o in opts:
        seen.setdefault(o[0], o)
    return stem, [seen[L] for L in 'ABCD' if L in seen]


def rect_text(page, rect):
    return clean(page.get_text('text', clip=pymupdf.Rect(*rect)))


def content_images(page):
    """
    Individually placed images that carry content.

    Per-placement rects matter here, not the merged blocks get_text('dict')
    returns: that merge fuses a left-column formula with the right-column one
    beside it into a single wide box, and following it would drag the
    neighbouring question's maths into the crop.
    """
    area = page.rect.width * page.rect.height
    out = []
    for info in page.get_images(full=True):
        try:
            rects = page.get_image_rects(info[0])
        except Exception:
            continue
        for r in rects:
            w, h = r.x1 - r.x0, r.y1 - r.y0
            # the full-page watermark is not content
            if w * h > 0.20 * area or w > 0.78 * page.rect.width:
                continue
            out.append((r.x0, r.y0, r.x1, r.y1))
    return out


def widen(rect, images, y_cap=None):
    """
    Grow a crop to finish any formula image it cuts through.

    These papers place the maths as images, and one image can hold several
    questions' formulae and overhang the column divider. A crop sized to the
    text alone slices such a formula in half, so the image wins -- rightwards
    always, downwards only as far as `y_cap` (the next option's top), which
    keeps a tall fraction intact without swallowing its neighbour.
    """
    x0, y0, x1, y1 = rect
    # However far a formula overhangs, the crop may not grow without bound --
    # past about half a column again it has stopped finishing this question and
    # started showing the next one.
    hard_right = x0 + (x1 - x0) * 1.55
    for ix0, iy0, ix1, iy1 in images:
        if not (iy0 < y1 and iy1 > y0):
            continue
        if not (x0 - 2 <= ix0 < x1):
            continue
        x1 = max(x1, min(ix1, hard_right))
        if y_cap is not None:
            y1 = max(y1, min(iy1, y_cap))
    return (x0, y0, x1, y1)


def render(doc, page_i, rect, path, dpi, masks=()):
    page = doc[page_i]
    pad = 2
    r = pymupdf.Rect(max(0, rect[0] - pad), max(0, rect[1] - pad),
                     min(page.rect.width, rect[2] + pad),
                     min(page.rect.height, rect[3] + pad))
    if r.width <= 1 or r.height <= 1:
        return None
    pix = page.get_pixmap(clip=r, dpi=dpi)
    # a clipped pixmap keeps page-relative coordinates, so masks are mapped into
    # pix.irect's own origin rather than to (0, 0)
    scale = dpi / 72.0
    for m in masks:
        box = pymupdf.IRect(int(m[0] * scale), int(m[1] * scale) + 1,
                            int(m[2] * scale) + 2, int(m[3] * scale)) & pix.irect
        if not box.is_empty:
            pix.set_rect(box, (255, 255, 255))
    pix.save(path)
    return dict(w=pix.width, h=pix.height)


def parse_solutions(doc, sol_pages):
    """Map question number -> {'text': str, 'parts': [rects]}."""
    sols = {}
    for q in collect_regions(doc, sol_pages):
        n = q['num']
        if n in sols:
            continue
        rects = [(s['page'], s['x0'], s['y0'], s['x1'], s['y1']) for s in q['parts']]
        txt = '\n'.join(rect_text(doc[p], (a, b, c, d)) for p, a, b, c, d in rects)
        txt = re.sub(r'^\s*Q\s*\d+\s*', '', txt)
        txt = re.sub(r'^\s*Text Solution:\s*', '', txt, flags=re.I | re.M).strip()
        sols[n] = dict(text=txt, parts=rects)
    return sols


def extract(pdf_path, out_dir, subject, year, dpi=170):
    doc = pymupdf.open(pdf_path)
    q_pages, ans_page, sol_pages = find_section_pages(doc)
    key = parse_answer_key(doc, ans_page)
    sols = parse_solutions(doc, sol_pages)

    slug = '%s-%d' % (subject.lower(), year)
    crop_dir = os.path.join(out_dir, 'crops', slug)
    os.makedirs(crop_dir, exist_ok=True)

    imgs, texts = {}, {}

    def crop(page_i, rect, filename, y_cap=None, grow=True):
        """
        Render one region, finishing any formula image it would have cut.

        `grow` says whether an overhanging formula image may be followed past
        the column edge. It is only safe when the region has no wording of its
        own -- then the image *is* the content and must be shown whole. Where
        the region does have text, a wide image merely overlaps it, and
        following it would drag the next column's maths into view.

        Any neighbouring text pulled in by growing is masked out.
        """
        if page_i not in imgs:
            imgs[page_i] = content_images(doc[page_i])
            texts[page_i] = [tuple(b[:4]) for b in doc[page_i].get_text('blocks')
                             if b[6] == 0 and b[4].strip()]
        wide = widen(rect, imgs[page_i], y_cap) if grow else rect
        masks = []
        if wide[2] > rect[2] + 1:
            # Anything that begins past this column's own right edge belongs to
            # the next column -- its prose and its formulae alike -- so it is
            # painted out. Only the overhanging tail of this question survives.
            neighbours = texts[page_i] + [i for i in imgs[page_i] if i[0] >= rect[2] - 2]
            for t in neighbours:
                if t[0] >= rect[2] - 2 and t[0] < wide[2] and t[1] < wide[3] and t[3] > wide[1]:
                    masks.append(t)
        return render(doc, page_i, wide, os.path.join(crop_dir, filename), dpi, masks)

    results, seen = [], set()
    for q in collect_regions(doc, q_pages):
        n = q['num']
        if n in seen:
            continue
        seen.add(n)

        stem_rects, opt_rects = split_question(q['parts'])
        bx = body_indent(q['parts'], q['parts'][0]['x0'])
        stem_rects = [(p, max(a, bx), b, c, d) for p, a, b, c, d in stem_rects]
        stem_text = '\n'.join(rect_text(doc[p], (a, b, c, d)) for p, a, b, c, d in stem_rects)
        stem_text = re.sub(r'^\s*Q\s*%d\s*' % n, '', stem_text)
        stem_text = clean(re.sub(r'\[KCET\s*\d{4}\]', '', stem_text))

        stem_images = []
        for i, (p, a, b, c, d) in enumerate(stem_rects):
            fn = 'q%03d-stem%d.png' % (n, i)
            got = crop(p, (a, b, c, d), fn,
                       grow=len(rect_text(doc[p], (a, b, c, d))) < 12)
            if got:
                stem_images.append(dict(src='%s/%s' % (slug, fn), **got))

        options = []
        for (L, p, a, b, c, d, cap) in opt_rects:
            t = re.sub(r'^\(%s\)\s*' % L, '', rect_text(doc[p], (a, b, c, d)))
            # start the crop after the "(A)" label: the interface draws its own
            edges = marker_edges(doc[p], (a, b, c, d))
            left = edges.get(L, (a, a))[1] + 1 if L in edges else a
            fn = 'q%03d-opt%s.png' % (n, L)
            got = crop(p, (min(left, c - 4), b, c, d), fn, y_cap=cap, grow=len(t) < 6)
            options.append(dict(letter=L, text=clean(t),
                                img=dict(src='%s/%s' % (slug, fn), **got) if got else None))

        sol = sols.get(n)
        solution_text, solution_images = '', []
        if sol:
            solution_text = sol['text']
            for i, (p, a, b, c, d) in enumerate(sol['parts']):
                fn = 'q%03d-sol%d.png' % (n, i)
                got = crop(p, (a, b, c, d), fn,
                           grow=len(rect_text(doc[p], (a, b, c, d))) < 12)
                if got:
                    solution_images.append(dict(src='%s/%s' % (slug, fn), **got))

        results.append(dict(
            number=n, subject=subject, year=year, source=os.path.basename(pdf_path),
            stemText=stem_text, stemImages=stem_images,
            options=options, answer=key.get(n),
            solutionText=solution_text, solutionImages=solution_images,
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
    ap.add_argument('--dpi', type=int, default=170)
    a = ap.parse_args()

    res = extract(a.pdf, a.out, a.subject, a.year, a.dpi)
    os.makedirs(a.out, exist_ok=True)
    path = os.path.join(a.out, '%s-%d.json' % (a.subject.lower(), a.year))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    full4 = sum(1 for r in res if len(r['options']) == 4)
    ans = sum(1 for r in res if r['answer'])
    sol = sum(1 for r in res if r['solutionText'] or r['solutionImages'])
    print('%-14s %4d questions | 4-opt %3d | answers %3d | solutions %3d'
          % ('%s-%d' % (a.subject, a.year), len(res), full4, ans, sol))


if __name__ == '__main__':
    main()
