"""
Build contact sheets of the questions that still have no worked solution.

Writing a solution means reading the question, and for the scanned papers the
only trustworthy copy of the question is the crop: their OCR text interleaves
lines across question boundaries, so a solution written from the text would
attach correct working to the wrong problem.

So the questions are laid out a few to a sheet, each captioned with the key
that identifies it and the answer already verified for it, and the solutions
are written against the sheet.

    python tools/solution_sheets.py --batch 0 --size 6
    python tools/solution_sheets.py --todo            # what is left, by source
"""
import os
import re
import sys
import json
import argparse
import textwrap

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'public', 'questions')
STORE = os.path.join(ROOT, 'data', 'solutions')
SHEET_W = 980
PAD = 10


def key_of(q):
    return '|'.join(str(x) for x in (
        q.get('bank') or 'kcet', q['subject'], q.get('year') or 0, q['number'],
        q.get('book') or '', q.get('page') or 0, q.get('seq') or 0))


def written():
    """Every question a solution has already been written for."""
    out = {}
    if os.path.isdir(STORE):
        for f in sorted(os.listdir(STORE)):
            if f.endswith('.json') and not f.startswith('_'):
                with open(os.path.join(STORE, f), encoding='utf-8') as fh:
                    out.update(json.load(fh))
    return out


def load_todo(inventory):
    with open(inventory, encoding='utf-8') as f:
        rows = json.load(f)
    have = written()
    return [q for q in rows if key_of(q) not in have]


def build(rows, out_path, size):
    """One labelled sheet. Returns the keys it shows, in order."""
    tiles, keys = [], []
    for q in rows[:size]:
        src = q['src']
        path = os.path.join(ASSETS, src)
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGB')
        if im.width > SHEET_W - 2 * PAD:
            w = SHEET_W - 2 * PAD
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        # A tall scan is usually mostly margin; cap it so a sheet stays legible.
        if im.height > 560:
            im = im.crop((0, 0, im.width, 560))
        tiles.append((q, im))
        keys.append(key_of(q))

    if not tiles:
        return []
    head = 34
    total = sum(t[1].height + head + PAD for t in tiles) + PAD
    sheet = Image.new('RGB', (SHEET_W, total), 'white')
    d = ImageDraw.Draw(sheet)
    y = PAD
    for i, (q, im) in enumerate(tiles):
        d.rectangle([0, y - 4, SHEET_W, y + head - 8], fill=(242, 238, 232))
        d.text((PAD, y), '#%d  %s  %s  ch=%s  >>> CORRECT OPTION = %s <<<'
               % (i + 1, q['subject'], q.get('label', ''), (q.get('chapter') or '')[:30],
                  q['answer']), fill=(170, 0, 0))
        y += head
        sheet.paste(im, (PAD, y))
        y += im.height + PAD
        d.line([0, y - PAD // 2, SHEET_W, y - PAD // 2], fill=(200, 200, 200), width=2)
    sheet.save(out_path)
    return keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--inventory', default=os.path.join(STORE, '_todo.json'))
    ap.add_argument('--batch', type=int, default=0)
    ap.add_argument('--size', type=int, default=6)
    ap.add_argument('--out', default=None)
    ap.add_argument('--todo', action='store_true')
    a = ap.parse_args()

    todo = load_todo(a.inventory)
    if a.todo:
        import collections
        c = collections.Counter(q.get('label', '?').split(' Q')[0] for q in todo)
        print('%d question(s) still need a worked solution' % len(todo))
        for k, n in c.most_common(30):
            print('  %-40s %4d' % (k, n))
        return 0

    rows = todo[a.batch * a.size:]
    out = a.out or os.path.join(STORE, '_sheet.png')
    keys = build(rows, out, a.size)
    print(json.dumps(keys, indent=0))
    print(out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
