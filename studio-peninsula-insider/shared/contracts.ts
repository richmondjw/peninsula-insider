import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const IsoDateTimeSchema = z.string().datetime();

export const EvidenceLocatorSchema = z.object({
  sourceItemId: z.string().min(1),
  locatorType: z.enum(['selector', 'paragraph', 'timecode', 'manual']),
  locator: z.string().min(1),
  excerpt: z.string().min(1),
  excerptHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
});

export const SourceItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['url', 'text_note', 'audio_note', 'image', 'document']),
  uri: z.string().url().optional(),
  contentHash: Sha256Schema,
  capturedAt: IsoDateTimeSchema,
});

export const IntakeBundleSchema = z.object({
  schemaVersion: z.literal('pi.intake-bundle.v1'),
  id: z.string().min(1),
  title: z.string().min(1),
  submittedBy: z.string().min(1),
  capturedAt: IsoDateTimeSchema,
  sourceItems: z.array(SourceItemSchema).min(1),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  origin: z.enum(['external_fact', 'first_party_observation', 'opinion', 'inference']),
  verification: z.enum(['supported', 'conflicted', 'stale', 'unsupported', 'approved']),
  evidence: z.array(EvidenceLocatorSchema),
  expiresAt: IsoDateTimeSchema.optional(),
  restrictedFromArtifacts: z.boolean().default(false),
  restrictionReason: z.string().optional(),
});

export const ClaimSetVersionSchema = z.object({
  schemaVersion: z.literal('pi.claim-set.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  contentHash: Sha256Schema,
  createdAt: IsoDateTimeSchema,
  lockedAt: IsoDateTimeSchema,
  lockedBy: z.string().min(1),
  claims: z.array(ClaimSchema).min(1),
});

export const StoryAngleSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive().default(1),
  label: z.string().min(1),
  framing: z.string().min(1),
  evidenceClaimIds: z.array(z.string()).min(1),
  selectedBy: z.string().min(1),
});

export const ArtifactTypeSchema = z.enum([
  'quick_note',
  'article_draft',
  'article_metadata',
  'ask_answer',
  'internal_link_plan',
  'seo_metadata_proposal',
  'insider_note_issue',
  'insider_note_subject_set',
  'linkedin_post',
  'instagram_caption',
  'instagram_first_comment',
  'instagram_carousel_script',
  'social_media_brief',
]);

export const RecipeArtifactRequirementSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  required: z.boolean(),
  dependsOnKeys: z.array(z.string()).default([]),
  targetContract: z.string().min(1),
});

export const RecipeDefinitionSchema = z.object({
  schemaVersion: z.literal('pi.recipe-definition.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  label: z.string().min(1),
  sourceKinds: z.array(SourceItemSchema.shape.kind).min(1),
  artifacts: z.array(RecipeArtifactRequirementSchema).min(1),
  textOnlyAllowed: z.literal(true),
  externalCalls: z.literal(false),
});

export const GateCodeSchema = z.enum([
  'no_price',
  'no_em_dash',
  'supported_claims_only',
  'claim_usage_complete',
  'dependency_current',
  'astro_article_contract',
  'ask_answer_contract',
  'astro_patch_ready',
  'insider_note_contract',
  'subject_set_contract',
  'locked_copy_unchanged',
  'cta_limit',
  'email_utm_complete',
  'authoritative_input_present',
  'venue_name_current',
  'intro_shape',
  'secondary_picks_shape',
  'chronological_rows',
  'booking_note_contract',
  'poll_manual_only',
  'subject_pairs_distinct',
  'james_selection_required',
  'social_contract',
  'linkedin_post_contract',
  'instagram_caption_contract',
  'instagram_first_comment_contract',
  'carousel_script_contract',
  'media_placement_rights',
  'no_external_action',
]);

const GateResultBaseSchema = z.object({
  gate: GateCodeSchema,
  scope: z.enum(['artifact', 'pack']),
  detail: z.string().min(1),
  claimIds: z.array(z.string()).default([]),
});

export const GateResultSchema = z.discriminatedUnion('passed', [
  GateResultBaseSchema.extend({ passed: z.literal(true), blocking: z.literal(false) }),
  GateResultBaseSchema.extend({ passed: z.literal(false), blocking: z.boolean().default(true) }),
]);

export const QuickNoteSchema = z.object({
  headline: z.string().max(140),
  dek: z.string().max(320).optional(),
  section: z.enum(['eat', 'stay', 'wine', 'explore', 'spa', 'golf', 'whats-on', 'weather', 'note']),
  tag: z.enum(['opening-window', 'menu-change', 'closure', 'event', 'weather', 'editor-note', 'pricing', 'safety']),
  publishedAt: IsoDateTimeSchema,
  expiresAt: IsoDateTimeSchema,
  verifiedAt: IsoDateTimeSchema.optional(),
  verifiedBy: z.string().optional(),
  sources: z.array(z.object({
    kind: z.enum(['venue-site', 'phone', 'email', 'visit', 'press', 'social', 'gov', 'partner']),
    url: z.string().url().optional(),
    note: z.string().optional(),
    checkedAt: IsoDateTimeSchema.optional(),
  })),
  status: z.literal('draft'),
  body: z.string().min(1),
});

export const ArticleDraftPayloadSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: z.string().min(1),
});

