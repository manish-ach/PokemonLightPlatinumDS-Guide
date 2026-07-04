<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import '$lib/sunPalace.css';

  onMount(async () => {
    const { initSunPalace } = await import('$lib/sunPalace.js');
    initSunPalace();
  });
</script>

<svelte:head>
  <title>Sun Palace Gear Puzzle Solver — Zhery Field Guide</title>
  <meta
    name="description"
    content="Interactive solver for the Sun Palace gear puzzle in Pokémon Light Platinum DS. Place gears, pick a target line, and read the exact lever sequence that aligns the pillar."
  />
</svelte:head>

<div class="wrap wrap--wide">
  <nav class="breadcrumb">
    <a href="{base}/">Home</a><span class="sep">/</span>
    <a href="{base}/reference">Reference</a><span class="sep">/</span>
    <span>Sun Palace Puzzle</span>
  </nav>
  <header class="page-head">
    <span class="kicker">Route 412 · Sun Ruins</span>
    <h1>Sun Palace Gear Puzzle Solver</h1>
    <p class="lede">
      Place gears on the mechanism, choose the line you want to align, and the solver prints the exact
      lever order. Auto-play watches it solve itself.
    </p>
  </header>

  <div class="sp-app" style="padding:0">
    <div class="sp-order-banner" role="note" aria-label="Required alignment order">
      <span class="sp-order-banner__label">Solve order</span>
      <span class="sp-order-banner__chain">
        <span class="sp-order-banner__step">L3</span>
        <span class="sp-order-banner__arrow" aria-hidden="true">→</span>
        <span class="sp-order-banner__step">L2</span>
        <span class="sp-order-banner__arrow" aria-hidden="true">→</span>
        <span class="sp-order-banner__step">L1</span>
        <span class="sp-order-banner__arrow" aria-hidden="true">→</span>
        <span class="sp-order-banner__step sp-order-banner__step--final">L5</span>
      </span>
      <span class="sp-order-banner__note">
        Align the lines in this order. After each one, climb to the floor above and throw the wall
        switch to turn the pillar.
      </span>
    </div>

    <div class="sp-layout">
      <section class="sp-stage" aria-label="Gear board">
        <p class="sp-status" data-sp-status>Click a slot to drop a gear. You can place up to six.</p>

        <div class="sp-toolbar">
          <button class="sp-btn" type="button" data-sp-undo>Undo</button>
          <button class="sp-btn" type="button" data-sp-clear>Clear</button>
          <button class="sp-btn sp-btn--ghost" type="button" data-sp-reset>Reset</button>
        </div>

        <div class="sp-board" data-sp-board>
          <svg
            class="sp-svg"
            viewBox="-340 -340 680 680"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Sun Palace gear board"
          >
            <defs>
              <radialGradient id="sp-floor-grad" cx="50%" cy="42%" r="68%">
                <stop offset="0%" stop-color="#3c2c1d" />
                <stop offset="62%" stop-color="#2a1d12" />
                <stop offset="100%" stop-color="#160e08" />
              </radialGradient>
              <radialGradient id="sp-pillar-grad" cx="50%" cy="38%" r="72%">
                <stop offset="0%" stop-color="#6a563f" />
                <stop offset="55%" stop-color="#3a2a1c" />
                <stop offset="100%" stop-color="#1e140c" />
              </radialGradient>
              <radialGradient id="sp-gear-grad" cx="38%" cy="32%" r="72%">
                <stop offset="0%" stop-color="#bcd6f2" />
                <stop offset="52%" stop-color="#5285bd" />
                <stop offset="100%" stop-color="#27466e" />
              </radialGradient>
            </defs>

            <circle r="318" class="sp-floor" />
            <circle r="284" class="sp-floor-inner" />

            <g data-sp-tracks></g>
            <g data-sp-track-labels></g>
            <g data-sp-radials></g>

            <line data-sp-target-line class="sp-target-line" x1="0" y1="0" x2="0" y2="0" />

            <g data-sp-intersections></g>

            <g class="sp-tunnel" data-sp-tunnel>
              <path d="" fill="none" class="sp-tunnel__path" data-sp-tunnel-path />
            </g>

            <g class="sp-pillar" data-sp-pillar>
              <circle r="58" class="sp-pillar__shadow" />
              <circle r="52" class="sp-pillar__body" />
              <circle r="52" class="sp-pillar__rim" />
              <g class="sp-pillar__inner">
                <circle r="36" class="sp-pillar__core" />
                <g class="sp-pillar__teeth" data-sp-pillar-teeth></g>
                <circle r="11" class="sp-pillar__bolt" />
              </g>
            </g>

            <g data-sp-gears></g>
            <g data-sp-switches></g>

            <g class="sp-ladder" data-sp-ladder aria-hidden="true">
              <rect class="sp-ladder__rail" x="-16" y="-276" width="6" height="70" rx="3" />
              <rect class="sp-ladder__rail" x="10" y="-276" width="6" height="70" rx="3" />
              <g class="sp-ladder__rungs" data-sp-rungs></g>
            </g>

            <g class="sp-main-switch" data-sp-mainswitch tabindex="0" role="button" aria-label="Main switch">
              <circle r="30" class="sp-main-switch__ring" />
              <circle r="22" class="sp-main-switch__core" />
              <text y="6" text-anchor="middle" class="sp-main-switch__label">MAIN</text>
            </g>
          </svg>
        </div>

        <div class="sp-controls">
          <button class="sp-btn sp-btn--primary" type="button" data-sp-mainswitch-btn disabled>
            Throw Main Switch
          </button>
        </div>
      </section>

      <aside class="sp-panel">
        <div class="sp-panel-card sp-config">
          <div class="sp-field">
            <p class="eyebrow">Target Line</p>
            <div class="sp-target-picker" data-sp-target-picker role="radiogroup" aria-label="Target line"></div>
          </div>
          <div class="sp-field">
            <p class="eyebrow">Blocked Lever</p>
            <select class="sp-select" data-sp-blocked-select aria-label="Blocked lever"></select>
            <p class="sp-config__hint" data-sp-blocked-hint></p>
          </div>
          <div class="sp-config__stats">
            <div class="sp-stat-chip">
              <span class="sp-stat-chip__key">Gears</span>
              <strong class="sp-stat-chip__val" data-sp-gear-count>0 / 6</strong>
            </div>
            <div class="sp-stat-chip">
              <span class="sp-stat-chip__key">Moves</span>
              <strong class="sp-stat-chip__val" data-sp-moves>0</strong>
            </div>
          </div>
        </div>

        <div class="sp-panel-card sp-solver" data-sp-solver>
          <div class="sp-solver__head">
            <p class="eyebrow">Lever Sequence</p>
          </div>
          <div class="sp-solver__actions">
            <button class="sp-btn sp-btn--primary" type="button" data-sp-solve>Solve</button>
            <button class="sp-btn" type="button" data-sp-play disabled>Auto-play</button>
            <button class="sp-btn sp-btn--ghost" type="button" data-sp-hint disabled>Hint</button>
          </div>
          <div class="sp-solver__body" data-sp-solver-body>
            Place at least four gears and press <strong>Solve</strong> to get the exact lever order.
          </div>
        </div>

        <div class="sp-panel-card sp-legend sp-legend--key">
          <p class="eyebrow">Reading the board</p>
          <ul>
            <li><span class="sp-key sp-key--red"></span>Red track: gears step clockwise</li>
            <li><span class="sp-key sp-key--green"></span>Green track: gears step anticlockwise</li>
            <li><span class="sp-key sp-key--target"></span>Gold line: your target (needs 4 gears)</li>
            <li><span class="sp-key sp-key--ladder"></span>Ladder: leans on the blocked lever</li>
            <li><span class="sp-key sp-key--link">⚯</span>Linked levers stay usable via the tunnel</li>
          </ul>
        </div>

        <details class="sp-help">
          <summary>How to play</summary>
          <ol>
            <li>Click a slot to drop a gear (up to six). Click it again to remove, or drag it to move.</li>
            <li>Pick your <strong>target line</strong> and which lever the <strong>ladder blocks</strong>.</li>
            <li>Press <strong>Solve</strong>, then Auto-play or press the levers in the listed order.</li>
            <li>With four gears on the target line, <strong>Throw the Main Switch</strong>.</li>
          </ol>
        </details>
      </aside>
    </div>
  </div>
</div>
