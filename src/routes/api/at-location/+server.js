import { json } from '@sveltejs/kit';
import { entriesAtLocation } from '$lib/server/db.js';

export function GET({ url }) {
  return json(entriesAtLocation(url.searchParams.get('q') || ''));
}
