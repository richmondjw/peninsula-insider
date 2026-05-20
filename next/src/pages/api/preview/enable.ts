/**
 * Enable Sanity preview/draft mode.
 *
 * Called by Studio's Presentation tool. Validates the cryptographically-
 * signed secret Presentation appends (?sanity-preview-secret=...) then
 * sets the perspective cookie and redirects to the requested page.
 *
 * Uses @sanity/preview-url-secret for validation — more secure than the
 * old plain-cookie approach and the officially recommended Astro pattern.
 */
import type {APIRoute} from 'astro'
import {validatePreviewUrl} from '@sanity/preview-url-secret'
import {perspectiveCookieName} from '@sanity/preview-url-secret/constants'
import {sanityClient} from '../../../lib/sanity/client'

export const prerender = process.env.PI_ADMIN_HYBRID !== '1'

export const GET: APIRoute = async ({request, cookies, redirect}) => {
  // Build a token-bearing client so validatePreviewUrl can read the
  // sanity.previewUrlSecret document from the dataset.
  const clientWithToken = sanityClient.withConfig({
    token: process.env.SANITY_READ_TOKEN,
    useCdn: false,
    perspective: 'published',
  })

  const {isValid, redirectTo = '/preview/', studioPreviewPerspective} =
    await validatePreviewUrl(clientWithToken, request.url)

  if (!isValid) {
    return new Response('Invalid preview secret', {status: 401})
  }

  cookies.set(perspectiveCookieName, studioPreviewPerspective ?? 'drafts', {
    httpOnly: false,
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: 3600,
  })

  return redirect(redirectTo, 307)
}
