/**
 * Licensed Visit Victoria photographs used by page files (hub heroes, link
 * previews, homepage doors). The data is written by
 * ops/scripts/visit-victoria/page-images.mjs from photographs already on the
 * site, so credit, caption and alt text come from the record. The licence gate,
 * the credits page and the where-used ledger all read the same file.
 */
import data from '../data/visit-victoria-page-images.json';

export interface PageImage {
  page: string;
  role: string;
  entity: string;
  src: string;
  alt: string;
  credit: string;
  caption?: string;
  [key: string]: unknown;
}

const images = (data as { images: Record<string, PageImage> }).images;

export function pageImage(key: string): PageImage {
  const image = images[key];
  if (!image) throw new Error(`No licensed page image "${key}" in src/data/visit-victoria-page-images.json`);
  return image;
}

export function allPageImages(): Array<PageImage & { key: string }> {
  return Object.entries(images).map(([key, image]) => ({ key, ...image }));
}
