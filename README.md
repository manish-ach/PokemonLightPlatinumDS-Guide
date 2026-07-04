# Zhery Field Guide — Pokémon Light Platinum DS wiki + CMS

A self-hosted, containerized guide wiki for **Pokémon Light Platinum DS** (the Zhery region),
with a built-in admin CMS for adding sections, data, and images — no code edits required.

- **Frontend + backend:** [SvelteKit](https://kit.svelte.dev) (Svelte 5) served by `adapter-node`
- **Database:** SQLite via Node's built-in `node:sqlite` (one file, no external DB service)
- **Auth:** server-side login, bcrypt password hashing, signed JWT in an httpOnly cookie
- **Images:** uploaded to a local `uploads/` volume, served same-origin
- **Content:** categories → sections (with configurable columns) → entries, all editable in `/admin`

## Quick start (Docker — recommended)

```bash
cp .env.example .env         # then edit ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET
PORT=8080 docker compose up --build -d
```

Open **http://localhost:8080**. The admin CMS is at **/admin** (sign in with the `ADMIN_*`
credentials from your `.env`). On first boot the app creates the admin account and seeds the guide
from `data/seed.json`.

- Data and uploads persist in the named Docker volume `wiki-data`, so they survive `docker compose
  down` / `up`.
- To reset to a clean seeded state: `docker compose down -v` (⚠ deletes all edited content).

## Local development

```bash
npm install
npm run dev        # http://127.0.0.1:8731
```

Dev reads `.env` automatically; the SQLite file is created at `data/data.db` and uploads at
`uploads/`. Build a production bundle with `npm run build` and run it with `npm start`.

## Hosting the frontend on GitHub Pages (no backend)

You can also publish a **read-only** snapshot of the guide as a fully static site — no server,
no database. It's prerendered from `data/seed.json`, so the CMS/admin isn't included (search,
detail views, the "found here" lists, and the Sun Palace solver all still work client-side).

**Automatic:** a workflow at `.github/workflows/deploy-pages.yml` builds and deploys on every push
to `main`. Just enable Pages for the repo (Settings → Pages → Source: **GitHub Actions**). It sets
the base path for your repo subpath automatically.

**Manual:**

```bash
# root domain / user page:
ADAPTER=static npm run build:static           # outputs to ./build
# project subpath (e.g. https://user.github.io/REPO/):
BASE_PATH=/REPO ADAPTER=static npm run build:static
```

Deploy the `build/` folder to any static host. The static site always reflects `data/seed.json`
(not live CMS edits — those live in the self-hosted database). To change what the static site shows,
edit `data/seed.json` (or run `node scripts/enrich-seed.mjs` to refresh images) and rebuild.

## Configuration (`.env`)

| Variable         | Purpose                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `ADMIN_EMAIL`    | Admin login (created on first boot only)                          |
| `ADMIN_PASSWORD` | Admin password (created on first boot only)                       |
| `JWT_SECRET`     | Secret used to sign session cookies — use a long random string    |
| `DATABASE_PATH`  | SQLite file path (Docker: `/data/data.db`)                        |
| `UPLOAD_DIR`     | Uploaded image directory (Docker: `/data/uploads`)                |
| `NODE_ENV`       | Set to `production` behind HTTPS so cookies are marked `Secure`   |

> Changing `ADMIN_EMAIL` / `ADMIN_PASSWORD` after the first boot does **not** update the existing
> account. To change the password later, delete the row in the `users` table (or reset the volume).

## How the CMS works

The public site is generated entirely from the database:

- **Categories** are the top-level nav groups (Pokémon, Items, World, Reference…).
- **Sections** are pages inside a category. Each section has a **layout** (`table` or `cards`) and a
  list of **fields** (columns). A field with the key `name` maps to the entry's title.
- **Entries** are the rows/cards. Each entry has a name, values for the section's fields, an optional
  **item image**, an optional **location screenshot**, and a sort order. Clicking an entry on the
  public site opens a detail view with its item image and the in-game location screenshot.

Item sprites are pre-seeded from the open [PokéAPI](https://pokeapi.co) sprite set, and a few
in-game location screenshots ship in `static/pictures/`. Re-run `node scripts/enrich-seed.mjs` to
refresh them in `data/seed.json`. Fresh installs seed these automatically; existing databases keep
their data, so add images to older entries from the CMS.

In `/admin` you can create/edit/delete categories, sections (including their columns), and entries,
and upload images. Changes appear on the public site immediately on the next page load — the pages
are server-rendered from the database on every request.

## Project layout

```
src/
  app.css                 design system (tokens, wiki shell, tables, cards)
  app.html                document shell (fonts, theme bootstrap)
  hooks.server.js         auth cookie -> locals.user; guards admin API writes
  lib/
    server/db.js          SQLite schema, migrations, first-run seed, data access
    server/auth.js        bcrypt + JWT helpers
    adminApi.js           client fetch wrapper for the CMS
    sunPalace.js / .css   the Sun Palace gear-puzzle solver (interactive tool)
    components/           Search, ThemeToggle
  routes/
    +layout.svelte        wiki shell (topbar, sidebar, search, theme toggle)
    +page.svelte          home
    [category]/           category + section pages (filterable/sortable tables)
    sun-palace/           puzzle solver route
    admin/                the CMS
    api/                  auth, categories, sections, entries, upload, search
data/seed.json            initial content (from the game documentation)
Dockerfile, docker-compose.yml
```

## Notes

- Content is dynamic and server-rendered; deep links to sections work, and search queries the API.
- The Sun Palace puzzle solver is a self-contained interactive tool at `/sun-palace`.
- Original static guide: https://manish-ach.github.io/PokemonLightPlatinumDS-Guide/
