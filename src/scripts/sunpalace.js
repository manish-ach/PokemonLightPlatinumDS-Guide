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
      if (busy) return;
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
      if (busy) return;
      push();
      if (path && done < path.length && path[done].line === line) return runStep(done);
      path = null; el.solution.hidden = true; setNext(null);
      animateAction({ line, type }, `Pulled L${line} ${NAME[type]}.`);
    };
    l.addEventListener('click', act);
    l.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
    });
  });

  el.target.addEventListener('change', () => { target = +el.target.value; path = null; el.solution.hidden = true; render(' '); render(); });
  el.block.addEventListener('change', () => { blocked = el.block.value ? +el.block.value : null; path = null; el.solution.hidden = true; render(' '); render(); });
  root.querySelector('[data-sp-undo]').addEventListener('click', () => {
    if (busy) return;
    if (!history.length) return render('Nothing to undo.');
    gears = history.pop(); path = null; el.solution.hidden = true; setNext(null); render('Stepped back.');
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

  /* ---------- moving gears ------------------------------------
     A pull is shown, not just applied: each gear that changes slot is
     cloned onto a top layer, slid from its old socket to its new one, and
     the board state only flips once the slide has landed. */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = root.querySelector('svg.sp');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SLIDE = 560;
  let busy = false;
  const slotEl = g => el.slots.find(s => +s.dataset.line === g.line && +s.dataset.track === g.track);
  const slotPos = g => { const m = /translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/.exec(slotEl(g).getAttribute('transform')); return [+m[1], +m[2]]; };
  function animateAction(action, msg, cb) {
    const before = gears, after = applyAction(gears, action);
    const moves = before.map((g, i) => ({ from: g, to: after[i] })).filter(m => m.from.line !== m.to.line || m.from.track !== m.to.track);
    if (!moves.length || reduced()) { gears = after; render(msg); cb && cb(); return; }
    busy = true;
    let layer = svg.querySelector('.sp__fliers');
    if (!layer) { layer = document.createElementNS(NS, 'g'); layer.setAttribute('class', 'sp__fliers'); svg.append(layer); }
    moves.forEach(m => {
      const src = slotEl(m.from);
      const gear = src.querySelector('.sp__gear').cloneNode(true);
      const f = document.createElementNS(NS, 'g'); f.setAttribute('class', 'sp__flier');
      const [x0, y0] = slotPos(m.from), [x1, y1] = slotPos(m.to);
      f.style.transform = `translate(${x0}px, ${y0}px)`;
      f.append(gear); layer.append(f);
      src.classList.remove('is-filled');
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = `translate(${x1}px, ${y1}px)`; }));
    });
    setTimeout(() => { layer.innerHTML = ''; gears = after; busy = false; render(msg); cb && cb(); }, SLIDE);
  }
  const setNext = line => el.levers.forEach(l => l.classList.toggle('is-next', +l.dataset.line === line));

  /* ---------- the printed route, one click per step ------------- */
  const ORDER = [3, 2, 1, 5];
  const orderChips = [...document.querySelectorAll('[data-order-step]')];
  const reward = root.querySelector('[data-sp-reward]');
  let done = 0, items = [], finalBtn = null;
  let progress = 0;
  try { progress = Math.min(4, +localStorage.getItem('sp:progress') || 0); } catch (e) {}

  function markSteps() {
    items.forEach((li, k) => { li.classList.toggle('is-done', k < done); li.classList.toggle('is-next', k === done); });
    const next = path && path[done];
    setNext(next ? next.line : null);
    if (finalBtn) { finalBtn.disabled = done < path.length; finalBtn.closest('li').classList.toggle('is-next', done === path.length); }
  }
  function runStep(i, cb) {
    if (busy || !path || i !== done) return;
    const a = path[i];
    animateAction(a, `Pulled L${a.line} ${NAME[a.type]}.`, () => { done = i + 1; markSteps(); cb && cb(); });
  }
  function applyProgress(msg) {
    orderChips.forEach((c, k) => { c.classList.toggle('is-done', k < progress); c.classList.toggle('is-here', k === progress); });
    root.classList.toggle('is-open', progress >= 4);
    if (reward) reward.hidden = progress < 4;
    if (progress < 4) { target = ORDER[progress]; el.target.value = String(target); }
    try { localStorage.setItem('sp:progress', String(progress)); } catch (e) {}
    render(msg);
  }
  function turnPillar() {
    if (busy || !path || done < path.length) return;
    busy = true;
    root.classList.add('is-turning');
    render('Pillar turning…');
    setTimeout(() => {
      root.classList.remove('is-turning'); busy = false;
      progress = Math.min(4, progress + 1);
      path = null; done = 0; items = []; finalBtn = null; el.solution.hidden = true; setNext(null);
      if (progress >= 4) applyProgress('All four lines aligned. The pillar has risen and the way below is open.');
      else applyProgress(`L${ORDER[progress - 1]} is done. Copy the board as it is now, then solve for L${ORDER[progress]}.`);
    }, reduced() ? 80 : 1500);
  }

  root.querySelector('[data-sp-solve]').addEventListener('click', () => {
    if (busy) return;
    const res = solve(gears, target, blocked);
    if (res.status !== 'ok') { el.solution.hidden = true; return render(MSG[res.status]); }
    path = res.path; done = 0;
    el.len.textContent = path.length;
    el.steps.innerHTML = '';
    items = path.map((a, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="spsol__step" data-step="${i}"><b>L${a.line}</b> ${NAME[a.type]}</button>`;
      li.querySelector('button').addEventListener('click', () => runStep(i));
      el.steps.append(li);
      return li;
    });
    /* the pull list ends the same way every time: the alignment only takes
       once the pillar is turned from the floor above */
    const fin = document.createElement('li');
    fin.className = 'spsol__final';
    fin.innerHTML = '<button type="button" data-final>Then go up a floor and press the <b>main switch</b> at the back.</button>';
    finalBtn = fin.querySelector('button');
    finalBtn.addEventListener('click', turnPillar);
    el.steps.append(fin);
    el.solution.hidden = false;
    markSteps();
    render(`Found a route in ${path.length} move${path.length === 1 ? '' : 's'}. Click each step to watch it, or Play.`);
  });

  root.querySelector('[data-sp-play]').addEventListener('click', () => {
    if (!path || busy) return;
    push();
    const tick = () => { if (done >= path.length) return; runStep(done, () => setTimeout(tick, reduced() ? 60 : 260)); };
    tick();
  });
  root.querySelector('[data-sp-restart]')?.addEventListener('click', () => {
    progress = 0; path = null; done = 0; el.solution.hidden = true; setNext(null);
    applyProgress('Progress reset — start again from L3.');
  });

  applyProgress();
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
