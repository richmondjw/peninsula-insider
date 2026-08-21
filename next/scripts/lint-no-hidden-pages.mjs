#!/usr/bin/env node
/**
 * lint-no-hidden-pages - fails the build when a real page ships CSS that hides
 * the whole document.
 *
 * src/components/Redirect.astro deliberately hides html/body so the redirect
 * stub never flashes before window.location.replace() fires. `html, body` is a
 * root selector Astro cannot scope, so unless that <style> is marked
 * `is:inline` Astro bundles the rule into the *page's* stylesheet - and a page
 * only has to reference <Redirect /> somewhere in its template to inherit it,
 * even in a branch it never takes.
 *
 * That shipped on 2026-08-14: eat/[slug].astro gained a
 * `{isWineryAlias ? <Redirect /> : <BaseLayout />}` branch, and all 59 venue
 * detail pages that took the *other* branch went blank in every browser.
 * Nothing caught it. The HTML was valid, the build passed, the links resolved,
 * the content was all there in the DOM - it was just display:none. Every
 * existing lint reads the markup; none of them read what the CSS then does
 * to it.
 *
 * So this runs on the built output and asks the one question that matters: can
 * a reader see this page at all? A stub whose entire job is to bounce carries
 * an empty <body> and is allowed to hide itself. Anything with content in the
 * body is not - size is deliberately not the test, because Astro injects a
 * page's full stylesheet set into the stub's <head> regardless of which branch
 * rendered, so stubs are not reliably small.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, out);
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

/**
 * A redirect stub bounces before it paints: it declares a meta-refresh and has
 * nothing in its <body> to show. Both halves matter - the meta-refresh alone
 * would exempt any page that happens to carry one, and an empty body alone
 * would exempt a page broken in some entirely different way.
 */
function isRedirectStub(html) {
  if (!/<meta\b[^>]*\bhttp-equiv=["']refresh["']/i.test(html)) return false;
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1];
  if (body === undefined) return false;
  return body.replace(/<!--[\s\S]*?-->/g, '').trim() === '';
}

/**
 * Find rules that hide the document root. Deliberately narrow: only an
 * unscoped `html` or `body` selector counts. Scoped variants
 * (`body[data-astro-cid-x]`) and descendant rules (`body .drawer`) are
 * legitimate and stay out of scope.
 */
function rootHidingRules(css) {
  const hits = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((s) => s.trim());
    const body = match[2];
    if (!/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(body)) {
      continue;
    }
    const rootSelectors = selectors.filter((s) => /^(?:html|body)$/i.test(s));
    if (rootSelectors.length) hits.push(`${rootSelectors.join(', ')} { ${body.trim()} }`);
  }
  return hits;
}

function inlineStyles(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
}

function linkedStylesheets(html) {
  const hrefs = [];
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel=["']stylesheet["']/i.test(tag[0])) continue;
    const href = tag[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href?.startsWith('/')) hrefs.push(href);
  }
  return hrefs;
}

const cssCache = new Map();
function readCss(href) {
  if (!cssCache.has(href)) {
    const path = join(DIST, href.replace(/^\//, '').split(/[?#]/, 1)[0]);
    let css = '';
    try {
      css = readFileSync(path, 'utf8');
    } catch {
      // A stylesheet the build did not emit is lint-seo-architecture's problem,
      // not ours. Absent CSS cannot hide anything.
    }
    cssCache.set(href, css);
  }
  return cssCache.get(href);
}

const failures = [];
let pagesChecked = 0;
let stubsSkipped = 0;

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  if (isRedirectStub(html)) {
    stubsSkipped += 1;
    continue;
  }
  pagesChecked += 1;

  const sources = [
    ...inlineStyles(html).map((css) => ['inline <style>', css]),
    ...linkedStylesheets(html).map((href) => [href, readCss(href)]),
  ];

  for (const [origin, css] of sources) {
    for (const rule of rootHidingRules(css)) {
      failures.push({ page: `/${relative(DIST, file)}`, origin, rule });
    }
  }
}

if (failures.length) {
  console.error(`\nlint-no-hidden-pages: ${failures.length} page(s) ship CSS that hides the whole document.\n`);
  for (const f of failures.slice(0, 25)) {
    console.error(`  ${f.page}\n    via ${f.origin}: ${f.rule}`);
  }
  if (failures.length > 25) console.error(`  ... and ${failures.length - 25} more`);
  console.error(
    '\nThese pages render blank. The usual cause is a component whose <style> ' +
      'targets html/body without `is:inline` - Astro cannot scope a root ' +
      'selector, so it bundles the rule into every page that references the ' +
      'component, including branches that never render. See ' +
      'src/components/Redirect.astro.\n',
  );
  process.exit(1);
}

console.log(
  `lint-no-hidden-pages: OK (${pagesChecked} page(s) visible, ${stubsSkipped} redirect stub(s) exempt).`,
);
