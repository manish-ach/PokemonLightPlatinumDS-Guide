/* Reliquary demo generator.
   Content comes from the user's own project: data/seed.json (270 entries) and
   static/pictures (163 assets). Nothing here is invented. */
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const BUILD = process.env.BUILD_ID || 'dev';

const SEED = JSON.parse(readFileSync(join(OUT, 'seed.json'), 'utf8'));
/* real pixel dimensions for every asset, so every <img> ships intrinsic
   width/height and screenshots cannot shift layout as they decode */
const DIMS = JSON.parse(readFileSync(join(OUT, 'shotdims.json'), 'utf8'));
const MEDALDATA = JSON.parse(readFileSync(join(OUT, 'medals.json'), 'utf8'));
const SPECIES = JSON.parse(readFileSync(join(OUT, 'species.json'), 'utf8'));

/* Real acquisition data, from the seed. Group entries expand to their members. */
const STARTERS = {
  'Kanto Starters': ['Bulbasaur', 'Charmander', 'Squirtle'],
  'Hoenn Starters': ['Treecko', 'Torchic', 'Mudkip'],
  'Sinnoh Starters': ['Turtwig', 'Chimchar', 'Piplup'],
};
const ACQ = new Map();
for (const e of SEED.entries.filter(x => x.section === 'acquisition')) {
  const names = STARTERS[e.name] || [e.name.replace(/\s*\(Egg\)|\s*Egg$/, '').trim()];
  for (const n of names) ACQ.set(n, { method: e.data.method || '', location: e.data.location || '' });
}
/* Anything obtainable that the regional dex does not list — Mystery Gift and
   the like. Derived, not asserted: it is exactly the acquisition species that
   are absent from the 587. */
const NONDEX = JSON.parse(readFileSync(join(OUT, 'nondex.json'), 'utf8'));
/* Alolan forms share their base species' Zhery dex number, so they are a
   variant view of an existing entry — not extra entries. */
const ALOLAN = JSON.parse(readFileSync(join(OUT, 'alolan.json'), 'utf8'));
const ALOLAN_BY_BASE = new Map(ALOLAN.map(a => [a.base, a]));
for (const a of ALOLAN) ACQ.set(a.name, { method: a.method, location: a.location });
for (const g of NONDEX) if (g.method) ACQ.set(g.name, { method: g.method, location: g.location });
const GIFTED = NONDEX.filter(g => g.gift);
/* A gift species that IS in the regional dex — the card is an extra way to get
   it, not a separate entry. */
ACQ.set('Dragonite', { method: 'Mystery Gift — "The Champions\u2019 Dragonite"',
  location: 'Commemorates Spain\u2019s 2026 FIFA World Cup win' });
const ALLSPECIES = [...SPECIES, ...NONDEX];
const spPage = (sp) => sp.reg ? `sp-${sp.reg}.html` : `sp-nd-${sp.nat}.html`;
const FULLDEX = JSON.parse(readFileSync(join(OUT, 'dex.json'), 'utf8'));
const ITEMS = JSON.parse(readFileSync(join(OUT, 'items.json'), 'utf8'));
const DEXN = FULLDEX.length;
const ANCHORS = [1, 100, 200, 300, 400, 500, DEXN];
const HAS_DATA = new Set([41, 66, 447, 200, 54, 129]);

const bySection = s => SEED.entries.filter(e => e.section === s);
const LOCATIONS = bySection('locations');
const ROUTES = bySection('routes');
const MEDALS = bySection('medals');

const SPRITE = (id, shiny) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.png`;
const TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison',
  'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- the Ring ------------------------------------------ */
function ring({ n, done = [], here = -1, cls = '', gap = 6, w = 14, draw = false } = {}) {
  const r = 200, C = 2 * Math.PI * r, seg = C / n, dash = seg - gap;
  const segs = Array.from({ length: n }, (_, i) => {
    const state = done.includes(i) ? 'is-done' : i === here ? 'is-here' : '';
    return `<circle class="seg ${state}" cx="220" cy="220" r="${r}" stroke-width="${w}"
      stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}"
      stroke-dashoffset="${(-i * seg).toFixed(2)}" style="--i:${i}"/>`;
  }).join('\n      ');
  return `<svg class="ring ${cls} ${draw ? 'ring--draw' : ''}" viewBox="0 0 440 440" aria-hidden="true">
      ${segs}
      <circle class="hub" cx="220" cy="220" r="${r - 30}" stroke-width="1"/>
    </svg>`;
}

const plate = (t, sm = false) =>
  `<span class="plate p-${t}${sm ? ' plate--sm' : ''}">${cap(t)}</span>`;

/* in-game screenshot on a platinum mount */
const opt = src => 'pictures/opt/' + src.replace(/\.[^.]+$/, '').replace(/\//g, '__');
const shot = (src, title, place) => {
  const [w, h] = DIMS[src] || [4, 3];
  return `
      <figure class="shot">
        <picture>
          <source type="image/webp" sizes="(max-width: 700px) 92vw, min(640px, 46vw)"
            srcset="${opt(src)}-640.webp 640w, ${opt(src)}-1280.webp 1280w">
          <img src="pictures/${src}" width="${w}" height="${h}"
            alt="${esc(title)} — in-game screenshot taken at ${esc(place)}" loading="lazy" decoding="async">
        </picture>
        <figcaption><b>${esc(title)}</b><span>${esc(place)}</span></figcaption>
      </figure>`;
};

/* ---------- in-game captures, mapped to what they show --------
   Filenames in the source project are irregular ("EveStone", "HearScale",
   "Groment" vs the seed's "Gromet"), so this map is written out explicitly
   rather than derived — every pairing below was checked against both the
   file list and the entry names. An item can have several captures. */
const ITEM_SHOTS = {
  'Big Pearl':      [['ItemLocations/BigPearlMine.jpeg', 'Gromet Mine']],
  'Bright Powder':  [['ItemLocations/BrightPowderROute412.jpeg', 'Route 412']],
  'Deep Sea Tooth': [['ItemLocations/DeepSeaToothPanotemIslands.jpeg', 'Panotem Islands — by Surf']],
  'Dragon Scale':   [['ItemLocations/DragonScaleRoute409.jpg', 'Route 409']],
  'Electirizer':    [['ItemLocations/ElectrizerMines.jpeg', 'Gromet Mine']],
  'Everstone':      [['ItemLocations/EveStoneRoute412.jpeg', 'Route 412']],
  'Heart Scale':    [['ItemLocations/HearScaleMines.jpeg', 'Gromet Mine']],
  'Lax Incense':    [['ItemLocations/LaxIncenseDarduskTower.jpeg', 'Darkdusk Tower']],
  'Life Orb':       [['ItemLocations/LifeOrbMines.jpeg', 'Gromet Mine']],
  'Magmarizer':     [['ItemLocations/MagmarizerMt.Shuem.jpeg', 'Mt. Shuem']],
  'Master Ball':    [['ItemLocations/MasterBallGromentMuseum.jpeg', 'Gromet City — Museum']],
  'Moon Stone':     [['ItemLocations/MoonStoneDardusk.jpg', 'Darkdusk City']],
  'Quick Claw':     [['ItemLocations/QuickClawYellowTown.jpeg', 'Yellow Town']],
  'Rare Candy':     [['ItemLocations/RareCandiesRoute403.jpeg', 'Route 403'],
                     ['ItemLocations/RareCandiesRoute409.jpg', 'Route 409'],
                     ['ItemLocations/RareCandiesLake.jpg', 'Marfeney Lake'],
                     ['ItemLocations/RareCandiesMine.jpeg', 'Gromet Mine'],
                     ['ItemLocations/RareCandiesMtIceStorm.jpg', 'Mt. Ice Storm']],
  'Razor Fang':     [['ItemLocations/RazorFangDarduskCaveOutside.jpeg', 'Darkdusk Cave — outside']],
  'Sail Fossil':    [['ItemLocations/SailOrJawFossilRoute412.jpeg', 'Route 412 — the choice']],
  'Jaw Fossil':     [['ItemLocations/SailOrJawFossilRoute412.jpeg', 'Route 412 — the choice']],
  'Shiny Stone':    [['ItemLocations/ShinyStoneMtIceStorm.jpg', 'Mt. Ice Storm']],
  'Thick Club':     [['ItemLocations/ThickClubRoute412.jpeg', 'Route 412 — eastern ledges']],
  'Water Stone':    [['ItemLocations/WaterStoneMtIceStorm.jpg', 'Mt. Ice Storm'],
                     ['ItemLocations/waterstoneMines.jpeg', 'Gromet Mine']],
  'Wide Lens':      [['ItemLocations/WideLensRoute407PossibleItemfromtrashcleanergirl.jpeg', 'Route 407 — trash-cleaner girl']],
  'Dungeon Key':    [['SpecialItem/DungeonKeyDarduskTower.jpeg', 'Darkdusk Tower']],
  "King's Rock":    [['ItemLocations/KingsRockSunPalace1F.png', 'Sun Palace — first floor']],
  'Sun Stone':      [['ItemLocations/SunStoneSunPalace1F.png', 'Sun Palace — first floor']],
  'Ice Stone':      [['SpecialLocations/FeebasMtIceStorm.jpg', 'Mt. Ice Storm — the Feebas fishing room']],
  'Gracidea':       [['SpecialItem/GracediaEsmeraldBotanicalGarden.jpeg', 'Esmerald City — Botanical Garden']],
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
  TM65: ['Tm/TM65ShadowClawDarduskForest.jpg', 'Darkdusk Forest'],
  TM70: ['Tm/TM70FlashGromentCIty.jpeg', 'Gromet City'],
  TM74: ['Tm/TM74GyroBallMine.jpeg', 'Gromet Mine'],
  TM80: ['Tm/TM80RockSlidePantemCave.jpeg', 'Pantem Cave'],
  TM86: ['Tm/TM86GrassKnotRoute410.jpg', 'Route 410'],
};
/* a capture taken at each place — the caption always names what it actually shows */
/* Notes that belong to a place but are not in the seed. */
const PLACE_EXTRA = {
  'Panotem Islands': 'The only place the Alolan forms appear.',
};
const PLACE_SHOTS = {
  'Yellow Town':     ['ItemLocations/QuickClawYellowTown.jpeg', 'Quick Claw pickup'],
  'Esmerald City':   ['SpecialItem/GracediaEsmeraldBotanicalGarden.jpeg', 'Gracidea — Botanical Garden'],
  'Darkdusk City':   ['ItemLocations/MoonStoneDardusk.jpg', 'Moon Stone'],
  'Seanport City':   ['SpecialLocations/SeanPortGymLeaderPanotem.jpg', 'Gym Leader'],
  'Gromet City':     ['ItemLocations/MasterBallGromentMuseum.jpeg', 'Master Ball — Museum'],
  'Panotem Islands': ['ItemLocations/DeepSeaToothPanotemIslands.jpeg', 'Deep Sea Tooth by Surf'],
  'Mt. Ice Storm':   ['SpecialLocations/FeebasMtIceStorm.jpg', 'the Feebas room — also where the Ice Stone sits'],
  'Mt. Shuem':       ['ItemLocations/MagmarizerMt.Shuem.jpeg', 'Magmarizer'],
  'Sun Ruins':       ['Pokemons/VolcaronaEggSunPalace.jpeg', 'Volcarona egg — Sun Palace'],
  'Gromet Mine':     ['SpecialItem/LustrousStoneMines.jpeg', 'Lustrous Stone'],
  'Foongus Swamp':   ['SpecialLocations/CutQuestShroomishFoongusSwamp.png', 'the Shroomish needed for HM01 Cut'],
};
const shotsFor = i => i.kind === 'machine'
  ? (TM_SHOTS[i.tm] ? [TM_SHOTS[i.tm]] : [])
  : (ITEM_SHOTS[i.name] || []);
const SHOTTED = ITEMS.filter(i => shotsFor(i).length).length;


const itemRow = (name, where, icon) => `
        <li class="itemrow">
          <span class="itemrow__icon">${icon
            ? `<img src="pictures/items/${icon}" alt="" width="30" height="30" loading="lazy">`
            : `<i aria-hidden="true"></i>`}</span>
          <span class="itemrow__name">${esc(name)}</span>
          <span class="itemrow__where">${esc(where)}</span>
        </li>`;

/* ---------- chrome -------------------------------------------- */
const head = (title) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Light Platinum DS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Eczar:wght@600;700&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles/tokens.css?v=${BUILD}">
<link rel="stylesheet" href="styles/app.css?v=${BUILD}">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<p class="demo-note"><strong>Development in progress.</strong></p>`;

