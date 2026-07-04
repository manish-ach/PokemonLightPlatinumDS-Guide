// The CMS is a client-only app (talks to the API); never prerender it, and
// skip SSR so the static build's SPA fallback can serve it.
export const prerender = false;
export const ssr = false;
