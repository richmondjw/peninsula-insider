import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Peninsula Insider  -  Content schema (cache-bust: 2026-05-24)
//
// Astro v6 Content Layer format. Each collection declares its own glob loader
// pointing at the JSON or Markdown files under src/content/<name>/.
// Schemas are unchanged from the v5 legacy config — only the wrapper shape
// is new.

const zone = z.enum([
  'mornington',      // was 'bayside'
  'bay-coast',       // new — covers Dromana–Rye coastal strip
  'red-hill',        // was 'red-hill-plateau'
  'hinterland',      // unchanged
  'peninsula-tip',   // was 'tip' and 'back-beaches' (consolidated)
  'ocean-coast',     // unchanged
  'western-port',    // unchanged
]);

const season = z.enum(['spring', 'summer', 'autumn', 'winter', 'all-year']);

const mood = z.enum([
  'long-lunch',
  'anniversary',
  'family',
  'rainy-day',
  'sunset',
  'slow',
  'wellness',
  'romance',
  'first-date',
  'big-group',
  'solo',
  'quick-bite',
  'weekend-escape',
  'cellar-door',
  'walk',
  'beach',
  'fireplace',
  'view',
  'rooftop',
  'garden',
  'waterfront',
  'golf',
  'outdoor',
  'surf',
  'worth-the-drive',
]);

const audience = z.enum([
  'couples',
  'families',
  'solo',
  'group',
  'locals',
  'first-timers',
]);

/**
 * The coarse licence bucket recorded against an image.
 *
 * `unknown` is the default and it is a real state, not a placeholder for one.
 * Until 2026-09-14 the default was `venue-media-kit`, so every record that
 * omitted the field was silently parsed as covered by a media-kit grant that
 * nobody had recorded. A default must never manufacture a legal claim: a
 * missing value means nobody has said, and "nobody has said" is not
 * "permitted". Absence is now visible to the build - scripts/
 * audit-media-provenance.mjs counts it as `licenceUnknown` and ratchets it,
 * so the pool of unknown-licence images can shrink but never grow.
 *
 * Do not set this field from a credit string or a source filename. Neither
 * establishes a licence; see the note on `imageUse` below.
 */
const imageLicense = z.enum([
  'unknown',
  'original-commissioned',
  'venue-media-kit',
  'visit-victoria',
  'wikimedia-cc0',
  'wikimedia-cc-by',
  'wikimedia-cc-by-sa',
  'tmp-unsplash',
  'tmp-wikimedia',
  'tmp-pexels',
  'other-licensed',
]);

/**
 * Does the photograph show the thing the page is about, or something else?
 *
 * This is the field the corpus did not have. A photograph OF a venue and a
 * photograph EVOKING the region around it are two different claims, and a
 * sighted reader looking at a hero image has had no way to tell which one is
 * in front of them. Alt text is not that disclosure: alt text serves
 * screen-reader users, and a reader who can see the photograph never
 * receives it.
 *
 *   actual        the photograph shows this entity. A positive claim, and
 *                 only assertable where the record says where the image came
 *                 from (see `creator` / `sourceUrl` / `permission`).
 *   illustrative  the photograph shows something else: the locality, the
 *                 category, the region. Renders a visible disclosure.
 *   unverified    nobody has recorded which of the two it is. The default,
 *                 and deliberately NOT a synonym for `actual`. An unrecorded
 *                 image may never be presented as a depiction of the entity.
 */
const depictionStatus = z.enum(['actual', 'illustrative', 'unverified']);

/**
 * What the recorded permission actually allows. Empty means nothing has been
 * recorded, which is not the same as "nothing is permitted" and is very much
 * not the same as "everything is permitted". A credit string and a source
 * filename do not establish a licence, so neither may populate this.
 */
const imageUse = z.enum(['website', 'social', 'print', 'derivative', 'commercial']);

/** Has a human checked the provenance record below, and did it hold up? */
const provenanceReview = z.enum(['unreviewed', 'verified', 'disputed']);

/**
 * How far the rights record has actually got.
 *
 * The distinction this exists to make is between "nobody has looked" and
 * "somebody looked and could not find out". Both leave `creator`, `sourceUrl`
 * and `permission` empty, and without this field they are indistinguishable,
 * so a record that has already defeated one researcher looks identical to one
 * nobody has opened. Worse, an absent field reads as an invitation to guess.
 *
 *   unrecorded  the default. Nobody has recorded where this image came from.
 *   unknown     somebody tried and the rights could not be established. A
 *               recorded fact, not an absence, and the state the media debt
 *               of 28 July 2026 should have been able to occupy.
 *   recorded    the fields below say where the image came from and on what
 *               terms, and `rightsEstablishedOn` says when that was checked.
 *
 * Deliberately NOT a synonym for `license`. `license` is a coarse bucket with
 * a permissive default (see A15), so a record can carry a licence value and
 * still be `unrecorded` here. That gap is the point: it is what makes the
 * default-value rights claim visible instead of silent.
 */
const rightsStatus = z.enum(['unrecorded', 'unknown', 'recorded']);

const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const imageRef = z.object({
  src: z.string(),
  alt: z.string(),
  // Free-form attribution string. Set to the literal "jem" for any photo
  // taken by James and Emma; templates (lib/editorial.formatHeroCredit)
  // render that sentinel as "Photograph by jem". Anything else renders
  // as "Photo · {credit}".
  credit: z.string(),
  // Absence of a recorded licence reads as `unknown`, never as a grant.
  license: imageLicense.default('unknown'),
  caption: z.string().optional(),

  // Media provenance (PI-013).
  //
  // Every field below is optional and additive. A record carrying none of
  // them is unchanged on disk and renders exactly as it did before.
  //
  // `credit` above is a DISPLAY string and `license` is a coarse bucket
  // defaulting to `unknown`; neither is a recorded grant. The fields here are
  // the recorded ones, and the rule for all of them is the same: never write
  // a value that cannot be sourced from the image record itself. An inferred
  // rights holder is worse than an absent one.
  //
  // Enforced by scripts/audit-media-provenance.mjs; the visible disclosure is
  // rendered by src/components/MediaProvenanceNote.astro.

  /** What the photograph actually shows, in the photographer's terms. */
  depicts: z.string().optional(),
  /** Actual depiction, illustrative stand-in, or nobody has said. */
  depictionStatus: depictionStatus.default('unverified'),
  /** Who made the image. Distinct from `credit`, which is display text. */
  creator: z.string().optional(),
  /** Where the image was obtained: file page, media kit, upload receipt. */
  sourceUrl: z.string().optional(),
  /** The permission as recorded at that source, verbatim. Never inferred. */
  permission: z.string().optional(),
  /** Channels that permission actually covers. Empty means unrecorded. */
  permittedUses: z.array(imageUse).default([]),
  /**
   * Who holds the rights, where that is not the person who made the image.
   * A gallery, an estate, an agency, an operator's media kit. Left empty when
   * the creator holds them or when nobody has recorded it - never assumed
   * from `credit`, which is display text.
   */
  rightsHolder: z.string().optional(),
  /**
   * The date the recorded permission was established, ISO `YYYY-MM-DD`.
   *
   * This is a record of when a human checked, not a clock the build reads.
   * Nothing asserts on it and nothing expires because of it: a date-driven
   * gate wires the calendar into `npm run build` and fails deploys with no
   * content change, which audit-event-safeguards.mjs already documents as a
   * mistake not to repeat. It is here so a rights claim can be dated, and so
   * a stale one can be found deliberately rather than enforced accidentally.
   */
  rightsEstablishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Unrecorded, actively unknown, or recorded. See `rightsStatus` above. */
  rightsStatus: rightsStatus.default('unrecorded'),
  /**
   * Purely decorative: the frame carries no identifiable subject, so there is
   * nothing to describe that is not filler.
   *
   * Renders `alt=""` plus `role="presentation"`, which is what tells a screen
   * reader to skip the image entirely. That is the correct outcome for an
   * atmosphere photograph and it is NOT what the corpus had: 152 records
   * carried alt text announcing the image was "representative", which tells a
   * screen-reader user the picture is filler while a sighted reader sees a
   * specific place. Empty and marked is honest; "representative" is not.
   *
   * Decorative is about the frame, not about the rights. A decorative image
   * that stands in for a named entity is still `illustrative`, still carries
   * the visible disclosure, and still needs provenance.
   */
  decorative: z.boolean().default(false),
  /** Focal point for cropping, 0..1 from the top left of the source image. */
  focalPoint: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .optional(),
  /** Moderation state of the provenance record above. */
  provenanceReview: provenanceReview.default('unreviewed'),
});

const tagBlock = z.object({
  mood: z.array(mood).default([]),
  season: z.array(season).default([]),
  audience: z.array(audience).default([]),
});

const authorityBlock = z
  .object({
    hats: z.number().min(0).max(3).optional(),
    hallidayScore: z.number().min(0).max(100).optional(),
    awards: z.array(z.string()).default([]),
    pressMentions: z.array(z.string()).default([]),
  })
  .optional();

/**
 * PI-004  -  provenance, kept apart from selection.
 *
 * Three dates had collapsed into one field. A record carried `lastVerified`
 * (or `lastCheckedDate`), a publish job could advance it, a page rendered it
 * as "Reviewed April 2026", and structured data emitted it as a modification
 * date. So one number was answering three different questions at once:
 *
 *   reviewed      an editor last looked at this record and its copy
 *   fact-checked  a source was actually read and the facts still stood
 *   selected      the record was picked for a list this week
 *
 * Those move independently. A venue can be selected for this weekend's slate
 * while the visit behind its copy happened in autumn and nothing has been
 * rechecked since. Collapsing them means a selection refresh silently
 * republishes a verification claim, which is the defect this block exists to
 * make impossible.
 *
 * Additive by design. No legacy date field is removed: `lastVerified` and
 * `lastCheckedDate` stay exactly where they are, and stay the fallback for
 * the review line. Nothing here is required, and the safe answer is the
 * default: `researched`, no check date, checked by the desk.
 *
 * Deliberately NOT migrated. The corpus carries bulk stamps (88 of 138
 * venues share one date; six collections carry a single stamp applied inside
 * 48 hours and never touched since), and a bulk stamp does not evidence a
 * check of any particular record. Copying those dates into `checkedOn` would
 * launder them into something stronger than they are, so `checkedOn` starts
 * empty everywhere and fills only when a check is genuinely earned. Absent
 * means unknown, and unknown is the honest answer today.
 */
