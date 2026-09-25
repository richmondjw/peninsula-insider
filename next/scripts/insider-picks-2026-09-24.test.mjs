import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const articlePath = fileURLToPath(new URL('../src/content/articles/insider-picks-2026-09-24.md', import.meta.url));
const article = await readFile(articlePath, 'utf8');

assert.match(article, /Where is the Greens Bush trail and how long are the Baldrys circuits\?/);
assert.match(article, /Greens Bush is in Mornington Peninsula National Park\. Start at Baldrys Crossing, Baldrys Road, Main Ridge\. Parks Victoria lists the Baldrys Short Circuit at 1\.6km and the Baldrys Long Circuit at 3\.6km\./);
assert.match(article, /Parks Victoria lists two short circuits from Baldrys Crossing: the Baldrys Short Circuit is 1\.6km, while the Baldrys Long Circuit is 3\.6km\. Choose the short circuit for a quick look at the heathland, or allow more time for the longer circuit\. Wear shoes with grip, the clay sections hold moisture for days after rain, and go in the morning before the wind picks up off Bass Strait\./);
assert.match(article, /Start at Baldrys Crossing, Baldrys Road, Main Ridge\. There is no entry fee for Mornington Peninsula National Park\./);
assert.match(article, /\*\*Greens Bush, Mornington Peninsula National Park\*\* · Baldrys Crossing, Baldrys Road, Main Ridge · Open daily · No entry fee · Baldrys Short Circuit 1\.6km or Baldrys Long Circuit 3\.6km/);
assert.match(article, /Dromana Community Market runs Saturday 26 September, 8:00am–1:30pm/);
assert.doesNotMatch(article, /vehicle entry fee/i);
assert.doesNotMatch(article, /entry fee applies/i);
assert.doesNotMatch(article, /main Greens Bush Loop.*10km/i);
assert.doesNotMatch(article, /Greens Bush Road, Boneo/);
