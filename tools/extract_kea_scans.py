"""
OCR the official KEA booklets that have no text layer, and pair each with the
published answer key for the same booklet version.

The downloaded papers are all VERSION CODE A-1, and the keys are read from the
A1 column, so question and answer line up. That pairing is the whole point:
applying a key from another version would quietly teach students the wrong
answer for every question.

Output goes to data/extracted-kea/ with its own crop namespace, so it never
overwrites a paper extracted from the user's own copies. The seeder decides
which source to ship when both have the same subject and year.
"""
import os
import re
import sys
import glob
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pymupdf  # noqa: E402
from extract_scanned import extract as extract_scanned  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPERS = os.path.join(ROOT, 'data', 'kea-papers', 'tg')
KEYS = os.path.join(ROOT, 'data', 'answer-keys-kea')
OUT = os.path.join(ROOT, 'data', 'extracted-kea')

NAME = re.compile(r'kcet-(\d{4})-(physics|chemistry|mathematics)-question-paper\.pdf$', re.I)


def has_text_layer(path):
    doc = pymupdf.open(path)
    n = sum(len(doc[i].get_text().strip()) for i in range(min(4, len(doc))))
    doc.close()
    return n > 500


def load_key(subject, year):
    path = os.path.join(KEYS, '%s-%d.json' % (subject.lower(), year))
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('papers', nargs='*', metavar='SUBJECT-YEAR',
                    help='only these, e.g. physics-2015 mathematics-2013; '
                         'OCR of one paper takes minutes, so a fix that '
                         'affects a few of them should not re-read all 33')
    only = {p.lower() for p in ap.parse_args().papers}

    os.makedirs(OUT, exist_ok=True)
    rows, skipped = [], []

    for path in sorted(glob.glob(os.path.join(PAPERS, '*question-paper.pdf'))):
        m = NAME.search(os.path.basename(path))
        if not m:
            continue
        year, subject = int(m.group(1)), m.group(2).capitalize()
        if only and '%s-%d' % (subject.lower(), year) not in only:
            continue
        if has_text_layer(path):
            continue                      # handled by extract_kea.py instead

        key = load_key(subject, year)
        if not key:
            skipped.append((subject, year, 'no A1 answer key'))
            continue

        # The crops are written under their own slug from the start, so they
        # cannot collide with a paper of the same year extracted from the
        # user's own copies. Renaming the folder afterwards, as this used to
        # do, fails on Windows the moment anything has a handle open in it.
        slug = '%s-%d-kea' % (subject.lower(), year)
        print('OCR %s %d ...' % (subject, year), flush=True)
        try:
            res = extract_scanned(path, OUT, subject, year, key, slug=slug)
        except Exception as e:
            skipped.append((subject, year, 'failed: %s' % e))
            continue

        scored = [r for r in res if r['answer']]
        target = os.path.join(OUT, '%s-%d.json' % (subject.lower(), year))
        with open(target, 'w', encoding='utf-8') as f:
            json.dump(scored, f, ensure_ascii=False, indent=1)
        rows.append((subject, year, len(res), len(scored)))
        print('   %d recovered, %d with a key' % (len(res), len(scored)), flush=True)

    print('\n%-12s %-6s %9s %9s' % ('SUBJECT', 'YEAR', 'FOUND', 'SCORABLE'))
    for s, y, f, sc in rows:
        print('%-12s %-6d %9d %9d' % (s, y, f, sc))
    print('\nTotal recovered %d, scorable %d'
          % (sum(r[2] for r in rows), sum(r[3] for r in rows)))
    if skipped:
        print('\nSkipped (%d):' % len(skipped))
        for s in skipped:
            print('  %s %s  %s' % s)


if __name__ == '__main__':
    main()
