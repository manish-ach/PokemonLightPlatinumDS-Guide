import { json } from '@sveltejs/kit';
import { listCategories, listSections, getDb } from '$lib/server/db.js';

// A single content snapshot used for client-side search and "found here".
// Prerendered in the static build; a live endpoint in the Node build.
export const prerender = process.env.ADAPTER === 'static';

export function GET() {
  const cats = listCategories();
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const secs = listSections();
  const secById = Object.fromEntries(secs.map((s) => [s.id, s]));

  const entries = getDb()
    .prepare('SELECT * FROM entries ORDER BY sort_order, id')
    .all()
    .map((e) => {
      const sec = secById[e.section_id];
      const cat = sec && catById[sec.category_id];
      let data = {};
      try {
        data = JSON.parse(e.data);
      } catch {}
      return {
        name: e.name,
        slug: e.slug,
        data,
        image_url: e.image_url,
        location_image_url: e.location_image_url,
        category_slug: cat?.slug,
        section_slug: sec?.slug,
        section_title: sec?.title,
      };
    });

  return json({
    categories: cats.map((c) => ({ slug: c.slug, title: c.title, icon: c.icon })),
    sections: secs.map((s) => ({
      slug: s.slug,
      category_slug: catById[s.category_id]?.slug,
      title: s.title,
      layout: s.layout,
    })),
    entries,
  });
}
