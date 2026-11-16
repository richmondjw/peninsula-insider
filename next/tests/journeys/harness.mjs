/**
 * PI-012 journey harness.
 *
 * WHAT THIS IS
 * ------------
 * A headless browser driven over the BUILT SITE in `next/dist`, so that the
 * four journeys named in PI-012 - search, saves, trips, planning - are
 * exercised as journeys rather than as the pieces they are made of. The pieces
 * already have unit tests and those tests already pass; what has never been
 * demonstrated is that a reader can complete a journey, including after a
 * client-side navigation.
 *
 * WHY A REAL BROWSER AND NOT JSDOM
 * --------------------------------
 * The defect class this ticket keeps rediscovering is specific to Astro's
 * ClientRouter: it swaps the document without re-evaluating bundled module
 * scripts, while re-executing every `is:inline` script, and `document` and
 * `window` outlive the swap. Reproducing that needs the real router running
 * real ES modules. jsdom does not execute `<script type="module">` at all, so
 * a jsdom harness would run none of the code that carries the defect and
 * would report every journey as healthy. The repo already depends on
 * puppeteer (scripts/render-pdfs.mjs), so this adds no new dependency.
 *
 * WHAT IS STUBBED, AND WHERE
 * --------------------------
 * Exactly two boundaries, both at the network edge, both so the assertions are
 * about the site and not about someone else's uptime:
 *
 *   1. Supabase. Every request to *.supabase.co is answered from a route table
 *      the test controls, so signed-out, signed-in, empty and failing states
 *      are all reachable and deterministic. Nothing is written to any real
 *      database - a PI-012 red line.
 *   2. Pagefind. /pagefind/pagefind.js is served from
 *      tests/journeys/fixtures/pagefind-stub.js rather than from the generated
 *      index, so the search journey can assert on hits, on zero hits and on a
 *      search that throws, without a two-minute index build in CI and without
 *      the result set changing every time the corpus does.
 *
 * Everything else - the HTML, the CSS, the bundled JS, the router - is the
 * real built artefact.
 *
 * NO TIME-DRIVEN ASSERTIONS
 * -------------------------
 * Nothing here hardcodes a date. The stubbed auth session's expiry is computed
 * from Date.now() at run time, so it can never start failing because a date
 * passed with no code change.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEXT_DIR = path.resolve(HERE, '..', '..');
const DIST_DIR = path.join(NEXT_DIR, 'dist');
const PAGEFIND_STUB = path.join(HERE, 'fixtures', 'pagefind-stub.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

export function distExists() {
  return fs.existsSync(path.join(DIST_DIR, 'index.html'));
}

export const DIST = DIST_DIR;

/**
 * Routes in the built site whose HTML contains `marker`. Used instead of
 * hardcoding a slug: which plan carries a fork button is editorial and will
 * change, and a test that breaks when the corpus changes is a test people
 * learn to ignore.
 */
export function routesContaining(marker, limit = 1) {
  const found = [];
  const stack = [DIST_DIR];
  while (stack.length && found.length < limit) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (entry.name !== 'index.html') continue;
      let html;
      try { html = fs.readFileSync(full, 'utf8'); } catch { continue; }
      if (!html.includes(marker)) continue;
      const rel = path.relative(DIST_DIR, path.dirname(full)).split(path.sep).join('/');
      found.push(rel ? `/${rel}/` : '/');
      if (found.length >= limit) break;
    }
  }
  return found.sort();
}

