/**
 * Disable Sanity preview mode for the requesting browser session.
 * Clears the `pi-sanity-preview` cookie.
 */
import type {APIRoute} from 'astro'

// Static builds (GitHub Pages) don't use this endpoint — prerender as a
// placeholder so output:static doesn't throw NoAdapterInstalled.
export const prerender = process.env.PI_ADMIN_HYBRID !== '1';

export const GET: APIRoute = ({cookies, redirect, url}) => {
  cookies.delete('pi-sanity-preview', {path: '/'})
  const slug = url.searchParams.get('slug') || '/'
  return redirect(slug)
}
