import { json, error } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = resolve(env.UPLOAD_DIR || 'uploads');
const MAX_BYTES = 6 * 1024 * 1024;
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

export async function POST({ request }) {
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') throw error(400, 'No file');
  if (!OK_TYPES.includes(file.type)) throw error(415, 'Unsupported image type');
  if (file.size > MAX_BYTES) throw error(413, 'Image too large (max 6MB)');

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = extname(file.name || '').toLowerCase() || mimeExt(file.type);
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  writeFileSync(resolve(UPLOAD_DIR, name), buf);
  return json({ url: `/uploads/${name}` }, { status: 201 });
}

function mimeExt(type) {
  return (
    { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' }[
      type
    ] || '.bin'
  );
}