const provenanceMethod = z.enum([
  /** Desk research against published sources. The publication's normal
   *  standard, and the default: most records are this, and it is not an
   *  apology. */
  'researched',
  /** Somebody went. Requires a visit record below, always. */
  'visited',
  /** Assembled from other records that carry their own provenance, as a hub
   *  page is assembled from the entries it lists. */
  'compiled',
]);

const provenanceBlock = z
  .object({
    method: provenanceMethod.default('researched'),
    /**
     * When an editor last reviewed the record. A review is not a check: it
     * means somebody read the copy, not that a source was re-read.
     */
    reviewedOn: z.coerce.date().optional(),
    /**
     * When a source was last actually read and the facts still stood. This
     * is the only date a reader may be shown as a fact check, and nothing
     * on a publish or regeneration path may advance it. Absent means no
     * check is on file, which is a thing a reader is entitled to know.
     */
    checkedOn: z.coerce.date().optional(),
    /**
     * Who did the check, as a process rather than a person. Naming a person
     * is a separate decision that has not been taken, so these two values
     * are the whole enum: the desk, or the engine that ran the job.
     */
    checkedBy: z.enum(['desk', 'engine']).default('desk'),
    /** Where the check was made: a URL, an authority, a phone call. */
    source: z.string().optional(),
    /**
     * The visit record. Required before anything may claim a visit, which is
     * the point of it: first-hand copy is a stronger claim than research and
     * has to be backed by something an editor wrote down at the time.
     */
    visit: z
      .object({
        occurredOn: z.coerce.date(),
        note: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'visited' && !value.visit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['visit'],
        message:
          "editorialProvenance.method 'visited' requires an editorialProvenance.visit " +
          'record. An undocumented visit is research, so use method "researched".',
      });
    }
  })
  .optional();

/**
 * Selection is curation, not provenance: when this record was picked for a
 * list, and which list. It sits beside provenance rather than inside it so
 * that a selection refresh has somewhere to write that is nowhere near a
 * check date.
 */
const selectionBlock = z
  .object({
    selectedOn: z.coerce.date().optional(),
    /** The slate or list it was selected for. */
    selectedFor: z.string().optional(),
    note: z.string().optional(),
  })
  .optional();

/**
 * Spread into a collection schema as one line, so adding provenance to a
 * collection is a one-line edit and the shape stays defined in one place.
 */
const provenanceFields = {
  /**
   * Named `editorialProvenance`, not `provenance`, because `provenance` is
   * already taken on the events collection by the importer's own note: a
   * free-text string recording which job promoted the row and from which
   * feed. That is machine provenance, where a row came from. This is
   * editorial provenance, how the publication knows what it is publishing.
   * They are genuinely different facts, so they keep different names
   * rather than one being migrated onto the other.
   */
  editorialProvenance: provenanceBlock,
  selection: selectionBlock,
};

/**
 * What a source link probe last saw. PI-007 found 45 of the corpus's 459
 * source URLs dead, 19 of them on domains that no longer resolve, and nothing
 * on this site could see one of them. A verification date whose source cannot
 * be read is unfalsifiable, and the claim it stamps is unsupported without
 * anyone ever having edited it.
 *
 * `blocked` is deliberately its own value and is NOT a failure. The council is
 * this corpus's most-cited publisher and refuses most automated reads; folding
 * that into `dead` would demand deleting a third of the site's provenance over
 * a robots policy. An honest unknown is a legitimate state.
 *
 * Written from ops/reports/content/link-health-ledger.json by a probe that
 * actually fetched the URL. Never inferred at read time.
 */
const sourceHealth = z.enum(['ok', 'blocked', 'moved', 'dead', 'parked', 'tls-fault', 'unknown']);

/**
 * A source link that was removed from the field a reader clicks, kept here so
 * the removal is a record rather than a disappearance.
 *
 * The rule PI-007 works to: a dead source is never silently deleted. Either it
 * is replaced with one that was fetched and read, or the claim it stood behind
 * is marked unsourced and stays visible to the registry and the blind-spot
 * reporting. A claim that quietly loses its citation looks better and is worse.
 */
const retiredSourceLink = z.object({
  /** The field this URL used to occupy: `website`, `bookingUrl`, `url`. */
  field: z.string(),
  url: z.string(),
  verdict: sourceHealth,
  /** What was decided, in the PI-007 vocabulary. */
  disposition: z.enum(['moved', 'replaced', 'archived', 'gone']),
  /** Only set for moved/replaced/archived, and only after fetching it. */
  replacement: z.string().optional(),
  /** The date the probe ran. Not a verification date: nothing was verified. */
  checkedOn: z.coerce.date(),
  note: z.string().optional(),
});

/**
 * Spread into a collection schema as one line. Zod strips unknown keys
 * silently, so a field that is not declared here vanishes from the build with
 * no error - which is exactly how la-baracca-tgallant.json published a closed
 * restaurant as trading.
 */
const sourceHealthFields = {
  /**
   * What the last link probe saw at this record's source, and when. A record
   * whose source is dead is not sourced any more, and this is the field that
   * says so out loud instead of letting a verification date imply a source
   * that can still be read.
   */
  sourceHealth: sourceHealth.optional(),
  sourceHealthCheckedOn: z.coerce.date().optional(),
  /**
   * Set when this record's own source no longer supports it. `unsourced`
   * means nothing stands behind the claim any more; `disputed` means two
   * sources that were both read disagree and neither was picked as the
   * winner. Both are states an editor resolves, not states a script guesses.
   */
  sourceStatus: z.enum(['unsourced', 'disputed']).optional(),
  /** Free text naming what needs deciding. Read by the PI-007 editor queue. */
  sourceStatusNote: z.string().optional(),
  retiredSourceLinks: z.array(retiredSourceLink).default([]),
};

