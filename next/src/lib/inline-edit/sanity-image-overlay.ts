/**
 * Sanity media-library overlay for admin image replacement.
 *
 * Loaded lazily (dynamic import) when an admin clicks "Replace from media
 * library" in the existing inline-edit image panel. Keeps the public JS
 * bundle small — anon visitors never download this code.
 *
 * Flow:
 *   1. resolveSanitySource(el, descriptor) — figures out the source Sanity
 *      doc id + field path, in priority order:
 *        a) explicit `data-pi-edit` attrs (mapped to a Sanity slug query)
 *        b) stega marker decoded off the rendered image src
 *        c) null — caller renders the "not bound to Sanity" notice
 *   2. openMediaLibraryModal(el, source) — fetches assets via
 *      /api/admin/sanity-assets, lets the editor pick or upload, then
 *      POSTs to /api/admin/sanity-patch and swaps the visible image src
 *      on success.
 */
import { vercelStegaDecode, vercelStegaSplit } from '@vercel/stega';

export interface SanitySource {
  /** When known — the published Sanity doc id. Takes precedence. */
  docId?: string;
  /** Legacy fallback — caller didn't have a docId but did have a slug. */
  entityType?: string;
  entitySlug?: string;
  /** Always set. Dot-notation path to the image field on the doc. */
  fieldPath: string;
  /** Origin hint for diagnostics in the modal header. */
  resolvedVia: 'data-pi-edit' | 'stega';
}

interface EditableDescriptor {
  entityType: string;
  entitySlug: string;
  fieldPath: string;
  autoDetected: boolean;
  /** Sanity singleton _id when this image binds to a singleton doc. */
  sanitySingletonId?: string;
  /** Dot-notation path inside the singleton doc. Defaults to fieldPath. */
  sanitySingletonPath?: string;
}

interface ToastFn {
  (msg: string, tone?: 'ok' | 'err' | 'info'): void;
}

interface SetSrcFn {
  (el: HTMLElement, src: string): void;
}

interface SanityStegaPayload {
  origin?: string;
  href?: string;
}

/**
 * Decode the Sanity stega payload from a rendered image URL, if present.
 * Sanity encodes `{ origin: 'sanity.io', href: '<studio intent URL>' }`
 * into the trailing whitespace of every stega-tracked string.
 */
function decodeStegaFromSrc(src: string): { docId: string; fieldPath: string } | null {
  if (!src) return null;
  // Sanity sometimes encodes the marker into the trailing whitespace of the
  // raw string. `vercelStegaDecode` finds the first hidden payload.
  const payload = vercelStegaDecode<SanityStegaPayload>(src);
  if (!payload?.href) return null;
  return parseStudioIntentHref(payload.href);
}

/**
 * Parse a Studio intent URL of the form
 *   https://…sanity.studio/intent/edit/id={docId};type={type};path={path}/
 * Returns the doc id + field path, or null if the URL doesn't match.
 */
function parseStudioIntentHref(href: string): { docId: string; fieldPath: string } | null {
  try {
    const u = new URL(href);
    // The intent params live in the pathname after `/intent/edit/`.
    const match = u.pathname.match(/\/intent\/edit\/([^/]+)/);
    if (!match) return null;
    const segment = decodeURIComponent(match[1]);
    const params = new Map<string, string>();
    for (const part of segment.split(';')) {
      const [k, ...rest] = part.split('=');
      if (k && rest.length > 0) params.set(k.trim(), rest.join('=').trim());
    }
    const docId = params.get('id');
    const path = params.get('path');
    if (!docId || !path) return null;
    return { docId, fieldPath: normaliseFieldPath(path) };
  } catch {
    return null;
  }
}

/**
 * Sanity's stega path uses square-bracket array indices and dot separators
 * for objects (e.g. `gallery[0].asset`). The patch endpoint accepts the
 * same shape — but we want to patch the *image* object, not its nested
 * `asset` property, so trim a trailing `.asset` if present.
 */
function normaliseFieldPath(raw: string): string {
  let p = raw.trim();
  // Strip trailing `.asset` or `.asset._ref` etc. — the patch helper writes
  // the whole image object.
  p = p.replace(/\.asset(\._ref)?$/i, '');
  return p;
}

