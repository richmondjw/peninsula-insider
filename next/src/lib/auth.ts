/**
 * Peninsula Insider — V2 auth (client-side).
 *
 * Single Supabase JS client for the whole app, plus thin wrappers for
 * the operations our UI needs: sign in, sign out, get profile, like an
 * article, save an article.
 *
 * Auth state is cached in localStorage by Supabase JS — no extra work
 * needed across page navigations or view transitions.
 *
 * All queries are scoped via Row-Level Security on the database side, so
 * we trust the user's auth.uid() to gate writes. The client just calls.
 */

import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_editor: boolean;
  newsletter_optin: boolean;
  created_at: string;
};

type SaveSnapshot = {
  title?: string;
  dek?: string;
  image_url?: string;
};

const SUPABASE_URL =
  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||
  'https://tjjhpvslpysfklwpqmgz.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  // Publishable key: safe to ship client-side by design; RLS is the gate.
  // Fallback so a build without env vars still produces working auth.
  'sb_publishable_JlZuo95QvNZi2ZNrFyK-Cw_2y0U7HLp';

let _client: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client. If the anon key isn't configured
 * (e.g. in V2-staging preview before we've wired auth), returns null and
 * any UI that depends on auth gracefully no-ops.
 */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,    // for magic link redirect
        flowType: 'pkce',            // safe for static sites
        storageKey: 'pi.auth',
      },
      db: { schema: 'pi' },
    });
  }
  return _client;
}

/** True if the auth client is configured. */
export function isAuthEnabled(): boolean {
  return !!SUPABASE_ANON_KEY;
}

// ---- Session ---------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data } = await c.auth.getUser();
  return data.user;
}

/** Subscribe to auth state changes. Returns an unsubscribe fn. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const c = getSupabase();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ---- Sign in / out ---------------------------------------------------------

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('Auth not configured');
  await c.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.href : undefined),
      scopes: 'profile email',
    },
  });
}

export async function signInWithMagicLink(email: string, redirectTo?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  const { error } = await c.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.href : undefined),
      shouldCreateUser: true,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  await c.auth.signOut();
}

// ---- Profile ---------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<{ ok: boolean; error?: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  const { error } = await c.from('profiles').update(patch).eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---- Saves -----------------------------------------------------------------
//
// As of the Wave 1 unification (2026-05-11) the only server-side save store
// is `pi.user_saves` with a typed `kind` column. The previous code referenced
// a `pi.article_saves` table that was never created, so signed-in article
// saves silently failed. These wrappers target the unified table and default
// `kind` to 'article' for the journal-article surfaces that still call them.
// New code should prefer the `lib/saves/cloud.ts` helpers, which handle
// every kind uniformly.

export async function isSavedByUser(slug: string, userId: string, kind: string = 'article'): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { data } = await c
    .from('user_saves')
    .select('slug')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('slug', slug)
    .maybeSingle();
  return !!data;
}

export async function toggleSave(slug: string, section: string, userId: string, snapshot?: SaveSnapshot): Promise<{ saved: boolean }> {
  const c = getSupabase();
  if (!c) throw new Error('Auth not configured');
  const kind = 'article';
  const saved = await isSavedByUser(slug, userId, kind);
  if (saved) {
    await c.from('user_saves').delete().match({ user_id: userId, kind, slug });
    return { saved: false };
  }
  await c.from('user_saves').insert({
    user_id: userId,
    kind,
    slug,
    section,
    title: snapshot?.title || null,
    dek: snapshot?.dek || null,
    image_url: snapshot?.image_url || null,
    href: `/${section}/${slug}/`,
  });
  return { saved: true };
}

export async function listSaves(userId: string) {
  const c = getSupabase();
  if (!c) return [];
  const { data } = await c
    .from('user_saves')
    .select('*')
    .eq('user_id', userId)
    .eq('kind', 'article')
    .order('saved_at', { ascending: false });
  // Normalise to the legacy shape the /account/saved/ page expects:
  // article_slug instead of slug. Phase 4 rewrites that page and removes
  // this shim.
  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    article_slug: row.slug,
    created_at: row.saved_at,
  }));
}

// ---- Cross-device save sync (Phase 3 WS3E) --------------------------------
// Sits on top of `pi.user_saves` and `pi.user_itineraries` defined in
// ops/migrations/2026-05-05-user-saves-and-itineraries.sql. Functions are
// resilient to the tables not existing yet (e.g. local dev before the
// migration has run); they swallow errors and return safe defaults so the
// front-end falls back to localStorage cleanly.

export type CloudSaveItem = {
  kind: 'venue' | 'event' | 'experience';
  slug: string;
  title: string | null;
  href: string | null;
  saved_at: string;
};

export async function listUserSaves(userId: string): Promise<CloudSaveItem[]> {
  const c = getSupabase();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from('user_saves')
      .select('kind, slug, title, href, saved_at')
      .eq('user_id', userId)
      .order('saved_at', { ascending: true });
    if (error) return [];
    return (data ?? []) as CloudSaveItem[];
  } catch {
    return [];
  }
}

/**
 * Replace the user's cloud save list with the supplied items. Idempotent;
 * safe to call after every local change (the SaveSiteController wraps it
 * in a small debounce so we don't hammer the API).
 *
 * Implementation note: a true diff would be cheaper but more complex to
 * keep correct under concurrent tab edits. A delete-all-then-bulk-insert
 * within a single round trip is simple, cheap at this corpus size, and
 * inherently consistent.
 */
