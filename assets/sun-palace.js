(() => {
  const root = document.querySelector('[data-sp-board]');
  if (!root) return;

  // ---------------------------------------------------------------------------
  // Constants & geometry
  //
  // Lines are positioned with L1 at the bottom (6 o'clock). The numbering
  // continues counter-clockwise (matching the spec's "L1 -> L2 -> L3 -> L4 -> L5"
  // ordering around the figure). The mechanical rotation rules stay the same:
  //   - red track gears step clockwise on the board => line index decreases
  //   - green track gears step anticlockwise        => line index increases
  // ---------------------------------------------------------------------------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LINES = [1, 2, 3, 4, 5];

  // Angles measured clockwise from 12 o'clock (degrees).
  // L1 at the bottom; the numbering walks counter-clockwise around the disc.
  const LINE_ANGLES_DEG = { 1: 180, 2: 108, 3: 36, 4: 324, 5: 252 };

  const TRACK_RADII = [80, 130, 180, 230]; // index 0 -> track 1 (innermost)
  const TRACK_COLOR = { 1: 'red', 2: 'green', 3: 'red', 4: 'green' };
  const SWITCH_RADIUS = 290;
  const RADIAL_END = 270;

  const MAX_GEARS = 6;
  const STEP_DURATION = 420;
  const SOLVER_LIMIT = 250000;
  const SNAP_RADIUS = 26; // px in SVG coords for drag-drop snap

  const TUNNEL_PROTECTED = [
    { line: 1, type: 'rotate' },
    { line: 2, type: 'outside' },
  ];

  const DEFAULT_SWITCHES = {
    1: ['rotate'],
    2: ['outside'],
    3: ['inside'],
    4: ['inside'],
    5: ['outside'],
  };

  const SWITCH_GLYPH = { rotate: '⟳', outside: '⇢', inside: '⇠' };
  const SWITCH_LABEL = { rotate: 'Rotate', outside: 'Outside', inside: 'Inside' };

  // ---------------------------------------------------------------------------
  // Pure board logic
  // ---------------------------------------------------------------------------
  const angleRad = (line) => (LINE_ANGLES_DEG[line] * Math.PI) / 180;
  const pointAt = (line, track, radius) => {
    const a = angleRad(line);
    const r = radius != null ? radius : TRACK_RADII[track - 1];
    return { x: r * Math.sin(a), y: -r * Math.cos(a) };
  };

  const nextLineCW = (l) => (l === 1 ? 5 : l - 1);
  const nextLineCCW = (l) => (l === 5 ? 1 : l + 1);

  const isProtected = (line, type) =>
    TUNNEL_PROTECTED.some((p) => p.line === line && p.type === type);

  const cloneGears = (gears) => gears.map((g) => ({ line: g.line, track: g.track }));

  const positionKey = (line, track) => `${line}-${track}`;
  const gearKey = (gear) => positionKey(gear.line, gear.track);

  function occupiedSet(gears, exclude) {
    const set = new Set();
    gears.forEach((g, i) => {
      if (i === exclude) return;
      set.add(gearKey(g));
    });
    return set;
  }

  function applyAction(gears, action) {
    const next = cloneGears(gears);
    const moved = new Array(next.length).fill(null);

    if (action.type === 'rotate') {
      next.forEach((g, i) => {
        const color = TRACK_COLOR[g.track];
        const nl = color === 'red' ? nextLineCW(g.line) : nextLineCCW(g.line);
        if (nl !== g.line) moved[i] = color === 'red' ? 'cw' : 'ccw';
        g.line = nl;
      });
      return { gears: next, moved };
    }

    if (action.type === 'outside' || action.type === 'inside') {
      const dir = action.type === 'outside' ? +1 : -1;
      const indices = next
        .map((g, i) => ({ g, i }))
        .filter(({ g }) => g.line === action.line)
        .sort((a, b) =>
          dir > 0 ? b.g.track - a.g.track : a.g.track - b.g.track,
        )
        .map(({ i }) => i);

      indices.forEach((i) => {
        const g = next[i];
        const target = g.track + dir;
        if (target < 1 || target > 4) return;
        if (occupiedSet(next, i).has(positionKey(g.line, target))) return;
        g.track = target;
        moved[i] = dir > 0 ? 'out' : 'in';
      });
      return { gears: next, moved };
    }

    return { gears: next, moved };
  }

  function isAligned(gears, targetLine) {
    const onLine = gears.filter((g) => g.line === targetLine);
    if (onLine.length < 4) return false;
    const tracks = new Set(onLine.map((g) => g.track));
    return [1, 2, 3, 4].every((t) => tracks.has(t));
  }

  function availableActions(state) {
    const actions = [];
    for (const line of LINES) {
      const types = state.switches[line] || [];
      for (const type of types) {
        if (
          state.blocked &&
          state.blocked.line === line &&
          state.blocked.type === type &&
          !isProtected(line, type)
        ) {
          continue;
        }
        actions.push({ line, type });
      }
    }
    return actions;
  }

  function encodeGears(gears) {
    return gears
      .map((g) => `${g.line}${g.track}`)
      .sort()
      .join('');
  }

  // ---------------------------------------------------------------------------
  // BFS solver
  // ---------------------------------------------------------------------------
  function solve(state) {
    const { gears, targetLine } = state;
    if (gears.length < 4) return { status: 'too-few', path: null };
    if (isAligned(gears, targetLine)) return { status: 'aligned', path: [] };

    const actions = availableActions(state);
    if (actions.length === 0) return { status: 'no-actions', path: null };

    const start = encodeGears(gears);
    const queue = [{ key: start, gears, path: [] }];
    const seen = new Set([start]);
    let expanded = 0;

    while (queue.length) {
      const cur = queue.shift();
      expanded += 1;
      if (expanded > SOLVER_LIMIT) return { status: 'limit', path: null };

      for (const action of actions) {
        const { gears: nextGears } = applyAction(cur.gears, action);
        const key = encodeGears(nextGears);
        if (seen.has(key)) continue;
        seen.add(key);
        const path = cur.path.concat(action);
        if (isAligned(nextGears, targetLine)) return { status: 'ok', path };
        if (path.length >= 24) continue;
        queue.push({ key, gears: nextGears, path });
      }
    }
    return { status: 'unsolvable', path: null };
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  function svg(name, attrs = {}) {
    const el = document.createElementNS(SVG_NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // ---------------------------------------------------------------------------
  // Element references
  // ---------------------------------------------------------------------------
  const svgEl = root.querySelector('.sp-svg');
  const layers = {
    radials: svgEl.querySelector('[data-sp-radials]'),
    tracks: svgEl.querySelector('[data-sp-tracks]'),
    trackLabels: svgEl.querySelector('[data-sp-track-labels]'),
    intersections: svgEl.querySelector('[data-sp-intersections]'),
    gears: svgEl.querySelector('[data-sp-gears]'),
    switches: svgEl.querySelector('[data-sp-switches]'),
    targetLine: svgEl.querySelector('[data-sp-target-line]'),
    pillarTeeth: svgEl.querySelector('[data-sp-pillar-teeth]'),
    pillar: svgEl.querySelector('[data-sp-pillar]'),
    rungs: svgEl.querySelector('[data-sp-rungs]'),
    ladder: svgEl.querySelector('[data-sp-ladder]'),
    tunnel: svgEl.querySelector('[data-sp-tunnel]'),
    tunnelPath: svgEl.querySelector('[data-sp-tunnel-path]'),
    mainSwitch: svgEl.querySelector('[data-sp-mainswitch]'),
  };

  const hud = {
    targetPicker: document.querySelector('[data-sp-target-picker]'),
    blockedSelect: document.querySelector('[data-sp-blocked-select]'),
    blockedHint: document.querySelector('[data-sp-blocked-hint]'),
    gearCount: document.querySelector('[data-sp-gear-count]'),
    moves: document.querySelector('[data-sp-moves]'),
    status: document.querySelector('[data-sp-status]'),
    undo: document.querySelector('[data-sp-undo]'),
    clear: document.querySelector('[data-sp-clear]'),
    reset: document.querySelector('[data-sp-reset]'),
    mainSwitchBtn: document.querySelector('[data-sp-mainswitch-btn]'),
    solverBody: document.querySelector('[data-sp-solver-body]'),
    solveBtn: document.querySelector('[data-sp-solve]'),
    playBtn: document.querySelector('[data-sp-play]'),
    hintBtn: document.querySelector('[data-sp-hint]'),
  };

  const dev = {
    panel: document.querySelector('[data-sp-dev]'),
    state: document.querySelector('[data-sp-dev-state]'),
  };

  // ---------------------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------------------
  let gearIdCounter = 0;
  function assignId(g) {
    gearIdCounter += 1;
    g._id = `g${gearIdCounter}`;
    return g;
  }

  const DEFAULT_GEARS = [
    { line: 4, track: 1 },
    { line: 4, track: 2 },
    { line: 4, track: 3 },
    { line: 4, track: 4 },
    { line: 5, track: 2 },
    { line: 5, track: 3 },
  ];

  const state = {
    gears: cloneGears(DEFAULT_GEARS).map(assignId),
    targetLine: 1,
    blocked: { line: 5, type: 'outside' },
    switches: { ...DEFAULT_SWITCHES },
    history: [],
    moveCount: 0,
    isAnimating: false,
    isComplete: false,
    selectedGearId: null,
    solverPath: null,
    solverCursor: 0,
  };

  // ---------------------------------------------------------------------------
  // Static decor (radials, tracks, pillar teeth, ladder rungs, tunnel path)
  // ---------------------------------------------------------------------------
  function drawStaticDecor() {
    // Radial spokes: drawn from just outside the pillar to the track rim so
    // they read as guide rails rather than lines crossing the centre.
    clearChildren(layers.radials);
    const radialStart = 62;
    for (const line of LINES) {
      const a = angleRad(line);
      const start = { x: radialStart * Math.sin(a), y: -radialStart * Math.cos(a) };
      const end = { x: RADIAL_END * Math.sin(a), y: -RADIAL_END * Math.cos(a) };
      layers.radials.appendChild(
        svg('line', {
          class: 'sp-radial',
          'data-line': line,
          x1: start.x.toFixed(2),
          y1: start.y.toFixed(2),
          x2: end.x.toFixed(2),
          y2: end.y.toFixed(2),
        }),
      );
    }

    // Concentric tracks, coloured by rotation direction.
    clearChildren(layers.tracks);
    for (let t = 1; t <= 4; t++) {
      layers.tracks.appendChild(
        svg('circle', {
          class: `sp-track sp-track--${TRACK_COLOR[t]}`,
          cx: 0,
          cy: 0,
          r: TRACK_RADII[t - 1],
          'data-track': t,
        }),
      );
    }

    // Track numbers, tucked into the empty wedge at the top of the disc so they
    // never collide with a spoke. Teaches "one gear on each of the four tracks".
    if (layers.trackLabels) {
      clearChildren(layers.trackLabels);
      for (let t = 1; t <= 4; t++) {
        const r = TRACK_RADII[t - 1];
        const badge = svg('g', {
          class: `sp-track-label sp-track-label--${TRACK_COLOR[t]}`,
          transform: `translate(0 ${(-r).toFixed(2)})`,
        });
        badge.appendChild(svg('circle', { class: 'sp-track-label__dot', r: 11 }));
        const txt = svg('text', { class: 'sp-track-label__num', y: 0.5 });
        txt.textContent = String(t);
        badge.appendChild(txt);
        layers.trackLabels.appendChild(badge);
      }
    }

    clearChildren(layers.pillarTeeth);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 42 * Math.cos(a);
      const y1 = 42 * Math.sin(a);
      const x2 = 49 * Math.cos(a + 0.08);
      const y2 = 49 * Math.sin(a + 0.08);
      const x3 = 49 * Math.cos(a - 0.08);
      const y3 = 49 * Math.sin(a - 0.08);
      layers.pillarTeeth.appendChild(
        svg('path', {
          d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} Z`,
        }),
      );
    }

    // Ladder rungs (the rig sits near the rim, pointing up before rotation).
    clearChildren(layers.rungs);
    for (let i = 0; i < 4; i++) {
      const y = -268 + i * 19;
      layers.rungs.appendChild(
        svg('rect', { class: 'sp-ladder__rung', x: -14, y, width: 28, height: 5, rx: 2 }),
      );
    }

    updateTunnelPath();
  }

  function updateTunnelPath() {
    // A short channel hugging the rim that links only the L1 and L2 levers,
    // implying the buried passage between them. It bows gently outward so it
    // never crosses the gear field.
    const p1 = pointAt(1, null, SWITCH_RADIUS);
    const p2 = pointAt(2, null, SWITCH_RADIUS);
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const mr = Math.hypot(mx, my) || 1;
    const bow = (SWITCH_RADIUS + 34) / mr; // push control point outward
    layers.tunnelPath.setAttribute(
      'd',
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Q ${(mx * bow).toFixed(2)} ${(my * bow).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Intersections
  // ---------------------------------------------------------------------------
  function drawIntersections() {
    clearChildren(layers.intersections);
    for (const line of LINES) {
      for (let t = 1; t <= 4; t++) {
        const { x, y } = pointAt(line, t);
        const dot = svg('circle', {
          class: 'sp-intersection',
          cx: x.toFixed(2),
          cy: y.toFixed(2),
          r: 14,
          'data-line': line,
          'data-track': t,
          'data-target': line === state.targetLine ? 'true' : 'false',
        });
        dot.addEventListener('click', (e) => {
          // Suppress clicks immediately after a drag.
          if (drag.justDropped) return;
          handleIntersectionClick(line, t);
        });
        layers.intersections.appendChild(dot);
      }
    }
  }

  function setDropHint(line, track) {
    layers.intersections
      .querySelectorAll('.sp-intersection[data-drop="true"]')
      .forEach((el) => el.removeAttribute('data-drop'));
    if (line == null) return;
    const el = layers.intersections.querySelector(
      `.sp-intersection[data-line="${line}"][data-track="${track}"]`,
    );
    if (el) el.setAttribute('data-drop', 'true');
  }

  // ---------------------------------------------------------------------------
  // Switches
  // ---------------------------------------------------------------------------
  function drawSwitches() {
    clearChildren(layers.switches);
    for (const line of LINES) {
      const types = state.switches[line] || [];
      if (types.length === 0) continue;
      const a = angleRad(line);
      const perp = { x: Math.cos(a), y: Math.sin(a) };
      types.forEach((type, idx) => {
        const offset = (idx - (types.length - 1) / 2) * 56;
        const cx = SWITCH_RADIUS * Math.sin(a) + perp.x * offset;
        const cy = -SWITCH_RADIUS * Math.cos(a) + perp.y * offset;
        const isBlocked =
          state.blocked &&
          state.blocked.line === line &&
          state.blocked.type === type &&
          !isProtected(line, type);
        const isProt =
          state.blocked &&
          state.blocked.line === line &&
          state.blocked.type === type &&
          isProtected(line, type);
        const stateAttr = isBlocked ? 'blocked' : isProt ? 'protected' : 'normal';

        const protectedLever = isProtected(line, type);
        const g = svg('g', {
          class: 'sp-switch',
          'data-line': line,
          'data-type': type,
          'data-state': stateAttr,
          'data-linked': protectedLever ? 'true' : 'false',
          'data-target': line === state.targetLine ? 'true' : 'false',
          transform: `translate(${cx.toFixed(2)} ${cy.toFixed(2)})`,
        });
        g.appendChild(
          svg('rect', {
            class: 'sp-switch__plate',
            x: -30,
            y: -23,
            width: 60,
            height: 46,
            rx: 11,
            ry: 11,
          }),
        );
        const glyph = svg('text', { class: 'sp-switch__glyph', y: -3 });
        glyph.textContent = SWITCH_GLYPH[type];
        g.appendChild(glyph);
        const label = svg('text', { class: 'sp-switch__label', y: 14 });
        label.textContent = `L${line} ${SWITCH_LABEL[type]}`;
        g.appendChild(label);

        // Corner badge: a lock when the ladder blocks this lever, a link when
        // the secret tunnel keeps it usable.
        if (isBlocked || protectedLever) {
          const badge = svg('g', {
            class: 'sp-switch__badge',
            transform: 'translate(22 -22)',
          });
          badge.appendChild(svg('circle', { class: 'sp-switch__badge-dot', r: 9 }));
          const bg = svg('text', { class: 'sp-switch__badge-glyph', y: 0.5 });
          bg.textContent = isBlocked ? '✖' : '⚯';
          badge.appendChild(bg);
          g.appendChild(badge);
        }

        // Clicking a lever selects its line as the target (the blocked-lever
        // dropdown still controls which lever the ladder blocks).
        g.addEventListener('click', () => setTargetLine(line));
        layers.switches.appendChild(g);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Gears (with drag-and-drop)
  // ---------------------------------------------------------------------------
  const drag = {
    id: null,
    startLine: null,
    startTrack: null,
    pointerId: null,
    pointerStart: null,
    justDropped: false,
  };

  function makeGearElement(gear) {
    const { x, y } = pointAt(gear.line, gear.track);
    const g = svg('g', {
      class: 'sp-gear',
      'data-id': gear._id,
      'data-line': gear.line,
      'data-track': gear.track,
      transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})`,
    });
    g.appendChild(svg('circle', { class: 'sp-gear__halo', r: 21, cx: 0, cy: 0 }));
    const spin = svg('g', { class: 'sp-gear__spin' });
    const teeth = svg('g', { class: 'sp-gear__teeth' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cx = 14 * Math.cos(a);
      const cy = 14 * Math.sin(a);
      teeth.appendChild(
        svg('path', {
          d: `M ${cx - 3} ${cy - 6} L ${cx + 3} ${cy - 6} L ${cx + 2} ${cy - 2} L ${cx - 2} ${cy - 2} Z`,
          transform: `rotate(${((a * 180) / Math.PI).toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`,
        }),
      );
    }
    spin.appendChild(teeth);
    spin.appendChild(svg('circle', { class: 'sp-gear__body', r: 13, cx: 0, cy: 0 }));
    spin.appendChild(svg('circle', { class: 'sp-gear__bolt', r: 4, cx: 0, cy: 0 }));
    g.appendChild(spin);

    g.addEventListener('pointerdown', (e) => startDrag(e, gear._id));
    return g;
  }

  function renderGears() {
    clearChildren(layers.gears);
    state.gears.forEach((gear) => layers.gears.appendChild(makeGearElement(gear)));
  }

  function moveGearElements(moves) {
    state.gears.forEach((gear, i) => {
      const el = layers.gears.querySelector(`[data-id="${gear._id}"]`);
      if (!el) return;
      const { x, y } = pointAt(gear.line, gear.track);
      el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      el.setAttribute('data-line', gear.line);
      el.setAttribute('data-track', gear.track);
      const m = moves[i];
      if (m === 'cw' || m === 'ccw') {
        el.setAttribute('data-rotating', m);
        setTimeout(() => el.removeAttribute('data-rotating'), 600);
      }
    });
  }

  function clientToSvg(clientX, clientY) {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function nearestFreeIntersection(svgX, svgY, excludeId) {
    let best = null;
    let bestDist = Infinity;
    for (const line of LINES) {
      for (let t = 1; t <= 4; t++) {
        const p = pointAt(line, t);
        const dx = p.x - svgX;
        const dy = p.y - svgY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= bestDist) continue;
        // skip occupied (other gear) intersections
        const occupied = state.gears.find(
          (g) => g.line === line && g.track === t && g._id !== excludeId,
        );
        if (occupied) continue;
        bestDist = d;
        best = { line, track: t, dist: d };
      }
    }
    return best;
  }

  function startDrag(e, id) {
    if (state.isAnimating || state.isComplete) return;
    e.preventDefault();
    e.stopPropagation();
    const gear = state.gears.find((g) => g._id === id);
    if (!gear) return;
    drag.id = id;
    drag.startLine = gear.line;
    drag.startTrack = gear.track;
    drag.pointerId = e.pointerId;
    drag.pointerStart = { x: e.clientX, y: e.clientY };
    drag.justDropped = false;
    const el = layers.gears.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.setAttribute('data-dragging', 'true');
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', onDragEnd);
  }

  function onDragMove(e) {
    if (!drag.id) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const el = layers.gears.querySelector(`[data-id="${drag.id}"]`);
    if (el) el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    const nearest = nearestFreeIntersection(x, y, drag.id);
    if (nearest && nearest.dist <= SNAP_RADIUS * 2) {
      setDropHint(nearest.line, nearest.track);
    } else {
      setDropHint(null);
    }
  }

  function onDragEnd(e) {
    if (!drag.id) return;
    const id = drag.id;
    drag.id = null;
    setDropHint(null);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('pointercancel', onDragEnd);
    const el = layers.gears.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.removeAttribute('data-dragging');
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    const gear = state.gears.find((g) => g._id === id);
    if (!gear) return;

    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const nearest = nearestFreeIntersection(x, y, id);
    // If the pointer barely moved, treat as a click on the gear -> remove it.
    const moved = drag.pointerStart
      ? Math.hypot(e.clientX - drag.pointerStart.x, e.clientY - drag.pointerStart.y) > 4
      : true;
    if (!moved) {
      removeGear(id);
      drag.justDropped = true;
      setTimeout(() => (drag.justDropped = false), 80);
      return;
    }

    if (nearest && nearest.dist <= SNAP_RADIUS) {
      // snap to nearest
      gear.line = nearest.line;
      gear.track = nearest.track;
      // history invalidated by a manual placement
      resetHistory();
    }
    const p = pointAt(gear.line, gear.track);
    if (el) el.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    el.setAttribute('data-line', gear.line);
    el.setAttribute('data-track', gear.track);
    drag.justDropped = true;
    setTimeout(() => (drag.justDropped = false), 80);
    afterBoardChange();
  }

  function removeGear(id) {
    const idx = state.gears.findIndex((g) => g._id === id);
    if (idx < 0) return;
    state.gears.splice(idx, 1);
    resetHistory();
    renderGears();
    afterBoardChange();
  }

  // ---------------------------------------------------------------------------
  // Target line + main switch
  // ---------------------------------------------------------------------------
  function renderTargetLine() {
    const a = angleRad(state.targetLine);
    const end = { x: RADIAL_END * Math.sin(a), y: -RADIAL_END * Math.cos(a) };
    layers.targetLine.setAttribute('x1', '0');
    layers.targetLine.setAttribute('y1', '0');
    layers.targetLine.setAttribute('x2', end.x.toFixed(2));
    layers.targetLine.setAttribute('y2', end.y.toFixed(2));
    layers.targetLine.setAttribute(
      'data-ready',
      isAligned(state.gears, state.targetLine) ? 'true' : 'false',
    );
  }

  function renderMainSwitch() {
    const ready = !state.isComplete && isAligned(state.gears, state.targetLine);
    layers.mainSwitch.setAttribute('data-ready', ready ? 'true' : 'false');
    hud.mainSwitchBtn.disabled = !ready || state.isAnimating;
  }

  function renderTunnelHint() {
    const relevant =
      state.blocked &&
      ((state.blocked.line === 1 && state.blocked.type === 'rotate') ||
        (state.blocked.line === 2 && state.blocked.type === 'outside'));
    layers.tunnel.setAttribute('data-active', relevant ? 'true' : 'false');
  }

  function renderLadder() {
    if (!state.blocked) {
      layers.ladder.setAttribute('data-visible', 'false');
      return;
    }
    // The rig is modelled near the rim pointing up; rotating by the spoke angle
    // leans it against that line's lever without crossing the gear field.
    const angle = LINE_ANGLES_DEG[state.blocked.line];
    layers.ladder.setAttribute('data-visible', 'true');
    layers.ladder.setAttribute(
      'data-protected',
      isProtected(state.blocked.line, state.blocked.type) ? 'true' : 'false',
    );
    layers.ladder.setAttribute('transform', `rotate(${angle})`);
  }

  // ---------------------------------------------------------------------------
  // Target & blocked-lever pickers
  // ---------------------------------------------------------------------------
  // Shared target-line selection, used by both the pill row and the on-board
  // rim levers (clicking a lever picks its line as the target).
  function setTargetLine(line) {
    if (state.isAnimating || state.targetLine === line) return;
    state.targetLine = line;
    drawTargetPicker();
    afterBoardChange();
    setStatus(`Target set to line ${line}.`);
  }

  function drawTargetPicker() {
    clearChildren(hud.targetPicker);
    LINES.forEach((line) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sp-target-picker__pill';
      btn.textContent = `L${line}`;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(line === state.targetLine));
      btn.addEventListener('click', () => setTargetLine(line));
      hud.targetPicker.appendChild(btn);
    });
  }

  function drawBlockedSelect() {
    const sel = hud.blockedSelect;
    clearChildren(sel);
    const opts = [{ value: 'none', label: 'None — every lever free' }];
    for (const line of LINES) {
      for (const type of state.switches[line] || []) {
        opts.push({ value: `${line}:${type}`, label: `L${line} ${SWITCH_LABEL[type]}` });
      }
    }
    opts.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
    const cur = state.blocked
      ? `${state.blocked.line}:${state.blocked.type}`
      : 'none';
    sel.value = cur;
    updateBlockedHint();
  }

  function updateBlockedHint() {
    if (!state.blocked) {
      hud.blockedHint.textContent = 'No lever is blocked.';
      return;
    }
    const { line, type } = state.blocked;
    if (isProtected(line, type)) {
      hud.blockedHint.textContent =
        `L${line} ${SWITCH_LABEL[type]} would be blocked, but the secret tunnel keeps it usable.`;
    } else {
      hud.blockedHint.textContent =
        `L${line} ${SWITCH_LABEL[type]} is blocked by the ladder.`;
    }
  }

  // ---------------------------------------------------------------------------
  // HUD updates
  // ---------------------------------------------------------------------------
  function renderHud() {
    hud.gearCount.textContent = `${state.gears.length} / ${MAX_GEARS}`;
    hud.moves.textContent = String(state.moveCount);
    hud.undo.disabled = state.history.length === 0 || state.isAnimating;
    hud.playBtn.disabled =
      !state.solverPath ||
      state.solverPath.length === 0 ||
      state.isAnimating ||
      state.solverCursor >= state.solverPath.length;
    hud.hintBtn.disabled = hud.playBtn.disabled;
  }

  function setStatus(text, tone) {
    hud.status.textContent = text;
    if (tone) hud.status.setAttribute('data-tone', tone);
    else hud.status.removeAttribute('data-tone');
  }

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  function handleIntersectionClick(line, track) {
    if (state.isAnimating || state.isComplete) return;
    const existing = state.gears.find((g) => g.line === line && g.track === track);
    if (existing) {
      removeGear(existing._id);
      return;
    }
    if (state.gears.length >= MAX_GEARS) {
      setStatus(`Already at ${MAX_GEARS} gears. Remove one first.`, 'warn');
      return;
    }
    const gear = assignId({ line, track });
    state.gears.push(gear);
    resetHistory();
    renderGears();
    afterBoardChange();
  }


  function pushAction(action, fromUser) {
    const prevGears = cloneGears(state.gears);
    const { gears: nextGears, moved } = applyAction(state.gears, action);
    nextGears.forEach((g, i) => (g._id = state.gears[i]._id));
    state.history.push({
      gears: prevGears.map((g, i) => ({ ...g, _id: state.gears[i]._id })),
      moveCount: state.moveCount,
    });
    state.gears = nextGears;
    state.moveCount += 1;

    const switchEl = layers.switches.querySelector(
      `.sp-switch[data-line="${action.line}"][data-type="${action.type}"]`,
    );
    if (switchEl) {
      switchEl.setAttribute('data-flash', 'true');
      setTimeout(() => switchEl.removeAttribute('data-flash'), 420);
    }

    state.isAnimating = true;
    renderHud();
    moveGearElements(moved);

    setTimeout(() => {
      state.isAnimating = false;
      renderTargetLine();
      renderMainSwitch();
      renderHud();
      const aligned = isAligned(state.gears, state.targetLine);
      if (aligned) {
        setStatus(
          `Aligned on line ${state.targetLine}. Throw the Main Switch to lock in.`,
          'ok',
        );
      } else if (fromUser) {
        setStatus(`L${action.line} ${SWITCH_LABEL[action.type]} applied.`);
      }
      // advance the solver cursor when the user (or auto-play) presses the
      // action we're currently suggesting
      if (
        state.solverPath &&
        state.solverPath[state.solverCursor] &&
        state.solverPath[state.solverCursor].line === action.line &&
        state.solverPath[state.solverCursor].type === action.type
      ) {
        state.solverCursor += 1;
        markSolverProgress();
      } else if (fromUser) {
        // user deviated from solver — invalidate
        clearSolverPath();
      }
      updateDevPanel();
    }, STEP_DURATION);
  }

  function undo() {
    if (state.history.length === 0 || state.isAnimating) return;
    const prev = state.history.pop();
    state.gears = prev.gears;
    state.moveCount = prev.moveCount;
    renderGears();
    renderTargetLine();
    renderMainSwitch();
    renderHud();
    setStatus('Move undone.');
    if (state.solverCursor > 0) state.solverCursor -= 1;
    markSolverProgress();
    updateDevPanel();
  }

  function clearBoard() {
    state.gears = [];
    resetHistory();
    renderGears();
    afterBoardChange();
    setStatus('Board cleared. Click intersections to place new gears.');
  }

  function resetPuzzle() {
    state.gears = cloneGears(DEFAULT_GEARS).map(assignId);
    state.targetLine = 1;
    state.blocked = { line: 5, type: 'outside' };
    state.switches = { ...DEFAULT_SWITCHES };
    state.isComplete = false;
    hideCompletionOverlay();
    resetHistory();
    drawTargetPicker();
    drawBlockedSelect();
    drawIntersections();
    drawSwitches();
    renderGears();
    renderTargetLine();
    renderMainSwitch();
    renderLadder();
    renderTunnelHint();
    clearSolverPath();
    renderHud();
    setStatus('Puzzle reset to the default starting layout.');
  }

  function resetHistory() {
    state.history = [];
    state.moveCount = 0;
  }

  function afterBoardChange() {
    drawSwitches();
    drawIntersections();
    renderTargetLine();
    renderMainSwitch();
    renderLadder();
    renderTunnelHint();
    clearSolverPath();
    renderHud();
    updateDevPanel();
  }

  function pressMainSwitch() {
    if (!isAligned(state.gears, state.targetLine) || state.isAnimating) return;
    state.isComplete = true;
    state.isAnimating = true;
    hud.mainSwitchBtn.disabled = true;
    layers.pillar.setAttribute('data-spinning', 'true');
    setStatus(
      `Locked in. Four gears aligned on line ${state.targetLine}.`,
      'done',
    );
    setTimeout(() => {
      layers.pillar.removeAttribute('data-spinning');
      state.isAnimating = false;
      showCompletionOverlay();
      renderHud();
    }, 1100);
  }

  // ---------------------------------------------------------------------------
  // Solver UI
  // ---------------------------------------------------------------------------
  function describeAction(a) {
    return `L${a.line} · ${SWITCH_LABEL[a.type]}`;
  }

  function runSolver() {
    if (state.isAnimating) return;
    setStatus('Solving…');
    hud.solverBody.removeAttribute('data-tone');
    hud.solverBody.textContent = 'Computing…';
    // Run in a microtask so the UI can paint the "Computing…" message.
    setTimeout(() => {
      const result = solve({
        gears: cloneGears(state.gears),
        targetLine: state.targetLine,
        switches: state.switches,
        blocked: state.blocked,
      });
      handleSolverResult(result);
    }, 16);
  }

  function handleSolverResult(result) {
    if (result.status === 'too-few') {
      hud.solverBody.setAttribute('data-tone', 'warn');
      hud.solverBody.textContent =
        'Place at least four gears on the board, then press Solve.';
      clearSolverPath();
      return;
    }
    if (result.status === 'no-actions') {
      hud.solverBody.setAttribute('data-tone', 'warn');
      hud.solverBody.textContent =
        'No usable levers in the current configuration.';
      clearSolverPath();
      return;
    }
    if (result.status === 'aligned') {
      hud.solverBody.setAttribute('data-tone', 'ok');
      hud.solverBody.textContent =
        `Already aligned on line ${state.targetLine}. Throw the Main Switch.`;
      state.solverPath = [];
      state.solverCursor = 0;
      renderHud();
      return;
    }
    if (result.status === 'unsolvable' || result.status === 'limit') {
      hud.solverBody.setAttribute('data-tone', 'warn');
      hud.solverBody.textContent =
        result.status === 'limit'
          ? 'Search limit reached. Try clearing some gears, picking a different target, or unblocking the lever.'
          : 'No alignment is reachable from this configuration. Adjust the gears or change the blocked lever.';
      clearSolverPath();
      return;
    }

    state.solverPath = result.path;
    state.solverCursor = 0;
    renderSolverPath();
    setStatus(
      `Solver found a ${result.path.length}-lever sequence to align line ${state.targetLine}.`,
      'ok',
    );
    renderHud();
  }

  function renderSolverPath() {
    const path = state.solverPath;
    if (!path) {
      hud.solverBody.textContent =
        'Place at least four gears and press Solve. The mechanism will print the levers to press in order.';
      return;
    }
    if (path.length === 0) {
      hud.solverBody.setAttribute('data-tone', 'ok');
      hud.solverBody.textContent =
        `Already aligned on line ${state.targetLine}. Throw the Main Switch.`;
      return;
    }
    hud.solverBody.setAttribute('data-tone', 'ok');
    clearChildren(hud.solverBody);
    const heading = document.createElement('p');
    heading.style.margin = '0 0 0.45rem';
    heading.innerHTML = `<strong>${path.length} step${path.length === 1 ? '' : 's'}</strong> · target line ${state.targetLine}`;
    hud.solverBody.appendChild(heading);
    const list = document.createElement('ol');
    list.className = 'sp-solver__steps';
    path.forEach((a, i) => {
      const li = document.createElement('li');
      const num = document.createElement('span');
      num.className = 'sp-solver__num';
      num.textContent = `${i + 1}.`;
      const txt = document.createElement('span');
      txt.textContent = describeAction(a);
      li.appendChild(num);
      li.appendChild(txt);
      list.appendChild(li);
    });
    hud.solverBody.appendChild(list);

    const inline = document.createElement('p');
    inline.className = 'sp-solver__inline';
    inline.textContent = path.map(describeAction).join('  →  ');
    hud.solverBody.appendChild(inline);

    markSolverProgress();
  }

  function markSolverProgress() {
    if (!state.solverPath) return;
    const items = hud.solverBody.querySelectorAll('.sp-solver__steps li');
    items.forEach((li, i) =>
      li.setAttribute('data-current', i === state.solverCursor ? 'true' : 'false'),
    );
  }

  function clearSolverPath() {
    state.solverPath = null;
    state.solverCursor = 0;
    hud.solverBody.removeAttribute('data-tone');
    hud.solverBody.textContent =
      'Configuration changed — press Solve to recompute the lever sequence.';
    renderHud();
  }

  function playSolver() {
    if (!state.solverPath || state.solverCursor >= state.solverPath.length) return;
    if (state.isAnimating) return;
    const action = state.solverPath[state.solverCursor];
    pushAction(action, false);
    // queue the next step after the animation completes
    setTimeout(() => {
      if (state.solverPath && state.solverCursor < state.solverPath.length) {
        playSolver();
      }
    }, STEP_DURATION + 60);
  }

  function showHintStep() {
    if (!state.solverPath || state.solverCursor >= state.solverPath.length) return;
    const a = state.solverPath[state.solverCursor];
    setStatus(`Hint: press ${describeAction(a)}.`, 'ok');
    const el = layers.switches.querySelector(
      `.sp-switch[data-line="${a.line}"][data-type="${a.type}"]`,
    );
    if (el) {
      el.setAttribute('data-flash', 'true');
      setTimeout(() => el.removeAttribute('data-flash'), 600);
    }
  }

  // ---------------------------------------------------------------------------
  // Completion overlay
  // ---------------------------------------------------------------------------
  function ensureCompletionOverlay() {
    let overlay = root.querySelector('.sp-complete');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'sp-complete';
    overlay.innerHTML = `
      <div>
        <h3>Aligned</h3>
        <p>Four gears settled on the target line. The pillar advances.</p>
        <button class="sp-btn" type="button" data-sp-replay>Play Again</button>
      </div>
    `;
    root.appendChild(overlay);
    overlay
      .querySelector('[data-sp-replay]')
      .addEventListener('click', () => {
        hideCompletionOverlay();
        resetPuzzle();
      });
    return overlay;
  }
  function showCompletionOverlay() {
    ensureCompletionOverlay().setAttribute('data-visible', 'true');
  }
  function hideCompletionOverlay() {
    const o = root.querySelector('.sp-complete');
    if (o) o.setAttribute('data-visible', 'false');
  }

  // ---------------------------------------------------------------------------
  // Dev panel
  // ---------------------------------------------------------------------------
  function updateDevPanel() {
    if (!dev.panel || dev.panel.hidden) return;
    dev.state.textContent =
      `target=L${state.targetLine} blocked=${
        state.blocked ? `L${state.blocked.line}:${state.blocked.type}` : 'none'
      } gears=[${encodeGears(state.gears) || 'empty'}] moves=${state.moveCount}`;
  }

  // ---------------------------------------------------------------------------
  // Wire UI
  // ---------------------------------------------------------------------------
  hud.undo.addEventListener('click', undo);
  hud.clear.addEventListener('click', clearBoard);
  hud.reset.addEventListener('click', resetPuzzle);
  hud.mainSwitchBtn.addEventListener('click', pressMainSwitch);
  layers.mainSwitch.addEventListener('click', pressMainSwitch);

  hud.solveBtn.addEventListener('click', runSolver);
  hud.playBtn.addEventListener('click', playSolver);
  hud.hintBtn.addEventListener('click', showHintStep);

  hud.blockedSelect.addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'none') state.blocked = null;
    else {
      const [line, type] = v.split(':');
      state.blocked = { line: Number(line), type };
    }
    drawSwitches();
    renderLadder();
    renderTunnelHint();
    updateBlockedHint();
    clearSolverPath();
    updateDevPanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'd' && e.key !== 'D') return;
    const target = e.target;
    const tag = target && target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!dev.panel) return;
    dev.panel.hidden = !dev.panel.hidden;
    if (!dev.panel.hidden) updateDevPanel();
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  drawStaticDecor();
  drawTargetPicker();
  drawBlockedSelect();
  drawIntersections();
  drawSwitches();
  renderGears();
  renderTargetLine();
  renderMainSwitch();
  renderLadder();
  renderTunnelHint();
  renderHud();
  updateDevPanel();
})();
