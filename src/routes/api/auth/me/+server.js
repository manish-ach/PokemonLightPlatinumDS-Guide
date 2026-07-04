import { json } from '@sveltejs/kit';

export function GET({ locals }) {
  return json({ user: locals.user || null });
}