const masthead = (cur) => `
<header class="masthead">
  <div class="masthead__in">
    <a class="brand" href="index.html">
      <span class="brand__mark">${ring({ n: 15, done: [0,1,2,3,4,5], here: 6, w: 34, gap: 14, cls: 'ring--brand' })}</span>
      Light Platinum <em>DS</em>
    </a>
    <nav class="nav">
      <a href="chapter.html"${cur === 'walk' ? ' aria-current="page"' : ''}>Walkthrough</a>
      <a href="dex.html"${cur === 'dex' ? ' aria-current="page"' : ''}>Dex</a>
      <a href="items.html"${cur === 'items' ? ' aria-current="page"' : ''}>Items</a>
      <a href="medals.html"${cur === 'medals' ? ' aria-current="page"' : ''}>Medals</a>
      <a href="sunpalace.html"${cur === 'sun' ? ' aria-current="page"' : ''}>Sun Palace</a>
      <a href="gifts.html"${cur === 'gifts' ? ' aria-current="page"' : ''}>Mystery Gift</a>
      <a href="patch.html"${cur === 'patch' ? ' aria-current="page"' : ''}>How to patch</a>
    </nav>
    <div class="tools">
      <button class="iconbtn" type="button" data-theme-toggle aria-label="Switch theme"><span data-theme-label>Dark</span></button>
    </div>
  </div>
</header>`;

const foot = `
<footer class="foot shell">
  <p>A fan guide to <strong>Pokémon Light Platinum DS</strong>. Not affiliated with Nintendo, Game Freak or The Pokémon Company.<br>
     Screenshots are the author's own captures. Species sprites via <a href="https://github.com/PokeAPI/sprites">PokeAPI</a>.</p>
  <p><a href="#">Setup &amp; patching</a></p>
</footer>
<script src="app.js?v=${BUILD}"></script>
</body></html>`;

/* ---------- 1. threshold -------------------------------------- */
const index = `${head('Guide')}
${masthead('home')}
<main id="main">
  <section class="threshold">
    <div class="threshold__stack">
      <div class="threshold__ring">
        <span class="threshold__window">
          <picture>
            <source type="image/webp" sizes="min(60vw, 420px)"
              srcset="pictures/opt/arceusbanner-640.webp 640w, pictures/opt/arceusbanner-1280.webp 1280w">
            <img src="pictures/arceusbanner.jpg" alt="Arceus, the Original One, ringed in gold" fetchpriority="high">
          </picture>
        </span>
        ${ring({ n: 15, done: [0,1,2,3,4,5], here: 6, draw: true, w: 18, gap: 7 })}
      </div>
      <h1 class="wordmark">Light Platinum<small>ZHERY REGION · DS</small></h1>
      <p class="threshold__lede">Every route, every pickup, every place this hack quietly stops
        behaving like Platinum — with a screenshot of the spot, not just a sentence about it.</p>
      <div class="threshold__acts">
        <a class="btn btn--primary" href="chapter.html">Continue — Route 412</a>
        <a class="btn btn--ghost" href="dex.html">Open the Dex</a>
      </div>
      <p class="threshold__resume">7 of 15 locations visited · 12 routes · ${MEDALS.length} medals</p>
    </div>
  </section>

  <section class="shell region">
    <div class="region__map">
      <div class="mount">
        <div class="mount__head">The Zhery region <span>in-game town map</span></div>
        <img class="townmap" src="pictures/MainMap.png" alt="The in-game town map of the Zhery region" width="774" height="580" loading="lazy">
      </div>
    </div>
    <div class="region__body">
      <h2>The region</h2>
      <p>Fifteen named places and twelve routes, from your seed data. The walkthrough
        order is not authored yet, so these are listed as recorded rather than as a sequence.</p>
      <ol class="spine__list">
        ${LOCATIONS.map((l, i) => {
          const state = i < 6 ? 'done' : i === 6 ? 'here' : 'todo';
          const sh = PLACE_SHOTS[l.name];
          return `<li class="spine__row is-${state}">
          <a href="${i === 6 ? 'chapter.html' : '#'}">
            <span class="chip" aria-hidden="true"></span>
            <span class="spine__thumb">${sh
              ? `<picture>
                   <source type="image/webp" srcset="${opt(sh[0])}-640.webp">
                   <img src="pictures/${sh[0]}" width="${(DIMS[sh[0]] || [4,3])[0]}" height="${(DIMS[sh[0]] || [4,3])[1]}" alt="${esc(l.name)} — ${esc(sh[1])}" loading="lazy" decoding="async">
                 </picture>`
              : '<i aria-hidden="true"></i>'}</span>
            <span class="spine__title">${esc(l.name)}</span>
            <span class="spine__region">${esc(l.data.kind || '')}</span>
            <span class="spine__note">${esc(l.data.notes || '')}${
              PLACE_EXTRA[l.name] ? ` <b>${esc(PLACE_EXTRA[l.name])}</b>` : ''}${
              sh ? ` <em>· pictured: ${esc(sh[1])}</em>` : ''}</span>
          </a>
        </li>`;
        }).join('\n        ')}
      </ol>
    </div>
  </section>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;

/* ---------- 2. chapter — Route 412 ---------------------------- */
const R412 = SEED.entries.filter(e => JSON.stringify(e).includes('412') && e.section !== 'routes');
const icon = n => (SEED.entries.find(e => e.name === n && e.image) || {}).image?.split('/').pop();

const chapter = `${head('Route 412')}
${masthead('walk')}
<main id="main" class="shell">
  <header class="opener">
    <div class="opener__ring">${ring({ n: 6, done: [0, 1], here: -1, w: 26, gap: 10 })}</div>
    <div>
      <h1>Route 412</h1>
      <div class="opener__meta">
        <span>${R412.length} recorded pickups</span><span>·</span>
        <span><strong style="color:var(--jade)">6</strong> with a screenshot</span><span>·</span>
        <span>Berry tree: Sitrus, Ganlon</span>
      </div>
    </div>
    <div class="opener__rule"></div>
  </header>

  <div class="chapter">
    <div class="column">
      <p>Route 412 is the densest pickup route recorded so far — six of its ${R412.length}
        recorded pickups have a capture showing the exact tile. Work the eastern ledges first;
        the fossil choice is one-time and the Everstone is easy to walk past.</p>

      <h2 id="ledges">The eastern ledges</h2>
      <p>Thick Club sits behind the first ledge drop. It is a Marowak item, so it is worth
        collecting even if you have no Cubone yet.</p>
      ${shot('ItemLocations/ThickClubRoute412.jpeg', 'Thick Club', 'Route 412 — eastern ledges')}

      <div class="call call--missable">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2 17 16H1L9 2Z"/><path d="M9 7v4"/><path d="M9 13.5v.5"/></svg>
        <div><b>Missable — Sail Fossil or Jaw Fossil</b>
          <p>You are offered one of the two and cannot return for the other on this save.
            Jaw Fossil gives Tyrunt; Sail Fossil gives Amaura.</p>
          <p><b class="warn">Timed.</b> Talking to him starts a <b>one-day countdown</b>. He
            wants a drink — hand over a <b>Lemonade</b>, <b>Fresh Water</b> or <b>Soda Pop</b>
            before the day is out. Let it lapse and he leaves with both fossils.
            Buy the drink <em>before</em> you talk to him.</p></div>
      </div>
      ${shot('ItemLocations/SailOrJawFossilRoute412.jpeg', 'Sail / Jaw Fossil', 'Route 412 — the choice')}

      <h2 id="tms">TMs on the route</h2>
      <p>TM37 Sandstorm is a field pickup. TM05 Roar is held by the Ace Trainer (F) and only
        changes hands after you beat her.</p>
      <div class="shots">
        ${shot('Tm/TM37SandstormRoute412.jpeg', 'TM37 Sandstorm', 'Route 412')}
        ${shot('Tm/TM05RoarRoute412.jpeg', 'TM05 Roar', 'Ace Trainer (F) · Route 412')}
      </div>

      <h2 id="held">Held items worth the detour</h2>
      <p>Bright Powder and the Everstone are both on this route. The Everstone matters more
        than usual here — several evolution levels differ from vanilla Platinum.</p>
      <div class="shots">
        ${shot('ItemLocations/BrightPowderROute412.jpeg', 'Bright Powder', 'Route 412')}
        ${shot('ItemLocations/EveStoneRoute412.jpeg', 'Everstone', 'Route 412')}
      </div>

      <div class="objectives">
        <label class="obj"><input type="checkbox" checked><span class="obj__text">Thick Club — eastern ledges</span></label>
        <label class="obj"><input type="checkbox" checked><span class="obj__text">Pick your fossil (one only)</span></label>
        <label class="obj"><input type="checkbox"><span class="obj__text">TM37 Sandstorm</span></label>
        <label class="obj"><input type="checkbox"><span class="obj__text">Beat Ace Trainer (F) for TM05 Roar</span></label>
        <label class="obj"><input type="checkbox"><span class="obj__text">Bright Powder and Everstone</span></label>
        <label class="obj"><input type="checkbox"><span class="obj__text">Harvest the Sitrus / Ganlon tree</span></label>
      </div>
    </div>

    <aside class="rail" aria-label="Route context">
      <p class="rail__label">Route 412 — every pickup</p>
      <div class="mount">
        <div class="mount__head">Items <span>${R412.length} recorded</span></div>
        <ul class="itemlist">
          ${R412.map(e => itemRow(
            e.data.tm ? `${e.data.tm} ${e.name}` : e.name,
            e.data.location || e.data.berries || '—',
            (e.image || '').split('/').pop())).join('')}
        </ul>
      </div>
      <div class="mount">
        <div class="mount__head">Types you'll want</div>
        <div class="plates">${['ground','rock','water'].map(t => plate(t)).join('')}</div>
      </div>
      <a class="nextup" href="medals.html"><em>Also on this route</em><strong>No medal here</strong></a>
    </aside>
  </div>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;

