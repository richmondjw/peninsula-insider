/**
 * The empty photo slot on a venue card.
 *
 * A card without an accepted photograph is drawn as an editorial plate. The
 * request for a photograph ("Add photo" and its camera icon) is editor chrome
 * and must never reach a reader. It did: the placeholder's prompt lived in the
 * reader stylesheet, so it showed on every card with no photo, and the
 * reader's slot hydration in BaseLayout painted CMS uploads into those slots
 * without clearing the placeholder, so the prompt sat on top of the photograph
 * (reported 25 November 2026 on the Sorrento, Red Hill and Mornington hubs).
 *
 * Held here, in a real browser over the built site:
 *   1. A reader never sees the prompt: not over a photo, not on an empty card,
 *      on arrival or after a client-side navigation.
 *   2. A slot that takes an upload loses its plate; one that does not keeps it.
 *   3. An editor in edit mode still gets the prompt where a photo is missing,
 *      and can upload through it.
 *
 * Supabase is stubbed by the harness. Nothing is read from or written to a
 * real database. The cards are found in the build rather than named, so the
 * suite follows the corpus instead of breaking when a venue gains a photo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Site, DIST, routesContaining } from './harness.mjs';

/** Venue cards drawn as an empty plate in the built reader pages, by page. */
function platePages() {
  const pages = [];
  const stack = [DIST];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(DIST, full).split(path.sep).join('/');
      if (/^(?:admin|agents|dev|_astro|pagefind)(?:\/|$)/.test(rel)) continue;
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (entry.name !== 'index.html') continue;
      // Every venue card slot on the page, so a venue drawn twice can be left
      // out: the slot under test has to be the only one of its name.
      const drawn = new Map();
      for (const tag of fs.readFileSync(full, 'utf8').match(/<a\b[^>]*\bvenue-card__hero\b[^>]*>/g) ?? []) {
        const slug = tag.match(/data-pi-entity-slug="([^"]+)"/)?.[1];
        if (!slug) continue;
        const seen = drawn.get(slug) ?? { count: 0, plate: false };
        drawn.set(slug, { count: seen.count + 1, plate: seen.plate || /\bvenue-card__hero--placeholder\b/.test(tag) });
      }
      const slugs = [...drawn].filter(([, slot]) => slot.plate && slot.count === 1).map(([slug]) => slug);
      if (slugs.length) pages.push({ route: `/${path.dirname(rel)}/`, slugs });
    }
  }
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

const pages = platePages();
const isHub = (page) => Number(page.route.startsWith('/explore/places/'));
// A place hub by preference, since that is where the defect was reported.
const hub = pages
  .filter((page) => !page.route.startsWith('/stay/') && page.slugs.length >= 3)
  .sort((a, b) => isHub(b) - isHub(a) || b.slugs.length - a.slugs.length)[0];
// Stay pages never take a venue upload in the browser; their plate must hold.
const stay = pages.find((page) => page.route.startsWith('/stay/') && page.slugs.some((slug) => !hub?.slugs.slice(0, 3).includes(slug)));
const staySlug = stay?.slugs.find((slug) => !hub?.slugs.slice(0, 3).includes(slug));
const [eventsRoute] = routesContaining('class="event-card', 1);
const skip = hub ? false : 'this build has no page with three venue cards awaiting a photograph';

const site = await Site.open();
test.after(() => site.close());

const UPLOAD = `${site.origin}/favicon.svg`;
const upload = (slug, details = false) => ({
  entity_type: 'venue', entity_slug: slug, field_path: 'heroImage', public_url: UPLOAD,
  alt_text: details ? 'A described photograph' : null, credit: details ? 'A named photographer' : null,
});
// Rows are applied in order, so the last one being painted means the whole
// pass has run. That is what every assertion below waits on.
const CANARY = { entity_type: 'page', entity_slug: 'harness-canary', field_path: 'canary', public_url: UPLOAD, alt_text: null, credit: null };
const [uncredited, credited, empty] = hub?.slugs ?? [];

/** The reader's one query for every published slot. */
const readerQuery = (rows) => ({ match: 'cms_image_slots?select=entity_type', body: [...rows, CANARY] });
/** The editor's query per entity. */
const editorQueries = (rows) => rows.map((row) => ({ match: `entity_slug=eq.${row.entity_slug}&`, body: [row] }));

// Installed before any page script: a tagged slot the hydration pass paints
// last, replanted on every navigation because the router replaces the body.
function plantCanary() {
  const plant = () => {
    document.querySelectorAll('[data-harness-canary]').forEach((el) => el.remove());
    const el = document.createElement('div');
    el.hidden = true;
    el.setAttribute('data-harness-canary', '');
    el.setAttribute('data-pi-edit', 'image');
    el.dataset.piEntityType = 'page';
    el.dataset.piEntitySlug = 'harness-canary';
    el.dataset.piFieldPath = 'canary';
    document.body.appendChild(el);
  };
  document.addEventListener('DOMContentLoaded', plant);
  document.addEventListener('astro:page-load', plant);
}
const passRan = () => !!document.querySelector('[data-harness-canary]')?.style.backgroundImage.includes('url(');

