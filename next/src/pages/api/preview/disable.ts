/**
 * Disable Sanity preview mode for the requesting browser session.
 * Clears the `pi-sanity-preview` cookie.
 */
import type {APIRoute} from 'astro'

export const prerender = false

export const GET: APIRoute = ({cookies, redirect, url}) => {
  cookies.delete('pi-sanity-preview', {path: '/'})
  const slug = url.searchParams.get('slug') || '/'
  return redirect(slug)
}
