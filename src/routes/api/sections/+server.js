import { json, error } from '@sveltejs/kit';
import { listSections, createSection } from '$lib/server/db.js';

export function GET({ url }) {
  const cat = url.searchParams.get('category_id');
  return json(listSections(cat ? Number(cat) : undefined));
}

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.category_id) throw error(400, 'category_id and title required');
  return json(createSection(body), { status: 201 });
}
