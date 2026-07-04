import { COOKIE, verifyToken } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db.js';

// Touch the DB once at startup so migrations + seeding run before first request.
getDb();

export async function handle({ event, resolve }) {
  const token = event.cookies.get(COOKIE);
  event.locals.user = token ? verifyToken(token) : null;

  // Guard admin API mutations and the admin dashboard data.
  const { pathname } = event.url;
  const method = event.request.method;
  const isApiWrite =
    pathname.startsWith('/api/') && method !== 'GET' && !pathname.startsWith('/api/auth/');
  if (isApiWrite && !event.locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  return resolve(event);
}