// ─── Editor-supplied bindings cache (pi.image_bindings) ─────────────────
//
// When an admin uses "Bind to a Sanity doc…" the row is written to
// pi.image_bindings. We cache the result of GET /api/admin/image-binding
// per (pageUrlPattern) for the lifetime of the page so subsequent
// right-clicks resolve synchronously. The cache is cleared after a fresh
// bind so the new row is picked up immediately on the next right-click.

export interface BindingRow {
  id: string;
  page_url_pattern: string;
  image_basename: string;
  sanity_doc_id: string;
  sanity_doc_type: string;
  sanity_field_path: string;
}

let bindingsCache: { pattern: string; rows: BindingRow[] } | null = null;
let bindingsInFlight: Promise<BindingRow[]> | null = null;

export function currentPageUrlPattern(): string {
  if (typeof location === 'undefined') return '/';
  let p = location.pathname || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && !p.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(p)) p = `${p}/`;
  return p;
}

export async function loadBindingsForPage(pattern = currentPageUrlPattern()): Promise<BindingRow[]> {
  if (bindingsCache && bindingsCache.pattern === pattern) return bindingsCache.rows;
  if (bindingsInFlight) return bindingsInFlight;
  bindingsInFlight = (async () => {
    try {
      const res = await fetch(
        `/api/admin/image-binding?pageUrlPattern=${encodeURIComponent(pattern)}`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) return [];
      const body = await res.json();
      const rows = ((body?.data?.bindings as BindingRow[]) ?? []) as BindingRow[];
      bindingsCache = { pattern, rows };
      return rows;
    } catch {
      return [];
    } finally {
      bindingsInFlight = null;
    }
  })();
  return bindingsInFlight;
}

export function invalidateBindingsCache(): void {
  bindingsCache = null;
}

export function getCachedBindings(): BindingRow[] {
  return bindingsCache?.rows ?? [];
}

export function srcBasenameFor(src: string | null | undefined): string {
  if (!src) return 'unknown';
  let s = src.split('?')[0];
  try { s = decodeURIComponent(s); } catch { /* ignore */ }
  const file = s.split('/').filter(Boolean).pop() || 'unknown';
  return file.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}

/**
 * Synchronous binding lookup against the cache. Returns null when no
 * matching binding exists for the element's image filename basename.
 */
