/**
 * Peninsula Insider — inline editor client.
 *
 * Loads on every public page (via BaseLayout). When a signed-in admin is
 * detected, renders an "Edit mode" toggle. When edit mode is on, decorates
 * elements marked with `data-pi-edit` to be edited in place:
 *
 *   - text  → click element → contenteditable → save on blur / Enter
 *   - image → right-click → custom menu (Replace / Edit alt / Edit caption)
 *
 * Writes go direct to Supabase via the user's JWT — RLS in the pi schema is
 * the security boundary. This means inline editing works on both static
 * (GitHub Pages) and hybrid (Vercel) deploys; the admin API at
 * /admin/api/content/* is unused by this client.
 */

import { getSupabase, isAuthEnabled } from '../auth';

type Tone = 'ok' | 'err' | 'info';

const STORAGE_BUCKET = 'cms-assets';
const EDIT_MODE_FLAG = 'pi.editMode';

let editMode = false;
let isAdmin = false;
let delegationInstalled = false;
let toggleEl: HTMLButtonElement | null = null;
let menuEl: HTMLDivElement | null = null;
let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// --------------------------------------------------------------------------
// Boot
// --------------------------------------------------------------------------

/**
 * One-time setup: verify session + allowlist, install event delegation.
 * Called once per page load (and again after Astro view transitions, but
 * the inner logic is idempotent).
 *
 * Also kicks off `applyOverridesOnLoad()` for every visitor — admin or
 * not — so published image replacements appear without a site rebuild.
 */
export async function bootInlineEditor(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!isAuthEnabled()) return;

  const supa = getSupabase();
  if (!supa) return;

  // Patch published overrides for everyone. Fire-and-forget — RLS gates
  // reads to status='published' rows, so anon visitors get the same view
  // as admins (just without the editing chrome).
  void applyOverridesOnLoad();

  const { data: { session } } = await supa.auth.getSession();
  if (!session) { ensureToggleRemoved(); return; }

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
  // re-render on every page-load event.
  mountToggle();

  // Event delegation is on `document`, which survives view transitions,
  // so we only install once.
  if (!delegationInstalled) {
    installDelegation();
    delegationInstalled = true;
  }

  // Restore previous edit-mode preference. Body class is page-scoped so we
  // re-apply it here every boot.
  const stored = sessionStorage.getItem(EDIT_MODE_FLAG);
  setEditMode(stored === '1');

  // If the session ends mid-page, hide the chrome.
  supa.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      isAdmin = false;
      setEditMode(false);
      ensureToggleRemoved();
    }
  });
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
  toggleEl.addEventListener('click', () => setEditMode(!editMode));
  document.body.appendChild(toggleEl);
}

function setEditMode(on: boolean) {
  editMode = on;
  document.body.dataset.piEditMode = on ? 'on' : 'off';
  sessionStorage.setItem(EDIT_MODE_FLAG, on ? '1' : '0');
  if (!on) closeMenu();
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

  const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-pi-edit="text"]');
  if (!el) return;
  if (el.dataset.piEditing === '1') return;

  event.preventDefault();
  event.stopPropagation();
  startTextEdit(el);
}

function onContextMenu(event: MouseEvent) {
  if (!editMode) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  // 1. Explicitly tagged image surface (background-image div, picture, etc).
  let el: HTMLElement | null = target.closest<HTMLElement>('[data-pi-edit="image"]');

  // 2. Otherwise any <img> on the page becomes universally editable —
  //    auto-derives entity_slug from URL, field_path from src basename.
  if (!el && target.tagName === 'IMG') el = target;
  if (!el && target.tagName === 'IMG' === false) {
    // Nested case — clicking the image's wrapping link/figure.
    const nested = target.closest<HTMLElement>('a, figure, picture, div');
    const img = nested?.querySelector('img');
    if (img) el = img as HTMLElement;
  }

  if (!el) return;

  event.preventDefault();
  event.stopPropagation();
  openImagePanel(el, event.clientX, event.clientY);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu();
    const active = document.querySelector<HTMLElement>('[data-pi-editing="1"]');
    if (active) cancelTextEdit(active);
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
    };
  }

  // Auto-derive for untagged images. Only `<img>` elements have src; for
  // background-image divs the caller must tag explicitly.
  if (el.tagName !== 'IMG') return null;
  const img = el as HTMLImageElement;
  const src = img.currentSrc || img.src;
  const basename = srcBasename(src);
  return {
    entityType: 'page',
    entitySlug: currentPageSlug(),
    fieldPath: `img:${basename}`,
    label: img.alt || basename,
    purpose: 'inline',
    autoDetected: true,
  };
}

/**
 * Floating image-edit popover. Replaces the old context-menu list with a
 * proper editor panel: thumbnail preview, replace button, and inline
 * fields for alt / caption / credit. Save commits all dirty fields at once.
 */
