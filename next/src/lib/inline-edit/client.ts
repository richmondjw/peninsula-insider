/**
 * Peninsula Insider — inline editor client.
 *
 * Loads on every public page (via BaseLayout). When a signed-in admin is
 * detected, renders an "Edit mode" toggle. When edit mode is on, decorates
 * elements marked with `data-pi-edit` to be edited in place:
 *
 *   - text  → click element → contenteditable → save on blur / Enter
 *   - image → right-click → upload panel → file upload → Supabase image slot
 *
 * Text writes go direct to Supabase via the user's JWT and RLS.
 * Image writes upload the file to Sanity CDN (for the URL) then save the
 * resulting public URL into Supabase cms_image_slots via /api/admin/sanity-patch.
 * Client-side hydration on each page swaps image src immediately on next load.
 */

import { getSupabase, isAuthEnabled } from '../auth';

type Tone = 'ok' | 'err' | 'info';

const EDIT_MODE_FLAG = 'pi.editMode';

let editMode = false;
let isAdmin = false;
let toggleEl: HTMLButtonElement | null = null;
let menuEl: HTMLDivElement | null = null;
let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// Install event delegation immediately at module load. Handlers all check
// `editMode` and `isAdmin` internally before doing anything, so this is a
// no-op for non-admin visitors. Installing here (rather than inside the
// async boot path) makes the editor robust against HMR module-state caching.
if (typeof document !== 'undefined' && !(document as any).__piEditDelegationInstalled) {
  document.addEventListener('click', (e) => onDocumentClick(e), true);
  document.addEventListener('contextmenu', (e) => onContextMenu(e), true);
  document.addEventListener('keydown', (e) => onKeyDown(e), true);
  (document as any).__piEditDelegationInstalled = true;
  console.log('[pi-edit] delegation installed at module load');
}

// --------------------------------------------------------------------------
// Boot
// --------------------------------------------------------------------------

/**
 * One-time setup: verify session + allowlist, install event delegation.
 * Called once per page load (and again after Astro view transitions, but
 * the inner logic is idempotent).
 */
export async function bootInlineEditor(): Promise<void> {
  if (typeof document === 'undefined') return;
  console.log('[pi-edit] boot — auth enabled:', isAuthEnabled());
  if (!isAuthEnabled()) return;

  const supa = getSupabase();
  if (!supa) { console.warn('[pi-edit] no supabase client at boot'); return; }

  const { data: { session } } = await supa.auth.getSession();
  if (!session) { ensureToggleRemoved(); return; }

  // Mirror the Supabase session into the cookies the server-side admin
  // gate reads (pi-sb-access-token / pi-sb-refresh-token). The /admin/login
  // page does this once at sign-in, but the access token expires after
  // ~1 hour while the JS-side session keeps refreshing in the background.
  // Without this mirror, admins get silent 401s from /api/admin/* even
  // though their session is healthy. Idempotent — overwrites with current
  // tokens on every boot.
  syncSessionCookies(session.access_token, session.refresh_token, session.expires_in);

  // Check allowlist membership for UX. RLS will also reject writes from
  // non-allowlisted users, but verifying upfront lets us not render UI
  // affordances that will fail.
  if (!isAdmin) {
    const { data: allowlistRow } = await supa
      .from('admin_user_allowlist')
      .select('role,can_publish')
      .eq('user_id', session.user.id)
      .maybeSingle();
    isAdmin = !!allowlistRow && ['editor', 'publisher', 'admin'].includes(allowlistRow.role);
  }
  if (!isAdmin) return;

  // Mount/restore the floating toggle. Astro's <ClientRouter /> swaps
  // <body> on soft navigations, so any DOM we appended is gone — we
  // re-render on every page-load event. Delegation is installed at module
  // load above, so no per-boot install needed here.
  mountToggle();

  // Restore previous edit-mode preference. Body class is page-scoped so we
  // re-apply it here every boot. Patching overrides is gated to edit-mode
  // (handled in setEditMode), so admins browsing normally see SSR output
  // verbatim — no client-side swap flicker.
  const stored = sessionStorage.getItem(EDIT_MODE_FLAG);
  setEditMode(stored === '1');

  // If the session ends mid-page, hide the chrome.
  supa.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      isAdmin = false;
      setEditMode(false);
      ensureToggleRemoved();
      clearSessionCookies();
      return;
    }
    // Supabase auto-refreshes the access token in the background. Keep
    // the cookies in sync so server-side admin gates don't see a stale
    // (or missing) token.
    if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
      syncSessionCookies(session.access_token, session.refresh_token, session.expires_in);
    }
  });
}

const PI_SB_ACCESS_COOKIE = 'pi-sb-access-token';
const PI_SB_REFRESH_COOKIE = 'pi-sb-refresh-token';

function setRawCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(60, Math.floor(maxAgeSeconds))}; SameSite=Lax${secure}`;
}

function clearRawCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Mirror a Supabase session into the cookies the server-side admin gate
 * reads. Called on every boot when an authenticated session exists, plus
 * on every TOKEN_REFRESHED event from the Supabase auth listener.
 */
function syncSessionCookies(accessToken: string | undefined | null, refreshToken: string | undefined | null, expiresInSeconds: number | undefined | null): void {
  if (accessToken) {
    setRawCookie(PI_SB_ACCESS_COOKIE, accessToken, expiresInSeconds ?? 3600);
  }
  if (refreshToken) {
    // Refresh tokens are long-lived (Supabase default is unbounded until use);
    // give the cookie 30 days so a returning admin's automatic refresh works.
    setRawCookie(PI_SB_REFRESH_COOKIE, refreshToken, 60 * 60 * 24 * 30);
  }
}

function clearSessionCookies(): void {
  clearRawCookie(PI_SB_ACCESS_COOKIE);
  clearRawCookie(PI_SB_REFRESH_COOKIE);
}

function ensureToggleRemoved() {
  document.querySelectorAll('.pi-edit-toggle').forEach((n) => n.remove());
  toggleEl = null;
}

// --------------------------------------------------------------------------
// Toggle UI
// --------------------------------------------------------------------------

function mountToggle() {
  // If a previous toggle survived (unusual, but happens during hot reloads),
  // reuse it. Otherwise create a fresh one and append.
  const existing = document.querySelector<HTMLButtonElement>('.pi-edit-toggle');
  if (existing) { toggleEl = existing; return; }
  toggleEl = document.createElement('button');
  toggleEl.type = 'button';
  toggleEl.className = 'pi-edit-toggle';
  toggleEl.setAttribute('aria-label', 'Toggle inline edit mode');
  toggleEl.innerHTML = '<span class="pi-edit-toggle__dot" aria-hidden="true"></span><span class="pi-edit-toggle__label">Edit mode</span>';
  toggleEl.addEventListener('click', () => setEditMode(!editMode, 'click'));
  document.body.appendChild(toggleEl);
}

function setEditMode(on: boolean, source: 'click' | 'restore' = 'restore') {
  editMode = on;
  document.body.dataset.piEditMode = on ? 'on' : 'off';
  sessionStorage.setItem(EDIT_MODE_FLAG, on ? '1' : '0');
  if (!on) closeMenu();
  void source; // kept for callsite parity with click/restore callers.
}

// --------------------------------------------------------------------------
// Event delegation
// --------------------------------------------------------------------------

function installDelegation() {
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('keydown', onKeyDown, true);
}

function onDocumentClick(event: MouseEvent) {
  // Close menu on any unrelated click.
  if (menuEl && !menuEl.contains(event.target as Node)) closeMenu();

  if (!editMode) return;

  // Clicks inside the block toolbar / link popover are handled by their own
  // listeners — don't fall through to text-edit / block-edit logic below.
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest('.pi-block-toolbar') || target.closest('.pi-link-popover')) return;

  // Block editor takes precedence when the click lands inside an article
  // prose root and on an editable block. We check this BEFORE the existing
  // `data-pi-edit="text"` flow because article title / dek tags also have
  // `data-pi-edit="text"` but block IDs do not.
  const block = target.closest<HTMLElement>('[data-pi-prose-root] [data-pi-block-id]');
  if (block && block.dataset.piEditing !== '1') {
    event.preventDefault();
    event.stopPropagation();
    startBlockEdit(block);
    return;
  }

  const el = target.closest<HTMLElement>('[data-pi-edit="text"]');
  if (!el) return;
  if (el.dataset.piEditing === '1') return;

  event.preventDefault();
  event.stopPropagation();
  startTextEdit(el);
}

/**
 * True for elements rendered as an image — `<img>` itself, or any element
 * whose computed style has a non-`none` background-image (covers the
 * `<div role="img" style="background-image: …">` pattern used in hero
 * sections across the site).
 */
function isImageLike(node: Node | null): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node instanceof HTMLImageElement) return true;
  if (node.dataset.piEdit === 'image') return true;
  const bg = window.getComputedStyle(node).backgroundImage;
  return !!bg && bg !== 'none' && bg.includes('url(');
}

function onContextMenu(event: MouseEvent) {
  if (!editMode) {
    console.log('[pi-edit] contextmenu: edit mode off, ignoring');
    return;
  }

  const target = event.target as HTMLElement | null;
  if (!target) return;

  console.log('[pi-edit] contextmenu target:', target.tagName, target.className, target);

  let el: HTMLElement | null = null;

  // 1. Explicitly tagged image surface (background-image div, <img>, etc).
  el = target.closest<HTMLElement>('[data-pi-edit="image"]');

  // 2. Direct hit on an image-like element (<img> or background-image div).
  if (!el && isImageLike(target)) el = target;

  // 3. Click landed on a wrapper that contains an image (figure / a / picture).
  if (!el) {
    const nested = target.closest<HTMLElement>('a, figure, picture');
    if (nested) {
      const inner =
        nested.querySelector('img') ||
        Array.from(nested.querySelectorAll<HTMLElement>('*')).find(isImageLike);
      if (inner) el = inner as HTMLElement;
    }
  }

  // 4. Click landed on an overlay covering an image (scrims, gradients,
  //    grain canvases). Walk the z-order at the click point and grab the
  //    first image-like element behind whatever caught the event.
  //
  //    Prioritise explicitly-tagged slots (data-pi-edit="image") over any
  //    generic image-like element. Without this, stacked hero scenes share
  //    the same footprint: later DOM siblings have a higher default z-index
  //    so elementsFromPoint() returns the topmost *inactive* scene's <img>
  //    before the active scene's explicitly-tagged <img>, causing the panel
  //    to open for the wrong element and save to the wrong field path.
  if (!el && typeof document.elementsFromPoint === 'function') {
    const stack = document.elementsFromPoint(event.clientX, event.clientY);
    const tagged = stack.find(
      (n): n is HTMLElement => n instanceof HTMLElement && n.dataset.piEdit === 'image',
    );
    const hit = tagged ?? stack.find(isImageLike);
    if (hit) el = hit as HTMLElement;
  }

  if (!el) {
    console.log('[pi-edit] contextmenu: no image-like element found at this point');
    // Give the editor visible feedback so we know the handler fired.
    toast('No image detected at this click. Right-click directly on an image.', 'info');
    return;
  }

  console.log('[pi-edit] contextmenu opening panel for:', el);
  event.preventDefault();
  event.stopPropagation();
  openImagePanel(el, event.clientX, event.clientY);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu();
    closeLinkPopover();
    const active = document.querySelector<HTMLElement>('[data-pi-editing="1"]');
    if (active) {
      if (active.hasAttribute('data-pi-block-id')) cancelBlockEdit(active);
      else cancelTextEdit(active);
    }
  }
}

// --------------------------------------------------------------------------
// Text editing
// --------------------------------------------------------------------------

interface FieldDescriptor {
  entityType: string;
  entitySlug: string;
  fieldPath: string;
  fieldKind: 'text' | 'markdown' | 'richtext';
  label: string;
}

function readTextDescriptor(el: HTMLElement): FieldDescriptor | null {
  const entityType = el.dataset.piEntityType;
  const entitySlug = el.dataset.piEntitySlug;
  const fieldPath = el.dataset.piFieldPath;
  const fieldKind = (el.dataset.piFieldKind || 'text') as 'text' | 'markdown' | 'richtext';
  const label = el.dataset.piLabel || fieldPath || '';
  if (!entityType || !entitySlug || !fieldPath) return null;
  return { entityType, entitySlug, fieldPath, fieldKind, label };
}

function startTextEdit(el: HTMLElement) {
  const desc = readTextDescriptor(el);
  if (!desc) return;

  const original = el.innerHTML;
  el.dataset.piOriginal = original;
  el.dataset.piEditing = '1';

  // For richtext / markdown we'd ideally show a textarea, but for v1 we use
  // contenteditable everywhere — it keeps the WYSIWYG feel and matches the
  // existing DOM. Multi-line is handled naturally via Shift+Enter.
  el.setAttribute('contenteditable', 'plaintext-only');
  el.focus();

  // Select all so the editor can replace easily.
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }

  const finish = (commit: boolean) => {
    el.removeEventListener('blur', onBlur);
    el.removeEventListener('keydown', onKey);
    el.removeAttribute('contenteditable');
    delete el.dataset.piEditing;
    if (commit) void saveTextEdit(el, desc);
    else { el.innerHTML = el.dataset.piOriginal ?? ''; }
    delete el.dataset.piOriginal;
  };

  const onBlur = () => finish(true);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && desc.fieldKind === 'text') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  };

  el.addEventListener('blur', onBlur);
  el.addEventListener('keydown', onKey);
}

function cancelTextEdit(el: HTMLElement) {
  el.innerHTML = el.dataset.piOriginal ?? '';
  el.removeAttribute('contenteditable');
  delete el.dataset.piEditing;
  delete el.dataset.piOriginal;
}

async function saveTextEdit(el: HTMLElement, desc: FieldDescriptor) {
  const newValue = (el.innerText || '').trim();
  const oldValue = (el.dataset.piOriginal ? stripHtml(el.dataset.piOriginal) : '').trim();
  if (newValue === oldValue) {
    toast('No change.', 'info');
    return;
  }

  const supa = getSupabase();
  if (!supa) return toast('Supabase not configured.', 'err');

  const { data: { session } } = await supa.auth.getSession();
  if (!session) return toast('Signed out — please sign in again.', 'err');

  // Upsert: insert; on conflict (entity_type, entity_slug, field_path),
  // update value + status. The unique INDEX covers locale via coalesce,
  // but we only support locale=null at the moment, so a simple onConflict
  // works against rows we already created.
  const row = {
    entity_type: desc.entityType,
    entity_slug: desc.entitySlug,
    field_path: desc.fieldPath,
    label: desc.label,
    field_kind: desc.fieldKind,
    value: newValue,
    status: 'published' as const,
    updated_by: session.user.id,
  };

  // First check if a row exists, so we know whether to insert or update.
  const { data: existing } = await supa
    .from('cms_text_fields')
    .select('id')
    .eq('entity_type', desc.entityType)
    .eq('entity_slug', desc.entitySlug)
    .eq('field_path', desc.fieldPath)
    .is('locale', null)
    .maybeSingle();

  let saveErr: { message: string } | null = null;
  if (existing?.id) {
    const { error } = await supa.from('cms_text_fields').update(row).eq('id', existing.id);
    saveErr = error;
  } else {
    const { error } = await supa.from('cms_text_fields').insert(row);
    saveErr = error;
  }

  if (saveErr) {
    toast(`Save failed: ${saveErr.message}`, 'err');
    el.innerHTML = el.dataset.piOriginal ?? el.innerHTML;
    return;
  }

  await recordRevision(supa, session.user.id, {
    entity_type: desc.entityType,
    entity_slug: desc.entitySlug,
    action: 'update',
    status: 'published',
    summary: `Edited "${desc.label}" inline`,
    patch: [{ op: 'set', target: desc.fieldPath, value: newValue }],
  });

  toast(`Saved "${desc.label}".`, 'ok');
}

function stripHtml(html: string): string {
  const t = document.createElement('div');
  t.innerHTML = html;
  return t.textContent || '';
}

// --------------------------------------------------------------------------
// Image editing — popover panel
// --------------------------------------------------------------------------

interface ImageDescriptor {
  entityType: string;
  entitySlug: string;
  fieldPath: string;
  label: string;
  purpose: 'hero' | 'card' | 'gallery' | 'inline' | 'seo';
  /** True when the element was auto-detected rather than explicitly tagged. */
  autoDetected: boolean;
  /** Sanity singleton _id, when the source is a singleton doc. */
  sanitySingletonId?: string;
  /** Dot-notation path inside the singleton doc to the image field. */
  sanitySingletonPath?: string;
}

/**
 * Slugify the current URL path into an entity_slug. Drops leading/trailing
 * slashes, replaces `/` with `-`, lowercases. The root `/` becomes 'home'.
 *
 *   '/'                       → 'home'
 *   '/eat/best-restaurants/'  → 'eat-best-restaurants'
 *   '/journal/the-cover/'     → 'journal-the-cover'
 */
function currentPageSlug(): string {
  const path = (typeof location !== 'undefined' ? location.pathname : '/').replace(/^\/+|\/+$/g, '');
  if (path.length === 0) return 'home';
  return path.toLowerCase().replace(/[^a-z0-9/_-]/g, '-').replace(/\//g, '-');
}

/**
 * Stable identifier for an unmarked image — derived from the basename of its
 * src so the same source file gets the same key everywhere it appears on a
 * given page. Strips query strings, decodes URI-encoded chars, lowercases.
 */
function srcBasename(src: string | null | undefined): string {
  if (!src) return 'unknown';
  let s = src.split('?')[0];
  try { s = decodeURIComponent(s); } catch {}
  const file = s.split('/').filter(Boolean).pop() || 'unknown';
  return file.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

/** Current displayed src for either an <img> or a background-image div. */
function currentImageSrc(el: HTMLElement): string {
  if (el instanceof HTMLImageElement) return el.currentSrc || el.src;
  const bg = window.getComputedStyle(el).backgroundImage;
  const match = bg.match(/url\((['"]?)(.*?)\1\)/);
  return match?.[2] ?? '';
}

/** Update either an <img> or a background-image div with a new src. */
function setImageSrc(el: HTMLElement, src: string) {
  if (el instanceof HTMLImageElement) {
    el.src = src;
    return;
  }
  // For bg-image divs, preserve any non-url() parts of the existing inline
  // style (gradients, etc.) by replacing only the url(...) portion when one
  // is present; otherwise set fresh.
  const current = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
  if (current && /url\(/.test(current)) {
    el.style.backgroundImage = current.replace(/url\((['"]?).*?\1\)/, `url("${src}")`);
  } else {
    el.style.backgroundImage = `url("${src}")`;
  }
}

function readImageDescriptor(el: HTMLElement): ImageDescriptor | null {
  const explicitType = el.dataset.piEntityType;
  const explicitSlug = el.dataset.piEntitySlug;
  const explicitPath = el.dataset.piFieldPath;
  const explicitLabel = el.dataset.piLabel;
  const purpose = (el.dataset.piPurpose || 'inline') as ImageDescriptor['purpose'];

  if (explicitType && explicitSlug && explicitPath) {
    return {
      entityType: explicitType,
      entitySlug: explicitSlug,
      fieldPath: explicitPath,
      label: explicitLabel || explicitPath,
      purpose,
      autoDetected: false,
      sanitySingletonId: el.dataset.piSanitySingletonId || undefined,
      sanitySingletonPath: el.dataset.piSanitySingletonPath || undefined,
    };
  }

  // Auto-derive for untagged image-like elements (<img> or bg-image div).
  if (!isImageLike(el)) return null;
  const src = currentImageSrc(el);
  const basename = srcBasename(src);
  const label =
    (el instanceof HTMLImageElement ? el.alt : null) ||
    el.getAttribute('aria-label') ||
    basename;
  return {
    entityType: 'page',
    entitySlug: currentPageSlug(),
    fieldPath: `img:${basename}`,
    label,
    purpose: 'inline',
    autoDetected: true,
  };
}

/**
 * Image upload panel — right-click any image in edit mode to replace it.
 *
 * Shows a compact panel with a file-picker button. On file selection the
 * image is uploaded to the Sanity CDN (for a fast, permanent URL) then the
 * URL is saved to Supabase cms_image_slots via /api/admin/sanity-patch.
 * The visible <img> src is swapped immediately; no rebuild needed.
 */
function openImagePanel(el: HTMLElement, x: number, y: number) {
  closeMenu();
  const desc = readImageDescriptor(el);
  if (!desc) return;

  const thumbSrc = currentImageSrc(el) || '';
  const cleanThumbSrc = thumbSrc.split('?')[0] || thumbSrc;

  menuEl = document.createElement('div');
  menuEl.className = 'pi-edit-panel';
  const PANEL_W = 320, PANEL_H = 160;
  menuEl.style.left = `${Math.max(8, Math.min(x, window.innerWidth - PANEL_W - 8))}px`;
  menuEl.style.top  = `${Math.max(8, Math.min(y, window.innerHeight - PANEL_H - 8))}px`;

  menuEl.innerHTML = `
    <div class="pi-edit-panel__head">
      <div class="pi-edit-panel__thumb" style="background-image: url(${cssUrl(thumbSrc)})"></div>
      <div class="pi-edit-panel__title">
        <div class="pi-edit-panel__label">${escapeHtml(desc.label)}</div>
        <div class="pi-edit-panel__sub">${escapeHtml(srcBasename(cleanThumbSrc))}</div>
      </div>
      <button type="button" class="pi-edit-panel__close" aria-label="Close">×</button>
    </div>
    <div class="pi-edit-panel__body">
      <label class="pi-edit-panel__replace" data-role="upload-label" style="cursor:pointer;display:block;text-align:center;">
        <span aria-hidden="true">↑</span> Replace image…
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden data-role="file-input" />
      </label>
      <div class="pi-edit-panel__source" data-role="status" style="display:none;text-align:center;margin-top:8px;font-size:12px;color:#666;"></div>
    </div>
    <div class="pi-edit-panel__foot">
      <button type="button" class="pi-edit-panel__btn pi-edit-panel__btn--ghost" data-action="cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(menuEl);

  menuEl.querySelector('.pi-edit-panel__close')?.addEventListener('click', closeMenu);
  menuEl.querySelector('[data-action="cancel"]')?.addEventListener('click', closeMenu);

  const fileInput = menuEl.querySelector<HTMLInputElement>('[data-role="file-input"]');
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void uploadAndPatch(el, desc, file);
  });
}

