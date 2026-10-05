/* Everything the pages build from. A port of the old generator's derivations:
   the same joins, the same explicit screenshot maps, the same rules about what
   counts as recorded. Nothing here is invented. */
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import seed from '../data/seed.json';
import speciesRaw from '../data/species.json';
import nondex from '../data/nondex.json';
import alolan from '../data/alolan.json';
import fulldex from '../data/dex.json';
import itemsRaw from '../data/items.json';
import wild from '../data/wilditems.json';
import dims from '../data/shotdims.json';
import medalsRaw from '../data/medals.json';
import trades from '../data/trades.json';
import gymsRaw from '../data/gyms.json';
import quests from '../data/quests.json';
import placesRaw from '../data/places.json';
import spine from '../data/spine.json';
import phenomena from '../data/phenomena.json';
import outbreaks from '../data/outbreaks.json';
import wildlocations from '../data/wildlocations.json';
import mileage from '../data/mileage.json';
import romitems from '../data/romitems.json';
import itemsprites from '../data/itemsprites.json';
import dexnav from '../data/dexnavshots.json';
import evolutions from '../data/evolutions.json';

const ROOT = process.cwd(); /* the project root: import.meta.url points at the bundled chunk during a build */

/* ---------- urls -------------------------------------------------- */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (p) => `${BASE}/${String(p).replace(/^\//, '')}`;
export const pic = (file) => href(`pictures/${file}`);
export const DIMS = dims;
export const dim = (file) => DIMS[file] || [4, 3];
/* the optimised webp set the old build shipped; only reference what exists */
const OPT_DIR = join(ROOT, 'public', 'pictures', 'opt');
const OPT_FILES = new Set(existsSync(OPT_DIR) ? readdirSync(OPT_DIR) : []);
const optBase = (file) => file.replace(/\.[^.]+$/, '').replace(/\//g, '__');
export const optSources = (file) =>
  [640, 1280].filter((w) => OPT_FILES.has(`${optBase(file)}-${w}.webp`))
    .map((w) => `${pic('opt/' + optBase(file))}-${w}.webp ${w}w`);

export const SPRITE = (nat, shiny) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${nat}.png`;
export const SPRITE_ITEM = (slug) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;

export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

/* ---------- species ---------------------------------------------- */
export const SPECIES = speciesRaw;
export const NONDEX = nondex;
export const ALOLAN = alolan;
export const FULLDEX = fulldex;
export const ALOLAN_BY_BASE = new Map(ALOLAN.map((a) => [a.base, a]));
export const GIFTED = NONDEX.filter((g) => g.gift);

const STARTERS = {
  'Kanto Starters': ['Bulbasaur', 'Charmander', 'Squirtle'],
  'Hoenn Starters': ['Treecko', 'Torchic', 'Mudkip'],
  'Sinnoh Starters': ['Turtwig', 'Chimchar', 'Piplup'],
};
/* the first stage of every starter line from Gen 1 to Gen 5 also turns up in
   phenomena once the Phenomenal medal is on */
export const STARTER_BASES = new Set(['Bulbasaur', 'Charmander', 'Squirtle', 'Chikorita', 'Cyndaquil', 'Totodile',
  'Treecko', 'Torchic', 'Mudkip', 'Turtwig', 'Chimchar', 'Piplup', 'Snivy', 'Tepig', 'Oshawott']);
export const ACQ = new Map();
for (const e of seed.entries.filter((x) => x.section === 'acquisition')) {
  const names = STARTERS[e.name] || [e.name.replace(/\s*\(Egg\)|\s*Egg$/, '').trim()];
  for (const n of names) ACQ.set(n, { method: e.data.method || '', location: e.data.location || '' });
}
for (const a of ALOLAN) ACQ.set(a.name, { method: a.method, location: a.location });
for (const g of NONDEX) if (g.method) ACQ.set(g.name, { method: g.method, location: g.location });
ACQ.set('Dragonite', { method: 'Mystery Gift — “The Champions’ Dragonite”',
  location: 'Commemorates Spain’s 2026 FIFA World Cup win' });
for (const n of ['Uxie', 'Mesprit', 'Azelf']) ACQ.set(n, { method: 'Roaming — freed by the Pantem Cave disk puzzle, after the end of this version',
  location: 'Random routes; the PDA shows where it is' });
ACQ.set('Milotic', { method: 'Evolve Feebas — feed it a Wonder Meal at a Pokémon Center twice, then level it up',
  location: 'Any Pokémon Center' });

export const ALLSPECIES = [...SPECIES, ...NONDEX];
/* one URL scheme for the three kinds of entry: regional, off-dex, Alolan form */
export const spKey = (sp) => sp.alolan ? `a${sp.nat}` : sp.reg ? String(sp.reg) : `n${sp.nat}`;
export const spPath = (sp) => href(`dex/${spKey(sp)}/`);
export const SPECIES_BY_NAME = new Map(ALLSPECIES.map((s) => [s.name, s]));
export const NAT_OF = new Map(ALLSPECIES.map((s) => [s.name, s.nat]));
for (const a of ALOLAN) NAT_OF.set(a.name, a.nat);

/* ---------- items ------------------------------------------------ */
const BERRY_ORDER = ['Cheri', 'Chesto', 'Pecha', 'Rawst', 'Aspear', 'Leppa', 'Oran', 'Persim', 'Lum', 'Sitrus',
  'Figy', 'Wiki', 'Mago', 'Aguav', 'Iapapa', 'Razz', 'Bluk', 'Nanab', 'Wepear', 'Pinap', 'Pomeg', 'Kelpsy',
  'Qualot', 'Hondew', 'Grepa', 'Tamato', 'Cornn', 'Magost', 'Rabuta', 'Nomel', 'Spelon', 'Pamtre', 'Watmel',
  'Durin', 'Belue', 'Occa', 'Passho', 'Wacan', 'Rindo', 'Yache', 'Chople', 'Kebia', 'Shuca', 'Coba', 'Payapa',
  'Tanga', 'Charti', 'Kasib', 'Haban', 'Colbur', 'Babiri', 'Chilan', 'Liechi', 'Ganlon', 'Salac', 'Petaya',
  'Apicot', 'Lansat', 'Starf', 'Enigma', 'Micle', 'Custap', 'Jaboca', 'Rowap', 'Kee', 'Maranga'];
const BERRY_FX = {
  Pecha: 'Held or used: cures poison.',
  Sitrus: 'Held: restores 1/4 of max HP when the holder falls below half HP.',
  Wiki: 'Held: restores 1/3 of max HP at low HP; confuses holders that dislike the dry flavor.',
  Aguav: 'Held: restores 1/3 of max HP at low HP; confuses holders that dislike the bitter flavor.',
  Iapapa: 'Held: restores 1/3 of max HP at low HP; confuses holders that dislike the sour flavor.',
  Pomeg: 'Used: lowers HP EVs and raises friendship.',
  Kelpsy: 'Used: lowers Attack EVs and raises friendship.',
  Qualot: 'Used: lowers Defense EVs and raises friendship.',
  Hondew: 'Used: lowers Sp. Atk EVs and raises friendship.',
  Grepa: 'Used: lowers Sp. Def EVs and raises friendship.',
  Tamato: 'Used: lowers Speed EVs and raises friendship.',
  Occa: 'Held: halves the damage of one super-effective Fire-type move.',
  Passho: 'Held: halves the damage of one super-effective Water-type move.',
  Coba: 'Held: halves the damage of one super-effective Flying-type move.',
  Chople: 'Held: halves the damage of one super-effective Fighting-type move.',
  Kebia: 'Held: halves the damage of one super-effective Poison-type move.',
  Ganlon: 'Held: sharply raises Defense at low HP.',
  Salac: 'Held: sharply raises Speed at low HP.',
  Apicot: 'Held: sharply raises Sp. Def at low HP.',
  Micle: 'Held: boosts the accuracy of the holder’s next move at low HP.',
  Custap: 'Held: at low HP, the holder moves first in its priority bracket. Works once.',
  Kee: 'Held: raises Defense when the holder is hit by a physical move.',
};
for (const b of ['Razz', 'Bluk', 'Nanab', 'Wepear', 'Pinap', 'Cornn', 'Magost', 'Rabuta', 'Nomel',
  'Spelon', 'Watmel', 'Durin', 'Belue']) BERRY_FX[b] = 'No battle effect — an ingredient berry.';

let items = itemsRaw.map((i) => ({ ...i, locations: [...(i.locations || [])] }));
const TREE_SRC = items.filter((i) => i.kind === 'tree');
{
  const byName = new Map(items.filter((i) => i.section === 'berries' && i.kind === 'item').map((i) => [i.name, i]));
  for (const t of TREE_SRC) for (const b of t.berryList) {
    const name = `${b.label} Berry`;
    let e = byName.get(name);
    if (!e) {
      e = { section: 'berries', name, locations: [], localIcon: null, tm: null, berries: null, kind: 'item',
        matched: !!(b.sprite && BERRY_FX[b.label]), slug: null, sprite: b.sprite, category: 'berries',
        cost: null, effect: BERRY_FX[b.label] || null, flavor: null };
      byName.set(name, e); items.push(e);
    }
    e.locations.push(`${t.name}${b.qty ? ` (×${b.qty})` : ''}`);
  }
}
items = items.filter((i) => i.kind !== 'tree');

export const itemKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
{
  /* the whole item table from the cartridge, minus key items nobody can get;
     the PokéMileage Club is a real source and marks its items obtainable */
  const have = new Set();
  for (const i of items) { have.add(itemKey(i.name)); if (i.tm) { have.add(itemKey(i.tm)); i.confirmed = true; } }
  const MILE_AT = new Map(mileage.map((m) => [itemKey(m.name), m]));
  for (const i of items) {
    const m = MILE_AT.get(itemKey(i.name));
    if (m) i.locations.push(`PokéMileage Club — ${m.cost.toLocaleString()} Poké Miles`);
  }
  for (const r of romitems) {
    if (have.has(itemKey(r.name)) || (r.tm && have.has(itemKey(r.tm)))) continue;
    if (r.section === 'key-items') continue;
    const mile = MILE_AT.get(itemKey(r.name));
    const sl = (mile && mile.slug) || itemsprites[r.name] || null;
    items.push({ section: r.section, name: r.name,
      locations: mile ? [`PokéMileage Club — ${mile.cost.toLocaleString()} Poké Miles`] : [],
      localIcon: null, tm: r.tm, berries: null, kind: r.tm ? 'machine' : 'item', matched: false,
      slug: sl, sprite: sl ? SPRITE_ITEM(sl) : null, category: null, cost: r.price || null,
      effect: null, gameText: r.gameText || null, flavor: null, confirmed: false });
  }  /* every evolution stone and fossil can be dug up in Groment Mines */
  const DUG = ['Fire Stone', 'Water Stone', 'Thunderstone', 'Leaf Stone', 'Moon Stone', 'Sun Stone', 'Shiny Stone',
    'Dusk Stone', 'Dawn Stone', 'Helix Fossil', 'Dome Fossil', 'Old Amber', 'Root Fossil', 'Claw Fossil',
    'Skull Fossil', 'Armor Fossil', 'Jaw Fossil', 'Sail Fossil'].map(itemKey);
  for (const i of items) if (DUG.includes(itemKey(i.name))) i.locations.push('Groment Mines — dug up while mining');
}
export const ITEMS = items;
export const ITEM_BY_KEY = new Map();
for (const i of ITEMS) if (!ITEM_BY_KEY.has(itemKey(i.name))) ITEM_BY_KEY.set(itemKey(i.name), i);
export const itemSlug = (i) => slug((i.tm ? i.tm + '-' : '') + i.name);

export const POCKETS = [
  { id: 'items',        label: 'Items',        hue: 350, glyph: 'M6 8V6.5A3 3 0 0 1 12 6.5V8M4 8h12l-1 9H5L4 8Z' },
  { id: 'medicine',     label: 'Medicine',     hue: 45,  glyph: 'M8 3h4v3l2 3v8H6V9l2-3V3ZM6 12h8' },
  { id: 'poke-balls',   label: 'Poké Balls',   hue: 85,  glyph: 'M3 10h5m4 0h5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z' },
  { id: 'machines',     label: 'TMs & HMs',    hue: 178, glyph: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM13.6 5.4 11 8' },
  { id: 'berries',      label: 'Berries',      hue: 128, glyph: 'M10 7.5c3 0 4.5 2 4.5 4.2A4.5 4.5 0 0 1 10 16a4.5 4.5 0 0 1-4.5-4.3C5.5 9.5 7 7.5 10 7.5Zm0 0V5m0 0c-1.6 0-2.8-.6-3.4-1.6C7.7 3 9 3.6 10 5Zm0 0c1.6 0 2.8-.6 3.4-1.6C12.3 3 11 3.6 10 5Z' },
  { id: 'battle-items', label: 'Battle items', hue: 258, glyph: 'M10 2.5l1.9 4.3 4.6.5-3.4 3.2.9 4.6L10 12.9l-4 2.2.9-4.6L3.5 7.3l4.6-.5L10 2.5Z' },
  { id: 'key-items',    label: 'Key items',    hue: 302, glyph: 'M12.5 3.5a4 4 0 1 0-2.6 7L8 12.4V14H6.4l-1.9 1.9v1.6h3l6-6a4 4 0 0 0-1-8ZM13 6.4v.01' },
];
export const pocketOf = (i) => i.kind === 'machine' ? 'machines' : i.section;
const machineKey = (m) => { const n = parseInt((m.tm || '').replace(/\D/g, ''), 10) || 0; return ((m.tm || '').startsWith('HM') ? 1000 : 0) + n; };
const berryKey = (b) => { const n = BERRY_ORDER.indexOf(b.name.replace(/ Berry$/, '')); return n < 0 ? 999 : n; };
export const inPocket = (id) => {
  const list = ITEMS.filter((i) => pocketOf(i) === id);
  if (id === 'machines') return list.slice().sort((a, b) => machineKey(a) - machineKey(b));
  if (id === 'berries') return list.slice().sort((a, b) => berryKey(a) - berryKey(b));
  return list;
};

export const WILD = wild;
export const WILD_OF = (name) => WILD.filter((w) => itemKey(w.item) === itemKey(name));

/* screenshots, mapped by hand: filenames in the source folder are irregular */
const ITEM_SHOTS = {
  'Silk Scarf': [['ItemLocations/SilkScarfFairyShowDardusk.png', 'Dardusk Woods — Fairy Pokémon show reward']],
  'Big Pearl': [['ItemLocations/BigPearlMine.jpeg', 'Gromet Mine']],
  'Bright Powder': [['ItemLocations/BrightPowderROute412.jpeg', 'Route 412']],
  'Deep Sea Tooth': [['ItemLocations/DeepSeaToothPanotemIslands.jpeg', 'Panotem Islands — by Surf']],
  'Dragon Scale': [['ItemLocations/DragonScaleRoute409.jpg', 'Route 409']],
  'Electirizer': [['ItemLocations/ElectrizerMines.jpeg', 'Gromet Mine']],
  'Everstone': [['ItemLocations/EveStoneRoute412.jpeg', 'Route 412']],
  'Heart Scale': [['ItemLocations/HearScaleMines.jpeg', 'Gromet Mine']],
  'Lax Incense': [['ItemLocations/LaxIncenseDarduskTower.jpeg', 'Darkdusk Tower']],
  'Life Orb': [['ItemLocations/LifeOrbMines.jpeg', 'Gromet Mine']],
  'Magmarizer': [['ItemLocations/MagmarizerMt.Shuem.jpeg', 'Mt. Shuem']],
  'Master Ball': [['ItemLocations/MasterBallGromentMuseum.jpeg', 'Gromet City — Museum']],
  'Moon Stone': [['ItemLocations/MoonStoneDardusk.jpg', 'Darkdusk City']],
  'Quick Claw': [['ItemLocations/QuickClawYellowTown.jpeg', 'Yellow Town']],
  'Rare Candy': [['ItemLocations/RareCandiesRoute403.jpeg', 'Route 403'], ['ItemLocations/RareCandiesRoute409.jpg', 'Route 409'],
    ['ItemLocations/RareCandiesLake.jpg', 'Marfeney Lake'], ['ItemLocations/RareCandiesMine.jpeg', 'Gromet Mine'],
    ['ItemLocations/RareCandiesMtIceStorm.jpg', 'Mt. Ice Storm']],
  'Razor Fang': [['ItemLocations/RazorFangDarduskCaveOutside.jpeg', 'Darkdusk Cave — outside']],
  'Sail Fossil': [['ItemLocations/SailOrJawFossilRoute412.jpeg', 'Route 412 — the choice']],
  'Jaw Fossil': [['ItemLocations/SailOrJawFossilRoute412.jpeg', 'Route 412 — the choice']],
  'Shiny Stone': [['ItemLocations/ShinyStoneMtIceStorm.jpg', 'Mt. Ice Storm']],
  'Thick Club': [['ItemLocations/ThickClubRoute412.jpeg', 'Route 412 — eastern ledges']],
  'Water Stone': [['ItemLocations/WaterStoneMtIceStorm.jpg', 'Mt. Ice Storm'], ['ItemLocations/waterstoneMines.jpeg', 'Gromet Mine']],
  'Wide Lens': [['ItemLocations/WideLensRoute407PossibleItemfromtrashcleanergirl.jpeg', 'Route 407 — trash-cleaner girl']],
  'Dungeon Key': [['SpecialItem/DungeonKeyDarduskTower.jpeg', 'Darkdusk Tower']],
  "King's Rock": [['ItemLocations/KingsRockSunPalace1F.png', 'Sun Palace — first floor']],
  'Sun Stone': [['ItemLocations/SunStoneSunPalace1F.png', 'Sun Palace — first floor']],
  'Ice Stone': [['SpecialLocations/FeebasMtIceStorm.jpg', 'Mt. Ice Storm — the Feebas fishing room']],
  'Gracidea': [['SpecialItem/GracediaEsmeraldBotanicalGarden.jpeg', 'Esmerald City — Botanical Garden']],
  'Lustrous Stone': [['SpecialItem/LustrousStoneMines.jpeg', 'Gromet Mine']],
};
const TM_SHOTS = {
  TM05: ['Tm/TM05RoarRoute412.jpeg', 'Route 412 — Ace Trainer (F)'],
  TM07: ['Tm/TM07HailIcestormMt.jpg', 'Mt. Ice Storm'],
  TM26: ['Tm/TM26EarthquakeGromentGym.jpeg', 'Gromet City Gym'],
  TM30: ['Tm/TM30ShadowBallDarduskGym.jpeg', 'Darkdusk City Gym'],
  TM35: ['Tm/TM35FlameThrowerMtShuem.jpeg', 'Mt. Shuem'],
  TM37: ['Tm/TM37SandstormRoute412.jpeg', 'Route 412'],
  TM39: ['Tm/TM39RockTombMtShuem.jpeg', 'Mt. Shuem'],
  TM42: ['Tm/TM42FacadeNationalPark.jpg', 'National Park'],
  TM43: ['Tm/TM43SecretPowerSunPalace.jpeg', 'Sun Palace'],
  TM54: ['Tm/TM54FalseSwipeRoute409.webp', 'Route 409 — the researcher'],
  TM65: ['Tm/TM65ShadowClawDarduskForest.jpg', 'Darkdusk Forest'],
  TM70: ['Tm/TM70FlashGromentCIty.jpeg', 'Gromet City'],
  TM74: ['Tm/TM74GyroBallMine.jpeg', 'Gromet Mine'],
  TM80: ['Tm/TM80RockSlidePantemCave.jpeg', 'Pantem Cave'],
  TM86: ['Tm/TM86GrassKnotRoute410.jpg', 'Route 410'],
};
export const shotsFor = (i) => i.kind === 'machine' ? (TM_SHOTS[i.tm] ? [TM_SHOTS[i.tm]] : []) : (ITEM_SHOTS[i.name] || []);

/* ---------- medals ----------------------------------------------- */
export const MEDALS = medalsRaw;
export const MEDAL_SHOTS = {
  'Antidote': ['Medals/AntidoteMedalRoute403.jpeg', 'Route 403 — behind Cut'],
  "Catch 'Em All": ['Medals/CatchEmAllNationalPark.jpg', 'National Park'],
  'Dowsing': ['Medals/DowsingMedalMtIceStorm.jpeg', 'Mt. Ice Storm'],
  'Exp For All': ['Medals/ExpForAllMossSpring.jpeg', 'Mass Spring Cave · Route 404'],
  'Fog Lamp': ['Medals/FogLampMarphenyLake.jpg', 'Marfeney Lake — Rock Smash'],
  'Fountain of Youth': ['Medals/FountainOfYouthMedalMine.jpeg', 'Gromet Mine — minecart'],
  'Phenomenal': ['Medals/PhenomenaEnermyTown.jpeg', 'Enermy Town'],
  'Clairvoyant': ['Medals/ClairvoyantSunPalaceTopFloor.png', 'Sun Palace — top floor, far end'],
  'Rockbreaker Feet': ['Medals/RockbreakerFeetMine.png', 'Gromet Mine'],
  'Second Chance': ['Medals/SecondChanceFoongusSwamp.png', 'Foongus Swamp'],
  'Super Lure': ['Medals/SuperLureSeanport.png', 'Seanport City'],
};
const PRIZE = ['Shops/PrizeExchangeCentral.png', 'Prize Exchange Center, Central City'];
const MART1 = ['Shops/SpecialMartSeanport-1.png', 'Special Mart, Seanport City — first page'];
const MART2 = ['Shops/SpecialMartSeanport-2.png', 'Special Mart, Seanport City — second page'];
export const MEDAL_BUY_SHOTS = {
  'Money+': PRIZE, 'Experience +': PRIZE, 'Effort+': PRIZE, 'Friendship+': PRIZE,
  'Farmer': MART1, 'Berrylogist': MART1, 'Incubator': MART1, 'Baby Sitter': MART1, 'Super Learner': MART1, 'Item Holder': MART1,
  'Miner': MART2, 'Treasure Hunter': MART2, 'Simplification': MART2, 'Complication': MART2,
};
const ICON_DIR = join(ROOT, 'public', 'pictures', 'MedalIcons');
const ICON_FILES = existsSync(ICON_DIR) ? readdirSync(ICON_DIR).filter((f) => f.endsWith('.png')) : [];
const ICON_BY_KEY = new Map(ICON_FILES.map((f) => [itemKey(f.replace(/\.png$/, '')), f]));
const ICON_ALIAS = { 'Second Chance': 'seconchance', 'Treasure Hunter': 'treaasurehunter' };
export const medalIcon = (m) => ICON_BY_KEY.get(ICON_ALIAS[m.name] || itemKey(m.name)) || null;

/* ---------- places ----------------------------------------------- */
/* the original Spanish names, for players on the untranslated ROM */
export const ES_NAME = { 'Yellow Town': 'Pueblo Amarillo', 'Central City': 'Ciudad Central', 'Inhore City': 'Ciudad Melífera',
  'Pantem Town': 'Pueblo Lodazal', 'Esmerald City': 'Ciudad Algaida', 'Bramboach Town': 'Pueblo Céfiro',
  'Seanport City': 'Ciudad Náutica', 'Dardusk City': 'Ciudad Crepúsculo', 'Enermy Town': 'Villaeterna',
  'Groment City': 'Ciudad Antica', 'Panotem Islands': 'Islas Panotem' };
export const PLACES = placesRaw;
export const WILDAT = wildlocations;
export const WILD_BY_PLACE = new Map(WILDAT.map((w) => [w.place, w]));
export const WILD_BY_MON = new Map();
for (const w of WILDAT) for (const g of w.methods) for (const m of g.mons) {
  if (!WILD_BY_MON.has(m.name)) WILD_BY_MON.set(m.name, []);
  WILD_BY_MON.get(m.name).push({ place: w.place, how: g.how, order: w.order });
}
/* every species you can catch in the Safari Zone, exclusive or not */
export const SAFARI_MONS = new Set((WILD_BY_PLACE.get('Safari Zone')?.methods || []).flatMap((g) => g.mons.map((m) => m.name)));
export const PHENOM = phenomena;
export const PHENOM_BY_PLACE = new Map();
export const PHENOM_BY_MON = new Map(PHENOM.map((p) => [p.name, p]));
for (const p of PHENOM) { if (!PHENOM_BY_PLACE.has(p.place)) PHENOM_BY_PLACE.set(p.place, []); PHENOM_BY_PLACE.get(p.place).push(p); }
/* mass outbreaks: after the Groment City gym, with the story run to the end of
   this version, PDA mail each day puts one of these out in the overworld */
export const OUTBREAK = outbreaks;
export const OUTBREAK_BY_MON = new Map(OUTBREAK.map((o) => [o.name, o]));
export const OUTBREAK_BY_PLACE = new Map();
for (const o of OUTBREAK) { if (!OUTBREAK_BY_PLACE.has(o.place)) OUTBREAK_BY_PLACE.set(o.place, []); OUTBREAK_BY_PLACE.get(o.place).push(o); }
export const SPINE = spine;
export const GYMS = gymsRaw;
export const GYM_AT = new Map(GYMS.map((g) => [g.city, g]));
export const QUESTS = quests;
export const MILEAGE = mileage;

/* the seed spells a few places its own way */
export const HOME_ALIAS = { 'Darkdusk City': 'Dardusk City', 'Gromet City': 'Groment City',
  'Mt. Ice Storm': 'Mt. Icestorm', 'Gromet Mine': 'Groment Mines', 'Mass Spring Cave': 'Moss Spring' };
const canon = (n) => HOME_ALIAS[n] || n;
export const LOCATION_NOTES = new Map();
for (const e of seed.entries.filter((x) => x.section === 'locations' || x.section === 'routes'))
  LOCATION_NOTES.set(canon(e.name), { kind: e.data.kind || (e.section === 'routes' ? 'Route' : ''), notes: e.data.notes || '' });
/* places that sit inside another place */
export const PLACE_INSIDE = { 'Botanic Garden': 'Esmerald City', 'Safari Zone': 'Central City' };
export const PLACE_CONTAINS = new Map();
for (const [inner, outer] of Object.entries(PLACE_INSIDE)) { if (!PLACE_CONTAINS.has(outer)) PLACE_CONTAINS.set(outer, []); PLACE_CONTAINS.get(outer).push(inner); }
/* the visit order, from the places walked so far */
export const WALK = [...WILDAT].sort((a, b) => a.order - b.order).map((w) => w.place);
export const PLACE_EXTRA = { 'Safari Zone': 'Everything listed by area lives only here; the last list turns up elsewhere too. Phanpy (left grass) and Kecleon (first area) may also be exclusive — unconfirmed.',
   'Panotem Islands': 'The only place the Alolan forms appear.',
  'Desire Island': 'Reached with the Old Sea Map from a Poké Mart (the “A secret map…” Wonder Card). Save first — Jirachi is waiting.' };
export const PLACE_SHOTS = {
  'Desire Island': ['SpecialLocations/JirachiDesireIsland.png', 'Jirachi'],
  'Yellow Town': ['ItemLocations/QuickClawYellowTown.jpeg', 'Quick Claw pickup'],
  'Esmerald City': ['SpecialItem/GracediaEsmeraldBotanicalGarden.jpeg', 'Gracidea — Botanical Garden'],
  'Dardusk City': ['ItemLocations/MoonStoneDardusk.jpg', 'Moon Stone'],
  'Seanport City': ['SpecialLocations/SeanPortGymLeaderPanotem.jpg', 'Gym Leader'],
  'Groment City': ['ItemLocations/MasterBallGromentMuseum.jpeg', 'Master Ball — Museum'],
  'Panotem Islands': ['ItemLocations/DeepSeaToothPanotemIslands.jpeg', 'Deep Sea Tooth by Surf'],
  'Mt. Icestorm': ['SpecialLocations/FeebasMtIceStorm.jpg', 'the Feebas room — also where the Ice Stone sits'],
  'Mt. Shuem': ['ItemLocations/MagmarizerMt.Shuem.jpeg', 'Magmarizer'],
  'Sun Palace': ['Pokemons/VolcaronaEggSunPalace.jpeg', 'Volcarona egg'],
  'Groment Mines': ['SpecialItem/LustrousStoneMines.jpeg', 'Lustrous Stone'],
  'Foongus Swamp': ['SpecialLocations/CutQuestShroomishFoongusSwamp.png', 'the Shroomish needed for HM01 Cut'],
};

/* DexNav captures per place and method, keyed the way wildlocations names them */
export const DEXNAV = dexnav;

/* Items whose recorded location names this place. A location reads
   "Bug Catcher / Route 402" or "Route 408 (Surf)": the place is one of the
   slash-separated parts once trailing brackets and dashes are trimmed; the
   other parts become the detail shown beside the item. */
const LOC_ALIAS = { 'Darkdusk Woods': 'Dardusk Woods', 'Darkdusk Bane': "Dardusk's Bane", 'Darkdusk Bridge': "Dardusk's Bridge",
  'Darkdusk Tower': 'Shadow Tower', 'Darkdusk Gym': 'Dardusk City', 'Marfeney Lake': 'Marfeny Lake', 'Sun Ruins': 'Sun Palace',
  'Esmerald Botanical Garden': 'Botanic Garden', 'Gromet Museum': 'Groment City', 'Gromet Gym': 'Groment City', 'Your House': 'Yellow Town' };
const placePart = (part) => { const n = part.replace(/\s*(?:[(—–-]|\bvia\b|\bnear\b).*$/, '').trim(); return LOC_ALIAS[n] || canon(n); };
export const ITEMS_AT = (name) => {
  const out = [];
  for (const i of ITEMS) for (const loc of i.locations) {
    const parts = loc.split(/ \/ |, /);
    const hit = parts.findIndex((x) => placePart(x) === name);
    if (hit < 0) continue;
    const rest = parts.filter((_, k) => k !== hit);
    const tail = (parts[hit].match(/\s*[(—–-]\s*(.*)$/) || [])[1];
    if (tail) rest.push(tail.replace(/\)$/, ''));
    out.push({ item: i, detail: rest.join(' · ') });
  }
  return out;
};
/* evolutions, from the hack's own table. A species with no recorded
   location still counts as obtainable when something earlier in its line is,
   because you can evolve up to it. */
export const EVOS = evolutions;
export const EVO_TO = new Map();
for (const e of EVOS) { if (!EVO_TO.has(e.toNat)) EVO_TO.set(e.toNat, []); EVO_TO.get(e.toNat).push(e); }
export const EGG_BASES = new Map([['Dratini', 147], ['Bagon', 371], ['Gible', 443], ['Deino', 633], ['Goomy', 704], ['Jangmo-o', 782]]);
const NAT_NAME = new Map(ALLSPECIES.map((sp) => [sp.nat, sp.name]));
export const isRecorded = (name) => ACQ.has(name) || PHENOM_BY_MON.has(name) || OUTBREAK_BY_MON.has(name) || EGG_BASES.has(name)
  || (WILD_BY_MON.get(name) || []).some((w) => WILD_BY_PLACE.has(w.place));
const viaMemo = new Map();
export const obtainable = (nat) => {
  if (viaMemo.has(nat)) return viaMemo.get(nat);
  viaMemo.set(nat, false);
  const name = NAT_NAME.get(nat);
  const ok = (name ? isRecorded(name) : false) || (EVO_TO.get(nat) || []).some((e) => obtainable(e.fromNat));
  viaMemo.set(nat, ok); return ok;
};
/* the pre-evolutions you can actually reach, with how to evolve them */
export const evolveFrom = (nat) => (EVO_TO.get(nat) || []).filter((e) => obtainable(e.fromNat));
export const placeSlug = (name) => slug(name);
export const placePath = (name) => href(`places/${placeSlug(name)}/`);
const NAMED = new Set(PLACES.map((p) => p.name));
export const EXTRA_P = WILDAT.filter((w) => !NAMED.has(w.place)).map((w) => ({ name: w.place, kind: 'Area', built: true, extra: true }));
export const ALL_PLACES = [...PLACES, ...EXTRA_P];
export const REACHABLE = ALL_PLACES.filter((p) => p.built);
export const TOWNS = REACHABLE.filter((p) => p.kind === 'City' || p.kind === 'Town');
export const ROUTES_P = REACHABLE.filter((p) => p.kind === 'Route');
export const OTHER_P = REACHABLE.filter((p) => !['City', 'Town', 'Route'].includes(p.kind));
export const UNBUILT_P = PLACES.filter((p) => !p.built);
export const hasContent = (p) => WILD_BY_PLACE.has(p.name) || GYM_AT.has(p.name)
  || PHENOM_BY_PLACE.has(p.name) || OUTBREAK_BY_PLACE.has(p.name) || LOCATION_NOTES.has(p.name) || !!PLACE_SHOTS[p.name] || ITEMS_AT(p.name).length > 0;
export const LISTED = REACHABLE.filter(hasContent);

/* ---------- gifts and trades ------------------------------------- */
export const CARDS = [
  { title: 'Your contribution is very important', date: null, species: 'Beldum',
    body: 'Your contribution in the development or promotion of Pokémon Light Platinum DS is essential for this game. As token of appreciation, please accept this Mystery Gift.',
    note: 'A shiny Beldum — and it stays shiny through Metang and Metagross.' },
  { title: 'PokeHacking Online Club', date: null, species: 'Porygon',
    body: 'Welcome to the PokeHacking Online Club! You have successfully linked your Pokémon Light Platinum DS game to your PokeHacking account. Accept this PORYGON as a gift.' },
  { title: 'Heartfelt thank you!', date: 'April 2026', species: 'Shaymin', body: 'Thank you very much for playing Pokémon Light Platinum DS!' },
  { title: 'The Professor Sycamore Pokémon!', date: 'May 2026', species: ['Chespin', 'Fennekin', 'Froakie'],
    body: 'Raise the starter Pokémon of the Kalos region! Check the Pokémon on the GTS and get them all.',
    note: 'One of the three, at random — only one per player.' },
  { title: 'Secrets beneath the sand…', date: 'May 2026', species: 'Klink', body: 'This rare Pokémon has emerged from an ancient mechanism in the desert ruins.' },
  { title: 'A secret map…', date: 'June 2026', species: 'Jirachi',
    body: 'Travel to Desire Island to encounter a very special Pokémon! Be sure to save your game after you pick up the Old Sea Map at a Poké Mart.' },
  { title: 'The Champions’ Dragonite', date: 'July 2026', species: 'Dragonite',
    body: 'This Dragonite is celebrating! Accept this Pokémon as a commemoration of the Spain National Team’s victory in the 2026 FIFA World Cup.',
    note: 'Dragonite is in the regional dex — this card is an extra way to get one.' },
  { title: 'The hunt for Shiny Pokémon', date: 'August 2026', species: null,
    body: 'With the COLOR CATCHER MEDAL equipped, you will be more likely to encounter Shiny Pokémon during your adventure. These Pokémon are very valuable and rare to obtain!',
    gives: 'The Color Catcher Medal.', medal: 'Color Catcher', note: 'A medal, not a Pokémon — equip it and shinies turn up more often while it is on.' },
  { title: 'A dragon egg…', date: 'September 2026', species: ['Dragonite', 'Salamence', 'Garchomp', 'Hydreigon', 'Goodra', 'Kommo-o'],
    body: 'This rare dragon egg has appeared in the depths of Mt. Shuem! What Pokémon will hatch from it?',
    gives: 'An Egg from one of six Dragon lines:',
    note: 'Which line you get is not fixed, so hatch it before you plan a team around it.' },
];
export const TRADES = trades;
export const TRADE_ITEMS = TRADES.filter((t) => t.item).length;