const venues = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/venues' }),
  schema: z.object({
    slug: z.string(),
    /**
     * The slug this record used to publish under, kept when a venue is
     * renamed so the old URL is a recorded fact rather than a disappearance.
     * stillwater-crittenden.json is now `crittenden-restaurant` and carried
     * the old name in this key; undeclared, so the rename left no trace the
     * build could see and nothing could have built a redirect from it.
     */
    previousSlug: z.string().optional(),
    name: z.string(),
    type: z.enum([
      'restaurant',
      'winery',
      'cafe',
      'bakery',
      'pub',
      'brewery',
      'distillery',
      'producer',      // deprecated — keep during migration, remove after PR-3
      'providore',     // NEW — farmgate, cheesemonger, fishmonger, produce store
      'market',
      'hotel',
      'villa',
      'cottage',
      'glamping',
      'farm-stay',
      'spa',
      'walk',
      'beach',
      'activity',
    ]),
    /**
     * Whether this record represents an overnight stay and may appear in
     * Stay inventory. Day spas and other wellness-only records remain in the
     * venue catalogue without being misrepresented as accommodation.
     */
    stayEligible: z.boolean().default(true),
    /**
     * Optional free-text sub-classification within a type.
     * Examples: type=cafe + subtype=roaster, type=providore + subtype=fishmonger.
     * Surfaced as a secondary chip on venue cards and detail pages.
     */
    subtype: z.string().optional(),
    /**
     * Estate grouping — links this venue to a parent multi-venue estate.
     * When set, VenueDetailTemplate renders an EstateCluster block showing
     * sibling venues. Value matches an estateSlug from the confirmed
     * multi-venue estate list (see PR-7 spec).
     */
    estateSlug: z.string().optional(),
    estateLabel: z.string().optional(),
    /**
     * Editorial tier — drives verdict block visibility and listing sort order.
     *   destination  full editorial treatment, verdict block shown
     *   recommended  listed and linked, no verdict block
     *   directory    directory-only entry, minimal page
     */
    venueTier: z.enum(['destination', 'recommended', 'directory']).default('destination'),
    place: reference('places'),
    zone,
    /**
     * Wine-region subregion (GI sub-area), distinct from `place` and `zone`.
     * A vineyard's subregion is frequently not its postal town: Kooyong sits
     * in Tuerong with a Main Ridge address, Ocean Eight in Shoreham, Yabby
     * Lake in Moorooduc with a Tuerong address.
     *
     * Three subregion pages - wine/flinders, wine/merricks and
     * wine/moorooduc-tuerong - already filter on `v.data.subregion`, and every
     * one of those tests evaluated against `undefined`, because the key was
     * never declared and Zod stripped it from all 21 wineries carrying one.
     */
    subregion: z.string().optional(),
    coordinates,
    address: z.string(),
    phone: z.string().optional(),
    /**
     * Operator contact address. Undeclared until now, so the one venue that
     * recorded one had it discarded on load - the worst shape this defect
     * takes, because the corrections and partner-enquiry desks then believe
     * they have a way to reach an operator that the build cannot see.
     */
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    /**
     * Authoritative third-party profiles, emitted as schema.org `sameAs` and
     * rendered as the "Region listing" and "Halliday listing" rows on the
     * venue page.
     *
     * lib/schema.ts reads `data.sameAs?.mpva` and `data.sameAs?.halliday` and
     * VenueDetailTemplate renders both; neither ever saw a value, because the
     * key was not declared and Zod stripped it from all 21 wineries that
     * carry one. The links were written, and no reader was ever shown one.
     */
    sameAs: z
      .object({
        /** The producer's own site, where it differs from `website`. */
        officialSite: z.string().url().optional(),
        /** Halliday Wine Companion profile. */
        halliday: z.string().url().optional(),
        /** Mornington Peninsula Vignerons Association listing. */
        mpva: z.string().url().optional(),
      })
      .optional(),
    bookingUrl: z.string().url().optional(),
    bookingProvider: z
      .enum([
        'opentable',
        'tock',
        'resy',
        'sevenrooms',
        'direct',
        'booking.com',
        'stayz',
        'airbnb',
        'peninsula-hot-springs',
        'none',
      ])
      .optional(),
    priceBand: z.enum(['$', '$$', '$$$', '$$$$']),
    authority: authorityBlock,
    signature: z.string(),
    editorNote: z.string(),
    tags: tagBlock,
    dogFriendly: z.boolean().default(false),
    dogFriendlyNotes: z.string().optional(),
    dogsAllowedOutdoorsOnly: z.boolean().optional(),
    offLeashNearby: z.boolean().optional(),
    waterAccessNearby: z.boolean().optional(),
    dogAmenities: z.array(z.enum(['bowl', 'outdoor-seating', 'enclosed-area', 'treats', 'dog-menu'])).default([]),
    nearbyVet: z.string().optional(),
    nearbyDaycare: z.string().optional(),
    rainyDayDogSuitability: z.enum(['low', 'medium', 'high']).optional(),
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    affiliateNote: z.string().optional(),
    featuredPartner: z.boolean().default(false),
    /**
     * Editorial pick flag. Set true on venues that are surfaced as curated
     * highlights on hub pages (Plans hub stay highlights, Wine hub benchmarks).
     * Distinct from featuredPartner (commercial) — this is a purely editorial
     * signal. Hubs filter by type + editorPick to build their curated rails.
     * Editorial team can update via schema; no source-code change needed.
     */
    editorPick: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    /**
     * LEGACY bulk stamp. Not a fact-check date, and never renderable as one.
     *
     * All 21 wine venues that carry this key carry the identical value
     * 2026-04-01, applied to the set in one pass. That is the textbook bulk
     * stamp the provenance block above refuses to launder: one date applied
     * to twenty-one records evidences a batch job, not a check of any
     * particular venue. `editorialProvenance.checkedOn` remains the ONLY date
     * a reader may be shown as a fact check, and it stays empty here until a
     * check is genuinely earned per record.
     *
     * Declared rather than deleted because this repository does not delete
     * evidence to tidy a schema (see `verificationStatus` vs `verification`
     * on events, and `lastVerified` / `lastCheckedDate` above). Declared
     * rather than migrated because migrating it into `checkedOn` would turn a
     * batch stamp into the strongest claim the publication makes. It was
     * being silently discarded on load, which is the defect; this stops the
     * discard without promoting the value.
     *
     * Do not read this field on any reader-facing surface.
     */
    lastFactVerified: z.coerce.date().optional(),
    ...provenanceFields,
    ...sourceHealthFields,
    /**
     * Free-text hours summary surfaced on the venue page (e.g.
     * "Sat–Sun 11am–5pm" or "Closed Tue–Wed"). Optional. When absent,
     * the page falls back to the "Check live status" link only.
     */
    hoursNote: z.string().optional(),
    /**
     * Optional override for the live-status link URL. When omitted the
     * page builds a Google Maps search query from the venue name and
     * address, which is generally good enough to land on the operator's
     * Google profile with current open/closed state and live hours.
     */
    liveStatusUrl: z.string().url().optional(),
    /**
     * Visiting block - the practical access facts an operator publishes.
     * Present on 28 venues (25 with real opening hours; three appointment-only
     * producers carry an empty `openingHours` array, so presence of `visiting`
     * is never enough on its own - templates must test the length).
     *
     * Deliberately permissive. The block was hand-authored before it had a
     * schema, so the shapes are uneven: `tastingFee` is a string on 15 venues
     * and an explicit null on 6, `days` is an array everywhere today but the
     * templates already tolerate a bare string, and times are plain "HH:MM"
     * strings rather than a validated pattern. A validation failure here fails
     * the whole build, so every field is optional and no format is enforced.
     *
     * openingHours mirrors the schema.org OpeningHoursSpecification shape and
     * is emitted as such in the venue JSON-LD (lib/schema.ts, and
     * VenueDetailTemplate for the eat and stay surfaces).
     */
    visiting: z
      .object({
        openingHours: z
          .array(
            z.object({
              days: z.union([z.array(z.string()), z.string()]).optional(),
              opens: z.string().optional(),
              closes: z.string().optional(),
            })
          )
          .optional(),
        bookingRequired: z.boolean().optional(),
        bookingNotes: z.string().optional(),
        tastingFee: z.string().nullable().optional(),
        tastingNote: z.string().optional(),
      })
      .optional(),
    /**
     * On-site dining room, for venues whose primary type is not a restaurant
     * (14 wineries). Drives the Winery kitchens module on the wine hub, the
     * restaurant section on the venue page, and the Restaurant JSON-LD node.
     * `hats` is the Good Food Guide count; it is a rating, never a price.
     */
    restaurant: z
      .object({
        name: z.string().optional(),
        hats: z.number().optional(),
        cuisine: z.string().optional(),
        reservations: z.boolean().optional(),
        description: z.string().optional(),
      })
      .optional(),
    /**
     * The wine facts behind a producer: who makes it, what they plant, the
     * label worth seeking out.
     *
     * VenueDetailTemplate renders the winemaker row, the key-varieties line
     * and the top label, and lib/schema.ts folds `keyVarieties` into the
     * Winery node's `knowsAbout`. All of it was dead code: 21 wineries carry
     * this block and every one of them lost it on load.
     *
     * `signature` is read by the template and is not on disk anywhere yet; it
     * is declared so the template's branch has a field to be true of.
     */
    wines: z
      .object({
        winemaker: z.string().optional(),
        keyVarieties: z.array(z.string()).default([]),
        topLabel: z.string().optional(),
        signature: z.string().optional(),
      })
      .optional(),
    /**
     * On-site accommodation for a venue whose primary type is not a stay
     * (5 wineries with villas or cottages on the estate). Drives the "Stay"
     * section on the venue page and the Accommodation JSON-LD node that
     * wine/[slug].astro pushes when the block is present - a node that has
     * never once been emitted, because the key was undeclared.
     */
    accommodation: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        units: z.number().optional(),
      })
      .optional(),
    /**
     * Reader questions and their answers (21 wineries, 63 pairs). Rendered as
     * the FAQ section on the venue page and emitted as FAQPage JSON-LD by
     * wine/[slug].astro.
     *
     * Note `q`/`a`, not the `question`/`answer` used by articles and
     * itineraries. These are the key names already on disk and in
     * buildFaqSchema's signature; renaming them would be a data migration
     * dressed up as a schema tidy.
     */
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    /**
     * Long-form editorial verdict (21 venues). Rendered as the pull-quote
     * verdict block on the venue page and used, trimmed to its first
     * sentence, as the short verdict on wine hub cards.
     */
    editorVerdict: z.string().optional(),
    /**
     * Entity signals — 3–5 short noun phrases (2–4 words each) naming what
     * the venue is distinctively known for. Renders as a chip row below the
     * signature line (see VenueDetailTemplate.astro) and is emitted as
     * schema.org additionalProperty for entity recognition (Google) and
     * structured extraction (AI). Specific named facts, not promotional copy.
     */
    knownFor: z.array(z.string()).min(3).max(5).optional(),
    /**
     * Editorial recommendation layer — replaces thin directory-style copy.
     * whyWeGo:     One-line insider positioning statement (leads the page).
     * bestFor:     Short audience/mood tags for the Worth Knowing panel.
     * ifOnlyOneThing: Single best-bet recommendation.
     * pairWith:    Nearby or complementary venues to combine with.
     */
    whyWeGo: z.string().optional(),
    bestFor: z.array(z.string()).optional(),
    ifOnlyOneThing: z.string().optional(),
    pairWith: z.array(z.string()).optional(),
    /**
     * Worth Knowing panel — quick-scan trust layer.
     * Structured fields that surface on the venue page as a scannable
     * recommendation panel. All optional; panel renders only when at
     * least one field is present.
     */
    worthKnowing: z.object({
      bestSeason: z.string().optional(),
      timing: z.string().optional(),
      atmosphere: z.string().optional(),
      worksWellWith: z.array(z.string()).optional(),
      goodFor: z.array(z.string()).optional(),
      lessIdealFor: z.string().optional(),
    }).optional(),
    /**
     * Seasonal intelligence — optional per-season guidance blocks.
     * Rendered as a section on the venue page when present.
     * Keys: autumn | winter | spring | summer
     */
    seasonalNotes: z.object({
      autumn: z.string().optional(),
      winter: z.string().optional(),
      spring: z.string().optional(),
      summer: z.string().optional(),
    }).optional(),
    /**
     * Venue status — for closed/paused venues.
     * Omit for active venues (defaults to active).
     */
    /**
     * Operational review marker, distinct from `status`.
     *
     * `status` is what the site renders. This is what the desk has recorded
     * about the venue, including work still to do. They are deliberately
     * separate: "someone should check this is still open" is not a state we
     * want to publish, and there is no `status` value that means it.
     *
     * Declared here because it was already being written by editors and
     * silently discarded. La Baracca carried `permanently-closed` plus a
     * dated closure note from May to September 2026 and kept rendering as a
     * live restaurant, because Zod strips keys it does not know about.
     *
     * Note the hyphen: these are the values already on disk. Do not "fix"
     * them to match the underscore in `status` without migrating the data.
     */
    operatingStatus: z.enum(['verify-open', 'permanently-closed']).optional(),
    /** Why and when a venue closed. Written alongside operatingStatus. */
    closureNote: z.string().optional(),
    closedDate: z.coerce.date().optional(),
    status: z.enum(['active', 'closed', 'paused', 'seasonal', 'permanently_closed']).default('active'),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const experiences = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/experiences' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    type: z.enum([
      'walk',
      'beach',
      'wellness',
      'tour',
      'attraction',
      'gallery',
      'park',
      'lookout',
      'market',
      'workshop',
      'golf-course',
    ]),
    /**
     * Optional link to a parent venue when the experience is venue-owned
     * (e.g. a winery tour, a restaurant garden experience). Used by
     * VenueDetailTemplate to surface owned experiences inline.
     */
    venueSlug: z.string().optional(),
    place: reference('places'),
    zone,
    coordinates,
    address: z.string().optional(),
    website: z.string().url().optional(),
    bookingUrl: z.string().url().optional(),
    durationMinutes: z.number().positive().optional(),
    difficulty: z.enum(['easy', 'moderate', 'hard']).optional(),
    seasonBest: z.array(season).default([]),
    editorNote: z.string(),
    tags: tagBlock,
    dogFriendly: z.boolean().default(false),
    dogFriendlyNotes: z.string().optional(),
    offLeashNearby: z.boolean().optional(),
    waterAccessNearby: z.boolean().optional(),
    nearbyVet: z.string().optional(),
    nearbyDaycare: z.string().optional(),
    rainyDayDogSuitability: z.enum(['low', 'medium', 'high']).optional(),
    heroImage: imageRef,
    gallery: z.array(imageRef).default([]),
    golf: z.any().optional(),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/places' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    kind: z.enum(['town', 'village', 'zone', 'ridge', 'beach', 'cape']),
    zone,
    /**
     * Region this place belongs to. Set on all 37 place JSONs in PR-2.
     * Used by RegionDetailTemplate (PR-6) to build the places strip.
     */
    regionSlug: z.string().optional(),
    regionLabel: z.string().optional(),
    coordinates,
    /**
     * One-sentence factual lede — schema-friendly, sits above the editorial intro
     * paragraph in the rendered page. Used as the SEO meta description and the
     * Place JSON-LD `description` when present, falling back to `intro`. Format:
     * "[Place] is a [type] on the Mornington Peninsula's [geographic descriptor],
     * [distance] from Melbourne[, optional feature]."
     */
    factualLede: z.string().optional(),
    intro: z.string(),
    heroImage: imageRef,
    relatedPlaces: z.array(reference('places')).default([]),
    publishedAt: z.coerce.date(),
    tldr: z.array(z.string()).optional(),
    driveTime: z.string().optional(),
    /**
     * Editorial trip-planning fields. Surface on /explore/places/[slug] pages — the
     * place-detail template renders each conditionally so partially-filled
     * places (e.g. arthurs-seat) still render cleanly.
     *
     *   signature     one-sentence editorial tagline
     *   bestFor       short audience tags ("quiet weekends", "golf")
     *   notFor        anti-audience tags ("cheap accommodation")
     *   bestSeason    free-text season label ("late spring")
     *   worstTime     free-text avoid-this-window
     *   stayDuration  recommended length ("two nights")
     *   bestDay       sentence describing a perfect day — rendered as a timeline
     *   insiderNote   one-line editor's note, treated as pull-quote
     *   skip          one-liner of "what NOT to expect"
     */
    signature: z.string().optional(),
    bestFor: z.array(z.string()).optional(),
    notFor: z.array(z.string()).optional(),
    bestSeason: z.string().optional(),
    worstTime: z.string().optional(),
    stayDuration: z.string().optional(),
    bestDay: z.string().optional(),
    insiderNote: z.string().optional(),
    skip: z.string().optional(),
    /**
     * Editorial featured flag. Set true on places surfaced as curated
     * highlights on hub pages (Plans hub place rail). Editors update
     * the JSON; no source-code change needed.
     */
    featured: z.boolean().default(false),
    sitemapExclude: z.boolean().default(false),
  }),
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/regions' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    /** One-line editorial tagline. Used as SEO meta description. */
    tagline: z.string().optional(),
    /** Editorial introduction paragraph. 80 to 120 words. */
    intro: z.string(),
    heroImage: imageRef,
    /** The zone enum values that fall within this region. */
    zones: z.array(zone),
    /** Place slugs within this region. */
    places: z.array(reference('places')),
    /** Slugs of adjacent regions for cross-linking in the template footer. */
    adjacentRegions: z.array(z.string()).default([]),
    /** Geographic centroid for map rendering and JSON-LD. */
    coordinates: coordinates.optional(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

/**
 * One pick inside a weekend dispatch. Declared once and reused for every slot,
 * so adding a slot cannot be cheaper in the content than in the schema - which
 * is how `companion`, `localEdge` and `quieterAlt` came to be written onto
 * thirteen dispatches and thrown away by all thirteen builds.
 */
const dispatchPick = z.object({
  title: z.string(),
  when: z.string(),                 // "Saturday 16 May, 11am–1:30pm"
  where: z.string(),                // "Red Hill & Main Ridge forests"
  price: z.string().optional(),     // ticketing shape, never a number (BRAND-PI)
  who: z.string().optional(),       // "Capped at 15"
  summary: z.string(),
  bookingLabel: z.string().optional(), // "Book via The Kitchen"
  bookingUrl: z.string().url().optional(),
  eventRef: z.string().optional(),  // matching events/[slug] for venue link
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    author: reference('authors'),
    houseByline: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    heroImage: imageRef,
    format: z.enum([
      'editors-letter',
      'long-lunch-list',
      'cellar-door-dispatch',
      'stay-notes',
      'slow-peninsula',
      'insider-edit',
      'interview',
      'investigation',
      'service',
      'weekend-picker',
      'hub-guide',
      'trail-guide',
      'venue-guide',
      'peninsula-notes',
    ]),
    tags: z.array(z.string()).default([]),
    relatedVenues: z.array(reference('venues')).default([]),
    relatedExperiences: z.array(reference('experiences')).default([]),
    relatedPlaces: z.array(reference('places')).default([]),
    relatedArticles: z.array(reference('articles')).default([]),
    relatedItineraries: z.array(reference('itineraries')).default([]),
    /**
     * The events this article is about. Every sibling relation on this list
     * was declared and this one was not, so the single guide that names its
     * festival lost the link on load and the article and the event it exists
     * to cover had no edge between them anywhere in the build.
     */
    relatedEvents: z.array(reference('events')).default([]),
    readingTimeMinutes: z.number().positive().optional(),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'review', 'scheduled', 'published']).default('draft'),
    lastVerified: z.coerce.date().optional(),
    ...provenanceFields,
    ...sourceHealthFields,
    clusterLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    /**
     * Which content-factory run produced this article, e.g. "2026-09-14-daily".
     * Written by the factory on every agent-authored piece since 2026-08.
     *
     * It was never declared here, so Zod stripped it from all 30 articles that
     * carry it and the site kept no record of which run wrote what. That is the
     * provenance this programme exists to establish, discarded silently on the
     * way in. The schema-drift ratchet caught the count crossing its ceiling on
     * 2026-09-14 when the daily run added the thirtieth; the ceiling was the
     * only thing that had ever noticed.
     *
     * Declared rather than baselined deliberately. Raising the ceiling would
     * have licensed the loss and then failed the build again every single day,
     * because the factory writes one more article every morning.
     */
    agentRun: z.string().optional(),
    aiSummary: z.array(z.string()).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    sitemapExclude: z.boolean().default(false),
    /**
     * Editorial section this article belongs to. Articles tagged "plans" are
     * suppressed from the Journal index and surfaced in the Plans index instead.
     * The URL stays at /journal/[slug] until the full /explore/plans/[slug] routing
     * sprint lands; this flag is the lightweight first step.
     */
    section: z.enum(['journal', 'plans']).default('journal'),
    /**
     * Shape of the trip a plans article describes. Drives the four-group
     * editorial layout on /explore/plans/. Optional at the schema level because
     * journal-section articles don't need it; required (editorially) for
     * any article with section: plans that wants to appear in the
     * grouped "Peninsula planning guides" section.
     *
     *   one-night → focused single-overnight reset
     *   two-night → the canonical weekend shape
     *   day-trip  → no overnight, return same day
     *   seasonal  → anchored to a specific season, event, or weather window
     */
    planShape: z
      .enum(['one-night', 'two-night', 'day-trip', 'seasonal'])
      .optional(),
    /**
     * Structured dispatch payload for weekend-picker articles. When present,
     * the /whats-on/this-weekend/ template renders the picks as scannable
     * cards (hero, "at a glance" row, per-day cards, rainy-day backup) and
     * the same data feeds the weekly HTML email at ops/email/dispatch-weekly.html.
     *
     * Optional — articles without it fall back to plain markdown rendering.
     * Editors keep writing the long-form body in markdown; `dispatch` is the
     * structured layer for the scannable surface and the email.
     */
    dispatch: z
      .object({
        // One-line editor's framing of the weekend ("Mid-May gives the
        // Peninsula back to itself. One forest morning, one market Sunday.")
        editorLine: z.string(),
        // Weather hint shown in the top strip. Free text so editors can
        // write "Cool, dry, autumn light" or "Rain Saturday afternoon".
        weather: z.string().optional(),
        // The marquee booking — the one thing to lock in.
        lead: dispatchPick,
        // Saturday + Sunday picks if present.
        saturday: dispatchPick.optional(),
        sunday: dispatchPick.optional(),
        // The indoor / weather-changes backup.
        rainyDay: dispatchPick.optional(),
        /**
         * The three picks the desk writes when the weekend is not shaped as
         * Saturday / Sunday / rainy day: the slower second move, the local
         * thing a visitor would not find, and the quieter alternative to a
         * crowded lead.
         *
         * Written on thirteen dispatches between May and July 2026 and
         * discarded on every one of them, because the four slots above were
         * declared one at a time and these three were never added. The four
         * had identical shapes copied four times, which is the mechanism: a
         * new pick was cheaper to write into the content than into the
         * fifth copy of the same object. They share `dispatchPick` now.
         *
         * The /whats-on/this-weekend/ template renders lead, saturday, sunday
         * and rainyDay only, so declaring these three restores the data
         * without changing a rendered page. Surfacing them is an editorial
         * decision, not a schema one.
         */
        companion: dispatchPick.optional(),
        localEdge: dispatchPick.optional(),
        quieterAlt: dispatchPick.optional(),
        // One-line close ("Don't add more to either day. Let the Peninsula's
        // own pace do the work.")
        weekendShape: z.string().optional(),
      })
      .optional(),
  }),
});

