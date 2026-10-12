"""
Pad every scanned-paper crop that still needs a worked solution.

extract_scanned.py cuts each question's band tight to the question number,
so anything reaching above that line -- an exponent, a fraction's numerator,
an integral's limits, a matrix's first row -- is sliced away, and anything
below the last detected line, usually the final options, is cut off.  About
one crop in three is damaged this way.

Repairing them one at a time costs an edit, a re-cut and a second read
apiece.  This does the whole remaining queue in one pass: a standard margin
on every side, pages rendered once per PDF and reused, and the page search
resuming where the previous question was found -- questions run in page
order, so the match is usually one page away.

    python tools/pad_crops.py --check      # report, change nothing
    python tools/pad_crops.py              # pad them

Crops already listed in _clipped_scan.json are skipped: those were measured
by hand and their margins are deliberate.
"""
import os
import sys
import json
import shutil
import argparse

import pymupdf
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uncrop_scan import (ROOT, STORE, SOURCES, index_rows, find_pdf,  # noqa: E402
                         page_gray, locate)

# Margins are quoted at 300 dpi and scaled to whatever dpi the crop was made
# at -- a fixed pixel count that clears a superscript on a 300 dpi render
# reaches two whole lines up on a 170 dpi one, dragging in the previous
# question's printed answer.
MARGIN_300 = dict(top=55, bottom=110, left=110)

# The bottom is really bounded by the **next** question, not by any fixed
# number: the options that got cut off run from the band's end down to
# wherever the next question starts.  Where that neighbour can be located,
# the crop is extended to just above it; GAP_300 is the clearance left so
# the next question's number does not appear.
GAP_300 = 30
MAX_BOTTOM_300 = 420


def scaled(d, dpi):
    return {k: int(round(v * dpi / 300.0)) for k, v in d.items()}


def neighbours(doc, rows, paper_rows, dpis, cache):
    """
    bank key -> (page, y) of the band that follows it.

    Locating every question of the paper, in number order, gives each band's
    position; the next one's top is the natural bottom for this one.
    """
    located, out = [], {}
    start = 0
    for key, row, assets in paper_rows:
        src = row['stemImages'][0]['src']
        path = os.path.join(assets, os.path.splitext(src)[0] + '.png')
        template = path + '.orig' if os.path.exists(path + '.orig') else path
        if not os.path.exists(template):
            continue
        hit = locate(doc, Image.open(template).convert('L'), dpis,
                     cache=cache, start=start)
        if not hit or hit[0] < 0.75:
            continue
        located.append((key, hit[1], hit[3]))
        start = hit[1]
    for i in range(len(located) - 1):
        out[located[i][0]] = (located[i + 1][1], located[i + 1][2])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--limit', type=int, default=0,
                    help='stop after this many (0 = all)')
    ap.add_argument('--subject', help='only this subject')
    a = ap.parse_args()

    todo = json.load(open(os.path.join(STORE, '_todo.json'), encoding='utf-8'))
    hand = json.load(open(os.path.join(STORE, '_clipped_scan.json'), encoding='utf-8'))
    rows = index_rows()

    # Group by PDF so each booklet is opened and rendered once.
    jobs = {}
    for q in todo:
        if q.get('book'):
            continue                      # chapterwise crops use uncrop_top.py
        if a.subject and q['subject'] != a.subject:
            continue
        key = '|'.join(str(x) for x in (
            'kcet', q['subject'], q.get('year') or 0, q['number'], '', 0, 0))
        if key in hand:
            continue                      # measured by hand already
        entry = rows.get(key)
        if not entry:
            continue
        row, assets, papers, dpis = entry
        pdf = find_pdf(papers, row['source'])
        if not pdf:
            continue
        jobs.setdefault(pdf, []).append((key, row, assets, dpis))

    # every question of each paper, in number order, for the neighbour scan
    row_index = {}
    for key, (row, assets, papers, dpis) in rows.items():
        pdf = find_pdf(papers, row['source'])
        if pdf:
            row_index.setdefault(pdf, []).append((key, row, assets))
    for v in row_index.values():
        v.sort(key=lambda t: t[1]['number'])

    total = sum(len(v) for v in jobs.values())
    print('%d crop(s) to pad across %d paper(s)' % (total, len(jobs)))
    if a.check:
        for pdf, items in sorted(jobs.items()):
            print('  %-60s %4d' % (os.path.basename(pdf), len(items)))
        return 0

    done = failed = 0
    for pdf, items in sorted(jobs.items()):
        doc = pymupdf.open(pdf)
        cache = {}
        start = 0
        # Page order follows question order, so sorting lets the search
        # resume from the previous hit instead of restarting each time.
        items.sort(key=lambda t: t[1]['number'])
        # Where the band immediately after this one sits, so the bottom can
        # be extended to just above it rather than by a guess.  Built from
        # every question of the paper, not only the unsolved ones, since the
        # neighbour may already have a solution.
        after = neighbours(doc, rows, row_index.get(pdf, []), dpis, cache)
        for key, row, assets, dpis in items:
            if a.limit and done >= a.limit:
                break
            src = row['stemImages'][0]['src']
            path = os.path.join(assets, os.path.splitext(src)[0] + '.png')
            if not os.path.exists(path):
                continue
            template = path + '.orig' if os.path.exists(path + '.orig') else path
            crop = Image.open(template).convert('L')
            hit = locate(doc, crop, dpis, cache=cache, start=start)
            if not hit or hit[0] < 0.75:
                failed += 1
                continue
            score, pi, x, y, dpi = hit
            start = pi
            m = scaled(MARGIN_300, dpi)
            gap = scaled(dict(g=GAP_300), dpi)['g']
            cap = scaled(dict(g=MAX_BOTTOM_300), dpi)['g']
            bottom = m['bottom']
            nxt = after.get(key)
            if nxt and nxt[0] == pi and nxt[1] > y + crop.height:
                # the next question is below this one on the same page
                bottom = min(cap, nxt[1] - gap - (y + crop.height))
                bottom = max(bottom, 0)
            page = page_gray(doc[pi], dpi)
            out = page.crop((
                max(0, x - m['left']),
                max(0, y - m['top']),
                min(page.width, x + crop.width),
                min(page.height, y + crop.height + bottom)))
            if template == path:
                shutil.copyfile(path, path + '.orig')
            out.save(path)
            done += 1
            if done % 25 == 0:
                print('  %d padded, %d not located' % (done, failed), flush=True)
        doc.close()
        if a.limit and done >= a.limit:
            break
    print('%d crop(s) padded, %d could not be located' % (done, failed))
    return 0


if __name__ == '__main__':
    sys.exit(main())