/**
 * Upload a file to the Sanity CDN asset store, then save the resulting URL
 * into Supabase cms_image_slots via /api/admin/sanity-patch. Swaps the
 * visible image src immediately on success.
 */
async function uploadAndPatch(el: HTMLElement, desc: ImageDescriptor, file: File) {
  const statusEl = menuEl?.querySelector<HTMLElement>('[data-role="status"]');
  const uploadLabel = menuEl?.querySelector<HTMLElement>('[data-role="upload-label"]');
  if (statusEl) { statusEl.textContent = `Uploading "${file.name}"…`; statusEl.style.display = ''; }
  if (uploadLabel) (uploadLabel as HTMLElement).style.opacity = '0.4';

  try {
    // 1. Upload to Sanity CDN (gives us a permanent, fast CDN URL).
    const fd = new FormData();
    fd.append('file', file);
    const upRes = await fetch('/api/admin/sanity-asset-upload', {
      method: 'POST',
      credentials: 'same-origin',
      body: fd,
    });
    const upBody = await upRes.json().catch(() => ({}));
    if (!upRes.ok || !upBody.ok) {
      toast(`Upload failed: ${upBody?.error || upRes.statusText}`, 'err');
      closeMenu();
      return;
    }
    const assetId = upBody.data?._id as string | undefined;
    if (!assetId) { toast('Upload returned no asset id.', 'err'); closeMenu(); return; }

    if (statusEl) statusEl.textContent = 'Saving…';

    // 2. Save the URL into Supabase cms_image_slots.
    const patchRes = await fetch('/api/admin/sanity-patch', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        entityType: desc.entityType,
        entitySlug: desc.entitySlug,
        fieldPath: desc.fieldPath,
        newAssetRef: assetId,
      }),
    });
    const patchBody = await patchRes.json().catch(() => ({}));
    if (!patchRes.ok || !patchBody.ok) {
      toast(`Save failed: ${patchBody?.error || patchRes.statusText}`, 'err');
      closeMenu();
      return;
    }

    // 3. Swap the visible image src immediately.
    const newUrl = patchBody.data?.newUrl as string | undefined;
    if (newUrl) {
      const bust = `${newUrl}${newUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
      setImageSrc(el, bust);
    }

    closeMenu();
    toast('Image saved — visible on next page load too.', 'ok');
  } catch (err) {
    toast(`Error: ${(err as Error).message}`, 'err');
    closeMenu();
  }
}

function cssUrl(src: string): string {
  return src.replace(/["\\]/g, (m) => `\\${m}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function closeMenu() {
  menuEl?.remove();
  menuEl = null;
}


// --------------------------------------------------------------------------
// Revision log
// --------------------------------------------------------------------------

interface RevisionInput {
  entity_type: string;
  entity_slug: string;
  action: 'update' | 'publish' | 'unpublish' | 'restore' | 'create';
  status: 'draft' | 'published';
  summary: string;
  patch: Array<{ op: string; target: string; value: unknown }>;
}

async function recordRevision(
  supa: NonNullable<ReturnType<typeof getSupabase>>,
  userId: string,
  rev: RevisionInput,
) {
  // Best-effort — a failure here shouldn't block the user.
  await supa.from('cms_revisions').insert({
    entity_type: rev.entity_type,
    entity_slug: rev.entity_slug,
    action: rev.action,
    status: rev.status,
    summary: rev.summary,
    patch: rev.patch,
    created_by: userId,
  });
}

// --------------------------------------------------------------------------
// Block editor (article body prose)
// --------------------------------------------------------------------------
//
// Tagged paragraphs / headings / lists / blockquotes under
// `[data-pi-prose-root]` become click-to-edit. The block is wrapped in a
// contenteditable surface with a floating toolbar that supports:
//   - Bold (Cmd/Ctrl+B)
//   - Italic (Cmd/Ctrl+I)
//   - Hyperlink (Cmd/Ctrl+K) — popover with URL input and optional internal
//     link autocomplete from pi.content_registry
//   - Save (Cmd/Ctrl+Enter)
//   - Cancel (Esc)
//
// All saves go through a strict allowlist sanitiser before hitting the DB.
// Stored as cms_text_fields rows keyed `body.block:<deterministic-id>`.

interface BlockDescriptor {
  entityType: string;
  entitySlug: string;
  blockId: string;
  blockKind: string;
}

let blockToolbar: HTMLDivElement | null = null;
let linkPopover: HTMLDivElement | null = null;
let activeBlock: HTMLElement | null = null;
let activeBlockDesc: BlockDescriptor | null = null;

function readBlockDescriptor(el: HTMLElement): BlockDescriptor | null {
  const blockId = el.dataset.piBlockId;
  const blockKind = el.dataset.piBlockKind || 'paragraph';
  const root = el.closest<HTMLElement>('[data-pi-prose-root]');
  if (!root || !blockId) return null;
  const entityType = root.dataset.piEntityType;
  const entitySlug = root.dataset.piEntitySlug;
  if (!entityType || !entitySlug) return null;
  return { entityType, entitySlug, blockId, blockKind };
}

function startBlockEdit(el: HTMLElement) {
  const desc = readBlockDescriptor(el);
  if (!desc) return;

  // Close anything else that was open.
  closeMenu();
  closeLinkPopover();
  document.querySelectorAll<HTMLElement>('[data-pi-editing="1"]').forEach((other) => {
    if (other === el) return;
    if (other.hasAttribute('data-pi-block-id')) cancelBlockEdit(other);
    else cancelTextEdit(other);
  });

  el.dataset.piOriginal = el.innerHTML;
  el.dataset.piEditing = '1';
  el.setAttribute('contenteditable', 'true');
  el.classList.add('pi-block-editing');
  el.focus();

  activeBlock = el;
  activeBlockDesc = desc;

  // Cursor at the end of existing content (less disruptive than select-all).
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }

  mountBlockToolbar(el, desc);

  el.addEventListener('keydown', onBlockKeyDown);
  el.addEventListener('paste', onBlockPaste);
  // Reposition toolbar when block height changes (e.g. typing into a list).
  el.addEventListener('input', repositionToolbar);
}