// /explore/plans/ taxonomy — 7 axes from peninsula_insider_escape_v1 pack.
// All seven axes are optional with sensible defaults so legacy itineraries
// (which only carried `audience` + `mood` + `lengthNights`) continue to validate.
// Pre-publish gate (lib/escape.ts) enforces non-default values for new commissions.
const escapeDuration = z.enum([
  'half-day',
  'day',
  'one-night',
  'weekend',
  'three-night',
  'midweek',
  'week',
]);

const escapeTheme = z.enum([
  'wine',
  'food',
  'food+wine',
  'wellness',
  'coastal',
  'hinterland',
  'golf',
  'wedding',
  'cultural',
  'adventure',
  'cycling',
  'surfing',
  'producer',
  'garden',
  'general',
]);

const escapeOccasion = z.enum([
  'none',
  'birthday',
  'anniversary',
  'proposal',
  'honeymoon',
  'babymoon',
  'christmas',
  'new-year',
  'easter',
  'mothers-day',
  'fathers-day',
  'valentines',
  'special',
  'milestone',
  'reunion',
  'work-retreat',
  'wedding-guest',
]);

const escapeBudget = z.enum(['luxe', 'mid', 'budget', 'mixed']);

const escapeOrigin = z.enum(['melbourne', 'interstate', 'international', 'ferry', 'train']);

const escapeSeason = z.enum([
  'year-round',
  'summer',
  'autumn',
  'winter',
  'spring',
  'christmas-period',
  'easter-period',
  'school-holidays',
  'whale-season',
  'rainy',
]);

