import { parse } from 'parse5';
import {
  CaptureEvidenceLocatorSchema,
  ExtractionRevisionSchema,
  type CaptureEvidenceLocator,
  type ExtractionRevision,
} from '../../shared/capture-contracts.js';
import { sha256 } from './blob-store.js';

interface HtmlNode {
  readonly nodeName?: string;
  readonly value?: string;
  readonly childNodes?: readonly HtmlNode[];
}

const BLOCK_ELEMENTS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'dt', 'dd', 'pre', 'figcaption', 'td', 'th']);
const EXCLUDED_ELEMENTS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'canvas']);
export const MAX_EXTRACTION_BLOCK_CHARS = 4_000;
export const MAX_EXTRACTION_BLOCKS = 256;
export const MAX_EXTRACTION_TEXT_CHARS = 512_000;

export class ExtractionError extends Error {}

function normalizedText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/[\t\r\n ]+/g, ' ').trim();
}

function collectText(node: HtmlNode): string {
  if (node.nodeName && EXCLUDED_ELEMENTS.has(node.nodeName)) return '';
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(collectText).join(' ');
}

function htmlBlocks(content: string): string[] {
  const document = parse(content) as unknown as HtmlNode;
  const blocks: string[] = [];
  const visit = (node: HtmlNode): void => {
    if (node.nodeName && EXCLUDED_ELEMENTS.has(node.nodeName)) return;
    if (node.nodeName && BLOCK_ELEMENTS.has(node.nodeName)) {
      const text = normalizedText(collectText(node));
      if (text) blocks.push(text);
      return;
    }
    (node.childNodes ?? []).forEach(visit);
  };
  visit(document);
  if (blocks.length > 0) return blocks;
  const fallback = normalizedText(collectText(document));
  return fallback ? [fallback] : [];
}

function plainTextBlocks(content: string): string[] {
  return content
    .split(/(?:\r?\n){2,}/)
    .map(normalizedText)
    .filter(Boolean);
}

export function decodeText(content: Uint8Array, charset: 'utf-8' | 'us-ascii'): string {
  if (charset === 'us-ascii' && content.some((byte) => byte > 0x7f)) {
    throw new ExtractionError('US-ASCII response contained non-ASCII bytes');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    throw new ExtractionError(`Response body is not valid ${charset}`);
  }
}

export function extractBlocks(content: string, mediaType: 'text/html' | 'text/plain') {
  const texts = mediaType === 'text/html' ? htmlBlocks(content) : plainTextBlocks(content);
  const bounded: string[] = [];
  let retainedChars = 0;
  for (const text of texts) {
    let remainder = text;
    while (remainder && bounded.length < MAX_EXTRACTION_BLOCKS && retainedChars < MAX_EXTRACTION_TEXT_CHARS) {
      const remainingBudget = MAX_EXTRACTION_TEXT_CHARS - retainedChars;
      const limit = Math.min(MAX_EXTRACTION_BLOCK_CHARS, remainingBudget);
      let splitAt = Math.min(remainder.length, limit);
      if (remainder.length > limit) {
        const wordBoundary = remainder.slice(0, limit + 1).lastIndexOf(' ');
        if (wordBoundary >= Math.floor(limit / 2)) splitAt = wordBoundary;
      }
      const segment = remainder.slice(0, splitAt).trim();
      if (segment) {
        bounded.push(segment);
        retainedChars += segment.length;
      }
      remainder = remainder.slice(splitAt).trim();
    }
    if (bounded.length >= MAX_EXTRACTION_BLOCKS || retainedChars >= MAX_EXTRACTION_TEXT_CHARS) break;
  }
  return bounded.map((text, index) => Object.freeze({
    locator: `block:${String(index + 1).padStart(6, '0')}`,
    text,
    textHash: sha256(text),
  }));
}

export function buildExtractionRevision(input: {
  readonly id: string;
  readonly attemptId: string;
  readonly sourceRevisionId: string;
  readonly extractedAt: string;
  readonly sourceContentBlobHash: string;
  readonly extractedTextBlobHash: string;
  readonly blocks: ReturnType<typeof extractBlocks>;
}): ExtractionRevision {
  return ExtractionRevisionSchema.parse({
    schemaVersion: 'pi.extraction-revision.v1',
    ...input,
    extractorVersion: 'pi.parse5-text.v2',
  });
}

export function createEvidenceLocator(
  revision: ExtractionRevision,
  locator: string,
): CaptureEvidenceLocator {
  const block = revision.blocks.find((candidate) => candidate.locator === locator);
  if (!block) throw new ExtractionError(`Extraction locator does not exist: ${locator}`);
  return CaptureEvidenceLocatorSchema.parse({
    sourceRevisionId: revision.sourceRevisionId,
    extractionRevisionId: revision.id,
    locatorType: 'extracted_block',
    locator,
    excerpt: block.text,
    excerptHash: block.textHash,
  });
}

export function resolveEvidenceLocator(
  revision: ExtractionRevision,
  input: CaptureEvidenceLocator,
): string {
  const locator = CaptureEvidenceLocatorSchema.parse(input);
  const immutableRevision = ExtractionRevisionSchema.parse(revision);
  if (locator.extractionRevisionId !== immutableRevision.id || locator.sourceRevisionId !== immutableRevision.sourceRevisionId) {
    throw new ExtractionError('Evidence locator points to a different immutable extraction revision');
  }
  const block = immutableRevision.blocks.find((candidate) => candidate.locator === locator.locator);
  if (!block || block.text !== locator.excerpt || sha256(block.text) !== locator.excerptHash || block.textHash !== locator.excerptHash) {
    throw new ExtractionError('Evidence excerpt cannot be reproduced from the immutable extraction revision');
  }
  return block.text;
}
