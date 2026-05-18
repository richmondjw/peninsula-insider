/** Temporary diagnostic. Remove after Visual Editing is verified working. */
import type {APIRoute} from 'astro'
import {sanityPreviewClient, sanityClient} from '../../lib/sanity/client'

export const prerender = false

export const GET: APIRoute = async () => {
  const q = `*[_type == "venue" && slug.current == "pt-leo-estate"][0]{_id, name, "slug": slug.current, signature}`
  const preview = await sanityPreviewClient.fetch(q)
  const published = await sanityClient.fetch(q)
  const previewStr = JSON.stringify(preview)
  const stegaChars = [...previewStr].filter((c) => {
    const cp = c.codePointAt(0) ?? 0
    return cp >= 0xe0000 && cp <= 0xe007f
  }).length
  return new Response(
    JSON.stringify(
      {
        previewClient: {
          stegaCharCount: stegaChars,
          // strip stega chars for human-readable display
          name: preview?.name?.replace(/[\u{E0000}-\u{E007F}]/gu, ''),
          rawName: preview?.name,
        },
        publishedClient: {name: published?.name},
        env: {
          hasPreviewToken: !!process.env.SANITY_PREVIEW_TOKEN,
          previewTokenLen: (process.env.SANITY_PREVIEW_TOKEN ?? '').length,
          hasReadToken: !!process.env.SANITY_READ_TOKEN,
        },
      },
      null,
      2,
    ),
    {headers: {'content-type': 'application/json'}},
  )
}
