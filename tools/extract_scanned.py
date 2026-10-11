"""
Extractor for scanned KEA question booklets (2010, 2011, 2016, 2026).

These PDFs carry no text layer at all, so layout has to be recovered from the
pixels. OCR is used only to *locate* things -- the question numbers "1." .. "60."
and the option markers "(1)".."(4)" -- and the content itself is then cropped
straight from the page image. That keeps every diagram, graph and formula exactly
as printed, which OCR could never reproduce faithfully.

These booklets print no answer key, so one must be supplied alongside
(see data/answer-keys/<subject>-<year>.json).
"""
import os
import re
import io
import json
import argparse

import numpy as np
import pymupdf
from PIL import Image, ImageOps

RENDER_DPI = 300
PT = RENDER_DPI / 72.0           # pdf points -> rendered pixels

# OCR renders the trailing dot of a question number inconsistently
QNUM = re.compile(r'^(\d{1,2})\s*[.):,;]?$')
OPT = re.compile(r'^\(?([1-4])[)\.]$')
# Kannada occupies the U+0C80..U+0CFF block; those pages are the regional version
KANNADA = re.compile(r'[ಀ-೿]')

# The cover of every KEA booklet is a numbered list of instructions, and item
# 5 of it reads exactly like question 5 to a number-driven extractor: a number
# at the left margin with a paragraph beside it. Those rows were reaching the
# bank and coming up mid-test as a question about not spoiling the OMR sheet.
# Only wording unique to the cover counts -- "Space for Rough Work" is printed
# at the foot of every page, so a real question's crop often catches it.
FRONT_MATTER = re.compile(
    r'(OMR\s*answer\s*sheet|question\s*booklet|INSTRUCTIONS\s*TO\s*CANDIDATES'
    r"|Bell\s*rings|paper\s*seal|DON'?\s?TS?\s*:|MAXIMUM\s*MARKS"
    r'|TOTAL\s*DURATION|read\s*each\s*question\s*carefully)', re.I)


def is_front_matter(text):
    """True for a band that is really part of the booklet's cover."""
    # The giveaway has to be near the start: a question whose crop merely
    # overran into the footer is still a question.
    return bool(FRONT_MATTER.search(' '.join(text.split())[:160]))


_engine = None


def ocr_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def page_image(page, dpi=RENDER_DPI):
    """The page as it will be cropped: full colour, untouched."""
    pix = page.get_pixmap(dpi=dpi)
    return Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')


def for_ocr(img):
    """
    A high-contrast copy for the detector only.

    Some of these booklets are printed in pale magenta or cyan ink, which a
    text detector reads poorly straight off the scan. Flattening to grey and
    stretching the range makes the glyphs black without touching the image the
    crops are taken from.
    """
    grey = ImageOps.autocontrast(img.convert('L'), cutoff=1)
    return grey.convert('RGB')


def ocr_page(img):
    """Return [(x0, y0, x1, y1, text, conf)] in rendered-pixel coordinates."""
    result, _ = ocr_engine()(np.array(img))
    out = []
    for box, text, conf in (result or []):
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        out.append((min(xs), min(ys), max(xs), max(ys), text.strip(), conf))
    return sorted(out, key=lambda w: (w[1], w[0]))


def split_tokens(words):
    """
    OCR returns whole lines. Markers are recovered from the start of a line and
    their x-extent estimated by character share, which is accurate enough for a
    monospaced-ish leading token such as "12." or "(3)".
    """
    out = []
    for x0, y0, x1, y1, text, conf in words:
        if not text:
            continue
        head = text.split()[0]
        frac = len(head) / max(len(text), 1)
        hx1 = x0 + (x1 - x0) * frac
        out.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, text=text, head=head,
                        head_x1=hx1, conf=conf))
    return out


def content_bounds(tokens, img):
    if not tokens:
        return 0, 0, img.width, img.height
    return (min(t['x0'] for t in tokens), min(t['y0'] for t in tokens),
            max(t['x1'] for t in tokens), max(t['y1'] for t in tokens))


# Short, extremely common English words. A page of the English version is full
# of them; a page of the Kannada version contains none.
ENGLISH_MARKERS = re.compile(
    r'\b(the|of|and|is|are|to|in|for|with|which|following|a|an|be|on|if|then|'
    r'that|from|value|given|will|has|have|its|by|at|as|not|one|two|same)\b', re.I)