function cancelBlockEdit(el: HTMLElement) {
  el.innerHTML = el.dataset.piOriginal ?? '';
  finishBlockEdit(el);
}

function finishBlockEdit(el: HTMLElement) {
  el.removeAttribute('contenteditable');
  el.classList.remove('pi-block-editing');
  delete el.dataset.piEditing;
  delete el.dataset.piOriginal;
  el.removeEventListener('keydown', onBlockKeyDown);
  el.removeEventListener('paste', onBlockPaste);
  el.removeEventListener('input', repositionToolbar);
  unmountBlockToolbar();
  closeLinkPopover();
  if (activeBlock === el) {
    activeBlock = null;
    activeBlockDesc = null;
  }
}

function onBlockKeyDown(event: KeyboardEvent) {
  const mod = event.metaKey || event.ctrlKey;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (activeBlock) cancelBlockEdit(activeBlock);
    return;
  }
  if (mod && event.key === 'Enter') {
    event.preventDefault();
    if (activeBlock && activeBlockDesc) void saveBlockEdit(activeBlock, activeBlockDesc);
    return;
  }
  if (mod && (event.key === 'b' || event.key === 'B')) {
    event.preventDefault();
    document.execCommand('bold');
    return;
  }
  if (mod && (event.key === 'i' || event.key === 'I')) {
    event.preventDefault();
    document.execCommand('italic');
    return;
  }
  if (mod && (event.key === 'k' || event.key === 'K')) {
    event.preventDefault();
    openLinkPopoverForSelection();
    return;
  }
}

