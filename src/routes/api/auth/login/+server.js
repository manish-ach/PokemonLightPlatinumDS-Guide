import { json, error } from '@sveltejs/kit';
import { login, signToken, cookieOptions, COOKIE } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) throw error(400, 'Email and password required');
  const user = login(email, password);
  if (!user) throw error(401, 'Invalid credentials');
  cookies.set(COOKIE, signToken(user), cookieOptions());
  return json({ user });
}
