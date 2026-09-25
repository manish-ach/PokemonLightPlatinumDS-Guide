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

Data lives in `src/data/*.json`; every page reads it through `src/lib/data.js`.
Screenshots and sprites are under `public/pictures/`. The solver's board
logic is `src/scripts/sunpalace.js`.

## Deploying

Pushing to `astro` runs `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages at `/PokemonLightPlatinumDS-Guide/`. In the
repository settings, Pages must be set to deploy from GitHub Actions.
