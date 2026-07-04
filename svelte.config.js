import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

// `ADAPTER=static` builds a prerendered, backend-free site for GitHub Pages.
// Anything else builds the self-hosted Node server (with the CMS + API).
const isStatic = process.env.ADAPTER === 'static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: isStatic
      ? adapterStatic({ pages: 'build', assets: 'build', fallback: '404.html', precompress: false })
      : adapterNode(),
    // Set BASE_PATH to your repo name for a GitHub project page,
    // e.g. BASE_PATH=/PokemonLightPlatinumDS-Guide
    paths: { base: process.env.BASE_PATH || '' },
  },
};

export default config;
