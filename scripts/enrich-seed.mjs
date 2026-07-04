// Enriches data/seed.json:
//  - downloads item sprites from the open PokéAPI sprite set
//  - adds new items/TMs/event Pokémon found in static/pictures
//  - attaches in-game location screenshots (items, TMs, medals, key items)
// Safe to re-run: sprite downloads are cached, new entries are de-duplicated,
// and location images are set authoritatively from the maps below.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const SEED = join(ROOT, 'data', 'seed.json');
const ITEMS_DIR = join(ROOT, 'static', 'pictures', 'items');
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

mkdirSync(ITEMS_DIR, { recursive: true });
const seed = JSON.parse(readFileSync(SEED, 'utf8'));

const ITEM_SECTIONS = new Set(['items', 'medicine', 'poke-balls', 'battle-items', 'key-items']);
const ALIAS = {
  'x-defend': 'x-defense',
  'deep-sea-scale': 'deepseascale',
  'deep-sea-tooth': 'deepseatooth',
  'silver-powder': 'silverpowder',
  'bright-powder': 'brightpowder',
};

const missingPics = [];
function pic(rel) {
  if (existsSync(join(ROOT, 'static', 'pictures', rel))) return '/pictures/' + rel;
  missingPics.push(rel);
  return '';
}

// ---- new entries to create (deduped by section+name+location) ------------
const NEW = [
  // Items
  { c: 'items', s: 'items', name: 'Bright Powder', data: { location: 'Route 412' }, loc: 'ItemLocations/BrightPowderROute412.jpeg' },
  { c: 'items', s: 'items', name: 'Everstone', data: { location: 'Route 412' }, loc: 'ItemLocations/EveStoneRoute412.jpeg' },
  { c: 'items', s: 'items', name: 'Heart Scale', data: { location: 'Gromet Mine' }, loc: 'ItemLocations/HearScaleMines.jpeg' },
  { c: 'items', s: 'items', name: 'Lax Incense', data: { location: 'Darkdusk Tower (random incense daily)' }, loc: 'ItemLocations/LaxIncenseDarduskTower.jpeg' },
  { c: 'items', s: 'items', name: 'Life Orb', data: { location: 'Gromet Mine' }, loc: 'ItemLocations/LifeOrbMines.jpeg' },
  { c: 'items', s: 'items', name: 'Magmarizer', data: { location: 'Mt. Shuem' }, loc: 'ItemLocations/MagmarizerMt.Shuem.jpeg' },
  { c: 'items', s: 'items', name: 'Sail / Jaw Fossil', data: { location: 'Route 412' }, loc: 'ItemLocations/SailOrJawFossilRoute412.jpeg' },
  // Poké Balls
  { c: 'items', s: 'poke-balls', name: 'Master Ball', data: { location: 'Gromet Museum (post-game)' }, loc: 'ItemLocations/MasterBallGromentMuseum.jpeg' },
  // Medicine (extra Rare Candies)
  { c: 'items', s: 'medicine', name: 'Rare Candy', data: { location: 'Gromet Mine' }, loc: 'ItemLocations/RareCandiesMine.jpeg' },
  { c: 'items', s: 'medicine', name: 'Rare Candy', data: { location: 'Mt. Ice Storm' }, loc: 'ItemLocations/RareCandiesMtIceStorm.jpg' },
  { c: 'items', s: 'medicine', name: 'Rare Candy', data: { location: 'Route 403 (Cut)' }, loc: 'ItemLocations/RareCandiesRoute403.jpeg' },
  // Key Items
  { c: 'items', s: 'key-items', name: 'Gracidea', data: { location: 'Esmerald Botanical Garden' }, loc: 'SpecialItem/GracediaEsmeraldBotanicalGarden.jpeg' },
  // TMs (new)
  { c: 'items', s: 'tms', name: 'Earthquake', data: { tm: 'TM26', location: 'Gromet Gym' }, loc: 'Tm/TM26EarthquakeGromentGym.jpeg', tm: true },
  { c: 'items', s: 'tms', name: 'Shadow Ball', data: { tm: 'TM30', location: 'Darkdusk Gym' }, loc: 'Tm/TM30ShadowBallDarduskGym.jpeg', tm: true },
  { c: 'items', s: 'tms', name: 'Gyro Ball', data: { tm: 'TM74', location: 'Gromet Mine' }, loc: 'Tm/TM74GyroBallMine.jpeg', tm: true },
  // Event Pokémon
  { c: 'pokemon', s: 'acquisition', name: 'Volcarona (Egg)', data: { method: 'Egg reward', location: 'Sun Palace' }, loc: 'Pokemons/VolcaronaEggSunPalace.jpeg' },
  { c: 'pokemon', s: 'acquisition', name: 'Jirachi', data: { method: 'Mystery Gift event', location: 'Event Island' }, loc: 'SpecialLocations/JirachiEventIslandMysteryGift.jpeg' },
  { c: 'pokemon', s: 'acquisition', name: 'Feebas', data: { method: 'Fishing', location: 'Mt. Ice Storm' }, loc: 'SpecialLocations/FeebasMtIceStorm.jpg' },
];

