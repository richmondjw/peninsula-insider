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
 *   Projection:  { _id, _type, slug, "tags": tags }
 *   Secret:      from `SANITY_WEBHOOK_SECRET` env var
 */
import type {APIRoute} from 'astro'
import {isValidSignature, SIGNATURE_HEADER_NAME} from '@sanity/webhook'

// Static builds (GitHub Pages) don't use this webhook — prerender as a
// placeholder so output:static doesn't throw NoAdapterInstalled.
export const prerender = process.env.PI_ADMIN_HYBRID !== '1';

interface SanityWebhookBody {
  _type: string
  _id: string
  slug?: {current?: string} | string | null
}

// Map a document `_type` → the routes that need invalidating when it changes.
function routesForDocument(body: SanityWebhookBody): string[] {
  const slug =
    typeof body.slug === 'string'
      ? body.slug
      : typeof body.slug === 'object' && body.slug
        ? body.slug.current
        : undefined

  switch (body._type) {
    case 'venue':
      if (!slug) return []
      // Venue pages live under /eat/, /wine/, /stay/ depending on type.
      // We blast all three — only the right one will actually serve content.
      return [`/eat/${slug}/`, `/wine/${slug}/`, `/stay/${slug}/`, `/places/`]
    case 'place':
      return slug ? [`/places/${slug}/`, `/places/`] : []
    case 'article':
      return slug ? [`/journal/${slug}/`, `/journal/`, `/`] : ['/journal/', '/']
    case 'event':
      return slug ? [`/whats-on/${slug}/`, `/whats-on/`] : ['/whats-on/']
    case 'itinerary':
      return slug ? [`/plans/${slug}/`, `/plans/`] : ['/plans/']
    case 'tour':
      return slug ? [`/tour/${slug}/`, `/tour/`] : ['/tour/']
    case 'tourOperator':
      return slug ? [`/tour/operators/${slug}/`, `/tour/operators/`] : ['/tour/operators/']
    case 'tourPackage':
      return slug ? [`/tour-packages/${slug}/`, `/tour-packages/`] : ['/tour-packages/']
    case 'experience':
      return slug ? [`/explore/${slug}/`, `/explore/`] : ['/explore/']
    case 'homepageCover':
    case 'megaRail':
    case 'siteSettings':
      return ['/']
    case 'pageHero':
      // pageHero singletons key on a path field — best-effort: blast the homepage
      // and the editor can manually trigger a rebuild for deeper hubs if needed.
      return ['/']
    default:
      return []
  }
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

  // Astro's Vercel adapter exposes on-demand revalidation via the platform's
  // standard `Cache-Control: no-cache` + `purge: 1` semantics. The simplest
  // portable approach is to fetch each route with a cache-busting header
  // which the Vercel edge interprets as an invalidation signal.
  await Promise.all(
    routes.map((path) =>
      fetch(`https://peninsulainsider.com.au${path}`, {
        method: 'GET',
        headers: {'x-prerender-revalidate': process.env.VERCEL_REVALIDATE_TOKEN ?? ''},
      }).catch((err) => {
        console.error(`[revalidate] failed for ${path}:`, err)
      }),
    ),
  )

  console.log(`[revalidate] ${body._type}/${body._id} → ${routes.join(', ')}`)
  return new Response(
    JSON.stringify({revalidated: routes, type: body._type, id: body._id}),
    {status: 200, headers: {'content-type': 'application/json'}},
  )
}

export const GET: APIRoute = () =>
  new Response('Sanity revalidate endpoint. POST only.', {status: 405})
