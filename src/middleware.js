import { defineMiddleware } from 'astro:middleware';
import { ES_NAME } from './lib/data.js';

/* Every city mention on every page gets its Spanish name in brackets, so
   players on the untranslated ROM can follow along: "Yellow Town" becomes
   "Yellow Town (Pueblo Amarillo)". Done once here, over the built HTML, so no
   template or data file has to remember it. The data's misspellings are
   folded into the right English name on the way. */
const VARIANTS = { 'Gromet City': 'Groment City', 'Darkdusk City': 'Dardusk City', 'Enemy Town': 'Enermy Town',
  'Central Town': 'Central City', 'Panotem Island': 'Panotem Islands' };
const LABEL = new Map(Object.entries(ES_NAME).map(([en, es]) => [en, `${en} (${es})`]));
for (const [bad, en] of Object.entries(VARIANTS)) LABEL.set(bad, LABEL.get(en));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const names = [...LABEL.keys()].sort((a, b) => b.length - a.length).map(esc).join('|');
/* whole names only ("Panotem Island" must not eat "Panotem Islands"), and
   never twice ("Yellow Town (Pueblo Amarillo)" is left alone) */
const spanish = Object.values(ES_NAME).map(esc).join('|');
const RE = new RegExp(`(?<![\\w-])(${names})(?![\\w-])(?! \\((?:${spanish})\\))`, 'g');
const label = (text) => text.replace(RE, (m) => LABEL.get(m));

/* text between tags, plus JSON data blocks the dialogs read from; never
   attributes, styles or ordinary scripts */
const TOKEN = /(<!--[\s\S]*?-->|<[^>]+>)/;
export const withSpanish = (html) => {
  let skip = null;
  return html.split(TOKEN).map((part) => {
    if (part.startsWith('<')) {
      const open = part.match(/^<(script|style)\b/i);
      if (open && !/type="application\/json"/i.test(part)) skip = open[1].toLowerCase();
      else if (skip && part.toLowerCase() === `</${skip}>`) skip = null;
      return part;
    }
    return skip ? part : label(part);
  }).join('');
};

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  return new Response(withSpanish(await res.text()), { status: res.status, headers: res.headers });
});
