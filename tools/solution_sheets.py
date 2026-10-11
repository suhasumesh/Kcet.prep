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
    """
    Every question already dealt with: one that has a solution, and one that
    never can have.

    _broken.json and _suspect.json are counted here too. A crop whose options
    are cut off cannot be answered, and a question whose key is wrong should
    not be, so leaving them in the queue only means they reappear at the top
    of every sheet and crowd out work that can actually be done.
    """
    out = {}
    if os.path.isdir(STORE):
        for f in sorted(os.listdir(STORE)):
            if not f.endswith('.json'):
                continue
            if f.startswith('_') and f not in ('_broken.json', '_suspect.json'):
                continue
            with open(os.path.join(STORE, f), encoding='utf-8') as fh:
                out.update(json.load(fh))
    return out


def load_todo(inventory):
    with open(inventory, encoding='utf-8') as f:
        rows = json.load(f)
    have = written()
    return [q for q in rows if key_of(q) not in have]


def stack(stem, options):
    """
    The stem with its option images beneath it, as one picture.

    The scanned papers store each option as a separate crop, so a sheet built
    from the stem alone shows a question with no answers to choose from -- and
    reads as a truncated crop when it is nothing of the kind.
    """
    parts = [Image.open(stem).convert('RGB')]
    for p in options:
        if os.path.exists(p):
            parts.append(Image.open(p).convert('RGB'))
    if len(parts) == 1:
        return parts[0]
    w = max(p.width for p in parts)
    out = Image.new('RGB', (w, sum(p.height for p in parts) + 4 * (len(parts) - 1)), 'white')
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height + 4
    return out


def build(rows, out_path, size, budget=2300):
    """
    One labelled sheet. Returns the keys it shows, in order.

    Packed to a height budget rather than a fixed count: a question with four
    one-line options takes a fifth of the space of one with a reaction scheme,
    and a fixed count either wastes half the sheet or produces one too tall to
    stay legible once it is scaled to fit.
    """
    tiles, keys, used = [], [], 0
    for q in rows[:size]:
        src = q['src']
        path = os.path.join(ASSETS, src)
        if not os.path.exists(path):
            continue
        im = stack(path, [os.path.join(ASSETS, o) for o in q.get('opts', [])])
        if im.width > SHEET_W - 2 * PAD:
            w = SHEET_W - 2 * PAD
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        # The whole crop goes on the sheet, however tall. Cropping the tile to
        # keep sheets short hid the bottom of every long band -- and the bottom
        # is where a second question starts when the band split went wrong, so
        # the defect I most need to see was the one systematically cut off.
        # A tall question simply gets a sheet of its own.
        if tiles and used + im.height > budget:
            break
        used += im.height + 44
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
    ap.add_argument('--size', type=int, default=16)
    ap.add_argument('--budget', type=int, default=2300)
    ap.add_argument('--sheets', type=int, default=1)
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

    # Sheets are cut one after another out of the same list, because a sheet
    # packed by height holds a variable number: fixed offsets would skip
    # whatever did not fit on the sheet before.
    rows, out = todo, []
    for i in range(a.sheets):
        path = os.path.join(STORE, '_s%d.png' % i)
        keys = build(rows, path, a.size, a.budget)
        if not keys:
            break
        rows = rows[len(keys):]
        out.append(dict(sheet=path, n=len(keys), keys=keys))
    print(json.dumps(out, indent=0))
    return 0


if __name__ == '__main__':
    sys.exit(main())
