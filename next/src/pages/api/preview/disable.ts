/**
 * Disable Sanity preview mode for the requesting browser session.
 * Clears the perspective cookie set by /api/preview/enable/.
 */
import type {APIRoute} from 'astro'
import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'

// Static builds (GitHub Pages) don't use this endpoint — prerender as a
// placeholder so output:static doesn't throw NoAdapterInstalled.
export const prerender = process.env.PI_ADMIN_HYBRID !== '1'

export const GET: APIRoute = ({cookies, redirect, url}) => {
  cookies.delete(perspectiveCookieName, {path: '/'})
  const slug = url.searchParams.get('slug') || '/'
  return redirect(slug)
}