export const ArticleMetadataPayloadSchema = z.object({
  title: z.string().min(1),
  dek: z.string().min(1),
  author: z.string().min(1),
  houseByline: z.boolean(),
  publishedAt: z.string().date(),
  heroImage: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    credit: z.string().min(1),
    license: z.enum([
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
    ]),
  }).optional(),
  astroPatchReady: z.boolean(),
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
  relatedVenues: z.array(z.string()).default([]),
  relatedExperiences: z.array(z.string()).default([]),
  relatedPlaces: z.array(z.string()).default([]),
  relatedArticles: z.array(z.string()).default([]),
  relatedItineraries: z.array(z.string()).default([]),
  readingTimeMinutes: z.number().positive().optional(),
  featured: z.boolean().default(false),
  status: z.literal('draft'),
  lastVerified: z.string().date().optional(),
  clusterLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
  aiSummary: z.array(z.string()).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  sitemapExclude: z.boolean().default(false),
  section: z.enum(['journal', 'plans']).default('journal'),
  planShape: z.enum(['one-night', 'two-night', 'day-trip', 'seasonal']).optional(),
}).refine((payload) => !payload.astroPatchReady || Boolean(payload.heroImage), {
  message: 'A rights-cleared hero image is required when astroPatchReady is true.',
  path: ['heroImage'],
});

export const AskRecommendationSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  href: z.string().optional(),
  why: z.string().optional(),
  signature: z.string().optional(),
  hero_image: z.string().optional(),
  venue_type: z.string().optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  price_band: z.never().optional(),
});

export const AskAnswerPayloadSchema = z.object({
  answer: z.string().min(1),
  recommendations: z.array(AskRecommendationSchema).default([]),
  follow_on: z.array(z.string()).default([]),
  provenance_footer: z.string().default(''),
});

export const InternalLinkPlanPayloadSchema = z.object({
  links: z.array(z.object({
    label: z.string().min(1),
    href: z.string().regex(/^\//),
    placement: z.string().min(1),
  })),
});

export const SeoMetadataProposalPayloadSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(170),
  canonicalPath: z.string().regex(/^\//),
});

const ClaimIdsSchema = z.array(z.string().min(1)).min(1);
const DraftLineSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  claimIds: ClaimIdsSchema,
});
const DraftLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().url(),
  claimIds: ClaimIdsSchema,
});
const OmittedPositionSchema = z.object({
  status: z.literal('omitted'),
  reason: z.enum(['no_applicable_content', 'missing_authoritative_input', 'no_usable_reply', 'rights_not_cleared']),
});

export const InsiderNoteMastheadPositionSchema = z.object({
  id: z.literal('insider_note.position.01.masthead'),
  position: z.literal(1),
  key: z.literal('masthead'),
  status: z.literal('locked'),
  name: z.literal('The Insider Note'),
  tagline: z.literal('Written from inside the region'),
  issueNumberRoman: z.string().regex(/^[IVXLCDM]+$/),
  dateRange: z.string().min(1),
});

