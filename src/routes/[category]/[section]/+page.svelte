<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { foundAt } from '$lib/content.js';
  let { data } = $props();

  const fields = $derived(data.section.fields?.length ? data.section.fields : [{ key: 'name', label: 'Name' }]);
  const hasImages = $derived(data.entries.some((e) => e.image_url));

  let query = $state('');
  let sortKey = $state('');
  let sortDir = $state(1);
  let selected = $state(null);

  const detailFields = $derived(fields.filter((f) => f.key !== 'name'));
  function pick(e) {
    selected = e;
  }
  function keypick(ev, e) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      selected = e;
    }
  }
  function onWinKey(e) {
    if (e.key === 'Escape') selected = null;
  }

  let foundItems = $state([]);

  onMount(openFromHash);
  function openFromHash() {
    const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (!h) return;
    const e = data.entries.find((x) => x.slug === h);
    if (e) selected = e;
  }

  // When a location is open, list everything found there.
  $effect(() => {
    const s = selected;
    if (s && data.section.slug === 'locations') {
      foundAt(s.name)
        .then((x) => (foundItems = x))
        .catch(() => (foundItems = []));
    } else {
      foundItems = [];
    }
  });

  function cell(entry, key) {
    return key === 'name' ? entry.name : (entry.data?.[key] ?? '');
  }

  const rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    let list = data.entries;
    if (q) {
      list = list.filter((e) =>
        fields.some((f) => String(cell(e, f.key)).toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = String(cell(a, sortKey)).toLowerCase();
        const bv = String(cell(b, sortKey)).toLowerCase();
        return av < bv ? -sortDir : av > bv ? sortDir : 0;
      });
    }
    return list;
  });

  function sortBy(key) {
    if (sortKey === key) sortDir = -sortDir;
    else {
      sortKey = key;
      sortDir = 1;
    }
  }
</script>

<svelte:head>
  <title>{data.section.title} — {data.category.title} — Zhery Field Guide</title>
  <meta name="description" content={data.section.description} />
</svelte:head>

<svelte:window onkeydown={onWinKey} onhashchange={openFromHash} />

{#if selected}
  <div class="modal-backdrop" onclick={() => (selected = null)} role="presentation">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label={selected.name}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal__head">
        {#if selected.image_url}<img class="modal__sprite" src={base + selected.image_url} alt={selected.name} />{/if}
        <div class="modal__title">
          <h2>{selected.name}</h2>
          <div class="sub">{data.category.title} · {data.section.title}</div>
        </div>
        <button class="modal__close" onclick={() => (selected = null)} aria-label="Close">✕</button>
      </div>
      <div class="modal__body">
        <dl class="deflist">
          {#each detailFields as f}
            {#if cell(selected, f.key)}
              <dt>{f.label}</dt>
              <dd>{cell(selected, f.key)}</dd>
            {/if}
          {/each}
        </dl>
        {#if data.section.slug === 'locations'}
          {#if foundItems.length}
            <div class="found">
              <p class="found__label">Found here — {foundItems.length}</p>
              <div class="found__list">
                {#each foundItems as it}
                  <a class="found__item" href={it.href}>
                    {#if it.image_url}<img src={base + it.image_url} alt="" />{:else}<span class="found__dot"></span>{/if}
                    <span class="found__text">
                      <span class="found__name">{it.name}</span>
                      <span class="found__sec">{it.section_title}</span>
                    </span>
                  </a>
                {/each}
              </div>
            </div>
          {:else}
            <p class="detail-hint">No catalogued pickups recorded here yet.</p>
          {/if}
        {:else if selected.data?.spots?.length}
          <div class="loc-gallery">
            {#each selected.data.spots as sp}
              <figure class="loc-figure">
                <figcaption>◎ {sp.at}</figcaption>
                <img src={base + sp.img} alt={sp.at} loading="lazy" />
              </figure>
            {/each}
          </div>
        {:else if selected.location_image_url}
          <figure class="loc-figure">
            <figcaption>◎ In-game location</figcaption>
            <img src={base + selected.location_image_url} alt={`Where to find ${selected.name}`} loading="lazy" />
          </figure>
        {:else}
          <p class="detail-hint">No location screenshot for this one yet.</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<div class="wrap wrap--wide">
  <nav class="breadcrumb">
    <a href="{base}/">Home</a><span class="sep">/</span>
    <a href={`${base}/${data.category.slug}`}>{data.category.title}</a><span class="sep">/</span>
    <span>{data.section.title}</span>
  </nav>

  <header class="page-head">
    <span class="kicker">{data.category.title}</span>
    <h1>{data.section.title}</h1>
    {#if data.section.description}<p class="lede">{data.section.description}</p>{/if}
  </header>

  <div class="filterbar">
    <input
      class="input search-input"
      type="search"
      placeholder={`Filter ${data.section.title.toLowerCase()}…`}
      bind:value={query}
    />
    <span class="result-count">{rows.length} of {data.entries.length}</span>
  </div>

  {#if data.entries.length === 0}
    <div class="table-wrap"><div class="empty">Nothing here yet.</div></div>
  {:else if data.section.layout === 'cards'}
    <div class="card-grid">
      {#each rows as e (e.id)}
        <article
          class="card loc-card detail-row"
          id={e.slug}
          role="button"
          tabindex="0"
          onclick={() => pick(e)}
          onkeydown={(ev) => keypick(ev, e)}
        >
          {#if e.image_url}<img class="loc-card__img" src={base + e.image_url} alt={e.name} loading="lazy" />{/if}
          <div class="loc-card__head">
            <h3>{e.name}</h3>
            {#if e.data?.kind}<span class="chip chip--kind">{e.data.kind}</span>{/if}
          </div>
          {#each fields.filter((f) => f.key !== 'name' && f.key !== 'kind') as f}
            {#if e.data?.[f.key]}<p>{e.data[f.key]}</p>{/if}
          {/each}
        </article>
      {/each}
    </div>
  {:else}
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            {#if hasImages}<th style="width:60px"></th>{/if}
            {#each fields as f}
              <th onclick={() => sortBy(f.key)}>
                {f.label}
                {#if sortKey === f.key}<span class="arrow">{sortDir === 1 ? '↑' : '↓'}</span>{/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as e (e.id)}
            <tr
              id={e.slug}
              class="detail-row"
              role="button"
              tabindex="0"
              onclick={() => pick(e)}
              onkeydown={(ev) => keypick(ev, e)}
            >
              {#if hasImages}
                <td>{#if e.image_url}<img class="thumb" src={base + e.image_url} alt={e.name} loading="lazy" />{/if}</td>
              {/if}
              {#each fields as f, i}
                <td class={i === 0 || f.key === 'name' ? 'name' : ''}>
                  {#if f.key === 'tm' || f.key === 'hm'}
                    <span class="chip chip--mono chip--accent">{cell(e, f.key)}</span>
                  {:else}
                    {cell(e, f.key)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if rows.length === 0}
            <tr><td colspan={fields.length + (hasImages ? 1 : 0)}><div class="empty">No matches for “{query}”.</div></td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>