const itineraries = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/itineraries' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    dek: z.string(),

    // Legacy axes — kept for back-compat with the 6 itineraries pre-pack.
    audience: z.enum(['couple', 'family', 'friends', 'solo', 'locals']),
    mood: z.enum([
      'slow',
      'indulgent',
      'wellness',
      'adventure',
      'food-wine',
      'mixed',
      'quick',
    ]),
    lengthNights: z.number().int().nonnegative(),

    // 7-axis taxonomy from /explore/plans/ pack. Optional during the migration window
    // so legacy entries don't fail validation; new commissions must populate.
    duration: escapeDuration.optional(),
    theme: z.array(escapeTheme).max(2).default([]),
    occasion: escapeOccasion.default('none'),
    origin: escapeOrigin.default('melbourne'),
    budget: escapeBudget.default('mixed'),
    season: escapeSeason.default('year-round'),

    // Conversion architecture — anchor stay drives the 3-placement rule
    // (hero CTA, day-N "where you sleep" block, related rail).
    anchorStay: reference('venues').optional(),
    anchorStayBlurb: z.string().optional(),
    altStays: z.array(reference('venues')).default([]),
    anchorTown: reference('places').optional(),
    baseTowns: z.array(reference('places')).default([]),

    // Anatomy fields beyond stops — populated as itineraries graduate to the
    // canonical 11-section template.
    editorialFrame: z.string().optional(),
    drivingDistanceKm: z.number().nonnegative().optional(),
    walkingIntensity: z.enum(['low', 'moderate', 'high']).optional(),
    budgetRangeAud: z.string().optional(), // e.g. "$850–$1,200 per couple"
    costBreakdown: z
      .object({
        stay: z.string().optional(),
        food: z.string().optional(),
        drink: z.string().optional(),
        activities: z.string().optional(),
        fuel: z.string().optional(),
      })
      .optional(),
    bookingChecklist: z
      .array(
        z.object({
          item: z.string(),
          priority: z.enum(['essential', 'recommended', 'optional']).default('recommended'),
          windowWeeksAhead: z.number().nonnegative().optional(),
        })
      )
      .default([]),
    variations: z
      .array(
        z.object({
          label: z.string(), // e.g. "Rainy day", "With kids", "Luxe-up"
          body: z.string(),
          relatedItinerary: z.string().optional(), // slug of sibling itinerary
        })
      )
      .default([]),
    skipThese: z.string().optional(), // 60–100 word "what to skip" panel
    faq: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .default([]),

    // Existing fields preserved.
    stops: z.array(
      z.object({
        day: z.number().int().positive(),
        order: z.number().int().positive(),
        venue: reference('venues').optional(),
        experience: reference('experiences').optional(),
        note: z.string().optional(),
        timeOfDay: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night']),
        timeRange: z.string().optional(), // e.g. "9:30–10:30am" — preferred over timeOfDay
        practical: z.string().optional(), // "Booking required · 90 min · $$ · Parking on-site"
        driveMinutesToNext: z.number().nonnegative().optional(),
      })
    ),
    totalDriveMinutes: z.number().nonnegative().optional(),
    heroImage: imageRef,
    /**
     * Supporting images, same shape as the galleries on venues and
     * experiences. Itineraries were the one collection with a `heroImage` and
     * no gallery beside it, so an editor adding photographs to a plan had
     * them discarded on load. One record already carries the key.
     */
    gallery: z.array(imageRef).default([]),
    editorNote: z.string(),
    publishedAt: z.coerce.date(),
    lastVerified: z.coerce.date().optional(),
    ...provenanceFields,
    ...sourceHealthFields,
    sitemapExclude: z.boolean().default(false),
  }),
});

// ─── Events ────────────────────────────────────────────────────────────────
//
// Schema is split into three concerns by ownership:
//   1. Identity + machine-imported facts (overwritten by import script)
//   2. Derived fields (recomputed by cron from machine fields)
//   3. Editorial overlay (hand-written, preserved across re-imports)
//
// The import-events config (scripts/import-events.config.ts) names each
// field's owner so the import script never overwrites editorial work.
//
// All new fields are optional so the existing 16 hand-curated events keep
// validating without modification.
//
const events = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/events' }),
  schema: z.object({
    // ─── Identity ──────────────────────────────────────────────────────────
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    eventId: z.string().optional(), // e.g. MP-EVT-0001, for spreadsheet sync

    // ─── When ──────────────────────────────────────────────────────────────
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    startTime: z.string().optional(), // "11:00"
    endTime: z.string().optional(),
    /**
     * The timezone the wall clocks above are written in. Every record on this
     * site is Melbourne local, and the field exists so that stays a stated
     * fact rather than an assumption compiled into four different helpers.
     * src/lib/event-occurrence.mjs resolves the clock through Intl, so a
     * daylight-saving occurrence gets its real duration instead of the
     * hardcoded +10:00 the JSON-LD used to stamp on every event all year.
     */
    timezone: z.string().default('Australia/Melbourne'),
    /**
     * Does this occurrence finish on the following calendar day.
     *
     * Left unset, an endTime at or before startTime is read as crossing
     * midnight, which is right for "21:00 to 01:00" and wrong for a typo.
     * Set it explicitly to settle the case either way; the safeguard audit
     * reports any single-day record that leaves it ambiguous.
     */
    endsNextDay: z.boolean().optional(),
    season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
    month: z.string().optional(), // "May", "June" etc.

    // ─── Where ─────────────────────────────────────────────────────────────
    venue: reference('venues').optional(),
    venueName: z.string().optional(),
    place: reference('places').optional(),
    venueRegion: z.string().optional(),
    suburb: z.string().optional(),
    streetAddress: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    indoorOutdoor: z.string().optional(),

    // ─── Money ─────────────────────────────────────────────────────────────
    bookingUrl: z.string().url().optional(),
    ticketingUrl: z.string().url().optional(),
    officialEventUrl: z.string().optional(), // may have multi-URL "|" separators
    bookingRequired: z.string().optional(),
    /**
     * Whether a reader can still get in, which is not the same question as
     * whether the event is happening. A sold-out market is on: it appears on
     * every listing, labelled, with its booking affordance withdrawn. Before
     * this field the only way to express "you cannot get in" was to cancel
     * the record, which told readers something untrue.
     *
     * No prices here or anywhere (BRAND-PI 2026-05-15). This maps to
     * schema.org offer availability only.
     */
    bookingStatus: z
      .enum(['open', 'sold-out', 'waitlist', 'closed', 'not-required', 'unknown'])
      .default('unknown'),
    bookingStatusNote: z.string().optional(),
    bookingStatusSourceUrl: z.string().optional(),
    bookingStatusCheckedAt: z.coerce.date().optional(),
    freePaid: z.string().optional(),
    priceRange: z.string().optional(),
    priceTier: z
      .enum(['free', 'under-50', '50-150', 'over-150', 'unknown'])
      .optional(),

    // ─── Categorisation ────────────────────────────────────────────────────
    category: z.enum([
      'food-wine',
      'market',
      'festival',
      'cellar-door',
      'community',
      'arts',
      'wellness',
      'live-music',
      'racing-sport',
      'family-programs',
      'exhibition',
      'civic',
      'nature',
      'writers-ideas',
    ]),
    subcategory: z.string().optional(),
    recurrence: z
      .enum(['one-off', 'weekly', 'monthly', 'annual', 'seasonal', 'ongoing'])
      .default('one-off'),
    recurrenceNote: z.string().optional(),
    /**
     * Exceptions to the cadence, one entry per affected occurrence.
     *
     * A weekly market that skips the long weekend, a monthly session moved to
     * another hall, one sold-out night in a season: none of these are facts
     * about the series, and recording them on the series is how a whole
     * recurring event gets cancelled to express a single missing week.
     * src/lib/event-occurrence.mjs applies these per day; everything else
     * about the series is untouched.
     */
    occurrenceExceptions: z
      .array(
        z.object({
          /** The Melbourne calendar day this exception applies to. */
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          status: z.enum([
            'cancelled',
            'postponed',
            'rescheduled',
            'sold-out',
            'moved',
            'as-scheduled',
          ]),
          /** Override the series times for this occurrence only. */
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          /** Where a rescheduled occurrence moved to. */
          rescheduledTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          /** Where a moved occurrence is being held instead. */
          venueName: z.string().optional(),
          note: z.string().optional(),
          sourceUrl: z.string().optional(),
        })
      )
      .default([]),

    // ─── Audience ──────────────────────────────────────────────────────────
    suitableFor: z.string().optional(),
    audienceTags: z
      .array(
        z.enum([
          'couples',
          'families',
          'solo',
          'groups',
          'first-timers',
          'locals',
          'cultural-visitors',
          'foodies',
          'all-ages',
          'adults-only',
          'art-lovers',
          'music-fans',
        ])
      )
      .default([]),
    familyFriendly: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
    accessibilityNotes: z.string().optional(),

    // ─── Weather ───────────────────────────────────────────────────────────
    weather: z
      .enum(['all-weather', 'sunny-only', 'rainy-day-rescue', 'weather-proof', 'mixed'])
      .default('mixed'),
    weatherDependency: z.string().optional(),
    weatherShape: z
      .enum(['all-weather', 'wet-friendly', 'fair-weather-only', 'unknown'])
      .optional(),

    // ─── Organiser ─────────────────────────────────────────────────────────
    organiser: z
      .object({
        name: z.string().optional(),
        website: z.string().optional(),
        contact: z.string().optional(),
        instagram: z.string().optional(),
        facebook: z.string().optional(),
      })
      .optional(),

    // ─── Sources & verification ────────────────────────────────────────────
    primarySourceUrl: z.string().optional(),
    secondarySourceUrl: z.string().optional(),
    verificationStatus: z.string().optional(),
    /**
     * Import provenance, emitted by the event importer and, until now,
     * thrown away on load. Twelve records carry the full triple.
     *
     * This is real evidence about where a record came from and when it was
     * discovered, and it is the natural seed for the claim registry, so it
     * is declared rather than deleted.
     */
    provenance: z.string().optional(),
    source: z.string().optional(),
    sourceUrl: z.string().optional(),
    discoveredAt: z.coerce.date().optional(),
    lastCheckedDate: z.coerce.date().optional(),
    /**
     * The same fact as lastCheckedDate, to the minute rather than the day.
     * Kept separate because lastCheckedDate is written by hand and by the
     * importer across 50-odd records and must not be redefined underneath
     * them. Readers of either should prefer this when present.
     */
    lastVerifiedAt: z.coerce.date().optional(),
    /**
     * When the source itself last changed. A source update later than the last
     * verification is the "late source update" case: the record is not known
     * to be wrong, it is known to be unchecked. It keeps its listing, loses
     * its promotion, and goes on the expiry job's exception queue.
     */
    sourceUpdatedAt: z.coerce.date().optional(),
    /**
     * Verification as a value rather than as prose.
     *
     * verificationStatus above is free text: 22 records, a dozen distinct
     * spellings, one of them a 280-word paragraph, and the only code that
     * reads it does so with a /cancelled/i regex. The signature-events
     * collection has modelled the same idea correctly as a three-value enum
     * since it was written, so this adopts that shape. Both fields stand:
     * the prose is real evidence and is not being deleted to make a schema
     * tidy. New records should set this enum and put the prose in
     * verificationNote; the safeguard audit ratchets the free-text count so
     * it can shrink but never grow.
     */
    verification: z.enum(['verified', 'tentative', 'stub']).optional(),
    verificationNote: z.string().optional(),
    ...provenanceFields,
    ...sourceHealthFields,
    visitorAppealScore: z.number().min(0).max(5).optional(),
    editorialPriority: z.number().min(0).max(5).optional(),

    // ─── Cross-link source data (raw text, drives derived fields) ─────────
    nearbyAttractions: z.string().optional(),
    suggestedItineraryPairing: z.string().optional(),
    nearestVenues: z.array(reference('venues')).default([]),

    // ─── Derived occurrence fields (cron-recomputed for recurring) ────────
    nextOccurrence: z.coerce.date().optional(),

    // ─── Editorial overlay (human-written, never overwritten) ─────────────
    worthTheDrive: z.boolean().default(false),
    firstTimer: z.boolean().default(false),
    skipThis: z.boolean().default(false),
    skipReason: z.string().optional(),
    skipInstead: z.string().optional(),
    editorVerdict: z.string().optional(),
    whyWeCare: z.string().optional(),
    standoutOfMonth: z.boolean().default(false),
    pairingProse: z.string().optional(),
    editorVisited: z.boolean().default(false),
    featuredInDispatch: z
      .object({
        issue: z.string(),
        note: z.string().optional(),
      })
      .optional(),
    relatedArticles: z.array(reference('articles')).default([]),
    lens: z
      .array(
        z.enum([
          'weekend-pick',
          'date-idea',
          'family-saturday',
          'rainy-day',
          'worth-the-drive',
          'free',
          'school-holidays',
          'walk-in',
          'ticketed',
          'locals-know',
        ])
      )
      .default([]),
    editorNote: z.string().optional(),
    heroImage: imageRef.optional(),

    // ─── Internal (never rendered to the public surface) ──────────────────
    internalNotes: z.string().optional(),
    manualFollowUpRequired: z.boolean().default(false),

    // ─── Cancellation ──────────────────────────────────────────────────────
    // A cancelled event is not the same as an unpublished or expired one. The
    // record stays published so the URL keeps serving readers who arrive from
    // search or an old link, but it is withdrawn from every "what is on"
    // surface and its JSON-LD reports EventCancelled. Before 2026-08 the only
    // signal was a regex over verificationStatus/summary (see whats-on/_data.ts);
    // this flag makes the state explicit and reviewable.
    cancelled: z.boolean().default(false),
    cancelledOn: z.coerce.date().optional(),
    cancellationNote: z.string().optional(),
    cancellationSourceUrl: z.string().optional(),
    cancellationSourceLabel: z.string().optional(),

    // ─── Postponement ──────────────────────────────────────────────────────
    // Cancelled and postponed are different answers. A cancelled event will
    // not happen; a postponed one will, on a date nobody has announced yet.
    // Collapsing the two either tells readers an event is off when it is not,
    // or leaves it advertised under a date that has passed. A postponed record
    // with no rescheduledTo is withdrawn from every DATED surface (there is no
    // date to list it under) and queued for a human; one with a rescheduledTo
    // is rescheduled, and its structured data says so with previousStartDate.
    postponed: z.boolean().default(false),
    postponedOn: z.coerce.date().optional(),
    /** The date the event was originally going to run. */
    postponedFrom: z.coerce.date().optional(),
    /** The announced new date, when there is one. */
    rescheduledTo: z.coerce.date().optional(),
    postponementNote: z.string().optional(),
    postponementSourceUrl: z.string().optional(),
    postponementSourceLabel: z.string().optional(),

    // ─── Lifecycle ─────────────────────────────────────────────────────────
    status: z
      .enum(['draft', 'review', 'scheduled', 'published', 'expired', 'past', 'archived'])
      .default('published'),
    /**
     * When the record was archived, and why.
     *
     * Both keys are written by scripts/archive-expired-events.py and read back
     * by scripts/recompute-occurrence.py, which uses the reason to decide
     * whether a recurring series may be restored to `published` or has
     * genuinely finished. Neither was declared, so the decision the restore
     * job depends on existed on disk and nowhere in the build - and an editor
     * reading the collection could not see why anything had been archived.
     *
     * `archivedAt` is a timestamp on machine-written records and a plain date
     * on the two hand-archived ones; z.coerce.date takes both.
     */
    archivedAt: z.coerce.date().optional(),
    archivedReason: z.string().optional(),
    /**
     * When this record stops being publishable, independent of when the event
     * finishes. The two are not the same instant: a listing whose source only
     * guarantees the dates to the end of the month expires then, whatever its
     * endDate says, and a record with a live recurrence never expires at all.
     * Past this instant the record is off every reader-facing surface; the
     * URL and the JSON on disk are untouched. Nothing here deletes or moves a
     * record: status and this field are the only things that delist one.
     */
    expiresAt: z.coerce.date().optional(),
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    role: z.enum(['editor', 'contributor', 'guest']),
    bio: z.string(),
    photo: imageRef.optional(),
    links: z
      .object({
        site: z.string().url().optional(),
        instagram: z.string().url().optional(),
        twitter: z.string().url().optional(),
      })
      .optional(),
    publishedAt: z.coerce.date(),
  }),
});

