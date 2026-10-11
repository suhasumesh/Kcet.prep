"""Run the OCR extractor over every paper that has no text layer."""
import os
import re
import sys
import glob
import json
import argparse

import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_scanned import extract  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'KCET Question Papers PY')
OUT = os.path.join(ROOT, 'data', 'extracted')
KEYS = os.path.join(ROOT, 'data', 'answer-keys')


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
        raw = json.load(f)
    # accept {"1": "A"} or {"1": 3} (option number)
    out = {}
    for k, v in raw.items():
        if isinstance(v, int):
            v = 'ABCD'[v - 1] if 1 <= v <= 4 else None
        if isinstance(v, str) and v.strip().upper() in ('A', 'B', 'C', 'D'):
            out[str(int(k))] = v.strip().upper()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('papers', nargs='*', metavar='SUBJECT-YEAR',
                    help='only these, e.g. physics-2016; OCR of one paper '
                         'takes minutes, so a fix affecting a few of them '
                         'should not re-read every scan')
    only = {p.lower() for p in ap.parse_args().papers}

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(KEYS, exist_ok=True)
    rows = []
    for path in sorted(glob.glob(os.path.join(SRC, '*', '*.pdf'))):
        if has_text_layer(path):
            continue
        base = os.path.basename(path)
        subject = os.path.basename(os.path.dirname(path))
        year = int(re.search(r'(\d{4})', base).group(1))
        if only and '%s-%d' % (subject.lower(), year) not in only:
            continue
        key = load_key(subject, year)
        print('OCR %s %d ...' % (subject, year), flush=True)
        try:
            res = extract(path, OUT, subject, year, key)
        except Exception as e:
            print('   failed: %s' % e, flush=True)
            continue
        # Without a verified key a question cannot be scored, so it is held back
        scored = [r for r in res if r['answer']]
        target = os.path.join(OUT, '%s-%d.json' % (subject.lower(), year))
        with open(target, 'w', encoding='utf-8') as f:
            json.dump(scored, f, ensure_ascii=False, indent=1)
        rows.append((subject, year, len(res), len(scored), bool(key)))
        print('   %d questions recovered, %d with a key' % (len(res), len(scored)), flush=True)

    print('\n%-13s %-6s %9s %9s %s' % ('SUBJECT', 'YEAR', 'FOUND', 'SCORABLE', 'KEY?'))
    for s, y, f, sc, k in rows:
        print('%-13s %-6d %9d %9d %s' % (s, y, f, sc, 'yes' if k else 'MISSING'))
    print('\nTotal recovered %d, scorable %d'
          % (sum(r[2] for r in rows), sum(r[3] for r in rows)))


if __name__ == '__main__':
    main()
