<script>
  import { base } from '$app/paths';
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.category.title} — Zhery Field Guide</title>
  <meta name="description" content={data.category.blurb} />
</svelte:head>

<div class="wrap wrap--wide">
  <nav class="breadcrumb">
    <a href="{base}/">Home</a><span class="sep">/</span><span>{data.category.title}</span>
  </nav>

  <header class="page-head">
    <span class="kicker">{data.category.icon} Category</span>
    <h1>{data.category.title}</h1>
    {#if data.category.blurb}<p class="lede">{data.category.blurb}</p>{/if}
  </header>

  <div class="card-grid">
    {#each data.sections as sec}
      <a class="tile" href={`${base}/${data.category.slug}/${sec.slug}`}>
        <div class="tile__title">{sec.title}</div>
        <p class="tile__desc">{sec.description}</p>
        <div class="tile__meta">{sec.count} {sec.count === 1 ? 'entry' : 'entries'}</div>
      </a>
    {/each}
  </div>
</div>