// ─── Tour vertical collections ───────────────────────────────────────────────

const tourOperators = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tour-operators' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorType: z.enum(['volume', 'wine-specialist', 'premium-private', 'activity-specialist']),
    website: z.string().url().optional(),
    phone: z.string().optional(),
    pickupPoints: z.array(z.string()).default([]),
    languages: z.array(z.string()).default(['en']),
    maxCapacity: z.number().positive().optional(),
    affiliateProgram: z.enum(['yes', 'no', 'unknown']).default('unknown'),
    affiliateUrl: z.string().url().optional(),
    vetted: z.boolean().default(false),
    intro: z.string(),
    whatGoodAt: z.string(),
    notSuitedFor: z.string(),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
  }),
});

const tours = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tours' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorSlug: z.string(),
    experienceType: z.enum(['food-wine','wildlife-nature','history-heritage','kayak-paddle','cycling','walking-hiking','scenic-sightseeing','cruise-sailing','art-culture','surf-water','private-charter','wellness']),
    duration: z.enum(['under-2h','half-day','full-day','multi-2n','multi-3n','multi-extended']),
    theme: z.array(z.enum(['romantic','family','adventure','relaxed','gourmet','wellness','educational','eco','seasonal'])).max(2).default([]),
    audience: z.enum(['adults','families','solo','couples','seniors','accessible','general']),
    occasion: z.enum(['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general']).default('general'),
    origin: z.enum(['mornington','sorrento','portsea','red-hill','merricks','flinders','dromana','rosebud','rye','blairgowrie','peninsula-wide','melbourne-cbd']),
    budgetBand: z.enum(['budget','moderate','mid-range','premium','luxury']),
    groupSize: z.enum(['intimate','small-group','large-group','private-charter']),
    priceLow: z.number().positive().optional(),
    priceHigh: z.number().positive().optional(),
    durationHours: z.number().positive().optional(),
    maxGroupSize: z.number().positive().optional(),
    departsFrom: z.string().optional(),
    languages: z.array(z.string()).default(['en']),
    accessibility: z.string().optional(),
    bookingUrl: z.string().url().optional(),
    aggregatorGYG: z.string().url().optional(),
    aggregatorViator: z.string().url().optional(),
    intro: z.string(),
    whatHappens: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    bookingIntelligence: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
  }),
});

const tourPackages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tour-packages' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    occasion: z.enum(['anniversary','hens','bucks','corporate','birthday','family-reunion','school','general','winter','foodies']),
    audience: z.enum(['adults','families','solo','couples','seniors','general']),
    theme: z.array(z.string()).max(2).default([]),
    bundleType: z.enum(['sequential-day','stay-anchored','flexible']),
    durationNights: z.number().nonnegative().optional(),
    componentTourSlugs: z.array(z.string()).default([]),
    anchorStaySlug: z.string().optional(),
    anchorStayBlurb: z.string().optional(),
    altStaySlug: z.string().optional(),
    priceLow: z.number().positive().optional(),
    priceHigh: z.number().positive().optional(),
    intro: z.string(),
    whyThisCombination: z.string(),
    bookingSequence: z.string().optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
    heroImage: imageRef,
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
  }),
});

// ─── Boating + Fishing vertical collections ──────────────────────────────────
//
// Source: peninsula_insider_boating_fishing_v1 pack (30 Apr 2026).
// Five entity collections — species, fishing-locations, fishing-charters,
// boat-ramps, boat-hire — mirror the /tour/ JSON-first pattern so prose
// authoring stays editable but invariants are enforced. Hub and pillar pages
// are MDX in src/pages/fishing/ and src/pages/boating/ rather than
// collections, since they are prose-heavy and one-of-a-kind.
//
// Slugs match the pack's bf_taxonomy_spec.md §5. The [VERIFY] flag is modelled
// as `verified: false` plus `status: 'draft'` — pre-publish gate enforces
// `status === 'published'` before sitemap inclusion.

const fishingRegion = z.enum(['port-phillip-bay', 'western-port', 'bass-strait-fringe']);

const speciesAvailability = z.enum(['peak', 'good', 'fair', 'rare', 'closed']);

const tideDependence = z.enum(['all-tide', 'mid-to-high', 'high-tide-only', 'tidal-extreme']);

