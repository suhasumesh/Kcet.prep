"""
Re-cut a scanned-paper crop whose first line was clipped off the top.

extract_scanned.py splits a page into question bands at the question number,
so anything reaching above that line -- a matrix's first row, a fraction's
numerator, an exponent -- is sliced away and the question becomes
unanswerable from its crop.

Unlike the chapterwise crops, these bands carry no stored coordinates, and
each is cut to its own content bounding box, so neither the x offset nor the
width is known in advance.  The band is therefore found by matching: the crop
is located on its page by normalised 2-D cross-correlation, then re-cut from
EXTRA pixels higher and written back to the *same* filename, so nothing is
renumbered and no hand-written solution is orphaned.

    python tools/uncrop_scan.py --check     # report, change nothing
    python tools/uncrop_scan.py             # re-cut them

data/solutions/_clipped_scan.json maps a bank key to the margin wanted:
true for the default, a number for that many pixels at the top, or an object
naming any of "top", "bottom", "left" and "right" -- the options are often
cut off the bottom, and an integral sign with its limits off the left.
"""
import os
import sys
import json
import shutil
import argparse

import numpy as np
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, 'data', 'solutions')
# Each paper set has its own crop folder and pile of source PDFs.  A band can
# only be re-cut at the scale its crop was made at, and which extractor --
# and so which dpi -- handled a given paper is not recorded, so each
# candidate dpi is tried and the one that matches wins.
#     (data folder, pdf root, candidate dpis)
SOURCES = [
    (os.path.join(ROOT, 'data', 'extracted-kea'),
     os.path.join(ROOT, 'data', 'kea-papers'), (300, 170)),
    (os.path.join(ROOT, 'data', 'extracted'),
     os.path.join(ROOT, 'KCET Question Papers PY'), (300, 170)),
]

EXTRA = 110              # headroom to restore, about two lines at 300dpi


def index_rows():
    """bank key -> (extracted row, crop dir, pdf root, dpi)."""
    out = {}
    for data, papers, dpis in SOURCES:
        if not os.path.isdir(data):
            continue
        for f in sorted(os.listdir(data)):
            if not f.endswith('.json'):
                continue
            for q in json.load(open(os.path.join(data, f), encoding='utf-8')):
                key = '|'.join(str(x) for x in (
                    'kcet', q['subject'], q.get('year') or 0, q['number'], '', 0, 0))
                out[key] = (q, os.path.join(data, 'crops'), papers, dpis)
    return out


def find_pdf(root, name):
    for base, _, files in os.walk(root):
        if name in files:
            return os.path.join(base, name)
    return None


def page_gray(page, dpi):
    pm = page.get_pixmap(dpi=dpi)
    mode = 'RGB' if pm.n >= 3 else 'L'
    return Image.frombytes(mode, (pm.width, pm.height), pm.samples).convert('L')


def xcorr_valid(P, T):
    """
    Cross-correlation of P with T at every position where T fits inside P.

    Done with numpy's FFT rather than scipy's fftconvolve: the installed
    scipy is built against numpy 1.x and will not import under numpy 2.
    Zero-padding T to P's size makes the circular correlation agree with the
    linear one over exactly the valid window, so no wrap-around leaks in.
    """
    H, W = P.shape
    h, w = T.shape
    F = np.fft.rfft2(P)
    G = np.fft.rfft2(T, s=(H, W))
    C = np.fft.irfft2(F * np.conj(G), s=(H, W))
    return C[:H - h + 1, :W - w + 1]