function openImagePanel(el: HTMLElement, x: number, y: number) {
  closeMenu();
  const desc = readImageDescriptor(el);
  if (!desc) return;

  const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
  const thumbSrc = img?.currentSrc || img?.src || '';

  menuEl = document.createElement('div');
  menuEl.className = 'pi-edit-panel';
  // Position the panel near the click but clamp into viewport.
  const PANEL_W = 320, PANEL_H = 420;
  menuEl.style.left = `${Math.max(8, Math.min(x, window.innerWidth - PANEL_W - 8))}px`;
  menuEl.style.top  = `${Math.max(8, Math.min(y, window.innerHeight - PANEL_H - 8))}px`;

  menuEl.innerHTML = `
    <div class="pi-edit-panel__head">
      <div class="pi-edit-panel__thumb" style="background-image: url(${cssUrl(thumbSrc)})"></div>
      <div class="pi-edit-panel__title">
        <div class="pi-edit-panel__label">${escapeHtml(desc.label)}</div>
        <div class="pi-edit-panel__sub">${desc.autoDetected ? 'Auto-detected image' : 'Tagged image slot'}</div>
      </div>
      <button type="button" class="pi-edit-panel__close" aria-label="Close">×</button>
    </div>
    <button type="button" class="pi-edit-panel__replace" data-action="replace">
      <span aria-hidden="true">⇪</span> Replace image…
    </button>
    <div class="pi-edit-panel__fields">
      <label class="pi-edit-panel__field">
        <span>Alt text</span>
        <input type="text" data-field="alt" />
      </label>
      <label class="pi-edit-panel__field">
        <span>Caption</span>
        <input type="text" data-field="caption" />
      </label>
      <label class="pi-edit-panel__field">
        <span>Credit</span>
        <input type="text" data-field="credit" />
      </label>
    </div>
    <div class="pi-edit-panel__foot">
      <button type="button" class="pi-edit-panel__btn pi-edit-panel__btn--ghost" data-action="cancel">Cancel</button>
      <button type="button" class="pi-edit-panel__btn pi-edit-panel__btn--primary" data-action="save">Save changes</button>
    </div>
  `;
  document.body.appendChild(menuEl);

  // Hydrate the inputs with the current row, if one exists.
  void hydratePanel(menuEl, desc);

  // Wire the action buttons.
  menuEl.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'replace') triggerImageReplace(el, desc);
    if (action === 'cancel')  closeMenu();
    if (action === 'save')    void savePanelMeta(menuEl!, el, desc);
  });
  menuEl.querySelector('.pi-edit-panel__close')?.addEventListener('click', closeMenu);
}