/**
 * Paste handler — converts incoming clipboard data to plain text so editors
 * pasting from Word / Google Docs / web pages don't import a mess of inline
 * styles, font tags, and tracking pixels. Formatting can still be re-applied
 * via the toolbar once the text is in.
 */
function onBlockPaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (!text) return;
  // insertText respects the current selection / cursor position naturally.
  document.execCommand('insertText', false, text);
}

// -- Block toolbar ---------------------------------------------------------

function mountBlockToolbar(el: HTMLElement, desc: BlockDescriptor) {
  unmountBlockToolbar();

  const bar = document.createElement('div');
  bar.className = 'pi-block-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Edit block formatting');
  bar.innerHTML = `
    <button type="button" class="pi-block-toolbar__btn" data-action="bold" aria-label="Bold (Cmd+B)" title="Bold (Cmd+B)"><strong>B</strong></button>
    <button type="button" class="pi-block-toolbar__btn" data-action="italic" aria-label="Italic (Cmd+I)" title="Italic (Cmd+I)"><em>I</em></button>
    <button type="button" class="pi-block-toolbar__btn" data-action="link" aria-label="Link (Cmd+K)" title="Link (Cmd+K)">🔗</button>
    <span class="pi-block-toolbar__sep" aria-hidden="true"></span>
    <span class="pi-block-toolbar__label">${escapeHtml(desc.blockKind)}</span>
    <span class="pi-block-toolbar__spacer"></span>
    <button type="button" class="pi-block-toolbar__btn pi-block-toolbar__btn--ghost" data-action="cancel" aria-label="Cancel (Esc)" title="Cancel (Esc)">Cancel</button>
    <button type="button" class="pi-block-toolbar__btn pi-block-toolbar__btn--primary" data-action="save" aria-label="Save (Cmd+Enter)" title="Save (Cmd+Enter)">Save</button>
  `;
  // Prevent toolbar mousedown from stealing focus from the contenteditable
  // (which would commit a blur-save). Click events still fire because we
  // suppress mousedown only.
  bar.addEventListener('mousedown', (e) => e.preventDefault());
  bar.addEventListener('click', onBlockToolbarClick);
  document.body.appendChild(bar);
  blockToolbar = bar;
  repositionToolbar();
}