/* ---------- 3. medals — the loadout ---------------------------
   Costs are in medal energy and a gym badge grants 3, so the whole set (83)
   is far beyond any realistic pool. The cost column is a budget, which makes
   this a planner rather than a list. */
const MEDAL_SHOTS = {
  'Antidote':          ['Medals/AntidoteMedalRoute403.jpeg', 'Route 403 — behind Cut'],
  "Catch 'Em All":     ['Medals/CatchEmAllNationalPark.jpg', 'National Park'],
  'Dowsing':           ['Medals/DowsingMedalMtIceStorm.jpeg', 'Mt. Ice Storm'],
  'Exp For All':       ['Medals/ExpForAllMossSpring.jpeg', 'Mass Spring Cave · Route 404'],
  'Fog Lamp':          ['Medals/FogLampMarphenyLake.jpg', 'Marfeney Lake — Rock Smash'],
  'Fountain of Youth': ['Medals/FountainOfYouthMedalMine.jpeg', 'Gromet Mine — minecart'],
  'Phenomenal':        ['Medals/PhenomenaEnermyTown.jpeg', 'Enemy Town'],
  'Clairvoyant':       ['Medals/ClairvoyantSunPalaceTopFloor.png', 'Sun Palace — top floor, far end'],
  'Rockbreaker Feet':  ['Medals/RockbreakerFeetMine.png', 'Gromet Mine'],
  'Second Chance':     ['Medals/SecondChanceFoongusSwamp.png', 'Foongus Swamp'],
  'Super Lure':        ['Medals/SuperLureSeanport.png', 'Seanport City'],
};
/* Vendor captures, per medal. Kept apart from MEDAL_SHOTS: one shows the
   medal being found in the world, the other shows the counter it is sold at,
   and conflating the two would overstate how much is actually documented. */
const PRIZE = ['Shops/PrizeExchangeCentral.png', 'Prize Exchange Center, Central City'];
const MART1 = ['Shops/SpecialMartSeanport-1.png', 'Special Mart, Seanport City — first page'];
const MART2 = ['Shops/SpecialMartSeanport-2.png', 'Special Mart, Seanport City — second page'];
const MEDAL_BUY_SHOTS = {
  'Money+': PRIZE, 'Experience +': PRIZE, 'Effort+': PRIZE, 'Friendship+': PRIZE,
  'Farmer': MART1, 'Berrylogist': MART1, 'Incubator': MART1,
  'Baby Sitter': MART1, 'Super Learner': MART1, 'Item Holder': MART1,
  'Miner': MART2, 'Treasure Hunter': MART2, 'Simplification': MART2, 'Complication': MART2,
};

/* Where the bought medals are actually sold. */
const MEDAL_SHOPS = [
  ['Shops/PrizeExchangeCentral.png', 'Prize Exchange Center, Central City — paid in Coins'],
  ['Shops/SpecialMartSeanport-1.png', 'Special Mart, Seanport City — first page'],
  ['Shops/SpecialMartSeanport-2.png', 'Special Mart, Seanport City — second page'],
];
/* Match icons on a normalised key (lowercase, alphanumerics only) so casing
   and punctuation cannot break the join — "Fountain of Youth" vs
   "FountainOfYouth.png" did exactly that. Two files carry typos in the source
   folder and are aliased explicitly. */
const ICON_FILES = readdirSync(join(OUT, 'pictures/MedalIcons')).filter(f => f.endsWith('.png'));
const normKey = x => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const ICON_BY_KEY = new Map(ICON_FILES.map(f => [normKey(f.replace(/\.png$/, '')), f]));
const ICON_ALIAS = { 'Second Chance': 'seconchance', 'Treasure Hunter': 'treaasurehunter' };
const iconFile = (name) => ICON_BY_KEY.get(ICON_ALIAS[name] || normKey(name)) || null;
const medalIcon = (m) => {
  const f = iconFile(m.name);
  return f
    ? `<img src="pictures/MedalIcons/${f}" alt="" width="44" height="44" loading="lazy">`
    : `<i aria-hidden="true"></i>`;
};

const TOTAL_ENERGY = MEDALDATA.reduce((t, m) => t + m.cost, 0);
const MEDAL_SHOTTED = MEDALDATA.filter(m => MEDAL_SHOTS[m.name]).length;
const FREE = MEDALDATA.filter(m => m.cost === 0).length;
const NO_ICON = MEDALDATA.filter(m => !iconFile(m.name));

const medalDetail = (m) => {
  const sh = MEDAL_SHOTS[m.name];
  const buy = MEDAL_BUY_SHOTS[m.name];
  return `
        <div class="detail__sprite medal__sprite">${medalIcon(m)}</div>
        <div class="detail__head"><h3>${esc(m.name)}</h3>
          <p><span class="energy">${m.cost === 0 ? 'Free' : m.cost + ' energy'}</span></p></div>
        <p class="detail__effect">${esc(m.desc)}</p>
        <p class="detail__label">Where to get it</p>
        <ul class="detail__locs"><li>${m.source && m.source.trim() !== '—'
          ? esc(m.source) : '<span class="undoc">Not yet documented</span>'}</li></ul>
        ${sh ? `<p class="detail__label">Seen in game</p>
        <div class="detail__shots">${shot(sh[0], m.name + ' Medal', sh[1])}</div>` : ''}
        ${buy ? `<p class="detail__label">At the counter</p>
        <div class="detail__shots">${shot(buy[0], m.name + ' — on sale', buy[1])}</div>` : ''}`;
};

/* A real table: number, icon, name, effect, energy. Every cell left-aligned.
   The row opens a dialog carrying the source and the in-game capture — that
   detail belongs in the modal, not stacked under the table. */
const medalRow = (m, idx) => `
            <tr class="medalrow" data-idx="${idx}"
                data-name="${esc((m.name + ' ' + m.desc + ' ' + m.source).toLowerCase())}">
              <td class="mcol-sn">${String(idx + 1).padStart(2, '0')}</td>
              <td class="mcol-ico">${medalIcon(m)}</td>
              <td class="mcol-nm"><a href="#medal-${idx}">${esc(m.name)}</a></td>
              <td class="mcol-ds">${esc(m.desc)}</td>
              <td class="mcol-en">${m.cost === 0 ? '<em>free</em>' : m.cost}</td>
              <td class="mcol-go">${MEDAL_SHOTS[m.name] || MEDAL_BUY_SHOTS[m.name]
                ? `<span class="bagtile__cam" title="${MEDAL_SHOTS[m.name] ? 'Has an in-game capture' : 'Shown at the counter'}">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 5.5h3l1-1.5h4l1 1.5h3v7H2v-7Z"/><circle cx="8" cy="9" r="2.2"/></svg>
                    <span class="vh">Has an in-game capture</span></span>` : ''}
                <span class="medalrow__go" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>
                </span></td>
            </tr>`;