export const InsiderNoteIntroPositionSchema = z.object({
  id: z.literal('insider_note.position.02.intro'),
  position: z.literal(2),
  key: z.literal('intro'),
  status: z.literal('included'),
  tense: z.literal('past'),
  lines: z.array(DraftLineSchema).min(1).max(2),
});

export const InsiderNoteLeadPositionSchema = z.object({
  id: z.literal('insider_note.position.03.lead_today_move'),
  position: z.literal(3),
  key: z.literal('lead_today_move'),
  status: z.literal('included'),
  headline: DraftLineSchema,
  body: DraftLineSchema,
  cta: DraftLinkSchema,
});

export const InsiderNoteWeatherPositionSchema = z.union([
  z.object({
    id: z.literal('insider_note.position.04.weather_strip'),
    position: z.literal(4),
    key: z.literal('weather_strip'),
    status: z.literal('included'),
    day: z.string().min(1),
    temperatureC: z.number().int(),
    sky: z.string().min(1),
    sunsetTime: z.string().regex(/^\d{1,2}:\d{2}\s?(?:am|pm)$/i),
    claimIds: ClaimIdsSchema,
  }),
  OmittedPositionSchema.extend({ id: z.literal('insider_note.position.04.weather_strip'), position: z.literal(4), key: z.literal('weather_strip') }),
]);

const InsiderNotePickSchema = z.object({
  id: z.string().min(1),
  dayStamp: z.string().min(1),
  category: z.enum(['EAT', 'WINE', 'STAY', 'EXPLORE', 'CULTURE']),
  venue: z.object({
    name: z.string().min(1),
    path: z.string().regex(/^\/[a-z-]+\/[a-z0-9-]+\/$/),
    claimIds: ClaimIdsSchema,
  }).optional(),
  line: DraftLineSchema,
  cta: DraftLinkSchema.optional(),
  image: z.object({
    src: z.string().min(1),
    alt: z.string().min(1),
    rightsId: z.string().min(1),
    clearedFor: z.literal('email'),
  }).optional(),
});

export const InsiderNoteSecondaryPicksPositionSchema = z.union([
  z.object({
    id: z.literal('insider_note.position.05.secondary_picks'),
    position: z.literal(5),
    key: z.literal('secondary_picks'),
    status: z.literal('included'),
    picks: z.tuple([InsiderNotePickSchema, InsiderNotePickSchema]),
  }),
  OmittedPositionSchema.extend({ id: z.literal('insider_note.position.05.secondary_picks'), position: z.literal(5), key: z.literal('secondary_picks') }),
]);

export const InsiderNoteReaderReplyPositionSchema = z.union([
  z.object({
    id: z.literal('insider_note.position.06.reader_reply'),
    position: z.literal(6),
    key: z.literal('reader_reply'),
    status: z.literal('included'),
    firstName: z.string().min(1).regex(/^[^\s]+$/),
    quote: z.string().min(1),
    claimIds: ClaimIdsSchema,
    privacy: z.literal('first_name_only'),
    sourceLocator: z.object({
      sourceItemId: z.string().min(1),
      locator: z.string().min(1),
      excerptHash: Sha256Schema,
    }),
  }),
  OmittedPositionSchema.extend({ id: z.literal('insider_note.position.06.reader_reply'), position: z.literal(6), key: z.literal('reader_reply') }),
]);

export const InsiderNoteAlsoThisWeekPositionSchema = z.union([
  z.object({
    id: z.literal('insider_note.position.07.also_this_week'),
    position: z.literal(7),
    key: z.literal('also_this_week'),
    status: z.literal('included'),
    rows: z.array(z.object({
      id: z.string().min(1),
      date: z.string().date(),
      dayStamp: z.string().min(1),
      line: DraftLineSchema,
      link: DraftLinkSchema.optional(),
    })).min(1).max(3).refine((rows) => rows.every((row, index) => index === 0 || row.date >= rows[index - 1].date), 'Rows must be chronological.'),
  }),
  OmittedPositionSchema.extend({ id: z.literal('insider_note.position.07.also_this_week'), position: z.literal(7), key: z.literal('also_this_week') }),
]);

