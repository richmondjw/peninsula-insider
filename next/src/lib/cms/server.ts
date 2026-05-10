/**
 * Peninsula Insider — CMS server-side helpers.
 *
 * Used by:
 *   - src/middleware.ts (when PI_ADMIN_HYBRID=1) to gate admin paths
 *   - src/pages/admin/api/* routes to authorise reads/writes
 *
 * The browser/client uses src/lib/auth.ts for the public-facing Supabase
 * client. This file is the *server* counterpart: it inspects the request
 * cookie for a Supabase session token, calls auth.getUser(token) to confirm
 * identity with the auth server, then looks up admin access through the same
 * RLS-protected views the migration wires up.
 *
 * Importantly, every Supabase call here passes the user's JWT in the
 * Authorization header so RLS evaluates as that user — never the service-role
 * key. RLS is the security boundary; this helper is the auditable path to it.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CmsAdminAccess, CmsEditorIdentity } from './schema.ts';

const SUPABASE_URL =
  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||
  process.env.PUBLIC_SUPABASE_URL ||
  'https://tjjhpvslpysfklwpqmgz.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  process.env.PUBLIC_SUPABASE_ANON_KEY;

export const PI_AUTH_COOKIE_PREFIX = 'sb-';
export const PI_AUTH_TOKEN_COOKIE = 'pi-sb-access-token';
export const PI_AUTH_REFRESH_COOKIE = 'pi-sb-refresh-token';

export function isCmsServerConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Read a single cookie value out of a raw `Cookie` header.
 * Returns null when missing or empty. Whitespace tolerant.
 */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.split('=');
    if (!k) continue;
    if (k.trim() === name) {
      const v = rest.join('=').trim();
      return v.length > 0 ? decodeURIComponent(v) : null;
    }
  }
  return null;
}

/**
 * Best-effort token extraction. Prefers our explicit `pi-sb-access-token`
 * cookie (set by the admin login page after a successful Supabase sign-in)
 * and falls back to scanning for any `sb-*-access-token` cookie that the
 * Supabase client may have written into shared state.
 */
export function readSupabaseAccessToken(cookieHeader: string | null | undefined): string | null {
  const direct = readCookie(cookieHeader, PI_AUTH_TOKEN_COOKIE);
  if (direct) return direct;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.split('=');
    if (!k) continue;
    const name = k.trim();
    if (name.startsWith(PI_AUTH_COOKIE_PREFIX) && name.endsWith('-access-token')) {
      const v = rest.join('=').trim();
      if (v.length > 0) return decodeURIComponent(v);
    }
  }
  return null;
}

/**
 * Build a Supabase client scoped to the request user's JWT. All queries it
 * issues will pass the JWT in the Authorization header, so RLS evaluates as
 * that user. The session is *not* persisted on the server.
 */
export function createCmsClientForToken(token: string): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'pi' },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Build a Supabase client with the public anon key only. Used for build-time
 * reads of *published* CMS content (which the public-read RLS migration
 * exposes). Never use this client for writes.
 */
export function createCmsAnonClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'pi' },
  });
}

export interface ResolvedCmsAccess {
  ok: boolean;
  reason?: 'no-token' | 'invalid-token' | 'not-editor' | 'not-configured' | 'error';
  access?: CmsAdminAccess;
  client?: SupabaseClient;
  token?: string;
}

/**
 * Resolve admin access for a request. Returns a populated access object plus
 * a request-scoped Supabase client when the requester is an approved editor.
 *
 * The chain is:
 *   1. Read access token cookie
 *   2. supabase.auth.getUser(token) — verifies signature with the auth server
 *   3. profiles.select(is_editor)
 *   4. admin_user_allowlist.select(role, can_publish)
 */
export async function resolveCmsAccess(
  cookieHeader: string | null | undefined,
): Promise<ResolvedCmsAccess> {
  if (!isCmsServerConfigured()) return { ok: false, reason: 'not-configured' };

  const token = readSupabaseAccessToken(cookieHeader);
  if (!token) return { ok: false, reason: 'no-token' };

  const client = createCmsClientForToken(token);
  if (!client) return { ok: false, reason: 'not-configured' };

  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, reason: 'invalid-token', token };

  const user = userData.user;

  const { data: profile, error: profileErr } = await client
    .from('profiles')
    .select('is_editor')
    .eq('id', user.id)
    .maybeSingle();
  if (profileErr) return { ok: false, reason: 'error', token };

  const identity: CmsEditorIdentity = {
    userId: user.id,
    email: user.email ?? null,
    isEditor: Boolean(profile?.is_editor),
  };
  if (!identity.isEditor) return { ok: false, reason: 'not-editor', token };

  const { data: allow } = await client
    .from('admin_user_allowlist')
    .select('role, can_publish')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (allow?.role as string | undefined) ?? 'editor';
  const canPublish = Boolean(allow?.can_publish) || role === 'publisher' || role === 'admin';

  const access: CmsAdminAccess = {
    identity,
    canRead: true,
    canWrite: true,
    canPublish,
  };

  return { ok: true, access, client, token };
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init?.headers ?? {}),
    },
  });
}

export function unauthorized(message = 'Unauthorized'): Response {
  return jsonResponse({ ok: false, error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): Response {
  return jsonResponse({ ok: false, error: message }, { status: 403 });
}

export function badRequest(message: string): Response {
  return jsonResponse({ ok: false, error: message }, { status: 400 });
}

export function internalError(message = 'Internal error'): Response {
  return jsonResponse({ ok: false, error: message }, { status: 500 });
}
