import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paths = {
  hub: 'src/pages/boating/index.astro',
  guide: 'src/pages/fishing/charters/first-charter-guide/index.astro',
  hooked: 'src/content/fishing-charters/im-hooked-fishing-charters.md',
  retired: 'src/content/fishing-charters/reel-time-fishing-charters.md',
};

test('boating recommendations exclude the retired Reel Time identity', async () => {
  const [hub, guide, retired] = await Promise.all([
    readFile(paths.hub, 'utf8'),
    readFile(paths.guide, 'utf8'),
    readFile(paths.retired, 'utf8'),
  ]);

  assert.doesNotMatch(hub, /reel-time-fishing-charters|Reel Time Fishing Charters/);
  assert.doesNotMatch(guide, /reel-time-fishing-charters|Reel Time Fishing Charters/);
  assert.match(retired, /^status: draft$/m);
  assert.match(retired, /^verified: false$/m);
});

test('retired charter and vessel claims do not survive on related fishing surfaces', async () => {
  const relatedFiles = [
    'src/pages/fishing/charters/index.astro',
    'src/pages/fishing/charters/first-charter-guide/index.astro',
    'src/content/fishing-charters/western-port-fishing-charters.md',
    'src/content/species/snapper.md',
    'src/content/species/king-george-whiting.md',
    'src/content/species/pinkies.md',
    'src/content/species/australian-salmon.md',
    'src/content/species/squid.md',
    'src/content/species/flathead.md',
  ];
  const related = (
    await Promise.all(relatedFiles.map((file) => readFile(file, 'utf8')))
  ).join('\n');

  assert.doesNotMatch(related, /Reel Time|reel-time-fishing-charters|Devil Cat|catamaran stability/i);
});

test("I'm Hooked recommendation matches current operator evidence", async () => {
  const [hub, hooked] = await Promise.all([
    readFile(paths.hub, 'utf8'),
    readFile(paths.hooked, 'utf8'),
  ]);

  for (const source of [hub, hooked]) assert.doesNotMatch(source, /Devil Cat|24-foot|wheelchair-accessible/i);
  assert.match(hooked, /^vesselName: Seaquest 9m$/m);
  assert.doesNotMatch(hooked, /^licenceCovered: covered$/m);
  assert.match(hooked, /^licenceCovered: byo$/m);
  assert.match(hooked, /^departurePoints: \[\]$/m);
  assert.match(hooked, /valid Victorian Recreational Fishing Licence/);
});

test('boating hub links the current BOM local-waters forecasts', async () => {
  const hub = await readFile(paths.hub, 'utf8');
  assert.match(hub, /https:\/\/www\.bom\.gov\.au\/vic\/forecasts\/portphillip\.shtml/);
  assert.match(hub, /https:\/\/www\.bom\.gov\.au\/vic\/forecasts\/westernport\.shtml/);
  assert.doesNotMatch(hub, /mornington-peninsula\.shtml/);
});
