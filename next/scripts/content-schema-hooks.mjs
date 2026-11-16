/**
 * content-schema-hooks.mjs - module-resolution hooks for
 * audit-content-schema-drift.mjs.
 *
 * src/content.config.ts imports `astro:content`, a virtual module that only
 * exists inside an Astro build, and `astro/loaders`. Both are redirected here
 * to a tiny shim so plain node can import the config and read the real zod
 * schema objects out of it. The alternative - reparsing or recopying the
 * schema into the audit script - is the parallel source of truth this whole
 * gate exists to prevent.
 *
 * The shim is a data: URL rather than a third file on disk; it needs the
 * absolute URL of the zod bundled with Astro, which only the parent can
 * resolve, so that arrives through initialize().
 */

let SHIM = null;

export function initialize({ zodUrl }) {
  SHIM =
    'data:text/javascript,' +
    encodeURIComponent(
      [
        `import { z } from ${JSON.stringify(zodUrl)};`,
        'export { z };',
        // defineCollection is identity: the audit wants the config object.
        'export const defineCollection = (config) => config;',
        // A reference is stored on disk as a slug string.
        'export const reference = () => z.string();',
        // Loaders return their own options, which is how the audit recovers
        // each collection base directory and file pattern.
        "export const glob = (options) => ({ loaderKind: 'glob', ...options });",
        "export const file = (filePath, options) => ({ loaderKind: 'file', filePath, ...options });",
      ].join('\n')
    );
}

export async function resolve(specifier, context, next) {
  if (SHIM && (specifier === 'astro:content' || specifier === 'astro/loaders')) {
    return { url: SHIM, shortCircuit: true };
  }
  return next(specifier, context);
}
