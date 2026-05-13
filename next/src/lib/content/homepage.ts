import homepageData from '../../data/homepage.json';
import type { CmsEditableImageSlot, CmsEditableTextField } from '../cms/schema';
import { createCmsAnonClient } from '../cms/server';
import { getPublishedPageOverrides } from '../cms/api';

export interface HomepageCoverContent {
  label: string;
  hours: string;
  image: string;
  imageAlt: string;
  caption: string;
  headline: string;
  dispatch: string;
  primaryHref: string;
  primaryLabel: string;
}

export interface HomepageSectionHeading {
  label: string;
  title: string;
  sub?: string;
}

export interface HomepageEditorsLetterContent {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  pullQuote?: string;
  signatureName: string;
  signatureRole: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
}

export interface HomepageNewsletterContent {
  title: string;
  body: string;
  issueNumber?: string;
  issueDate?: string;
  previewHeadline?: string;
  previewItems?: string[];
}

export interface HomepageAdminContent {
  cover: HomepageCoverContent;
  mobile: Pick<HomepageCoverContent, 'label' | 'hours' | 'headline' | 'dispatch'>;
  places: HomepageSectionHeading;
  picks: Pick<HomepageSectionHeading, 'label' | 'title'>;
  editorsLetter: HomepageEditorsLetterContent;
  newsletter: HomepageNewsletterContent;
}

type HomepageDataShape = typeof homepageData & {
  admin?: Partial<HomepageAdminContent>;
};

const HOMEPAGE_DATA = homepageData as HomepageDataShape;

const DEFAULT_HOMEPAGE_ADMIN_CONTENT: HomepageAdminContent = {
  cover: {
    label: 'THE COVER STORY',
    hours: '9 MIN READ',
    image: '/images/sourced/home-cover-bay-umbrella-01.webp',
    imageAlt: 'A wide sandy bay beach with dune grass in the foreground, a bright red umbrella and chair to the right, and calm water under a blue sky.',
    caption: 'Bay beach, Mornington Peninsula',
    headline: 'The Hatted Restaurants of the <em>Peninsula.</em>',
    dispatch: 'Four two-hat restaurants. Seven one-hat tables. Barragunda is the debut, Tedesca took Regional Restaurant of the Year, and Laura is still where the long lunch happens. The complete list, with booking realities.',
    primaryHref: '/journal/hatted-restaurants-mornington-peninsula-2025/',
    primaryLabel: 'Read the cover story',
  },
  mobile: {
    label: 'THE COVER STORY',
    hours: '9 MIN READ',
    headline: 'The Hatted Restaurants of the <em>Peninsula.</em>',
    dispatch: 'Four two-hat restaurants. Seven one-hat tables. Barragunda is the debut, Tedesca took Regional Restaurant of the Year, and Laura is still where the long lunch happens. The complete list, with booking realities.',
  },
  places: {
    label: 'Know the terrain',
    title: 'The Peninsula, place by place',
    sub: 'Six towns that organise the region — ridge, coast, and bay.',
  },
  picks: {
    label: "This week's edit",
    title: 'Three reasons to go',
  },
  editorsLetter: {
    eyebrow: "Editor's Letter",
    title: 'On the <em>quiet authority</em> of a good autumn.',
    paragraphs: [
      'Autumn is the season the Peninsula stops performing. The weekend crowds thin, the vintage trucks finish their last runs, and the ridge takes on the colour it has for about six weeks a year.',
      "We've rebuilt the cellar-door shortlist from scratch this season, visited every restaurant on the long-lunch list at least twice, and walked every beach on the ranking.",
      "If this is your first issue with us, welcome. If you're returning, thanks for the patience through the refit.",
    ],
    pullQuote: 'This issue is built for the six weeks where the Peninsula is at its most itself, before winter settles in and the coast goes quiet.',
    signatureName: 'The Editors',
    signatureRole: 'Peninsula Insider',
    image: '/images/sourced/place-red-hill-01.webp',
    imageAlt: 'Vine rows in late-season colour, Red Hill',
    imageCaption: 'The last weekend of vintage, Red Hill, <em>the quietest a working winery ever gets.</em>',
  },
  newsletter: {
    title: 'The Peninsula briefing for <em>this weekend.</em>',
    body: "A concise note with the weekend’s best picks, open tables, cellar-door windows, and one useful walk — sent when there is something worth sharing.",
    issueNumber: '',
    issueDate: '',
    previewHeadline: '',
    previewItems: [],
  },
};

function mergeHomepageAdminContent(base: HomepageAdminContent, patch?: Partial<HomepageAdminContent>): HomepageAdminContent {
  return {
    cover: { ...base.cover, ...(patch?.cover ?? {}) },
    mobile: { ...base.mobile, ...(patch?.mobile ?? {}) },
    places: { ...base.places, ...(patch?.places ?? {}) },
    picks: { ...base.picks, ...(patch?.picks ?? {}) },
    editorsLetter: {
      ...base.editorsLetter,
      ...(patch?.editorsLetter ?? {}),
      paragraphs: patch?.editorsLetter?.paragraphs ?? base.editorsLetter.paragraphs,
    },
    newsletter: {
      ...base.newsletter,
      ...(patch?.newsletter ?? {}),
      previewItems: patch?.newsletter?.previewItems ?? base.newsletter.previewItems,
    },
  };
}

export function getHomepageAdminContent(): HomepageAdminContent {
  return mergeHomepageAdminContent(DEFAULT_HOMEPAGE_ADMIN_CONTENT, HOMEPAGE_DATA.admin);
}