export const InsiderNoteBookingPositionSchema = z.union([
  z.object({
    id: z.literal('insider_note.position.08.booking_note'),
    position: z.literal(8),
    key: z.literal('booking_note'),
    status: z.literal('included'),
    line: DraftLineSchema.extend({
      text: z.string().min(1).refine((text) => (text.match(/[.!?](?:\s|$)/g) ?? []).length === 1, 'Booking note must be exactly one sentence.'),
    }),
    link: DraftLinkSchema,
    timeSensitiveClaimIds: ClaimIdsSchema,
  }),
  OmittedPositionSchema.extend({ id: z.literal('insider_note.position.08.booking_note'), position: z.literal(8), key: z.literal('booking_note') }),
]);

export const InsiderNotePollPositionSchema = z.object({
  id: z.literal('insider_note.position.09.poll'),
  position: z.literal(9),
  key: z.literal('poll'),
  status: z.enum(['editorial_decision', 'editorial_supplied']),
  delivery: z.literal('beehiiv_native'),
  suppliedQuestion: z.string().min(1).nullable(),
  suppliedBy: z.string().min(1).nullable(),
}).superRefine((value, context) => {
  const supplied = value.status === 'editorial_supplied';
  if (supplied !== Boolean(value.suppliedQuestion && value.suppliedBy)) {
    context.addIssue({ code: 'custom', message: 'A poll question must be supplied manually with its editor, or remain unset.' });
  }
});

export const InsiderNoteReplySignoffPositionSchema = z.object({
  id: z.literal('insider_note.position.10.reply_prompt_signoff'),
  position: z.literal(10),
  key: z.literal('reply_prompt_signoff'),
  status: z.literal('locked'),
  replyPrompt: z.literal('Been somewhere brilliant this week that we should know about? Just hit reply. We read everything.'),
  signoff: z.literal('The Insider.'),
});

export const InsiderNoteFooterPositionSchema = z.object({
  id: z.literal('insider_note.position.11.footer'),
  position: z.literal(11),
  key: z.literal('footer'),
  status: z.literal('locked'),
  issueNumberRoman: z.string().regex(/^[IVXLCDM]+$/),
  dateRange: z.string().min(1),
  navigation: z.tuple([
    z.object({ id: z.literal('footer-weekend'), key: z.literal('this_weekend'), label: z.literal('this weekend'), href: z.string().url().refine((href) => new URL(href).pathname === '/this-weekend/'), claimIds: ClaimIdsSchema }),
    z.object({ id: z.literal('footer-whats-on'), key: z.literal('whats_on'), label: z.literal("what's on"), href: z.string().url().refine((href) => new URL(href).pathname === '/whats-on/'), claimIds: ClaimIdsSchema }),
    z.object({ id: z.literal('footer-journal'), key: z.literal('journal'), label: z.literal('journal'), href: z.string().url().refine((href) => new URL(href).pathname === '/journal/'), claimIds: ClaimIdsSchema }),
  ]),
  includeUnsubscribe: z.literal(true),
  includeStreetAddress: z.literal(true),
});

export const InsiderNoteIssuePayloadSchema = z.object({
  schemaVersion: z.literal('pi.insider-note-issue.v1'),
  issueNumber: z.number().int().positive(),
  campaignCode: z.string().regex(/^insider-note-\d{2,}$/),
  positions: z.tuple([
    InsiderNoteMastheadPositionSchema,
    InsiderNoteIntroPositionSchema,
    InsiderNoteLeadPositionSchema,
    InsiderNoteWeatherPositionSchema,
    InsiderNoteSecondaryPicksPositionSchema,
    InsiderNoteReaderReplyPositionSchema,
    InsiderNoteAlsoThisWeekPositionSchema,
    InsiderNoteBookingPositionSchema,
    InsiderNotePollPositionSchema,
    InsiderNoteReplySignoffPositionSchema,
    InsiderNoteFooterPositionSchema,
  ]),
  targetReleaseDate: z.string().date(),
  scheduleAt: z.null(),
  sendAuthority: z.literal('james_only'),
  operationalState: z.literal('draft_only'),
});

