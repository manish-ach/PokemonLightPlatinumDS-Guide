import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';

const DB_PATH = env.DATABASE_PATH || resolve('data', 'data.db');
const SEED_PATH = env.SEED_PATH || resolve('data', 'seed.json');

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      icon TEXT DEFAULT '',
      blurb TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      layout TEXT DEFAULT 'table',
      fields TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      UNIQUE (category_id, slug)
    );
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      image_url TEXT DEFAULT '',
      location_image_url TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Idempotent column adds for databases created by an earlier schema.
  addColumnIfMissing(d, 'entries', 'location_image_url', "TEXT DEFAULT ''");
}

function addColumnIfMissing(d, table, column, def) {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
}

export function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function seedIfEmpty(d) {
  // Admin user from env
  const userCount = d.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    const email = env.ADMIN_EMAIL || 'admin@lpds.local';
    const password = env.ADMIN_PASSWORD || 'changeme';
    const hash = bcrypt.hashSync(password, 10);
    d.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(
      email.toLowerCase(),
      hash,
      'admin'
    );
    console.log(`[seed] created admin user: ${email}`);
  }

  const catCount = d.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (catCount > 0) return;
  if (!existsSync(SEED_PATH)) {
    console.warn(`[seed] no seed file at ${SEED_PATH}; starting empty`);
    return;
  }

  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  const insCat = d.prepare(
    'INSERT INTO categories (slug, title, icon, blurb, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insSec = d.prepare(
    'INSERT INTO sections (category_id, slug, title, description, layout, fields, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insEnt = d.prepare(
    'INSERT INTO entries (section_id, name, slug, data, image_url, location_image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const catIdBySlug = {};
  const secIdByKey = {};

  (seed.categories || []).forEach((c, ci) => {
    const info = insCat.run(c.slug, c.title, c.icon || '', c.blurb || '', c.sort_order ?? ci);
    catIdBySlug[c.slug] = Number(info.lastInsertRowid);
  });

  (seed.sections || []).forEach((s, si) => {
    const catId = catIdBySlug[s.category];
    if (!catId) return;
    const info = insSec.run(
      catId,
      s.slug,
      s.title,
      s.description || '',
      s.layout || 'table',
      JSON.stringify(s.fields || []),
      s.sort_order ?? si
    );
    secIdByKey[`${s.category}/${s.slug}`] = Number(info.lastInsertRowid);
  });

  (seed.entries || []).forEach((e, ei) => {
    const secId = secIdByKey[`${e.category}/${e.section}`];
    if (!secId) return;
    insEnt.run(
      secId,
      e.name,
      slugify(e.slug || e.name) + '-' + ei,
      JSON.stringify(e.data || {}),
      e.image || '',
      e.location_image || '',
      e.sort_order ?? ei
    );
  });

  const n = d.prepare('SELECT COUNT(*) AS n FROM entries').get().n;
  console.log(`[seed] loaded ${seed.categories?.length || 0} categories, ${n} entries`);
}

// ---- helpers -------------------------------------------------------------
const parseSection = (r) =>
  r && { ...r, fields: safeJson(r.fields, []) };
const parseEntry = (r) => r && { ...r, data: safeJson(r.data, {}) };
function safeJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
// Join only string values of an entry's data (skips arrays/objects like galleries).
function dataText(data) {
  return Object.values(data || {})
    .filter((v) => typeof v === 'string')
    .join(' ');
}

// ---- reads ---------------------------------------------------------------
export function listCategories() {
  return getDb()
    .prepare('SELECT * FROM categories ORDER BY sort_order, title')
    .all();
}

export function listSections(categoryId) {
  const d = getDb();
  const rows = categoryId
    ? d.prepare('SELECT * FROM sections WHERE category_id = ? ORDER BY sort_order, title').all(categoryId)
    : d.prepare('SELECT * FROM sections ORDER BY sort_order, title').all();
  return rows.map(parseSection);
}

export function listEntries(sectionId) {
  return getDb()
    .prepare('SELECT * FROM entries WHERE section_id = ? ORDER BY sort_order, id')
    .all(sectionId)
    .map(parseEntry);
}

