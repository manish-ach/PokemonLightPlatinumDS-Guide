import { defineMiddleware } from 'astro:middleware';
import { withLang, localise } from './lib/i18n.js';

/* Says which language the page being rendered is in (see src/lib/i18n.js),
   then runs the place-name pass over the finished HTML. The body is read
   inside the language scope because Astro renders it lazily. */
export const onRequest = defineMiddleware((ctx, next) => {
  const l = ctx.params.lang === 'es' ? 'es' : 'en';
  return withLang(l, async () => {
    const res = await next();
    if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
    return new Response(localise(await res.text(), l), { status: res.status, headers: res.headers });
  });
});
