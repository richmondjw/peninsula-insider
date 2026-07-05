import { defineMiddleware } from 'astro:middleware';
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
 * Hybrid admin gate.
 *
 * Default (production): a request can only reach `/admin` or `/admin/api/*`
 * when the user has a valid Supabase session AND is flagged as an editor
 * (RLS-backed `pi.profiles.is_editor` check inside `resolveCmsAccess`).
 *
 * Legacy fallback (Phase 1 QA): when `PI_ADMIN_LEGACY_GATE=1` is set, the
 * transitional `?admin=1` / `pi_admin=1` cookie seam still grants access.
 * This lets local development keep working without a real Supabase session
 * during the cutover, but is intentionally off by default.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (!isAdminHybridEnabled()) {
    return next();
  }

  const pathname = context.url.pathname;
  const isAdminRoute = isAdminPath(pathname) || isAdminApiPath(pathname);
  const isLogin = isAdminLoginPath(pathname);

  // Cheap exit: nothing here we have to gate.
  if (!isAdminRoute && !isLogin) {
    return next();
  }

  const cookieHeader = context.request.headers.get('cookie');

  // Real session validation by default. We only run the (slightly more
  // expensive) Supabase calls for routes that actually care.
  const access = await resolveCmsAccess(cookieHeader);
  let allowed = access.ok;

  // Optional legacy fallback for Phase 1 QA.
  if (!allowed && isAdminLegacyGateEnabled()) {
    allowed = canAccessAdmin(context.url, cookieHeader);
  }

  // If they're already signed in and hit the login page, send them home.
  if (isLogin && allowed) {
    return context.redirect('/admin/');
  }

  // /admin/login/ matches isAdminPath (it starts with /admin/) but must NOT
  // be redirected to itself when access is denied - that produces an
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
