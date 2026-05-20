import { defineMiddleware } from 'astro:middleware';
import {perspectiveCookieName} from '@sanity/preview-url-secret/constants';
import {
  buildAdminLoginHref,
  canAccessAdmin,
  isAdminApiPath,
  isAdminHybridEnabled,
  isAdminLegacyGateEnabled,
  isAdminLoginPath,
  isAdminPath,
} from './lib/admin';
import { resolveCmsAccess } from './lib/cms/server';

/**
 * Two responsibilities:
 *
 * 1. Sanity Visual Editing preview-mode detection. Sets
 *    Astro.locals.sanityPreview = true when the request carries the
 *    perspective cookie (set by /api/preview/enable/ via
 *    @sanity/preview-url-secret) OR a valid `?sanity-preview=<secret>`
 *    query param (backward-compat fallback). Adapter code reads this
 *    and switches to the stega-encoded preview client.
 *
 * 2. Hybrid admin gate. When PI_ADMIN_HYBRID=1, /admin/* and
 *    /admin/api/* require a valid Supabase session + editor flag.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // ── Preview-mode detection (runs on every request, cheap) ────────────
  const cookiePreview = context.cookies.has(perspectiveCookieName);

  // Backward-compat: also accept the legacy ?sanity-preview=<secret> query
  // param so old Studio integrations keep working during the transition.
  const previewSecret =
    (import.meta as any).env?.SANITY_PREVIEW_SECRET ?? process.env.SANITY_PREVIEW_SECRET;
  const queryPreview = context.url.searchParams.get('sanity-preview');
  const isPreviewRequest =
    cookiePreview || (!!queryPreview && !!previewSecret && queryPreview === previewSecret);

  (context.locals as Record<string, unknown>).sanityPreview = isPreviewRequest;

  // Set the perspective cookie if entering preview via query param so
  // subsequent navigation stays in preview mode. Short-lived (1 hour).
  if (!cookiePreview && queryPreview && previewSecret && queryPreview === previewSecret) {
    context.cookies.set(perspectiveCookieName, 'drafts', {
      path: '/',
      maxAge: 3600,
      httpOnly: false,
      sameSite: 'none',
      secure: true,
    });
  }

  // ── Admin gate ───────────────────────────────────────────────────────
  if (!isAdminHybridEnabled()) {
    return next();
  }

  const pathname = context.url.pathname;
  const isAdminRoute = isAdminPath(pathname) || isAdminApiPath(pathname);
  const isLogin = isAdminLoginPath(pathname);

  if (!isAdminRoute && !isLogin) {
    return next();
  }

  const cookieHeader = context.request.headers.get('cookie');
  const access = await resolveCmsAccess(cookieHeader);
  let allowed = access.ok;

  if (!allowed && isAdminLegacyGateEnabled()) {
    allowed = canAccessAdmin(context.url, cookieHeader);
  }

  if (isLogin && allowed) {
    return context.redirect('/admin/');
  }

  // /admin/login/ matches isAdminPath (it starts with /admin/) but must NOT
  // be redirected to itself when access is denied — that produces an
  // ERR_TOO_MANY_REDIRECTS loop with the `next` param recursively encoding.
  // Let the login page render so the user can sign in.
  if (isAdminRoute && !isLogin && !allowed) {
    if (isAdminApiPath(pathname)) {
      const reason = (access as { reason?: string }).reason ?? 'unknown';
      return new Response(
        JSON.stringify({ ok: false, error: `Unauthorized (${reason})`, reason }),
        {
          status: 401,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        },
      );
    }

    const nextPath = `${pathname}${context.url.search}`;
    return context.redirect(buildAdminLoginHref(nextPath));
  }

  return next();
});
