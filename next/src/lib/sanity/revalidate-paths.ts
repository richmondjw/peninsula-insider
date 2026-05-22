/**
 * Shared map from a Sanity document `_type` (+ optional slug) to the public
 * URLs that should be revalidated when the doc changes.
 *
 * Used by:
 *   - /api/revalidate.ts        — Sanity webhook handler (for Studio edits)
 *   - /api/admin/sanity-patch.ts — admin overlay (for inline edits)
 *
 * Adding/changing a route mapping here flows to both surfaces automatically.
 */

interface DocLike {
  _id?: string | null;
  _type: string;
  slug?: { current?: string } | string | null;
  pathSlug?: string | null;
}

function pageHeroSlugFromId(id: string | null | undefined): string | undefined {
  if (!id?.startsWith('pageHero-')) return undefined;
  const slug = id.slice('pageHero-'.length).replace(/--/g, '/').replace(/^\/+|\/+$/g, '');
  return slug || undefined;
}

export function routesForDocument(doc: DocLike): string[] {
  const slug =
    typeof doc.slug === 'string'
      ? doc.slug
      : typeof doc.slug === 'object' && doc.slug
        ? doc.slug.current
        : undefined;

  switch (doc._type) {
    case 'venue':
      if (!slug) return [];
      // Venue pages live under /eat/, /wine/, /stay/ depending on type.
      // We blast all three — only the right one will actually serve content.
      return [`/eat/${slug}/`, `/wine/${slug}/`, `/stay/${slug}/`, `/places/`];
    case 'place':
      return slug ? [`/places/${slug}/`, `/places/`] : [];
    case 'article':
      return slug ? [`/journal/${slug}/`, `/journal/`, `/`] : ['/journal/', '/'];
    case 'event':
      return slug ? [`/whats-on/${slug}/`, `/whats-on/`] : ['/whats-on/'];
    case 'itinerary':
      return slug ? [`/plans/${slug}/`, `/plans/`] : ['/plans/'];
    case 'tour':
      return slug ? [`/tour/${slug}/`, `/tour/`] : ['/tour/'];
    case 'tourOperator':
      return slug ? [`/tour/operators/${slug}/`, `/tour/operators/`] : ['/tour/operators/'];
    case 'tourPackage':
      return slug ? [`/tour-packages/${slug}/`, `/tour-packages/`] : ['/tour-packages/'];
    case 'experience':
      return slug ? [`/explore/${slug}/`, `/explore/`] : ['/explore/'];
    case 'homepageCover':
    case 'megaRail':
    case 'siteSettings':
      // Site-wide singletons that affect the homepage + everywhere the
      // mega rail / masthead renders. Blast the homepage and a few key
      // hubs; other pages will pick up on their next natural rebuild.
      return ['/', '/eat/', '/wine/', '/stay/', '/places/', '/journal/'];
    case 'pageHero':
      // pageHero singletons key on a path field. The slug here IS the
      // path (e.g. "eat/bakeries"). Strip any leading slash, append
      // trailing slash, and revalidate that exact route.
      {
        const pageSlug = doc.pathSlug ?? slug ?? pageHeroSlugFromId(doc._id);
        if (!pageSlug) return ['/'];
        return [`/${pageSlug.replace(/^\/+|\/+$/g, '')}/`];
      }
    default:
      return [];
  }
}

/**
 * Best-effort on-demand revalidation. Used by the admin overlay to push an
 * inline edit live within a few seconds instead of waiting for a Sanity
 * webhook or the next natural deploy.
 *
 * Fire-and-forget: caller should not await this and should not surface
 * errors to the editor — a failed revalidate is a soft failure (the next
 * organic deploy will catch up).
 */
export async function triggerRevalidate(routes: string[], origin: string): Promise<void> {
  const token = process.env.VERCEL_REVALIDATE_TOKEN ?? '';
  await Promise.all(
    routes.map((path) =>
      fetch(`${origin}${path}`, {
        method: 'GET',
        headers: token ? { 'x-prerender-revalidate': token } : {},
      }).catch((err) => {
        console.error(`[revalidate-paths] failed for ${path}:`, err);
      }),
    ),
  );
}
