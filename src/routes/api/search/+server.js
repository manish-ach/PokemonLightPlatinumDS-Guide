import { json } from '@sveltejs/kit';
import { searchAll } from '$lib/server/db.js';

export function GET({ url }) {
  return json(searchAll(url.searchParams.get('q') || ''));
}
