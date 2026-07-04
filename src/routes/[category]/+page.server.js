import { error } from '@sveltejs/kit';
import { getCategoryBySlug, listSections, listEntries } from '$lib/server/db.js';

export const prerender = true;

export function load({ params }) {
  const category = getCategoryBySlug(params.category);
  if (!category) throw error(404, 'Category not found');
  const sections = listSections(category.id).map((s) => ({
    ...s,
    count: listEntries(s.id).length,
  }));
  return { category, sections };
}