export const InsiderNoteSubjectSetPayloadSchema = z.object({
  schemaVersion: z.literal('pi.insider-note-subject-set.v1'),
  pairs: z.tuple([
    z.object({ id: z.literal('subject-a'), subject: z.string().min(1).max(120), previewText: z.string().min(1).max(180) }),
    z.object({ id: z.literal('subject-b'), subject: z.string().min(1).max(120), previewText: z.string().min(1).max(180) }),
    z.object({ id: z.literal('subject-c'), subject: z.string().min(1).max(120), previewText: z.string().min(1).max(180) }),
  ]),
  selectedPairId: z.null(),
  selectionAuthority: z.literal('james_only'),
  scheduleAt: z.null(),
  sendAuthority: z.literal('james_only'),
});

const DraftOnlySocialSchema = z.object({
  schemaVersion: z.string().min(1),
  scheduleAt: z.null(),
  publicationAuthority: z.literal('james_only'),
  operationalState: z.literal('draft_only'),
});

export const LinkedInPostPayloadSchema = DraftOnlySocialSchema.extend({
  schemaVersion: z.literal('pi.linkedin-post.v1'),
  openingMode: z.literal('specific_observation'),
  text: z.string().min(1)
    .refine((text) => !/https?:\/\//i.test(text), 'The body must not contain an embedded link.')
    .refine((text) => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return words >= 50 && words <= 300;
    }, 'LinkedIn body must contain 50 to 300 words.')
    .refine((text) => !/(?:like if|comment below|tag someone|agree\?|thoughts\?)/i.test(text), 'Engagement bait is not allowed.'),
  destinationUrl: z.string().url(),
  hashtags: z.array(z.string().regex(/^#[A-Za-z0-9_]+$/)).max(3),
});

export const InstagramCaptionPayloadSchema = DraftOnlySocialSchema.extend({
  schemaVersion: z.literal('pi.instagram-caption.v1'),
  openingMode: z.literal('observation'),
  captionDraft: z.string().min(1).superRefine((text, context) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2 || lines.length > 4) context.addIssue({ code: 'custom', message: 'Instagram caption must contain 2 to 4 non-empty lines.' });
    if (/#\w+/.test(text)) context.addIssue({ code: 'custom', message: 'Caption hashtags remain outside the caption draft.' });
    if (/\bwe recommend\b/i.test(text)) context.addIssue({ code: 'custom', message: 'Caption must not use generic recommendation language.' });
  }),
  destinationPath: z.string().regex(/^\//),
  cadenceDecision: z.literal('unresolved'),
  hashtagPlacementDecision: z.literal('unresolved'),
});

export const InstagramFirstCommentPayloadSchema = DraftOnlySocialSchema.extend({
  schemaVersion: z.literal('pi.instagram-first-comment.v1'),
  commentDraft: z.string().min(1),
  hashtagCandidates: z.array(z.string().regex(/^#[A-Za-z0-9_]+$/)).min(3).max(5)
    .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, 'Hashtag candidates must be unique.'),
  placementDecision: z.literal('unresolved'),
  cadenceDecision: z.literal('unresolved'),
});

export const InstagramCarouselScriptPayloadSchema = DraftOnlySocialSchema.extend({
  schemaVersion: z.literal('pi.instagram-carousel-script.v1'),
  slides: z.array(z.object({
    number: z.number().int().positive(),
    heading: z.string().min(1),
    body: z.string().min(1),
    claimIds: ClaimIdsSchema,
  })).min(3).max(5).refine((slides) => slides.every((slide, index) => slide.number === index + 1), 'Slides must be ordered from 1 without gaps.'),
});

export const SocialMediaBriefPayloadSchema = DraftOnlySocialSchema.extend({
  schemaVersion: z.literal('pi.social-media-brief.v1'),
  assetId: z.string().min(1),
  targetSurface: z.literal('instagram'),
  placement: z.enum(['feed', 'carousel']),
  mediaType: z.enum(['image', 'carousel']),
  description: z.string().min(1),
  altText: z.string().min(1),
  placementRights: z.object({
    status: z.enum(['cleared', 'not_cleared', 'expired', 'revoked']),
    allowedSurfaces: z.array(z.enum(['website', 'email', 'instagram', 'linkedin'])),
    recognisablePeople: z.enum(['none', 'released', 'unreleased', 'unknown']),
    rightsId: z.string().min(1).optional(),
  }),
});

export const ClaimUsageSchema = z.object({
  segmentId: z.string().min(1),
  path: z.string().min(1),
  claimIds: z.array(z.string()).min(1),
  contentHash: Sha256Schema,
});

export const ArtifactDependencySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('claim_set'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('artifact'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('angle'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  z.object({
    kind: z.literal('media_rights'),
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
    status: z.literal('cleared'),
  }),
]);

const ArtifactVersionBaseSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  version: z.number().int().positive(),
  contentHash: Sha256Schema,
  angleId: z.string().min(1),
  angleVersion: z.number().int().positive(),
  factualSegmentIds: z.array(z.string()),
  claimUsage: z.array(ClaimUsageSchema),
  dependencies: z.array(ArtifactDependencySchema).min(1),
  gateResults: z.array(GateResultSchema),
});

export const QuickNoteArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('quick_note'),
  claimIds: z.array(z.string()),
  payload: QuickNoteSchema,
});

