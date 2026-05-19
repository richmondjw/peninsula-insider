/**
 * Sanity "Bind on the spot" modal.
 *
 * Lazy-loaded from the inline editor when an admin right-clicks an image
 * that has no existing Sanity binding. Lets the editor:
 *
 *   1. Search Sanity docs by title/name/slug.
 *   2. Pick one of the doc's image-typed fields.
 *   3. Save a binding row in pi.image_bindings, keyed by URL path +
 *      image filename basename.
 *
 * On success, the inline editor re-fetches bindings so the next
 * right-click on the same image goes straight to Replace-from-media.
 *
 * Reuses .pi-sanity-modal class skeleton (sanity-image-overlay) for
 * consistent chrome. Bind-specific styles namespaced under
 * .pi-sanity-modal--bind.
 */

export interface BindModalOpts {
  imageBasename: string;
  pageUrlPattern: string;
  toast: (msg: string, tone?: 'ok' | 'err' | 'info') => void;
  onBound: (binding: BindingRow) => void;
  onClose: () => void;
}

export interface BindingRow {
  id: string;
  page_url_pattern: string;
  image_basename: string;
  sanity_doc_id: string;
  sanity_doc_type: string;
  sanity_field_path: string;
}

interface DocHit {
  _id: string;
  _type: string;
  title: string;
  slug?: string | null;
}

interface FieldOption {
  path: string;
  label: string;
}

let activeWrap: HTMLDivElement | null = null;
let activeCleanup: (() => void) | null = null;

