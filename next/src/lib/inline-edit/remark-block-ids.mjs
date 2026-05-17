/**
 * Remark plugin: tag top-level markdown blocks with stable `data-pi-block-id`
 * attributes so the inline editor can target individual paragraphs / headings
 * / lists / blockquotes for click-to-edit.
 *
 * The ID is a short content hash of the block's plain-text content (first
 * 80 chars after trim). This means:
 *   - Re-rendering the same MDX produces the same IDs every time (stable).
 *   - Reordering blocks within a file does NOT invalidate their IDs.
 *   - Editing a block's text in the MDX source DOES invalidate its ID — the
 *     CMS override for the previous text becomes orphaned. Acceptable: if
 *     you've changed the canonical source, the previous override is stale.
 *
 * Block kinds that get IDs:
 *   - paragraph
 *   - heading (any depth)
 *   - blockquote
 *   - list (ul / ol)
 *
 * Block kinds we deliberately skip:
 *   - code blocks (preserved as-is — formatting matters)
 *   - thematic break (<hr> — nothing to edit)
 *   - tables (v2 — out of scope)
 *   - HTML / JSX nodes (structural, not prose)
 *   - images (the inline editor already handles these via the right-click
 *     image flow)
 */

import { createHash } from 'node:crypto';

/** Reduce a node to its plain-text content, recursively. */
function textOf(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}

/** Deterministic short ID from the first 80 chars of a block's text. */
function blockId(node) {
  const text = textOf(node).trim().slice(0, 80);
  // Empty blocks (rare — e.g. an empty paragraph) get a positional fallback
  // so they still get a unique-ish ID. Position-only IDs are fragile but
  // empty blocks aren't meaningful editor targets anyway.
  const seed = text || `empty:${node.type}:${node.position?.start?.line ?? 0}`;
  const hash = createHash('sha1').update(seed).digest('hex').slice(0, 10);
  return `b${hash}`;
}

const EDITABLE_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'list',
]);

export default function remarkBlockIds() {
  return (tree) => {
    if (!Array.isArray(tree.children)) return;
    for (const node of tree.children) {
      if (!EDITABLE_BLOCK_TYPES.has(node.type)) continue;
      const id = blockId(node);
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties['data-pi-block-id'] = id;
      node.data.hProperties['data-pi-block-kind'] = node.type === 'heading'
        ? `h${node.depth ?? 2}`
        : node.type;
    }
  };
}
