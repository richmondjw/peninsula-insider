import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from '../../next/node_modules/sharp/lib/index.js';
import {inspectImageBytes} from './image-byte-inspection.mjs';

test('real raster decode binds dimensions and bytes without claiming rights or subject', async () => {
  const bytes = await sharp({create: {width: 640, height: 360, channels: 3, background: '#1f483f'}}).png().toBuffer();
  const receipt = await inspectImageBytes(bytes);
  assert.equal(receipt.format, 'png');
  assert.deepEqual([receipt.width, receipt.height], [640, 360]);
  assert.equal(receipt.decoded, true);
  assert.equal(receipt.reusePermission, 'unknown');
  assert.equal(receipt.subject, 'unreviewed');
  assert.equal(receipt.ocr, 'unreviewed');
  assert.equal(receipt.privacy, 'unreviewed');
  assert.equal(receipt.assetHash.length, 64);
  await assert.rejects(inspectImageBytes(bytes, {maxBytes: bytes.length - 1}), /admission/);
});

test('caller mutation during asynchronous decode cannot change the hash binding', async () => {
  const bytes = await sharp({create: {width: 640, height: 360, channels: 3, background: '#1f483f'}}).png().toBuffer();
  const expected = createHash('sha256').update(bytes).digest('hex');
  const pending = inspectImageBytes(bytes);
  bytes.fill(0);
  const receipt = await pending;
  assert.equal(receipt.assetHash, expected);
  assert.deepEqual([receipt.width, receipt.height], [640, 360]);
});

test('actual AVIF is decoded, while a tighter pixel budget refuses the same bytes', async () => {
  const bytes = await sharp({create: {width: 640, height: 360, channels: 3, background: '#1f483f'}}).avif().toBuffer();
  const receipt = await inspectImageBytes(bytes);
  assert.equal(receipt.format, 'avif');
  assert.deepEqual([receipt.width, receipt.height], [640, 360]);
  await assert.rejects(inspectImageBytes(bytes, {maxPixels: 640 * 360 - 1}));
});

test('page text, SVG and truncated raster cannot become an inspected photograph', async () => {
  await assert.rejects(inspectImageBytes(Buffer.from('not a photograph')));
  await assert.rejects(inspectImageBytes(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"></svg>')), /Unsupported/);
  const png = await sharp({create: {width: 640, height: 360, channels: 3, background: '#1f483f'}}).png().toBuffer();
  await assert.rejects(inspectImageBytes(png.subarray(0, Math.floor(png.length / 2))));
});
