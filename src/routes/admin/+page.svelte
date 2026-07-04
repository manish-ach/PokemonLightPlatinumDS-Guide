<script>
  import '../../app.css';
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { api } from '$lib/adminApi.js';

  let user = $state(null);

  onMount(async () => {
    try {
      user = (await api.me()).user;
    } catch {
      user = null;
    }
  });
  let email = $state('');
  let password = $state('');
  let loginErr = $state('');
  let busy = $state(false);
  let toast = $state('');

  let cats = $state([]);
  let selCat = $state(null);
  let secs = $state([]);
  let selSec = $state(null);
  let entries = $state([]);
  let draft = $state(null); // entry being added/edited

  function flash(msg) {
    toast = msg;
    setTimeout(() => (toast = ''), 2600);
  }
  async function guard(fn, ok) {
    busy = true;
    try {
      await fn();
      if (ok) flash(ok);
    } catch (e) {
      flash('⚠ ' + e.message);
    } finally {
      busy = false;
    }
  }

  $effect(() => {
    if (user && cats.length === 0) refreshCats();
  });

  async function doLogin() {
    loginErr = '';
    try {
      const r = await api.login(email, password);
      user = r.user;
    } catch (e) {
      loginErr = e.message || 'Login failed';
    }
  }
  async function doLogout() {
    await api.logout();
    user = null;
    cats = [];
    selCat = selSec = draft = null;
  }

  async function refreshCats() {
    cats = await api.categories();
  }
  async function selectCat(c) {
    selCat = { ...c };
    selSec = null;
    draft = null;
    secs = await api.sections(c.id);
  }
  async function selectSec(s) {
    selSec = { ...s, fields: s.fields?.length ? s.fields.map((f) => ({ ...f })) : [{ key: 'name', label: 'Name' }] };
    draft = null;
    entries = await api.entries(s.id);
  }

  // categories
  const newCat = () =>
    guard(async () => {
      const c = await api.createCategory({ title: 'New Category', icon: '•', sort_order: cats.length });
      await refreshCats();
      await selectCat(c);
    }, 'Category created');
  const saveCat = () =>
    guard(async () => {
      await api.updateCategory(selCat.id, {
        title: selCat.title,
        icon: selCat.icon,
        blurb: selCat.blurb,
        sort_order: Number(selCat.sort_order) || 0,
      });
      await refreshCats();
    }, 'Category saved');
  const delCat = () =>
    guard(async () => {
      if (!confirm(`Delete “${selCat.title}” and all its sections and entries?`)) return;
      await api.deleteCategory(selCat.id);
      selCat = selSec = null;
      secs = [];
      await refreshCats();
    }, 'Category deleted');

  // sections
  const newSec = () =>
    guard(async () => {
      const s = await api.createSection({
        category_id: selCat.id,
        title: 'New Section',
        layout: 'table',
        fields: [{ key: 'name', label: 'Name' }],
        sort_order: secs.length,
      });
      secs = await api.sections(selCat.id);
      await selectSec(s);
    }, 'Section created');
  const saveSec = () =>
    guard(async () => {
      await api.updateSection(selSec.id, {
        title: selSec.title,
        description: selSec.description,
        layout: selSec.layout,
        fields: selSec.fields.filter((f) => f.key.trim()),
        sort_order: Number(selSec.sort_order) || 0,
      });
      secs = await api.sections(selCat.id);
    }, 'Section saved');
  const delSec = () =>
    guard(async () => {
      if (!confirm(`Delete section “${selSec.title}” and its entries?`)) return;
      await api.deleteSection(selSec.id);
      selSec = null;
      entries = [];
      secs = await api.sections(selCat.id);
    }, 'Section deleted');
  const addField = () => (selSec.fields = [...selSec.fields, { key: '', label: '' }]);
  const rmField = (i) => (selSec.fields = selSec.fields.filter((_, idx) => idx !== i));

  // entries
  function newEntry() {
    draft = { name: '', data: {}, image_url: '', location_image_url: '', sort_order: entries.length };
  }
  function editEntry(e) {
    draft = {
      id: e.id,
      name: e.name,
      data: { ...e.data },
      image_url: e.image_url || '',
      location_image_url: e.location_image_url || '',
      sort_order: e.sort_order,
    };
  }
  const saveEntry = () =>
    guard(async () => {
      const body = {
        name: draft.name,
        data: draft.data,
        image_url: draft.image_url,
        location_image_url: draft.location_image_url,
        sort_order: Number(draft.sort_order) || 0,
        section_id: selSec.id,
      };
      if (draft.id) await api.updateEntry(draft.id, body);
      else await api.createEntry(body);
      draft = null;
      entries = await api.entries(selSec.id);
    }, 'Entry saved');
  const delEntry = (e) =>
    guard(async () => {
      if (!confirm(`Delete entry “${e.name}”?`)) return;
      await api.deleteEntry(e.id);
      entries = await api.entries(selSec.id);
    }, 'Entry deleted');
  async function onFile(ev, key) {
    const f = ev.target.files?.[0];
    if (!f) return;
    await guard(async () => {
      const { url } = await api.upload(f);
      draft[key] = url;
    }, 'Image uploaded');
  }
