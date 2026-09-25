/* One flat index for the home page's search: everything that has a page or an
   anchor, with the text a player would type. Fetched on first focus, not on
   load, so the home page itself stays small. */
import { ALLSPECIES, ALOLAN, spPath, ITEMS, POCKETS, pocketOf, itemSlug, href,
  ALL_PLACES, placePath, GYMS, slug, MEDALS, QUESTS } from '../lib/data.js';

export function GET() {
  const rows = [];
  for (const p of ALL_PLACES) if (p.built) rows.push({ t: p.name, k: p.kind, u: placePath(p.name) });
  for (const g of GYMS) rows.push({ t: `${g.city} Gym`, k: `${g.leader} · ${g.badge}`, u: href(`gyms/${slug(g.city)}/`) });
  for (const s of ALLSPECIES) rows.push({ t: s.name, k: s.reg ? `Dex ${String(s.reg).padStart(3, '0')}` : 'Not in dex', u: spPath(s) });
  for (const a of ALOLAN) rows.push({ t: a.name, k: `Alolan form · Dex ${String(a.reg).padStart(3, '0')}`, u: spPath({ ...a, alolan: true }) });
  const pocketLabel = Object.fromEntries(POCKETS.map((p) => [p.id, p.label]));
  for (const i of ITEMS) rows.push({ t: (i.tm ? i.tm + ' ' : '') + i.name, k: pocketLabel[pocketOf(i)], u: href(`items/${pocketOf(i)}/#${itemSlug(i)}`) });
  for (const m of MEDALS) rows.push({ t: m.name + ' medal', k: m.cost ? `${m.cost} energy` : 'Free', u: href(`medals/#${slug(m.name)}`) });
  for (const q of QUESTS) rows.push({ t: q.name, k: q.kind === 'thread' ? 'Open thread' : 'Sidequest', u: href(`quests/#${slug(q.name)}`) });
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
