import { json, error } from '@sveltejs/kit';
import { listCategories, createCategory } from '$lib/server/db.js';

export function GET() {
  return json(listCategories());
}

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}));
  if (!body.title) throw error(400, 'Title required');
  return json(createCategory(body), { status: 201 });
}