function resolveFile(urlPath) {
  // The search page dynamically imports /pagefind/pagefind.js. Serve the
  // fixture in its place; see the header note.
  if (urlPath === '/pagefind/pagefind.js') return PAGEFIND_STUB;
  let target = path.join(DIST_DIR, urlPath);
  if (!path.extname(target)) {
    if (fs.existsSync(path.join(target, 'index.html'))) target = path.join(target, 'index.html');
    else if (fs.existsSync(`${target}.html`)) target = `${target}.html`;
  }
  if (!fs.existsSync(target)) return null;
  if (fs.statSync(target).isDirectory()) return null;
  return target;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolveFile(urlPath);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/**
 * Installed before any page script runs. Two jobs:
 *
 *   1. Seed or clear the Supabase auth session, which is how the site decides
 *      whether a reader is signed in.
 *   2. Count every listener, interval and observer registered against
 *      `document` or `window` - the three things that outlive a ClientRouter
 *      swap and can therefore accumulate.
 */
function instrument(config) {
    /* eslint-env browser */
    const { signedIn: isSignedIn, userId: uid, seedStorage: seed, authExpiresAt } = config;

    try {
      // Consent off keeps GA out of the run; the harness asserts nothing about it.
      localStorage.setItem('pi-consent-v1', JSON.stringify({ analytics: false, version: 1 }));
      if (isSignedIn) {
        localStorage.setItem('pi.auth', JSON.stringify({
          access_token: 'harness-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: authExpiresAt,
          refresh_token: 'harness-refresh-token',
          user: {
            id: uid,
            aud: 'authenticated',
            role: 'authenticated',
            email: `${uid}@harness.invalid`,
            app_metadata: {},
            user_metadata: {},
            created_at: '2020-01-01T00:00:00.000Z',
          },
        }));
      } else {
        localStorage.removeItem('pi.auth');
      }
      for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, v);
    } catch { /* private mode - the site is expected to cope, and so is this */ }

    const J = {
      listeners: Object.create(null),
      sources: Object.create(null),
      elementBinds: Object.create(null),
      intervals: 0,
      observers: Object.create(null),
      // False in a freshly created document. navigate() sets it true before
      // clicking, so a value of false afterwards means the browser threw the
      // document away and did a full load - see navigate().
      softNav: false,
      pageLoads: 0,
      pageErrors: [],
    };
    Object.defineProperty(window, '__J', { value: J, writable: false, configurable: true });

    // Pristine observer handles, taken before the counting wrappers below are
    // installed. settle() watches the DOM through these, so the harness's own
    // quiescence check can never be mistaken for an observer the site leaked.
    J.__native = {
      MO: window.MutationObserver,
      observe: window.MutationObserver && window.MutationObserver.prototype.observe,
      disconnect: window.MutationObserver && window.MutationObserver.prototype.disconnect,
    };

    const targetName = function (t) {
      if (t === document) return 'document';
      if (t === window) return 'window';
      return null;
    };

    // Where a registration came from, so a failure names the file to fix
    // rather than only the symptom. Inline page scripts have no module URL, so
    // the frame is the page's own URL and line - which is exactly the pointer
    // wanted, because that is where the script is written.
    const origin = function () {
      try {
        const frames = String(new Error().stack || '').split('\n').slice(1);
        for (const f of frames) {
          if (f.includes('addEventListener')) continue;
          const m = f.match(/https?:\/\/[^\s)]+/);
          if (m) return m[0].replace(/^https?:\/\/[^/]+/, '');
        }
      } catch { /* stacks are a nicety, never a requirement */ }
      return '(unknown)';
    };

    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      try {
        const name = targetName(this);
        const from = origin();
        if (name) {
          const key = `${name} ${type}`;
          J.listeners[key] = (J.listeners[key] || 0) + 1;
          J.sources[key] = J.sources[key] || Object.create(null);
          J.sources[key][from] = (J.sources[key][from] || 0) + 1;
        } else {
          // Element-level listeners are discarded with the element the router
          // replaces, so they cannot accumulate - but they can go MISSING. A
          // page whose script bound listeners on the first visit and binds
          // none on the second has been left dead by the navigation, which is
          // the other half of this defect class and the harder half to see:
          // nothing throws and the static HTML still looks right.
          J.elementBinds[from] = (J.elementBinds[from] || 0) + 1;
        }
      } catch { /* never let bookkeeping break the page */ }
      return add.call(this, type, fn, opts);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, opts) {
      try {
        const name = targetName(this);
        if (name) {
          const key = `${name} ${type}`;
          if (J.listeners[key]) J.listeners[key] -= 1;
        }
      } catch { /* as above */ }
      return remove.call(this, type, fn, opts);
    };

    const setI = window.setInterval;
    const clearI = window.clearInterval;
    window.setInterval = function (...args) {
      J.intervals += 1;
      const from = origin();
      J.sources.setInterval = J.sources.setInterval || Object.create(null);
      J.sources.setInterval[from] = (J.sources.setInterval[from] || 0) + 1;
      return setI.apply(window, args);
    };
    window.clearInterval = function (...args) { J.intervals -= 1; return clearI.apply(window, args); };

    // Observer accounting has to be per instance, not per call: one
    // disconnect() drops EVERY target that instance was watching, so counting
    // it as a single decrement would report a balanced re-point as a leak.
    const live = new WeakMap();
    for (const name of ['MutationObserver', 'IntersectionObserver', 'ResizeObserver']) {
      const Ctor = window[name];
      if (typeof Ctor !== 'function') continue;
      const proto = Ctor.prototype;
      const observe = proto.observe;
      const unobserve = proto.unobserve;
      const disconnect = proto.disconnect;
      proto.observe = function (...args) {
        const held = live.get(this) || 0;
        live.set(this, held + 1);
        J.observers[name] = (J.observers[name] || 0) + 1;
        const from = origin();
        const key = name + '.observe';
        J.sources[key] = J.sources[key] || Object.create(null);
        J.sources[key][from] = (J.sources[key][from] || 0) + 1;
        return observe.apply(this, args);
      };
      if (typeof unobserve === 'function') {
        proto.unobserve = function (...args) {
          const held = live.get(this) || 0;
          if (held > 0) { live.set(this, held - 1); J.observers[name] -= 1; }
          return unobserve.apply(this, args);
        };
      }
      proto.disconnect = function (...args) {
        const held = live.get(this) || 0;
        if (held > 0) { J.observers[name] -= held; live.set(this, 0); }
        return disconnect.apply(this, args);
      };
    }

    // Registered through the original add, so the harness's own bookkeeping
    // listeners are not counted as site listeners.
    add.call(window, 'error', (e) => {
      try { J.pageErrors.push(String(e.message || e.error || 'error')); } catch { /* ignore */ }
    });
    add.call(document, 'astro:page-load', () => { J.pageLoads += 1; });
}

