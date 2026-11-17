/* Two languages, one set of pages. Every page is built twice: at its own URL
   in English and under /es/ in Spanish. The middleware opens a request-scoped
   store saying which one is being rendered, so anything called while a page
   renders — a template, a component, a helper in data.js — can ask `lang()`
   without the answer being passed down by hand.

   Spanish text comes from two places:
   - src/data/es/strings.json — the guide's own words, keyed by the English
     sentence. `t('…')` looks a sentence up; one that has no Spanish yet is
     shown in English and listed at the end of a build.
   - src/data/es/official.json — the games' own Spanish for types, moves,
     items, categories and dex entries, extracted from PokéAPI. */
import { AsyncLocalStorage } from 'node:async_hooks';
import strings from '../data/es/strings.json';
import official from '../data/es/official.json';

export const LANGS = ['en', 'es'];
const store = (globalThis.__lpdsLang ||= new AsyncLocalStorage());
export const MISSING = (globalThis.__lpdsMissing ||= new Set());

export const withLang = (l, fn) => store.run({ lang: l === 'es' ? 'es' : 'en' }, fn);
export const lang = () => store.getStore()?.lang || 'en';
export const isEs = () => lang() === 'es';

/* every route lives in src/pages/[...lang]/; these give it both languages */
export const langPaths = () => [{ params: { lang: undefined } }, { params: { lang: 'es' } }];
export const withLangs = (paths) => paths.flatMap((p) =>
  [undefined, 'es'].map((l) => ({ ...p, params: { ...p.params, lang: l } })));

/* names the dictionary never touches: places are handled by the last pass over
   the page, so a caption that is only a place name is not a missing sentence */
const PLAIN = new Set();
export const markPlain = (names) => { for (const n of names) PLAIN.add(n); };
const isPlain = (s) => !/[a-z]{2}/i.test(s) || s.split(/ \/ |, | · | → /).every((x) => PLAIN.has(x) || /^Routes? \d+(–\d+)?$/.test(x));
/* data that follows a pattern is put into Spanish by rule */
const RULES = [
  [/^Level (\d+)$/, (m) => `Nivel ${m[1]}`],
  [/^Evolve (.+)$/, (m) => `Evoluciona a ${m[1].replace(/^Alolan (.+)$/, '$1 de Alola')}`],
  [/^(\d[\d,]*) Poké Miles$/, (m) => `${m[1].replace(',', '.')} Pokémillas`],
  [/^Prize Exchange Center — (.+)$/, (m) => `Centro de Canje de Premios — ${m[1].replace('coins', 'fichas')}`],
];
const SPANISH = new Set(Object.values(strings));
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s);

/* the guide's own words. `vars` fills {name} slots after the lookup. */
export const t = (en, vars) => {
  if (en == null || en === '') return en;
  en = String(en);
  if (!isEs()) return fill(en, vars);
  const es = strings[en];
  if (es != null) return fill(es, vars);
  for (const [re, fn] of RULES) { const m = en.match(re); if (m) return fn(m); }
  /* a caption can pass through twice (a page, then a component); Spanish in is Spanish out */
  if (!isPlain(en) && !SPANISH.has(en)) MISSING.add(en);
  return fill(en, vars);
};
/* a sentence with links in it: "<1>Alolan form</1>" keeps its place in the
   Spanish sentence and `tags` supplies the opening tag for each number */
export const rich = (en, tags = {}, vars) =>
  t(en, vars).replace(/<(\/?)(\d)>/g, (m, close, n) => {
    const open = tags[n]; if (!open) return '';
    return close ? `</${open.match(/^<(\w+)/)[1]}>` : open;
  });

/* ---------- the games' own Spanish -------------------------------- */
const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const typeName = (type) => { const k = String(type).toLowerCase(); return (isEs() && official.types?.[k]) || cap(k); };
/* names are matched without spaces, case or accents: "SolarBeam" is "Solar Beam" */
const nameKey = (s) => String(s).toLowerCase().replace(/é/g, 'e').replace(/[^a-z0-9]/g, '');
export const moveName = (m) => (isEs() && official.moves?.[nameKey(m)]) || m;
/* "TM37" is "MT37" in Spanish, "HM01" is "MO01" */
export const tmLabel = (tm) => (tm && isEs() ? tm.replace(/^TM/, 'MT').replace(/^HM/, 'MO') : tm);
/* an item the games have; a TM or HM is named after its move; an item only
   this hack has falls back to the guide's own dictionary */
export const itemName = (name, tm) => {
  if (!isEs() || !name) return name;
  const k = nameKey(name);
  return (tm && official.moves?.[k]) || official.items?.[k] || strings[name] || name;
};
/* species names are the same in both languages; only the regional forms move
   their adjective: "Alolan Rattata" is "Rattata de Alola" */
