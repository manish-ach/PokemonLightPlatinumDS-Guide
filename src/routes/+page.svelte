<script>
  import { base } from '$app/paths';
  let { data } = $props();
</script>

<svelte:head>
  <title>Zhery Field Guide — Pokémon Light Platinum DS</title>
  <meta
    name="description"
    content="A community field guide to Pokémon Light Platinum DS: where to catch every Pokémon, every item, TM, HM, berry, medal, town, and route in the Zhery region — plus the Sun Palace puzzle solver."
  />
</svelte:head>

<div class="wrap wrap--wide">
  <section class="hero">
    <span class="page-head kicker" style="margin:0">Zhery Region</span>
    <h1>The field guide to Pokémon Light Platinum DS</h1>
    <p>
      Every Pokémon source, item pickup, TM, HM, berry, medal, town, and route — organised, searchable,
      and kept up to date. Start anywhere below or search from the top bar.
    </p>
    <div class="row" style="flex-wrap:wrap;gap:0.7rem">
      <a class="btn btn--primary" href="{base}/pokemon/acquisition">Browse Pokémon</a>
      <a class="btn" href="{base}/sun-palace">Sun Palace Puzzle Solver</a>
    </div>
    <div class="hero__stats">
      <div class="hero__stat"><b>{data.entryCount}</b><span>Entries</span></div>
      <div class="hero__stat"><b>{data.sectionCount}</b><span>Sections</span></div>
      <div class="hero__stat"><b>{data.catCount}</b><span>Categories</span></div>
    </div>
  </section>

  {#each data.nav as cat}
    <section style="margin-top:2rem">
      <h2 class="section-title"><span style="color:var(--accent)">{cat.icon}</span> &nbsp;{cat.title}</h2>
      <div class="card-grid">
        {#each cat.sections as sec}
          <a class="tile" href={`${base}/${cat.slug}/${sec.slug}`}>
            <div class="tile__title">{sec.title}</div>
            <p class="tile__desc">{sec.description}</p>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>