function cssUrl(src: string): string {
  return src.replace(/["\\]/g, (m) => `\\${m}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

async function hydratePanel(panel: HTMLElement, desc: ImageDescriptor) {
  const supa = getSupabase();
  if (!supa) return;

  const { data } = await supa
    .from('cms_image_slots')
    .select('alt_text, caption, credit')
    .eq('entity_type', desc.entityType)
    .eq('entity_slug', desc.entitySlug)
    .eq('field_path', desc.fieldPath)
    .maybeSingle();

  const row = data as { alt_text: string | null; caption: string | null; credit: string | null } | null;
  if (!row) return;

  const altInput     = panel.querySelector<HTMLInputElement>('input[data-field="alt"]');
  const captionInput = panel.querySelector<HTMLInputElement>('input[data-field="caption"]');
  const creditInput  = panel.querySelector<HTMLInputElement>('input[data-field="credit"]');
  if (altInput && row.alt_text)    altInput.value     = row.alt_text;
  if (captionInput && row.caption) captionInput.value = row.caption;
  if (creditInput && row.credit)   creditInput.value  = row.credit;
}

async function savePanelMeta(panel: HTMLElement, el: HTMLElement, desc: ImageDescriptor) {
  const supa = getSupabase();
  if (!supa) return toast('Supabase not configured.', 'err');
  const { data: { session } } = await supa.auth.getSession();
  if (!session) return toast('Signed out.', 'err');

  const altText = panel.querySelector<HTMLInputElement>('input[data-field="alt"]')?.value ?? null;
  const caption = panel.querySelector<HTMLInputElement>('input[data-field="caption"]')?.value ?? null;
  const credit  = panel.querySelector<HTMLInputElement>('input[data-field="credit"]')?.value ?? null;

  const { data: existing } = await supa
    .from('cms_image_slots')
    .select('id, public_url, storage_path')
    .eq('entity_type', desc.entityType)
    .eq('entity_slug', desc.entitySlug)
    .eq('field_path', desc.fieldPath)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    alt_text: altText || null,
    caption:  caption || null,
    credit:   credit || null,
    status:   'published',
    updated_by: session.user.id,
  };

  if (existing?.id) {
    const { error } = await supa.from('cms_image_slots').update(patch).eq('id', existing.id);
    if (error) return toast(`Save failed: ${error.message}`, 'err');
  } else {
    // Create a slot row carrying metadata only (no upload yet).
    const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
    const row = {
      entity_type: desc.entityType,
      entity_slug: desc.entitySlug,
      field_path:  desc.fieldPath,
      label:       desc.label,
      purpose:     desc.purpose,
      storage_bucket: STORAGE_BUCKET,
      storage_path:   null,
      public_url:     img?.src ?? null,
      ...patch,
    };
    const { error } = await supa.from('cms_image_slots').insert(row);
    if (error) return toast(`Save failed: ${error.message}`, 'err');
  }

  // Reflect alt in the DOM.
  const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
  if (img && altText) img.alt = altText;

  await recordRevision(supa, session.user.id, {
    entity_type: desc.entityType,
    entity_slug: desc.entitySlug,
    action: 'update',
    status: 'published',
    summary: `Edited metadata for "${desc.label}"`,
    patch: [{ op: 'set', target: `${desc.fieldPath}.meta`, value: { altText, caption, credit } }],
  });

  toast(`Saved "${desc.label}".`, 'ok');
  closeMenu();
}

function closeMenu() {
  menuEl?.remove();
  menuEl = null;
}

function triggerImageReplace(el: HTMLElement, desc?: ImageDescriptor) {
  const d = desc ?? readImageDescriptor(el);
  if (!d) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp,image/avif';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    closeMenu();
    await replaceImage(el, d, file);
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

async function replaceImage(el: HTMLElement, desc: ImageDescriptor, file: File) {
  const supa = getSupabase();
  if (!supa) return toast('Supabase not configured.', 'err');

  const { data: { session } } = await supa.auth.getSession();
  if (!session) return toast('Signed out.', 'err');

  el.dataset.piUploading = '1';
  try {
    const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? 'jpg';
    const ts = Date.now();
    const safeSlug = desc.entitySlug.replace(/[^a-z0-9-]/gi, '-');
    const safeField = desc.fieldPath.replace(/[^a-z0-9._-]/gi, '-');
    const storagePath = `${desc.entityType}/${safeSlug}/${safeField}-${ts}.${ext}`;

    const { error: uploadErr } = await supa.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || `image/${ext}`,
        cacheControl: '31536000',
      });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: pub } = supa.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;

    // Find or create the cms_image_slots row.
    const { data: existing } = await supa
      .from('cms_image_slots')
      .select('id')
      .eq('entity_type', desc.entityType)
      .eq('entity_slug', desc.entitySlug)
      .eq('field_path', desc.fieldPath)
      .maybeSingle();

    const row = {
      entity_type: desc.entityType,
      entity_slug: desc.entitySlug,
      field_path: desc.fieldPath,
      label: desc.label,
      purpose: desc.purpose,
      storage_bucket: STORAGE_BUCKET,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: file.type || `image/${ext}`,
      status: 'published' as const,
      updated_by: session.user.id,
    };

    if (existing?.id) {
      const { error } = await supa.from('cms_image_slots').update(row).eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supa.from('cms_image_slots').insert(row);
      if (error) throw new Error(error.message);
    }

    // Update the visible <img> src so the change is immediate.
    const img = el.tagName === 'IMG' ? (el as HTMLImageElement) : el.querySelector('img');
    if (img) img.src = publicUrl + (publicUrl.includes('?') ? '&' : '?') + 'v=' + ts;

    await recordRevision(supa, session.user.id, {
      entity_type: desc.entityType,
      entity_slug: desc.entitySlug,
      action: 'update',
      status: 'published',
      summary: `Replaced image "${desc.label}" inline`,
      patch: [{ op: 'set', target: desc.fieldPath, value: publicUrl }],
    });

    toast(`Replaced "${desc.label}".`, 'ok');
  } catch (err) {
    toast(`Upload failed: ${(err as Error).message}`, 'err');
  } finally {
    delete el.dataset.piUploading;
  }
}

// --------------------------------------------------------------------------
// Client-side override patcher
// --------------------------------------------------------------------------

/**
 * After every page load, fetch any published image overrides for the current
 * page slug and patch matching `<img>` srcs in place. Lets auto-detected
 * image replacements appear without a site rebuild.
 *
 * The match is by src basename — the same stable key the editor uses when
 * saving an override. Only `entity_type='page', entity_slug=currentPageSlug()`
 * rows are considered.
 */
async function applyOverridesOnLoad() {
  const supa = getSupabase();
  if (!supa) return;

  const entitySlug = currentPageSlug();
  const { data } = await supa
    .from('cms_image_slots')
    .select('field_path, public_url, alt_text')
    .eq('entity_type', 'page')
    .eq('entity_slug', entitySlug)
    .eq('status', 'published');

  const rows = (data as Array<{ field_path: string; public_url: string | null; alt_text: string | null }> | null) ?? [];
  if (rows.length === 0) return;

  // Build a lookup: field_path → row. Only auto-keyed entries patch <img>s.
  const byPath = new Map(rows.map((r) => [r.field_path, r]));

  document.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
    // Skip images that are already explicitly tagged — their server-side
    // rendering already consulted overrides via loadOverrides().
    if (img.closest('[data-pi-edit]')) return;

    const basename = srcBasename(img.currentSrc || img.src);
    const row = byPath.get(`img:${basename}`);
    if (!row || !row.public_url) return;
    if (img.src === row.public_url) return;

    img.src = row.public_url;
    if (row.alt_text) img.alt = row.alt_text;
  });
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