// ---- location images for EXISTING entries: [section, name, locSubstr|'', rel]
const LOC = [
  ['items', 'Quick Claw', '', 'ItemLocations/QuickClawYellowTown.jpeg'],
  ['items', 'Wide Lens', '', 'ItemLocations/WideLensRoute407PossibleItemfromtrashcleanergirl.jpeg'],
  ['items', 'Dragon Scale', '409', 'ItemLocations/DragonScaleRoute409.jpg'],
  ['items', 'Moon Stone', 'Darkdusk', 'ItemLocations/MoonStoneDardusk.jpg'],
  ['items', 'Razor Fang', '', 'ItemLocations/RazorFangDarduskCaveOutside.jpeg'],
  ['items', 'Shiny Stone', 'Ice Storm', 'ItemLocations/ShinyStoneMtIceStorm.jpg'],
  ['items', 'Thick Club', '', 'ItemLocations/ThickClubRoute412.jpeg'],
  ['items', 'Deep Sea Tooth', '', 'ItemLocations/DeepSeaToothPanotemIslands.jpeg'],
  ['items', 'Big Pearl', '', 'ItemLocations/BigPearlMine.jpeg'],
  ['items', 'Electirizer', '', 'ItemLocations/ElectrizerMines.jpeg'],
  ['items', 'Water Stone', 'Gromet Mine', 'ItemLocations/waterstoneMines.jpeg'],
  ['medicine', 'Rare Candy', 'Marfeney', 'ItemLocations/RareCandiesLake.jpg'],
  ['medicine', 'Rare Candy', '409', 'ItemLocations/RareCandiesRoute409.jpg'],
  ['key-items', 'Dungeon Key', '', 'SpecialItem/DungeonKeyDarduskTower.jpeg'],
  ['key-items', 'Lustrous Stone', '', 'SpecialItem/LustrousStoneMines.jpeg'],
  ['tms', 'Roar', '', 'Tm/TM05RoarRoute412.jpeg'],
  ['tms', 'Hail', '', 'Tm/TM07HailIcestormMt.jpg'],
  ['tms', 'Flamethrower', '', 'Tm/TM35FlameThrowerMtShuem.jpeg'],
  ['tms', 'Sandstorm', '', 'Tm/TM37SandstormRoute412.jpeg'],
  ['tms', 'Rock Tomb', '', 'Tm/TM39RockTombMtShuem.jpeg'],
  ['tms', 'Facade', '', 'Tm/TM42FacadeNationalPark.jpg'],
  ['tms', 'Secret Power', '', 'Tm/TM43SecretPowerSunPalace.jpeg'],
  ['tms', 'Shadow Claw', '', 'Tm/TM65ShadowClawDarduskForest.jpg'],
  ['tms', 'Flash', '', 'Tm/TM70FlashGromentCIty.jpeg'],
  ['tms', 'Rock Slide', '', 'Tm/TM80RockSlidePantemCave.jpeg'],
  ['tms', 'Grass Knot', '', 'Tm/TM86GrassKnotRoute410.jpg'],
];

