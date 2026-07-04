import { json } from '@sveltejs/kit';
import { COOKIE } from '$lib/server/auth.js';

export async function POST({ cookies }) {
  cookies.delete(COOKIE, { path: '/' });
  return json({ ok: true });
}
