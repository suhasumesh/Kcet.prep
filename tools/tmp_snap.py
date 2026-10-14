import json, glob, os
ROOT='D:/KEA_KCET_TEST_APP'
snap={}
for d in ('data/extracted','data/extracted-kea'):
    for p in sorted(glob.glob(os.path.join(ROOT,d,'*.json'))):
        if os.path.basename(p).startswith('_'): continue
        for q in json.load(open(p,encoding='utf-8')):
            k=f"{q.get('subject')}|{q.get('year')}|{q.get('number')}"
            snap[k]=[q.get('chapter'),q.get('chapterConfidence')]
json.dump(snap,open(os.path.join(ROOT,'tools/_snap_before.json'),'w'),indent=0)
print(len(snap),'rows snapshotted')
