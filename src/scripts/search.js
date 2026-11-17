/* Search across the whole guide. Any element marked [data-search] that holds
   an <input> and a [data-results] list becomes a search box; the top bar's
   sheet and the home page both use it. The index is one flat JSON file,
   fetched the first time a box is focused and shared between boxes. */
import { ct } from './t.js';

let rows = null;
let loading = null;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
/* one index per language; switching language starts again */
let loadedFor = null;
const load = () => {
  const es = document.documentElement.lang === 'es';
  if (loadedFor !== es) { loadedFor = es; rows = null; loading = fetch(base + (es ? '/es' : '') + '/search.json').then((r) => r.json()).then((r) => (rows = r)); }
  return loading;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function wireSearch() {
  for (const box of document.querySelectorAll('[data-search]')) {
    if (box.dataset.wired) continue;
    const input = box.querySelector('input');
    const out = box.querySelector('[data-results]');
    if (!input || !out) continue;
    box.dataset.wired = '1';

    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !rows) { out.hidden = true; out.innerHTML = ''; return; }
      /* names that start with the query come before names that merely contain it */
      const hits = rows.filter((r) => r.t.toLowerCase().includes(q))
        .sort((a, b) => Number(b.t.toLowerCase().startsWith(q)) - Number(a.t.toLowerCase().startsWith(q)))
        .slice(0, 14);
      out.hidden = false;
      out.innerHTML = hits.length
        ? hits.map((r) => `<li><a href="${esc(r.u)}"><b>${esc(r.t)}</b><span>${esc(r.k)}</span></a></li>`).join('')
        : `<li class="results__none">${esc(ct('Nothing in the guide matches “{q}”.', { q: input.value.trim() }))}</li>`;
    };

    input.addEventListener('focus', load);
    input.addEventListener('input', () => load().then(render));
    input.addEventListener('keydown', (e) => {
      const first = out.querySelector('a');
      if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; render(); }
      else if (e.key === 'Enter' && first) { e.preventDefault(); first.click(); }
      else if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    });
    /* arrow keys walk the list; up from the first row returns to the box */
    out.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const links = [...out.querySelectorAll('a')];
      const i = links.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      (e.key === 'ArrowDown' ? links[i + 1] : links[i - 1] || input)?.focus();
    });
  }
}
