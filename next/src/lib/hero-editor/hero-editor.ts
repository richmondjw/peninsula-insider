/**
 * Hero Editor - the single editing surface for the homepage hero carousel,
 * plus the deck hydration that makes saved decks appear for every visitor.
 *
 * Two responsibilities, both client-side, loaded only on the homepage by
 * HeroEditorMount.astro:
 *
 *   1. hydrate() - runs for ALL visitors. Fetches the published "deck"
 *      document (cms_text_fields page/home-hero/'deck'); if it differs from the
 *      server-rendered deck, re-renders the carousel from it. This is why an
 *      edit goes live for everyone immediately (and bakes into static HTML on
 *      the next deploy, after which hydration is a no-op).
 *
 *   2. mountEditor() - runs only for signed-in admins in edit mode. Adds an
 *      "Edit hero" button and a drawer to reorder slides, edit text + link, add
 *      / remove slides, and replace photos. Saving writes the deck document and
 *      re-renders the carousel live.
 *
 * The hero markup, the deck shape, and `window.piHeroInitCarousel(el, force)`
 * all live in HomeHeroCarousel.astro. renderDeck() below reproduces the slide
 * markup exactly, then force-re-inits the carousel.
 *
 * The Supabase client (supabase-js) is imported LAZILY, only inside the admin
 * save/upload paths, so anonymous visitors pull none of it - hydration uses a
 * plain anon-key fetch.
 */

const ENTITY_TYPE = 'page';
const ENTITY_SLUG = 'home-hero';
const FIELD = 'deck';
const STORAGE_BUCKET = 'cms-assets';
const SB_URL =
  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||
  'https://tjjhpvslpysfklwpqmgz.supabase.co';
const SB_ANON = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) || '';

export interface Slide {
  id: string;
  image: string;
  imageAlt: string;
  label: string;
  hours: string;
  headline: string;
  dispatch: string;
  primaryHref: string;
  primaryLabel: string;
  scrim?: number;
}

// ── escaping ────────────────────────────────────────────────────────────────
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(s: unknown): string {
  return esc(s).replace(/"/g, '&quot;');
}
function stripTags(s: unknown): string {
  return String(s ?? '').replace(/<[^>]+>/g, '');
}

// ── markup (must match HomeHeroCarousel.astro) ──────────────────────────────
function slideHTML(s: Slide, i: number): string {
  const active = i === 0 ? ' is-active' : '';
  const scrim = s.scrim != null && !Number.isNaN(Number(s.scrim)) ? ` style="--scrim: ${Number(s.scrim)}"` : '';
  const tag = i === 0 ? 'h1' : 'p';
  const arrow =
    '<svg viewBox="0 0 16 12" width="15" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 6h13M10 1.5 14.5 6 10 10.5" /></svg>';
  return (
    `<div class="cover__slide${active}" data-slide-index="${i}" data-slide-id="${escAttr(s.id)}"${scrim}>` +
    `<figure class="cover__media"><img src="${escAttr(s.image)}" alt="${escAttr(s.imageAlt)}" loading="${i === 0 ? 'eager' : 'lazy'}"${i === 0 ? ' fetchpriority="high"' : ''} /></figure>` +
    `<div class="cover__scrim" aria-hidden="true"></div>` +
    `<div class="container cover__overlay">` +
    `<p class="cover__meta"><span class="cover__chip">${esc(s.label)}</span><span class="cover__dot" aria-hidden="true">·</span><span class="cover__hours">${esc(s.hours)}</span></p>` +
    `<a href="${escAttr(s.primaryHref)}" class="cover__headline-link"><${tag} class="cover__headline">${s.headline}</${tag}></a>` +
    `<p class="cover__dispatch">${esc(s.dispatch)}</p>` +
    `<a href="${escAttr(s.primaryHref)}" class="cover__cta">${esc(s.primaryLabel)}${arrow}</a>` +
    `</div></div>`
  );
}

function controlsHTML(deck: Slide[]): string {
  const prevArrow =
    '<svg viewBox="0 0 10 16" width="9" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 2 8l6 6.5" /></svg>';
  const nextArrow =
    '<svg viewBox="0 0 10 16" width="9" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 1.5 8 8l-6 6.5" /></svg>';
  const dashes = deck
    .map(
      (s, i) =>
        `<button class="cover__nav-btn${i === 0 ? ' is-active' : ''}" data-target="${i}" type="button" aria-label="Story ${i + 1} of ${deck.length}: ${escAttr(stripTags(s.headline))}"><span class="cover__nav-bar" aria-hidden="true"></span></button>`,
    )
    .join('');
  return (
    `<button class="cover__arrow" type="button" data-cover-prev aria-label="Previous story">${prevArrow}</button>` +
    `<nav class="cover__nav" aria-label="Switch story">${dashes}</nav>` +
    `<button class="cover__arrow" type="button" data-cover-next aria-label="Next story">${nextArrow}</button>`
  );
}

// ── deck I/O ────────────────────────────────────────────────────────────────
function readEmbeddedDeck(): Slide[] | null {
  const node = document.querySelector('[data-pi-hero-deck]');
  if (!node || !node.textContent) return null;
  try {
    const d = JSON.parse(node.textContent);
    return Array.isArray(d) && d.length ? (d as Slide[]) : null;
  } catch {
    return null;
  }
}
function writeEmbeddedDeck(deck: Slide[]): void {
  const node = document.querySelector('[data-pi-hero-deck]');
  if (node) node.textContent = JSON.stringify(deck);
}

function renderDeck(deck: Slide[]): void {
  const carousel = document.getElementById('cover-carousel');
  const controls = document.querySelector('.cover__controls');
  if (!carousel || !controls) return;
  carousel.innerHTML = deck.map((s, i) => slideHTML(s, i)).join('');
  controls.innerHTML = controlsHTML(deck);
  writeEmbeddedDeck(deck);
  carousel.dataset.carouselReady = '';
  const init = (window as unknown as { piHeroInitCarousel?: (el: HTMLElement, force: boolean) => void })
    .piHeroInitCarousel;
  if (typeof init === 'function') init(carousel as HTMLElement, true);
}

async function fetchPublishedDeck(): Promise<Slide[] | null> {
  if (!SB_ANON) return null;
  try {
    const url = new URL('/rest/v1/cms_text_fields', SB_URL);
    url.searchParams.set('select', 'value');
    url.searchParams.set('entity_type', `eq.${ENTITY_TYPE}`);
    url.searchParams.set('entity_slug', `eq.${ENTITY_SLUG}`);
    url.searchParams.set('field_path', `eq.${FIELD}`);
    url.searchParams.set('status', 'eq.published');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, 'Accept-Profile': 'pi' },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length || !rows[0].value) return null;
    const d = JSON.parse(rows[0].value);
    return Array.isArray(d) && d.length ? (d as Slide[]) : null;
  } catch {
    return null;
  }
}

