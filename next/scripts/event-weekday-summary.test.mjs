import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const audit = fileURLToPath(new URL('./audit-event-safeguards.mjs', import.meta.url));

test('one-off weekday conflicts fail the event safeguard gate', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pi-event-weekday-'));
  const eventsDir = path.join(dir, 'events');
  const eventFile = path.join(eventsDir, 'event.json');
  const baselineFile = path.join(dir, 'baseline.json');
  const reportFile = path.join(dir, 'report.json');
  const event = {
    title: 'Friday music',
    summary: 'Live music each Saturday, 5pm to 8pm.',
    startDate: '2026-11-20',
    startTime: '17:00',
    endTime: '20:00',
    recurrence: 'one-off',
    lastCheckedDate: '2026-11-20',
    status: 'published',
  };
  const run = () => execFileSync(process.execPath, [audit, '--events-dir', eventsDir, '--baseline', baselineFile, '--json', reportFile, '--today', '2026-11-20', '--assert'], { encoding: 'utf8', stdio: 'pipe' });
  try {
    await mkdir(eventsDir);
    await writeFile(baselineFile, JSON.stringify({ ceilings: { weekdaySummaryConflicts: 0 } }));
    await writeFile(eventFile, JSON.stringify(event));
    assert.throws(run, (error) => error.status === 1 && /weekdaySummaryConflicts: 1 > baseline 0/.test(String(error.stderr)));
    assert.equal(JSON.parse(await readFile(reportFile, 'utf8')).totals.weekdaySummaryConflicts, 1);

    event.summary = 'Live music every Friday, 5pm to 8pm.';
    await writeFile(eventFile, JSON.stringify(event));
    assert.match(run(), /PASS: no regression/);

    event.summary = 'Live music every Saturday, 5pm to 8pm.';
    event.recurrence = 'weekly';
    await writeFile(eventFile, JSON.stringify(event));
    assert.match(run(), /PASS: no regression/);
  } finally {
    assert.ok(path.resolve(dir).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    assert.ok(path.basename(dir).startsWith('pi-event-weekday-'));
    await rm(dir, { recursive: true, force: true });
  }
});