function unmountBlockToolbar() {
  if (blockToolbar) {
    blockToolbar.remove();
    blockToolbar = null;
  }
}

function repositionToolbar() {
  if (!blockToolbar || !activeBlock) return;
  const rect = activeBlock.getBoundingClientRect();
  const top = window.scrollY + rect.top - blockToolbar.offsetHeight - 10;
  const left = window.scrollX + rect.left;
  blockToolbar.style.top = `${Math.max(8, top)}px`;
  blockToolbar.style.left = `${Math.max(8, left)}px`;
}

function onBlockToolbarClick(event: MouseEvent) {
  const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  if (!btn || !activeBlock || !activeBlockDesc) return;
  const action = btn.dataset.action;
  switch (action) {
    case 'bold':
      document.execCommand('bold');
      activeBlock.focus();
      break;
    case 'italic':
      document.execCommand('italic');
      activeBlock.focus();
      break;
    case 'link':
      openLinkPopoverForSelection();
      break;
    case 'cancel':
      cancelBlockEdit(activeBlock);
      break;
    case 'save':
      void saveBlockEdit(activeBlock, activeBlockDesc);
      break;
  }
}

// -- Link popover ----------------------------------------------------------

let linkSavedRange: Range | null = null;
let linkSuggestions: Array<{ href: string; label: string }> | null = null;

