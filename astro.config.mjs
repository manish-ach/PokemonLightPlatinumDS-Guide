// @ts-check
import { defineConfig } from 'astro/config';
import { writeFileSync, mkdirSync } from 'node:fs';

/* After a build, list the sentences that were shown on a Spanish page without
   a Spanish version (see src/lib/i18n.js), so they can be translated. */
const esReport = {
  name: 'es-report',
  hooks: {
    'astro:build:done': () => {
      const missing = [...(globalThis.__lpdsMissing || [])].sort();
      mkdirSync('.astro', { recursive: true });
      writeFileSync('.astro/es-missing.json', JSON.stringify(missing, null, 1));
      console.log(missing.length ? `[es] ${missing.length} sentences have no Spanish yet — see .astro/es-missing.json` : '[es] every sentence has Spanish');
    },
  },
};

// GitHub Pages serves the site under the repository name, so every asset and
// link carries that prefix; `site` lets Astro build absolute canonicals.
export default defineConfig({
  site: 'https://manish-ach.github.io',
  base: '/PokemonLightPlatinumDS-Guide',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [esReport],
});
