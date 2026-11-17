/* Spanish for the sentences scripts write into the page. The layout prints
   them as JSON on a Spanish page; on an English page there is nothing to read
   and the English sentence is used as it stands. Add a sentence to
   CLIENT_STRINGS in src/lib/i18n.js to have it translated. */
export const ct = (en, vars) => {
  let s = en;
  if (document.documentElement.lang === 'es') {
    try { s = JSON.parse(document.getElementById('i18n')?.textContent || '{}')[en] || en; } catch (e) {}
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
};