// ---- medals: the provided image is a location screenshot -> location_image
const MEDAL = [
  ['Antidote', 'Medals/AntidoteMedalRoute403.jpeg'],
  ["Catch 'Em All", 'Medals/CatchEmAllNationalPark.jpg'],
  ['Dowsing', 'Medals/DowsingMedalMtIceStorm.jpeg'],
  ['Exp For All', 'Medals/ExpForAllMossSpring.jpeg'],
  ['Fog Lamp', 'Medals/FogLampMarphenyLake.jpg'],
  ['Fountain of Youth', 'Medals/FountainOfYouthMedalMine.jpeg'],
  ['Phenomenal', 'Medals/PhenomenaEnermyTown.jpeg'],
];

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const cache = new Map();
async function fetchSprite(candidates) {
  for (const c of candidates) {
    if (cache.has(c)) {
      if (cache.get(c)) return cache.get(c);
      continue;
    }
    const dest = join(ITEMS_DIR, `${c}.png`);
    if (existsSync(dest)) {
      const p = `/pictures/items/${c}.png`;
      cache.set(c, p);
      return p;
    }
    try {
      const res = await fetch(`${SPRITE_BASE}/${c}.png`);
      if (res.ok) {
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        const p = `/pictures/items/${c}.png`;
        cache.set(c, p);
        return p;
      }
    } catch {}
    cache.set(c, null);
  }
  return null;
}

const tmDisc = await fetchSprite(['tm-normal']);

// 1) append new entries (dedup by category+section+name+location)
const key = (c, s, n, l) => `${c}/${s}/${n}/${l || ''}`;
const existing = new Set(
  seed.entries.map((e) => key(e.category, e.section, e.name, e.data?.location))
);
let added = 0;
for (const n of NEW) {
  if (existing.has(key(n.c, n.s, n.name, n.data?.location))) continue;
  seed.entries.push({
    category: n.c,
    section: n.s,
    name: n.name,
    data: n.data,
    image: n.tm ? tmDisc || '' : '',
    location_image: pic(n.loc),
  });
  existing.add(key(n.c, n.s, n.name, n.data?.location));
  added++;
}

// 2) item sprites for every item-section entry that has no image yet
let sprites = 0;
const misses = [];
for (const e of seed.entries) {
  if (e.image || !ITEM_SECTIONS.has(e.section)) continue;
  const base = slugify(e.name);
  const cands = [...new Set([ALIAS[base] || base, base, base.replace(/-/g, '')])];
  const path = await fetchSprite(cands);
  if (path) {
    e.image = path;
    sprites++;
  } else misses.push(e.name);
}

// 3) location images for existing entries (authoritative)
let locs = 0;
for (const [sec, name, sub, rel] of LOC) {
  const e = seed.entries.find(
    (x) => x.section === sec && x.name === name && (!sub || (x.data?.location || '').includes(sub))
  );
  if (e) {
    e.location_image = pic(rel);
    locs++;
  }
}

// 4) medals -> location image (and clear any stale sprite path)
for (const [name, rel] of MEDAL) {
  const e = seed.entries.find((x) => x.section === 'medals' && x.name === name);
  if (e) {
    e.location_image = pic(rel);
    e.image = '';
    locs++;
  }
}

// 5) collapse the multiple Rare Candy pickups into one entry with a gallery.
{
  const rc = seed.entries.filter((e) => e.section === 'medicine' && e.name === 'Rare Candy');
  if (rc.length > 1) {
    let spots = [];
    for (const e of rc) {
      if (Array.isArray(e.data?.spots)) spots.push(...e.data.spots);
      else spots.push({ at: e.data?.location || '', img: e.location_image || '' });
    }
    const seen = new Set();
    spots = spots.filter((s) => s.at && !seen.has(s.at) && seen.add(s.at));
    const combined = {
      category: 'items',
      section: 'medicine',
      name: 'Rare Candy',
      data: { location: spots.map((s) => s.at).join(', '), spots: spots.filter((s) => s.img) },
      image: rc.find((e) => e.image)?.image || '',
      location_image: '',
    };
    seed.entries = seed.entries.filter((e) => !(e.section === 'medicine' && e.name === 'Rare Candy'));
    seed.entries.push(combined);
    console.log(`Combined ${rc.length} Rare Candy pickups into 1 (${spots.length} spots)`);
  }
}

writeFileSync(SEED, JSON.stringify(seed, null, 2) + '\n');
console.log(`New entries added: ${added}`);
console.log(`Item sprites attached: ${sprites}`);
console.log(`Location screenshots attached: ${seed.entries.filter((e) => e.location_image).length} (this run set ${locs})`);
if (misses.length) console.log(`No sprite for: ${[...new Set(misses)].join(', ')}`);
if (missingPics.length) console.log(`⚠ Missing picture files: ${[...new Set(missingPics)].join(', ')}`);
