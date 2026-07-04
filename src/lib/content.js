import { base } from '$app/paths';

let cache;
export async function getContent() {
  if (cache) return cache;
  const res = await fetch(`${base}/content.json`);
  cache = await res.json();
  return cache;
}

const textValues = (data) =>
  Object.values(data || {})
    .filter((v) => typeof v === 'string')
    .join(' ');

const catTitle = (c, slug) => c.categories.find((x) => x.slug === slug)?.title || '';

export async function searchContent(q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return [];
  const c = await getContent();
  const out = [];
  for (const s of c.sections) {
    if (s.title.toLowerCase().includes(query) || catTitle(c, s.category_slug).toLowerCase().includes(query)) {
      out.push({ kind: 'section', title: s.title, sub: catTitle(c, s.category_slug), href: `${base}/${s.category_slug}/${s.slug}` });
    }
  }
  for (const e of c.entries) {
    const hay = (e.name + ' ' + textValues(e.data)).toLowerCase();
    if (hay.includes(query)) {
      out.push({
        kind: 'entry',
        title: e.name,
        sub: `${catTitle(c, e.category_slug)} · ${e.section_title}`,
        href: `${base}/${e.category_slug}/${e.section_slug}#${e.slug}`,
      });
    }
  }
  return out.slice(0, 40);
}

export async function foundAt(name) {
  const q = String(name || '').trim().toLowerCase();
  if (!q) return [];
  const c = await getContent();
  return c.entries
    .filter((e) => e.category_slug !== 'world' && textValues(e.data).toLowerCase().includes(q))
    .map((e) => ({
      name: e.name,
      image_url: e.image_url,
      section_title: e.section_title,
      href: `${base}/${e.category_slug}/${e.section_slug}#${e.slug}`,
    }));
}