</script>

<svelte:head><title>Admin — Zhery Field Guide CMS</title></svelte:head>

{#if !user}
  <div class="login-wrap">
    <form class="card login-card" onsubmit={(e) => { e.preventDefault(); doLogin(); }}>
      <div class="brand" style="margin-bottom:0.4rem"><span class="brand__mark">◓</span> Zhery CMS</div>
      <p class="muted" style="margin:0 0 0.6rem">Sign in to manage the guide.</p>
      <label class="fld"><span>Email</span><input class="input" type="email" bind:value={email} autocomplete="username" required /></label>
      <label class="fld"><span>Password</span><input class="input" type="password" bind:value={password} autocomplete="current-password" required /></label>
      {#if loginErr}<p class="err">{loginErr}</p>{/if}
      <button class="btn btn--primary" type="submit" style="width:100%">Sign in</button>
      <a class="muted back" href="{base}/">← Back to guide</a>
    </form>
  </div>
{:else}
  <div class="cms">
    <header class="cms-top">
      <div class="brand"><span class="brand__mark">◓</span> Zhery CMS</div>
      <span class="topbar__spacer"></span>
      {#if toast}<span class="toast">{toast}</span>{/if}
      <span class="muted" style="font-size:0.85rem">{user.email}</span>
      <a class="btn btn--ghost btn--sm" href="{base}/">View site</a>
      <button class="btn btn--sm" onclick={doLogout}>Log out</button>
    </header>

    <div class="cms-body">
      <!-- categories -->
      <aside class="pane">
        <div class="pane-head"><h3>Categories</h3><button class="btn btn--sm" onclick={newCat}>+ New</button></div>
        {#each cats as c}
          <button class="list-item" class:active={selCat?.id === c.id} onclick={() => selectCat(c)}>
            <span>{c.icon} {c.title}</span>
          </button>
        {/each}
      </aside>

      <!-- sections -->
      <aside class="pane">
        {#if selCat}
          <div class="pane-head"><h3>Sections</h3><button class="btn btn--sm" onclick={newSec}>+ New</button></div>
          {#each secs as s}
            <button class="list-item" class:active={selSec?.id === s.id} onclick={() => selectSec(s)}>{s.title}</button>
          {/each}

          <div class="edit-block">
            <h4>Edit category</h4>
            <label class="fld"><span>Title</span><input class="input" bind:value={selCat.title} /></label>
            <div class="grid2">
              <label class="fld"><span>Icon</span><input class="input" bind:value={selCat.icon} /></label>
              <label class="fld"><span>Order</span><input class="input" type="number" bind:value={selCat.sort_order} /></label>
            </div>
            <label class="fld"><span>Blurb</span><textarea class="input" rows="2" bind:value={selCat.blurb}></textarea></label>
            <div class="row">
              <button class="btn btn--primary btn--sm" onclick={saveCat} disabled={busy}>Save</button>
              <button class="btn btn--danger btn--sm" onclick={delCat} disabled={busy}>Delete</button>
            </div>
          </div>
        {:else}
          <p class="muted empty-note">Select a category, or create one.</p>
        {/if}
      </aside>

      <!-- section detail + entries -->
      <main class="pane pane--wide">
        {#if selSec}
          <div class="edit-block">
            <div class="pane-head"><h3>{selSec.title}</h3></div>
            <label class="fld"><span>Title</span><input class="input" bind:value={selSec.title} /></label>
            <label class="fld"><span>Description</span><textarea class="input" rows="2" bind:value={selSec.description}></textarea></label>
            <div class="grid2">
              <label class="fld"><span>Layout</span>
                <select class="select" bind:value={selSec.layout}>
                  <option value="table">Table</option>
                  <option value="cards">Cards</option>
                </select>
              </label>
              <label class="fld"><span>Order</span><input class="input" type="number" bind:value={selSec.sort_order} /></label>
            </div>

            <div class="fld">
              <span>Columns / fields <span class="muted">(key “name” = the entry title)</span></span>
              {#each selSec.fields as f, i}
                <div class="field-row">
                  <input class="input" bind:value={f.key} placeholder="key" />
                  <input class="input" bind:value={f.label} placeholder="Label" />
                  <button class="btn btn--danger btn--sm" onclick={() => rmField(i)} aria-label="Remove field">✕</button>
                </div>
              {/each}
              <button class="btn btn--ghost btn--sm" onclick={addField}>+ Add field</button>
            </div>

            <div class="row">
              <button class="btn btn--primary btn--sm" onclick={saveSec} disabled={busy}>Save section</button>
              <button class="btn btn--danger btn--sm" onclick={delSec} disabled={busy}>Delete section</button>
            </div>
          </div>

          <div class="pane-head" style="margin-top:1.4rem">
            <h3>Entries <span class="muted">({entries.length})</span></h3>
            <button class="btn btn--sm" onclick={newEntry}>+ Add entry</button>
          </div>

          {#if draft}
            <div class="card draft">
              <h4>{draft.id ? 'Edit entry' : 'New entry'}</h4>
              {#each selSec.fields as f}
                {#if f.key === 'name'}
                  <label class="fld"><span>{f.label || 'Name'}</span><input class="input" bind:value={draft.name} /></label>
                {:else}
                  <label class="fld"><span>{f.label || f.key}</span><input class="input" bind:value={draft.data[f.key]} /></label>
                {/if}
              {/each}
              <div class="grid2">
                <div class="fld">
                  <span>Item image</span>
                  <input type="file" accept="image/*" onchange={(e) => onFile(e, 'image_url')} />
                  {#if draft.image_url}<img class="draft-img" src={draft.image_url} alt="item preview" />{/if}
                </div>
                <div class="fld">
                  <span>Location image</span>
                  <input type="file" accept="image/*" onchange={(e) => onFile(e, 'location_image_url')} />
                  {#if draft.location_image_url}<img class="draft-img" src={draft.location_image_url} alt="location preview" />{/if}
                </div>
              </div>
              <div class="row">
                <button class="btn btn--primary btn--sm" onclick={saveEntry} disabled={busy}>Save entry</button>
                <button class="btn btn--ghost btn--sm" onclick={() => (draft = null)}>Cancel</button>
              </div>
            </div>
          {/if}

          <div class="table-wrap" style="margin-top:0.8rem">
            <table class="data">
              <thead>
                <tr>
                  {#each selSec.fields as f}<th>{f.label}</th>{/each}
                  <th style="width:120px">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each entries as e (e.id)}
                  <tr>
                    {#each selSec.fields as f}
                      <td class={f.key === 'name' ? 'name' : ''}>{f.key === 'name' ? e.name : (e.data?.[f.key] ?? '')}</td>
                    {/each}
                    <td>
                      <div class="row">
                        <button class="btn btn--sm" onclick={() => editEntry(e)}>Edit</button>
                        <button class="btn btn--danger btn--sm" onclick={() => delEntry(e)}>✕</button>
                      </div>
                    </td>
                  </tr>
                {/each}
                {#if entries.length === 0}
                  <tr><td colspan={selSec.fields.length + 1}><div class="empty">No entries yet.</div></td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="muted empty-note">Select a section to edit its fields and entries.</p>
        {/if}
      </main>
    </div>
  </div>
{/if}

<style>
  .login-wrap { min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; }
  .login-card { width: min(100%, 380px); display: flex; flex-direction: column; gap: 0.7rem; }
  .back { margin-top: 0.4rem; text-align: center; font-size: 0.85rem; }
  .err { color: var(--danger); font-size: 0.85rem; margin: 0; }

  .cms { min-height: 100vh; display: flex; flex-direction: column; }
  .cms-top {
    position: sticky; top: 0; z-index: 30;
    display: flex; align-items: center; gap: 0.7rem;
    height: var(--topbar-h); padding: 0 1.2rem;
    background: var(--bg-2); border-bottom: 1px solid var(--border);
  }
  .toast {
    padding: 0.3rem 0.7rem; border-radius: 8px;
    background: var(--accent-soft); color: var(--accent);
    font-size: 0.82rem; font-weight: 600;
  }
  .cms-body {
    flex: 1;
    display: grid;
    grid-template-columns: 220px 320px minmax(0, 1fr);
    align-items: start;
  }
  .pane { border-right: 1px solid var(--border); padding: 1rem; min-height: calc(100vh - var(--topbar-h)); }
  .pane--wide { border-right: 0; }
  .pane-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.7rem; }
  .pane-head h3 { font-size: 1rem; }
  .list-item {
    display: block; width: 100%; text-align: left;
    padding: 0.45rem 0.6rem; margin-bottom: 0.25rem;
    border-radius: 8px; border: 1px solid transparent;
    background: transparent; color: var(--text); cursor: pointer; font: inherit; font-size: 0.9rem;
  }
  .list-item:hover { background: var(--surface); }
  .list-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
  .edit-block { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.6rem; }
  .edit-block h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--faint); }
  .fld { display: flex; flex-direction: column; gap: 0.28rem; font-size: 0.82rem; color: var(--muted); min-width: 0; }
  .fld .input, .fld .select, .fld textarea, .fld input { color: var(--text); width: 100%; max-width: 100%; }
  .grid2 { min-width: 0; }
  .grid2 > * { min-width: 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.4rem; margin-bottom: 0.35rem; }
  .empty-note { padding: 2rem 0; text-align: center; }
  .draft { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.6rem; }
  .draft h4 { font-size: 0.9rem; }
  .draft-img { max-width: 160px; border-radius: 10px; border: 1px solid var(--border); }

  @media (max-width: 860px) {
    .cms-body { grid-template-columns: 1fr; }
    .pane { min-height: auto; border-right: 0; border-bottom: 1px solid var(--border); }
  }
</style>
