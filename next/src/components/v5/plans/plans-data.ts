/**
 * plans-data - build-time model for the /plans/ decision engine (T-602).
 *
 * One plan type (P10): editorial itineraries (content/itineraries) and
 * plans-section articles (content/articles, section: plans) are merged into
 * a single PlanRecord shape. Facets come from the shared adapter
 * (lib/facets getFacets), so the context chips are presets over the same
 * taxonomy the rest of the site filters on.
 *
 * The page embeds this model as JSON for the client-side context swap;
 * the default context (Weekend) is server-rendered from the same data so
 * the page is complete with JS disabled.
 *
 * House rules: no em-dashes, no dollar figures, no tourism adjectives.
 */
import { getCollection } from 'astro:content';
import {
  getFacets,
  auSeason,
  CHIP_PRESETS,
  FACET_OPTIONS,
  type FacetKey,
} from '../../../lib/facets';
import { routeSlug, venueHref, titleize } from '../../../lib/editorial';
import { loadOverrides } from '../../../lib/inline-edit/overrides';

export interface PlanStop {
  /** Save-store kind for referenced stops ('venue' | 'experience' | 'article'). */
  kind?: string;
  slug?: string;
  title: string;
  href?: string;
  note?: string;
  day: number;
}

export interface PlanRecord {
  id: string;
  /** CMS entity type: 'itinerary' or 'article'. */
  entityType: 'itinerary' | 'article';
  slug: string;
  title: string;
  /** Verdict line, clipped to 25 words or fewer. */
  verdict: string;
  href: string;
  image: { src: string; alt: string } | null;
  /** editableImage fieldPath ('heroImage' for itineraries, 'hero' for articles). */
  imageField: string;
  meta: string[];
  dayCount?: number;
  stops: PlanStop[];
  facets: Partial<Record<FacetKey, string[]>>;
  publishedAt: number;
}

export interface PlanContext {
  /** URL value for ?context= (facet value slug, unique across keys). */
  id: string;
  key: FacetKey;
  value: string;
  label: string;
  /** Editor-voice heading above the featured plan. */
  featuredLabel: string;
  /** Ranked plan ids: [featured, alt1, alt2, ...rest]. */
  planIds: string[];
}

export interface PlansModel {
  plans: PlanRecord[];
  contexts: PlanContext[];
  defaultContextId: string;
  season: string;
}

const REGION_LABELS = new Map(
  FACET_OPTIONS.place.slice(0, 5).map((o) => [o.value, o.label]),
);
const PARTY_LABELS = new Map(FACET_OPTIONS.party.map((o) => [o.value, o.label]));

/** First sentence, clamped to 25 words (Card verdict rule). */
function verdictLine(text: string | undefined): string {
  const src = (text ?? '').trim();
  if (!src) return '';
  const sentence = src.split(/(?<=[.?])\s+/)[0] ?? src;
  const words = sentence.split(/\s+/);
  if (words.length <= 25) return sentence;
  return `${words.slice(0, 22).join(' ')}...`;
}

function metaFor(record: {
  facets: Partial<Record<FacetKey, string[]>>;
  dayCount?: number;
}): string[] {
  const chips: string[] = [];
  const dates = record.facets.date ?? [];
  if (record.dayCount) {
    chips.push(record.dayCount === 1 ? 'One day' : `${record.dayCount} days`);
  } else if (dates.includes('one-day')) {
    chips.push('One day');
  } else if (dates.includes('weekend')) {
    chips.push('Weekend');
  }
  const region = (record.facets.place ?? []).find((p) => REGION_LABELS.has(p));
  if (region) chips.push(REGION_LABELS.get(region)!);
  const party = (record.facets.party ?? [])[0];
  if (party && PARTY_LABELS.has(party)) chips.push(PARTY_LABELS.get(party)!);
  return chips.slice(0, 3);
}

async function heroFor(
  entityType: 'itinerary' | 'article',
  slug: string,
  fallback: { src?: string; alt?: string } | undefined,
  title: string,
): Promise<{ src: string; alt: string } | null> {
  // Same override chain the current hub uses so editor-uploaded heroes ship.
  const ov = await loadOverrides(entityType, slug);
  const o = ov.image['hero'] ?? ov.image['heroImage'];
  const src = o?.src ?? fallback?.src;
  if (!src) return null;
  return { src, alt: o?.alt ?? fallback?.alt ?? title };
}