export function getCategoryBySlug(slug) {
  return getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

export function getSectionBySlug(categorySlug, sectionSlug) {
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return null;
  const sec = getDb()
    .prepare('SELECT * FROM sections WHERE category_id = ? AND slug = ?')
    .get(cat.id, sectionSlug);
  return parseSection(sec);
}

export function getNav() {
  const cats = listCategories();
  return cats.map((c) => ({ ...c, sections: listSections(c.id) }));
}

export function searchAll(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const d = getDb();
  const cats = listCategories();
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const secs = listSections().map((s) => ({ ...s, category: catById[s.category_id] }));
  const secById = Object.fromEntries(secs.map((s) => [s.id, s]));
  const results = [];
  for (const s of secs) {
    if (s.title.toLowerCase().includes(q) || (s.category?.title || '').toLowerCase().includes(q)) {
      results.push({ kind: 'section', title: s.title, sub: s.category?.title, href: `/${s.category?.slug}/${s.slug}` });
    }
  }
  const entries = d.prepare('SELECT * FROM entries').all().map(parseEntry);
  for (const e of entries) {
    const hay = (e.name + ' ' + dataText(e.data)).toLowerCase();
    if (hay.includes(q)) {
      const s = secById[e.section_id];
      if (!s) continue;
      results.push({
        kind: 'entry',
        title: e.name,
        sub: `${s.category?.title} · ${s.title}`,
        href: `/${s.category?.slug}/${s.slug}#${e.slug}`,
      });
    }
  }
  return results.slice(0, 40);
}

// Entries found at a given location (across every section except World).
export function entriesAtLocation(locationName) {
  const q = String(locationName || '').trim().toLowerCase();
  if (!q) return [];
  const d = getDb();
  const cats = listCategories();
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const secs = listSections();
  const secById = Object.fromEntries(secs.map((s) => [s.id, s]));
  const out = [];
  const rows = d.prepare('SELECT * FROM entries').all().map(parseEntry);
  for (const e of rows) {
    const sec = secById[e.section_id];
    const cat = sec && catById[sec.category_id];
    if (!sec || !cat) continue;
    if (cat.slug === 'world') continue; // don't list places inside places
    const hay = dataText(e.data).toLowerCase();
    if (!hay.includes(q)) continue;
    out.push({
      name: e.name,
      slug: e.slug,
      image_url: e.image_url,
      category_slug: cat.slug,
      section_slug: sec.slug,
      section_title: sec.title,
    });
  }
  return out;
}

// ---- writes (admin) ------------------------------------------------------
export function createCategory({ title, icon = '', blurb = '', sort_order = 0 }) {
  const d = getDb();
  const slug = uniqueSlug('categories', slugify(title));
  const info = d
    .prepare('INSERT INTO categories (slug, title, icon, blurb, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(slug, title, icon, blurb, sort_order);
  return d.prepare('SELECT * FROM categories WHERE id = ?').get(Number(info.lastInsertRowid));
}

export function updateCategory(id, patch) {
  const d = getDb();
  const cur = d.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  d.prepare('UPDATE categories SET title=?, icon=?, blurb=?, sort_order=? WHERE id=?').run(
    next.title,
    next.icon,
    next.blurb,
    next.sort_order,
    id
  );
  return d.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function deleteCategory(id) {
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

export function createSection({ category_id, title, description = '', layout = 'table', fields = [], sort_order = 0 }) {
  const d = getDb();
  const slug = uniqueSectionSlug(category_id, slugify(title));
  const info = d
    .prepare(
      'INSERT INTO sections (category_id, slug, title, description, layout, fields, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(category_id, slug, title, description, layout, JSON.stringify(fields), sort_order);
  return parseSection(d.prepare('SELECT * FROM sections WHERE id = ?').get(Number(info.lastInsertRowid)));
}

export function updateSection(id, patch) {
  const d = getDb();
  const cur = d.prepare('SELECT * FROM sections WHERE id = ?').get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  const fields = patch.fields ? JSON.stringify(patch.fields) : cur.fields;
  d.prepare(
    'UPDATE sections SET title=?, description=?, layout=?, fields=?, sort_order=? WHERE id=?'
  ).run(next.title, next.description, next.layout, fields, next.sort_order, id);
  return parseSection(d.prepare('SELECT * FROM sections WHERE id = ?').get(id));
}

export function deleteSection(id) {
  getDb().prepare('DELETE FROM sections WHERE id = ?').run(id);
}

export function createEntry({
  section_id,
  name,
  data = {},
  image_url = '',
  location_image_url = '',
  sort_order = 0,
}) {
  const d = getDb();
  const slug = slugify(name);
  const info = d
    .prepare(
      'INSERT INTO entries (section_id, name, slug, data, image_url, location_image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(section_id, name, slug, JSON.stringify(data), image_url, location_image_url, sort_order);
  return parseEntry(d.prepare('SELECT * FROM entries WHERE id = ?').get(Number(info.lastInsertRowid)));
}

export function updateEntry(id, patch) {
  const d = getDb();
  const cur = d.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  const data = patch.data ? JSON.stringify(patch.data) : cur.data;
  const slug = patch.name ? slugify(patch.name) : cur.slug;
  d.prepare(
    'UPDATE entries SET name=?, slug=?, data=?, image_url=?, location_image_url=?, sort_order=? WHERE id=?'
  ).run(next.name, slug, data, next.image_url, next.location_image_url, next.sort_order, id);
  return parseEntry(d.prepare('SELECT * FROM entries WHERE id = ?').get(id));
}

export function deleteEntry(id) {
  getDb().prepare('DELETE FROM entries WHERE id = ?').run(id);
}

function uniqueSlug(table, base) {
  const d = getDb();
  let slug = base;
  let i = 2;
  while (d.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).get(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

function uniqueSectionSlug(categoryId, base) {
  const d = getDb();
  let slug = base;
  let i = 2;
  while (d.prepare('SELECT 1 FROM sections WHERE category_id = ? AND slug = ?').get(categoryId, slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

// ---- auth ---------------------------------------------------------------
export function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
}
