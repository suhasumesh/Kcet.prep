"""Run the PYQ extractor over every paper that has a usable text layer."""
import os
import re
import sys
import glob
import json
import pymupdf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_pyq import extract  # noqa: E402
from extract_classic import extract as extract_classic  # noqa: E402
from extract_kea import extract as extract_kea  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'KCET Question Papers PY')
# official KEA booklets downloaded alongside the user's own copies
KEA = os.path.join(ROOT, 'data', 'kea-papers', 'tg')
OUT = os.path.join(ROOT, 'data', 'extracted')
KEYS = os.path.join(ROOT, 'data', 'answer-keys')


def load_key(subject, year):
    path = os.path.join(KEYS, '%s-%d.json' % (subject.lower(), year))
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def has_text_layer(path):
    doc = pymupdf.open(path)
    n = sum(len(doc[i].get_text().strip()) for i in range(min(4, len(doc))))
    doc.close()
    return n > 500


def main():
    os.makedirs(OUT, exist_ok=True)
    report, skipped = [], []
    for path in sorted(glob.glob(os.path.join(SRC, '*', '*.pdf'))):
        base = os.path.basename(path)
        m = re.match(r'([A-Za-z]+?)r?r?y?-?(\d{4})\.pdf$', base)
        subject = os.path.basename(os.path.dirname(path))
        year = int(re.search(r'(\d{4})', base).group(1))
        if not has_text_layer(path):
            skipped.append((subject, year, base))
            continue
        try:
            res = extract(path, OUT, subject, year)
            if not res:
                # older "CET - SUBJECT - YEAR" layout, needs the word-level parser
                res = extract_classic(path, OUT, subject, year)
        except Exception as e:  # keep going; report at the end
            skipped.append((subject, year, '%s  ERROR %s' % (base, e)))
            continue
        if not res:
            skipped.append((subject, year, '%s  no questions found' % base))
            continue
        with open(os.path.join(OUT, '%s-%d.json' % (subject.lower(), year)), 'w',
                  encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        report.append(dict(
            subject=subject, year=year, total=len(res),
            four=sum(1 for r in res if len(r['options']) == 4),
            ans=sum(1 for r in res if r['answer']),
            sol=sum(1 for r in res if r['solutionText'] or r['solutionImages']),
        ))

    # Official KEA booklets that still carry a text layer. Their questions are
    # cropped as one band each, with the answer taken from the published key.
    for path in sorted(glob.glob(os.path.join(KEA, '*question-paper.pdf'))):
        base = os.path.basename(path)
        m = re.match(r'kcet-(\d{4})-(physics|chemistry|mathematics)-', base)
        if not m:
            continue
        year, subject = int(m.group(1)), m.group(2).capitalize()
        if not has_text_layer(path):
            continue
        key = load_key(subject, year)
        if not key:
            skipped.append((subject, year, '%s  no answer key' % base))
            continue
        res = [r for r in extract_kea(path, OUT, subject, year, key) if r['answer']]
        if not res:
            continue
        with open(os.path.join(OUT, '%s-%d.json' % (subject.lower(), year)), 'w',
                  encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        report.append(dict(subject=subject, year=year, total=len(res),
                           four=sum(1 for r in res if len(r['options']) == 4),
                           ans=sum(1 for r in res if r['answer']), sol=0))

    report.sort(key=lambda r: (r['subject'], r['year']))
    print('%-12s %-5s %6s %6s %6s %6s' % ('SUBJECT', 'YEAR', 'QS', '4-OPT', 'ANS', 'SOL'))
    for r in report:
        print('%-12s %-5d %6d %6d %6d %6d'
              % (r['subject'], r['year'], r['total'], r['four'], r['ans'], r['sol']))
    print('\nTOTAL questions: %d  with answer: %d  with solution: %d'
          % (sum(r['total'] for r in report), sum(r['ans'] for r in report),
             sum(r['sol'] for r in report)))
    if skipped:
        print('\nNeeds OCR / failed (%d):' % len(skipped))
        for s in skipped:
            print('  %s %s  %s' % s)


if __name__ == '__main__':
    main()