// Evaluated in the page: every pseudo-element that generates the prompt, by
// its wording or by its camera icon.
function promptsOnPage() {
  const seen = [];
  for (const el of document.querySelectorAll('body *')) {
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(el, pseudo);
      if (style.content === 'none' || style.content === 'normal') continue;
      let image = style.backgroundImage;
      try { image = decodeURIComponent(image); } catch { /* compare as written */ }
      if (/\badd\s+(?:an?\s+)?(?:photo|image)s?\b/i.test(style.content) || image.includes('M23 19a2 2 0 0 1-2 2H3')) {
        seen.push(`${el.className || el.tagName}${pseudo} ${style.content}`);
      }
    }
  }
  return seen;
}

// Evaluated in the page: what one venue card's photo slot is showing.
function slotState(slug) {
  const el = document.querySelector(`a.venue-card__hero[data-pi-entity-slug="${slug}"]`);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return {
    plate: el.classList.contains('venue-card__hero--placeholder'),
    photo: getComputedStyle(el).backgroundImage.includes('url('),
    mark: getComputedStyle(el, '::before').content,
    label: getComputedStyle(el, '::after').content,
    visible: box.width > 0 && box.height > 0,
  };
}
const painted = (slug) => getComputedStyle(document.querySelector(`a.venue-card__hero[data-pi-entity-slug="${slug}"]`)).backgroundImage.includes('url(');

const PLATE = { plate: true, photo: false, mark: '"PI"', label: '"Peninsula Insider"', visible: true };
const PHOTO = { plate: false, photo: true, mark: 'none', label: 'none', visible: true };

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`a logged-out reader never sees the photo prompt at ${viewport.width}px`, { skip }, async () => {
    const rows = [upload(uncredited), upload(credited, true), ...(stay ? [upload(staySlug, true)] : [])];
    const reader = await site.reader({ supabase: [readerQuery(rows)] });
    try {
      await reader.page.setViewport(viewport);
      await reader.page.evaluateOnNewDocument(plantCanary);
      // Arrive cold, then again through the client router.
      for (const arrive of ['load', 'navigate']) {
        if (arrive === 'navigate') await reader.load('/about/');
        await reader[arrive](hub.route);
        await reader.waitFor(passRan, `slot hydration did not run after ${arrive}`);
        assert.deepEqual(await reader.page.evaluate(promptsOnPage), [], `${hub.route} after ${arrive}`);
        // The reported case: an upload in a slot the build drew empty. The
        // photo shows and nothing is drawn over it.
        assert.deepEqual(await reader.page.evaluate(slotState, uncredited), PHOTO, `uploaded photo after ${arrive}`);
        assert.deepEqual(await reader.page.evaluate(slotState, credited), PHOTO, `credited photo after ${arrive}`);
        // No photo at all: the editorial plate, not a request for one.
        assert.deepEqual(await reader.page.evaluate(slotState, empty), PLATE, `empty slot after ${arrive}`);
        assert.equal(await reader.page.$('#pi-inline-editor-styles'), null, 'a reader never loads the editor stylesheet');
        assert.equal(await reader.page.evaluate(() => document.body.dataset.piEditMode ?? null), null);
      }
      if (stay) {
        await reader.load(stay.route);
        await reader.waitFor(passRan, 'slot hydration did not run on the Stay page');
        assert.deepEqual(await reader.page.evaluate(slotState, staySlug), PLATE, `${stay.route} ${staySlug}`);
        assert.deepEqual(await reader.page.evaluate(promptsOnPage), [], stay.route);
      }
      if (eventsRoute) {
        await reader.load(eventsRoute);
        await reader.waitFor(passRan, 'slot hydration did not run on the events page');
        assert.equal(await reader.page.$('[class*="event-card__hero--placeholder"]'), null, 'event cards have no placeholder state');
        assert.deepEqual(await reader.page.evaluate(promptsOnPage), [], eventsRoute);
      }
      assert.deepEqual(await reader.errors(), []);
    } finally { await reader.close(); }
  });
}