const DEFAULT_SUPABASE = [];

/** A live site: static server over dist/ plus a browser. Close it when done. */
export class Site {
  constructor(server, browser) {
    this.server = server;
    this.browser = browser;
    this.origin = `http://127.0.0.1:${server.address().port}`;
  }

  static async open() {
    if (!distExists()) {
      throw new Error(
        'next/dist is missing or empty. The journey harness drives the built site; '
        + 'run `npm run build` (or `npx astro build`) in next/ first.',
      );
    }
    const server = await startServer();
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return new Site(server, browser);
  }

  async close() {
    await this.browser.close();
    await new Promise((r) => this.server.close(r));
  }

  /**
   * A reader. `supabase` is a list of {match, status, body} rules applied in
   * order to any request whose host ends in supabase.co; `offline: true` makes
   * every such request fail at the transport, which is what a reader on a
   * dropped connection actually experiences.
   */
  async reader({ signedIn = false, userId = 'harness-user-a', seedStorage = {}, supabase = DEFAULT_SUPABASE, offline = false } = {}) {
    // A fresh browser context per reader, not just a fresh page: localStorage
    // is per origin, so two readers sharing one browser would share one saves
    // list and each test would inherit the last one's shortlist. That is a
    // harness that reports whatever ran before it.
    const context = await this.browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(instrument, {
      signedIn,
      userId,
      seedStorage,
      // Relative to run time, never a literal date: a hardcoded expiry is a
      // check that starts failing when a date passes, which PI-012 forbids.
      authExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    const state = { supabase: [...supabase], offline, supabaseCalls: [] };

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      let host = '';
      try { host = new URL(url).host; } catch { /* data: and blob: have none */ }

      if (host.endsWith('supabase.co')) {
        state.supabaseCalls.push({ method: req.method(), url, body: req.postData() || null });
        if (state.offline) { req.abort('failed').catch(() => {}); return; }
        const rule = state.supabase.find((r) => url.includes(r.match)
          && (!r.method || r.method === req.method()));
        const status = rule?.status ?? 200;
        const body = rule ? JSON.stringify(rule.body ?? []) : '[]';
        req.respond({
          status,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Expose-Headers': 'content-range',
          },
          body,
        }).catch(() => {});
        return;
      }

      // Anything not served by the harness's own origin is third-party
      // (analytics, fonts, tiles). Refuse it so a run is offline-deterministic.
      if (host && !url.startsWith(this.origin)) { req.abort('failed').catch(() => {}); return; }

      req.continue().catch(() => {});
    });

