import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('../src/pages/partners/dashboard.astro', import.meta.url), 'utf8');

test('partner portal project dashboard presents evidence-based project status', () => {
  assert.match(page, /Partner Portal project dashboard/);
  assert.match(page, /Current status: build preparation/);
  assert.match(page, /Commercial routing decision required/);
  assert.match(page, /Build readiness/);
  assert.match(page, /Production release/);
  assert.match(page, /Status comes from the governed planning evidence listed below\./);
});

test('partner portal project dashboard makes workstream status and next actions scannable', () => {
  assert.match(page, /data-status="red"/);
  assert.match(page, /data-status="amber"/);
  assert.match(page, /data-status="green"/);
  assert.match(page, /Workstreams and milestones/);
  assert.match(page, /Owner/);
  assert.match(page, /Dependency/);
  assert.match(page, /Next action/);
  assert.match(page, /Verified evidence/);
  assert.match(page, /Tonight's release checklist/);
  assert.match(page, /Deployment and rollback gate/);
});

test('partner portal project dashboard provides accessible detail controls and source mapping', () => {
  assert.match(page, /<details/);
  assert.match(page, /<summary>View source mapping<\/summary>/);
  assert.match(page, /<caption>Current source-of-truth mapping<\/caption>/);
  assert.match(page, /<table/);
  assert.match(page, /@media \(max-width: 640px\)/);
  assert.match(page, /min-height: 44px/);
});
