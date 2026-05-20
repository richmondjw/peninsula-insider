/**
 * Enable Sanity preview mode for the requesting browser session.
 *
 * Called by Studio's Presentation tool when it loads the live site in
 * an iframe. Sets the `pi-sanity-preview` cookie, then redirects to the
 * intended slug (Presentation passes `?sanity-preview-pathname=...`).
 *
 * No shared-secret gate: the only thing this cookie unlocks is the
 * draft Sanity client and stega-encoded HTML. Drafts are pre-publication
 * editorial copy with no PII or admin surface, so the worst-case leak
 * is "someone sees a future article a few hours early." Sanity's own
 * recommended Presentation flow gates on Studio session auth rather
 * than a shared secret, and the cookie is short-lived (1 hour).
 */
import type {APIRoute} from 'astro'

// Static builds (GitHub Pages) don't use this endpoint — prerender as a
// placeholder so output:static doesn't throw NoAdapterInstalled.
// In hybrid/Vercel mode (PI_ADMIN_HYBRID=1) this becomes a real SSR route.
export const prerender = process.env.PI_ADMIN_HYBRID !== '1';

export const GET: APIRoute = ({url, cookies, redirect}) => {
  cookies.set('pi-sanity-preview', '1', {
    path: '/',
    maxAge: 3600,
    httpOnly: false,
    sameSite: 'none',
    secure: true,
  })
  // Fall back to /preview/ (not /) so the Presentation iframe lands on a
  // page that hosts the Visual Editing channel — the homepage is statically
  // prerendered and can't complete the handshake.
  const slug =
    url.searchParams.get('slug') ||
    url.searchParams.get('sanity-preview-pathname') ||
    '/preview/'
  return redirect(slug)
}