const bfFaq = z.array(z.object({ question: z.string(), answer: z.string() }));

const bfStatus = z.enum(['draft', 'verify', 'published']);

// Entity collections are stored as Markdown with rich frontmatter — same
// pattern as `articles`. Frontmatter holds the structured fields needed by
// the schema builders and internal-link wiring; the MD body holds the
// editorial prose (rendered via <Content />). This keeps prose-heavy entity
// types easy to author and review while still enforcing invariants.

const species = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/species' }),
  schema: z.object({
    slug: z.string(),
    commonName: z.string(),
    scientificName: z.string(),
    aliases: z.array(z.string()).default([]),
    primaryRegion: fishingRegion,
    secondaryRegions: z.array(fishingRegion).default([]),
    bagLimit: z.string(), // VFA-cited prose, e.g. "10 per person per day"
    sizeLimit: z.string(), // e.g. "28cm total length"
    closedSeason: z.string().optional(),
    licenceRequired: z.boolean().default(true),
    peakSeason: z.string(), // editorial, e.g. "Oct–Dec"
    seasonality: z
      .array(
        z.object({
          month: z.enum(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']),
          portPhillipBay: speciesAvailability,
          westernPort: speciesAvailability,
          bassStraitFringe: speciesAvailability,
        }),
      )
      .default([]),
    locationSlugs: z.array(z.string()).default([]),
    charterSlugs: z.array(z.string()).default([]),
    eatLinks: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    vfaCitationUrl: z.string().url(),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const fishingLocations = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/fishing-locations' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    locationType: z.enum(['pier', 'jetty', 'beach', 'rock-platform', 'inlet', 'foreshore']),
    region: fishingRegion,
    coordinates: coordinates.optional(),
    parking: z.string().optional(),
    accessibility: z.string().optional(),
    publicToilets: z.boolean().optional(),
    bestSeason: z.string().optional(),
    primarySpecies: z.array(z.string()).default([]), // species slugs
    nearestRampSlug: z.string().optional(),
    tideStation: z.string().optional(),
    tideNotes: z.string().optional(),
    safetyNotes: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const fishingCharters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/fishing-charters' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorWebsite: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    bookingProvider: z.enum(['direct', 'fishingbooker', 'getyourguide', 'viator', 'none']).default('none'),
    departurePoints: z.array(z.string()).default([]), // ramp slugs or display names
    vesselName: z.string().optional(),
    vesselType: z.string().optional(),
    capacityMin: z.number().int().nonnegative().optional(),
    capacityMax: z.number().int().nonnegative().optional(),
    priceLow: z.number().nonnegative().optional(),
    priceHigh: z.number().nonnegative().optional(),
    priceUnit: z.enum(['per-person', 'per-group', 'per-charter']).default('per-person'),
    targetSpecies: z.array(z.string()).default([]), // species slugs
    seasonalityNote: z.string().optional(),
    licenceCovered: z.enum(['covered', 'byo', 'unconfirmed']).default('unconfirmed'),
    cancellationPolicy: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const boatRamps = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/boat-ramps' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    region: fishingRegion,
    coordinates: coordinates.optional(),
    address: z.string().optional(),
    managingAuthority: z.string().optional(),
    laneCount: z.number().int().positive().optional(),
    surface: z.enum(['concrete', 'gravel', 'sealed', 'mixed']).optional(),
    fee: z.string().optional(),
    parkingCapacity: z.string().optional(),
    parkingPressure: z.enum(['low', 'medium', 'high']).optional(),
    tideDependence: tideDependence,
    tideStation: z.string().optional(),
    maxVesselLength: z.string().optional(),
    nearbyRampAlternatives: z.array(z.string()).default([]),
    accessibleSpecies: z.array(z.string()).default([]), // species slugs
    accessibleLocations: z.array(z.string()).default([]), // location slugs
    nearestHireSlug: z.string().optional(),
    safetyNotes: z.string().optional(),
    intro: z.string(),
    metaDescription: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

const boatHire = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/boat-hire' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    operatorWebsite: z.string().url().optional(),
    affiliateUrl: z.string().url().optional(),
    bookingProvider: z.enum(['direct', 'getyourguide', 'viator', 'none']).default('direct'),
    departurePoint: z.string(),
    vesselTypes: z.array(z.string()).default([]),
    licenceRequired: z.boolean().default(false),
    priceLow: z.number().nonnegative().optional(),
    priceHigh: z.number().nonnegative().optional(),
    priceUnit: z.enum(['per-hour', 'per-half-day', 'per-day', 'per-session']).default('per-hour'),
    seasonalityNote: z.string().optional(),
    nearestRampSlug: z.string().optional(),
    coordinates: coordinates.optional(),
    intro: z.string(),
    metaDescription: z.string(),
    whoSuits: z.string(),
    whoDoesnt: z.string(),
    faq: bfFaq.default([]),
    heroImage: imageRef.optional(),
    status: bfStatus.default('draft'),
    verified: z.boolean().default(false),
    lastVerified: z.coerce.date(),
    ...provenanceFields,
    ...sourceHealthFields,
    publishedAt: z.coerce.date(),
    sitemapExclude: z.boolean().default(false),
  }),
});

// Quick Note — daily-cadence editorial briefs.
// Three time horizons rendered on /quick-note/:
//   "now"   - last 6h
//   "today" - last 24h
//   "week"  - last 7d (then archived from the live page)
// One Markdown file per brief, src/content/quick-notes/<slug>.md.
const quickNotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quick-notes' }),
  schema: z.object({
    ...sourceHealthFields,
    headline: z.string().max(140),
    dek: z.string().max(320).optional(),
    section: z.enum([
      'eat', 'stay', 'wine', 'explore', 'spa', 'golf',
      'whats-on', 'weather', 'note',
    ]),
    tag: z.enum([
      'opening-window',  // booking opens / window available
      'menu-change',     // restaurant menu / cellar door release
      'closure',         // venue / track / beach closure
      'event',           // dated event in the next ~2 weeks
      'weather',         // tide / sunset / fire / rainfall window
      'editor-note',     // editorial musing, no external trigger
      'pricing',         // price change worth flagging
      'safety',          // urgent: fire, beach, swim warning
    ]),
    publishedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    verifiedAt: z.coerce.date().optional(),
    verifiedBy: z.string().optional(),
    verdict: z.string().max(140).optional(),  // pull-quote-style verdict
    sources: z.array(z.object({
      kind: z.enum(['venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
      url: z.string().url().optional(),
      note: z.string().optional(),
      checkedAt: z.coerce.date().optional(),
    })).default([]),
    relatedVenue: z.string().optional(),
    relatedArticle: z.string().optional(),
    image: imageRef.optional(),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  }),
});

// Editorial framing blocks — hub intros, best-of framing, homepage cover copy.
// These are the editorial sentences that historically lived hard-coded inside
// .astro pages and were therefore invisible to the concierge corpus. Migrating
// them here makes them queryable. Pages can opt to render them by importing
// from this collection (see lib/editorial.ts), or keep their hard-coded copy
// during the migration window — either way the concierge sees them.
const editorial_blocks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/editorial_blocks' }),
  schema: z.object({
    title: z.string(),
    kind: z
      .enum(['hub_intro', 'best_of_intro', 'homepage_cover', 'hub_faq', 'town_intro', 'category_intro'])
      .default('hub_intro'),
    section: z.string().optional(), // e.g. "Eat & Drink"
    region: z.string().optional(),   // e.g. "red-hill"
    place: z.string().optional(),
    pageHref: z.string().optional(), // canonical page this framing belongs to
    publishedAt: z.coerce.date(),
    lastVerified: z.coerce.date().optional(),
    ...provenanceFields,
    ...sourceHealthFields,
    status: z.enum(['draft', 'published']).default('published'),
  }),
});

/**
 * The Insider's 30 (Phase 6 WS6C). Annual editor-selected ranked list
 * of 30 venues across the Peninsula. One JSON file per year — the
 * file's `year` field is canonical, the slug (`2026`, `2027`, etc.)
 * is purely the route key. Each entry holds an ordered array of
 * exactly 30 ranked picks; renderer enforces the cap.
 */
const insidersThirty = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/insiders-thirty' }),
  schema: z.object({
    year: z.number().int().min(2026).max(2100),
    /** When the list was published. Used for archive sorting. */
    publishedAt: z.coerce.date(),
    /** Editor's framing for the year — drives the landing dek. */
    editorialFraming: z.string(),
    /** Optional editor's letter (markdown allowed). */
    editorsLetter: z.string().optional(),
    /** Hero image for the year's microsite cover. */
    heroImage: imageRef.optional(),
    /**
     * Ranked picks. Order = ranking. Each pick references either a
     * venue, an experience, or a place; exactly one should be set.
     * Unknown references are dropped silently at render time.
     */
    picks: z.array(z.object({
      rank: z.number().int().min(1).max(30),
      venue: reference('venues').optional(),
      experience: reference('experiences').optional(),
      place: reference('places').optional(),
      /** Editor's blurb for this rank — single sentence per the design. */
      blurb: z.string().min(20).max(400),
      /** Optional category tag for filtering on the microsite. */
      category: z.enum([
        'eat', 'wine', 'stay', 'walk', 'beach',
        'experience', 'wellness', 'place', 'event', 'producer',
      ]).optional(),
    })).max(30),
    sitemapExclude: z.boolean().default(false),
  }),
});

/**
 * Reader-submitted local secrets (Phase 4 WS4D). Approved submissions
 * are exported from the Supabase `pi.submissions` table to markdown
 * files in src/content/local-secrets/ by next/scripts/export-local-secrets.mjs.
 * Each file ships at build time as a static page under
 * /journal/local-secrets/<slug>/.
 */
const localSecrets = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/local-secrets' }),
  schema: z.object({
    title: z.string(),
    contributor: z.object({
      name: z.string(),
      handle: z.string().optional(),
    }),
    placeName: z.string().optional(),
    category: z.enum([
      'food', 'drink', 'wine', 'beach', 'walk', 'view',
      'experience', 'event', 'shop', 'service', 'wildlife', 'other',
    ]),
    submittedAt: z.coerce.date(),
    publishedAt: z.coerce.date(),
    editorNote: z.string().optional(),
    heroImage: imageRef.optional(),
    relatedVenues: z.array(reference('venues')).default([]),
    relatedPlaces: z.array(reference('places')).default([]),
    sitemapExclude: z.boolean().default(false),
  }),
});

