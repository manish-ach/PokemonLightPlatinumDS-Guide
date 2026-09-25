// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages serves the site under the repository name, so every asset and
// link carries that prefix; `site` lets Astro build absolute canonicals.
export default defineConfig({
  site: 'https://manish-ach.github.io',
  base: '/PokemonLightPlatinumDS-Guide',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
