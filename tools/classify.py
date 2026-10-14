"""
Tag every extracted question with a syllabus chapter.

Scoring is keyword based and deterministic (no paid API): each chapter's `strong`
terms are worth 4 and `weak` terms 1, matched on word boundaries against the
stem + option text + solution text. The runner-up margin is kept so low-confidence
tags can be reviewed, and questions that match nothing stay "Unclassified"
rather than being forced into a wrong chapter.
"""
import os
import re
import sys
import json
import glob
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from syllabus import SUBJECTS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'extracted')
# papers extracted from the official KEA booklets live alongside, and need the
# same chapter tagging
DATA_KEA = os.path.join(ROOT, 'data', 'extracted-kea')
PRADEEP = os.path.join(ROOT, 'data', 'pradeep')
# the MTG chapterwise books: already filed by chapter, but under the book's own
# headings, some of which cover two syllabus chapters at once
CHAPTERWISE = os.path.join(ROOT, 'data', 'chapterwise')

# a chapter the book never named, e.g. "Chapter 7"
UNNAMED = re.compile(r'^(chapter\s*\d+|unclassified)$', re.I)

STRONG_W, WEAK_W = 4, 1


def compile_subject(chapters):
    out = []
    for name, puc, strong, weak in chapters:
        pats = []
        for term, w in [(t, STRONG_W) for t in strong] + [(t, WEAK_W) for t in weak]:
            esc = re.escape(term.strip()).replace(r'\ ', r'\s+')
            # \b is useless next to punctuation like "p(a)" or "sp3", so only
            # anchor the edges that are actually word characters
            lead = r'\b' if term[0].isalnum() else ''
            tail = r'\b' if term[-1].isalnum() else ''
            pats.append((re.compile(lead + esc + tail, re.I), w, term))
        out.append((name, puc, pats))
    return out


def haystack(q):
    bits = [q.get('stemText') or '']
    bits += [o.get('text') or '' for o in q.get('options', [])]
    bits.append((q.get('solutionText') or '')[:1200])
    return re.sub(r'\s+', ' ', ' '.join(bits))


def _score_squashed(squashed, compiled):
    """
    Match against space-stripped text, for scans that OCR'd without spaces.

    A squashed keyword can appear inside an unrelated run of letters, so only
    terms of some length are trusted and the weights are halved: this pass is
    meant to place a question that would otherwise go nowhere, not to compete
    with a clean match.
    """
    scored = []
    for name, puc, pats in compiled:
        score, hits = 0, []
        for _rx, w, term in pats:
            key = re.sub(r'\s+', '', term).lower()
            if len(key) < 9:
                continue
            n = squashed.lower().count(key)
            if n:
                score += max(1, w // 2) * min(n, 3)
                hits.append(term)
        if score:
            scored.append((score, name, puc, hits))
    return scored


def _score(text, compiled):
    scored = []
    for name, puc, pats in compiled:
        score, hits = 0, []
        for rx, w, term in pats:
            n = len(rx.findall(text))
            if n:
                score += w * min(n, 3)
                hits.append(term)
        if score:
            scored.append((score, name, puc, hits))
    return scored


def classify(q, compiled):
    text = haystack(q)
    if len(text) < 12:
        return None, 0, 0, []
    scored = _score(text, compiled)
    if not scored:
        # Some scans OCR without spaces at all - "thediameterofsecondwire",
        # "6beats/secondwhensounded". Word boundaries can never fire on that,
        # so fall back to comparing with every space removed on both sides.
        # Only ever used when the ordinary pass found nothing, so it can
        # rescue a question but never outvote a real match.
        squashed = re.sub(r'\s+', '', text)
        if len(squashed) >= 20:
            scored = _score_squashed(squashed, compiled)
    if not scored:
        return None, 0, 0, []
    scored.sort(key=lambda s: -s[0])
    best = scored[0]
    runner = scored[1][0] if len(scored) > 1 else 0
    return best[1], best[0], best[0] - runner, best[3]


def main():
    compiled = {s: compile_subject(c) for s, c in SUBJECTS.items()}
    totals, unclassified, lowconf = Counter(), Counter(), Counter()
    per_chapter = Counter()

    paper_files = (sorted(glob.glob(os.path.join(DATA, '*.json')))
                   + sorted(glob.glob(os.path.join(DATA_KEA, '*.json'))))
    for path in paper_files:
        if os.path.basename(path).startswith('_'):
            continue
        with open(path, encoding='utf-8') as f:
            qs = json.load(f)
        if not qs:
            continue
        subject = qs[0]['subject']
        for q in qs:
            name, score, margin, hits = classify(q, compiled[subject])
            q['chapter'] = name or 'Unclassified'
            q['chapterScore'] = score
            q['chapterMargin'] = margin
            q['chapterHits'] = hits[:6]
            q['chapterConfidence'] = (
                'high' if score >= 8 and margin >= 4 else
                'medium' if score >= 4 else
                'low' if score else 'none')
            totals[subject] += 1
            per_chapter[(subject, q['chapter'])] += 1
            if not name:
                unclassified[subject] += 1
            elif q['chapterConfidence'] in ('low',):
                lowconf[subject] += 1
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(qs, f, ensure_ascii=False, indent=1)

    print('%-13s %6s %8s %8s' % ('SUBJECT', 'TOTAL', 'UNCLASS', 'LOWCONF'))
    for s in sorted(totals):
        print('%-13s %6d %8d %8d' % (s, totals[s], unclassified[s], lowconf[s]))
    print('\nCoverage: %.1f%% classified'
          % (100 * (sum(totals.values()) - sum(unclassified.values())) / max(1, sum(totals.values()))))

    for d in (PRADEEP, CHAPTERWISE):
        name_book_chapters(compiled, d)

    for s in sorted(totals):
        print('\n--- %s ---' % s)
        rows = sorted([(c, n) for (sub, c), n in per_chapter.items() if sub == s],
                      key=lambda r: -r[1])
        for c, n in rows:
            print('  %-48s %4d' % (c, n))


def name_book_chapters(compiled, folder):
    """
    Give a syllabus name to reference-book chapters the running head never
    revealed.

    A chapter is homogeneous, so the whole group votes: every question in it is
    classified and the most common answer names the chapter. One question's
    keywords can mislead; forty of them rarely do. Groups that produce no clear
    winner keep their number rather than being guessed at.
    """
    if not os.path.isdir(folder):
        return
    for path in sorted(glob.glob(os.path.join(folder, '*.json'))):
        with open(path, encoding='utf-8') as f:
            rows = json.load(f)
        if not rows:
            continue
        subject = rows[0]['subject']
        groups = {}
        for q in rows:
            if UNNAMED.match(str(q.get('chapter', ''))):
                groups.setdefault(q['chapter'], []).append(q)

        renamed = {}
        for chapter, qs in groups.items():
            votes = Counter()
            for q in qs:
                name, score, _margin, _hits = classify(
                    {'stemText': q.get('stemText', ''), 'options': [], 'solutionText': ''},
                    compiled[subject])
                if name and score >= 4:
                    votes[name] += 1
            if votes:
                winner, n = votes.most_common(1)[0]
                # a clear plurality, not a single stray match
                if n >= max(3, 0.25 * len(qs)):
                    renamed[chapter] = winner

        if renamed:
            for q in rows:
                if q.get('chapter') in renamed:
                    q['chapter'] = renamed[q['chapter']]
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(rows, f, ensure_ascii=False, indent=1)
            print('%-26s named %s' % (os.path.basename(path),
                                      ', '.join('%s -> %s' % kv for kv in renamed.items())))


if __name__ == '__main__':
    main()