    const reader = {
      page,
      state,
      supabaseCalls: () => state.supabaseCalls.slice(),
      setSupabase: (rules) => { state.supabase = [...rules]; },
      setOffline: (v) => { state.offline = v; },
      clearSupabaseCalls: () => { state.supabaseCalls.length = 0; },

      /** Full browser load - a reader arriving cold on this URL. */
      load: async (href) => {
        await page.goto(this.origin + href, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__J && window.__J.pageLoads >= 1, { timeout: 20000 });
        await settle(page);
      },

      /**
       * Client-side navigation through Astro's ClientRouter - a reader
       * clicking a link. Asserts afterwards that the document was swapped
       * rather than reloaded, because a harness that silently fell back to a
       * full load would test nothing this ticket is about.
       */
      navigate: async (href) => {
        const before = await page.evaluate(() => {
          window.__J.softNav = true;
          return window.__J.pageLoads;
        });
        await page.evaluate((h) => {
          // Always a fresh, plain anchor - never an existing link on the page.
          // Real links carry behaviour: the masthead's `a[href="/search/"]`
          // also carries [data-open-search] and opens the overlay instead of
          // navigating, so reusing it would silently test the wrong thing.
          // Clicking a real affordance is what click() is for.
          document.querySelectorAll('[data-harness-link]').forEach((el) => el.remove());
          const a = document.createElement('a');
          a.href = h;
          a.textContent = 'harness';
          a.setAttribute('data-harness-link', '');
          document.body.appendChild(a);
          a.click();
        }, href);
        await page.waitForFunction((n) => window.__J && window.__J.pageLoads > n, { timeout: 20000 }, before);
        const stillSoft = await page.evaluate(() => window.__J && window.__J.softNav === true);
        if (!stillSoft) {
          throw new Error(
            `navigate("${href}") fell back to a full page load; the client router did not handle it, `
            + 'so nothing about post-navigation behaviour was exercised.',
          );
        }
        await settle(page);
      },

      /** Every listener, interval and observer currently held on document/window. */
      globals: () => page.evaluate(() => ({
        listeners: { ...window.__J.listeners },
        sources: JSON.parse(JSON.stringify(window.__J.sources)),
        elementBinds: { ...window.__J.elementBinds },
        intervals: window.__J.intervals,
        observers: { ...window.__J.observers },
      })),

      /**
       * How many element-level listeners a given source file has registered so
       * far, cumulative. `source` is matched as a substring of the stack frame
       * - for an inline page script that frame is the page's own path.
       */
      bindsFrom: (source) => page.evaluate((needle) => {
        let n = 0;
        for (const [src, count] of Object.entries(window.__J.elementBinds)) {
          if (src.includes(needle)) n += count;
        }
        return n;
      }, source),

      /**
       * Wait until a predicate holds IN THE PAGE, then let the DOM settle.
       *
       * Every wait in these suites goes through here rather than sleeping. A
       * sleep encodes a guess about how fast the machine is; this encodes the
       * thing the next assertion is about to check. When it times out it says
       * what it was waiting for and what it saw instead, so a failure is a
       * report rather than a puzzle.
       *
       * `describe` is evaluated in the page on failure to render the actual
       * state - without it a timeout can only say "it never happened".
       */
      waitFor: async (fn, message, arg = null, { timeout = 15000, describe = null } = {}) => {
        try {
          await page.waitForFunction(fn, { timeout, polling: 'raf' }, arg);
        } catch (err) {
          let seen = '';
          if (describe) {
            try { seen = ` Last seen: ${JSON.stringify(await page.evaluate(describe, arg))}.`; } catch { /* best effort */ }
          }
          throw new Error(`${message} (still not true after ${timeout}ms).${seen}`);
        }
        await settle(page);
      },

      /**
       * The instrumentation's own vital signs.
       *
       * The navigation suite's central assertion is "nothing grew", which is
       * exactly what a DEAD counter reports. If the wrappers in instrument()
       * ever stopped being installed - a Chrome change, a CSP, a refactor -
       * every leak test would go green and stay green. So the suite asserts
       * this is non-trivial first, and the green only means something after it.
       */
      instrumentation: () => page.evaluate(() => ({
        listenerKeys: Object.keys(window.__J.listeners).length,
        listenerTotal: Object.values(window.__J.listeners).reduce((a, b) => a + b, 0),
        sourcesAttributed: Object.keys(window.__J.sources).length,
        pageLoads: window.__J.pageLoads,
      })),

      errors: () => page.evaluate(() => window.__J.pageErrors.slice()),

      storage: (key) => page.evaluate((k) => {
        try { return localStorage.getItem(k); } catch { return null; }
      }, key),

      close: async () => { await page.close(); await context.close(); },
    };
    return reader;
  }
}

