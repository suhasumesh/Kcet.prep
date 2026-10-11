"""Run the Pradeep extractor over every reference volume in Ref_Books/."""
import os
import re
import sys
import glob
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_pradeep import extract  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'Ref_Books')
OUT = os.path.join(ROOT, 'data', 'pradeep')


def describe(filename):
    """Subject and a stable slug from the volume's filename."""
    name = os.path.basename(filename)
    subject = ('Physics' if re.search(r'physics', name, re.I)
               else 'Chemistry' if re.search(r'chemis', name, re.I)
               else 'Mathematics' if re.search(r'math', name, re.I)
               else None)
    cls = re.search(r'Class\s*(11|12)', name, re.I)
    if not subject or not cls:
        return None, None
    return subject, 'pradeep-%s-%s' % (subject.lower(), cls.group(1))


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for path in sorted(glob.glob(os.path.join(SRC, '*.pdf'))):
        subject, label = describe(path)
        if not subject:
            print('skipping %s -- cannot tell which subject and class it is'
                  % os.path.basename(path))
            continue
        print('reading %s ...' % os.path.basename(path), flush=True)
        try:
            res = extract(path, OUT, subject, label)
        except Exception as e:
            print('   failed: %s' % e, flush=True)
            continue
        with open(os.path.join(OUT, '%s.json' % label), 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        chapters = {r['chapter'] for r in res}
        rows.append((label, len(res), len(chapters)))
        print('   %d questions across %d chapters' % (len(res), len(chapters)), flush=True)

    print('\n%-26s %9s %9s' % ('VOLUME', 'QUESTIONS', 'CHAPTERS'))
    for label, n, c in rows:
        print('%-26s %9d %9d' % (label, n, c))
    print('\nTotal %d questions' % sum(r[1] for r in rows))


if __name__ == '__main__':
    main()
