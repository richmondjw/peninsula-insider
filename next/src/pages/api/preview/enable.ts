/**
 * Enable Sanity preview mode for the requesting browser session.
 * Called by Studio's Presentation tool on iframe load. Verifies the
 * `secret` query param against SANITY_PREVIEW_SECRET, then sets a
 * 1-hour cookie so subsequent navigation stays in preview mode.
 */
import type {APIRoute} from 'astro'

export const prerender = false

export const GET: APIRoute = ({url, cookies, redirect}) => {
  const expected =
    (import.meta as any).env?.SANITY_PREVIEW_SECRET ?? process.env.SANITY_PREVIEW_SECRET
  const provided = url.searchParams.get('secret')
  if (!expected || provided !== expected) {
    return new Response('Invalid preview secret.', {status: 401})
  }
  cookies.set('pi-sanity-preview', '1', {
    path: '/',
    maxAge: 3600,
    httpOnly: false,
    sameSite: 'none',
    secure: true,
  })
  const slug = url.searchParams.get('slug') || '/'
  return redirect(slug)
}