/** All visitors: apply the published deck if it differs from the SSR deck. */
export async function hydrate(): Promise<void> {
  const ssr = readEmbeddedDeck();
  const pub = await fetchPublishedDeck();
  if (!pub) return;
  if (ssr && JSON.stringify(ssr) === JSON.stringify(pub)) return;
  renderDeck(pub);
}

// ── editor ──────────────────────────────────────────────────────────────────
const FIELDS: Array<{ key: keyof Slide; label: string; type: 'text' | 'multiline' }> = [
  { key: 'label', label: 'Tag', type: 'text' },
  { key: 'hours', label: 'Read time', type: 'text' },
  { key: 'headline', label: 'Headline (use <em>…</em> for the italic accent)', type: 'multiline' },
  { key: 'dispatch', label: 'Standfirst', type: 'multiline' },
  { key: 'primaryHref', label: 'Link URL', type: 'text' },
  { key: 'primaryLabel', label: 'Button label', type: 'text' },
];

function newId(): string {
  return 's' + Date.now().toString(36) + Math.floor(performance.now()).toString(36);
}

function blankSlide(seedImage: string): Slide {
  return {
    id: newId(),
    image: seedImage,
    imageAlt: '',
    label: 'FEATURE',
    hours: '5 MIN READ',
    headline: 'New slide headline.',
    dispatch: 'Add a standfirst for this slide.',
    primaryHref: '/',
    primaryLabel: 'Read',
  };
}

let drawerOpen = false;
const pendingFiles = new Map<string, File>(); // slide id → file to upload on save