function openLinkPopoverForSelection() {
  if (!activeBlock) return;
  closeLinkPopover();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  // Save the current selection so we can re-apply it after the popover
  // takes focus.
  linkSavedRange = sel.getRangeAt(0).cloneRange();

  // If the cursor / selection is inside an existing <a>, edit that.
  let existingAnchor: HTMLAnchorElement | null = null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== activeBlock) {
    if (node instanceof HTMLAnchorElement) { existingAnchor = node; break; }
    node = node.parentNode;
  }
  const existingHref = existingAnchor?.getAttribute('href') ?? '';

  const pop = document.createElement('div');
  pop.className = 'pi-link-popover';
  pop.innerHTML = `
    <label class="pi-link-popover__label" for="pi-link-input">Link URL</label>
    <input
      id="pi-link-input"
      class="pi-link-popover__input"
      type="text"
      placeholder="https://… or /journal/some-article/"
      autocomplete="off"
      spellcheck="false"
      value="${escapeHtml(existingHref)}"
    />
    <div class="pi-link-popover__suggestions" role="listbox"></div>
    <div class="pi-link-popover__actions">
      ${existingAnchor ? '<button type="button" class="pi-link-popover__btn pi-link-popover__btn--danger" data-link-action="remove">Remove link</button>' : ''}
      <span class="pi-block-toolbar__spacer"></span>
      <button type="button" class="pi-link-popover__btn" data-link-action="cancel">Cancel</button>
      <button type="button" class="pi-link-popover__btn pi-link-popover__btn--primary" data-link-action="apply">Apply</button>
    </div>
  `;
  pop.addEventListener('mousedown', (e) => e.preventDefault());
  pop.addEventListener('click', onLinkPopoverClick);
  document.body.appendChild(pop);
  linkPopover = pop;
  positionLinkPopover();

  const input = pop.querySelector<HTMLInputElement>('#pi-link-input');
  if (input) {
    input.focus();
    input.select();
    input.addEventListener('input', onLinkInputChange);
    input.addEventListener('keydown', onLinkInputKeyDown);
  }
  // Lazy-load internal-link suggestions on first popover open.
  void ensureLinkSuggestions();
}

function positionLinkPopover() {
  if (!linkPopover || !activeBlock) return;
  const rect = activeBlock.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 8;
  const left = window.scrollX + rect.left;
  linkPopover.style.top = `${top}px`;
  linkPopover.style.left = `${Math.max(8, left)}px`;
}

function closeLinkPopover() {
  if (linkPopover) {
    linkPopover.remove();
    linkPopover = null;
  }
  linkSavedRange = null;
}

function onLinkPopoverClick(event: MouseEvent) {
  const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-link-action]');
  if (btn) {
    const action = btn.dataset.linkAction;
    const input = linkPopover?.querySelector<HTMLInputElement>('#pi-link-input');
    const url = input?.value.trim() ?? '';
    if (action === 'cancel') closeLinkPopover();
    else if (action === 'remove') applyLink(null);
    else if (action === 'apply') applyLink(normaliseLinkUrl(url));
    return;
  }
  // Click on a suggestion row.
  const suggestion = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-suggestion-href]');
  if (suggestion) {
    const input = linkPopover?.querySelector<HTMLInputElement>('#pi-link-input');
    if (input) input.value = suggestion.dataset.suggestionHref ?? '';
    applyLink(normaliseLinkUrl(suggestion.dataset.suggestionHref ?? ''));
  }
}

function onLinkInputChange(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  renderLinkSuggestions(value);
}

function onLinkInputKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const value = (event.target as HTMLInputElement).value.trim();
    applyLink(normaliseLinkUrl(value));
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeLinkPopover();
  }
}

/** Normalise a user-typed URL. Bare domain → https://; trailing slashes
 *  preserved; internal paths left as-is. Returns null for empty input. */
function normaliseLinkUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('mailto:') || v.startsWith('tel:')) return v;
  if (/^https?:\/\//i.test(v)) return v;
  // Bare domain or path — assume https://
  return `https://${v}`;
}

function applyLink(url: string | null) {
  if (!activeBlock) return closeLinkPopover();
  activeBlock.focus();
  // Restore the selection we saved when the popover opened.
  if (linkSavedRange) {
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(linkSavedRange); }
  }
  if (url === null) {
    document.execCommand('unlink');
  } else {
    document.execCommand('createLink', false, url);
    // Post-process: external links get target+rel; internal links don't.
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== activeBlock) {
        if (node instanceof HTMLAnchorElement && node.getAttribute('href') === url) {
          if (/^https?:\/\//i.test(url)) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          } else {
            node.removeAttribute('target');
            node.removeAttribute('rel');
          }
          break;
        }
        node = node.parentNode;
      }
    }
  }
  closeLinkPopover();
}

async function ensureLinkSuggestions() {
  if (linkSuggestions !== null) return;
  linkSuggestions = []; // mark in-progress to avoid double-loads
  const supa = getSupabase();
  if (!supa) return;
  const { data } = await supa
    .from('content_registry')
    .select('href, title, entity_type, entity_slug')
    .not('href', 'is', null)
    .limit(800);
  linkSuggestions = (data ?? [])
    .filter((r: any) => r.href)
    .map((r: any) => ({
      href: r.href as string,
      label: (r.title || `${r.entity_type} / ${r.entity_slug}`) as string,
    }));
  // If the popover is still open, re-render with whatever the user has typed.
  const input = linkPopover?.querySelector<HTMLInputElement>('#pi-link-input');
  if (input) renderLinkSuggestions(input.value);
}

function renderLinkSuggestions(query: string) {
  const box = linkPopover?.querySelector<HTMLDivElement>('.pi-link-popover__suggestions');
  if (!box) return;
  const q = query.trim().toLowerCase();
  if (!q || !linkSuggestions || linkSuggestions.length === 0) {
    box.innerHTML = '';
    return;
  }
  const matches = linkSuggestions
    .filter((s) => s.href.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))
    .slice(0, 6);
  if (matches.length === 0) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = matches.map((m) => `
    <button type="button" class="pi-link-popover__suggestion" data-suggestion-href="${escapeHtml(m.href)}">
      <span class="pi-link-popover__suggestion-label">${escapeHtml(m.label)}</span>
      <span class="pi-link-popover__suggestion-href">${escapeHtml(m.href)}</span>
    </button>
  `).join('');
}