/**
 * Build-time hook: fetch any published CMS overrides for entity_slug='home'
 * and return a fully merged HomepageAdminContent. Falls back to the
 * JSON-backed defaults when Supabase is not configured or returns no rows.
 *
 * Safe to call from `astro build` — uses the public anon key, gated by the
 * `cms_*_public_read_published` RLS policies in
 * ops/migrations/2026-05-10-pi-cms-public-read.sql.
 */
export async function loadHomepageContentWithCmsOverrides(): Promise<HomepageAdminContent> {
  const base = getHomepageAdminContent();
  const client = createCmsAnonClient();
  if (!client) return base;
  try {
    const { textFields, imageSlots } = await getPublishedPageOverrides(client, 'home');
    if (textFields.length === 0 && imageSlots.length === 0) return base;
    return applyHomepageCmsOverrides(base, textFields, imageSlots);
  } catch {
    return base;
  }
}

export interface HomepageOverrides {
  textFieldsByPath: Record<string, string>;
  imageSlotsByPath: Record<string, { src: string | null; alt: string | null; caption: string | null; credit: string | null }>;
}

/**
 * Lower-level companion to loadHomepageContentWithCmsOverrides — returns the
 * raw published CMS rows keyed by fieldPath. Useful when a page wants
 * per-field "use override only if explicitly set" semantics, so dynamic
 * seasonal/runtime values aren't overwritten by the JSON defaults.
 */
export async function loadPublishedHomepageOverrides(): Promise<HomepageOverrides> {
  const empty: HomepageOverrides = { textFieldsByPath: {}, imageSlotsByPath: {} };
  const client = createCmsAnonClient();
  if (!client) return empty;
  try {
    const { textFields, imageSlots } = await getPublishedPageOverrides(client, 'home');
    const textFieldsByPath: Record<string, string> = {};
    for (const f of textFields) {
      if (typeof f.value === 'string' && f.value.length > 0) textFieldsByPath[f.fieldPath] = f.value;
    }
    const imageSlotsByPath: HomepageOverrides['imageSlotsByPath'] = {};
    for (const s of imageSlots) {
      const src = s.publicUrl ?? s.storagePath;
      if (!src) continue;
      imageSlotsByPath[s.fieldPath] = {
        src,
        alt: s.altText,
        caption: s.caption,
        credit: s.credit,
      };
    }
    return { textFieldsByPath, imageSlotsByPath };
  } catch {
    return empty;
  }
}

export function applyHomepageCmsOverrides(
  content: HomepageAdminContent,
  textFields: CmsEditableTextField[] = [],
  imageSlots: CmsEditableImageSlot[] = [],
): HomepageAdminContent {
  const next = structuredClone(content);

  for (const field of textFields) {
    if (field.entityType !== 'page' || field.entitySlug !== 'home' || !field.value) continue;
    switch (field.fieldPath) {
      case 'cover.label': next.cover.label = field.value; break;
      case 'cover.hours': next.cover.hours = field.value; break;
      case 'cover.caption': next.cover.caption = field.value; break;
      case 'cover.headline': next.cover.headline = field.value; break;
      case 'cover.dispatch': next.cover.dispatch = field.value; break;
      case 'mobile.label': next.mobile.label = field.value; break;
      case 'mobile.hours': next.mobile.hours = field.value; break;
      case 'mobile.headline': next.mobile.headline = field.value; break;
      case 'mobile.dispatch': next.mobile.dispatch = field.value; break;
      case 'places.label': next.places.label = field.value; break;
      case 'places.title': next.places.title = field.value; break;
      case 'places.sub': next.places.sub = field.value; break;
      case 'picks.label': next.picks.label = field.value; break;
      case 'picks.title': next.picks.title = field.value; break;
      case 'editors-letter.eyebrow': next.editorsLetter.eyebrow = field.value; break;
      case 'editors-letter.title': next.editorsLetter.title = field.value; break;
      case 'editors-letter.pullQuote': next.editorsLetter.pullQuote = field.value; break;
      case 'editors-letter.signatureName': next.editorsLetter.signatureName = field.value; break;
      case 'editors-letter.signatureRole': next.editorsLetter.signatureRole = field.value; break;
      case 'newsletter.title': next.newsletter.title = field.value; break;
      case 'newsletter.body': next.newsletter.body = field.value; break;
      case 'newsletter.previewHeadline': next.newsletter.previewHeadline = field.value; break;
      default:
        if (field.fieldPath.startsWith('editors-letter.paragraphs.')) {
          const index = Number(field.fieldPath.split('.').pop());
          if (!Number.isNaN(index) && next.editorsLetter.paragraphs[index] !== undefined) next.editorsLetter.paragraphs[index] = field.value;
        }
        if (field.fieldPath.startsWith('newsletter.previewItems.')) {
          const index = Number(field.fieldPath.split('.').pop());
          if (!Number.isNaN(index) && next.newsletter.previewItems?.[index] !== undefined) next.newsletter.previewItems[index] = field.value;
        }
        break;
    }
  }

  for (const slot of imageSlots) {
    if (slot.entityType !== 'page' || slot.entitySlug !== 'home') continue;
    const src = slot.publicUrl ?? slot.storagePath;
    if (!src) continue;
    switch (slot.fieldPath) {
      case 'cover.image':
        next.cover.image = src;
        if (slot.altText) next.cover.imageAlt = slot.altText;
        if (slot.caption) next.cover.caption = slot.caption;
        break;
      case 'editors-letter.image':
        next.editorsLetter.image = src;
        if (slot.altText) next.editorsLetter.imageAlt = slot.altText;
        if (slot.caption) next.editorsLetter.imageCaption = slot.caption;
        break;
      default:
        break;
    }
  }

  return next;
}