export async function buildPlansModel(now: Date = new Date()): Promise<PlansModel> {
  const season = auSeason(now);

  // ---- stop resolution lookups -------------------------------------------
  const venues = await getCollection('venues');
  const experiences = await getCollection('experiences');
  const venueBySlug = new Map(
    venues.map((v) => [
      routeSlug(v) as string,
      { title: v.data.name as string, href: venueHref(v) },
    ]),
  );
  const expBySlug = new Map(
    experiences.map((e) => [
      routeSlug(e) as string,
      { title: (e.data as any).name as string, href: `/explore/${routeSlug(e)}/` },
    ]),
  );

  const refId = (v: unknown): string | null => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object' && typeof (v as any).id === 'string') return (v as any).id;
    return null;
  };

  // ---- itineraries --------------------------------------------------------
  const itineraries = await getCollection('itineraries');
  const itineraryRecords: PlanRecord[] = await Promise.all(
    itineraries.map(async (it) => {
      const slug = routeSlug(it) as string;
      const stops: PlanStop[] = (it.data.stops ?? []).map((s: any) => {
        const venueSlug = refId(s.venue);
        const expSlug = refId(s.experience);
        if (venueSlug && venueBySlug.has(venueSlug)) {
          const v = venueBySlug.get(venueSlug)!;
          return { kind: 'venue', slug: venueSlug, title: v.title, href: v.href, note: s.note, day: s.day };
        }
        if (expSlug && expBySlug.has(expSlug)) {
          const e = expBySlug.get(expSlug)!;
          return { kind: 'experience', slug: expSlug, title: e.title, href: e.href, note: s.note, day: s.day };
        }
        return { title: s.note ? String(s.note).split(/(?<=[.?])\s+/)[0] : 'Stop', note: s.note, day: s.day };
      });
      const dayCount = Math.max(it.data.lengthNights + 1, ...stops.map((s) => s.day), 1);
      const facets = getFacets('itinerary', it.data);
      const base: PlanRecord = {
        id: `it-${slug}`,
        entityType: 'itinerary',
        slug,
        title: it.data.title,
        verdict: verdictLine(it.data.dek),
        href: `/explore/plans/${slug}/`,
        image: await heroFor('itinerary', slug, it.data.heroImage, it.data.title),
        imageField: 'heroImage',
        meta: [],
        dayCount,
        stops,
        facets,
        publishedAt: it.data.publishedAt?.getTime?.() ?? 0,
      };
      base.meta = metaFor(base);
      return base;
    }),
  );

  // ---- plans articles ------------------------------------------------------
  const plansArticles = await getCollection(
    'articles',
    ({ data }: any) => data.status === 'published' && (data.section ?? 'journal') === 'plans',
  );
  const articleRecords: PlanRecord[] = await Promise.all(
    plansArticles.map(async (a) => {
      const slug = routeSlug(a) as string;
      // These records are rendered by /explore/plans/[slug]. The former
      // journal URL is a legacy redirect stub, never a valid internal target.
      const href = `/explore/plans/${slug}/`;
      const title = a.data.title as string;
      const facets = getFacets('article', a.data);
      const base: PlanRecord = {
        id: `ar-${slug}`,
        entityType: 'article',
        slug,
        title,
        verdict: verdictLine(a.data.dek),
        href,
        image: await heroFor('article', slug, a.data.heroImage, title),
        imageField: 'hero',
        meta: [],
        // Articles have no stop list; forking adds the plan itself as the
        // first trip entry (the reader picks stops on the detail page).
        stops: [{ kind: 'article', slug, title, href, note: 'Read the plan, then swap in your own stops.', day: 1 }],
        facets,
        publishedAt: a.data.publishedAt?.getTime?.() ?? 0,
      };
      base.meta = metaFor(base);
      return base;
    }),
  );

  const plans = [...itineraryRecords, ...articleRecords];

  // ---- contexts ------------------------------------------------------------
  // CHIP_PRESETS.plans is the vocabulary; Weekend leads as the server default
  // and the seasonal chip wears the current season's name.
  const presets = [...(CHIP_PRESETS.plans ?? [])].sort((a, b) => {
    const order = ['weekend', 'one-day', 'family', 'couples', 'food-wine', 'rainy-day', 'this-season'];
    return order.indexOf(a.value) - order.indexOf(b.value);
  });

  const featuredLabels: Record<string, string> = {
    weekend: `The ${season} weekend, solved`,
    'one-day': 'One day, one clean line',
    family: 'The family day, sorted',
    couples: 'The couples escape, decided',
    'food-wine': 'Food and wine, sequenced',
    'rainy-day': 'The rainy day, answered',
    'this-season': `What ${season} is for`,
  };

  const rank = (p: PlanRecord) =>
    (p.stops.length > 1 ? 2 : 0) + ((p.facets.date ?? []).includes('this-season') ? 1 : 0);

  const contexts: PlanContext[] = presets.map((chip) => {
    const matched = plans
      .filter((p) => (p.facets[chip.key] ?? []).includes(chip.value))
      .sort((a, b) => rank(b) - rank(a) || b.publishedAt - a.publishedAt);
    if (matched.length === 0) {
      console.warn(`[plans] context "${chip.value}" matched zero plans`);
    }
    return {
      id: chip.value,
      key: chip.key,
      value: chip.value,
      label: chip.value === 'this-season' ? titleize(season) : chip.label,
      featuredLabel: featuredLabels[chip.value] ?? chip.label,
      planIds: matched.map((p) => p.id),
    };
  });

  return { plans, contexts, defaultContextId: 'weekend', season };
}
