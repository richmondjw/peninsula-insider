import { resolveHero } from './inline-edit/resolve-hero';
import { pageImage } from './page-images';
import { journalImageTheme, selectJournalImage } from './journal-image-policy.mjs';
import { imageAvailable } from './journal-image-availability.mjs';

export async function resolveJournalImage(slug: string, data: any) {
  const hero = await resolveHero('article', slug, data, 'hero', { requireOverrideMetadata: true });
  const fallback = pageImage(`journal-fallback-${journalImageTheme(data)}`);
  return selectJournalImage(hero, data, fallback, imageAvailable);
}
