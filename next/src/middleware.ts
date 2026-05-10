import { defineMiddleware } from 'astro:middleware';
import {
  buildAdminLoginHref,
  canAccessAdmin,
  isAdminApiPath,
  isAdminHybridEnabled,
  isAdminLoginPath,
  isAdminPath,
} from './lib/admin';

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isAdminHybridEnabled()) {
    return next();
  }

  const pathname = context.url.pathname;
  const allowed = canAccessAdmin(context.url, context.request.headers.get('cookie'));

  if (isAdminLoginPath(pathname) && allowed) {
    return context.redirect('/admin/');
  }

  if ((isAdminPath(pathname) || isAdminApiPath(pathname)) && !allowed) {
    if (isAdminApiPath(pathname)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const nextPath = `${pathname}${context.url.search}`;
    return context.redirect(buildAdminLoginHref(nextPath));
  }

  return next();
});