export const monName = (name) => (isEs() ? String(name).replace(/^Alolan (.+)$/, '$1 de Alola') : name);
export const itemFlavor = (name) => (isEs() && official.itemFlavor?.[nameKey(name)]) || null;
/* an Alolan form shares its base species' category; its dex entry is its own,
   so that one comes from the guide's dictionary */
export const genusOf = (sp) => (isEs() && (official.genus?.[sp.nat] || official.genus?.[sp.baseNat])) || sp.genus;
export const entryOf = (sp) => (isEs() && official.entry?.[sp.nat]) || t(sp.entry);

/* ---------- places ------------------------------------------------- */
/* the original Spanish names, for players on the untranslated ROM. Only the
   names the cartridge is known to use are here; every other place keeps the
   name the guide recorded it under. */
export const ES_NAME = { 'Yellow Town': 'Pueblo Amarillo', 'Central City': 'Ciudad Central', 'Inhore City': 'Ciudad Melífera',
  'Pantem Town': 'Pueblo Lodazal', 'Esmerald City': 'Ciudad Algaida', 'Bramboach Town': 'Pueblo Céfiro',
  'Seanport City': 'Ciudad Náutica', 'Dardusk City': 'Ciudad Crepúsculo', 'Enermy Town': 'Villaeterna',
  'Groment City': 'Ciudad Antica', 'Panotem Islands': 'Islas Panotem' };
/* spellings the data uses for the same places */
const VARIANTS = { 'Gromet City': 'Groment City', 'Darkdusk City': 'Dardusk City', 'Enemy Town': 'Enermy Town',
  'Central Town': 'Central City', 'Panotem Island': 'Panotem Islands' };
export const placeName = (name) => {
  if (!isEs()) return name;
  return ES_NAME[name] || String(name).replace(/^Route (\d+)/, 'Ruta $1');
};

/* A last pass over the finished HTML, so no template or data file has to
   remember it: the data's misspelt city names are put right, and on a Spanish
   page every city and route mentioned in running text takes its Spanish name. */
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EN_FIX = new Map(Object.entries(VARIANTS));
const ES_SWAP = new Map([...Object.entries(ES_NAME), ...Object.entries(VARIANTS).map(([bad, en]) => [bad, ES_NAME[en]])]);
const reFor = (map) => new RegExp(`(?<![\\w-])(${[...map.keys()].sort((a, b) => b.length - a.length).map(escRe).join('|')})(?![\\w-])`, 'g');
const RE_EN = reFor(EN_FIX), RE_ES = reFor(ES_SWAP);
const swap = (text, l) => l === 'es'
  ? text.replace(RE_ES, (m) => ES_SWAP.get(m)).replace(/\bRoutes? (\d{3})\b/g, 'Ruta $1')
  : text.replace(RE_EN, (m) => EN_FIX.get(m));
/* text between tags, plus JSON data blocks the dialogs read from; never
   attributes, styles or ordinary scripts */
const TOKEN = /(<!--[\s\S]*?-->|<[^>]+>)/;
export const localise = (html, l) => {
  let skip = null;
  return html.split(TOKEN).map((part) => {
    if (part.startsWith('<')) {
      const open = part.match(/^<(script|style)\b/i);
      if (open && !/type="application\/json"/i.test(part)) skip = open[1].toLowerCase();
      else if (skip && part.toLowerCase() === `</${skip}>`) skip = null;
      return part;
    }
    return skip ? part : swap(part, l);
  }).join('');
};

/* the few sentences that scripts in the browser put on the page. The layout
   prints their Spanish into the page for the scripts to read. */
export const CLIENT_STRINGS = [
  'Nothing in the guide matches “{q}”.',
  /* the Sun Palace solver */
  'Rotate', 'Outside', 'Inside', 'gear', 'empty',
  'Line {line}, track {track}, {state}',
  'Solved — four gears stacked on L{n}.',
  'Place at least four gears, then pick a target line.',
  'Six gears is the maximum.',
  'L{n} {lever} is blocked by the ladder.',
  'Pulled L{n} {lever}.',
  'Nothing to undo.', 'Stepped back.', 'Board cleared.', 'Example loaded — try Solve.',
  'You need at least four gears on the board.',
  'Every lever is blocked — nothing can move.',
  'Search gave up before finding a route.',
  'No sequence reaches that line from here. Try another target, or move a gear.',
  'Already solved.', 'Pillar turning…',
  'All four lines aligned. The pillar has risen and the way below is open.',
  'L{done} is done. Copy the board as it is now, then solve for L{next}.',
  'Then go up a floor and press the <b>main switch</b> at the back.',
  'Found a route in 1 move. Click the step to watch it, or Play.',
  'Found a route in {n} moves. Click each step to watch it, or Play.',
  'Progress reset — start again from L3.',
];
export const clientDict = () => Object.fromEntries(CLIENT_STRINGS.map((s) => [s, t(s)]));
