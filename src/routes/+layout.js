import { base } from '$app/paths';

// Emit clean `<route>/index.html` files so static hosts (GitHub Pages) resolve
// routes unambiguously.
export const trailingSlash = 'always';

// Universal load (works during prerender, on the server, and on the static
// client) — nav is derived from the content snapshot so no backend is required.
export async function load({ fetch }) {
  const res = await fetch(`${base}/content.json`);
  const c = await res.json();
  const nav = c.categories.map((cat) => ({
    ...cat,
    sections: c.sections.filter((s) => s.category_slug === cat.slug),
  }));
  return { nav };
}
