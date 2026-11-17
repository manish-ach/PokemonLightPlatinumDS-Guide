"""Build src/data/es/official.json: the official Spanish (PokéAPI language 7)
for the types, moves, items, categories and dex entries this guide shows."""
import csv, json, re, sys, os
csv.field_size_limit(10**9)
src, repo = sys.argv[1], sys.argv[2]
EN, ES = '9', '7'
key = lambda s: re.sub(r'[^a-z0-9]', '', s.lower().replace('é', 'e'))
def rows(name):
    with open(os.path.join(src, name + '.csv'), newline='', encoding='utf-8') as f:
        yield from csv.DictReader(f)
def pairs(name, idcol):
    en, es = {}, {}
    for r in rows(name):
        if r['local_language_id'] == EN: en[r[idcol]] = r['name']
        elif r['local_language_id'] == ES: es[r[idcol]] = r['name']
    return en, es
clean = lambda s: re.sub(r'\s+', ' ', s.replace('­', '').replace('\x0c', ' ')).strip()
data = lambda f: json.load(open(os.path.join(repo, 'src/data', f), encoding='utf-8'))

# every string anywhere in the guide's data, to know which names are used
used = set()
def walk(x):
    if isinstance(x, str): used.add(key(x))
    elif isinstance(x, list): [walk(v) for v in x]
    elif isinstance(x, dict): [walk(v) for v in x.values()]
for f in os.listdir(os.path.join(repo, 'src/data')):
    if f.endswith('.json'): walk(data(f))
for extra in open(os.path.join(repo, 'src/lib/data.js'), encoding='utf-8').read().split("'"): used.add(key(extra))
for b in re.findall(r"'([A-Z][a-z]+)'", open(os.path.join(repo, 'src/lib/data.js'), encoding='utf-8').read()): used.add(key(b + ' Berry'))

out = {}
en, es = pairs('type_names', 'type_id')
out['types'] = {en[i].lower(): es[i] for i in en if i in es and en[i].lower() in
    'normal fire water electric grass ice fighting poison ground flying psychic bug rock ghost dragon dark steel fairy'.split()}

en, es = pairs('move_names', 'move_id')
out['moves'] = {key(en[i]): es[i] for i in en if i in es and key(en[i]) in used and en[i] != es[i]}

en, es = pairs('item_names', 'item_id')
keep = {i for i in en if i in es and key(en[i]) in used}
out['items'] = {key(en[i]): es[i] for i in sorted(keep, key=int) if en[i] != es[i]}
flav = {}
for r in rows('item_flavor_text'):
    if r['language_id'] == ES and r['item_id'] in keep:
        cur = flav.get(r['item_id'])
        if cur is None or int(r['version_group_id']) >= cur[0]: flav[r['item_id']] = (int(r['version_group_id']), clean(r['flavor_text']))
out['itemFlavor'] = {key(en[i]): flav[i][1] for i in sorted(flav, key=int)}

nats = set()
for f in ('species.json', 'nondex.json'):
    for sp in data(f): nats.add(str(sp['nat']))
for a in data('alolan.json'):
    for k in ('baseNat',):
        if a.get(k): nats.add(str(a[k]))
sen, ses, genus = {}, {}, {}
for r in rows('pokemon_species_names'):
    i = r['pokemon_species_id']
    if r['local_language_id'] == EN: sen[i] = r['name']
    elif r['local_language_id'] == ES: ses[i] = r['name']; genus[i] = r['genus']
out['species'] = {sen[i]: ses[i] for i in nats if i in sen and i in ses and sen[i] != ses[i]}
out['genus'] = {i: genus[i] for i in sorted(nats, key=int) if genus.get(i)}
entry = {}
for r in rows('pokemon_species_flavor_text'):
    i = r['species_id']
    if r['language_id'] == ES and i in nats:
        v = int(r['version_id'])
        if i not in entry or v < entry[i][0]: entry[i] = (v, clean(r['flavor_text']))
out['entry'] = {i: entry[i][1] for i in sorted(entry, key=int)}

json.dump(out, open(os.path.join(repo, 'src/data/es/official.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print({k: len(v) for k, v in out.items()}, 'nats', len(nats))
print('species that differ:', out['species'])
print('no genus:', [i for i in nats if i not in genus][:10], 'no entry:', len([i for i in nats if i not in entry]))
print(list(out['moves'].items())[:5], list(out['items'].items())[:5]); print(out['entry'].get('4'), '|', out['genus'].get('4'), '|', out['itemFlavor'].get('potion'))
