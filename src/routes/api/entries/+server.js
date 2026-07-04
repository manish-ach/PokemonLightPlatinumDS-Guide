import { json, error } from '@sveltejs/kit';
import { listEntries, createEntry } from '$lib/server/db.js';

export function GET({ url }) {
  const sec = url.searchParams.get('section_id');
  if (!sec) throw error(400, 'section_id required');
  return json(listEntries(Number(sec)));
}

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}));
  if (!body.section_id || !body.name) throw error(400, 'section_id and name required');
  return json(createEntry(body), { status: 201 });
}
