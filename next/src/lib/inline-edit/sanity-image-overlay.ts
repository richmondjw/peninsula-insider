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

export function openMediaLibraryModal(opts: ModalOpts): void {
  closeMediaLibraryModal();

  const wrap = document.createElement('div');
  wrap.className = 'pi-sanity-modal';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Replace from Sanity media library');
  wrap.innerHTML = `
    <div class="pi-sanity-modal__backdrop" data-close="1"></div>
    <div class="pi-sanity-modal__panel">
      <div class="pi-sanity-modal__head">
        <div>
          <div class="pi-sanity-modal__title">Replace from media library</div>
          <div class="pi-sanity-modal__sub">${
            opts.source.resolvedVia === 'stega'
              ? `Source: stega — doc ${escapeHtml(opts.source.docId ?? '')}, field ${escapeHtml(opts.source.fieldPath)}`
              : `Source: ${escapeHtml(opts.source.entityType ?? '')}/${escapeHtml(opts.source.entitySlug ?? '')}, field ${escapeHtml(opts.source.fieldPath)}`
          }</div>
        </div>
        <button type="button" class="pi-sanity-modal__close" data-close="1" aria-label="Close">×</button>
      </div>
      <div class="pi-sanity-modal__toolbar">
        <input type="search" class="pi-sanity-modal__search" placeholder="Search assets by filename…" />
        <label class="pi-sanity-modal__upload">
          <span>Upload new…</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden />
        </label>
      </div>
      <div class="pi-sanity-modal__grid" role="listbox" aria-label="Assets">
        <div class="pi-sanity-modal__status">Loading…</div>
      </div>
      <div class="pi-sanity-modal__foot">
        <button type="button" class="pi-sanity-modal__btn" data-action="prev">‹ Prev</button>
        <span class="pi-sanity-modal__page">Page 1</span>
        <button type="button" class="pi-sanity-modal__btn" data-action="next">Next ›</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  activeModal = wrap;

  let page = 0;
  let q = '';

  const grid = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__grid')!;
  const search = wrap.querySelector<HTMLInputElement>('.pi-sanity-modal__search')!;
  const fileInput = wrap.querySelector<HTMLInputElement>('.pi-sanity-modal__upload input')!;
  const pageEl = wrap.querySelector<HTMLSpanElement>('.pi-sanity-modal__page')!;

  const loadAssets = async () => {
    grid.innerHTML = '<div class="pi-sanity-modal__status">Loading…</div>';
    pageEl.textContent = `Page ${page + 1}`;
    try {
      const url = `/api/admin/sanity-assets?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url, { credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        grid.innerHTML = `<div class="pi-sanity-modal__status pi-sanity-modal__status--err">${escapeHtml(body.error || 'Failed to load')}</div>`;
        return;
      }
      const assets: SanityAssetSummary[] = body.data?.assets ?? [];
      if (assets.length === 0) {
        grid.innerHTML = '<div class="pi-sanity-modal__status">No assets found.</div>';
        return;
      }
      grid.innerHTML = assets
        .map(
          (a) => `
        <button type="button" class="pi-sanity-modal__asset" data-asset-id="${escapeHtml(a._id)}" title="${escapeHtml(a.originalFilename || a._id)}">
          <span class="pi-sanity-modal__thumb" style="background-image: url('${cssUrl(a.url)}?w=320&h=200&fit=crop&auto=format')"></span>
          <span class="pi-sanity-modal__name">${escapeHtml(a.originalFilename || a._id)}</span>
        </button>`,
        )
        .join('');
    } catch (err) {
      grid.innerHTML = `<div class="pi-sanity-modal__status pi-sanity-modal__status--err">${escapeHtml((err as Error).message)}</div>`;
    }
  };

  const onPick = async (assetId: string) => {
    opts.toast('Patching…', 'info');
    try {
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
      if (!res.ok || !body.ok) {
        opts.toast(`Save failed: ${body.error || res.statusText}`, 'err');
        return;
      }
      // Cache-bust so the visible swap is immediate even if the asset URL is
      // already in browser cache. NOTE: this updates `src` only — responsive
      // `srcset` regeneration is a follow-up; for now the picture element's
      // other sources stay on the previous asset until next deploy.
      const newUrl = body.data?.newUrl as string | undefined;
      if (newUrl) {
        const bust = newUrl.includes('?') ? `${newUrl}&v=${Date.now()}` : `${newUrl}?v=${Date.now()}`;
        opts.setImageSrc(opts.el, bust);
      }
      opts.toast('Replaced from Sanity.', 'ok');
      closeMediaLibraryModal();
      opts.onClose();
    } catch (err) {
      opts.toast(`Save failed: ${(err as Error).message}`, 'err');
    }
  };

  const onUpload = async (file: File) => {
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
        opts.toast(`Upload failed: ${body.error || res.statusText}`, 'err');
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
    }
  };

  // Wire events.
  wrap.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-close="1"]')) {
      closeMediaLibraryModal();
      opts.onClose();
      return;
    }
    const asset = target.closest<HTMLElement>('[data-asset-id]');
    if (asset) {
      const id = asset.dataset.assetId;
      if (id) void onPick(id);
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

  document.addEventListener('keydown', onModalKeyDown);

  void loadAssets();
}

export function closeMediaLibraryModal(): void {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
  document.removeEventListener('keydown', onModalKeyDown);
}

function onModalKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMediaLibraryModal();
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
