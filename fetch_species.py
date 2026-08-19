import json, urllib.request, sys
from concurrent.futures import ThreadPoolExecutor
UA={'User-Agent':'Mozilla/5.0 Chrome/120'}
def get(u):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=45) as r:
                return json.load(r)
        except Exception:
            pass
    return None

dex=json.load(open('dex.json'))
def one(e):
    nat=e['nat']
    sp=get(f'https://pokeapi.co/api/v2/pokemon-species/{nat}')
    pk=get(f'https://pokeapi.co/api/v2/pokemon/{nat}')
    out=dict(e)
    if sp:
        ft=[t for t in sp.get('flavor_text_entries',[]) if t['language']['name']=='en']
        pick=lambda v:next((t['flavor_text'] for t in ft if t['version']['name']==v), None)
        txt = pick('heartgold') or pick('soulsilver') or (ft[-1]['flavor_text'] if ft else None)
        out['entry'] = txt.replace('\n',' ').replace('\f',' ').replace('­','') if txt else None
        out['entryFrom'] = 'HeartGold' if pick('heartgold') else ('SoulSilver' if pick('soulsilver') else ('other' if txt else None))
        g=[x['genus'] for x in sp.get('genera',[]) if x['language']['name']=='en']
        out['genus']=g[0] if g else None
    if pk:
        out['height']=pk.get('height'); out['weight']=pk.get('weight')
        out['stats']={s['stat']['name']: s['base_stat'] for s in pk.get('stats',[])}
    return out

with ThreadPoolExecutor(max_workers=16) as ex:
    res=list(ex.map(one, dex))
json.dump(res, open('species.json','w'), ensure_ascii=False)
hg=sum(1 for r in res if r.get('entryFrom')=='HeartGold')
print('written', len(res), '| HeartGold entries:', hg,
      '| SoulSilver fallback:', sum(1 for r in res if r.get('entryFrom')=='SoulSilver'),
      '| other:', sum(1 for r in res if r.get('entryFrom')=='other'),
      '| none:', sum(1 for r in res if not r.get('entryFrom')))
