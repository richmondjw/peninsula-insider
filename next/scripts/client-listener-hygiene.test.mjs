/**
 * Client-side listener hygiene (PI-012 defects 1 and 3). Run from next/:
 *
 *   node --test scripts/client-listener-hygiene.test.mjs
 *
 * Two failure modes this locks down, both invisible on a hard reload and both
 * found by the PI-012 journey audit:
 *
 * 1. Listener accumulation. `document` and `window` outlive an Astro
 *    client-router swap, but an `astro:page-load` handler re-runs on every
 *    navigation. Registering a delegated listener inside that handler adds one
 *    more copy per navigation, so after N returns to a page a single tap runs
 *    the handler N times: N copies of a forked plan, N confirm dialogs, N
 *    analytics events. Register once at module scope instead - the pattern
 *    src/components/v5/Card.astro uses.
 *
 * 2. A listener for an event nothing dispatches. /saved/ listened for
 *    `pi:save-changed`; both stores emit `pi:saves-changed`, so clicking
 *    Remove produced no visible change at all.
 *
 * Source-structure assertions, not behaviour: these are inline `.astro`
 * scripts, so there is nothing importable to exercise. They are still the
 * cheapest thing that would have caught both defects.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(NEXT_DIR, 'src');

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(NEXT_DIR, file).split(path.sep).join('/');

/** Body of the first `function <name>(` declaration, braces included. */
function functionBody(src, name) {
  const decl = new RegExp(String.raw`function\s+${name}\s*\(`).exec(src);
  if (!decl) return null;
  const open = src.indexOf('{', decl.index);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

const GLOBAL_BIND = /\b(?:document|window)\s*\.\s*addEventListener\s*\(\s*['"]([^'"]+)['"]/g;
const ZERO_ARG_CALL = /\b([A-Za-z_$][\w$]*)\s*\(\s*\)/g;

/**
 * Every global listener registered by `handler`, or by a same-file zero-arg
 * function `handler` calls. One level of following is enough to catch the
 * `init() { bindToolbar(); }` shape that hid the /account/saved/ defect.
 */
function globalBindsReachableFrom(src, handler) {
  const found = [];
  const seen = new Set();
  const queue = [handler];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const body = functionBody(src, name);
    if (!body) continue;
    for (const match of body.matchAll(GLOBAL_BIND)) found.push({ fn: name, event: match[1] });
    for (const match of body.matchAll(ZERO_ARG_CALL)) queue.push(match[1]);
  }
  return found;
}

const ASTRO_FILES = walk(SRC_DIR, ['.astro']);
const SCRIPT_FILES = walk(SRC_DIR, ['.astro', '.ts', '.tsx', '.mjs']);

/**
 * Sites that still have this defect, frozen as a baseline on 2026-09-13.
 *
 * PI-012 fixed the four surfaces the journey audit walked. The same shape is
 * present across the site chrome and several components: an element-level
 * guard (`_piBound`, `_piMoreBound`) does NOT prevent it, because the guarded
 * element is replaced by the swap while the listener on `document` is not.
 * They are listed rather than fixed because each needs its own idempotence
 * decision; the sweep is filed separately.
 *
 * This list may only shrink. Adding a new entry means shipping the defect.
 */
const KNOWN_UNFIXED = [
  'src/components/CloudSyncIndicatorScript.astro: bind() -> bind() binds "pi:cloud-sync" on document/window',
  'src/components/ConciergeDrawer.astro: bootDrawer() -> bootDrawer() binds "click" on document/window',
  'src/components/ConciergeDrawer.astro: bootDrawer() -> bootDrawer() binds "keydown" on document/window',
  'src/components/InsiderNotePopup.astro: init() -> init() binds "keydown" on document/window',
  'src/components/InsiderNotePopup.astro: init() -> init() binds "resize" on document/window',
  'src/components/InsiderNotePopup.astro: init() -> init() binds "scroll" on document/window',
  'src/components/Masthead.astro: bindMore() -> bindMore() binds "click" on document/window',
  'src/components/Masthead.astro: bindMore() -> bindMore() binds "keydown" on document/window',
  'src/components/play/PlayPeek.astro: initPlayPeek() -> initPlayPeek() binds "inote_impression" on document/window',
  'src/components/play/PlayPeek.astro: initPlayPeek() -> initPlayPeek() binds "inote_open" on document/window',
  'src/components/v2/AuthModal.astro: init() -> init() binds "keydown" on document/window',
  'src/components/v2/AuthModal.astro: init() -> init() binds "pi:open-auth" on document/window',
  'src/components/v2/ProfileDropdown.astro: init() -> installGlobalCloseListeners() binds "click" on document/window',
  'src/components/v2/ProfileDropdown.astro: init() -> installGlobalCloseListeners() binds "keydown" on document/window',
  'src/components/v5/chrome/V5Masthead.astro: initV5Mega() -> initV5Mega() binds "click" on document/window',
  'src/layouts/BaseLayout.astro: bootAll() -> initV4Drawer() binds "keydown" on document/window',
  'src/layouts/BaseLayout.astro: bootAll() -> initV4Mega() binds "click" on document/window',
  'src/pages/explore/index.astro: init() -> init() binds "click" on document/window',
  'src/pages/explore/index.astro: init() -> init() binds "pi:filters-changed" on document/window',
].sort();

test('no astro:page-load handler registers a document- or window-level listener', () => {
  const offences = [];
  for (const file of ASTRO_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    const handlers = [
      ...src.matchAll(/addEventListener\s*\(\s*['"]astro:page-load['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g),
    ].map((m) => m[1]);
    for (const handler of new Set(handlers)) {
      for (const bind of globalBindsReachableFrom(src, handler)) {
        offences.push(`${rel(file)}: ${handler}() -> ${bind.fn}() binds "${bind.event}" on document/window`);
      }
    }
  }
  offences.sort();

  const added = offences.filter((o) => !KNOWN_UNFIXED.includes(o));
  assert.deepEqual(
    added,
    [],
    'A delegated listener registered from an astro:page-load handler gains one copy '
      + 'per navigation, so after N visits one tap runs the handler N times. Register '
      + 'it once at module scope, as src/components/v5/Card.astro does.\n'
      + added.join('\n'),
  );

  // Ratchet: a fixed site must leave the baseline, or the list stops meaning
  // anything and quietly re-admits the defect.
  const fixed = KNOWN_UNFIXED.filter((o) => !offences.includes(o));
  assert.deepEqual(fixed, [], `Fixed; delete from KNOWN_UNFIXED:\n${fixed.join('\n')}`);
});

test('the four surfaces PI-012 fixed stay fixed', () => {
  const FIXED = [
    'src/pages/account/saved.astro',
    'src/pages/me/saved.astro',
    'src/pages/me/trip.astro',
    'src/components/v5/plans/PlanContextEngine.astro',
  ];
  for (const entry of KNOWN_UNFIXED) {
    const file = entry.split(':')[0];
    assert.ok(!FIXED.includes(file), `${file} was fixed by PI-012; it must not be baselined`);
  }
});

/**
 * Listeners with no dispatcher that are deliberate extension points rather
 * than defects. Each entry must say why, and must be an event a future caller
 * is expected to raise - not a typo waiting to be found.
 */
const INTENTIONALLY_UNDISPATCHED = new Map([
  ['pi:open-auth', 'AuthModal extension point: any component may raise it to open the sign-in modal'],
]);

test('every pi: event listened for is dispatched somewhere in src/', () => {
  const listened = new Map();
  const dispatched = new Set();
  for (const file of SCRIPT_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(/addEventListener\s*\(\s*['"](pi:[^'"]+)['"]/g)) {
      if (!listened.has(match[1])) listened.set(match[1], new Set());
      listened.get(match[1]).add(rel(file));
    }
    // The generic slot is optional: `new CustomEvent<Detail>('pi:...')`.
    for (const match of src.matchAll(/new\s+(?:Custom)?Event\s*(?:<[^>]*>)?\s*\(\s*['"](pi:[^'"]+)['"]/g)) {
      dispatched.add(match[1]);
    }
  }

  assert.ok(listened.size > 0, 'expected at least one pi: listener in src/');
  const dead = [...listened.entries()]
    .filter(([name]) => !dispatched.has(name) && !INTENTIONALLY_UNDISPATCHED.has(name))
    .map(([name, files]) => `"${name}" listened for in ${[...files].join(', ')} but never dispatched`);
  assert.deepEqual(dead, [], `Dead event listener(s):\n${dead.join('\n')}`);

  // Keep the allowlist honest: an entry that has since gained a dispatcher
  // should be deleted, not left standing as cover for the next typo.
  const stale = [...INTENTIONALLY_UNDISPATCHED.keys()].filter((name) => dispatched.has(name));
  assert.deepEqual(stale, [], `Allowlisted event(s) now dispatched; remove from the allowlist: ${stale.join(', ')}`);
});

test('the saved page listens for the event the saves stores actually emit', () => {
  const src = fs.readFileSync(path.join(SRC_DIR, 'pages/saved.astro'), 'utf8');
  assert.match(src, /addEventListener\('pi:saves-changed'/);
  assert.doesNotMatch(src, /'pi:save-changed'/, 'pi:save-changed has never existed');
});

test('the plans fork and popstate listeners sit at module scope, not inside init()', () => {
  const src = fs.readFileSync(path.join(SRC_DIR, 'components/v5/plans/PlanContextEngine.astro'), 'utf8');
  const initAt = src.indexOf('function init()');
  assert.ok(initAt > 0, 'expected an init() in PlanContextEngine.astro');
  const beforeInit = src.slice(0, initAt);
  assert.match(beforeInit, /document\.addEventListener\('click'/, 'fork listener must precede init()');
  assert.match(beforeInit, /window\.addEventListener\('popstate'/, 'popstate listener must precede init()');
});

test('the shared-plan fork button on /plan/ binds once', () => {
  const src = fs.readFileSync(path.join(SRC_DIR, 'pages/plan/index.astro'), 'utf8');
  const binds = [...src.matchAll(/\[data-action="fork-plan"\]/g)];
  assert.equal(binds.length, 2, 'expected the Where-is-PI branch and the shared-plan branch');
  // Both branches must guard; the shared branch did not, so one tap merged
  // twice. Two references each: the read that bails, and the write that marks.
  assert.equal(
    (src.match(/dataset\.piBound/g) || []).length,
    4,
    'both fork-plan branches must carry the piBound guard',
  );
});

test('the /me/ pages repaint after a client-router navigation', () => {
  for (const page of ['pages/me/saved.astro', 'pages/me/trip.astro']) {
    const src = fs.readFileSync(path.join(SRC_DIR, page), 'utf8');
    assert.match(
      src,
      /addEventListener\('astro:page-load', init\)/,
      `${page} must re-run init() on navigation; the client router never re-evaluates a loaded module`,
    );
    assert.match(
      src,
      /_piInit/,
      `${page} must guard init() against the double run on first load (DOMContentLoaded plus astro:page-load)`,
    );
  }
});
