#!/usr/bin/env node
/**
 * where-used.mjs
 *
 * Takedown helper. Lists every place a Visit Victoria Work is used: the where-used
 * ledger (site, email, social) plus a scan of the content tree, so a takedown request
 * (including a First Nations mourning request) can be honoured the same day.
 *
 *   node ops/scripts/visit-victoria/where-used.mjs 169287        # by Visit Victoria asset id
 *   node ops/scripts/visit-victoria/where-used.mjs --all          # every Work in use
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const want = process.argv[2];
if (!want) { console.error('usage: where-used.mjs <vv asset id> | --all'); process.exit(2); }
const key = want === '--all' ? null : `vv-${want.replace(/^vv-/, '')}`;

const ledger = JSON.parse(fs.readFileSync(path.join(REPO, 'ops/records/visit-victoria/placements.json'), 'utf8'));
const rows = ledger.placements.filter((p) => !key || p.assetKey === key);

const hits = [];
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (/\.(json|md|mdx|astro|ts|mjs)$/.test(e.name)) {
      const t = fs.readFileSync(p, 'utf8');
      const re = key ? new RegExp(`/images/visit-victoria/${key}-`, 'g') : /\/images\/visit-victoria\/vv-\d+-/g;
      const n = (t.match(re) || []).length;
      if (n) hits.push({ file: path.relative(REPO, p), references: n });
    }
  }
}
scan(path.join(REPO, 'next/src'));

console.log(JSON.stringify({ query: key ?? 'all', ledgerPlacements: rows, treeReferences: hits }, null, 1));
if (key && !rows.length && !hits.length) console.error(`${key}: not in use`);