def match(page, crop, shrink=4):
    """
    (score, x, y) of the crop's best position on the page, in page pixels.

    Normalised cross-correlation, so a band that is mostly white space scores
    on the pattern of its ink rather than on its brightness.  Running it on
    quarter-size images keeps it to a fraction of a second per page, which
    matters because every page of the booklet has to be tried.
    """
    P = np.asarray(page.resize((page.width // shrink, page.height // shrink),
                               Image.BILINEAR), dtype=np.float64)
    T = np.asarray(crop.resize((max(1, crop.width // shrink),
                                max(1, crop.height // shrink)),
                               Image.BILINEAR), dtype=np.float64)
    if T.shape[0] > P.shape[0] or T.shape[1] > P.shape[1]:
        return None
    P, T = 255.0 - P, 255.0 - T          # ink positive
    T = T - T.mean()
    tn = np.linalg.norm(T)
    if not tn:
        return None
    h, w = T.shape
    ones = np.ones((h, w))
    num = xcorr_valid(P, T)
    s1 = xcorr_valid(P, ones)
    s2 = xcorr_valid(P * P, ones)
    var = np.maximum(s2 - s1 * s1 / (h * w), 1e-9)
    score = num / (np.sqrt(var) * tn)
    y, x = np.unravel_index(int(np.argmax(score)), score.shape)
    return float(score[y, x]), x * shrink, y * shrink


def locate(doc, crop, dpis, cache=None, start=0, good=0.93):
    """
    (score, page index, x, y, dpi) of the band, or None.

    Searches from page `start` and stops as soon as a page scores above
    `good`.  A paper's questions run in page order, so resuming where the
    last one was found turns a scan of the whole booklet into a scan of one
    or two pages -- the difference between minutes and seconds per crop when
    a thousand are being padded in one pass.
    """
    best = None
    for dpi in dpis:
        order = list(range(start, len(doc))) + list(range(0, start))
        for i in order:
            key = (id(doc), i, dpi)
            if cache is None:
                img = page_gray(doc[i], dpi)
            else:
                if key not in cache:
                    cache[key] = page_gray(doc[i], dpi)
                img = cache[key]
            hit = match(img, crop)
            if hit and (best is None or hit[0] > best[0]):
                best = (hit[0], i, hit[1], hit[2], dpi)
                if hit[0] >= good:
                    return best
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--extra', type=int, default=EXTRA)
    ap.add_argument('--only', nargs='*', metavar='KEY',
                    help='re-cut only these bank keys (or any key containing one '
                         'of these strings). The list in _clipped_scan.json grows '
                         'with every repair, and re-cutting all of it costs a '
                         'template match per page per entry -- minutes, for work '
                         'already done.')
    a = ap.parse_args()

    listed = json.load(open(os.path.join(STORE, '_clipped_scan.json'), encoding='utf-8'))
    rows = index_rows()
    docs = {}
    done = 0
    if a.only:
        listed = {k: v for k, v in listed.items()
                  if any(sub in k for sub in a.only)}
        if not listed:
            print('no listed crop matches %s' % ' '.join(a.only))
            return 1
    for key, want in sorted(listed.items()):
        entry = rows.get(key)
        if not entry:
            print('no such question: %s' % key)
            continue
        q, assets, papers, dpis = entry
        src = q['stemImages'][0]['src']
        pdf = find_pdf(papers, q['source'])
        if not pdf:
            print('no pdf for %s (%s)' % (key, q['source']))
            continue
        if pdf not in docs:
            docs[pdf] = pymupdf.open(pdf)
        path = os.path.join(assets, os.path.splitext(src)[0] + '.png')
        if not os.path.exists(path):
            print('no crop at %s' % path)
            continue
        # Match against the backup once one exists, so re-running the tool
        # re-cuts the same band rather than adding headroom to headroom.
        template = path + '.orig' if os.path.exists(path + '.orig') else path
        crop = Image.open(template).convert('L')
        hit = locate(docs[pdf], crop, dpis)
        if not hit or hit[0] < 0.6:
            print('band not found for %s (best %.2f)' % (key, hit[0] if hit else 0))
            continue
        score, pi, x, y, dpi = hit
        if want is True:
            m = dict(top=a.extra)
        elif isinstance(want, dict):
            m = want
        else:
            m = dict(top=int(want))
        page = page_gray(docs[pdf][pi], dpi)
        top = max(0, y - int(m.get('top', 0)))
        bot = min(page.height, y + crop.height + int(m.get('bottom', 0)))
        lef = max(0, x - int(m.get('left', 0)))
        rig = min(page.width, x + crop.width + int(m.get('right', 0)))
        print('%s  page %d  x %d..%d -> %d..%d  y %d..%d -> %d..%d  (match %.3f)'
              % (key, pi + 1, x, x + crop.width, lef, rig,
                 y, y + crop.height, top, bot, score))
        if a.check:
            continue
        out = page.crop((lef, top, rig, bot))
        if template == path:
            shutil.copyfile(path, path + '.orig')
        out.save(path)
        done += 1
    print('%d crop(s) re-cut' % done)
    return 0


if __name__ == '__main__':
    sys.exit(main())
