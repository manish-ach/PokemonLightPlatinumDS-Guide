import { json } from '@sveltejs/kit';
import { updateCategory, deleteCategory } from '$lib/server/db.js';

export async function PATCH({ params, request }) {
  const patch = await request.json().catch(() => ({}));
  return json(updateCategory(Number(params.id), patch));
}

export function DELETE({ params }) {
  deleteCategory(Number(params.id));
  return json({ ok: true });
}
