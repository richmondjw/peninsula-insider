/**
 * Peninsula Insider — Sanity → Vercel revalidation webhook.
 *
 * Sanity is configured to POST to this endpoint on every document publish.
 * The payload contains the document `_type`, `_id`, and slug, which we map
 * to the affected URL paths and revalidate them via Vercel's on-demand
 * revalidation API. Edge caches drop the stale HTML and the next visitor
 * gets a fresh render in <1 second.
 *
 * Security: HMAC-verified. Sanity signs the request body with a shared
 * secret; we recompute the signature and reject any mismatch.
 *
 * Configure the webhook in `sanity manage` → API → Webhooks:
 *   URL:         https://peninsulainsider.com.au/api/revalidate
 *   Trigger on:  Create, Update, Delete
 *   Filter:      _type in ["venue","place","article","event","itinerary",
 *                          "tour","tourOperator","tourPackage","experience",
 *                          "homepageCover","megaRail","pageHero","siteSettings"]
 *   Projection:  { _id, _type, slug, pathSlug, "tags": tags }
 *   Secret:      from `SANITY_WEBHOOK_SECRET` env var
 */
import type {APIRoute} from 'astro'
import {isValidSignature, SIGNATURE_HEADER_NAME} from '@sanity/webhook'
import {routesForDocument as sharedRoutesFor, triggerRevalidate} from '../../lib/sanity/revalidate-paths'

// Static builds (GitHub Pages) don't use this webhook — prerender as a
// placeholder so output:static doesn't throw NoAdapterInstalled.
export const prerender = process.env.PI_ADMIN_HYBRID !== '1';

interface SanityWebhookBody {
  _type: string
  _id: string
  slug?: {current?: string} | string | null
  pathSlug?: string | null
}

// Map kept in lib/sanity/revalidate-paths.ts so the admin overlay's
// /api/admin/sanity-patch can reuse the same routing logic.
function routesForDocument(body: SanityWebhookBody): string[] {
  return sharedRoutesFor({_id: body._id, _type: body._type, slug: body.slug, pathSlug: body.pathSlug})
}

export const POST: APIRoute = async ({request}) => {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[revalidate] SANITY_WEBHOOK_SECRET not configured')
    return new Response('Server misconfigured', {status: 500})
  }

  const signature = request.headers.get(SIGNATURE_HEADER_NAME)
  const rawBody = await request.text()

  if (!signature || !(await isValidSignature(rawBody, signature, secret))) {
    console.warn('[revalidate] invalid signature')
    return new Response('Invalid signature', {status: 401})
  }

  let body: SanityWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response('Malformed body', {status: 400})
  }

  const routes = routesForDocument(body)
  if (routes.length === 0) {
    return new Response(JSON.stringify({revalidated: [], note: 'no routes mapped'}), {
      status: 200,
      headers: {'content-type': 'application/json'},
    })
  }

  // Fire revalidations through the shared helper. Same logic the admin
  // overlay uses for inline edits, so a Studio publish and a /admin/
  // right-click replace go through the same cache-bust path.
  const origin = new URL(request.url).origin
  await triggerRevalidate(routes, origin)

  console.log(`[revalidate] ${body._type}/${body._id} → ${routes.join(', ')}`)
  return new Response(
    JSON.stringify({revalidated: routes, type: body._type, id: body._id}),
    {status: 200, headers: {'content-type': 'application/json'}},
  )
}

export const GET: APIRoute = () =>
  new Response('Sanity revalidate endpoint. POST only.', {status: 405})