async function uploadImage(slideId: string, file: File): Promise<string> {
  const { getSupabase } = await import('../auth');
  const supa = getSupabase();
  if (!supa) throw new Error('Not signed in.');
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const ts = Date.now();
  const safeId = slideId.replace(/[^a-z0-9-]/gi, '-');
  const storagePath = `${ENTITY_TYPE}/${ENTITY_SLUG}/slide-${safeId}-${ts}.${ext}`;
  const { error: upErr } = await supa.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type || `image/${ext}`, cacheControl: '31536000' });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const { data } = supa.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function saveDeck(deck: Slide[]): Promise<void> {
  const { getSupabase } = await import('../auth');
  const supa = getSupabase();
  if (!supa) throw new Error('Not signed in.');
  const { data: sess } = await supa.auth.getSession();
  const userId = sess.session?.user?.id ?? null;
  const row = {
    entity_type: ENTITY_TYPE,
    entity_slug: ENTITY_SLUG,
    field_path: FIELD,
    label: 'Hero carousel deck',
    field_kind: 'text',
    value: JSON.stringify(deck),
    status: 'published',
    updated_by: userId,
  };
  const { data: existing } = await supa
    .from('cms_text_fields')
    .select('id')
    .eq('entity_type', ENTITY_TYPE)
    .eq('entity_slug', ENTITY_SLUG)
    .eq('field_path', FIELD)
    .is('locale', null)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await supa.from('cms_text_fields').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supa.from('cms_text_fields').insert(row);
    if (error) throw new Error(error.message);
  }
}

function buildSlideCard(slide: Slide, index: number, total: number, working: Slide[], rerender: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'pi-hero-ed__card';

  const head = document.createElement('div');
  head.className = 'pi-hero-ed__card-head';
  head.innerHTML =
    `<span class="pi-hero-ed__num">${index + 1}</span>` +
    `<div class="pi-hero-ed__order">` +
    `<button type="button" class="pi-hero-ed__icon" data-act="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>` +
    `<button type="button" class="pi-hero-ed__icon" data-act="down" ${index === total - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>` +
    `</div>` +
    `<button type="button" class="pi-hero-ed__icon pi-hero-ed__icon--danger" data-act="del" aria-label="Delete slide">✕</button>`;
  card.appendChild(head);

  // thumbnail + replace
  const media = document.createElement('div');
  media.className = 'pi-hero-ed__media';
  const thumb = document.createElement('div');
  thumb.className = 'pi-hero-ed__thumb';
  thumb.style.backgroundImage = `url("${slide.image.replace(/"/g, '\\"')}")`;
  const fileBtn = document.createElement('label');
  fileBtn.className = 'pi-hero-ed__replace';
  fileBtn.innerHTML = '⇪ Replace photo<input type="file" accept="image/*" hidden />';
  const fileInput = fileBtn.querySelector('input') as HTMLInputElement;
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    pendingFiles.set(slide.id, f);
    thumb.style.backgroundImage = `url("${URL.createObjectURL(f)}")`;
    thumb.classList.add('is-pending');
  });
  media.appendChild(thumb);
  media.appendChild(fileBtn);
  card.appendChild(media);

  // alt text
  const altWrap = document.createElement('label');
  altWrap.className = 'pi-hero-ed__field';
  altWrap.innerHTML = '<span>Image alt text</span>';
  const altInput = document.createElement('input');
  altInput.type = 'text';
  altInput.value = slide.imageAlt ?? '';
  altInput.addEventListener('input', () => { slide.imageAlt = altInput.value; });
  altWrap.appendChild(altInput);
  card.appendChild(altWrap);

  // text fields
  for (const f of FIELDS) {
    const wrap = document.createElement('label');
    wrap.className = 'pi-hero-ed__field';
    wrap.innerHTML = `<span>${f.label}</span>`;
    const input = f.type === 'multiline' ? document.createElement('textarea') : document.createElement('input');
    if (input instanceof HTMLInputElement) input.type = 'text';
    input.value = String(slide[f.key] ?? '');
    input.addEventListener('input', () => { (slide as Record<string, unknown>)[f.key] = input.value; });
    wrap.appendChild(input);
    card.appendChild(wrap);
  }

  head.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'up' && index > 0) { [working[index - 1], working[index]] = [working[index], working[index - 1]]; rerender(); }
    if (act === 'down' && index < total - 1) { [working[index + 1], working[index]] = [working[index], working[index + 1]]; rerender(); }
    if (act === 'del') {
      if (working.length <= 1) { alert('Keep at least one slide.'); return; }
      working.splice(index, 1);
      pendingFiles.delete(slide.id);
      rerender();
    }
  });

  return card;
}