const medals = `${head('Medals')}
${masthead('medals')}
<main id="main" class="shell">
  <header class="opener" style="border-bottom:0;margin-bottom:0;padding-bottom:var(--s4)">
    <div class="opener__ring" style="width:72px;height:72px">${ring({ n: MEDALDATA.length, done: [...Array(MEDAL_SHOTTED).keys()], here: -1, w: 30, gap: 4 })}</div>
    <div>
      <h1>${MEDALDATA.length} medals</h1>
      <div class="opener__meta">
        <span><strong style="color:var(--jade)">${MEDAL_SHOTTED}</strong> found in the world</span><span>·</span>
        <span><strong style="color:var(--jade)">${Object.keys(MEDAL_BUY_SHOTS).length}</strong> shown at the counter</span>${
        NO_ICON.length ? `<span>·</span>
        <span style="color:var(--ember)"><strong>${NO_ICON.length}</strong> without an icon</span>` : ''}
      </div>
    </div>
  </header>

  <p class="medalnote">Medals are toggled on and off in the <b>Trainer Card</b>. Each gym badge
    grants <b>3 medal energy</b> to spend on the ones you keep active.</p>

  <div class="bag" id="medalbag" data-label="Medals">
    <div class="table-wrap">
      <table class="data medaltable">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Medal</th>
            <th scope="col">Name</th>
            <th scope="col">Effect</th>
            <th scope="col">Energy</th>
            <th scope="col"><span class="vh">Open details</span></th>
          </tr>
        </thead>
        <tbody>${MEDALDATA.map(medalRow).join('')}
        </tbody>
      </table>
    </div>

    <div class="detailsources">
      ${MEDALDATA.map((m, idx) => `<article class="detailsource mount detail" id="medal-${idx}">
        ${medalDetail(m)}
      </article>`).join('\n      ')}
    </div>
  </div>

  <section class="vendors">
    <h2>Where the bought ones are sold</h2>
    <p>Four are Coins at the Prize Exchange Center in Central City. Ten more are cash at the
      Special Mart in Seanport City, across two pages.</p>
    <div class="shots">
      ${MEDAL_SHOPS.map(([f, cap]) => shot(f, 'Medal vendor', cap)).join('')}
    </div>
  </section>

  <dialog class="modal" id="itemmodal">
    <div class="modal__bar">
      <p class="modal__pocket" id="modalpocket"></p>
      <button type="button" class="modal__close" data-close aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail" id="modalbody"></div>
  </dialog>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;

/* ---------- 4. dex -------------------------------------------- */
const tiles = ALLSPECIES.map((sp) => {
    const al = ALOLAN_BY_BASE.get(sp.name);
    const data = al ? ` data-alolan="1" data-al-name="${esc(al.name)}" data-al-nat="${al.nat}"` +
      ` data-al-href="sp-al-${al.nat}.html"` +
      ` data-al-plates="${esc(al.types.map(t => plate(t, true)).join(''))}"` : '';
    return `
    <a class="tile${ACQ.has(sp.name) ? ' has-data' : ''}${al ? ' has-alolan' : ''}"
       data-scope="${sp.reg ? 'dex' : 'nondex'}" href="${spPage(sp)}"${data}
       data-q="${esc((sp.name + ' ' + (al ? al.name + ' alolan' : '')).toLowerCase())}">
      <span class="tile__slot"><img src="${SPRITE(sp.nat, sp.shiny)}" alt="${sp.name}${sp.shiny ? ' (shiny)' : ''} front sprite" loading="lazy" width="68" height="68"></span>${
        sp.shiny ? '<span class="tile__shiny" title="Distributed shiny">★</span>' : ''}${
        al ? '<span class="tile__form" title="Has an Alolan form">A</span>' : ''}
      <span class="tile__no">${sp.reg ? String(sp.reg).padStart(3, '0') : '—'} <i>· nat ${sp.nat}</i></span>
      <span class="tile__name">${sp.name}</span>
      <span class="plates">${sp.types.map(t => plate(t, true)).join('')}</span>
    </a>`;
  }).join('');

const dex = `${head('Dex')}
${masthead('dex')}
<main id="main" class="shell">
  <header class="opener" style="border-bottom:0;margin-bottom:0;padding-bottom:var(--s6)">
    <div class="opener__ring" style="width:72px;height:72px">${ring({ n: 15, done: [0,1,2,3,4,5], here: 6, w: 22, gap: 8 })}</div>
    <div>
      <h1>${ALLSPECIES.length} species</h1>
      <div class="opener__meta">
        <span>Zhery regional order</span><span>·</span>
        <span><strong style="color:var(--jade)">${ACQ.size}</strong> with recorded acquisition data</span><span>·</span>
        <span style="color:var(--ember)"><strong>${ALLSPECIES.length - ACQ.size}</strong> still in progress</span>
      </div>
    </div>
  </header>

  <div class="dexbar">
    <div class="dexbar__row">
      <span class="dexbar__legend">Search</span>
      <span class="field"><input type="search" id="dexsearch" placeholder="Search by name or number…" aria-label="Search the dex"></span>
    </div>
    <div class="dexbar__row">
      <span class="dexbar__legend">In the dex</span>
      <span class="platefilters">
        <button class="plate p-normal scopefilter" type="button" data-scope="dex" aria-pressed="false">Regional dex <b>${SPECIES.length}</b></button>
        <button class="plate p-normal scopefilter" type="button" data-scope="nondex" aria-pressed="false">Not in the dex <b>${NONDEX.length}</b></button>
      </span>
    </div>
    <div class="dexbar__row">
      <span class="dexbar__legend">Forms</span>
      <span class="platefilters">
        <button class="plate p-normal scopefilter" type="button" data-alolan-toggle aria-pressed="false">Alolan forms <b>${ALOLAN.length}</b></button>
      </span>
    </div>
    <div class="dexbar__row">
      <span class="dexbar__legend">Type</span>
      <span class="platefilters">
        ${TYPES.map(t => `<button class="plate p-${t}" type="button" aria-pressed="false">${cap(t)}</button>`).join('\n        ')}
      </span>
    </div>
  </div>

  <p class="dexnote">The <b>${NONDEX.length}</b> species outside the regional dex are the
    <a href="gifts.html">Mystery Gift</a> Pokémon and everything they evolve into.
    <b>Alolan forms share their normal counterpart's dex number</b>, so they are a view of an
    existing entry rather than extra ones — ${ALOLAN.length} of them, all from Panotem Islands.</p>
  <p class="dexcount" role="status">Showing <output>${ALLSPECIES.length}</output> of ${ALLSPECIES.length} species</p>
  <div class="dexgrid">${tiles}</div>
  <p class="dexempty" hidden>Nothing matches those filters. <button type="button" class="linkbtn" data-dex-clear>Clear them</button>.</p>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;


/* ---------- 6. items — the Bag -------------------------------- */
/* The in-game Bag is seven colour-coded pockets, a grid, and a detail panel.
   That structure is adopted; the DS chrome is not. Pocket glyphs are authored
   here in the site's own line style rather than lifted from the ROM, and the
   seven pocket colours are harmonised onto one lightness the way the Plates are. */
const POCKETS = [
  { id: 'items',        label: 'Items',        hue: 350, c: 0.115, glyph:
    'M6 8V6.5A3 3 0 0 1 12 6.5V8M4 8h12l-1 9H5L4 8Z' },
  { id: 'medicine',     label: 'Medicine',     hue: 45,  c: 0.135, glyph:
    'M8 3h4v3l2 3v8H6V9l2-3V3ZM6 12h8' },
  { id: 'poke-balls',   label: 'Poké Balls',   hue: 85,  c: 0.140, glyph:
    'M3 10h5m4 0h5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z' },
  { id: 'machines',     label: 'TMs & HMs',    hue: 178, c: 0.100, glyph:
    'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM13.6 5.4 11 8' },
  { id: 'berries',      label: 'Berries',      hue: 128, c: 0.115, glyph:
    'M10 7.5c3 0 4.5 2 4.5 4.2A4.5 4.5 0 0 1 10 16a4.5 4.5 0 0 1-4.5-4.3C5.5 9.5 7 7.5 10 7.5Zm0 0V5m0 0c-1.6 0-2.8-.6-3.4-1.6C7.7 3 9 3.6 10 5Zm0 0c1.6 0 2.8-.6 3.4-1.6C12.3 3 11 3.6 10 5Z' },
  { id: 'battle-items', label: 'Battle items', hue: 258, c: 0.115, glyph:
    'M10 2.5l1.9 4.3 4.6.5-3.4 3.2.9 4.6L10 12.9l-4 2.2.9-4.6L3.5 7.3l4.6-.5L10 2.5Z' },
  { id: 'key-items',    label: 'Key items',    hue: 302, c: 0.105, glyph:
    'M12.5 3.5a4 4 0 1 0-2.6 7L8 12.4V14H6.4l-1.9 1.9v1.6h3l6-6a4 4 0 0 0-1-8ZM13 6.4v.01' },
];
const pocketOf = i => i.kind === 'tree' ? 'berries' : i.kind === 'machine' ? 'machines' : i.section;
/* Machines are the one pocket with an inherent order: TMs ascending, then HMs
   ascending. Everything else keeps the seed's order. */
const machineKey = (m) => {
  const tag = m.tm || '';
  const n = parseInt(tag.replace(/\D/g, ''), 10) || 0;
  return (tag.startsWith('HM') ? 1000 : 0) + n;
};
const inPocket = (id) => {
  const list = ITEMS.filter(i => pocketOf(i) === id);
  return id === 'machines' ? list.slice().sort((a, b) => machineKey(a) - machineKey(b)) : list;
};
const MATCHED = ITEMS.filter(i => i.matched).length;
const HACKEX  = ITEMS.filter(i => i.hackExclusive).length;
const TREES   = ITEMS.filter(i => i.kind === 'tree');

const glyph = p =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p.glyph}"/></svg>`;

const itemIcon = (i, size = 32) => i.sprite
  ? `<img src="${i.sprite}" alt="" width="${size}" height="${size}" loading="lazy">`
  : i.localIcon
    ? `<img src="pictures/items/${i.localIcon}" alt="" width="30" height="30" loading="lazy">`
    : `<i aria-hidden="true"></i>`;

const tileSprite = (i) => {
  if (i.kind === 'tree') {
    const b = i.berryList.find(b => b.sprite);
    return b ? `<img src="${b.sprite}" alt="" width="48" height="48" loading="lazy">` : '<i aria-hidden="true"></i>';
  }
  return i.sprite ? `<img src="${i.sprite}" alt="" width="48" height="48" loading="lazy">`
    : i.localIcon ? `<img src="pictures/items/${i.localIcon}" alt="" width="30" height="30" loading="lazy">`
    : '<i aria-hidden="true"></i>';
};

/* One tile = one thing you can hold. The tile is an anchor to a real detail
   block further down the page, so without JS it still goes somewhere useful;
   JS then intercepts it and opens the same content in a dialog. */
