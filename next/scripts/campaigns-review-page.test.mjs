import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const pageUrl = process.env.CAMPAIGNS_PAGE
  ? pathToFileURL(resolve(process.env.CAMPAIGNS_PAGE))
  : new URL('../public/campaigns/index.html', import.meta.url);

test('campaigns review page is a standalone noindex review surface', async () => {
  const html = await readFile(fileURLToPath(pageUrl), 'utf8');

  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow">/i);
  assert.match(html, /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*default-src 'none';[^"]*connect-src 'none';/i);
  assert.match(html, /Review only/i);
  assert.doesNotMatch(html, /password protection|password-protected|enter password/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/i);
});
