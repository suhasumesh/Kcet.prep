"""
Check the extracted question bank before it is shipped.

Run after extraction and asset building, and before seeding. Every problem it
reports is something a student would otherwise hit mid-test: a question with
no answer to mark it against, a chapter the syllabus has never heard of, an
image the asset build did not produce.

All four sources are checked, not just the papers -- a broken reference-book
question costs a student exactly as much as a broken exam one.
"""
import os
import sys
import json
import glob
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syllabus import SUBJECTS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'public', 'questions')
SOURCES = [
    ('papers', os.path.join(ROOT, 'data', 'extracted')),
    ('papers', os.path.join(ROOT, 'data', 'extracted-kea')),
    ('book', os.path.join(ROOT, 'data', 'pradeep')),
    ('book', os.path.join(ROOT, 'data', 'chapterwise')),
]

VALID_CHAPTERS = {s: {c[0] for c in ch} | {'Unclassified'} for s, ch in SUBJECTS.items()}


def images_of(q):
    out = list(q.get('stemImages') or []) + list(q.get('solutionImages') or [])
    if q.get('image'):
        out.append(q['image'])
    out += [o.get('img') for o in (q.get('options') or []) if o.get('img')]
    return [i for i in out if i]


def check_file(kind, path, problems, counts, seen, missing):
    name = os.path.basename(path)
    # The same paper can be extracted twice, from the user's copy and from the
    # official booklet, and both land under the same file name. That is not a
    # duplicate question -- the seeder ships whichever recovered more of it --
    # so identity is scoped to the directory it came from.
    folder = os.path.basename(os.path.dirname(path))
    with open(path, encoding='utf-8') as f:
        rows = json.load(f)
    for q in rows:
        where = '%s Q%s' % (name, q.get('number'))
        counts['total'] += 1

        # Identity differs by source: a paper question is the Nth of a year,
        # a book question is a crop at a place on a page.
        key = ((folder, q.get('subject'), q.get('year'), q.get('number')) if kind == 'papers'
               else (q.get('source'), q.get('page'), q.get('seq'), q.get('number')))
        if key in seen:
            problems.append('%s duplicates %s' % (where, seen[key]))
        seen[key] = where

        if q.get('subject') not in SUBJECTS:
            problems.append('%s has unknown subject %r' % (where, q.get('subject')))
        elif q.get('chapter') not in VALID_CHAPTERS[q['subject']]:
            problems.append('%s has chapter %r, which is not in the syllabus'
                            % (where, q.get('chapter')))

        if q.get('answer') not in ('A', 'B', 'C', 'D'):
            problems.append('%s has no usable answer (%r)' % (where, q.get('answer')))

        if kind == 'papers':
            letters = [o.get('letter') for o in q.get('options', [])]
            if letters != ['A', 'B', 'C', 'D']:
                problems.append('%s has options %s, expected A B C D' % (where, letters))
            if not q.get('stemImages') and not (q.get('stemText') or '').strip():
                problems.append('%s has neither a stem image nor stem text' % where)
        elif not q.get('image'):
            # the crop is the whole question; without it there is nothing to show
            problems.append('%s has no crop' % where)

        for img in images_of(q):
            webp = os.path.join(ASSETS, img['src'].replace('.png', '.webp'))
            if not os.path.exists(webp):
                missing.append(where + ' -> ' + img['src'])

        if q.get('solutionText') or q.get('solutionImages'):
            counts['with_solution'] += 1
        if q.get('chapter') not in (None, 'Unclassified'):
            counts['classified'] += 1


def main():
    problems, missing = [], []
    counts, seen = Counter(), {}

    for kind, folder in SOURCES:
        if not os.path.isdir(folder):
            continue
        for path in sorted(glob.glob(os.path.join(folder, '*.json'))):
            if os.path.basename(path).startswith('_'):
                continue
            check_file(kind, path, problems, counts, seen, missing)

    print('%-22s %d' % ('questions', counts['total']))
    print('%-22s %d (%.0f%%)' % ('with a worked solution', counts['with_solution'],
                                 100 * counts['with_solution'] / max(1, counts['total'])))
    print('%-22s %d (%.0f%%)' % ('tagged to a chapter', counts['classified'],
                                 100 * counts['classified'] / max(1, counts['total'])))

    if missing:
        problems += ['missing asset: %s' % m for m in missing[:10]]
        if len(missing) > 10:
            print('\n%d referenced assets are missing -- run tools/build_assets.py'
                  % len(missing))

    if problems:
        print('\n%d problem(s):' % len(problems))
        for p in problems[:40]:
            print('  - %s' % p)
        if len(problems) > 40:
            print('  ... and %d more' % (len(problems) - 40))
        return 1

    print('\nNo problems found.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