export async function syncUserSaves(
  userId: string,
  items: Array<{ kind: 'venue' | 'event' | 'experience'; slug: string; title?: string; href?: string; savedAt?: number }>,
): Promise<{ ok: boolean; error?: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  try {
    await c.from('user_saves').delete().eq('user_id', userId);
    if (items.length === 0) return { ok: true };
    const rows = items.map((it) => ({
      user_id: userId,
      kind: it.kind,
      slug: it.slug,
      title: it.title ?? null,
      href: it.href ?? null,
      saved_at: it.savedAt ? new Date(it.savedAt).toISOString() : new Date().toISOString(),
    }));
    const { error } = await c.from('user_saves').insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export type CloudItinerary = {
  items: Array<{ kind: 'venue' | 'event' | 'experience'; slug: string; dayId?: string; note?: string }>;
  days: Array<{ id: string; label: string }>;
  updated_at: string;
};

export async function getUserItinerary(userId: string): Promise<CloudItinerary | null> {
  const c = getSupabase();
  if (!c) return null;
  try {
    const { data, error } = await c
      .from('user_itineraries')
      .select('items, days, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      items: Array.isArray(data.items) ? (data.items as CloudItinerary['items']) : [],
      days: Array.isArray(data.days) ? (data.days as CloudItinerary['days']) : [],
      updated_at: data.updated_at as string,
    };
  } catch {
    return null;
  }
}

export async function syncUserItinerary(
  userId: string,
  items: CloudItinerary['items'],
  days: CloudItinerary['days'],
): Promise<{ ok: boolean; error?: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  try {
    const { error } = await c.from('user_itineraries').upsert(
      { user_id: userId, items, days },
      { onConflict: 'user_id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ---- Event alerts (Phase 4 WS4B) ------------------------------------------

export type CloudAlert = {
  id: string;
  category: string | null;
  place_slug: string | null;
  lens: string | null;
  email: boolean;
  browser: boolean;
  created_at: string;
};

export async function listUserAlerts(userId: string): Promise<CloudAlert[]> {
  const c = getSupabase();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from('event_alerts')
      .select('id, category, place_slug, lens, email, browser, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data ?? []) as CloudAlert[];
  } catch {
    return [];
  }
}

export async function syncUserAlerts(
  userId: string,
  alerts: Array<{ id?: string; category: string; place_slug: string; lens: string; email: boolean; browser: boolean }>,
): Promise<{ ok: boolean; error?: string }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  try {
    await c.from('event_alerts').delete().eq('user_id', userId);
    if (alerts.length === 0) return { ok: true };
    const rows = alerts.map((a) => ({
      user_id: userId,
      category: a.category || null,
      place_slug: a.place_slug || null,
      lens: a.lens || null,
      email: a.email,
      browser: a.browser,
    }));
    const { error } = await c.from('event_alerts').insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ---- Venue claims (Phase 6 WS6B) ------------------------------------------

export type VenueClaim = {
  id: string;
  user_id: string;
  venue_slug: string;
  venue_name: string | null;
  operator_role: string | null;
  proof: string | null;
  status: 'pending' | 'approved' | 'revoked';
  editor_notes: string | null;
  decision_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listOwnVenueClaims(userId: string): Promise<VenueClaim[]> {
  const c = getSupabase();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from('venue_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as VenueClaim[];
  } catch {
    return [];
  }
}

export async function submitVenueClaim(
  userId: string,
  payload: { venue_slug: string; venue_name: string; operator_role?: string; proof?: string },
): Promise<{ ok: boolean; error?: string; claim?: VenueClaim }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: 'Auth not configured' };
  try {
    const { data, error } = await c
      .from('venue_claims')
      .insert({
        user_id: userId,
        venue_slug: payload.venue_slug,
        venue_name: payload.venue_name,
        operator_role: payload.operator_role ?? null,
        proof: payload.proof ?? null,
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, claim: data as VenueClaim };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function listChangeRequestsForUser(userId: string): Promise<Array<Record<string, any>>> {
  const c = getSupabase();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from('venue_change_requests')
      .select('id, venue_slug, venue_name, change_type, proposed_change, status, created_at, decision_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