const bagTile = (i, idx) => `
          <li class="bagtile${i.hackExclusive ? ' is-exclusive' : ''}" data-idx="${idx}"
              data-name="${esc(((i.tm || '') + ' ' + i.name + ' ' + (i.effect || '') + ' ' + i.locations.join(' ')).trim().toLowerCase())}">
            <a class="bagtile__hit" href="#item-${idx}">
              <span class="bagtile__slot">${tileSprite(i)}${i.locations.length > 1
                ? `<span class="bagtile__spots">×${i.locations.length}</span>` : ''}${
                shotsFor(i).length ? `<span class="bagtile__cam" title="Has an in-game capture">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 5.5h3l1-1.5h4l1 1.5h3v7H2v-7Z"/><circle cx="8" cy="9" r="2.2"/></svg>
                  <span class="vh">Has an in-game capture</span></span>` : ''}</span>
              <span class="bagtile__name">${i.tm
                ? `<span class="bagtile__tm">${esc(i.tm)}</span>${esc(i.name)}`
                : esc(i.name)}</span>
            </a>
          </li>`;

const detailFor = (i) => {
  if (!i) return '';
  const gal = shotsFor(i);
  const gallery = gal.length ? `
        <p class="detail__label">${gal.length > 1 ? gal.length + ' captures' : 'Seen in game'}</p>
        <div class="detail__shots">${gal.map(([f, place]) => shot(f, i.tm ? `${i.tm} ${i.name}` : i.name, place)).join('')}</div>` : '';
  const locs = i.locations.length
    ? `<ul class="detail__locs">${i.locations.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`
    : `<p class="undoc">No location recorded.</p>`;
  if (i.kind === 'tree') return `
        <div class="detail__head"><h3>${esc(i.name)}</h3><p>${i.berryList.length} berries</p></div>
        <div class="detail__berries">${i.berryList.map(b => `<span class="berry${b.corrected ? ' is-corrected' : ''}">
          ${b.sprite ? `<img src="${b.sprite}" alt="" width="28" height="28">` : '<i></i>'}${esc(b.label)}${b.qty ? `<em>×${b.qty}</em>` : ''}</span>`).join('')}</div>`;
  if (i.kind === 'machine') return `
        <div class="detail__sprite">${itemIcon(i, 48)}</div>
        <div class="detail__head"><h3>${esc(i.tm || '')} ${esc(i.name)}</h3>
          <p>${i.moveType ? plate(i.moveType, true) : ''} <span>${esc(i.damageClass || '')}</span></p></div>
        <dl class="detail__stats">
          <div class="stat"><dt>Power</dt><dd>${i.power ?? '—'}</dd></div>
          <div class="stat"><dt>Accuracy</dt><dd>${i.accuracy ? i.accuracy + '%' : '—'}</dd></div>
          <div class="stat"><dt>PP</dt><dd>${i.pp ?? '—'}</dd></div>
        </dl>
        <p class="detail__effect">${esc(i.effect || 'No effect recorded.')}</p>
        <p class="detail__label">Where</p>${locs}${gallery}`;
  return `
        <div class="detail__sprite">${itemIcon(i, 48)}</div>
        <div class="detail__head"><h3>${esc(i.name)}</h3>
          <p>${i.category ? esc(i.category) : i.hackExclusive ? 'hack-exclusive' : ''}</p></div>
        <p class="detail__effect">${i.hackExclusive
          ? 'No PokeAPI entry for this item.' + (i.note ? ' ' + esc(i.note) : '')
          : esc(i.effect || 'No effect recorded.')}</p>
        ${i.flavor && !i.hackExclusive ? `<p class="detail__flavor">${esc(i.flavor)}</p>` : ''}
        <p class="detail__label">Where</p>${locs}${gallery}`;
};

const items = `${head('Bag')}
${masthead('items')}
<main id="main" class="shell">
  <header class="opener" style="border-bottom:0;margin-bottom:0;padding-bottom:var(--s6)">
    <div class="opener__ring" style="width:72px;height:72px">${ring({ n: POCKETS.length, done: [0,1,2,3,4,5,6], here: -1, w: 26, gap: 8 })}</div>
    <div>
      <h1>${ITEMS.length} things worth picking up</h1>
      <div class="opener__meta">
        <span><strong style="color:var(--jade)">${MATCHED}</strong> with PokeAPI sprite and effect</span><span>·</span>
        <span><strong>${TREES.length}</strong> berry trees</span><span>·</span>
        <span><strong style="color:var(--jade)">${SHOTTED}</strong> with an in-game capture</span><span>·</span>
        <span><strong style="color:var(--ember)">${HACKEX}</strong> hack-exclusive</span>
      </div>
    </div>
  </header>

  <div class="bagsearch">
    <span class="field"><input type="search" id="itemsearch" placeholder="Search every pocket…" aria-label="Search items"></span>
    <p class="dexcount" role="status">Showing <output>${ITEMS.length}</output> of ${ITEMS.length}</p>
  </div>

  <div class="bag">
    <div class="pockets" role="tablist" aria-label="Bag pockets">
      ${POCKETS.map((p, i) => `<a class="pocket" role="tab" href="#pocket-${p.id}"
        id="tab-${p.id}" aria-controls="pocket-${p.id}" aria-selected="${i === 0}"
        style="--ph:${p.hue};--pc:${p.c}">
        <span class="pocket__glyph">${glyph(p)}</span>
        <span class="pocket__label">${p.label}</span>
        <span class="pocket__count">${inPocket(p.id).length}</span>
      </a>`).join('\n      ')}
    </div>

    <div class="bag__body">
      <p id="tiledesc" class="vh">Opens the full entry.</p>
      ${POCKETS.map((p) => `<section class="pocketpanel" id="pocket-${p.id}"
        role="tabpanel" aria-labelledby="tab-${p.id}" style="--ph:${p.hue};--pc:${p.c}">
        <h2>${p.label} <span>${inPocket(p.id).length}</span></h2>
        <ul class="bagrid">${inPocket(p.id).map(i => bagTile(i, ITEMS.indexOf(i))).join('')}
        </ul>
      </section>`).join('\n      ')}
    </div>

    <!-- One detail block per entry. Visible (and linkable) without JS;
         hidden once JS upgrades them into the dialog. -->
    <div class="detailsources">
      ${ITEMS.map((i, idx) => `<article class="detailsource mount detail" id="item-${idx}">
        ${detailFor(i)}
        <p class="detailsource__back"><a href="#pocket-${pocketOf(i)}">Back to ${
          POCKETS.find(p => p.id === pocketOf(i)).label}</a></p>
      </article>`).join('\n      ')}
    </div>
  </div>

  <dialog class="modal" id="itemmodal">
    <div class="modal__bar">
      <p class="modal__pocket" id="modalpocket"></p>
      <button type="button" class="modal__close" data-close aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail" id="modalbody"></div>
  </dialog>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;

/* ---------- 5. species — one page per entry --------------------
   Dex text is the HeartGold entry where the species existed in HeartGold;
   the 175 Gen-5+ species fall back to another version and say so. Where the
   seed records how to obtain it, that is shown; where it does not, the block
   is a skeleton behind an explicit in-progress notice rather than a guess. */
const STATLABEL = { hp: 'HP', attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed' };

const speciesPage = (sp) => {
  const acq = ACQ.get(sp.name);
  const stats = sp.stats || {};
  const max = Math.max(150, ...Object.values(stats));
  return `${head(sp.name)}
