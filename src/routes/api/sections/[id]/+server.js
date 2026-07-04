import { json } from '@sveltejs/kit';
import { updateSection, deleteSection, listEntries } from '$lib/server/db.js';

export function GET({ params }) {
  return json(listEntries(Number(params.id)));
}

export async function PATCH({ params, request }) {
  const patch = await request.json().catch(() => ({}));
  return json(updateSection(Number(params.id), patch));
}

export function DELETE({ params }) {
  deleteSection(Number(params.id));
  return json({ ok: true });
}
