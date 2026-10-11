"""
Cut a second question off the bottom of a crop.

The band splitter in extract_pradeep.py sometimes runs two questions together,
and the student is then shown one picture with two stems and eight choices but
only one answer to give. Those bands were found by reading them, and are listed
in data/solutions/_merged.json as

    "<bank key>": <the number the second question is printed with>

This trims each crop just above that number and leaves the first question
whole. The source PNG is edited, not the published WebP, so a later
`build_assets.py` run does not undo the repair.

    python tools/trim_merged.py            # trim everything listed
    python tools/trim_merged.py --check    # report, change nothing

The number is given by hand rather than guessed, because the leading digits of
an option -- "(a) 14 sigma, 8 pi" -- look exactly like a question number to a
regular expression, and cutting at one of those would throw away the choices.
"""
import os
import re
import io
import sys
import json
import argparse

import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORE = os.path.join(ROOT, 'data', 'solutions')
CROPS = os.path.join(ROOT, 'data', 'pradeep', 'crops')
PRADEEP = os.path.join(ROOT, 'data', 'pradeep')

_ocr = None


def ocr(img):
    global _ocr
    if _ocr is None:
        _ocr = RapidOCR()
    res, _ = _ocr(np.array(img))
    return res or []


def crop_path(key, index):
    """The source PNG for a bank key, via the extraction that produced it."""
    row = index.get(key)
    if not row:
        return None
    src = row['image']['src']                 # "<label>/<file>.png"
    return os.path.join(CROPS, src.replace('/', os.sep))


def build_index():
    """bank key -> extracted row, for every reference-book question."""
    LABEL = {
        'pradeep-physics-11': 'Pradeep Physics · Class 11',
        'pradeep-physics-12': 'Pradeep Physics · Class 12',
        'pradeep-chemistry-11': 'Pradeep Chemistry · Class 11',
        'pradeep-chemistry-12': 'Pradeep Chemistry · Class 12',
    }
    out = {}
    for f in sorted(os.listdir(PRADEEP)):
        if not f.endswith('.json'):
            continue
        for q in json.load(open(os.path.join(PRADEEP, f), encoding='utf-8')):
            key = '|'.join(str(x) for x in (
                'pradeep', q['subject'], 0, q['number'],
                LABEL.get(q['source'], q['source']), q['page'], q['seq']))
            out[key] = q
    return out


def find_cut(img, marker):
    """
    Top edge of the line that starts the next question, in pixels.

    `marker` is the number the next question is printed with, or -- where the
    strays below are an orphan choice list rather than a numbered question --
    the first few words of the line to cut at, given as a string.

    A number is matched at the start of an OCR line and must sit in the left
    margin: a "34." quoted inside a sentence further right is not where the
    next question begins. Nothing in the top third is believed, because that
    is the first question's own number.
    """
    if isinstance(marker, str) and not marker.isdigit():
        head = re.sub(r'\W+', '', marker).lower()[:18]
        want = re.compile(r'^$')              # replaced by the test below
    else:
        head = None
        want = re.compile(r'^\(?%d\s*[.)]' % int(marker))
    best = None
    for box, text, conf in ocr(img):
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        if head is not None:
            # 'in', not 'startswith': a section banner often has a stray
            # character or two in front of it once the scan has been cropped
            # ("h One or More than One Correct Answers)").
            if head not in re.sub(r'\W+', '', text).lower():
                continue
        elif not want.match(text.strip()):
            continue
        if min(xs) > img.width * 0.30:        # not in the left margin
            continue
        if min(ys) < img.height * 0.12:       # the first question's own number
            continue
        if best is None or min(ys) < best:
            best = min(ys)
    return None if best is None else int(best)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    listed = json.load(open(os.path.join(STORE, '_merged.json'), encoding='utf-8'))
    index = build_index()
    done, missed = [], []
    for key, number in listed.items():
        if key.startswith('_'):
            continue
        path = crop_path(key, index)
        if not path or not os.path.exists(path):
            missed.append((key, 'no crop on disk'))
            continue
        if os.path.exists(path + '.orig'):
            # already cut on an earlier run; the marker is gone, so looking
            # for it again would only report a failure that is not one
            done.append(key)
            continue
        img = Image.open(path).convert('RGB')
        y = find_cut(img, number)
        if y is None:
            missed.append((key, 'marker %r not found below the first question' % (number,)))
            continue
        # a few pixels of air above the number, and never cut so high that
        # the first question could not fit in what is left
        y = max(0, y - 6)
        # Only an absolute floor: where the first question is four short
        # choices and the second carries a structure, a legitimate cut really
        # does fall in the top third of the band.
        if y < 80:
            missed.append((key, 'cut at %dpx would leave too little' % y))
            continue
        print('%-72s %4d -> %4d px' % (os.path.basename(path), img.height, y))
        if not a.check:
            # Keep the untrimmed scan. A cut in the wrong place destroys the
            # question, and the only other way back is a full re-extraction.
            backup = path + '.orig'
            if not os.path.exists(backup):
                os.replace(path, backup)
            Image.open(backup).convert('RGB').crop((0, 0, img.width, y)).save(path)
        done.append(key)

    print('\ntrimmed %d, could not trim %d' % (len(done), len(missed)))
    for key, why in missed:
        print('  %s\n    %s' % (key, why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
