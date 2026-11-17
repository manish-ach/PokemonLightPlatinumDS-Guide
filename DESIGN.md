---
name: Light Platinum DS guide
description: Wayfinding for the Zhery region — a navy sign, signal yellow for "you are here", four line colours for the parts of the guide.
colors:
  bg: "oklch(0.972 0.005 250)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.945 0.007 250)"
  line: "oklch(0.885 0.008 250)"
  line-strong: "oklch(0.62 0.015 250)"
  ink: "oklch(0.22 0.03 258)"
  ink-2: "oklch(0.40 0.025 258)"
  ink-3: "oklch(0.50 0.02 258)"
  sign: "oklch(0.24 0.035 258)"
  sign-2: "oklch(0.31 0.04 258)"
  on-sign: "oklch(0.98 0 0)"
  on-sign-2: "oklch(0.82 0.02 255)"
  accent: "oklch(0.87 0.17 95)"
  accent-hover: "oklch(0.82 0.17 92)"
  accent-soft: "oklch(0.955 0.06 98)"
  on-accent: "oklch(0.22 0.03 258)"
  accent-ink: "oklch(0.45 0.15 258)"
  line-world: "oklch(0.52 0.16 255)"
  line-mon: "oklch(0.54 0.19 12)"
  line-bag: "oklch(0.52 0.11 175)"
  line-story: "oklch(0.50 0.17 300)"
  ok: "oklch(0.48 0.12 155)"
  warn: "oklch(0.52 0.17 30)"
  odd: "oklch(0.48 0.12 300)"
  dark-bg: "oklch(0.215 0.035 258)"
  dark-surface: "oklch(0.27 0.04 258)"
  dark-surface-2: "oklch(0.315 0.042 258)"
  dark-ink: "oklch(0.97 0.005 250)"
  dark-sign: "oklch(0.155 0.03 258)"
  dark-shield: "oklch(0.94 0.012 250)"
  dark-on-shield: "oklch(0.2 0.035 258)"
typography:
  title:
    fontFamily: "Overpass Variable, system-ui, sans-serif"
    fontSize: "2.074rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  heading:
    fontFamily: "Overpass Variable, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Overpass Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Overpass Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  number:
    fontFamily: "Overpass Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  topbar:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.on-sign}"
    height: "60px"
  nav-link-current:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "2px 16px 0"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    height: "36px"
  chip-pressed:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  shield:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.on-sign}"
    typography: "{typography.number}"
    rounded: "{rounded.sm}"
    height: "22px"
  linehead:
    backgroundColor: "{colors.line-world}"
    textColor: "{colors.on-sign}"
    typography: "{typography.label}"
---

# Design System: Light Platinum DS guide

`src/styles/tokens.css` is the source of truth; this file explains how the tokens
are meant to be used. `PRODUCT.md` says who the guide is for and why.

## Overview

The guide is the signage of a transit network for the Zhery region. A player
glances at a phone propped beside a lit DS, often in a dim room, and needs one
fact. Signage is built for exactly that: where am I, what is here, how do I get
to the next thing.

Three ideas carry the whole system:

- **The sign.** The top bar, the footer, dialog bars and number shields are one
  navy panel colour in both themes. It frames every page the same way.
- **You are here.** Signal yellow marks the current nav item, pressed chips, the
  selected tab, the primary action and focus. Nothing else is yellow.
- **Lines.** The nine sections sit on four lines — World (Places, Gyms),
  Pokémon (Dex, Trades, Mystery Gift), Bag (Items, Medals), Story (Quests,
  Sun Palace). A line's colour appears only in chrome: the stripe under the top
  bar, the square beside a back link, the band on a menu group or home-board
  panel, stat bars. The list lives in `src/lib/nav.js`; the layout sets
  `data-line` on `<body>`, which sets `--line-c`.

Layout is a 1120px column. Pages open with a title row that holds the page's
tools; content starts directly under it. Sections of a page are separated by a
2px ink rule above the heading (`.block`, `.sec`, `.group`, or `.rule`), which is
what makes a long page scannable. Below 1280px the inline nav gives way to a menu
sheet; search is a sheet on every page and opens with `/`.

