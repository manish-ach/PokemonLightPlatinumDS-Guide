/* One flat index for the guide's search, in the language of the page asking:
   everything that has a page or an anchor, with the text a player would type.
   Fetched on first focus, not on load, so pages stay small. */
import { ALLSPECIES, ALOLAN, spPath, ITEMS, POCKETS, pocketOf, itemSlug, href,
  ALL_PLACES, placePath, GYMS, slug, MEDALS, QUESTS, ES_NAME } from '../../lib/data.js';
import { langPaths, t, isEs, placeName, itemName, tmLabel } from '../../lib/i18n.js';

export function getStaticPaths() { return langPaths(); }

export function GET() {
  const rows = [];
  const dex = (n) => String(n).padStart(3, '0');
  for (const p of ALL_PLACES) if (p.built) rows.push({ t: placeName(p.name), k: t(p.kind), u: placePath(p.name) });
  /* a city answers to its name in the other language too */
  for (const [en, es] of Object.entries(ES_NAME))
    rows.push(isEs() ? { t: en, k: t('English name of {name}', { name: es }), u: placePath(en) }
      : { t: es, k: t('Spanish name of {name}', { name: en }), u: placePath(en) });
  for (const g of GYMS) rows.push({ t: t('{city} Gym', { city: placeName(g.city) }), k: `${g.leader} · ${t(g.badge)}`, u: href(`gyms/${slug(g.city)}/`) });
  for (const s of ALLSPECIES) rows.push({ t: s.name, k: s.reg ? `Dex ${dex(s.reg)}` : t('Not in dex'), u: spPath(s) });
  for (const a of ALOLAN) rows.push({ t: a.name, k: `${t('Alolan form')} · Dex ${dex(a.reg)}`, u: spPath({ ...a, alolan: true }) });
  const pocketLabel = Object.fromEntries(POCKETS.map((p) => [p.id, t(p.label)]));
  for (const i of ITEMS) rows.push({ t: (i.tm ? tmLabel(i.tm) + ' ' : '') + itemName(i.name), k: pocketLabel[pocketOf(i)], u: href(`items/${pocketOf(i)}/#${itemSlug(i)}`) });
  for (const m of MEDALS) rows.push({ t: t('{name} medal', { name: m.name }), k: m.cost ? t('{n} energy', { n: m.cost }) : t('Free'), u: href(`medals/#${slug(m.name)}`) });
  for (const q of QUESTS) rows.push({ t: q.name, k: q.kind === 'thread' ? t('Open thread') : t('Sidequest'), u: href(`quests/#${slug(q.name)}`) });
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
