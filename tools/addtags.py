"""Append hand-read chapter tags to data/chapters_manual.json."""
import json, io, sys, os
P='data/chapters_manual.json'
d=json.load(io.open(P,encoding='utf-8'))
add=json.loads(sys.stdin.read())
clash=[k for k in add if k in d and d[k]!=add[k]]
d.update(add)
io.open(P,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=1)+'\n')
print(f'added {len(add)}, file now holds {len([k for k in d if not k.startswith("_")])}')
if clash: print('CHANGED existing:',clash)