Every page exists in English and, under `/es/`, in Spanish. The switch in the bar
goes to the same page in the other language. Spanish runs longer than English:
leave a label room to grow by a third before it wraps.

Motion is 120ms or 200ms on `cubic-bezier(0.25, 1, 0.5, 1)`, and only for state:
hover, press, a sheet or dialog arriving. Sheets and dialogs move but never fade
from zero, so they cannot be left invisible. Reduced motion is honoured globally.

## Colors

The strategy is restrained: tinted neutrals, one accent, and four line colours
confined to chrome. All values are OKLCH. Neutrals lean 250–258, the sign's hue.

### Primary
- **Signal yellow** `--accent` — a fill behind `--on-accent` ink (11.7:1). It
  never carries text. `--accent-soft` is its tint behind a highlighted callout.
- **Sign navy** `--sign` — the chrome. White on it is 15.5:1.

### Secondary
- **Link blue** `--accent-ink` — links, quiet buttons, info notes (7.4:1 on the
  page). Links are always underlined; colour is never the only signal.

### Tertiary
- **Line colours** `--line-world|mon|bag|story` — solid fills that take white
  text at 4.8:1 or better. In dark theme `--line-*-hi` is the lighter step for
  marks drawn straight on the page.
- **Meaning** `--ok` (recorded, obtainable), `--warn` (missable, timed), `--odd`
  (hack instability), each with a `-soft` wash for notes and status words.
- **Type plates** — eighteen hues at one lightness. They belong to the game, not
  the guide, and are never restyled.

### Neutral
- Light: `--bg` is a faintly cool off-white and `--surface` is pure white, so
  panels stand on the page. `--surface-2` is the inset and hover step.
- Dark is night signage, not a grey inversion. `--bg` is a navy that is plainly
  blue, panels lift off it, and the bar is the deepest tone so it still frames
  the page. Two things do not dim, because they are how you find your way:
  number shields turn white with navy figures (`--shield`, `--on-shield`), like a
  reflective sign, and type plates keep their daylight colours with dark text
  (`--plate-ink`).
- Ink has three steps; `--ink-3` is the floor for any text (5.1:1 or better).

### Named Rules
- **Yellow is a place, not a mood.** If it is yellow, it is where you are or
  what you are about to do.
- **A line colour never touches content.** Rows, cards and prose stay neutral.
- **One wash per meaning.** A tinted panel always has a full 1px border in the
  same hue; never a coloured stripe down one side.

## Typography

One family: **Overpass**, drawn from highway signage, with **Overpass Mono** for
numbers. Both are bundled through Fontsource; nothing loads from a CDN.

Overpass ships its middle dot with no advance width, so `global.css` maps
U+00B7 to a system face (`"Guide Middot"`). Overpass also sits high in its line
box; controls carry 2px more padding on top than on the bottom to centre it.

### Hierarchy
- **Title** — 800, 1.728rem on phones and 2.074rem from 720px, tight tracking.
- **Section heading** — 800, 1.2rem, under a 2px ink rule.
- **Row name / card title** — 700–800, 1rem–1.2rem.
- **Body** — 400, 1rem, 1.5 line height, 66ch measure in prose.
- **Label** — 700, 0.875rem, `--ink-2`: table heads, key columns, counts.
- **Number** — Overpass Mono, tabular: levels, counts, dex and route numbers.

The scale is fixed rem at 1.2. Nothing is fluid.

### Named Rules
- **Weight, not size, makes hierarchy.** Titles are heavier before they are
  bigger; the body never drops below 0.875rem except in shields and status words.
- **Numbers are mono.** Anything a player compares down a column is tabular.

## Elevation

The system is flat. Depth comes from two things only: white panels on a tinted
page, and 1px borders. Hover adds a second ink line to a card (`box-shadow: 0 0 0
1px`), which reads as a sign's edge rather than a lift.

### Shadow Vocabulary
- `--shadow-pop` — the menu and search sheets.
- `--shadow-dialog` — dialogs.
- `--scrim` — the backdrop behind either.

Nothing else casts a shadow.

### Named Rules
- **Focus is two rings.** A navy outline inside a 5px yellow ring, so it reads on
  the page, on a panel and on the sign.

