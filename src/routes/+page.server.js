import { listCategories, listSections, getDb } from '$lib/server/db.js';

export const prerender = true;

export function load() {
  const entryCount = getDb().prepare('SELECT COUNT(*) AS n FROM entries').get().n;
  return {
    catCount: listCategories().length,
    sectionCount: listSections().length,
    entryCount,
  };
}