export const ArticleDraftArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('article_draft'),
  payload: ArticleDraftPayloadSchema,
});

export const ArticleMetadataArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('article_metadata'),
  payload: ArticleMetadataPayloadSchema,
});

export const AskAnswerArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('ask_answer'),
  payload: AskAnswerPayloadSchema,
});

export const InternalLinkPlanArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('internal_link_plan'),
  payload: InternalLinkPlanPayloadSchema,
});

export const SeoMetadataProposalArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('seo_metadata_proposal'),
  payload: SeoMetadataProposalPayloadSchema,
});

export const InsiderNoteIssueArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('insider_note_issue'),
  payload: InsiderNoteIssuePayloadSchema,
});

export const InsiderNoteSubjectSetArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('insider_note_subject_set'),
  payload: InsiderNoteSubjectSetPayloadSchema,
});

export const LinkedInPostArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('linkedin_post'),
  payload: LinkedInPostPayloadSchema,
});

export const InstagramCaptionArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('instagram_caption'),
  payload: InstagramCaptionPayloadSchema,
});

export const InstagramFirstCommentArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('instagram_first_comment'),
  payload: InstagramFirstCommentPayloadSchema,
});

export const InstagramCarouselScriptArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('instagram_carousel_script'),
  payload: InstagramCarouselScriptPayloadSchema,
});

export const SocialMediaBriefArtifactSchema = ArtifactVersionBaseSchema.extend({
  type: z.literal('social_media_brief'),
  payload: SocialMediaBriefPayloadSchema,
});

export const ArtifactVersionSchema = z.discriminatedUnion('type', [
  QuickNoteArtifactSchema,
  ArticleDraftArtifactSchema,
  ArticleMetadataArtifactSchema,
  AskAnswerArtifactSchema,
  InternalLinkPlanArtifactSchema,
  SeoMetadataProposalArtifactSchema,
  InsiderNoteIssueArtifactSchema,
  InsiderNoteSubjectSetArtifactSchema,
  LinkedInPostArtifactSchema,
  InstagramCaptionArtifactSchema,
  InstagramFirstCommentArtifactSchema,
  InstagramCarouselScriptArtifactSchema,
  SocialMediaBriefArtifactSchema,
]);

export const ArtifactFailureSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  required: z.boolean(),
  code: z.enum(['fixture_derivative_failure', 'contract_invalid', 'blocked_claim', 'dependency_failed']),
  detail: z.string().min(1),
  attemptedAt: IsoDateTimeSchema,
});

export const ArtifactOmissionSchema = z.object({
  key: z.string().min(1),
  type: ArtifactTypeSchema,
  reason: z.enum(['not_requested', 'no_applicable_content', 'rights_not_cleared']),
  detail: z.string().min(1),
});

