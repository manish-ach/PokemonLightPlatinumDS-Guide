/* --- sticky offset: measure the masthead instead of guessing -----
   Every sticky bar (the dex filter bar) hangs off the masthead's
   real height. A hardcoded rem left a strip of page showing between the
   two while scrolling. */
(() => {
  const head = document.querySelector('.masthead');
  if (!head) return;
  const set = () => document.documentElement.style
    .setProperty('--masthead-h', head.getBoundingClientRect().height + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(head);
  addEventListener('resize', set, { passive: true });
})();

/* Reliquary demo — three islands: theme, progress, dex filters.
   Nothing here gates content; every page is complete without it. */

/* --- theme ---------------------------------------------------- */
(() => {
  const root = document.documentElement;
  const stored = localStorage.getItem('lp-theme');
  if (stored) root.dataset.theme = stored;
  else root.removeAttribute('data-theme');           // follow the system

  const sync = () => {
    const dark = root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelectorAll('[data-theme-label]').forEach(n => n.textContent = dark ? 'Light' : 'Dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(n =>
      n.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`));
  };
  sync();

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const dark = root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    localStorage.setItem('lp-theme', root.dataset.theme);
    sync();
  }));
})();

/* --- progress: objectives drive the Ring ---------------------- */
(() => {
  const boxes = [...document.querySelectorAll('.obj input')];
  if (!boxes.length) return;
  const key = 'lp-progress:' + location.pathname;
  const saved = JSON.parse(localStorage.getItem(key) || 'null');
  if (saved) boxes.forEach((b, i) => b.checked = !!saved[i]);

  const openerSegs = [...document.querySelectorAll('.opener__ring .seg')];
  const paint = () => {
    const done = boxes.filter(b => b.checked).length;
    const lit = Math.round((done / boxes.length) * openerSegs.length);
    openerSegs.forEach((s, i) => s.classList.toggle('is-done', i < lit));
    localStorage.setItem(key, JSON.stringify(boxes.map(b => b.checked)));
  };
  boxes.forEach(b => b.addEventListener('change', paint));
  paint();
})();

/* --- dex: search + type + scope --------------------------------
   One apply() so the three filters compose instead of fighting. Scope is
   exclusive (at most one of in-dex / not-in-dex); type is multi-select;
   search matches the tile's whole text, so name and both dex numbers work. */
(() => {
  const bar = document.querySelector('.dexbar');
  if (!bar) return;
  const typeBtns = [...bar.querySelectorAll('button.plate:not(.scopefilter)')];
  const scopeBtns = [...bar.querySelectorAll('.scopefilter')];
  const search = document.getElementById('dexsearch');
  const tiles = [...document.querySelectorAll('.dexgrid .tile')];
  const out = document.querySelector('.dexcount output');
  const empty = document.querySelector('.dexempty');
  const types = new Set(), scopes = new Set();

  const hay = t => ((t.dataset.q || '') + ' ' + t.textContent).replace(/\s+/g, ' ').toLowerCase();

  const apply = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    tiles.forEach(t => {
      const ts = [...t.querySelectorAll('.plate')].map(p => p.textContent.trim().toLowerCase());
      const okType = types.size === 0 || ts.some(x => types.has(x));
      const okScope = scopes.size === 0 || scopes.has(t.dataset.scope);
      const okQuery = !q || hay(t).includes(q);
      const hide = !(okType && okScope && okQuery);
      t.hidden = hide;
      if (!hide) shown++;
    });
    typeBtns.forEach(b => b.classList.toggle('is-off',
      types.size > 0 && !types.has(b.textContent.trim().toLowerCase())));
    if (out) out.textContent = shown;
    if (empty) empty.hidden = shown > 0;
  };

  typeBtns.forEach(b => b.addEventListener('click', () => {
    const t = b.textContent.trim().toLowerCase();
    types.has(t) ? types.delete(t) : types.add(t);
    b.setAttribute('aria-pressed', String(types.has(t)));
    apply();
  }));

  /* exclusive: at most one scope active; clicking the active one clears it */
  scopeBtns.forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.scope;
    const wasOn = scopes.has(k);
    scopes.clear();
    if (!wasOn) scopes.add(k);
    scopeBtns.forEach(o => o.setAttribute('aria-pressed', String(scopes.has(o.dataset.scope))));
    apply();
  }));

  /* Alolan forms share a dex number with their normal counterpart, so the
     toggle swaps the tile in place rather than adding entries. Search matches
     either name at all times (data-q holds both). */
  const alBtn = bar.querySelector('[data-alolan-toggle]');
  let alolanView = false;
  const swap = () => {
    tiles.forEach(t => {
      if (!t.dataset.alolan) { t.classList.toggle('is-dimmed', alolanView); return; }
      const nameEl = t.querySelector('.tile__name');
      const img = t.querySelector('.tile__slot img');
      const plates = t.querySelector('.plates');
      if (alolanView) {
        t.dataset.normName ||= nameEl.textContent;
        t.dataset.normSrc  ||= img.getAttribute('src');
        t.dataset.normPlates ||= plates.innerHTML;
        t.dataset.normHref ||= t.getAttribute('href');
        nameEl.textContent = t.dataset.alName;
        img.setAttribute('src', img.getAttribute('src').replace(/\/\d+\.png$/, '/' + t.dataset.alNat + '.png'));
        plates.innerHTML = t.dataset.alPlates;
        t.setAttribute('href', t.dataset.alHref);
      } else if (t.dataset.normName) {
        nameEl.textContent = t.dataset.normName;
        img.setAttribute('src', t.dataset.normSrc);
        plates.innerHTML = t.dataset.normPlates;
        t.setAttribute('href', t.dataset.normHref);
      }
      t.classList.toggle('is-alolan', alolanView);
    });
  };
  alBtn?.addEventListener('click', () => {
    alolanView = !alolanView;
    alBtn.setAttribute('aria-pressed', String(alolanView));
    swap(); apply();
  });

  search?.addEventListener('input', apply);
  document.querySelector('[data-dex-clear]')?.addEventListener('click', () => {
    types.clear(); scopes.clear();
    if (search) search.value = '';
    [...typeBtns, ...scopeBtns].forEach(b => b.setAttribute('aria-pressed', 'false'));
    apply(); search?.focus();
  });

  apply();
})();

/* --- rail scrollspy ------------------------------------------- */
(() => {
  const label = document.querySelector('.rail__label');
  const heads = [...document.querySelectorAll('.column h2[id]')];
  if (!label || heads.length < 2) return;
  const io = new IntersectionObserver(entries => {
    const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) label.textContent = hit.target.textContent.trim() + ' — at a glance';
  }, { rootMargin: '-20% 0px -70% 0px' });
  heads.forEach(h => io.observe(h));
})();

/* --- the Bag: pockets, grid, modal ----------------------------
   Progressive enhancement. Without JS every pocket renders with its heading,
   every tile is an anchor, and each anchor lands on a real detail block
   further down the page. JS hides those blocks and shows the same markup in
   a native <dialog> instead — one source of truth, no duplicated content. */
(() => {
  const bag = document.querySelector('.bag');
  if (!bag) return;
  const tabs = [...bag.querySelectorAll('.pocket')];
  const panels = [...bag.querySelectorAll('.pocketpanel')];
  const tiles = [...bag.querySelectorAll('.bagtile')];
  const sources = document.querySelector('.detailsources');
  const modal = document.getElementById('itemmodal');
  const modalBody = document.getElementById('modalbody');
  const modalPocket = document.getElementById('modalpocket');
  const search = document.getElementById('itemsearch');
  const out = document.querySelector('.dexcount output');
  const supported = typeof modal?.showModal === 'function';
  // the medals page reuses this grid with a single, untabbed panel
  if (supported) bag.classList.add(tabs.length ? 'is-tabbed' : 'is-enhanced');

  let opener = null;

  const openItem = (link, src) => {
    if (!src) return;
    const panel = link.closest('.pocketpanel');
    const clone = src.cloneNode(true);
    clone.querySelector('.detailsource__back')?.remove();
    modalBody.innerHTML = clone.innerHTML;
    modalPocket.textContent = tabs.find(t => t.id === 'tab-' + panel.id.slice(7))
      ?.querySelector('.pocket__label').textContent || bag.dataset.label || '';
    // hand the modal the pocket's raw hue/chroma so it derives both the
    // ornament and the text-safe variant from the same tokens
    const ps = getComputedStyle(panel || bag);
    modal.style.setProperty('--ph', ps.getPropertyValue('--ph'));
    modal.style.setProperty('--pc', ps.getPropertyValue('--pc'));
    modal.setAttribute('aria-label',
      (modalBody.querySelector('h3')?.textContent || 'Item').trim());
    opener = link;
    modal.showModal();
  };

  const close = () => { modal.close(); };
  // the UA restores focus to whatever was focused before showModal(); defer ours
  // by a frame so the opening tile wins deterministically either way.
  modal?.addEventListener('close', () => {
    const o = opener; opener = null;
    if (o) requestAnimationFrame(() => o.focus());
  });
  modal?.querySelector('[data-close]')?.addEventListener('click', close);
  // click on the backdrop (outside the panel) closes, as a modal should
  modal?.addEventListener('click', e => { if (e.target === modal) close(); });
  // Escape fallback: the UA's close watcher normally handles this, but it does
  // not fire under some automated/embedded inputs. Guarded on .open so it is a
  // no-op whenever the native path already ran.
  modal?.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.open) { e.preventDefault(); close(); }
  });

  bag.addEventListener('click', e => {
    if (!supported) return;
    // a click anywhere in a table row counts as a click on its link
    const row = e.target.closest('tr.medalrow');
    const link = e.target.closest('a[href^="#"]') || row?.querySelector('a[href^="#"]');
    if (!link || !bag.contains(link)) return;
    const src = document.getElementById(link.getAttribute('href').slice(1));
    if (!src?.classList.contains('detailsource')) return;
    e.preventDefault();
    openItem(link, src);
  });

  /* pockets */
  const show = (id, focus) => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.id === 'tab-' + id)));
    panels.forEach(p => p.hidden = p.id !== 'pocket-' + id);
    if (focus) bag.querySelector('#tab-' + id).focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', e => {
      if (!supported) return;
      e.preventDefault(); show(t.id.slice(4));
    });
    t.addEventListener('keydown', e => {
      const map = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 };
      if (!(e.key in map)) return;
      e.preventDefault();
      const n = map[e.key] === -99 ? 0 : map[e.key] === 99 ? tabs.length - 1
              : (i + map[e.key] + tabs.length) % tabs.length;
      show(tabs[n].id.slice(4), true);
    });
  });

  /* arrow keys walk the grid in two dimensions, like the in-game cursor */
  bag.addEventListener('keydown', e => {
    const dir = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 0, ArrowUp: 0 };
    if (!(e.key in dir)) return;
    const tile = e.target.closest('.bagtile');
    if (!tile) return;
    const grid = tile.closest('.bagrid');
    const list = [...grid.querySelectorAll('.bagtile:not([hidden])')];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const at = list.indexOf(tile);
    const step = e.key === 'ArrowDown' ? cols : e.key === 'ArrowUp' ? -cols : dir[e.key];
    const next = list[at + step];
    if (!next) return;
    e.preventDefault();
    next.querySelector('.bagtile__hit').focus();
  });

  /* search across every pocket */
  const applySearch = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    tiles.forEach(t => {
      const hit = !q || t.dataset.name.includes(q);
      t.hidden = !hit;
      if (hit) shown++;
    });
    tabs.forEach(t => {
      const id = t.id.slice(4);
      const n = bag.querySelectorAll('#pocket-' + id + ' .bagtile:not([hidden])').length;
      t.querySelector('.pocket__count').textContent = n;
      t.classList.toggle('is-off', !!q && n === 0);
    });
    if (out) out.textContent = shown;

    let none = bag.querySelector('.bagempty');
    if (q && shown === 0) {
      if (!none) {
        none = document.createElement('p');
        none.className = 'bagempty';
        bag.querySelector('.bag__body').append(none);
      }
      none.innerHTML = 'Nothing in any pocket matches <b></b>. ' +
        '<button type="button" class="linkbtn">Clear the search</button> to see all ' +
        tiles.length + ' entries.';
      none.querySelector('b').textContent = '\u201c' + q + '\u201d';
      none.querySelector('.linkbtn').addEventListener('click', () => {
        search.value = ''; applySearch(); search.focus();
      });
      none.hidden = false;
    } else if (none) { none.hidden = true; }

    const open = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    if (q && shown > 0 && open &&
        !bag.querySelector('#pocket-' + open.id.slice(4) + ' .bagtile:not([hidden])')) {
      const alt = tabs.find(t => bag.querySelector('#pocket-' + t.id.slice(4) + ' .bagtile:not([hidden])'));
      if (alt) show(alt.id.slice(4));
    }
  };
  search?.addEventListener('input', applySearch);

  if (supported && tabs.length) show('items');
})();

/* --- Sun Palace gear solver ------------------------------------
   Board logic ported verbatim from the existing solver in the old project
   (src/lib/sunPalace.js) so the tool and the diagram agree with the game:
   tracks 1 and 3 step clockwise, 2 and 4 anticlockwise; L1 Rotate moves every
   gear at once; Outside/Inside shift one line by one track. Solved means four
   gears on one line, one on each track. The ladder blocks a lever unless the
   secret passage protects it (L1 Rotate, L2 Outside). */
(() => {
  const root = document.querySelector('[data-sp]');
  if (!root) return;

  const TRACK_COLOR = { 1: 'cw', 2: 'ccw', 3: 'cw', 4: 'ccw' };
  const SWITCHES = { 1: 'rotate', 2: 'outside', 3: 'inside', 4: 'inside', 5: 'outside' };
  const NAME = { rotate: 'Rotate', outside: 'Outside', inside: 'Inside' };
  const PROTECTED = [[1, 'rotate'], [2, 'outside']];
  const MAX_GEARS = 6, LIMIT = 250000, MAX_DEPTH = 24;

  const cwNext = l => (l === 1 ? 5 : l - 1);
  const ccwNext = l => (l === 5 ? 1 : l + 1);
  const isProtected = (l, t) => PROTECTED.some(([a, b]) => a === l && b === t);
  const key = g => `${g.line}-${g.track}`;
  const encode = gs => gs.map(g => `${g.line}${g.track}`).sort().join('');

  function applyAction(gears, action) {
    const next = gears.map(g => ({ ...g }));
    if (action.type === 'rotate') {
      next.forEach(g => {
        g.line = TRACK_COLOR[g.track] === 'cw' ? cwNext(g.line) : ccwNext(g.line);
      });
      return next;
    }
    const dir = action.type === 'outside' ? 1 : -1;
    next.map((g, i) => ({ g, i }))
      .filter(({ g }) => g.line === action.line)
      .sort((a, b) => (dir > 0 ? b.g.track - a.g.track : a.g.track - b.g.track))
      .forEach(({ g, i }) => {
        const t = g.track + dir;
        if (t < 1 || t > 4) return;
        if (next.some((o, j) => j !== i && o.line === g.line && o.track === t)) return;
        g.track = t;
      });
    return next;
  }

  const isAligned = (gears, line) => {
    const on = gears.filter(g => g.line === line);
    return on.length >= 4 && [1, 2, 3, 4].every(t => on.some(g => g.track === t));
  };

  const actionsFor = (blocked) => {
    const out = [];
    for (const line of [1, 2, 3, 4, 5]) {
      const type = SWITCHES[line];
      if (blocked === line && !isProtected(line, type)) continue;
      out.push({ line, type });
    }
    return out;
  };

  function solve(gears, target, blocked) {
    if (gears.length < 4) return { status: 'too-few' };
    if (isAligned(gears, target)) return { status: 'aligned', path: [] };
    const actions = actionsFor(blocked);
    if (!actions.length) return { status: 'no-actions' };
    const start = encode(gears);
    const queue = [{ gears, path: [] }];
    const seen = new Set([start]);
    let expanded = 0;
    while (queue.length) {
      const cur = queue.shift();
      if (++expanded > LIMIT) return { status: 'limit' };
      for (const action of actions) {
        const ng = applyAction(cur.gears, action);
        const k = encode(ng);
        if (seen.has(k)) continue;
        seen.add(k);
        const path = cur.path.concat(action);
        if (isAligned(ng, target)) return { status: 'ok', path };
        if (path.length < MAX_DEPTH) queue.push({ gears: ng, path });
      }
    }
    return { status: 'unsolvable' };
  }

  /* ---------- state + rendering ------------------------------- */
  const el = {
    slots: [...root.querySelectorAll('.sp__slot')],
    levers: [...root.querySelectorAll('.sp__lever')],
    status: root.querySelector('[data-sp-status]'),
    count: root.querySelector('[data-sp-count]'),
    target: root.querySelector('[data-sp-target]'),
    block: root.querySelector('[data-sp-block]'),
    solution: root.querySelector('[data-sp-solution]'),
    steps: root.querySelector('[data-sp-steps]'),
    len: root.querySelector('[data-sp-len]'),
  };
  let gears = [], history = [], blocked = null, target = 1, path = null;

  const at = (line, track) => gears.some(g => g.line === line && g.track === track);

  function render(msg) {
    el.slots.forEach(s => {
      const line = +s.dataset.line, track = +s.dataset.track;
      const filled = at(line, track);
      s.classList.toggle('is-filled', filled);
      s.classList.toggle('is-target', line === target);
      s.setAttribute('aria-label',
        `Line ${line}, track ${track}, ${filled ? 'gear' : 'empty'}`);
    });
    el.levers.forEach(l => {
      const line = +l.dataset.line, type = l.dataset.type;
      const off = blocked === line && !isProtected(line, type);
      l.classList.toggle('is-blocked', off);
      l.classList.toggle('is-saved', blocked === line && isProtected(line, type));
      l.setAttribute('aria-disabled', String(off));
    });
    el.count.textContent = gears.length;
    root.classList.toggle('is-solved', isAligned(gears, target));
    if (msg) el.status.textContent = msg;
    else if (isAligned(gears, target)) el.status.textContent = `Solved — four gears stacked on L${target}.`;
    else if (gears.length < 4) el.status.textContent = 'Place at least four gears, then pick a target line.';
  }

  function push() { history.push(gears.map(g => ({ ...g }))); if (history.length > 60) history.shift(); }

  el.slots.forEach(s => {
    const act = () => {
      const line = +s.dataset.line, track = +s.dataset.track;
      push();
      if (at(line, track)) gears = gears.filter(g => !(g.line === line && g.track === track));
      else if (gears.length >= MAX_GEARS) return render(`Six gears is the maximum.`);
      else gears.push({ line, track });
      path = null; el.solution.hidden = true;
      render(' ');
      render();
    };
    s.addEventListener('click', act);
    s.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
    });
  });

  el.levers.forEach(l => {
    const act = () => {
      const line = +l.dataset.line, type = l.dataset.type;
      if (blocked === line && !isProtected(line, type))
        return render(`L${line} ${NAME[type]} is blocked by the ladder.`);
      push();
      gears = applyAction(gears, { line, type });
      render(`Pulled L${line} ${NAME[type]}.`);
    };
    l.addEventListener('click', act);
    l.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
    });
  });

  el.target.addEventListener('change', () => { target = +el.target.value; path = null; el.solution.hidden = true; render(' '); render(); });
  el.block.addEventListener('change', () => { blocked = el.block.value ? +el.block.value : null; path = null; el.solution.hidden = true; render(' '); render(); });
  root.querySelector('[data-sp-undo]').addEventListener('click', () => {
    if (!history.length) return render('Nothing to undo.');
    gears = history.pop(); render('Stepped back.');
  });
  root.querySelector('[data-sp-reset]').addEventListener('click', () => {
    push(); gears = []; path = null; el.solution.hidden = true; render('Board cleared.');
  });
  root.querySelector('[data-sp-preset]').addEventListener('click', () => {
    push();
    gears = [{ line: 1, track: 1 }, { line: 2, track: 2 }, { line: 3, track: 3 },
             { line: 4, track: 4 }, { line: 5, track: 1 }];
    path = null; el.solution.hidden = true;
    render('Example loaded — try Solve.');
  });

  const MSG = {
    'too-few': 'You need at least four gears on the board.',
    'no-actions': 'Every lever is blocked — nothing can move.',
    'limit': 'Search gave up before finding a route.',
    'unsolvable': 'No sequence reaches that line from here. Try another target, or move a gear.',
    'aligned': 'Already solved.',
  };
  root.querySelector('[data-sp-solve]').addEventListener('click', () => {
    const res = solve(gears, target, blocked);
    if (res.status !== 'ok') { el.solution.hidden = true; return render(MSG[res.status]); }
    path = res.path;
    el.len.textContent = path.length;
    el.steps.innerHTML = '';
    path.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `<b>L${a.line}</b> ${NAME[a.type]}`;
      el.steps.append(li);
    });
    el.solution.hidden = false;
    render(`Found a route in ${path.length} move${path.length === 1 ? '' : 's'}.`);
  });

  root.querySelector('[data-sp-play]').addEventListener('click', () => {
    if (!path || !path.length) return;
    const queue = path.slice();
    const items = [...el.steps.children];
    push();
    const tick = () => {
      const a = queue.shift();
      if (!a) return render();
      items[path.length - queue.length - 1]?.classList.add('is-done');
      gears = applyAction(gears, a);
      render(`L${a.line} ${NAME[a.type]}`);
      setTimeout(tick, matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 420);
    };
    tick();
  });

  render();
})();

/* --- Sun Palace: the help dialog -------------------------------
   Same native <dialog> pattern as the item modal, including the Escape
   fallback, since the UA close watcher does not fire under some embedded
   inputs. */
(() => {
  const dlg = document.getElementById('sphelp');
  const open = document.querySelector('[data-sp-help]');
  if (!dlg || !open || typeof dlg.showModal !== 'function') return;
  open.addEventListener('click', () => dlg.showModal());
  dlg.querySelector('[data-sp-helpclose]')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dlg.open) { e.preventDefault(); dlg.close(); }
  });
  dlg.addEventListener('close', () => requestAnimationFrame(() => open.focus()));
})();
