import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script = fileURLToPath(new URL('./lint-no-pricing.mjs', import.meta.url));
const valid = { label: 'Adults $25', sourceUrl: 'https://example.com/tickets', checkedAt: '2026-10-03', validUntil: '2026-10-07' };
function lint(relative, value) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-price-policy-'));
  try {
    const target = path.join(temporary, 'src', relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
    const result = spawnSync(process.execPath, [script], { cwd: temporary, encoding: 'utf8' });
    assert.equal(result.error, undefined);
    return result;
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
test('only validated event verifiedPrice labels may contain dollar figures', () => {
  assert.equal(lint('content/events/approved.json', { verifiedPrice: valid }).status, 0);
  for (const record of [
    { verifiedPrice: valid, summary: 'Buy a $25 ticket' },
    { verifiedPrice: valid, priceText: '$25' },
    { verifiedPrice: { ...valid, sourceUrl: 'javascript:alert(1)' } },
    { verifiedPrice: { label: '$25' } },
    { verifiedPrice: { ...valid, validUntil: '2026-10-01' } },
  ]) assert.equal(lint('content/events/unapproved.json', record).status, 1);
  assert.equal(lint('content/venues/venue.json', { verifiedPrice: valid }).status, 1);
  assert.equal(lint('content/events/not-json.json', '{"label":"$25"').status, 1);
});
test('ordinary prose and legacy renderer restrictions remain active', () => {
  assert.equal(lint('content/articles/article.md', 'Tickets cost $25.').status, 1);
  assert.equal(lint('pages/example.astro', '<p>{priceLow}</p>').status, 1);
  assert.equal(lint('pages/example.astro', '<p>No price claimed.</p>').status, 0);
});