/**
 * weekendPicks — the canonical editorial shortlist for an upcoming
 * weekend.
 *
 * One JSON file per weekend at `src/content/weekend-picks/YYYY-MM-DD.json`
 * (filename = the Saturday of that weekend in ISO date form). The What's
 * On page renders the entry whose `weekendStart` matches the current
 * upcoming weekend; if no entry exists, the page falls back to events
 * tagged with the `weekend-pick` lens.
 *
 * Per the editorial brief, the Picks list also powers newsletter, social
 * amplification, and AI retrieval — so this is the structured editorial
 * source of truth, not a UI convenience.
 */
const weekendPicks = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/weekend-picks' }),
  schema: z.object({
    weekendStart: z.coerce.date(),       // Saturday of the weekend, midnight local
    weekendLabel: z.string(),             // human-readable, e.g. "16-17 May 2026"
    editorIntro: z.string().optional(),   // optional one-paragraph intro
    picks: z.array(
      z.object({
        eventSlug: z.string(),            // matches an event ID/slug
        editorVerdict: z.string(),        // required for picks — keeps the bar high
        position: z.number().int(),       // 1-based render order, lower = higher
        featured: z.boolean().default(false),
      })
    ).min(1).max(10),
  }),
});

/**
 * signatureEvents — evergreen Signature Event landing pages.
 *
 * These are NOT dated event occurrences (those live in the `events`
 * collection). A Signature Event is one of the Peninsula's anchor
 * annual moments (Portsea Polo, Sorrento Writers Festival, Winter
 * Wine Weekend, etc.) and gets its own editorial page that lives
 * across years. The dated `events` entries link back to these
 * evergreen anchors when an occurrence runs.
 */
const signatureEvents = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/signature-events' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string().optional(),
    summary: z.string(),
    /**
     * Editorial sort order on the What's On hub mini-grid. Lower numbers
     * surface first. Optional — entries without a value fall to the end,
     * then sort alphabetically by name. Moved out of the page .astro
     * (review #9) so editors can re-rank without touching code.
     */
    hubOrder: z.number().int().positive().optional(),
    monthAnchor: z.string(),
    season: season,
    location: z.string(),
    placeRef: reference('places').optional(),
    recurrence: z.string(),
    firstHeld: z.string().optional(),
    officialUrl: z.string().url().optional(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    heroImageCredit: z.string().optional(),
    whatItIs: z.string(),
    whoItsFor: z.string(),
    peninsulaCalendarContext: z.string(),
    gettingThere: z.string(),
    relatedPlaces: z.array(reference('places')).default([]),
    relatedPlans: z.array(z.string()).default([]),
    verificationStatus: z.enum(['verified', 'tentative', 'stub']).default('stub'),
    lastReviewed: z.coerce.date(),
    editorialNotes: z.string().optional(),
  }),
});

/**
 * PI-005  -  the claim and evidence registry.
 *
 * Stage 0 is schema only. These two collections are declared and seeded;
 * nothing in the build reads them yet. Enforcement is Stage 3, and when it
 * lands it extends the ratchet in scripts/audit-event-safeguards.mjs rather
 * than introducing a second gate pattern.
 *
 * Why sidecar collections rather than provenance fields on each record: one
 * claim can be asserted by many records across many collections. The trading
 * status of a venue is asserted by the venue record, by every quick note that
 * mentions it, and by every itinerary that routes through it. No per-record
 * field shape represents that. Supabase was rejected for a different reason:
 * a static build cannot read it without a credentialed CI step.
 *
 * The join between a claim and the corpus is a plain {type, slug} pair, and
 * deliberately not reference(). reference() binds to exactly one collection,
 * and the point of a claim is that it is not owned by one. The pair is
 * validated against disk by scripts/seed-claim-registry.mjs.
 */
const registrySubject = z.object({
  /**
   * A directory name under src/content/, or 'data-facts' for the orphaned
   * fact layer in src/data/facts/. That layer has no collection and no page;
   * naming it here is what makes the orphan visible.
   */
  type: z.string(),
  /**
   * Entry id within that directory, which may contain '/'. When type is
   * 'data-facts' the slug is '<file>/<entity>'.
   */
  slug: z.string(),
  /**
   * The field on that record which carries the assertion, where one field
   * carries it. Prose assertions have no field and are out of scope: no
   * static analysis can decide whether a sentence contains a factual claim.
   */
  field: z.string().optional(),
});

/**
 * Claim classes. Each names a kind of fact that changes underneath us.
 * src/data/source-precedence.json gives every class its source order and its
 * expiry in days, so changing either is a data edit, not a schema migration.
 */
const claimClass = z.enum([
  'trading-status',     // the business is trading at all
  'opening-hours',      // when it is open
  'offering',           // menu, release, programme
  'booking',            // booking windows and requirements
  'rate-change',        // a rate moved. PI publishes no figures; it still
                        // needs to know that the figure changed.
  'event-status',       // running, cancelled, postponed
  'event-schedule',     // dates and times
  'access-restriction', // closures, track and beach restrictions, safety
  'conditions',         // tide, swell, fire, rainfall windows
  'fishing-rule',       // bag limits, size limits, closed seasons
  'address',            // where the place is, as a postal address
  'coordinates',        // where the place is, as a point on the ground.
                        // Deliberately NOT folded into 'address': a record can
                        // carry a correct street address and a pin 1.4km away,
                        // and this corpus has done exactly that. One class
                        // cannot express both, because one supporting row
                        // would then back both facts. See the two entries in
                        // src/data/source-precedence.json, whose precedence
                        // orders differ at the top for the same reason.
  'accessibility',      // access details
  'regional-count',     // counts and aggregates for the region
  'editorial',          // an editor's own note, no external source
]);

/**
 * Who published a piece of evidence. This EXTENDS the quick-note
 * sources[].kind enum rather than replacing it: the first eight values are
 * that enum verbatim, so the 196 existing quick-note source rows migrate with
 * a field rename and nothing else.
 */
const publisherKind = z.enum([
  // quick-note sources[].kind, unchanged
  'venue-site',
  'phone',
  'email',
  'visit',
  'press',
  'social',
  'gov',
  'partner',
  // added for the rest of the corpus
  'organiser',     // the party running the event
  'ticketing',     // Humanitix, Eventbrite and other resellers
  'regional-body', // tourism board, industry association
  'importer',      // our own import pipeline, recording where it looked
  'unknown',       // the honest default. The migration does not guess.
]);

/**
 * claims  -  one row per (record, claim class): what is being asserted, and
 * which records assert it.
 *
 * There is deliberately no `state` field. Supported, unsupported, disputed
 * and retired are derived at read time from the evidence set and the calendar
 * (src/lib/claim-state.mjs). Storing state would mean a migration every time
 * the calendar moved, which is the exact failure the existing bulk
 * lastVerified stamps already demonstrate: 88 of 138 venues carry the
 * identical date and not one of them tracks its own record.
 */
const claims = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/claims' }),
  schema: z.object({
    /**
     * Stable identity: the file path under src/content/claims/ without the
     * extension. Declared explicitly rather than leaning on the loader's
     * generated id, so evidence.claim keeps pointing at the right row
     * whatever the loader does to path segments.
     */
    claimId: z.string(),
    claimClass: claimClass,
    /** The record this claim is about. */
    subject: registrySubject,
    /** One plain sentence: what a reader is being told. */
    statement: z.string(),
    /**
     * Every record that asserts this claim. One claim, many assertions,
     * across collections. The subject is always the first entry.
     */
    assertedBy: z.array(registrySubject).default([]),
    createdAt: z.coerce.date(),
    /**
     * Retirement is a state transition, never a deletion. A retired claim
     * stays on disk so the history of what we once published survives, and
     * git is the audit trail.
     */
    retiredAt: z.coerce.date().optional(),
    retiredReason: z.string().optional(),
    /** claimId of the claim this one replaces. Superseding is additive. */
    supersedes: z.string().optional(),
    /** 'migrated' means a script wrote it from data already on disk. */
    origin: z.enum(['migrated', 'authored']).default('authored'),
    note: z.string().optional(),
  }),
});

/**
 * evidence  -  one row per source attached to a claim. Support and
 * disagreement share one shape, so an editor can inspect both.
 */
const evidence = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/evidence' }),
  schema: z.object({
    /** File path under src/content/evidence/ without the extension. */
    evidenceId: z.string(),
    /** claimId of the claim this row supports or disputes. */
    claim: z.string(),
    stance: z.enum(['supports', 'disputes']).default('supports'),
    publisher: z.object({
      kind: publisherKind,
      name: z.string().optional(),
    }),
    url: z.string().url().optional(),
    ...sourceHealthFields,
    /** How the source was reached when there is no URL: a call, a visit. */
    method: z.string().optional(),
    /**
     * When the source was actually read. For a migrated row this is the date
     * already carried by the record it came from, never the migration date:
     * a migration cannot make the corpus fresher than it already was.
     */
    retrievedAt: z.coerce.date(),
    /**
     * retrievedAt plus the claim class's expiry from
     * src/data/source-precedence.json. Stored, unlike state, because it is a
     * property of this row at the moment it was taken: a later edit to the
     * precedence table must not silently move a promise an existing row has
     * already made. Recomputed on every seed run.
     */
    expiresAt: z.coerce.date(),
    note: z.string().optional(),
    origin: z.enum(['migrated', 'authored']).default('authored'),
    /**
     * evidenceId of the row that replaces this one. The superseded row stays
     * on disk: superseding is additive, expiry is a state transition, and
     * neither one is a deletion.
     */
    supersededBy: z.string().optional(),
    /**
     * Everything the migration read, so the seed is reversible and nothing is
     * lost: the field it came from, that field's value, and the file.
     */
    legacy: z
      .object({
        file: z.string(),
        field: z.string(),
        value: z.string(),
        /** Which field supplied retrievedAt. */
        dateField: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  venues,
  experiences,
  places,
  regions,
  articles,
  itineraries,
  events,
  authors,
  tourOperators,
  tours,
  tourPackages,
  species,
  fishingLocations,
  fishingCharters,
  boatRamps,
  boatHire,
  quickNotes,
  editorial_blocks,
  localSecrets,
  insidersThirty,
  'weekend-picks': weekendPicks,
  'signature-events': signatureEvents,
  claims,
  evidence,
};