test('an editor in edit mode gets the prompt where a photo is missing and can upload through it', { skip }, async () => {
  // The reader's query returns nothing for these venues, so a painted card
  // here is the editor's own pass at work.
  const reader = await site.reader({ signedIn: true, supabase: [
    { match: 'admin_user_allowlist', body: { role: 'editor', can_publish: false } },
    ...editorQueries([upload(uncredited), upload(credited, true)]),
    readerQuery([]),
  ] });
  const setEditMode = async (on) => {
    // A client-side navigation ends in a view transition, and until it has
    // finished the page under it takes no clicks. Wait for the tab itself.
    await reader.waitFor(() => {
      const tab = document.querySelector('.pi-admin-tools__tab');
      const box = tab?.getBoundingClientRect();
      return !!tab && document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) === tab;
    }, 'the admin tab never became clickable');
    if (await reader.page.$eval('.pi-admin-tools__panel', (el) => el.hidden)) await reader.page.click('.pi-admin-tools__tab');
    await reader.page.click('.pi-edit-toggle');
    await reader.waitFor((want) => document.body.dataset.piEditMode === want, `edit mode did not turn ${on ? 'on' : 'off'}`, on ? 'on' : 'off');
  };
  const promptOn = (slug) => reader.page.evaluate((s) => {
    const after = getComputedStyle(document.querySelector(`a.venue-card__hero[data-pi-entity-slug="${s}"]`), '::after');
    return { label: after.content, icon: decodeURIComponent(after.backgroundImage).includes('M23 19a2 2 0 0 1-2 2H3') };
  }, slug);
  const photo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pi-photo-prompt-')), 'dining-room.png');
  fs.writeFileSync(photo, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  try {
    await reader.page.setViewport({ width: 1440, height: 900 });
    await reader.load(hub.route);
    await reader.waitFor(() => !!document.querySelector('.pi-edit-toggle'), 'editor toggle');
    await reader.waitFor(painted, 'the editor pass did not paint the uploaded photo', uncredited);
    // Signed in but not editing: the page reads as it does for a reader.
    assert.deepEqual(await reader.page.evaluate(promptsOnPage), []);
    assert.deepEqual(await reader.page.evaluate(slotState, empty), PLATE);

    await setEditMode(true);
    // Only the slot with no photograph asks for one.
    assert.deepEqual(await promptOn(empty), { label: '"Add photo"', icon: true });
    assert.equal((await reader.page.evaluate(slotState, empty)).plate, true);
    for (const slug of [uncredited, credited]) {
      const shown = await reader.page.evaluate(slotState, slug);
      assert.deepEqual({ plate: shown.plate, photo: shown.photo, label: shown.label }, { plate: false, photo: true, label: 'none' }, slug);
    }
    // Exactly the empty slots carry it; nothing else on the page does.
    const prompts = await reader.page.evaluate(promptsOnPage);
    assert.equal(prompts.length, await reader.page.$$eval('a.venue-card__hero--placeholder', (els) => els.length));
    assert.ok(prompts.every((entry) => entry.includes('venue-card__hero--placeholder::after')), prompts.join('\n'));

    // The prompt is usable: right-click opens the image panel on that slot,
    // and a file chosen there fills it.
    await reader.page.click(`a.venue-card__hero[data-pi-entity-slug="${empty}"]`, { button: 'right' });
    await reader.waitFor(() => !!document.querySelector('.pi-edit-panel [data-action="replace"]'), 'image panel did not open on the empty slot');
    assert.equal(await reader.page.$eval('.pi-edit-panel__label', (el) => el.textContent),
      await reader.page.$eval(`a.venue-card__hero[data-pi-entity-slug="${empty}"]`, (el) => el.dataset.piLabel));
    reader.clearSupabaseCalls();
    const [chooser] = await Promise.all([reader.page.waitForFileChooser(), reader.page.click('.pi-edit-panel [data-action="replace"]')]);
    await chooser.accept([photo]);
    await reader.waitFor(painted, 'the uploaded file did not fill the slot', empty);
    const filled = await reader.page.evaluate(slotState, empty);
    assert.deepEqual({ plate: filled.plate, photo: filled.photo, label: filled.label }, { plate: false, photo: true, label: 'none' });
    const calls = reader.supabaseCalls();
    assert.ok(calls.some((call) => call.method === 'POST' && call.url.includes(`/storage/v1/object/cms-assets/venue/${empty}/heroImage-`)), 'the file went to storage');
    assert.equal(JSON.parse(calls.find((call) => call.method === 'POST' && call.url.includes('/rest/v1/cms_image_slots')).body).entity_slug, empty, 'the slot row was written');

    if (stay) {
      // Edit mode follows the editor across pages. Stay cards do not take
      // uploads, so their plate asks for nothing even here.
      await reader.navigate(stay.route);
      await reader.waitFor(() => document.body.dataset.piEditMode === 'on', 'edit mode did not carry over to the Stay page');
      assert.deepEqual(await reader.page.evaluate(promptsOnPage), [], stay.route);
      assert.equal((await reader.page.evaluate(slotState, staySlug)).label, '"Peninsula Insider"');
      await reader.navigate(hub.route);
      await reader.waitFor(() => document.body.dataset.piEditMode === 'on' && !!document.querySelector('.pi-edit-toggle'), 'edit mode did not carry back to the hub');
      assert.ok((await reader.page.evaluate(promptsOnPage)).length > 0, 'the prompt is back with the page');
    }

    // Leaving edit mode takes every prompt away again.
    await setEditMode(false);
    assert.deepEqual(await reader.page.evaluate(promptsOnPage), []);
    assert.deepEqual(await reader.errors(), []);
  } finally {
    await reader.close();
    fs.rmSync(path.dirname(photo), { recursive: true, force: true });
  }
});
