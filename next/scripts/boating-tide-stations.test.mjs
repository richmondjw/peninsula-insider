import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const roots = ['src/pages/boating/index.astro', 'src/pages/boating/tides-safety/index.astro', 'src/content/boat-ramps'];
const forbidden = [/Portsea (?:reference )?station/i, /Port Melbourne (?:reference )?station/i, /Portsea or Port Melbourne/i, /Use Portsea for Sorrento/i];

async function filesFor(path) {
  if (!path.endsWith('boat-ramps')) return [path];
  return (await readdir(path)).filter((name) => name.endsWith('.md')).map((name) => join(path, name));
}

test('boating tide guidance emits only current BOM-listed station names', async () => {
  const files = (await Promise.all(roots.map(filesFor))).flat();
  const failures = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pattern of forbidden) if (pattern.test(source)) failures.push(`${file}: ${pattern}`);
  }
  assert.deepEqual(failures, []);
});
