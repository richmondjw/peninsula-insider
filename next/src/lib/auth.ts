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

const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

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

// ---- Likes -----------------------------------------------------------------

export async function getLikeCount(slug: string): Promise<number> {
  const c = getSupabase();
  if (!c) return 0;
  const { data } = await c.from('article_like_counts').select('like_count').eq('article_slug', slug).maybeSingle();
  return (data?.like_count as number) || 0;
}

export async function isLikedByUser(slug: string, userId: string): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { data } = await c.from('article_likes').select('article_slug').eq('article_slug', slug).eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function toggleLike(slug: string, section: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const c = getSupabase();
  if (!c) throw new Error('Auth not configured');
  const liked = await isLikedByUser(slug, userId);
  if (liked) {
    await c.from('article_likes').delete().match({ user_id: userId, article_slug: slug });
  } else {
    await c.from('article_likes').insert({ user_id: userId, article_slug: slug, section });
  }
  const count = await getLikeCount(slug);
  return { liked: !liked, count };
}

// ---- Saves -----------------------------------------------------------------

export async function isSavedByUser(slug: string, userId: string): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { data } = await c.from('article_saves').select('article_slug').eq('article_slug', slug).eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function toggleSave(slug: string, section: string, userId: string, snapshot?: SaveSnapshot): Promise<{ saved: boolean }> {
  const c = getSupabase();
  if (!c) throw new Error('Auth not configured');
  const saved = await isSavedByUser(slug, userId);
  if (saved) {
    await c.from('article_saves').delete().match({ user_id: userId, article_slug: slug });
    return { saved: false };
  }
  await c.from('article_saves').insert({
    user_id: userId,
    article_slug: slug,
    section,
    title: snapshot?.title || null,
    dek: snapshot?.dek || null,
    image_url: snapshot?.image_url || null,
  });
  return { saved: true };
}

export async function listSaves(userId: string) {
  const c = getSupabase();
  if (!c) return [];
  const { data } = await c.from('article_saves').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function listLikes(userId: string) {
  const c = getSupabase();
  if (!c) return [];
  const { data } = await c.from('article_likes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
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
