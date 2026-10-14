"""
Build contact sheets of the questions no keyword could place, for tagging by
hand.

About a seventh of the bank is printed as an image — an equation, a circuit, a
pair of axes — with almost no text under it. Keyword classification cannot see
those at all, and they are missing from every count in the pattern report. The
only way to file them is to look at them.

    python tools/chapter_sheets.py --subject Mathematics --sheets 3 --size 12
    python tools/chapter_sheets.py --todo

Each tile is captioned with the key to write in `data/chapters_manual.json`,
which `classify.py` applies last, over anything the keywords decided.
"""
import os
import sys
import json
import glob
import argparse
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from solution_sheets import stack, SHEET_W, PAD, ASSETS  # noqa: E402

from PIL import Image, ImageDraw  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'solutions')
MANUAL = os.path.join(ROOT, 'data', 'chapters_manual.json')


def manual():
    if os.path.isfile(MANUAL):
        return {k: v for k, v in json.load(open(MANUAL, encoding='utf-8')).items()
                if not k.startswith('_')}
    return {}


def key_of(q):
    return '%s|%s|%s' % (q.get('subject'), q.get('year'), q.get('number'))


def load():
    """Unclassified questions that came off a whole paper, newest first."""
    done = manual()
    rows = []
    for d in ('data/extracted', 'data/extracted-kea'):
        for p in sorted(glob.glob(os.path.join(ROOT, d, '*.json'))):
            if os.path.basename(p).startswith('_'):
                continue
            for q in json.load(open(p, encoding='utf-8')):
                if (q.get('chapter') or 'Unclassified') != 'Unclassified':
                    continue
                if not (q.get('year') or 0) > 0:
                    continue
                if key_of(q) in done:
                    continue
                if not q.get('stemImages'):
                    continue
                rows.append(q)
    # Only the years we hold in full feed the marks-per-paper figure, so
    # those are worth tagging first: a question filed in a thin year improves
    # the archive but changes nothing a student plans around.
    full = complete_years()
    rows.sort(key=lambda q: (
        0 if (q.get('subject'), q.get('year')) in full else 1,
        -(q.get('year') or 0), q.get('number') or 0))
    return rows


def complete_years():
    """(subject, year) pairs where we hold at least 95% of the 60 questions."""
    seen = Counter()
    for d in ('data/extracted', 'data/extracted-kea'):
        for p in sorted(glob.glob(os.path.join(ROOT, d, '*.json'))):
            if os.path.basename(p).startswith('_'):
                continue
            for q in json.load(open(p, encoding='utf-8')):
                if (q.get('year') or 0) > 0:
                    seen[(q.get('subject'), q.get('year'))] += 1
    return {k for k, n in seen.items() if n >= 57}


def resolve(src):
    """
    The extraction records a crop as .png; the asset build ships .webp. Either
    may be on disk depending on whether assets have been rebuilt since, so try
    both rather than assuming.
    """
    for cand in (src, os.path.splitext(src)[0] + '.webp',
                 os.path.splitext(src)[0] + '.png'):
        p = os.path.join(ASSETS, cand)
        if os.path.exists(p):
            return p
    return None


def build(rows, out_path, size, budget=2300):
    tiles, keys = [], []
    used = 0
    for q in rows[:size]:
        imgs = [i['src'] for i in (q.get('stemImages') or [])]
        opts = [o['img']['src'] for o in (q.get('options') or [])
                if o.get('img') and o['img'].get('src')]
        first = resolve(imgs[0]) if imgs else None
        if not first:
            continue
        rest = [p for p in (resolve(s) for s in imgs[1:] + opts) if p]
        im = stack(first, rest)
        if im.width > SHEET_W - 2 * PAD:
            w = SHEET_W - 2 * PAD
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        if tiles and used + im.height > budget:
            break
        used += im.height + 40
        tiles.append((q, im))
        keys.append(key_of(q))
    if not tiles:
        return []

    head = 30
    total = sum(t[1].height + head + PAD for t in tiles) + PAD
    sheet = Image.new('RGB', (SHEET_W, total), 'white')
    d = ImageDraw.Draw(sheet)
    y = PAD
    for i, (q, im) in enumerate(tiles):
        d.rectangle([0, y - 4, SHEET_W, y + head - 8], fill=(238, 240, 250))
        d.text((PAD, y), '#%d   KEY = %s   (answer %s)'
               % (i + 1, key_of(q), q.get('answer')), fill=(0, 0, 150))
        y += head
        sheet.paste(im, (PAD, y))
        y += im.height + PAD
        d.line([0, y - PAD // 2, SHEET_W, y - PAD // 2], fill=(200, 200, 200), width=2)
    sheet.save(out_path)
    return keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--subject')
    ap.add_argument('--sheets', type=int, default=1)
    ap.add_argument('--size', type=int, default=12)
    ap.add_argument('--budget', type=int, default=2300)
    ap.add_argument('--todo', action='store_true')
    ap.add_argument('--complete-only', action='store_true',
                    help='only years we hold in full, which are the only ones '
                         'that affect the marks-per-paper figure')
    a = ap.parse_args()

    rows = load()
    if a.subject:
        rows = [q for q in rows if q.get('subject') == a.subject]
    if a.complete_only:
        full = complete_years()
        rows = [q for q in rows if (q.get('subject'), q.get('year')) in full]

    if a.todo:
        print('%d unclassified paper question(s) with a crop left to tag'
              % len(rows))
        for (s, y), n in sorted(Counter(
                (q['subject'], q['year']) for q in rows).items()):
            print('  %-12s %s  %3d' % (s, y, n))
        return

    i = 0
    for n in range(a.sheets):
        got = build(rows[i:], os.path.join(OUT, '_c%d.png' % n), a.size, a.budget)
        if not got:
            break
        i += len(got)
        print('_c%d.png  %d question(s)' % (n, len(got)))
    print('%d remaining after these sheets' % (len(rows) - i))


if __name__ == '__main__':
    main()
