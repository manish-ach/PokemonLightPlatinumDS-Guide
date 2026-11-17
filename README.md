# Light Platinum DS guide

A fan guide to Pokémon Light Platinum DS (v0.2.2): places, the regional dex,
items, medals, quests, gifts, trade evolution and a solver for the Sun Palace
gear puzzle. Static site built with Astro.

## Working on it

```
npm install
npm run dev       # http://127.0.0.1:8743/PokemonLightPlatinumDS-Guide/
npm run build     # writes dist/
npm run preview   # serves dist/ on the same port
```

`PRODUCT.md` says who the guide is for; `DESIGN.md` describes the visual system
(tokens are in `src/styles/tokens.css`, the section list in `src/lib/nav.js`).

## Two languages

Every page is built twice: at its own URL in English and under `/es/` in Spanish.
`src/middleware.js` says which language a page is being rendered in, and
`src/lib/i18n.js` has the helpers:

- `t('An English sentence')` — the guide's own words. The Spanish is in
  `src/data/es/strings.json`, keyed by the English sentence.
- `placeName`, `itemName`, `moveName`, `typeName`, `genusOf`, `entryOf` — names
  and text from the games. The official Spanish is in `src/data/es/official.json`,
  extracted from PokéAPI's CSV tables by `tools/extract_es.py`.

After `npm run build`, `.astro/es-missing.json` lists every sentence that was
shown on a Spanish page without a Spanish version. Add them to `strings.json`.

Data lives in `src/data/*.json`; every page reads it through `src/lib/data.js`.
Screenshots and sprites are under `public/pictures/`. The solver's board
logic is `src/scripts/sunpalace.js`.

## Deploying

Pushing to `astro` runs `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages at `/PokemonLightPlatinumDS-Guide/`. In the
repository settings, Pages must be set to deploy from GitHub Actions.