def is_english_page(tokens):
    """
    Whether this page is the English half of the booklet.

    Testing for Kannada code points does not work: the recogniser has no Kannada
    model, so a Kannada page comes back as Latin-looking noise with no Kannada
    characters in it at all, and every page would pass. Looking for ordinary
    English words instead is positive evidence -- noise does not produce "the",
    "which" and "following" by accident.

    Density, not a raw count: a Kannada page still yields a handful of stray
    Latin fragments, while a short English page yields only a handful of real
    words. Measured across these booklets the two populations do not overlap --
    English pages run 0.23 to 0.44, Kannada and cover pages 0.00 to 0.14, so
    the cut sits between them with room on both sides. A diagram-heavy English
    page sits at the bottom of that range -- set the bar at 0.25 and three such
    pages per paper are thrown away.
    """
    text = ' '.join(t['text'] for t in tokens)
    if len(text.strip()) < 40 or KANNADA.search(text):
        return False
    words = re.findall(r'[A-Za-z]{2,}', text)
    # A diagram-heavy English page carries very little prose, so the floor has
    # to stay low; the density test below is what actually separates the halves.
    if len(words) < 6:
        return False
    return len(ENGLISH_MARKERS.findall(text)) / len(words) >= 0.18


OPT_INLINE = re.compile(r'(?:^|(?<=\s))\(?([1-4])\)')


def find_markers(tokens, left_limit):
    """
    Question numbers at the left margin, plus every option marker on the page.

    OCR often returns a whole option row as one line -- "(1) 10 KeV (2) 1 KeV" --
    so the text is scanned end to end rather than only at its start, and each
    marker's x is interpolated from its character offset within the line box.
    That is approximate, but it only has to be good enough to slice between
    markers, and the crop itself comes from the page image at full fidelity.
    """
    qs, opts = [], []
    for t in tokens:
        m = QNUM.match(t['head'])
        if m and t['x0'] < left_limit:
            qs.append(dict(num=int(m.group(1)), x0=t['x0'], x1=t['head_x1'],
                           y0=t['y0'], y1=t['y1']))
            continue

        text = t['text']
        width = t['x1'] - t['x0']
        n = max(len(text), 1)
        for mm in OPT_INLINE.finditer(text):
            opts.append(dict(
                opt=int(mm.group(1)),
                x0=t['x0'] + width * (mm.start() / n),
                x1=t['x0'] + width * (mm.end() / n),
                y0=t['y0'], y1=t['y1'], right=t['x1'],
            ))
    return qs, opts


def margin_numbers(img, box, scale=3):
    """
    Read the question numbers out of the left margin on their own.

    Whole-page OCR misses many of them: they are two small digits adrift in
    white space, and the detector is tuned for lines of prose. Cropping the
    margin into a narrow strip and enlarging it turns each number into the
    only thing on its line, which is read far more reliably -- and the numbers
    are what every question boundary depends on.
    """
    cx0, cy0, cx1, cy1 = box
    width = max(40, (cx1 - cx0) * 0.085)
    strip = img.crop((max(0, int(cx0 - 14)), max(0, int(cy0 - 20)),
                      int(cx0 + width), min(img.height, int(cy1 + 20))))
    if strip.width < 10 or strip.height < 10:
        return []
    strip = strip.resize((strip.width * scale, strip.height * scale), Image.LANCZOS)

    found = []
    for x0, y0, x1, y1, text, conf in ocr_page(for_ocr(strip)):
        m = QNUM.match(text.strip())
        if not m:
            continue
        n = int(m.group(1))
        if 1 <= n <= 60:
            found.append(dict(num=n,
                              x0=max(0, cx0 - 14) + x0 / scale,
                              x1=max(0, cx0 - 14) + x1 / scale,
                              y0=max(0, cy0 - 20) + y0 / scale,
                              y1=max(0, cy0 - 20) + y1 / scale))
    return sorted(found, key=lambda q: q['y0'])