export function lookupBinding(el: HTMLElement): BindingRow | null {
  if (!bindingsCache) return null;
  let src = '';
  if (el instanceof HTMLImageElement) {
    src = el.getAttribute('src') || el.src;
  } else {
    const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
    const m = bg.match(/url\((['"]?)([^)]+?)\1\)/);
    src = m?.[2] ?? '';
  }
  const basename = srcBasenameFor(src);
  for (const row of bindingsCache.rows) {
    if (row.image_basename === basename) return row;
  }
  return null;
}

export function resolveSanitySource(
  el: HTMLElement,
  desc: EditableDescriptor,
): SanitySource | null {
  // a) Explicit Sanity singleton binding via data-pi-sanity-singleton-id.
  //    Highest priority — the element's source is unambiguous.
  if (!desc.autoDetected && desc.sanitySingletonId) {
    return {
      docId: desc.sanitySingletonId,
      fieldPath: normaliseFieldPath(desc.sanitySingletonPath ?? desc.fieldPath),
      resolvedVia: 'data-pi-edit',
    };
  }

  // b) data-pi-edit attrs — only useful when the entityType maps to a Sanity
  //    type with a slug. Page-level slots fall through to stega.
  if (!desc.autoDetected) {
    const SANITY_BACKED: ReadonlySet<string> = new Set([
      'venue',
      'place',
      'article',
      'event',
      'itinerary',
      'tour',
      'experience',
      'tour-operator',
      'tour-package',
      // Page-level entities route through Supabase image_slots (not Sanity
      // document patches) but use the same entityType+entitySlug+fieldPath
      // binding shape — so they belong in this set.
      'page',
    ]);
    if (SANITY_BACKED.has(desc.entityType)) {
      return {
        entityType: desc.entityType,
        entitySlug: desc.entitySlug,
        fieldPath: desc.fieldPath,
        resolvedVia: 'data-pi-edit',
      };
    }
  }

  // b) Stega marker on the rendered image src.
  let src = '';
  if (el instanceof HTMLImageElement) {
    src = el.getAttribute('src') || el.src;
  } else {
    const bg = el.style.backgroundImage || window.getComputedStyle(el).backgroundImage;
    const m = bg.match(/url\((['"]?)([^)]+?)\1\)/);
    src = m?.[2] ?? '';
  }
  const stega = decodeStegaFromSrc(src);
  if (stega) {
    return {
      docId: stega.docId,
      fieldPath: stega.fieldPath,
      resolvedVia: 'stega',
    };
  }

  // c) Editor-supplied binding (pi.image_bindings). Synchronous lookup
  //    against the cache populated by `loadBindingsForPage()` on boot.
  const binding = lookupBinding(el);
  if (binding) {
    return {
      docId: binding.sanity_doc_id,
      fieldPath: normaliseFieldPath(binding.sanity_field_path),
      resolvedVia: 'data-pi-edit',
    };
  }

  return null;
}

/**
 * Quick probe — does this element have *any* mechanism by which we could
 * bind it to a Sanity doc? Used by the panel to decide whether to enable
 * or grey out the "Replace from media library" button.
 */
export function hasSanityBinding(el: HTMLElement, desc: EditableDescriptor): boolean {
  return resolveSanitySource(el, desc) !== null;
}

/**
 * Inert helper exported for tests / debugging — strip stega markers from a
 * string. Useful when displaying a URL to the editor.
 */
export function stripStega(s: string): string {
  return vercelStegaSplit(s).cleaned;
}

export async function openSourceInStudio(source: SanitySource, toast: ToastFn): Promise<void> {
  const target = window.open('about:blank', '_blank');
  if (target) target.opener = null;

  const params = new URLSearchParams();
  params.set('fieldPath', source.fieldPath);
  if (source.docId) params.set('docId', source.docId);
  if (source.entityType) params.set('entityType', source.entityType);
  if (source.entitySlug) params.set('entitySlug', source.entitySlug);

  const res = await fetch(`/api/admin/sanity-doc-link?${params.toString()}`, {
    credentials: 'same-origin',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok || !body.data?.url) {
    target?.close();
    toast(`Couldn't resolve Sanity document: ${body?.error || res.statusText}`, 'err');
    return;
  }
  const href = String(body.data.url);
  if (target) target.location.href = href;
  else window.location.href = href;
}

// ─── Modal ───────────────────────────────────────────────────────────────

interface ModalOpts {
  el: HTMLElement;
  source: SanitySource;
  toast: ToastFn;
  setImageSrc: SetSrcFn;
  onClose: () => void;
}

interface SanityAssetSummary {
  _id: string;
  url: string;
  originalFilename: string | null;
  dimensions: { width: number; height: number; aspectRatio: number } | null;
  tags: string[] | null;
}

let activeModal: HTMLDivElement | null = null;
let activeModalCleanup: (() => void) | null = null;

type Sort = 'recent' | 'name';
type Orientation = 'any' | 'landscape' | 'portrait' | 'square';

export function openMediaLibraryModal(opts: ModalOpts): void {
  closeMediaLibraryModal();

  const headerSub = opts.source.resolvedVia === 'stega'
    ? `Source: stega — doc ${escapeHtml(opts.source.docId ?? '')}, field ${escapeHtml(opts.source.fieldPath)}`
    : `Source: ${escapeHtml(opts.source.entityType ?? '')}/${escapeHtml(opts.source.entitySlug ?? '')}, field ${escapeHtml(opts.source.fieldPath)}`;

  // Snapshot the currently-visible src for the preview thumbnail and so
  // Undo can restore it.
  let currentVisibleSrc = '';
  if (opts.el instanceof HTMLImageElement) {
    currentVisibleSrc = opts.el.getAttribute('src') || opts.el.src || '';
  } else {
    const bg = opts.el.style.backgroundImage || window.getComputedStyle(opts.el).backgroundImage;
    const m = bg.match(/url\((['"]?)([^)]+?)\1\)/);
    currentVisibleSrc = m?.[2] ?? '';
  }
  const currentClean = stripStega(currentVisibleSrc);

  const wrap = document.createElement('div');
  wrap.className = 'pi-sanity-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'pi-sanity-modal-title');
  wrap.setAttribute('data-lenis-prevent', '');
  wrap.innerHTML = `
    <div class="pi-sanity-modal__backdrop" data-close="1"></div>
    <div class="pi-sanity-modal__panel" tabindex="-1" data-lenis-prevent>
      <div class="pi-sanity-modal__head">
        <div class="pi-sanity-modal__head-main">
          ${currentClean ? `<span class="pi-sanity-modal__current" aria-hidden="true" style="background-image: url('${cssUrl(currentClean)}')"></span>` : ''}
          <div>
            <div class="pi-sanity-modal__title" id="pi-sanity-modal-title">Replace from media library</div>
            <div class="pi-sanity-modal__sub">${headerSub}</div>
          </div>
        </div>
        <button type="button" class="pi-sanity-modal__close" data-close="1" aria-label="Close">×</button>
      </div>
      <div class="pi-sanity-modal__toolbar">
        <input type="search" class="pi-sanity-modal__search" placeholder="Search assets by filename…" aria-label="Search assets" />
        <div class="pi-sanity-modal__chips" role="group" aria-label="Filter by orientation">
          <button type="button" class="pi-sanity-modal__chip" data-orient="any" aria-pressed="true">Any</button>
          <button type="button" class="pi-sanity-modal__chip" data-orient="landscape" aria-pressed="false">Landscape</button>
          <button type="button" class="pi-sanity-modal__chip" data-orient="portrait" aria-pressed="false">Portrait</button>
          <button type="button" class="pi-sanity-modal__chip" data-orient="square" aria-pressed="false">Square</button>
        </div>
        <div class="pi-sanity-modal__sort" role="group" aria-label="Sort">
          <button type="button" class="pi-sanity-modal__chip" data-sort="recent" aria-pressed="true">Recent</button>
          <button type="button" class="pi-sanity-modal__chip" data-sort="name" aria-pressed="false">Name</button>
        </div>
        <label class="pi-sanity-modal__upload">
          <span>Upload new…</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden />
        </label>
      </div>
      <div class="pi-sanity-modal__grid" role="listbox" aria-label="Assets" tabindex="0">
        <div class="pi-sanity-modal__status">Loading…</div>
      </div>
      <div class="pi-sanity-modal__foot">
        <button type="button" class="pi-sanity-modal__btn" data-action="prev">‹ Prev</button>
        <span class="pi-sanity-modal__page">Page 1</span>
        <button type="button" class="pi-sanity-modal__btn" data-action="next">Next ›</button>
      </div>
      <div class="pi-sanity-modal__drop" aria-hidden="true">
        <div class="pi-sanity-modal__drop-inner">Drop to upload</div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  activeModal = wrap;
  document.dispatchEvent(new CustomEvent('pi:lenis-stop'));

  // Scroll lock — keep the underlying page still while the editor wheels
  // inside the modal. Record the previous overflow values so close can
  // restore them exactly (some other component may already have set them).
  const prevHtmlOverflow = document.documentElement.style.overflow;
  const prevBodyOverflow = document.body.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  (wrap as HTMLElement & { __piScrollRestore?: () => void }).__piScrollRestore = () => {
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevBodyOverflow;
  };

  let page = 0;
  let q = '';
  let sort: Sort = 'recent';
  let orientation: Orientation = 'any';
  let assets: SanityAssetSummary[] = [];
  let focusedIdx = -1;
  let uploadInFlight = false;
  let lastLoadReq = 0;

  const panel = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__panel')!;
  const grid = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__grid')!;
  const search = wrap.querySelector<HTMLInputElement>('.pi-sanity-modal__search')!;
  const fileInput = wrap.querySelector<HTMLInputElement>('.pi-sanity-modal__upload input')!;
  const pageEl = wrap.querySelector<HTMLSpanElement>('.pi-sanity-modal__page')!;

  const onWheel = (e: WheelEvent) => {
    if (!grid.contains(e.target as Node) && !(e.target as HTMLElement | null)?.closest('.pi-sanity-modal__toolbar')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    grid.scrollBy({
      top: e.deltaY,
      left: e.deltaX,
      behavior: 'auto',
    });
  };
  panel.addEventListener('wheel', onWheel, { passive: false });

  const setChipState = (group: 'orient' | 'sort', value: string) => {
    const attr = group === 'orient' ? 'data-orient' : 'data-sort';
    wrap.querySelectorAll<HTMLButtonElement>(`[${attr}]`).forEach((b) => {
      b.setAttribute('aria-pressed', b.getAttribute(attr) === value ? 'true' : 'false');
    });
  };

  const orientLabel = (a: SanityAssetSummary): string =>
    a.dimensions ? `${a.dimensions.width}×${a.dimensions.height}` : '';

  const renderAssets = () => {
    if (assets.length === 0) {
      grid.innerHTML = '<div class="pi-sanity-modal__status">No assets found.</div>';
      return;
    }
    grid.innerHTML = assets
      .map(
        (a, i) => `
      <button type="button" role="option" class="pi-sanity-modal__asset" data-asset-id="${escapeHtml(a._id)}" data-idx="${i}" aria-label="Replace with ${escapeHtml(a.originalFilename || a._id)}" title="${escapeHtml(a.originalFilename || a._id)}">
        <span class="pi-sanity-modal__thumb" style="background-image: url('${cssUrl(a.url)}?w=360&h=225&fit=crop&auto=format')"></span>
        <span class="pi-sanity-modal__meta">
          <span class="pi-sanity-modal__name">${escapeHtml(a.originalFilename || a._id)}</span>
          <span class="pi-sanity-modal__dims">${escapeHtml(orientLabel(a))}</span>
        </span>
      </button>`,
      )
      .join('');
  };

  const loadAssets = async () => {
    const reqId = ++lastLoadReq;
    grid.innerHTML = '<div class="pi-sanity-modal__status">Loading…</div>';
    pageEl.textContent = `Page ${page + 1}`;
    focusedIdx = -1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (q) params.set('q', q);
    if (sort !== 'recent') params.set('sort', sort);
    if (orientation !== 'any') params.set('orientation', orientation);
    try {
      const res = await fetch(`/api/admin/sanity-assets?${params.toString()}`, {
        credentials: 'same-origin',
      });
      if (reqId !== lastLoadReq) return;
      const body = await res.json();
      if (!res.ok || !body.ok) {
        renderError(grid, res.status, body?.error || 'Failed to load', () => void loadAssets());
        return;
      }
      assets = (body.data?.assets ?? []) as SanityAssetSummary[];
      renderAssets();
    } catch (err) {
      if (reqId !== lastLoadReq) return;
      renderError(grid, 0, (err as Error).message, () => void loadAssets());
    }
  };

  const doPatch = async (assetId: string): Promise<{ ok: boolean; newUrl?: string; previousAssetRef?: string; status?: number; error?: string }> => {
    const payload: Record<string, string> = {
      fieldPath: opts.source.fieldPath,
      newAssetRef: assetId,
    };
    if (opts.source.docId) payload.docId = opts.source.docId;
    if (opts.source.entityType) payload.entityType = opts.source.entityType;
    if (opts.source.entitySlug) payload.entitySlug = opts.source.entitySlug;
    const res = await fetch('/api/admin/sanity-patch', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) return { ok: false, status: res.status, error: body?.error };
    return {
      ok: true,
      newUrl: body.data?.newUrl,
      previousAssetRef: body.data?.previousAssetRef,
    };
  };

  const onPick = async (assetId: string) => {
    opts.toast('Patching…', 'info');
    try {
      const result = await doPatch(assetId);
      if (!result.ok) {
        handleApiError(result.status ?? 0, result.error, opts.toast, () => void onPick(assetId));
        return;
      }
      const previousVisibleSrc = currentVisibleSrc;
      if (result.newUrl) {
        const bust = result.newUrl.includes('?')
          ? `${result.newUrl}&v=${Date.now()}`
          : `${result.newUrl}?v=${Date.now()}`;
        opts.setImageSrc(opts.el, bust);
        currentVisibleSrc = bust;
      }
      closeMediaLibraryModal();
      opts.onClose();
      if (result.previousAssetRef) {
        const prevRef = result.previousAssetRef;
        showUndoToast(async () => {
          opts.toast('Undoing…', 'info');
          const undo = await doPatch(prevRef);
          if (!undo.ok) {
            opts.toast(`Undo failed: ${undo.error || 'request failed'}`, 'err');
            return;
          }
          if (previousVisibleSrc) opts.setImageSrc(opts.el, previousVisibleSrc);
          opts.toast('Reverted.', 'ok');
        });
      } else {
        opts.toast('Image saved — site rebuilding. Live in ~4 minutes.', 'ok');
      }
    } catch (err) {
      opts.toast(`Save failed: ${(err as Error).message}`, 'err');
    }
  };

  const onUpload = async (file: File) => {
    if (uploadInFlight) return;
    uploadInFlight = true;
    opts.toast(`Uploading "${file.name}"…`, 'info');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/sanity-asset-upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        handleApiError(res.status, body?.error || 'Upload failed', opts.toast, () => void onUpload(file));
        return;
      }
      const assetId = body.data?._id as string | undefined;
      if (!assetId) {
        opts.toast('Upload returned no asset id.', 'err');
        return;
      }
      await onPick(assetId);
    } catch (err) {
      opts.toast(`Upload failed: ${(err as Error).message}`, 'err');
    } finally {
      uploadInFlight = false;
    }
  };

  // ── Click event delegation ─────────────────────────────────────────────
  wrap.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-close="1"]')) {
      closeMediaLibraryModal();
      opts.onClose();
      return;
    }
    const retry = target.closest<HTMLElement>('[data-retry="1"]');
    if (retry) {
      const fn = (retry as HTMLElement & { __piRetry?: () => void }).__piRetry;
      if (fn) fn();
      return;
    }
    const asset = target.closest<HTMLElement>('[data-asset-id]');
    if (asset) {
      const id = asset.dataset.assetId;
      if (id) void onPick(id);
      return;
    }
    const orient = target.closest<HTMLElement>('[data-orient]');
    if (orient) {
      orientation = (orient.dataset.orient || 'any') as Orientation;
      setChipState('orient', orientation);
      page = 0;
      void loadAssets();
      return;
    }
    const sortBtn = target.closest<HTMLElement>('[data-sort]');
    if (sortBtn) {
      sort = (sortBtn.dataset.sort || 'recent') as Sort;
      setChipState('sort', sort);
      page = 0;
      void loadAssets();
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'prev' && page > 0) {
      page -= 1;
      void loadAssets();
    } else if (action === 'next') {
      page += 1;
      void loadAssets();
    }
  });

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  search.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      q = search.value.trim();
      page = 0;
      void loadAssets();
    }, 250);
  });

  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) void onUpload(f);
  });

  // ── Drag-and-drop upload ───────────────────────────────────────────────
  let dragDepth = 0;
  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragDepth += 1;
    wrap.classList.add('pi-sanity-modal--drag');
  };
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) wrap.classList.remove('pi-sanity-modal--drag');
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth = 0;
    wrap.classList.remove('pi-sanity-modal--drag');
    const f = e.dataTransfer?.files?.[0];
    if (f && /^image\//.test(f.type)) void onUpload(f);
    else if (f) opts.toast('Only image files are accepted.', 'err');
  };
  wrap.addEventListener('dragenter', onDragEnter);
  wrap.addEventListener('dragover', onDragOver);
  wrap.addEventListener('dragleave', onDragLeave);
  wrap.addEventListener('drop', onDrop);

  // ── Keyboard nav, Esc, focus trap, arrow keys ──────────────────────────
  const focusableSel =
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const onKey = (e: KeyboardEvent) => {
    if (!activeModal) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMediaLibraryModal();
      opts.onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSel)).filter(
        (n) => n.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    const inGrid = grid.contains(document.activeElement) || document.activeElement === grid;
    if (!inGrid || assets.length === 0) return;
    const cols = Math.max(1, Math.floor(grid.clientWidth / 200));
    let next = focusedIdx;
    if (e.key === 'ArrowRight') next = Math.min(assets.length - 1, focusedIdx + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, focusedIdx - 1);
    else if (e.key === 'ArrowDown') next = Math.min(assets.length - 1, focusedIdx + cols);
    else if (e.key === 'ArrowUp') next = Math.max(0, focusedIdx - cols);
    else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      const a = assets[focusedIdx];
      if (a) void onPick(a._id);
      return;
    } else {
      return;
    }
    if (next !== focusedIdx) {
      e.preventDefault();
      focusedIdx = next < 0 ? 0 : next;
      const target = grid.querySelector<HTMLElement>(`[data-idx="${focusedIdx}"]`);
      target?.focus();
    }
  };
  document.addEventListener('keydown', onKey);

  activeModalCleanup = () => {
    document.removeEventListener('keydown', onKey);
    panel.removeEventListener('wheel', onWheel);
  };

  void loadAssets();
  setTimeout(() => search.focus(), 0);
}

export function closeMediaLibraryModal(): void {
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
  if (activeModal) {
    const restore = (activeModal as HTMLElement & { __piScrollRestore?: () => void }).__piScrollRestore;
    if (restore) restore();
    activeModal.remove();
    activeModal = null;
    document.dispatchEvent(new CustomEvent('pi:lenis-start'));
  }
}

// ── Error handling ───────────────────────────────────────────────────────

function handleApiError(status: number, error: string | undefined, toast: ToastFn, retry: () => void) {
  if (status === 401) {
    toast('Session expired — re-login required.', 'err');
    showStickyBanner('Session expired.', 'Re-login', '/admin/login/');
    return;
  }
  toast(`${error || 'Request failed'}`, 'err');
  showStickyBanner(`Error: ${error || 'Request failed'}`, 'Try again', null, retry);
}

function renderError(host: HTMLElement, status: number, msg: string, retry: () => void) {
  const sessionExpired = status === 401;
  host.innerHTML = `
    <div class="pi-sanity-modal__status pi-sanity-modal__status--err">
      <div>${sessionExpired ? 'Session expired — please re-login.' : escapeHtml(msg)}</div>
      <div class="pi-sanity-modal__err-actions">
        ${sessionExpired
          ? `<a class="pi-sanity-modal__btn" href="/admin/login/">Re-login</a>`
          : `<button type="button" class="pi-sanity-modal__btn" data-retry="1">Try again</button>`}
      </div>
    </div>
  `;
  if (!sessionExpired) {
    const btn = host.querySelector<HTMLElement>('[data-retry="1"]');
    if (btn) (btn as HTMLElement & { __piRetry?: () => void }).__piRetry = retry;
  }
}

// ── Sticky banner (undo + retry) ─────────────────────────────────────────

let stickyBannerEl: HTMLDivElement | null = null;
let stickyBannerTimer: ReturnType<typeof setTimeout> | null = null;

function showUndoToast(onUndo: () => void) {
  showStickyBanner('Image saved — site rebuilding. Live in ~4 minutes.', 'Undo (5s)', null, onUndo, 5000);
}

function showStickyBanner(
  label: string,
  actionLabel: string,
  href: string | null,
  onAction?: () => void,
  ttlMs = 6000,
) {
  if (stickyBannerEl) {
    stickyBannerEl.remove();
    stickyBannerEl = null;
  }
  if (stickyBannerTimer) {
    clearTimeout(stickyBannerTimer);
    stickyBannerTimer = null;
  }
  const el = document.createElement('div');
  el.className = 'pi-sanity-banner';
  el.innerHTML = `
    <span class="pi-sanity-banner__msg">${escapeHtml(label)}</span>
    ${href
      ? `<a class="pi-sanity-banner__btn" href="${escapeHtml(href)}">${escapeHtml(actionLabel)}</a>`
      : `<button type="button" class="pi-sanity-banner__btn" data-banner-action="1">${escapeHtml(actionLabel)}</button>`}
    <button type="button" class="pi-sanity-banner__close" aria-label="Dismiss">×</button>
  `;
  document.body.appendChild(el);
  stickyBannerEl = el;
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-banner-action="1"]')) {
      onAction?.();
      el.remove();
      if (stickyBannerEl === el) stickyBannerEl = null;
    } else if (t.closest('.pi-sanity-banner__close')) {
      el.remove();
      if (stickyBannerEl === el) stickyBannerEl = null;
    }
  });
  stickyBannerTimer = setTimeout(() => {
    el.remove();
    if (stickyBannerEl === el) stickyBannerEl = null;
  }, ttlMs);
}

// ─── Tiny utils (duplicated here to keep this module self-contained when
//      it's dynamically imported — saves us from pulling client.ts in).

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c],
  );
}

function cssUrl(src: string): string {
  return String(src).replace(/['")\\]/g, (m) => `\\${m}`);
}
