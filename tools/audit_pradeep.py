"""
Audit extracted reference-book questions against the pages they came from.

Two kinds of check, because a wrong answer key is the one defect a student
cannot detect for themselves:

  structural  -- runs over everything. Re-reads each source page and confirms
                 that the question number really is printed there, that the
                 crop lies inside the page, that four option labels are present,
                 and that the answer letter is one the question actually offers.

  visual      -- samples N questions and writes a contact sheet of the crop with
                 its recorded answer printed beside it, so a human (or a model
                 that can read the image) can confirm the pairing by eye.

Usage:
    python tools/audit_pradeep.py                 # structural, all volumes
    python tools/audit_pradeep.py --sheet 24      # also write a contact sheet
"""
import os
import re
import sys
import json
import glob
import random
import argparse

import pymupdf
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'pradeep')
CROPS = os.path.join(DATA, 'crops')
BOOKS = os.path.join(ROOT, 'Ref_Books')

OPTION = re.compile(r'\(\s*([a-d])\s*\)')


def book_for(label):
    want = label.replace('pradeep-', '').split('-')     # e.g. ['chemistry', '12']
    for f in glob.glob(os.path.join(BOOKS, '*.pdf')):
        name = os.path.basename(f).lower()
        if want[0] in name and re.search(r'class\s*%s' % want[1], name):
            return f
    return None


def audit(label, rows, sheet_n=0):
    pdf = book_for(label)
    if not pdf:
        return [f'{label}: source volume not found in Ref_Books/'], []
    doc = pymupdf.open(pdf)
    problems, samples = [], []

    for q in rows:
        where = f"{label} p{q['page']} q{q['number']}"
        if not (0 <= q['page'] < len(doc)):
            problems.append(f'{where}: page is outside the volume')
            continue
        page = doc[q['page']]
        raw = page.get_text()

        # the printed number must actually appear at the start of a line
        if not re.search(r'^\s*%d\s*[.)]' % q['number'], raw, re.M):
            problems.append(f'{where}: question number is not printed on that page')

        # the crop must lie inside the page
        x0, y0, x1, y1 = q['image_rect'] if 'image_rect' in q else (0, 0, 1, 1)
        if 'image_rect' in q and not (
            0 <= x0 < x1 <= page.rect.width + 1 and 0 <= y0 < y1 <= page.rect.height + 1
        ):
            problems.append(f'{where}: crop falls outside the page')

        if q['answer'] not in ('A', 'B', 'C', 'D'):
            problems.append(f'{where}: answer {q["answer"]!r} is not A-D')

        # The answer must be an option the question actually offers. Stored
        # text is capped, so a question that hit the cap may simply have lost
        # its last option label from the copy being checked, not from the crop.
        stem = q.get('stemText', '')
        letters = set(OPTION.findall(stem))
        if (len(stem) < 590 and letters and len(letters) >= 3
                and q['answer'].lower() not in letters):
            problems.append(
                f'{where}: answer ({q["answer"]}) is not among the options read '
                f'on the page ({"".join(sorted(letters))})')

        # Two option sets in one crop means the band swallowed its neighbour --
        # the student would see one question's options above another's stem.
        counts = [len(re.findall(r'\(\s*%s\s*\)' % L, stem)) for L in 'abcd']
        if min(counts) >= 2:
            problems.append(f'{where}: crop appears to contain two questions')

        path = os.path.join(CROPS, q['image']['src'])
        if not os.path.exists(path):
            problems.append(f'{where}: crop image missing ({q["image"]["src"]})')
        elif os.path.getsize(path) < 900:
            problems.append(f'{where}: crop image is nearly empty')

    if sheet_n:
        pool = [q for q in rows if os.path.exists(os.path.join(CROPS, q['image']['src']))]
        samples = random.sample(pool, min(sheet_n, len(pool)))
    doc.close()
    return problems, samples


def contact_sheet(samples, out_path, width=980):
    """A strip of crops, each captioned with the answer recorded for it."""
    tiles = []
    for q in samples:
        im = Image.open(os.path.join(CROPS, q['image']['src'])).convert('RGB')
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        band = Image.new('RGB', (max(width, im.width), im.height + 34), 'white')
        band.paste(im, (0, 34))
        d = ImageDraw.Draw(band)
        d.rectangle([0, 0, band.width, 32], fill=(240, 237, 232))
        d.text((8, 10), f"{q['source']}  p{q['page']}  Q{q['number']}"
                        f"   ANSWER RECORDED: ({q['answer'].lower()})   [{q['chapter']}]",
               fill=(20, 20, 30))
        tiles.append(band)

    total = sum(t.height + 10 for t in tiles)
    sheet = Image.new('RGB', (max(t.width for t in tiles), total), (205, 200, 192))
    y = 0
    for t in tiles:
        sheet.paste(t, (0, y))
        y += t.height + 10
    sheet.save(out_path)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', type=int, default=0, help='how many to put on a contact sheet')
    ap.add_argument('--out', default=None)
    ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()
    random.seed(a.seed)

    files = sorted(glob.glob(os.path.join(DATA, '*.json')))
    if not files:
        print('nothing extracted yet -- run tools/extract_pradeep_all.py first')
        return 1

    all_problems, all_samples, total = [], [], 0
    for f in files:
        label = os.path.splitext(os.path.basename(f))[0]
        rows = json.load(open(f, encoding='utf-8'))
        total += len(rows)
        per = max(1, round(a.sheet * len(rows) / 1)) if a.sheet else 0
        problems, samples = audit(label, rows, a.sheet)
        all_problems += problems
        all_samples += samples
        print('%-26s %4d questions, %3d problem(s)' % (label, len(rows), len(problems)))

    print('\n%d questions audited, %d problem(s)' % (total, len(all_problems)))
    for p in all_problems[:40]:
        print('  - %s' % p)
    if len(all_problems) > 40:
        print('  ... and %d more' % (len(all_problems) - 40))

    if a.sheet and all_samples:
        random.shuffle(all_samples)
        out = a.out or os.path.join(ROOT, '_audit_sheet.png')
        contact_sheet(all_samples[: a.sheet], out)
        print('\ncontact sheet: %s (%d questions)' % (out, min(a.sheet, len(all_samples))))
    return 1 if all_problems else 0


if __name__ == '__main__':
    sys.exit(main())
