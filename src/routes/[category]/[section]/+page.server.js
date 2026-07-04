import { error } from '@sveltejs/kit';
import { getCategoryBySlug, getSectionBySlug, listEntries } from '$lib/server/db.js';

export const prerender = true;

export function load({ params }) {
  const category = getCategoryBySlug(params.category);
  if (!category) throw error(404, 'Not found');
  const section = getSectionBySlug(params.category, params.section);
  if (!section) throw error(404, 'Section not found');
  return { category, section, entries: listEntries(section.id) };
}