function openDrawer(): void {
  if (drawerOpen) return;
  drawerOpen = true;
  pendingFiles.clear();

  // Deep-copy the current deck as the working set.
  const base = readEmbeddedDeck() ?? [];
  let working: Slide[] = JSON.parse(JSON.stringify(base));

  const drawer = document.createElement('div');
  drawer.className = 'pi-hero-ed';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Hero editor');

  const body = document.createElement('div');
  body.className = 'pi-hero-ed__list';

  function rerenderList(): void {
    body.innerHTML = '';
    working.forEach((s, i) => body.appendChild(buildSlideCard(s, i, working.length, working, rerenderList)));
  }

  const header = document.createElement('div');
  header.className = 'pi-hero-ed__head';
  header.innerHTML =
    '<strong>Hero editor</strong>' +
    '<button type="button" class="pi-hero-ed__close" aria-label="Close">×</button>';

  const foot = document.createElement('div');
  foot.className = 'pi-hero-ed__foot';
  foot.innerHTML =
    '<button type="button" class="pi-hero-ed__btn pi-hero-ed__btn--add" data-act="add">+ Add slide</button>' +
    '<span class="pi-hero-ed__spacer"></span>' +
    '<button type="button" class="pi-hero-ed__btn pi-hero-ed__btn--ghost" data-act="cancel">Cancel</button>' +
    '<button type="button" class="pi-hero-ed__btn pi-hero-ed__btn--primary" data-act="save">Save &amp; publish</button>';

  const status = document.createElement('p');
  status.className = 'pi-hero-ed__status';

  drawer.appendChild(header);
  drawer.appendChild(body);
  drawer.appendChild(status);
  drawer.appendChild(foot);
  document.body.appendChild(drawer);
  rerenderList();

  function close(): void { drawer.remove(); drawerOpen = false; }

  header.querySelector('.pi-hero-ed__close')?.addEventListener('click', close);

  foot.addEventListener('click', async (e) => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'cancel') { close(); return; }
    if (act === 'add') {
      working.push(blankSlide(working[0]?.image ?? '/images/sourced/home-hero-cover-story.webp'));
      rerenderList();
      return;
    }
    if (act === 'save') {
      const saveBtn = foot.querySelector('[data-act="save"]') as HTMLButtonElement;
      saveBtn.disabled = true;
      status.textContent = 'Saving…';
      try {
        // upload any pending photos, swap their URLs in
        for (const s of working) {
          const f = pendingFiles.get(s.id);
          if (f) {
            status.textContent = `Uploading photo for slide “${stripTags(s.headline).slice(0, 24)}”…`;
            s.image = await uploadImage(s.id, f);
          }
        }
        // normalise scrim to a number or drop it
        for (const s of working) {
          if (s.scrim == null || (s.scrim as unknown as string) === '') delete s.scrim;
          else s.scrim = Number(s.scrim);
        }
        status.textContent = 'Publishing…';
        await saveDeck(working);
        renderDeck(working);
        pendingFiles.clear();
        status.textContent = 'Saved. Live for everyone.';
        setTimeout(close, 900);
      } catch (err) {
        status.textContent = 'Error: ' + (err instanceof Error ? err.message : String(err));
        saveBtn.disabled = false;
      }
    }
  });
}

function mountTrigger(): void {
  if (document.querySelector('.pi-hero-ed-trigger')) return;
  const hero = document.querySelector('[data-pi-hero-managed]');
  if (!hero) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pi-hero-ed-trigger';
  btn.textContent = '✎ Edit hero';
  btn.addEventListener('click', openDrawer);
  document.body.appendChild(btn);
}
function unmountTrigger(): void {
  document.querySelector('.pi-hero-ed-trigger')?.remove();
}

/** Show the trigger only for admins in edit mode (body[data-pi-edit-mode=on],
 *  which client.ts sets only after the admin allowlist check) AND only on a
 *  page that actually renders the hero. */
function syncEditAffordance(): void {
  const hero = document.querySelector('[data-pi-hero-managed]');
  const on = hero && document.body.dataset.piEditMode === 'on';
  if (on) mountTrigger();
  else unmountTrigger();
  if (drawerOpen && !hero) { document.querySelector('.pi-hero-ed')?.remove(); drawerOpen = false; }
}

// ── entry ─────────────────────────────────────────────────────────────────
let booted = false;
export function boot(): void {
  const run = (): void => { void hydrate(); syncEditAffordance(); };
  run();
  if (booted) return; // bind global listeners only once
  booted = true;
  // Re-run on Astro view-transition navigations.
  document.addEventListener('astro:page-load', run);
  // React to edit-mode toggling (client.ts sets body[data-pi-edit-mode]).
  new MutationObserver(syncEditAffordance).observe(document.body, {
    attributes: true,
    attributeFilter: ['data-pi-edit-mode'],
  });
}
