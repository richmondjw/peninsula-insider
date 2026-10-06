import {createHash} from 'node:crypto';
import sharp from '../../next/node_modules/sharp/lib/index.js';

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const FORMATS = new Set(['jpeg', 'png', 'webp', 'avif']);

/** Decode a private captured asset before any human subject or rights review.
 * This receipt proves bytes and raster dimensions only; it grants no reuse.
 */
export async function inspectImageBytes(bytes, {maxBytes = MAX_BYTES, maxPixels = MAX_PIXELS} = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BYTES || bytes.length > maxBytes || !Number.isInteger(maxPixels) || maxPixels < 1 || maxPixels > MAX_PIXELS) {
    throw new Error('Image byte admission failed');
  }
  // Snapshot before the first await: a caller may reuse or mutate its Buffer
  // while metadata and the full decode run asynchronously.
  const snapshot = Buffer.from(bytes);
  const decoder = sharp(snapshot, {failOn: 'error', limitInputPixels: maxPixels, animated: false});
  const metadata = await decoder.metadata();
  // libvips reports AVIF as HEIF with AV1 compression. Other HEIF variants
  // remain unsupported so a container type alone cannot admit HEVC media.
  const format = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format;
  if (!FORMATS.has(format) || !Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width < 1 || metadata.height < 1 || metadata.width * metadata.height > maxPixels || (metadata.pages ?? 1) !== 1) {
    throw new Error('Unsupported or oversized raster image');
  }
  // Metadata can be readable for a truncated file. Force a complete decode.
  await decoder.clone().resize(1, 1, {fit: 'fill'}).raw().toBuffer();
  const rotated = [5, 6, 7, 8].includes(metadata.orientation);
  return {
    assetHash: createHash('sha256').update(snapshot).digest('hex'),
    byteLength: snapshot.length,
    format,
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
    decoded: true,
    subject: 'unreviewed',
    ocr: 'unreviewed',
    privacy: 'unreviewed',
    reusePermission: 'unknown',
  };
}
