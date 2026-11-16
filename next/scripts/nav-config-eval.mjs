/**
 * nav-config-eval.mjs - load src/lib/v5-nav.ts without a TypeScript toolchain.
 *
 * v5-nav.ts is the navigation source of truth and it is TypeScript, but two
 * consumers need to read it as plain data with no bundler and no module
 * graph: scripts/lint-nav-budget.mjs (a CI gate that counts links) and
 * src/lib/v5-nav.test.mjs (which asserts the rail-expiry rule). Both used to
 * be impossible, or duplicated, so the stripping rules lived in the lint and
 * nothing else could read the config. They live here now, once, and the two
 * callers share them -- if the file's shape changes, one place adapts.
 *
 * The evaluator strips the TypeScript surface and runs the result in a vm
 * with the season helpers stubbed. Stubbing `melbourneISODate` is the point
 * for the test: it makes "today" an argument rather than an ambient fact, so
 * the expiry rule can be asserted at any date without the clock ever being
 * able to turn a passing test into a failing one.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));

/** Where v5-nav.ts lives, resolved from this file rather than from cwd. */
export const NAV_CONFIG_PATH = join(here, '..', 'src', 'lib', 'v5-nav.ts');

/**
 * Strip the TypeScript surface: imports (stubbed by the caller), interfaces
 * (flat, no nested braces), type annotations on exported consts and
 * functions, and `as` casts on group literals. Exported functions are
 * rewritten to plain declarations plus an explicit export assignment, so a
 * rule expressed as a function stays reachable from both callers.
 */
function stripTypes(source) {
  const exportedFns = [];
  return source
    .replace(/^import[^\n]*;[^\n]*$/gm, '')
    .replace(/export interface [\s\S]*?\n\}/g, '')
    .replace(/export function (\w+)\s*\(([^)]*)\)\s*:\s*[^{]+\{/g, (_m, name, params) => {
      exportedFns.push(name);
      const bare = params
        .split(',')
        .map((p) => p.split(':')[0].trim())
        .filter(Boolean)
        .join(', ');
      return `function ${name}(${bare}) {`;
    })
    .replace(/export const (\w+)\s*:\s*[^=]+=/g, 'exports.$1 =')
    .replace(/export const (\w+)\s*=/g, 'exports.$1 =')
    .replace(/ as string \| null/g, '')
    .concat(exportedFns.map((n) => `\nexports.${n} = ${n};`).join(''));
}

/**
 * Evaluate v5-nav.ts and return its exports.
 *
 * @param {object} [stubs] Overrides for the symbols v5-nav.ts imports.
 *   `todayISO` is the convenient form: it pins what `melbourneISODate()`
 *   returns, which is what decides whether a seasonal rail has expired.
 */
export function evaluateNavConfig({ todayISO = '1970-01-01', seasonEditionTag = "Season '00" } = {}) {
  const source = stripTypes(readFileSync(NAV_CONFIG_PATH, 'utf8'));
  const sandbox = {
    exports: {},
    getSeasonEditionTag: () => seasonEditionTag,
    melbourneISODate: () => todayISO,
  };
  vm.runInNewContext(source, sandbox, { filename: 'v5-nav.evaluated.js' });
  return sandbox.exports;
}