export function openBindModal(opts: BindModalOpts): void {
  closeBindModal();

  const wrap = document.createElement('div');
  wrap.className = 'pi-sanity-modal pi-sanity-modal--bind';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'pi-bind-modal-title');
  wrap.innerHTML = `
    <div class="pi-sanity-modal__backdrop" data-close="1"></div>
    <div class="pi-sanity-modal__panel" tabindex="-1">
      <div class="pi-sanity-modal__head">
        <div class="pi-sanity-modal__head-main">
          <div>
            <div class="pi-sanity-modal__title" id="pi-bind-modal-title">Bind this image to a Sanity doc</div>
            <div class="pi-sanity-modal__sub">
              <strong>${esc(opts.imageBasename)}</strong> on <code>${esc(opts.pageUrlPattern)}</code>
            </div>
          </div>
        </div>
        <button type="button" class="pi-sanity-modal__close" data-close="1" aria-label="Close">&times;</button>
      </div>

      <div class="pi-sanity-modal__bind-body">
        <section class="pi-sanity-modal__bind-step" data-step="1">
          <label class="pi-sanity-modal__bind-label">1. Pick the Sanity doc</label>
          <input
            type="search"
            class="pi-sanity-modal__search"
            placeholder="Search by title, name, or slug…"
            aria-label="Search Sanity docs"
            autocomplete="off"
            spellcheck="false"
          />
          <div class="pi-sanity-modal__bind-results" role="listbox" aria-label="Sanity docs">
            <div class="pi-sanity-modal__status">Type to search.</div>
          </div>
        </section>

        <section class="pi-sanity-modal__bind-step" data-step="2" hidden>
          <label class="pi-sanity-modal__bind-label">2. Pick the field</label>
          <div class="pi-sanity-modal__bind-picked"></div>
          <div class="pi-sanity-modal__bind-fields">
            <div class="pi-sanity-modal__status">Loading fields&hellip;</div>
          </div>
        </section>
      </div>

      <div class="pi-sanity-modal__foot">
        <button type="button" class="pi-sanity-modal__btn" data-action="back" hidden>&lsaquo; Back</button>
        <span class="pi-sanity-modal__page" data-role="status"></span>
        <button type="button" class="pi-sanity-modal__btn" data-close="1">Cancel</button>
        <button type="button" class="pi-sanity-modal__btn pi-sanity-modal__btn--primary" data-action="save" disabled>Save binding</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  activeWrap = wrap;

  const panel = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__panel')!;
  const search = wrap.querySelector<HTMLInputElement>('.pi-sanity-modal__search')!;
  const resultsBox = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__bind-results')!;
  const step1 = wrap.querySelector<HTMLElement>('[data-step="1"]')!;
  const step2 = wrap.querySelector<HTMLElement>('[data-step="2"]')!;
  const fieldsBox = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__bind-fields')!;
  const pickedBox = wrap.querySelector<HTMLDivElement>('.pi-sanity-modal__bind-picked')!;
  const saveBtn = wrap.querySelector<HTMLButtonElement>('[data-action="save"]')!;
  const backBtn = wrap.querySelector<HTMLButtonElement>('[data-action="back"]')!;
  const statusEl = wrap.querySelector<HTMLSpanElement>('[data-role="status"]')!;

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchReq = 0;
  let pickedDoc: DocHit | null = null;
  let pickedField: FieldOption | null = null;

  const setStatus = (msg: string) => { statusEl.textContent = msg; };

  const renderDocs = (docs: DocHit[]) => {
    if (docs.length === 0) {
      resultsBox.innerHTML = '<div class="pi-sanity-modal__status">No matches.</div>';
      return;
    }
    resultsBox.innerHTML = docs
      .map(
        (d) => `
        <button type="button" role="option" class="pi-sanity-modal__bind-doc" data-doc-id="${esc(d._id)}" data-doc-type="${esc(d._type)}" data-doc-title="${esc(d.title)}">
          <span class="pi-sanity-modal__bind-doc-title">${esc(d.title)}</span>
          <span class="pi-sanity-modal__bind-doc-meta">${esc(d._type)}${d.slug ? ` &middot; /${esc(d.slug)}/` : ''}</span>
        </button>`,
      )
      .join('');
  };

  const runSearch = async (q: string) => {
    const reqId = ++searchReq;
    if (!q) {
      resultsBox.innerHTML = '<div class="pi-sanity-modal__status">Type to search.</div>';
      return;
    }
    resultsBox.innerHTML = '<div class="pi-sanity-modal__status">Searching&hellip;</div>';
    try {
      const res = await fetch(`/api/admin/sanity-docs-search?q=${encodeURIComponent(q)}`, {
        credentials: 'same-origin',
      });
      if (reqId !== searchReq) return;
      const body = await res.json();
      if (!res.ok || !body.ok) {
        resultsBox.innerHTML = `<div class="pi-sanity-modal__status">Search failed: ${esc(body?.error || res.statusText)}</div>`;
        return;
      }
      renderDocs((body.data?.docs ?? []) as DocHit[]);
    } catch (err) {
      if (reqId !== searchReq) return;
      resultsBox.innerHTML = `<div class="pi-sanity-modal__status">Search failed: ${esc((err as Error).message)}</div>`;
    }
  };

  const renderFields = (fields: FieldOption[]) => {
    if (fields.length === 0) {
      fieldsBox.innerHTML =
        '<div class="pi-sanity-modal__status">This doc has no image-typed fields yet. Pick another doc, or add an image field in Sanity first.</div>';
      return;
    }
    fieldsBox.innerHTML = fields
      .map(
        (f) => `
        <label class="pi-sanity-modal__bind-field">
          <input type="radio" name="pi-bind-field" value="${esc(f.path)}" data-label="${esc(f.label)}" />
          <span class="pi-sanity-modal__bind-field-label">${esc(f.label)}</span>
          <code class="pi-sanity-modal__bind-field-path">${esc(f.path)}</code>
        </label>`,
      )
      .join('');
  };

  const loadFields = async (doc: DocHit) => {
    pickedBox.innerHTML = `<strong>${esc(doc.title)}</strong> <span class="pi-sanity-modal__bind-doc-meta">${esc(doc._type)}</span>`;
    fieldsBox.innerHTML = '<div class="pi-sanity-modal__status">Loading fields&hellip;</div>';
    try {
      const res = await fetch(`/api/admin/sanity-doc-fields?docId=${encodeURIComponent(doc._id)}`, {
        credentials: 'same-origin',
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        fieldsBox.innerHTML = `<div class="pi-sanity-modal__status">Failed to load fields: ${esc(body?.error || res.statusText)}</div>`;
        return;
      }
      renderFields((body.data?.fields ?? []) as FieldOption[]);
    } catch (err) {
      fieldsBox.innerHTML = `<div class="pi-sanity-modal__status">Failed to load fields: ${esc((err as Error).message)}</div>`;
    }
  };

  const goToStep2 = (doc: DocHit) => {
    pickedDoc = doc;
    pickedField = null;
    saveBtn.disabled = true;
    step1.hidden = true;
    step2.hidden = false;
    backBtn.hidden = false;
    setStatus('Step 2 of 2 — pick a field.');
    void loadFields(doc);
  };

  const goToStep1 = () => {
    pickedDoc = null;
    pickedField = null;
    saveBtn.disabled = true;
    step1.hidden = false;
    step2.hidden = true;
    backBtn.hidden = true;
    setStatus('');
    setTimeout(() => search.focus(), 0);
  };

  const doSave = async () => {
    if (!pickedDoc || !pickedField) return;
    saveBtn.disabled = true;
    setStatus('Saving binding&hellip;');
    try {
      const res = await fetch('/api/admin/image-binding', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pageUrlPattern: opts.pageUrlPattern,
          imageBasename: opts.imageBasename,
          sanityDocId: pickedDoc._id,
          sanityDocType: pickedDoc._type,
          sanityFieldPath: pickedField.path,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setStatus(`Save failed: ${body?.error || res.statusText}`);
        opts.toast(`Bind failed: ${body?.error || res.statusText}`, 'err');
        saveBtn.disabled = false;
        return;
      }
      const binding = body.data?.binding as BindingRow | undefined;
      opts.toast('Bound. Right-click again to replace.', 'ok');
      closeBindModal();
      opts.onClose();
      if (binding) opts.onBound(binding);
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`);
      opts.toast(`Bind failed: ${(err as Error).message}`, 'err');
      saveBtn.disabled = false;
    }
  };

  wrap.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-close="1"]')) {
      closeBindModal();
      opts.onClose();
      return;
    }
    if (target.closest('[data-action="back"]')) { goToStep1(); return; }
    if (target.closest('[data-action="save"]')) { void doSave(); return; }
    const doc = target.closest<HTMLElement>('[data-doc-id]');
    if (doc) {
      goToStep2({
        _id: doc.dataset.docId!,
        _type: doc.dataset.docType!,
        title: doc.dataset.docTitle!,
      });
    }
  });

  fieldsBox.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | null;
    if (!t || t.name !== 'pi-bind-field') return;
    pickedField = { path: t.value, label: t.dataset.label || t.value };
    saveBtn.disabled = !(pickedDoc && pickedField);
  });

  search.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void runSearch(search.value.trim()), 200);
  });

  const onKey = (e: KeyboardEvent) => {
    if (!activeWrap) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeBindModal();
      opts.onClose();
    }
  };
  document.addEventListener('keydown', onKey);
  activeCleanup = () => document.removeEventListener('keydown', onKey);

  setStatus('Step 1 of 2 — search for a doc.');
  setTimeout(() => {
    panel.focus();
    search.focus();
  }, 0);
}

export function closeBindModal(): void {
  if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  if (activeWrap) { activeWrap.remove(); activeWrap = null; }
}

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c],
  );
}
