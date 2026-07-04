<script>
  import { searchContent } from '$lib/content.js';

  let q = $state('');
  let results = $state([]);
  let open = $state(false);
  let timer;

  async function run() {
    const query = q.trim();
    if (!query) {
      results = [];
      open = false;
      return;
    }
    try {
      results = await searchContent(query);
      open = true;
    } catch {
      results = [];
    }
  }

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  }

  function pick() {
    open = false;
    q = '';
    results = [];
  }
</script>

<div class="search-shell">
  <span class="mag" aria-hidden="true">⌕</span>
  <input
    class="search-field"
    type="search"
    placeholder="Search Pokémon, items, routes…"
    bind:value={q}
    oninput={onInput}
    onfocus={() => q.trim() && (open = true)}
    onblur={() => setTimeout(() => (open = false), 140)}
    aria-label="Search the guide"
  />
  {#if open && results.length}
    <div class="search-pop">
      {#each results as r}
        <a href={r.href} onclick={pick}>
          <span class="r-kind">{r.kind}</span>
          <div class="r-title">{r.title}</div>
          <div class="r-sub">{r.sub}</div>
        </a>
      {/each}
    </div>
  {:else if open && q.trim()}
    <div class="search-pop"><div class="r-sub" style="padding:0.6rem 0.65rem">No matches for “{q}”.</div></div>
  {/if}
</div>
