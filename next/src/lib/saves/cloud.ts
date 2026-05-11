/**
 * Peninsula Insider — saves cloud sync.
 *
 * Mirrors the local `pi:saves:v2` store to `pi.user_saves` for signed-in
 * users. The local store remains the source of truth for the UI; cloud
 * sync runs in the background.
 *
 * On sign-in:
 *   1. Pull the server list.
 *   2. Merge into local (server-side rows the user might have saved on
 *      another device, but not on this one).
 *   3. Push local-only items up to the server.
 *
 * On every local change while signed in:
 *   - The change is mirrored to the server (best-effort, no UI block).
 */

import { getSupabase } from '../auth';
import type { SavedItem, SaveKind } from './store';
import { list as listLocal, merge as mergeLocal, onChange } from './store';

interface ServerRow {
  user_id: string;
  kind: SaveKind;
  slug: string;
  section: string | null;
  title: string | null;
  dek: string | null;
  image_url: string | null;
  href: string | null;
  saved_at: string;
}

function rowToItem(row: ServerRow): SavedItem {
  return {
    kind: row.kind,
    slug: row.slug,
    section: row.section ?? undefined,
    title: row.title ?? row.slug,
    dek: row.dek ?? undefined,
    image_url: row.image_url ?? undefined,
    href: row.href ?? '/',
    savedAt: row.saved_at ? new Date(row.saved_at).getTime() : Date.now(),
  };
}

function itemToRow(item: SavedItem, userId: string): Omit<ServerRow, 'saved_at'> {
  return {
    user_id: userId,
    kind: item.kind,
    slug: item.slug,
    section: item.section ?? null,
    title: item.title ?? null,
    dek: item.dek ?? null,
    image_url: item.image_url ?? null,
    href: item.href ?? null,
  };
}

let installed = false;
let unsubscribe: (() => void) | null = null;

/**
 * Pull the user's server-side saves, merge any new ones into the local
 * store. Called once on sign-in.
 */
export async function pullFromServer(userId: string): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  const { data, error } = await supa
    .from('user_saves')
    .select('*')
    .eq('user_id', userId);
  if (error || !data) return;
  const items = (data as unknown as ServerRow[]).map(rowToItem);
  mergeLocal(items);
}

/**
 * Push local-only items to the server. Uses upsert against the
 * (user_id, kind, slug) unique index, so re-running is safe.
 */
export async function pushToServer(userId: string): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  const items = listLocal();
  if (items.length === 0) return;
  const rows = items.map((it) => itemToRow(it, userId));
  await supa
    .from('user_saves')
    .upsert(rows, { onConflict: 'user_id,kind,slug' });
}

/**
 * Install a listener that mirrors every local save-change up to the
 * server. Idempotent — calling more than once is a no-op.
 */
export function installCloudSync(userId: string): void {
  if (installed) return;
  installed = true;
  let lastSig = signature(listLocal());

  unsubscribe = onChange(async () => {
    const supa = getSupabase();
    if (!supa) return;
    const current = listLocal();
    const sig = signature(current);
    if (sig === lastSig) return;

    // Diff against the last signature to know what changed.
    const prev = decodeSig(lastSig);
    lastSig = sig;

    const currentKeys = new Set(current.map(keyOf));
    const prevKeys = new Set(prev);
    const additions = current.filter((it) => !prevKeys.has(keyOf(it)));
    const removals = [...prevKeys].filter((k) => !currentKeys.has(k));

    if (additions.length > 0) {
      const rows = additions.map((it) => itemToRow(it, userId));
      await supa.from('user_saves').upsert(rows, { onConflict: 'user_id,kind,slug' });
    }
    for (const k of removals) {
      const [kind, slug] = k.split('/');
      await supa.from('user_saves').delete().match({ user_id: userId, kind, slug });
    }
  });
}

export function teardownCloudSync(): void {
  installed = false;
  unsubscribe?.();
  unsubscribe = null;
}

function keyOf(it: SavedItem): string { return `${it.kind}/${it.slug}`; }
function signature(items: SavedItem[]): string {
  return items.map(keyOf).sort().join('|');
}
function decodeSig(sig: string): string[] {
  if (!sig) return [];
  return sig.split('|').filter(Boolean);
}
