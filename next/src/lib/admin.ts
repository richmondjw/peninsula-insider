export const ADMIN_COOKIE = 'pi_admin';
export const ADMIN_QUERY_PARAM = 'admin';
export const ADMIN_LOGIN_PATH = '/admin/login';
export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_HYBRID_ENV = 'PI_ADMIN_HYBRID';

export type AdminCollection =
  | 'articles'
  | 'venues'
  | 'experiences'
  | 'places'
  | 'itineraries'
  | 'events'
  | 'editorial_blocks';

export type EditablePayload = {
  collection: AdminCollection;
  slug: string;
  field?: string;
  label?: string;
};

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
}

export function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith('/admin/api/') || pathname.startsWith('/api/admin/');
}

export function isAdminEnabledFromUrl(url: URL): boolean {
  return url.searchParams.get(ADMIN_QUERY_PARAM) === '1';
}

export function isAdminEnabledFromCookie(cookieHeader?: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .some((part) => part === `${ADMIN_COOKIE}=1`);
}

export function canAccessAdmin(url: URL, cookieHeader?: string | null): boolean {
  return isAdminEnabledFromUrl(url) || isAdminEnabledFromCookie(cookieHeader);
}

export function buildAdminLoginHref(nextPath?: string): string {
  const login = new URL(ADMIN_LOGIN_PATH, 'https://peninsulainsider.com.au');
  if (nextPath) login.searchParams.set('next', nextPath);
  return `${login.pathname}${login.search}`;
}

export function isAdminHybridEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[ADMIN_HYBRID_ENV] === '1';
}

export function toEditableAttr(payload: EditablePayload): string {
  return JSON.stringify(payload).replace(/"/g, '&quot;');
}
