import json, glob, os, re, sys
ROOT='D:/KEA_KCET_TEST_APP'
want=sys.argv[1]; conf=set(sys.argv[2].split(','))
out=[]
for d in ('data/extracted','data/extracted-kea'):
    for p in sorted(glob.glob(os.path.join(ROOT,d,'*.json'))):
        if os.path.basename(p).startswith('_'): continue
        for q in json.load(open(p,encoding='utf-8')):
            if q.get('subject')!=want: continue
            if (q.get('chapterConfidence') or 'none') not in conf: continue
            t=re.sub(r'\s+',' ',(q.get('stemText') or '')).strip()
            op=' | '.join(re.sub(r'\s+',' ',(o.get('text') or '')).strip() for o in q.get('options',[]))
            out.append(f"[{q.get('year')} Q{q.get('number')}] {q.get('chapter')} :: {t[:150]} >>OPT {op[:90]}")
print(len(out),'rows\n')
for r in out: print(r)
