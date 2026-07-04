<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import Search from '$lib/components/Search.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  let { data, children } = $props();
  let menuOpen = $state(false);

  const path = $derived($page.url.pathname);
  const isAdmin = $derived(path.startsWith(base + '/admin'));

  // Close the mobile drawer whenever the route changes.
  $effect(() => {
    path;
    menuOpen = false;
  });
</script>

{#if isAdmin}
  {@render children()}
{:else}
  <div class="app">
    <header class="topbar">
      <button
        class="icon-btn mobile-only"
        onclick={() => (menuOpen = !menuOpen)}
        aria-label="Toggle navigation"
      >☰</button>

      <a class="brand" href="{base}/">
        <span class="brand__mark">◓</span>
        <span>
          Zhery Field Guide
          <span class="brand__sub">Light Platinum DS</span>
        </span>
      </a>

      <Search />
      <span class="topbar__spacer"></span>
      <ThemeToggle />
      <a class="btn btn--ghost btn--sm" href="{base}/admin">Admin</a>
    </header>

    {#if menuOpen}
      <div
        class="scrim mobile-only"
        onclick={() => (menuOpen = false)}
        role="presentation"
      ></div>
    {/if}

    <aside class="sidebar" data-open={menuOpen}>
      <a
        class="sidebar__link"
        href="{base}/"
        aria-current={path === base + '/' || path === base ? 'page' : undefined}
        style="margin-bottom:0.9rem"
      >
        <span>⌂</span> Overview
      </a>

      {#each data.nav as cat}
        <div class="sidebar__group">
          <p class="sidebar__label"><span>{cat.icon}</span> {cat.title}</p>
          {#each cat.sections as sec}
            <a
              class="sidebar__link"
              href={`${base}/${cat.slug}/${sec.slug}`}
              aria-current={path === `${base}/${cat.slug}/${sec.slug}` ? 'page' : undefined}
            >
              {sec.title}
            </a>
          {/each}
        </div>
      {/each}

      <div class="sidebar__group">
        <p class="sidebar__label"><span>🛠</span> Tools</p>
        <a
          class="sidebar__link"
          href="{base}/sun-palace"
          aria-current={path === base + '/sun-palace' ? 'page' : undefined}
        >Sun Palace Puzzle Solver</a>
      </div>
    </aside>

    <main class="content">
      {@render children()}
    </main>
  </div>
{/if}