// -- Save + sanitiser ------------------------------------------------------

/**
 * Strict HTML allowlist. Only the tags + attributes we explicitly trust to
 * appear in editor-saved prose. Everything else is stripped on save.
 *
 * Allowed:
 *   <strong>, <b>             → <strong>
 *   <em>, <i>                  → <em>
 *   <a href="..." target rel> with safe href schemes
 *   <br>
 *
 * Notably NOT allowed: <script>, <style>, <iframe>, on* handlers, data:/
 * javascript: URLs, inline style attributes, class attributes, custom tags,
 * any image / video / audio embed (those are managed by the right-click
 * image flow, not the block editor).
 */
function sanitiseBlockHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';
  walk(root);
  return root.innerHTML.trim();

  function walk(node: Element) {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'b') replaceTag(child, 'strong');
      else if (tag === 'i') replaceTag(child, 'em');
      else if (tag === 'strong' || tag === 'em') stripAllAttributes(child);
      else if (tag === 'br') stripAllAttributes(child);
      else if (tag === 'a') sanitiseAnchor(child as HTMLAnchorElement);
      else {
        // Unrecognised tag — unwrap (keep its text content, drop the element).
        const parent = child.parentNode;
        if (!parent) continue;
        while (child.firstChild) parent.insertBefore(child.firstChild, child);
        parent.removeChild(child);
        continue;
      }
      if (child.parentNode) walk(child);
    }
  }

  function replaceTag(el: Element, newTag: string) {
    const replacement = doc.createElement(newTag);
    while (el.firstChild) replacement.appendChild(el.firstChild);
    el.parentNode?.replaceChild(replacement, el);
  }

  function stripAllAttributes(el: Element) {
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
  }

  function sanitiseAnchor(a: HTMLAnchorElement) {
    const href = a.getAttribute('href') ?? '';
    if (!isSafeHref(href)) {
      // Drop the anchor, keep its text.
      const parent = a.parentNode;
      if (!parent) return;
      while (a.firstChild) parent.insertBefore(a.firstChild, a);
      parent.removeChild(a);
      return;
    }
    const isExternal = /^https?:\/\//i.test(href);
    for (const attr of Array.from(a.attributes)) {
      if (attr.name === 'href') continue;
      if (isExternal && (attr.name === 'target' || attr.name === 'rel')) continue;
      a.removeAttribute(attr.name);
    }
    if (isExternal) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  }

  function isSafeHref(href: string): boolean {
    if (!href) return false;
    if (href.startsWith('/') || href.startsWith('#')) return true;
    if (/^mailto:/i.test(href) || /^tel:/i.test(href)) return true;
    if (/^https?:\/\//i.test(href)) return true;
    // Block javascript:, data:, vbscript:, etc.
    return false;
  }
}

async function saveBlockEdit(el: HTMLElement, desc: BlockDescriptor) {
  const rawHtml = el.innerHTML;
  const cleanHtml = sanitiseBlockHtml(rawHtml);
  const originalHtml = sanitiseBlockHtml(el.dataset.piOriginal ?? '');

  if (cleanHtml === originalHtml) {
    toast('No change.', 'info');
    finishBlockEdit(el);
    return;
  }

  const supa = getSupabase();
  if (!supa) { toast('Supabase not configured.', 'err'); return; }

  const { data: { session } } = await supa.auth.getSession();
  if (!session) { toast('Signed out — please sign in again.', 'err'); return; }

  const fieldPath = `body.block:${desc.blockId}`;
  const label = `Body block (${desc.blockKind})`;
  const row = {
    entity_type: desc.entityType,
    entity_slug: desc.entitySlug,
    field_path: fieldPath,
    label,
    field_kind: 'richtext' as const,
    value: cleanHtml,
    status: 'published' as const,
    updated_by: session.user.id,
  };

  const { data: existing } = await supa
    .from('cms_text_fields')
    .select('id')
    .eq('entity_type', desc.entityType)
    .eq('entity_slug', desc.entitySlug)
    .eq('field_path', fieldPath)
    .is('locale', null)
    .maybeSingle();

  let saveErr: { message: string } | null = null;
  if (existing?.id) {
    const { error } = await supa.from('cms_text_fields').update(row).eq('id', existing.id);
    saveErr = error;
  } else {
    const { error } = await supa.from('cms_text_fields').insert(row);
    saveErr = error;
  }

  if (saveErr) {
    toast(`Save failed: ${saveErr.message}`, 'err');
    return;
  }

  // Reflect the sanitised HTML in the DOM so the editor sees the final form
  // (e.g. a stripped <span> disappears immediately, not on next page load).
  el.innerHTML = cleanHtml;

  await recordRevision(supa, session.user.id, {
    entity_type: desc.entityType,
    entity_slug: desc.entitySlug,
    action: 'update',
    status: 'published',
    summary: `Edited body block (${desc.blockKind})`,
    patch: [{ op: 'set', target: fieldPath, value: cleanHtml }],
  });

  toast(`Saved.`, 'ok');
  finishBlockEdit(el);
}

// --------------------------------------------------------------------------
// Toast
// --------------------------------------------------------------------------

function toast(message: string, tone: Tone = 'info') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'pi-edit-toast';
    toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  toastEl.dataset.tone = tone;
  toastEl.textContent = message;
  toastEl.dataset.visible = '1';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl?.removeAttribute('data-visible');
  }, 2200);
}
