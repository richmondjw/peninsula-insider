// Single source of truth for the Insider concierge API base URL.
//
// Production API lives in the peninsula-insider-platform repo (Vercel).
// Override with PUBLIC_CONCIERGE_API_URL; local dev falls back to the
// wrangler/express dev server on :8787. The production fallback exists
// because a static build without env vars must never ship localhost to
// the live site (that is how /ask went dead in prod).
export const CONCIERGE_API_URL: string =
  import.meta.env.PUBLIC_CONCIERGE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8787'
    : 'https://peninsula-insider-platform-api.vercel.app');
