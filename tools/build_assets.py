"""
Turn the extracted PNG crops into the web assets the app serves.

Crops come out of PyMuPDF as full-colour PNGs with a lot of white. They are
converted to greyscale WebP, which takes the corpus from hundreds of megabytes
to something a free host will serve happily, with no visible loss: the pages
are black ink on white paper, so the colour channels carry nothing but scanner
noise, and throwing them away costs a student nothing.

What gets built is decided by the extraction manifests, never by what happens
to be lying in the crop directories. An extractor re-run under tighter rules
produces fewer questions, and the crops it used to emit stay on disk -- 2,030
of them, 75 MB of WebP, were being deployed for questions the app had already
stopped shipping. A manifest says exactly which images the bank refers to.

    python tools/build_assets.py [--purge]

--purge also deletes the orphaned PNGs, which is the bulk of the disk.
"""
import os
import sys
import json
import glob
import argparse
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# every crop root feeding the app; all land in the same public namespace
SRC_ROOTS = [
    os.path.join(ROOT, 'data', 'extracted'),
    os.path.join(ROOT, 'data', 'extracted-kea'),
    os.path.join(ROOT, 'data', 'pradeep'),
    os.path.join(ROOT, 'data', 'chapterwise'),
]
DST = os.path.join(ROOT, 'public', 'questions')

QUALITY = 75
MAX_W = 1000   # crops render at 200dpi; on screen they are never wider than this


def referenced(folder):
    """Every image path the manifests in `folder` point at."""
    out = set()
    for path in glob.glob(os.path.join(folder, '*.json')):
        if os.path.basename(path).startswith('_'):
            continue
        with open(path, encoding='utf-8') as f:
            rows = json.load(f)
        for q in rows if isinstance(rows, list) else []:
            images = list(q.get('stemImages') or [])
            images += list(q.get('solutionImages') or [])
            if q.get('image'):
                images.append(q['image'])
            for o in q.get('options') or []:
                if o.get('img'):
                    images.append(o['img'])
            for im in images:
                if im and im.get('src'):
                    out.add(im['src'].replace('\\', '/'))
    return out


def convert(job):
    png, out, rebuild = job
    if not rebuild and os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(png):
        return os.path.getsize(png), os.path.getsize(out)
    im = Image.open(png)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.convert('L').save(out, 'WEBP', quality=QUALITY, method=5)
    return os.path.getsize(png), os.path.getsize(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--purge', action='store_true',
                    help='also delete PNG crops no manifest refers to')
    ap.add_argument('--rebuild', action='store_true',
                    help='re-encode every asset, after changing the settings above')
    a = ap.parse_args()

    jobs, wanted, stale_png = [], set(), []
    for folder in SRC_ROOTS:
        crops = os.path.join(folder, 'crops')
        if not os.path.isdir(crops):
            continue
        refs = referenced(folder)
        for png in glob.glob(os.path.join(crops, '*', '*.png')):
            rel = os.path.relpath(png, crops).replace(os.sep, '/')
            if rel not in refs:
                stale_png.append(png)
                continue
            wanted.add(os.path.splitext(rel)[0])
            jobs.append((png, os.path.join(DST, os.path.splitext(rel)[0] + '.webp'),
                         a.rebuild))

    if not jobs:
        print('no crops found -- run the extractors first')
        return 1
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        results = list(pool.map(convert, jobs))

    removed = 0
    for f in glob.glob(os.path.join(DST, '*', '*.webp')):
        rel = os.path.splitext(os.path.relpath(f, DST))[0].replace(os.sep, '/')
        if rel not in wanted:
            os.remove(f)
            removed += 1
    if removed:
        print('removed %d asset(s) no question refers to' % removed)

    if stale_png:
        mb = sum(os.path.getsize(p) for p in stale_png) / 1e6
        if a.purge:
            for p in stale_png:
                os.remove(p)
            print('purged %d orphaned PNG crop(s), %.0f MB' % (len(stale_png), mb))
        else:
            print('%d orphaned PNG crop(s) left in place, %.0f MB '
                  '(pass --purge to delete)' % (len(stale_png), mb))

    src_mb = sum(r[0] for r in results) / 1e6
    dst_mb = sum(r[1] for r in results) / 1e6
    print('%d crops: %.1f MB PNG -> %.1f MB WebP (%.0f%% smaller)'
          % (len(results), src_mb, dst_mb, 100 * (1 - dst_mb / src_mb)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
