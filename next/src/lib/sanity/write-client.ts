/**
 * Peninsula Insider — Sanity *write* client (server only).
 *
 * Used by the admin overlay API routes to patch documents and upload assets
 * on behalf of a signed-in editor. The write token MUST live in env only
 * (`SANITY_ADMIN_WRITE_TOKEN`); it is never sent to the browser. Callers are
 * responsible for verifying admin access (`resolveCmsAccess`) before invoking
 * any helper here.
 */
import { createClient, type SanityClient } from '@sanity/client';

const projectId = 'a062b30n';
const dataset = 'production';
const apiVersion = '2025-01-01';

let _client: SanityClient | null = null;

export function getSanityWriteClient(): SanityClient | null {
  const token = process.env.SANITY_ADMIN_WRITE_TOKEN;
  if (!token) return null;
  if (_client) return _client;
  _client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
    // Writes never want stega. Reads issued via this client (e.g. to resolve
    // a doc id from a slug before patching) also shouldn't carry stega markers.
    stega: { enabled: false },
  });
  return _client;
}

/**
 * Map the legacy `data-pi-entity-type` value emitted by `editableImage()` to
 * the corresponding Sanity `_type`. Returns null for entity types that don't
 * have a 1:1 Sanity-doc mapping (e.g. `page`, which is a build-time concept,
 * not a Sanity document).
 */
export function entityTypeToSanityType(entityType: string): string | null {
  switch (entityType) {
    case 'venue':
    case 'place':
    case 'article':
    case 'event':
    case 'itinerary':
    case 'tour':
    case 'experience':
      return entityType;
    case 'tour-operator':
      return 'tourOperator';
    case 'tour-package':
      return 'tourPackage';
    // `page` is intentionally not mapped — page-level images bind to
    // singletons like `pageHero` / `homepageCover` and use field paths the
    // overlay resolves via stega instead.
    default:
      return null;
  }
}