${masthead('dex')}
<main id="main" class="shell">
  <header class="opener">
    <div class="opener__ring" style="width:132px;height:132px;display:grid;place-items:center">
      <span class="tile__slot" style="width:132px;height:132px">
        <img src="${SPRITE(sp.nat, sp.shiny)}" alt="${esc(sp.name)}${sp.shiny ? ' (shiny)' : ''} front sprite" width="112" height="112"
          style="width:112px;height:112px;image-rendering:pixelated">
      </span>
    </div>
    <div>
      <h1>${esc(sp.name)}</h1>
      <div class="plates" style="margin-top:var(--s3)">${sp.types.map(t => plate(t)).join('')}</div>
      ${sp.alolan
        ? `<p class="formflag">Alolan form — shares Zhery #${String(sp.reg).padStart(3, '0')} with ${esc(sp.base)} · <a href="sp-${sp.reg}.html">see the normal form</a></p>`
        : (ALOLAN_BY_BASE.get(sp.name)
            ? `<p class="formflag">This entry has an <a href="sp-al-${ALOLAN_BY_BASE.get(sp.name).nat}.html">Alolan form</a> — same dex number, found on Panotem Islands</p>`
            : '')}
      <div class="opener__meta" style="margin-top:var(--s3)">
        <span>${sp.reg ? 'Zhery Dex ' + String(sp.reg).padStart(3, '0')
                       : '<b style="color:var(--ember)">Not in the regional dex</b>'}</span><span>·</span>
        <span>National ${sp.nat}</span>${sp.genus ? `<span>·</span><span>${esc(sp.genus)}</span>` : ''}
        ${sp.height ? `<span>·</span><span>${(sp.height / 10).toFixed(1)} m</span>` : ''}
        ${sp.weight ? `<span>·</span><span>${(sp.weight / 10).toFixed(1)} kg</span>` : ''}
      </div>
    </div>
    <div class="opener__rule"></div>
  </header>

  <div class="chapter">
    <div class="column">
      ${sp.entry ? `<blockquote class="dexentry">
        <p>${esc(sp.entry)}</p>
        <cite>Pokédex — ${sp.entryFrom === 'HeartGold' ? 'HeartGold'
          : `${esc(sp.entryFrom)} <span class="undoc">(no HeartGold entry: this species postdates it)</span>`}</cite>
      </blockquote>` : ''}

      <h2 style="margin-top:var(--s12)">How to get it</h2>
      ${acq ? `<div class="table-wrap">
        <table class="data">
          <thead><tr><th scope="col">Method</th><th scope="col">Where</th></tr></thead>
          <tbody><tr><td>${esc(acq.method)}</td><td>${esc(acq.location)}</td></tr></tbody>
        </table>
      </div>`
      : `<div class="call call--wip">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="7"/><path d="M9 5v4.5l3 1.8"/></svg>
        <div><b>In progress</b>
          <p>Where to find ${esc(sp.name)} has not been documented yet. Nothing is guessed here —
            this section fills in as routes get written up.</p></div>
      </div>
      <div class="skel" aria-hidden="true">
        <span style="width:38%"></span><span style="width:64%"></span>
        <span style="width:52%"></span><span style="width:29%"></span>
      </div>`}

      <h2>Base stats</h2>
      <div class="table-wrap" style="margin-top:var(--s4) !important">
        <table class="data">
          <thead><tr><th scope="col">Stat</th><th scope="col">Base</th><th scope="col"><span class="vh">Spread</span></th></tr></thead>
          <tbody>
            ${Object.entries(STATLABEL).map(([k, label]) => `<tr>
              <th scope="row">${label}</th><td>${stats[k] ?? '—'}</td>
              <td><span class="rate__bar" style="display:block;max-width:200px"><i style="width:${((stats[k] || 0) / max) * 100}%"></i></span></td>
            </tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>

    <aside class="rail" aria-label="Summary">
      <p class="rail__label">At a glance</p>
      <div class="mount">
        <div class="mount__head">Types</div>
        <div class="plates">${sp.types.map(t => plate(t)).join('')}</div>
        <div class="mount__head" style="margin-top:var(--s4)">Numbering <span>${sp.reg ? 'regional' : 'none'}</span></div>
        <dl>
          <div class="stat"><dt>Zhery</dt><dd>${sp.reg ? String(sp.reg).padStart(3, '0') : '—'}</dd></div>
          <div class="stat"><dt>National</dt><dd>${sp.nat}</dd></div>
        </dl>
      </div>
      <a class="nextup" href="dex.html"><em>Back to</em><strong>The Dex</strong></a>
    </aside>
  </div>
</main>
${foot}`;
};

const alolanPages = Object.fromEntries(ALOLAN.map(a => [`sp-al-${a.nat}`, speciesPage({
  ...a, reg: a.reg, shiny: false, alolan: true,
})]));

const speciesPages = Object.fromEntries(
  ALLSPECIES.map(sp => [spPage(sp).replace(/\.html$/, ''), speciesPage(sp)]));


/* ---------- 7. Sun Palace — the gear puzzle -------------------
   Constants lifted verbatim from the existing solver in the old project
   (src/lib/sunPalace.js) so this diagram cannot drift from the mechanics it
   documents. Plain 2D plan, as specified. */
const SP = {
  LINE_ANGLES: { 1: 180, 2: 108, 3: 36, 4: 324, 5: 252 },   // clockwise from 12 o'clock
  TRACK_RADII: [80, 130, 180, 230],                          // index 0 = innermost track 1
  TRACK_COLOR: { 1: 'cw', 2: 'ccw', 3: 'cw', 4: 'ccw' },     // red steps CW, blue steps CCW
  SWITCH_RADIUS: 290,
  RADIAL_END: 270,
  SWITCHES: { 1: 'rotate', 2: 'outside', 3: 'inside', 4: 'inside', 5: 'outside' },
  PROTECTED: [['1', 'rotate'], ['2', 'outside']],            // reachable via the secret passage
};
const SPGLYPH = { rotate: '⟳', outside: '⇢', inside: '⇠' };
const SPNAME  = { rotate: 'Rotate', outside: 'Outside', inside: 'Inside' };
const spPt = (deg, r) => {
  const a = deg * Math.PI / 180;
  return [(r * Math.sin(a)).toFixed(1), (-r * Math.cos(a)).toFixed(1)];
};
const spArc = (r, a0, a1) => {
  const [x0, y0] = spPt(a0, r), [x1, y1] = spPt(a1, r);
  return `M${x0},${y0} A${r},${r} 0 0 0 ${x1},${y1}`;
};
const spProtected = (line, type) => SP.PROTECTED.some(([l, t]) => +l === line && t === type);

/* Lever icons drawn as paths, not text glyphs: the out/in arrows are rotated
   to their own line so they literally point away from or toward the middle,
   which is what those levers do. */
const spIcon = (type, deg) => {
  if (type === 'rotate') return `<g class="sp__icon">
    <path d="M-11,2 A11,11 0 1 1 -2,11" />
    <path class="sp__iconfill" d="M-15,-1 L-7,-1 L-11,7 Z"/></g>`;
  const out = type === 'outside';
  return `<g class="sp__icon" transform="rotate(${deg})">
    <line x1="0" y1="${out ? 11 : -11}" x2="0" y2="${out ? -6 : 6}"/>
    <path class="sp__iconfill" d="M-6,${out ? -5 : 5} L6,${out ? -5 : 5} L0,${out ? -14 : 14} Z"/>
    <line x1="-8" y1="${out ? 13 : -13}" x2="8" y2="${out ? 13 : -13}"/></g>`;
};
const BEVEL = (w, h, c = 7) =>
  `M${-w / 2 + c},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2 - c} L${w / 2 - c},${h / 2} L${-w / 2},${h / 2} L${-w / 2},${-h / 2 + c} Z`;

const boardSvg = `
<svg class="sp" viewBox="-420 -420 840 840" role="img" aria-labelledby="spttl spdesc">
  <title id="spttl">Sun Palace gear board</title>
  <desc id="spdesc">A circular board. Four concentric tracks are crossed by five radial lines
    numbered L1 to L5. Tracks one and three step clockwise; tracks two and four step
    anticlockwise. Each line carries one lever: L1 rotates every gear, L2 and L5 push gears
    outward, L3 and L4 pull them inward. The goal is to stack four gears on a single line,
    one on each track. A secret passage links the L1 and L2 levers so they keep working even
    when the ladder blocks them.</desc>

  <defs>
    <radialGradient id="spglow" cx="50%" cy="42%">
      <stop offset="0%" class="sp__glow0"/><stop offset="100%" class="sp__glow1"/>
    </radialGradient>
    <filter id="splift" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.16"/>
    </filter>
  </defs>

  <circle class="sp__field" r="300" fill="url(#spglow)"/>
  <circle class="sp__rim" r="268"/>
  <circle class="sp__rim sp__rim--inner" r="256"/>

  ${SP.TRACK_RADII.map((r, i) => `<circle class="sp__track sp__track--${SP.TRACK_COLOR[i + 1]}" r="${r}"/>`).join('\n  ')}
  ${Object.entries(SP.LINE_ANGLES).map(([, deg]) => {
    const [x, y] = spPt(+deg, SP.RADIAL_END);
    return `<line class="sp__radial" x1="0" y1="0" x2="${x}" y2="${y}"/>`;
  }).join('\n  ')}

  <circle class="sp__pillar" r="58" filter="url(#splift)"/>
  <circle class="sp__pillarin" r="46"/>
  <path class="sp__entry" d="${BEVEL(40, 24, 5)}" transform="translate(0 -70)"/>
  <text class="sp__entrylbl" x="0" y="-92">ENTRY</text>
  <text class="sp__pillarlbl" x="0" y="6">pillar</text>

  <path class="sp__tunnel" d="${spArc(SP.SWITCH_RADIUS + 46, SP.LINE_ANGLES[1], SP.LINE_ANGLES[2])}"/>
  <text class="sp__tunnellbl" x="${spPt(144, SP.SWITCH_RADIUS + 74)[0]}" y="${spPt(144, SP.SWITCH_RADIUS + 74)[1]}">secret passage</text>

  <g class="sp__slots">
    ${Object.entries(SP.LINE_ANGLES).flatMap(([line, deg]) =>
      SP.TRACK_RADII.map((r, i) => {
        const [x, y] = spPt(+deg, r);
        return `<g class="sp__slot" data-line="${line}" data-track="${i + 1}" role="button"
          tabindex="0" transform="translate(${x} ${y})"
          aria-label="Line ${line}, track ${i + 1}, empty">
          <circle class="sp__socket" r="19"/>
          <circle class="sp__socketin" r="13"/>
          <g class="sp__gear sp__gear--${SP.TRACK_COLOR[i + 1]}" filter="url(#splift)">
            ${[0, 30, 60, 90, 120, 150].map(a => `<rect x="-18" y="-3.6" width="36" height="7.2" rx="2" transform="rotate(${a})"/>`).join('')}
            <circle class="sp__gearbody" r="13"/>
            <circle class="sp__gearring" r="8"/>
            <circle class="sp__gearhub" r="3.6"/>
          </g>
        </g>`;
      })).join('\n    ')}
  </g>

  <g class="sp__levers">
    ${Object.entries(SP.LINE_ANGLES).map(([line, deg]) => {
      const type = SP.SWITCHES[line];
      const [x, y] = spPt(+deg, SP.SWITCH_RADIUS);
      const prot = spProtected(+line, type);
      return `<g class="sp__lever${prot ? ' is-protected' : ''}" data-line="${line}" data-type="${type}"
        role="button" tabindex="0" transform="translate(${x} ${y})"
        aria-label="Lever L${line} ${SPNAME[type]}">
        <path class="sp__plate" d="${BEVEL(114, 76)}" filter="url(#splift)"/>
        <g transform="translate(0 -14)">${spIcon(type, +deg)}</g>
        <text class="sp__leverlbl" y="24">L${line} ${SPNAME[type].toUpperCase()}</text>
        ${prot ? `<g class="sp__badge" transform="translate(43 -28)"><circle r="12"/><text y="5">∞</text></g>` : ''}
        <g class="sp__lock" transform="translate(-43 -28)"><circle r="12"/>
          <path d="M-4,-4 L4,4 M4,-4 L-4,4"/></g>
      </g>`;
    }).join('\n    ')}
  </g>
</svg>`;

const sunpalace = `${head('Sun Palace')}
${masthead('sun')}
<main id="main" class="shell">
  <header class="opener">
    <div class="opener__ring">${ring({ n: 4, done: [0, 1], here: 2, w: 26, gap: 10 })}</div>
    <div>
      <h1>Sun Palace — the gear puzzle</h1>
      <div class="opener__meta">
        <span>Sun Ruins</span><span>·</span><span>5 lines · 4 tracks · up to 6 gears</span><span>·</span>
        <span>TM43 Secret Power · King's Rock</span>
      </div>
    </div>
    <div class="opener__rule"></div>
  </header>

  <div class="sporder" role="note" aria-label="Required alignment order">
    <span class="sporder__label">Solve order</span>
    <span class="sporder__chain">
      ${['L3', 'L2', 'L1', 'L5'].map((l, i) => `${i ? '<span class="sporder__arrow" aria-hidden="true">→</span>' : ''}<span class="sporder__step${i === 3 ? ' is-final' : ''}">${l}</span>`).join('')}
    </span>
    <span class="sporder__note">Align the lines in this order. After each one, climb to the floor
      above and throw the wall switch to turn the pillar.</span>
    <button type="button" class="sporder__help" data-sp-help aria-haspopup="dialog"
      aria-label="How to work the puzzle">?</button>
  </div>

  <div class="spboard" data-sp>
        <div class="spboard__figure">
          ${boardSvg}
        </div>

        <div class="spboard__panel">
          <p class="sp__status" data-sp-status role="status">Place four or more gears on the
            board, then pick the line you want them stacked on.</p>

          <div class="spctl">
            <span class="spctl__label">Gears placed</span>
            <span class="spctl__val"><output data-sp-count>0</output> / 6</span>
          </div>

          <label class="spctl">
            <span class="spctl__label">Stack them on</span>
            <select data-sp-target>
              ${[1, 2, 3, 4, 5].map(l => `<option value="${l}"${l === 3 ? ' selected' : ''}>Line L${l}</option>`).join('')}
            </select>
          </label>

          <label class="spctl">
            <span class="spctl__label">Ladder blocks</span>
            <select data-sp-block>
              <option value="">Nothing</option>
              ${Object.entries(SP.SWITCHES).map(([l, t]) =>
                `<option value="${l}">L${l} ${SPNAME[t]}${spProtected(+l, t) ? ' (passage)' : ''}</option>`).join('')}
            </select>
          </label>

          <div class="spctl spctl--acts">
            <button type="button" class="btn btn--primary" data-sp-solve>Solve</button>
            <button type="button" class="btn btn--ghost" data-sp-undo>Undo</button>
            <button type="button" class="btn btn--ghost" data-sp-reset>Clear</button>
          </div>

          <div class="spctl spctl--acts">
            <button type="button" class="btn btn--ghost" data-sp-preset>Load an example</button>
          </div>

          <div class="spsol" data-sp-solution hidden>
            <p class="spsol__head">Solution — <output data-sp-len>0</output> moves
              <button type="button" class="linkbtn" data-sp-play>play</button></p>
            <ol class="spsol__list" data-sp-steps></ol>
          </div>

          <p class="spctl__hint">Click a slot to place or lift a gear. Click a lever to pull it.
            A gear's colour tells you which way <b>Rotate</b> will send it.</p>
        </div>
  </div>

  <div class="chapter">
    <div class="column">
      <h2 id="seen">Seen in game</h2>
      <div class="shots">
        ${shot('sun_palace_mainswitch.png', 'The main switch', 'Sun Palace — platform behind the balustrade')}
        ${shot('sun_palace_goalstate.png', 'Goal state', 'Sun Palace — ladder in place, the way open below')}
      </div>
      <div class="shots">
        ${shot('Tm/TM43SecretPowerSunPalace.jpeg', 'TM43 Secret Power', 'Sun Palace')}
        ${shot('Pokemons/VolcaronaEggSunPalace.jpeg', 'Volcarona Egg', 'Sun Palace')}
      </div>
      <div class="shots">
        ${shot('ItemLocations/KingsRockSunPalace1F.png', "King's Rock", 'Sun Palace — first floor')}
        ${shot('ItemLocations/SunStoneSunPalace1F.png', 'Sun Stone', 'Sun Palace — first floor')}
      </div>
    </div>

    <aside class="rail" aria-label="Board summary">
      <p class="rail__label">The board — at a glance</p>
      <div class="mount">
        <div class="mount__head">Levers</div>
        <dl>
          ${Object.entries(SP.SWITCHES).map(([l, t]) =>
            `<div class="stat"><dt>L${l}</dt><dd>${SPNAME[t]}${spProtected(+l, t) ? ' <span title="secret passage">∞</span>' : ''}</dd></div>`).join('')}
        </dl>
      </div>
      <div class="mount">
        <div class="mount__head">Rewards <span>recorded</span></div>
        <dl>
          <div class="stat"><dt>TM43</dt><dd>Secret Power</dd></div>
          <div class="stat"><dt>King's Rock</dt><dd>Sun Ruins</dd></div>
          <div class="stat"><dt>Volcarona</dt><dd>Egg</dd></div>
        </dl>
      </div>
      <a class="nextup" href="index.html"><em>Back to</em><strong>The region</strong></a>
    </aside>
  </div>

  <dialog class="modal" id="sphelp" aria-label="How to work the Sun Palace puzzle">
    <div class="modal__bar">
      <p class="modal__pocket">How this works</p>
      <button type="button" class="modal__close" data-sp-helpclose aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button>
    </div>
    <div class="modal__body detail">
      <div class="detail__head"><h3>Four alignments, in order</h3>
        <p><span class="energy">L3 → L2 → L1 → L5</span></p></div>
      <ol class="steps">
        <li><b>Copy the board from your game.</b> Click the slots so the gears sit exactly where
          they sit on screen — same lines, same tracks. This tool starts from your position,
          it does not invent one.</li>
        <li><b>Pick the line you need.</b> The order is <b>L3 → L2 → L1 → L5</b>, so choose L3
          the first time. If the ladder is blocking a lever, set that too.</li>
        <li><b>Press Solve.</b> It prints the exact lever order that stacks four gears on that
          line, one per track. <b>Play</b> steps through it on the board so you can follow along.</li>
        <li><b>Pull those levers in game, then climb up and throw the wall switch</b> to turn the
          pillar. Come back, copy the new board, and solve the next line.</li>
      </ol>

      <p class="detail__label">The three levers</p>
      <ul class="helplist">
        <li><b>L1 Rotate</b> — steps <em>every</em> gear one line at once. Gears on the red
          tracks go clockwise, gears on the blue tracks go anticlockwise, so a single pull
          sends your gears in two directions.</li>
        <li><b>L2 and L5 Outside</b> — push that line's gears out one track. Track 4 is the rim.</li>
        <li><b>L3 and L4 Inside</b> — pull that line's gears in one track. Track 1 is the floor.</li>
      </ul>

      <p class="detail__label">The ladder</p>
      <ul class="helplist">
        <li>Wherever the ladder parks, it <b>blocks that line's lever</b>.</li>
        <li><b>L1 Rotate and L2 Outside are the exceptions</b> — a secret passage keeps them
          working even when blocked. If you must park somewhere awkward, park there.</li>
      </ul>

      <p class="detail__label">Reading the board</p>
      <ul class="helplist helplist--key">
        <li><span class="k k--cw"></span>Red tracks (1 and 3) — gears here step clockwise</li>
        <li><span class="k k--ccw"></span>Blue tracks (2 and 4) — gears here step anticlockwise</li>
        <li><span class="k k--inf"></span>Gold border and ∞ — lever protected by the passage</li>
        <li><span class="k k--entry"></span>Entry door on the pillar; the hidden door is below it</li>
      </ul>
    </div>
  </dialog>
</main>
${foot}`;


/* ---------- 8. how to patch -----------------------------------
   Each step can carry a screenshot. The figure renders only when the file is
   actually present, so the page reads complete either way — drop a file in
   and it appears, with no empty placeholder in the meantime. */
const PATCHSHOTS = {
  1: ['1', 'The download page at pokehacking.com'],
  2: ['2', 'Inside the unzipped folder — LPDS.xdelta is the patch'],
  3: ['3', 'HowToPatch.pdf, included in the zip — the Windows route'],
  4: ['4', 'The xdelta-wasm patcher, before you choose anything'],
  5: ['5', 'Source file and patch file both set, ready to apply'],
  6: ['6', 'The patched ROM — your input name plus “-patched”'],
};
const patchShot = (n) => {
  const hit = PATCHSHOTS[n];
  if (!hit) return '';
  const [base, caption] = hit;
  const file = ['png', 'jpg', 'jpeg', 'webp']
    .map(e => `pictures/Patch/${base}.${e}`).find(f => existsSync(join(OUT, f)));
  if (!file) return '';
  const rel = file.replace('pictures/', '');
  const [w, h] = DIMS[rel] || [4, 3];
  return `
          <figure class="pshot">
            <picture>
              <source type="image/webp" sizes="(max-width: 700px) 92vw, min(620px, 46vw)"
                srcset="${opt(rel)}-640.webp 640w, ${opt(rel)}-1280.webp 1280w">
              <img src="${file}" width="${w}" height="${h}" alt="${esc(caption)}" loading="lazy" decoding="async">
            </picture>
            <figcaption>${esc(caption)}</figcaption>
          </figure>`;
};


const patch = `${head('How to patch')}
${masthead('patch')}
<main id="main" class="shell">
  <header class="opener">
    <div class="opener__ring">${ring({ n: 6, done: [0, 1, 2], here: 3, w: 26, gap: 10 })}</div>
    <div>
      <h1>How to patch the game</h1>
      <div class="opener__meta">
        <span>Beginner edition</span><span>·</span>
        <span>Assumes you already know what emulator to run</span><span>·</span>
        <span>About ten minutes</span>
      </div>
    </div>
    <div class="opener__rule"></div>
  </header>

  <div class="chapter">
    <div class="column">
      <div class="call call--missable">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2 17 16H1L9 2Z"/><path d="M9 7v4"/><path d="M9 13.5v.5"/></svg>
        <div><b>About the ROM</b>
          <p>You need a <b>Pokémon HeartGold (US)</b> ROM, and you have to source that yourself.
            Sharing ROMs is illegal — don't ask anyone here for one. Only the <em>patch</em> is
            distributed, which is why patching is a step you do rather than a download you take.</p>
          <p>There is <b>no pre-patched ROM</b> anywhere. Anyone offering one is either faking it
            or handing you a bad build — trading, the online GTS and Mystery Gift only work on a
            ROM you patched yourself.</p></div>
      </div>

      <h2 id="need">What you need first</h2>
      <ul class="needs">
        <li><b>An emulator.</b> <span class="needs__rec">Recommended: melonDS</span></li>
        <li><b>The patch</b>, from the official site —
          <a href="https://pokehacking.com/fangames/light-platinum/">pokehacking.com/fangames/light-platinum</a></li>
        <li><b>A Pokémon HeartGold (US) ROM</b> — yours to find, see above</li>
        <li><b>A patcher.</b> On Windows the downloaded zip already contains one
          (<code>DeltaPatcherLite.exe</code>). On anything else use
          <a href="https://kotcrab.github.io/xdelta-wasm/">kotcrab.github.io/xdelta-wasm</a> —
          open source, and it runs locally in your browser through WebAssembly, so your ROM is
          never uploaded anywhere.</li>
      </ul>

      <div class="call call--legendary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2.5"/></svg>
        <div><b>Check your base ROM before you start</b>
          <p>The patch expects exactly <code>4780 - Pokemon HeartGold (U)(Xenophobia).nds</code>,
            <b>CRC32 FFD28F00</b>. A different dump is the single most common reason patching
            fails or produces a broken game.</p></div>
      </div>

      <h2 id="steps">The steps</h2>
      <ol class="steps">
        <li><b>Get the patch</b> from the official pokehacking page listed above. Nowhere else.${patchShot(1)}</li>
        <li><b>Unzip it.</b> 7-Zip, WinRAR or your system's built-in unzip all work — opening the
          <code>.zip</code> in your file manager generally makes a folder of the same name beside
          it. Inside you'll find:
          <ul class="ziplist">
            <li><code>LPDS.xdelta</code> <span>the patch itself</span></li>
            <li><code>DeltaPatcherLite.exe</code> <span>Windows patcher</span></li>
            <li><code>HowToPatch.pdf</code> <span>English instructions</span></li>
            <li><code>ComoParchear.pdf</code> <span>Spanish instructions</span></li>
            <li><code>README.txt</code></li>
          </ul>${patchShot(2)}
        </li>
        <li><b>On Windows:</b> open <code>HowToPatch.pdf</code> and follow it. In Delta Patcher
          Lite, set <em>Original file</em> to your HeartGold <code>.nds</code>, set
          <em>XDelta patch</em> to <code>LPDS.xdelta</code>, then click <b>Apply patch</b>.${patchShot(3)}</li>
        <li><b>On anything else:</b> open
          <a href="https://kotcrab.github.io/xdelta-wasm/">the xdelta-wasm patcher</a>.${patchShot(4)}</li>
        <li><b>Set the two files.</b> <em>Source file</em> is your HeartGold ROM;
          <em>Patch file</em> is <code>LPDS.xdelta</code>. Hit <b>Apply Patch</b> and it produces
          the patched ROM as a download.${patchShot(5)}</li>
        <li><b>Rename it.</b> The output is named after your input —
          <code>Pokemon - HeartGold Version (USA)-patched.nds</code>, around 268 MB. Rename it to
          something like <code>Pokemon_Light_Platinum_DS.nds</code> so you can tell them apart.${patchShot(6)}</li>
      </ol>

      <p class="patchdone">Load that file in melonDS and you're playing.</p>
    </div>

    <aside class="rail" aria-label="Release details">
      <p class="rail__label">The release</p>
      <div class="mount">
        <div class="mount__head">Pokémon Light Platinum DS</div>
        <dl>
          <div class="stat"><dt>Author</dt><dd>Mikelan98</dd></div>
          <div class="stat"><dt>Version</dt><dd>0.2.2</dd></div>
          <div class="stat"><dt>Status</dt><dd>Demo 2</dd></div>
          <div class="stat"><dt>Updated</dt><dd>19 Jun 2026</dd></div>
          <div class="stat"><dt>Patch size</dt><dd>65.76 MB</dd></div>
          <div class="stat"><dt>Language</dt><dd>EN · ES</dd></div>
        </dl>
      </div>
      <div class="mount">
        <div class="mount__head">Credits</div>
        <dl>
          <div class="stat"><dt>Music</dt><dd>AdAstra / LD3005</dd></div>
          <div class="stat"><dt>Based on</dt><dd>Light Platinum (GBA)</dd></div>
          <div class="stat"><dt>Original by</dt><dd>WesleyFG</dd></div>
        </dl>
      </div>
      <a class="nextup" href="chapter.html"><em>Patched already?</em><strong>Start the walkthrough</strong></a>
    </aside>
  </div>
</main>
${foot}`;


/* ---------- 9. mystery gift ----------------------------------- */
const CARDS = [
  { title: 'Your contribution is very important', date: null, species: 'Beldum',
    body: 'Your contribution in the development or promotion of Pokémon Light Platinum DS is essential for this game. As token of appreciation, please accept this Mystery Gift.',
    note: 'A shiny Beldum — and it stays shiny through Metang and Metagross.' },
  { title: 'PokeHacking Online Club', date: null, species: 'Porygon',
    body: 'Welcome to the PokeHacking Online Club! You have successfully linked your Pokémon Light Platinum DS game to your PokeHacking account. Accept this PORYGON as a gift.' },
  { title: 'Heartfelt thank you!', date: 'April 2026', species: 'Shaymin',
    body: 'Thank you very much for playing Pokémon Light Platinum DS!' },
  { title: 'The Professor Sycamore Pokémon!', date: 'May 2026',
    species: ['Chespin', 'Fennekin', 'Froakie'],
    body: 'Raise the starter Pokémon of the Kalos region! Check the Pokémon on the GTS and get them all.',
    note: 'One of the three, at random — only one per player.' },
  { title: 'Secrets beneath the sand…', date: 'May 2026', species: 'Klink',
    body: 'This rare Pokémon has emerged from an ancient mechanism in the desert ruins.' },
  { title: 'A secret map…', date: 'June 2026', species: 'Jirachi',
    body: 'Travel to Desire Island to encounter a very special Pokémon! Be sure to save your game after you pick up the Old Sea Map at a Poké Mart.' },
  { title: 'The Champions’ Dragonite', date: 'July 2026', species: 'Dragonite',
    body: 'This Dragonite is celebrating! Accept this Pokémon as a commemoration of the Spain National Team’s victory in the 2026 FIFA World Cup.',
    note: 'Dragonite is in the regional dex — this card is an extra way to get one.' },
];
const byName = n => ALLSPECIES.find(x => x.name === n);
const giftSprite = (n) => {
  const sp = byName(n);
  return sp ? `<a class="giftmon" href="${spPage(sp)}">
      <img src="${SPRITE(sp.nat, sp.shiny)}" alt="" width="56" height="56" loading="lazy">
      <span>${esc(sp.name)}</span></a>` : '';
};

const gifts = `${head('Mystery Gift')}
${masthead('gifts')}
<main id="main" class="shell">
  <header class="opener">
    <div class="opener__ring">${ring({ n: CARDS.length, done: [0,1,2,3,4,5], here: -1, w: 28, gap: 8 })}</div>
    <div>
      <h1>Mystery Gift</h1>
      <div class="opener__meta">
        <span><strong>${CARDS.length}</strong> Wonder Cards</span><span>·</span>
        <span><strong>${GIFTED.length}</strong> species given</span><span>·</span>
        <span><strong>${NONDEX.filter(n => !n.alolan).length}</strong> outside the regional dex once evolved</span>
      </div>
    </div>
    <div class="opener__rule"></div>
  </header>

  <p class="giftlede">Every Wonder Card distributed for the game. Except for Dragonite, none of
    these Pokémon can be caught in Zhery — they and their evolutions are the whole of the
    <a href="dex.html">not-in-the-dex</a> list.</p>

  <ul class="cards">
    ${CARDS.map(c => `<li class="card${c.species ? '' : ' is-unknown'}">
      <div class="card__top"><span class="card__kind">Wonder Card</span>
        ${c.date ? `<span class="card__date">${c.date}</span>` : ''}</div>
      <h2 class="card__title">${esc(c.title)}</h2>
      <p class="card__body">${esc(c.body)}</p>
      ${c.note ? `<p class="card__note">${esc(c.note)}</p>` : ''}
      <div class="card__gets">
        ${c.species
          ? (Array.isArray(c.species) ? c.species : [c.species]).map(giftSprite).join('')
          : '<p class="undoc">The card does not name what it gives — not recorded yet.</p>'}
      </div>
    </li>`).join('\n    ')}
  </ul>

  <div class="chapter">
    <div class="column">
      <h2 id="lines">What they evolve into</h2>
      <p>The gift is the first stage. Everything downstream is also absent from the regional
        dex, so the only way to a Klinklang or a Greninja is to evolve the gift.</p>
      <ul class="evolines">
        ${[...new Set(NONDEX.filter(n => !n.alolan).map(n => n.line))].map(line => {
          const members = NONDEX.filter(n => n.line === line && !n.alolan).sort((a, b) => a.stage - b.stage);
          if (members.length < 2) return '';
          return `<li class="evoline">
          ${members.map((m, i) => `${i ? `<span class="evoline__arrow" aria-hidden="true">→</span>
            <span class="evoline__how">${esc(m.evolveHow || '')}</span>` : ''}
            <a class="giftmon" href="${spPage(m)}">
              <img src="${SPRITE(m.nat, m.shiny)}" alt="" width="56" height="56" loading="lazy">
              <span>${esc(m.name)}</span></a>`).join('')}
        </li>`;
        }).join('\n        ')}
      </ul>
    </div>

    <aside class="rail" aria-label="Summary">
      <p class="rail__label">At a glance</p>
      <div class="mount">
        <div class="mount__head">Cards</div>
        <dl>
          <div class="stat"><dt>Total</dt><dd>${CARDS.length}</dd></div>
          <div class="stat"><dt>Name a species</dt><dd>${CARDS.filter(c => c.species).length}</dd></div>
          <div class="stat"><dt>Unrecorded</dt><dd class="undoc">${CARDS.filter(c => !c.species).length}</dd></div>
        </dl>
      </div>
      <a class="nextup" href="dex.html"><em>See them in</em><strong>The Dex</strong></a>
    </aside>
  </div>
</main>
${foot}`;

for (const [name, html] of Object.entries({ index, chapter, sunpalace, patch, gifts, medals, items, dex, ...speciesPages, ...alolanPages })) {
  writeFileSync(join(OUT, `${name}.html`), html);
  if (!name.startsWith('sp-')) console.log('wrote', `${name}.html`, (html.length / 1024).toFixed(1), 'kB');
}
console.log('wrote', Object.keys(speciesPages).length, 'species pages');