export const StoredArtifactReviewDecisionSchema = z.object({
  id: z.string().min(1),
  artifactId: z.string().min(1),
  artifactVersion: z.number().int().positive(),
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  note: z.string().max(500).optional(),
  decidedAt: IsoDateTimeSchema,
  status: z.enum(['current', 'stale']),
  dependencySnapshot: z.array(ArtifactDependencySchema),
  authority: z.literal('draft_handoff_only'),
});

export const ArtifactPackSchema = z.object({
  schemaVersion: z.literal('pi.artifact-pack.v1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  recipeId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  claimSetRef: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    contentHash: Sha256Schema,
  }),
  angleRef: z.object({ id: z.string().min(1), version: z.number().int().positive() }),
  status: z.enum(['complete', 'partial', 'failed']),
  completed: z.array(ArtifactVersionSchema),
  failed: z.array(ArtifactFailureSchema),
  omitted: z.array(ArtifactOmissionSchema),
  reviews: z.array(StoredArtifactReviewDecisionSchema),
});

export const ReviewDecisionSchema = z.object({
  artifactId: z.string().min(1).optional(),
  decision: z.enum(['accepted', 'rejected']),
  reviewer: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  expectedArtifactVersion: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export const ArtifactEditSchema = z.object({
  editor: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  headline: z.string().min(1).max(140),
  dek: z.string().max(320).optional(),
  body: z.string().min(1),
});

export const ArtifactUpdateSchema = z.object({
  editor: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  expectedArtifactVersion: z.number().int().positive(),
  payload: z.unknown(),
  factualSegmentIds: z.array(z.string().min(1)).optional(),
  claimUsage: z.array(ClaimUsageSchema).optional(),
});

export const AuditEventSchema = z.object({
  at: IsoDateTimeSchema,
  actor: z.string().min(1),
  type: z.string().min(1),
  detail: z.string().min(1),
});

export const FoundryRunSchema = z.object({
  schemaVersion: z.literal('pi.foundry-run.v2'),
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  evaluationAsOf: IsoDateTimeSchema.optional(),
  bundle: IntakeBundleSchema,
  recipe: RecipeDefinitionSchema,
  claimSet: ClaimSetVersionSchema,
  angle: StoryAngleSchema,
  artifactPack: ArtifactPackSchema,
  blockers: z.array(z.string()),
  audit: z.array(AuditEventSchema),
  // v0.1 compatibility projections. New recipes do not populate these fields.
  claims: z.array(ClaimSchema).optional(),
  artifact: QuickNoteArtifactSchema.optional(),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
  }).optional(),
});

const LegacyGateResultSchema = z.object({
  gate: z.string().min(1),
  passed: z.boolean(),
  detail: z.string().min(1),
});

export const LegacyQuickNoteArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  type: z.literal('quick_note'),
  claimIds: z.array(z.string()),
  angleId: z.string().min(1),
  payload: QuickNoteSchema,
  gateResults: z.array(LegacyGateResultSchema),
});

export const LegacyFoundryRunSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  version: z.number().int().positive(),
  status: z.enum(['ready_for_review', 'needs_revision', 'accepted', 'rejected', 'failed']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  bundle: IntakeBundleSchema,
  claims: z.array(ClaimSchema),
  angle: StoryAngleSchema.omit({ version: true }),
  artifact: LegacyQuickNoteArtifactSchema,
  blockers: z.array(z.string()),
  review: z.object({
    decision: z.enum(['accepted', 'rejected']),
    reviewer: z.string(),
    note: z.string().optional(),
    decidedAt: IsoDateTimeSchema,
  }).optional(),
  audit: z.array(AuditEventSchema),
});

export type FoundryRun = z.infer<typeof FoundryRunSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type ArtifactEdit = z.infer<typeof ArtifactEditSchema>;
export type ArtifactUpdate = z.infer<typeof ArtifactUpdateSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimSetVersion = z.infer<typeof ClaimSetVersionSchema>;
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;
export type ArtifactDependency = z.infer<typeof ArtifactDependencySchema>;
export type ArtifactPack = z.infer<typeof ArtifactPackSchema>;
export type GateResult = z.infer<typeof GateResultSchema>;
export type RecipeDefinition = z.infer<typeof RecipeDefinitionSchema>;
export type LegacyFoundryRun = z.infer<typeof LegacyFoundryRunSchema>;
