import { json } from '@sveltejs/kit';
import { updateEntry, deleteEntry } from '$lib/server/db.js';

export async function PATCH({ params, request }) {
  const patch = await request.json().catch(() => ({}));
  return json(updateEntry(Number(params.id), patch));
}

export function DELETE({ params }) {
  deleteEntry(Number(params.id));
  return json({ ok: true });
}
