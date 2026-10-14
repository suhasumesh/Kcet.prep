import json, glob, os, re, sys
from collections import Counter
ROOT='D:/KEA_KCET_TEST_APP'
rows=[]
for d in ('data/extracted','data/extracted-kea'):
    for p in sorted(glob.glob(os.path.join(ROOT,d,'*.json'))):
        if os.path.basename(p).startswith('_'): continue
        qs=json.load(open(p,encoding='utf-8'))
        for q in qs:
            rows.append((q.get('subject'),q.get('year'),q.get('number'),q.get('chapter'),
                         q.get('chapterConfidence'),(q.get('stemText') or '').strip()))
c=Counter((r[0],r[4]) for r in rows)
print('TOTAL rows', len(rows))
for k in sorted(c, key=lambda t:(str(t[0]),str(t[1]))): print(' ',k,c[k])
print()
unc=[r for r in rows if r[3]=='Unclassified']
print('Unclassified:',len(unc), Counter(r[0] for r in unc))
# how many have usable text
rich=[r for r in unc if len(r[5])>40]
print('  of which text>40ch:',len(rich))
print('\n--- sample unclassified Physics ---')
for r in [x for x in unc if x[0]=='Physics'][:15]:
    print(f'  {r[1]} Q{r[2]}: {r[5][:110]}')
