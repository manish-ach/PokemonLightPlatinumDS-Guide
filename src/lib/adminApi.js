async function j(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.message || msg.error || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  me: () => j('GET', '/api/auth/me'),
  login: (email, password) => j('POST', '/api/auth/login', { email, password }),
  logout: () => j('POST', '/api/auth/logout'),

  categories: () => j('GET', '/api/categories'),
  createCategory: (b) => j('POST', '/api/categories', b),
  updateCategory: (id, b) => j('PATCH', `/api/categories/${id}`, b),
  deleteCategory: (id) => j('DELETE', `/api/categories/${id}`),

  sections: (catId) => j('GET', `/api/sections?category_id=${catId}`),
  createSection: (b) => j('POST', '/api/sections', b),
  updateSection: (id, b) => j('PATCH', `/api/sections/${id}`, b),
  deleteSection: (id) => j('DELETE', `/api/sections/${id}`),

  entries: (secId) => j('GET', `/api/entries?section_id=${secId}`),
  createEntry: (b) => j('POST', '/api/entries', b),
  updateEntry: (id, b) => j('PATCH', `/api/entries/${id}`, b),
  deleteEntry: (id) => j('DELETE', `/api/entries/${id}`),

  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