/**
 * Wait until the document stops changing.
 *
 * This replaced a flat 120ms sleep. A duration is a guess about someone else's
 * machine: too short and the run flakes on a loaded CI box, too long and every
 * test pays the worst case on every step. The condition that actually matters
 * is that the page has finished reacting, so watch for mutations and return
 * once three consecutive frames have produced none.
 *
 * The observer is built from the pristine handles stashed in instrument(), so
 * the harness watching the DOM can never be counted as an observer the site
 * registered.
 */
async function settle(page, timeout = 10000) {
  await page.evaluate(async (limit) => {
    const native = window.__J && window.__J.__native;
    await new Promise((resolve) => {
      const deadline = Date.now() + limit;
      let dirty = false;
      let quiet = 0;
      let mo = null;
      if (native && native.MO) {
        mo = new native.MO(() => { dirty = true; });
        native.observe.call(mo, document.documentElement, {
          subtree: true, childList: true, attributes: true, characterData: true,
        });
      }
      const stop = () => { if (mo && native) native.disconnect.call(mo); resolve(); };
      const tick = () => {
        if (Date.now() > deadline) { stop(); return; }
        if (dirty) { dirty = false; quiet = 0; } else { quiet += 1; }
        if (quiet >= 3) { stop(); return; }
        requestAnimationFrame(() => setTimeout(tick, 0));
      };
      requestAnimationFrame(() => setTimeout(tick, 0));
    });
  }, timeout);
}

/**
 * Keys whose count grew between two `globals()` snapshots. This, not a static
 * scan, is the evidence that a navigation does or does not accumulate.
 */
export function grown(before, after) {
  const out = [];
  for (const [key, count] of Object.entries(after.listeners)) {
    const was = before.listeners[key] || 0;
    if (count > was) out.push(`${key}: ${was} -> ${count}`);
  }
  if (after.intervals > before.intervals) out.push(`setInterval: ${before.intervals} -> ${after.intervals}`);
  for (const [name, count] of Object.entries(after.observers)) {
    const was = before.observers[name] || 0;
    if (count > was) out.push(`${name}.observe: ${was} -> ${count}`);
  }
  return out.sort();
}