## Components

### Buttons
`.btn` is a 44px bordered control on `--surface`. `.btn--primary` is yellow and
there is at most one per view. `.btn--quiet` is borderless link-blue text.
`.btn--sm` is 36px with a mouse and 44px under a finger.

### Chips
`.chip` is a square-cornered filter. Pressed, it turns yellow. Type chips keep
their plate colour and take an ink ring when on. `.pill` is a non-interactive
status word in a meaning colour.

### Lists
A list is never a grid of identical cards. Its shape comes from what is in it:

- **Ledger** (`.ledger`, `.ledger__row`) — things you read across: one panel,
  ruled rows, three columns (name, the fact, the picture or place). Towns, the
  bag's pockets, quests. The whole row is the link or the button.
- **Track** (`.track`, `.track__stop`) — things that come in an order: stops down
  a line in the page's line colour. A numbered stop carries a shield
  (`.track__no`); a dated one a square (`.track__dot`). Routes, gyms, Wonder Cards.
- **Cells** (`.cells`, `.cell`) — things known by their picture: one sheet ruled
  into squares by hairlines, no gaps and no per-item border. The dex, items,
  medals, what is lying around a place. Set `--cell` for the minimum width.

### Cards / Containers
`.card` is a white panel with a 1px border and 8px corners. It is kept for the
few things that are separate objects standing alone; three or more of the same
thing in a row is a list, and takes one of the shapes above. Sections of a page
are never cards; they are ruled blocks. The home board uses `.linehead` over a
ruled list: one panel per line, one row per section, the row is the link.

### Inputs / Fields
`.field` wraps an icon and an input at 44px. Focus turns the border to ink and
adds a 3px yellow ring. `.field--big` (52px, 2px ink border) is the guide-wide
search. Results list under it in `.results`.

### Navigation
The top bar is navy with a 4px stripe in the current line's colour (yellow on
the home page). From 1280px the nine sections sit inline, grouped by line, each
group led by a square in its colour; the current one is a yellow block. Below
that, a menu button opens a sheet (`popover`) with the four lines as banded
groups of 48px rows. A back link above a title carries the line's square.

On a phone, a page made of a few long groups may carry a floating jump bar
(`.jump`, on Places): a navy pill fixed over the bottom of the screen with one
label per group and a yellow thumb that slides to the group in view. It is the
one place a full pill and a backdrop blur are used, because the page scrolls
beneath it; it steps aside when the footer arrives and is absent from 720px up.

The language switch (`.lang`) sits in the bar at every width: EN and ES in mono,
the current one a yellow block. Under 480px the theme switch moves into the menu
sheet to give it room.

### Number shields
`.shield` is the signature component: a small navy block holding a real number
in mono — a route, a gym's place in the order, a dex entry. `.shield--lg` is for
card titles; `.shield--quiet` is the grey variant used where there are hundreds
on one page (dex tiles).

### The badge run
The home page draws the gyms as stops on one track in the World line's colour:
across on a wide screen, down the left edge on a phone. Each stop is a shield,
the city, the leader and level range, and the type plates.

## Do's and Don'ts

### Do:
- Put the answer in the row. If a card needs a click to say what it is for, it
  is the wrong shape.
- Use a shield only for a number the game assigns.
- Keep controls at 44px under a finger; inline Pokémon chips are 40px.
- Let sprites, type plates and screenshots be the most colourful things on a
  page. Render them with `image-rendering: pixelated`.
- Add a new section by adding it to a line in `src/lib/nav.js`; the bar, the menu
  and the home board follow.
- Put every sentence a reader sees through `t()` from `src/lib/i18n.js`, and
  every name through its helper (`placeName`, `itemName`, `moveName`, `typeName`).

### Don't:
- Use yellow as decoration, or a line colour inside content.
- Add a coloured stripe down one side of a card or callout.
- Number sections for rhythm, or label them with small uppercase eyebrows.
- Nest cards, wrap a section of a page in a card, or lay a list out as a grid of
  identical cards.
- Fade a sheet, dialog or section in from zero opacity.
- Introduce a second typeface, a gradient, or a shadow outside the two named.