def crop(img, box, path):
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(img.width, x1), min(img.height, y1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return None
    im = img.crop((x0, y0, x1, y1))
    im.save(path, 'PNG')
    return dict(w=im.width, h=im.height)


FOOTER = re.compile(r'space\s*for\s*rough|rough\s*work|^[A-D]-\d$|^P$|^\d{1,3}$', re.I)


def option_groups(opts, row_h=RENDER_DPI * 0.13):
    """
    Cluster option markers into one group per question, used only to confirm
    that a band really does contain a full set of four options.

    Reading order has to be banded first: two options sharing a row come back
    from OCR with slightly different y, so sorting on raw y alone would put the
    right-hand option before the left-hand one and break every pair. The band
    height tracks the render DPI -- too small and a side-by-side pair lands in
    two different bands, which silently loses the question.
    """
    ordered = sorted(opts, key=lambda o: (round(o['y0'] / row_h), o['x0']))
    groups, cur = [], []
    for o in ordered:
        if o['opt'] == 1 and cur:
            groups.append(cur)
            cur = []
        cur.append(o)
        if len(cur) == 4:
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return [g for g in groups if sorted(x['opt'] for x in g) == [1, 2, 3, 4]]


def extract(pdf_path, out_dir, subject, year, answer_key=None, dpi=RENDER_DPI,
            slug=None):
    """
    Crop each question as a single band covering its stem and all four options.

    Boundaries come from the *option groups*, not the question numbers. A set of
    four "(1)..(4)" markers is the most reliable thing OCR finds on these scans,
    and one set means one question, so a question runs from just below the
    previous set to the bottom of its own. Depending on the printed number
    instead cost roughly half of every paper, because a single unread number
    silently dropped its question.

    Numbers are still read, but only to *label* and to check: the groups are
    numbered in order, and wherever a printed number is recognised it has to
    agree with the running count, otherwise the count resyncs to the page.
    """
    doc = pymupdf.open(pdf_path)
    # The caller names the crop folder when two extractions of the same paper
    # have to live side by side -- the user's own copy and the official
    # booklet are the same subject and year, and would otherwise overwrite
    # each other's images.
    slug = slug or '%s-%d' % (subject.lower(), year)
    crop_dir = os.path.join(out_dir, 'crops', slug)
    os.makedirs(crop_dir, exist_ok=True)

    # ---- pass 1: read every English page once -----------------------------
    pages = []
    for pi in range(len(doc)):
        img = page_image(doc[pi], dpi)
        tokens = split_tokens(ocr_page(for_ocr(img)))
        if not tokens or not is_english_page(tokens):
            continue
        cx0, cy0, cx1, cy1 = content_bounds(tokens, img)
        qmarks, opts = find_markers(tokens, cx0 + 0.09 * (cx1 - cx0))
        # merge in the margin pass, which finds numbers whole-page OCR missed
        have = {q['num'] for q in qmarks}
        for q in margin_numbers(img, (cx0, cy0, cx1, cy1)):
            if q['num'] not in have:
                qmarks.append(q)
                have.add(q['num'])
        qmarks.sort(key=lambda q: q['y0'])
        groups = option_groups(opts)
        if not groups and not qmarks:
            continue
        # The booklet's cover is a numbered list of instructions, and its item
        # 5 looks exactly like question 5: a number at the left margin with a
        # paragraph beside it. Left in, it shipped as a question *and* set the
        # running count to 5, so the real questions 1 to 4 were then rejected
        # for going backwards. It carries no option markers, which is what
        # separates it from a page of questions.
        if len(groups) < 2 and is_front_matter(' '.join(t['text'] for t in tokens)):
            continue
        floor = cy1 + 6
        for t in tokens:
            if FOOTER.match(t['text'].strip()) and t['y0'] > cy0 + 0.25 * (cy1 - cy0):
                floor = min(floor, t['y0'] - 8)
        pages.append(dict(i=pi, img=img, tokens=tokens, groups=groups, qmarks=qmarks,
                          opts=opts, box=(cx0, cy0, cx1, cy1), floor=floor))

    # ---- pass 2: a band per printed question number -----------------------
    # With the margin pass the numbers are found reliably, so they -- not the
    # option groups -- define where each question starts and stops. Option
    # markers are kept as the test of whether a band really is a question.
    bands = []
    last_num = 0
    for pg in pages:
        cx0, cy0, cx1, cy1 = pg['box']
        marks = sorted((q for q in pg['qmarks'] if 1 <= q['num'] <= 60),
                       key=lambda q: q['y0'])
        # The paper is numbered 1..60 in order, so a reading is only believed if
        # it continues that sequence. Without this one misread digit -- a "50"
        # halfway down page 4 -- makes every later number on the page look like
        # a step backwards, and the whole page is lost.
        clean_marks = []
        for q in marks:
            if last_num < q['num'] <= last_num + 4:
                clean_marks.append(q)
                last_num = q['num']

        for mi, q in enumerate(clean_marks):
            top = q['y0'] - 8
            bottom = (clean_marks[mi + 1]['y0'] - 8) if mi + 1 < len(clean_marks) else pg['floor']
            bottom = min(bottom, pg['floor'])
            if bottom - top < 45:
                continue
            inside = [o for o in pg['opts'] if top <= o['y0'] < bottom]
            # Two of the four labels is enough. The number already had to
            # continue the paper's 1..60 sequence to get here, which is the
            # real evidence that this is a question; demanding all four labels
            # discarded one for every marker the detector happened to miss.
            # A tall band with none is kept too -- that is a diagram question
            # whose options the detector could not see at all.
            tall = (bottom - top) > 0.22 * pg['img'].height
            if len({o['opt'] for o in inside}) < 2 and not tall:
                continue
            # Where a number went unread the band holds more than one question:
            # 5 followed by 8 means 6 and 7 are inside it. If the band contains
            # exactly that many complete option sets, it can be cut between them
            # and the missing numbers filled in -- the alternative is losing
            # three questions because one digit was smudged.
            gap = (clean_marks[mi + 1]['num'] - q['num']) if mi + 1 < len(clean_marks) else 1
            cuts = []
            if gap > 1:
                groups = option_groups(inside)
                if len(groups) == gap:
                    cuts = [max(o['y1'] for o in g) + 6 for g in groups[:-1]]
                else:
                    # No clean groups, but a "(4)" still marks the end of a
                    # question's options, so the band can be cut after each one.
                    lasts = sorted(o['y1'] for o in inside if o['opt'] == 4)
                    merged = [y for i, y in enumerate(lasts)
                              if i == 0 or y - lasts[i - 1] > 20]
                    if len(merged) == gap:
                        cuts = [y + 6 for y in merged[:-1]]

            starts = [top] + cuts
            ends = cuts + [bottom]
            for k, (a, b) in enumerate(zip(starts, ends)):
                if b - a < 45:
                    continue
                bands.append(dict(page=pg['i'], top=a, bottom=b,
                                  number=q['num'] + k,
                                  body_from=(q['x1'] + 2) if k == 0 else None, pg=pg))

    key = answer_key or {}
    results, seen = [], set()
    for b in bands:
        n = b['number']
        if n in seen or not 1 <= n <= 60:
            continue
        pg = b['pg']
        cx0, cy0, cx1, cy1 = pg['box']
        # Start past the printed number; the app supplies its own.
        cut = b['body_from'] or cx0
        in_band = [t for t in pg['tokens'] if b['top'] <= t['y0'] < b['bottom']]
        body = [t['x0'] for t in in_band if t['x0'] > cut]
        left = (min(body) - 10) if body else cx0
        # ... but never through the middle of a word. Where OCR overstates how
        # far the question number reaches, the first word of the stem falls to
        # the left of `cut` and the crop sliced it in half -- whole papers came
        # out reading "ttky defect" and "ur sol contains". Any token the edge
        # would cut pulls it back to that token's own left edge.
        for t in in_band:
            if t['x0'] < left < t['x1']:
                left = t['x0'] - 6
        left = max(left, cx0 - 4)

        got = crop(pg['img'], (left, b['top'], cx1 + 10, b['bottom']),
                   os.path.join(crop_dir, 'q%03d-stem0.png' % n))
        if not got:
            continue

        words = [t['text'] for t in sorted(
            (t for t in pg['tokens'] if b['top'] <= t['y0'] < b['bottom']),
            key=lambda t: (round(t['y0'] / 20), t['x0']))]
        text = re.sub(r'\s+', ' ', ' '.join(words)).strip()

        if is_front_matter(text):
            continue

        seen.add(n)
        results.append(dict(
            number=n, subject=subject, year=year, source=os.path.basename(pdf_path),
            stemText=text,
            stemImages=[dict(src='%s/q%03d-stem0.png' % (slug, n), **got)],
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
    ap.add_argument('--key', help='JSON file mapping question number -> A|B|C|D')
    a = ap.parse_args()

    key = json.load(open(a.key, encoding='utf-8')) if a.key else {}
    res = extract(a.pdf, a.out, a.subject, a.year, key)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, '%s-%d.json' % (a.subject.lower(), a.year)),
              'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print('%-16s %3d questions | 4-opt %3d | answers %3d'
          % ('%s-%d' % (a.subject, a.year), len(res),
             sum(1 for r in res if len(r['options']) == 4),
             sum(1 for r in res if r['answer'])))


if __name__ == '__main__':
    main()
