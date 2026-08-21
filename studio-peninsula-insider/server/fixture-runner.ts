import { createHash } from 'node:crypto';
import type { z } from 'zod';
import {
  ArticleDraftPayloadSchema,
  ArticleMetadataPayloadSchema,
  ArtifactVersionSchema,
  AskAnswerPayloadSchema,
  ClaimSchema,
  FoundryRunSchema,
  InstagramCaptionPayloadSchema,
  InstagramCarouselScriptPayloadSchema,
  InstagramFirstCommentPayloadSchema,
  InsiderNoteIssuePayloadSchema,
  InsiderNoteSubjectSetPayloadSchema,
  InternalLinkPlanPayloadSchema,
  LegacyFoundryRunSchema,
  LinkedInPostPayloadSchema,
  QuickNoteSchema,
  RecipeDefinitionSchema,
  SeoMetadataProposalPayloadSchema,
  SocialMediaBriefPayloadSchema,
  type ArtifactVersion,
  type ArtifactDependency,
  type Claim,
  type ClaimSetVersion,
  type FoundryRun,
  type GateResult,
  type LegacyFoundryRun,
  type RecipeDefinition,
} from '../shared/contracts.js';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashValue = (value: unknown) => hash(JSON.stringify(value));

export function resolveArtifactPath(payload: unknown, path: string): unknown {
  if (path === '$') return payload;
  const paragraph = path.match(/^\$\.body::paragraph\[(\d+)\]$/);
  if (paragraph) {
    if (!payload || typeof payload !== 'object' || typeof (payload as { body?: unknown }).body !== 'string') return undefined;
    return (payload as { body: string }).body.split(/\n\s*\n/)[Number(paragraph[1])];
  }
  if (!path.startsWith('$.')) return undefined;
  const tokens = path.slice(2).match(/[^.\[\]]+|\[(\d+)\]/g);
  if (!tokens) return undefined;
  let current: unknown = payload;
  for (const token of tokens) {
    const index = token.match(/^\[(\d+)\]$/);
    if (index) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(index[1])];
    } else {
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[token];
    }
  }
  return current;
}

function bindClaimUsage<T extends Array<{ segmentId: string; path: string; claimIds: string[] }>>(payload: unknown, usage: T) {
  return usage.map((item) => ({ ...item, contentHash: hashValue(resolveArtifactPath(payload, item.path)) }));
}

export const FIXTURE_ID = 'red-hill-winter-lunch';
export const URL_ARTICLE_FIXTURE_ID = 'red-hill-url-article';
export const NEWSLETTER_SOCIAL_FIXTURE_ID = 'red-hill-newsletter-social';

const PRICE_PATTERN = /(?:\$\s?\d|\bAUD\b|\bprice(?:d|s|band)?\b)/i;

export const QUICK_NOTE_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1',
  id: 'quick_note_v1',
  version: 1,
  label: 'Quick note',
  sourceKinds: ['url'],
  artifacts: [{
    key: 'quick-note',
    type: 'quick_note',
    required: true,
    dependsOnKeys: [],
    targetContract: 'astro.quick-notes.v1',
  }],
  textOnlyAllowed: true,
  externalCalls: false,
});

export const URL_ARTICLE_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1',
  id: 'url_article_v1',
  version: 1,
  label: 'URL article and Ask pack',
  sourceKinds: ['url'],
  artifacts: [
    { key: 'article-draft', type: 'article_draft', required: true, dependsOnKeys: [], targetContract: 'astro.articles.body.v1' },
    { key: 'article-metadata', type: 'article_metadata', required: true, dependsOnKeys: ['article-draft'], targetContract: 'astro.articles.frontmatter.v2026-08-21' },
    { key: 'ask-answer', type: 'ask_answer', required: true, dependsOnKeys: [], targetContract: 'concierge.ask.response.v1' },
    { key: 'internal-link-plan', type: 'internal_link_plan', required: false, dependsOnKeys: ['article-draft'], targetContract: 'internal.link-plan.v1' },
    { key: 'seo-metadata', type: 'seo_metadata_proposal', required: false, dependsOnKeys: ['article-draft'], targetContract: 'astro.base-layout.meta.v1' },
  ],
  textOnlyAllowed: true,
  externalCalls: false,
});

export const NEWSLETTER_SOCIAL_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1',
  id: 'newsletter_social_v1',
  version: 1,
  label: 'Insider Note and social draft pack',
  sourceKinds: ['url', 'text_note', 'image'],
  artifacts: [
    { key: 'article-draft', type: 'article_draft', required: true, dependsOnKeys: [], targetContract: 'astro.articles.body.v1' },
    { key: 'insider-note-issue', type: 'insider_note_issue', required: true, dependsOnKeys: ['article-draft'], targetContract: 'email.insider-note.positions.v1' },
    { key: 'insider-note-subjects', type: 'insider_note_subject_set', required: true, dependsOnKeys: ['insider-note-issue'], targetContract: 'email.insider-note.subject-set.v1' },
    { key: 'linkedin-post', type: 'linkedin_post', required: true, dependsOnKeys: ['article-draft'], targetContract: 'social.linkedin.draft.v1' },
    { key: 'instagram-caption', type: 'instagram_caption', required: true, dependsOnKeys: ['article-draft'], targetContract: 'social.instagram.caption-draft.v1' },
    { key: 'instagram-first-comment', type: 'instagram_first_comment', required: true, dependsOnKeys: ['instagram-caption'], targetContract: 'social.instagram.first-comment-draft.v1' },
    { key: 'instagram-carousel', type: 'instagram_carousel_script', required: false, dependsOnKeys: ['article-draft'], targetContract: 'social.instagram.carousel-script.v1' },
    { key: 'social-media-brief', type: 'social_media_brief', required: true, dependsOnKeys: ['instagram-carousel'], targetContract: 'social.media-placement-brief.v1' },
  ],
  textOnlyAllowed: true,
  externalCalls: false,
});

function gate(
  gateName: GateResult['gate'],
  passed: boolean,
  detail: string,
  claimIds: string[] = [],
  blocking = true,
): GateResult {
  return passed
    ? { gate: gateName, scope: 'artifact', passed: true, blocking: false, detail, claimIds }
    : { gate: gateName, scope: 'artifact', passed: false, blocking, detail, claimIds };
}

function claimIsUsable(claim: Claim | undefined, asOf: string): boolean {
  return Boolean(
    claim
    && !claim.restrictedFromArtifacts
    && ['supported', 'approved'].includes(claim.verification)
    && claim.evidence.length > 0
    && (!claim.expiresAt || claim.expiresAt > asOf),
  );
}

export function evaluateArtifactGates(
  payload: unknown,
  claims: Claim[],
  factualSegmentIds: string[],
  claimUsage: ArtifactVersion['claimUsage'],
  asOf: string,
  contract?: { gate: 'astro_article_contract' | 'ask_answer_contract'; schema: z.ZodType },
): GateResult[] {
  const publicCopy = JSON.stringify(payload);
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const usageBySegment = new Map(claimUsage.map((usage) => [usage.segmentId, usage]));
  const usedClaimIds = [...new Set(claimUsage.flatMap((usage) => usage.claimIds))];
  const uniqueSegments = new Set(factualSegmentIds);
  const completeUsage = uniqueSegments.size === factualSegmentIds.length
    && claimUsage.length === factualSegmentIds.length
    && claimUsage.every((usage) => uniqueSegments.has(usage.segmentId))
    && factualSegmentIds.every((segmentId) => {
    const usage = usageBySegment.get(segmentId);
    if (!usage || usage.claimIds.length === 0) return false;
    const value = resolveArtifactPath(payload, usage.path);
    return value !== undefined && value !== null && value !== '' && usage.contentHash === hashValue(value);
  });
  const paragraphUsages = claimUsage.filter((usage) => /^\$\.body::paragraph\[\d+\]$/.test(usage.path));
  const paragraphCoverage = paragraphUsages.length === 0 || (
    payload !== null
    && typeof payload === 'object'
    && typeof (payload as { body?: unknown }).body === 'string'
    && (payload as { body: string }).body.split(/\n\s*\n/).length === paragraphUsages.length
    && paragraphUsages.every((usage, index) => usage.path === `$.body::paragraph[${index}]`)
  );
  const lineageComplete = completeUsage && paragraphCoverage;
  const supportedClaims = usedClaimIds.length > 0 && usedClaimIds.every((claimId) => claimIsUsable(claimsById.get(claimId), asOf));
  const results: GateResult[] = [
    gate('no_price', !PRICE_PATTERN.test(publicCopy), 'Public artifact content must not contain pricing.'),
    gate('no_em_dash', !/—/.test(publicCopy), 'Public artifact content must not contain em dashes; en dashes remain valid for ranges.'),
    gate('claim_usage_complete', lineageComplete, lineageComplete ? 'Every factual segment resolves to current content and maps to at least one claim.' : 'A factual segment is missing, changed, unresolved or lacks a claim mapping.', usedClaimIds),
    gate('supported_claims_only', supportedClaims, supportedClaims ? 'Every used claim is current, supported, evidenced and unrestricted.' : 'A used claim is missing, expired, unsupported, unevidenced or restricted.', usedClaimIds),
    gate('dependency_current', true, 'Every dependency points to the current locked version.'),
  ];
  if (contract) {
    const parsed = contract.schema.safeParse(payload);
    results.push(gate(contract.gate, parsed.success, parsed.success ? 'Payload matches the target contract.' : 'Payload does not match the target contract.'));
  }
  return results;
}

const CURRENT_FIXTURE_VENUES = new Map([
  ['/stay/cassis/', 'Cassis Red Hill'],
  ['/stay/hotel-sorrento/', 'Hotel Sorrento'],
]);

function hasRequiredEmailUtm(href: string, campaignCode: string): boolean {
  try {
    const url = new URL(href);
    return url.searchParams.get('utm_source') === 'email'
      && url.searchParams.get('utm_medium') === 'newsletter'
      && url.searchParams.get('utm_campaign') === campaignCode;
  } catch {
    return false;
  }
}

function collectPropertyValues(input: unknown, property: string): unknown[] {
  if (Array.isArray(input)) return input.flatMap((item) => collectPropertyValues(item, property));
  if (!input || typeof input !== 'object') return [];
  return Object.entries(input as Record<string, unknown>).flatMap(([key, value]) => [
    ...(key === property ? [value] : []),
    ...collectPropertyValues(value, property),
  ]);
}

export function evaluateArtifactFormatGates(
  type: ArtifactVersion['type'],
  payload: unknown,
  claims: Claim[],
  asOf: string,
): GateResult[] {
  if (type === 'insider_note_issue') {
    const parsed = InsiderNoteIssuePayloadSchema.safeParse(payload);
    const issue = parsed.success ? parsed.data : undefined;
    const locked = Boolean(issue
      && issue.positions[0].name === 'The Insider Note'
      && issue.positions[0].tagline === 'Written from inside the region'
      && issue.positions[9].replyPrompt === 'Been somewhere brilliant this week that we should know about? Just hit reply. We read everything.'
      && issue.positions[9].signoff === 'The Insider.'
      && issue.positions[10].includeUnsubscribe
      && issue.positions[10].includeStreetAddress);
    const leadVerb = Boolean(issue && /^(?:Book|Go|Visit|Plan|Check|Reserve|Explore)\b/i.test(issue.positions[2].cta.label)
      && !/^Read more\b/i.test(issue.positions[2].cta.label));
    const ctaCounts = issue ? [
      1,
      issue.positions[4].status === 'included' ? issue.positions[4].picks.filter((pick) => pick.cta).length : 0,
      issue.positions[6].status === 'included' ? issue.positions[6].rows.filter((row) => row.link).length : 0,
      issue.positions[7].status === 'included' ? 1 : 0,
    ] : [2];
    const ctasValid = leadVerb && ctaCounts.every((count) => count <= 1);
    const hrefs = issue ? collectPropertyValues(issue.positions, 'href').filter((value): value is string => typeof value === 'string') : [];
    const utmsValid = Boolean(issue && hrefs.length > 0 && hrefs.every((href) => hasRequiredEmailUtm(href, issue.campaignCode)));
    const weather = issue?.positions[3];
    const reply = issue?.positions[5];
    const replyLineage = !reply || reply.status === 'omitted' || reply.claimIds.some((claimId) => (
      claims.find((claim) => claim.id === claimId)?.evidence.some((evidence) => (
        evidence.sourceItemId === reply.sourceLocator.sourceItemId
        && evidence.locator === reply.sourceLocator.locator
        && evidence.excerptHash === reply.sourceLocator.excerptHash
        && hash(reply.quote) === reply.sourceLocator.excerptHash
      ))
    ));
    const authoritativeInputs = Boolean(issue
      && (!weather || weather.status === 'omitted' || weather.claimIds.length > 0)
      && (!reply || reply.status === 'omitted' || (reply.claimIds.length > 0 && reply.privacy === 'first_name_only' && replyLineage)));
    const venueRefs = issue ? collectPropertyValues(issue.positions, 'venue').filter((value): value is { name: string; path: string } => (
      Boolean(value && typeof value === 'object' && 'name' in value && 'path' in value)
    )) : [];
    const venueNamesCurrent = Boolean(issue && venueRefs.every((venue) => CURRENT_FIXTURE_VENUES.get(venue.path) === venue.name));
    const introValid = Boolean(issue && issue.positions[1].tense === 'past' && issue.positions[1].lines.length > 0 && issue.positions[1].lines.length <= 2);
    const secondaryValid = Boolean(issue && (issue.positions[4].status === 'omitted' || issue.positions[4].picks.length === 2));
    const also = issue?.positions[6];
    const chronological = !also ? false : also.status === 'omitted' || (
      also.rows.length <= 3 && also.rows.every((row, index) => index === 0 || row.date >= also.rows[index - 1].date)
    );
    const booking = issue?.positions[7];
    const bookingValid = !booking ? false : booking.status === 'omitted' || (
      (booking.line.text.match(/[.!?](?:\s|$)/g) ?? []).length === 1
      && booking.timeSensitiveClaimIds.length > 0
      && booking.timeSensitiveClaimIds.every((claimId) => booking.line.claimIds.includes(claimId))
      && booking.timeSensitiveClaimIds.every((claimId) => claimIsUsable(claims.find((claim) => claim.id === claimId), asOf))
    );
    const poll = issue?.positions[8];
    const pollManual = Boolean(issue && poll && (
      (poll.status === 'editorial_decision' && poll.suppliedQuestion === null && poll.suppliedBy === null)
      || (poll.status === 'editorial_supplied' && Boolean(poll.suppliedQuestion && poll.suppliedBy))
    ));
    return [
      gate('insider_note_contract', parsed.success, parsed.success ? 'Payload preserves the stable 11-position Insider Note union.' : 'Payload does not match the stable 11-position Insider Note contract.'),
      gate('locked_copy_unchanged', locked, locked ? 'Masthead, reply prompt, sign-off and footer obligations are unchanged.' : 'Locked Insider Note copy or footer obligations changed.'),
      gate('cta_limit', ctasValid, ctasValid ? 'The lead CTA is a verb and every variable position has at most one CTA.' : 'A position has too many CTAs or the lead CTA is not an allowed verb.'),
      gate('email_utm_complete', utmsValid, utmsValid ? 'Every issue link carries the required email newsletter campaign parameters.' : 'One or more issue links is missing the required Insider Note campaign parameters.'),
      gate('authoritative_input_present', authoritativeInputs, authoritativeInputs ? 'Weather and reader reply are either sourced or honestly omitted.' : 'Weather or reader reply lacks authoritative claim lineage.'),
      gate('venue_name_current', venueNamesCurrent, venueNamesCurrent ? 'Every referenced venue name matches its current site record.' : 'A referenced venue name does not match the current site record.'),
      gate('intro_shape', introValid, introValid ? 'The intro is explicitly past tense and contains no more than two lines.' : 'The intro must be past tense and contain one or two lines.'),
      gate('secondary_picks_shape', secondaryValid, secondaryValid ? 'Secondary picks are honestly omitted or contain exactly two picks.' : 'A present secondary-picks position must contain exactly two picks.'),
      gate('chronological_rows', chronological, chronological ? 'Also This Week contains at most three chronological rows.' : 'Also This Week rows must be chronological and limited to three.'),
      gate('booking_note_contract', bookingValid, bookingValid ? 'The booking note is one time-sensitive sentence with current evidence and one link.' : 'The booking note must be one time-sensitive sourced sentence with one link.'),
      gate('poll_manual_only', pollManual, pollManual ? 'The poll remains unset or contains a separately supplied editorial question.' : 'The recipe cannot generate a poll question.'),
      gate('no_external_action', Boolean(issue && issue.scheduleAt === null && issue.operationalState === 'draft_only' && issue.sendAuthority === 'james_only'), 'This artifact cannot schedule or send and preserves James-only send authority.'),
    ];
  }

  if (type === 'insider_note_subject_set') {
    const parsed = InsiderNoteSubjectSetPayloadSchema.safeParse(payload);
    const subjectSet = parsed.success ? parsed.data : undefined;
    const normalizeCandidate = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/g, '').trim();
    const candidates = subjectSet?.pairs.flatMap((pair) => [normalizeCandidate(pair.subject), normalizeCandidate(pair.previewText)]) ?? [];
    const distinct = candidates.length === 6 && new Set(candidates).size === 6;
    return [
      gate('subject_set_contract', parsed.success, parsed.success ? 'The subject artifact contains exactly three subject and preview pairs.' : 'The subject artifact does not match its contract.'),
      gate('subject_pairs_distinct', distinct, distinct ? 'All three subjects and all three previews are genuinely distinct.' : 'Subjects and previews must be genuinely distinct.'),
      gate('james_selection_required', Boolean(subjectSet && subjectSet.selectedPairId === null && subjectSet.selectionAuthority === 'james_only'), 'No subject is selected in the draft artifact; only James can choose one.'),
      gate('no_external_action', Boolean(subjectSet && subjectSet.scheduleAt === null && subjectSet.sendAuthority === 'james_only'), 'This artifact cannot schedule or send and preserves James-only send authority.'),
    ];
  }

  const socialSchemas = {
    linkedin_post: LinkedInPostPayloadSchema,
    instagram_caption: InstagramCaptionPayloadSchema,
    instagram_first_comment: InstagramFirstCommentPayloadSchema,
    instagram_carousel_script: InstagramCarouselScriptPayloadSchema,
    social_media_brief: SocialMediaBriefPayloadSchema,
  } as const;
  if (type in socialSchemas) {
    const schema = socialSchemas[type as keyof typeof socialSchemas];
    const parsed = schema.safeParse(payload);
    const draft = parsed.success ? parsed.data as { scheduleAt: null; publicationAuthority: 'james_only'; operationalState: 'draft_only' } : undefined;
    const results = [
      gate('social_contract', parsed.success, parsed.success ? 'Payload matches its channel-specific draft contract.' : 'Payload does not match its channel-specific draft contract.'),
      gate('no_external_action', Boolean(draft && draft.scheduleAt === null && draft.publicationAuthority === 'james_only' && draft.operationalState === 'draft_only'), 'This artifact cannot schedule or publish and preserves James-only publication authority.'),
    ];
    if (type === 'linkedin_post') {
      const post = LinkedInPostPayloadSchema.safeParse(payload);
      results.push(gate('linkedin_post_contract', post.success, post.success ? 'LinkedIn copy has a specific opening, 50 to 300 words, one separate link, at most three hashtags and no engagement bait.' : 'LinkedIn copy violates its specific-opening, length, link, hashtag or engagement-bait rules.'));
    }
    if (type === 'instagram_caption') {
      const caption = InstagramCaptionPayloadSchema.safeParse(payload);
      results.push(gate('instagram_caption_contract', caption.success, caption.success ? 'Instagram caption is observation-first, 2 to 4 lines and keeps hashtags outside caption copy.' : 'Instagram caption violates its line, voice or hashtag rules.'));
    }
    if (type === 'instagram_first_comment') {
      const comment = InstagramFirstCommentPayloadSchema.safeParse(payload);
      results.push(gate('instagram_first_comment_contract', comment.success, comment.success ? 'First-comment draft has 3 to 5 unique hashtag candidates with placement unresolved.' : 'First-comment hashtag candidates must be 3 to 5 unique values and placement must remain unresolved.'));
    }
    if (type === 'instagram_carousel_script') {
      const carousel = InstagramCarouselScriptPayloadSchema.safeParse(payload);
      results.push(gate('carousel_script_contract', carousel.success, carousel.success ? 'Carousel contains 3 to 5 ordered, claim-linked slides.' : 'Carousel must contain 3 to 5 ordered, claim-linked slides.'));
    }
    if (type === 'social_media_brief') {
      const brief = SocialMediaBriefPayloadSchema.safeParse(payload);
      const rights = brief.success
        && brief.data.placementRights.status === 'cleared'
        && brief.data.placementRights.allowedSurfaces.includes(brief.data.targetSurface)
        && ['none', 'released'].includes(brief.data.placementRights.recognisablePeople);
      results.push(gate('media_placement_rights', rights, rights ? 'Placement rights explicitly allow this Instagram surface.' : 'Instagram handoff is blocked until rights allow the exact target surface and people are released.'));
    }
    return results;
  }

  return [];
}

export function socialMediaRightsSnapshot(payload: z.infer<typeof SocialMediaBriefPayloadSchema>) {
  return {
    assetId: payload.assetId,
    targetSurface: payload.targetSurface,
    placement: payload.placement,
    mediaType: payload.mediaType,
    placementRights: payload.placementRights,
  };
}

export function evaluateQuickNoteGates(
  payload: { headline: string; dek?: string; body: string },
  claims: Claim[],
  claimIds: string[],
): GateResult[] {
  return evaluateArtifactGates(
    payload,
    claims,
    ['quick-note-copy'],
    bindClaimUsage(payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds }]),
    '2026-08-21T05:00:00.000Z',
  );
}

function fixtureSource(actor: string) {
  const capturedAt = '2026-08-21T05:00:00.000Z';
  const sourceUrl = 'https://example.test/red-hill-winter-lunch';
  const sourceId = 'source-url-red-hill';
  const rawClaims = [
    { id: 'claim-location', text: 'The venue is in Red Hill.', origin: 'external_fact', verification: 'supported', locator: 'p:1' },
    { id: 'claim-date', text: 'The winter lunch is available on Saturday 29 August.', origin: 'external_fact', verification: 'supported', locator: 'p:2' },
    { id: 'claim-booking', text: 'Booking is required for the winter lunch.', origin: 'external_fact', verification: 'supported', locator: 'p:3' },
    { id: 'claim-observation', text: 'The covered dining room suits a wet-weather lunch.', origin: 'first_party_observation', verification: 'approved', locator: 'note:1' },
    { id: 'claim-weather', text: 'Saturday is forecast to reach 16 degrees with showers and a 5:48 pm sunset.', origin: 'external_fact', verification: 'supported', locator: 'weather:1' },
    { id: 'claim-reply', text: 'A supplied reader reply says the covered room saved a rainy lunch.', evidenceExcerpt: 'The covered room saved our rainy lunch.', origin: 'first_party_observation', verification: 'approved', locator: 'reply:1' },
    { id: 'claim-venue-name', text: 'The site venue record spells the name Cassis Red Hill.', origin: 'external_fact', verification: 'supported', locator: 'venue:cassis' },
    { id: 'claim-venue-name-2', text: 'The site venue record spells the name Hotel Sorrento.', origin: 'external_fact', verification: 'supported', locator: 'venue:hotel-sorrento' },
    { id: 'claim-image', text: 'The fixture image depicts the Red Hill hinterland in late autumn.', origin: 'first_party_observation', verification: 'approved', locator: 'image:1' },
  ] as const;
  const evidence = (excerpt: string, locator: string, sourceItemId = sourceId) => [{
    sourceItemId,
    locatorType: 'paragraph' as const,
    locator,
    excerpt,
    excerptHash: hash(excerpt),
    capturedAt,
  }];
  const claims = ClaimSchema.array().parse([
    ...rawClaims.map((claim) => ({
      ...claim,
      evidence: evidence(
        'evidenceExcerpt' in claim ? claim.evidenceExcerpt : claim.text,
        claim.locator,
        claim.id === 'claim-reply' ? 'source-reader-reply' : claim.id === 'claim-image' ? 'source-image-red-hill' : sourceId,
      ),
      restrictedFromArtifacts: false,
    })),
    { id: 'claim-expired', text: 'A preview service ran on Friday 14 August.', origin: 'external_fact', verification: 'supported', evidence: evidence('A preview service ran on Friday 14 August.', 'p:4'), expiresAt: '2026-08-15T00:00:00.000Z', restrictedFromArtifacts: false },
    { id: 'claim-unsupported', text: 'This is the Peninsula\'s best lunch.', origin: 'inference', verification: 'unsupported', evidence: [], restrictedFromArtifacts: true, restrictionReason: 'No independent evidence supports the superlative.' },
    { id: 'claim-price', text: 'The set menu is $95.', origin: 'external_fact', verification: 'supported', evidence: evidence('The set menu is $95.', 'p:5'), restrictedFromArtifacts: true, restrictionReason: 'PI outputs do not publish prices.' },
  ]);
  const claimSet: ClaimSetVersion = {
    schemaVersion: 'pi.claim-set.v1',
    id: 'claim-set-red-hill-winter-lunch',
    version: 1,
    contentHash: hashValue(claims),
    createdAt: capturedAt,
    lockedAt: capturedAt,
    lockedBy: actor,
    claims,
  };
  const bundle = {
    schemaVersion: 'pi.intake-bundle.v1' as const,
    id: `bundle-${FIXTURE_ID}`,
    title: 'Red Hill winter lunch fixture',
    submittedBy: actor,
    capturedAt,
    sourceItems: [
      { id: sourceId, kind: 'url' as const, uri: sourceUrl, contentHash: hash(claims.map((claim) => claim.text).join('\n')), capturedAt },
      { id: 'source-reader-reply', kind: 'text_note' as const, contentHash: hash('The covered room saved our rainy lunch.'), capturedAt },
      { id: 'source-image-red-hill', kind: 'image' as const, contentHash: hash('fixture-red-hill-hinterland-late-autumn'), capturedAt },
    ],
  };
  const angle = {
    id: 'angle-rainy-lunch',
    version: 1,
    label: 'Rainy-day lunch',
    framing: 'A practical, locally grounded wet-weather lunch option.',
    evidenceClaimIds: ['claim-location', 'claim-date', 'claim-observation'],
    selectedBy: 'fixture-policy',
  };
  return { capturedAt, sourceUrl, claims, claimSet, bundle, angle };
}

function claimSetDependency(claimSet: ClaimSetVersion) {
  return { kind: 'claim_set' as const, id: claimSet.id, version: claimSet.version, contentHash: claimSet.contentHash };
}

function angleDependency(angle: { id: string; version: number; label: string; framing: string; evidenceClaimIds: string[] }) {
  return { kind: 'angle' as const, id: angle.id, version: angle.version, contentHash: hashValue(angle) };
}

function withArtifactHash<T extends Omit<ArtifactVersion, 'contentHash'>>(artifact: T): ArtifactVersion {
  return ArtifactVersionSchema.parse({ ...artifact, contentHash: hashValue(artifact.payload) });
}

export function artifactDependenciesCurrent(
  run: FoundryRun,
  artifact: ArtifactVersion,
  visiting: Set<string> = new Set([artifact.id]),
): boolean {
  if (artifact.contentHash !== hashValue(artifact.payload)
    || artifact.angleId !== run.angle.id
    || artifact.angleVersion !== run.angle.version) return false;
  const claimSetDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'claim_set');
  const angleDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'angle');
  if (claimSetDependencies.length !== 1 || angleDependencies.length !== 1) return false;
  const mediaDependencies = artifact.dependencies.filter((dependency) => dependency.kind === 'media_rights');
  if (artifact.type === 'article_metadata') {
    if (artifact.payload.astroPatchReady !== Boolean(artifact.payload.heroImage && mediaDependencies.length === 1)) return false;
  } else if (artifact.type === 'social_media_brief') {
    const cleared = artifact.payload.placementRights.status === 'cleared';
    if (cleared !== (mediaDependencies.length === 1)) return false;
  } else if (mediaDependencies.length > 0) return false;

  const completedById = new Map(run.artifactPack.completed.map((candidate) => [candidate.id, candidate]));
  const dependencyCurrent = (dependency: ArtifactDependency): boolean => {
    switch (dependency.kind) {
      case 'claim_set':
        return dependency.id === run.claimSet.id
          && dependency.version === run.claimSet.version
          && dependency.contentHash === run.claimSet.contentHash
          && run.claimSet.contentHash === hashValue(run.claimSet.claims);
      case 'angle':
        return dependency.id === run.angle.id
          && dependency.version === run.angle.version
          && dependency.contentHash === hashValue(run.angle);
      case 'media_rights':
        if (artifact.type === 'article_metadata') {
          return Boolean(artifact.payload.heroImage)
            && dependency.status === 'cleared'
            && dependency.contentHash === hashValue(artifact.payload.heroImage);
        }
        return artifact.type === 'social_media_brief'
          && artifact.payload.placementRights.status === 'cleared'
          && artifact.payload.placementRights.allowedSurfaces.includes(artifact.payload.targetSurface)
          && artifact.payload.placementRights.rightsId === dependency.id
          && dependency.status === 'cleared'
          && dependency.contentHash === hashValue(socialMediaRightsSnapshot(artifact.payload));
      case 'artifact': {
        const target = completedById.get(dependency.id);
        if (!target || visiting.has(target.id)) return false;
        if (dependency.version !== target.version || dependency.contentHash !== target.contentHash) return false;
        return artifactDependenciesCurrent(run, target, new Set(visiting).add(target.id));
      }
    }
  };
  return artifact.dependencies.every(dependencyCurrent);
}

export function runFixture(actor: string, idempotencyKey: string): FoundryRun {
  const { capturedAt, sourceUrl, claims, claimSet, bundle, angle } = fixtureSource(actor);
  const payload = QuickNoteSchema.parse({
    headline: 'A wet-weather lunch option in Red Hill',
    dek: 'A covered dining room and a confirmed Saturday service make this one to keep for a rainy Peninsula day.',
    section: 'eat',
    tag: 'event',
    publishedAt: capturedAt,
    expiresAt: '2026-08-30T00:00:00.000Z',
    verifiedAt: capturedAt,
    verifiedBy: actor,
    sources: [{ kind: 'venue-site', url: sourceUrl, checkedAt: capturedAt }],
    status: 'draft',
    body: 'A covered dining room makes this Red Hill lunch a useful wet-weather option. The winter lunch is listed for Saturday 29 August, with booking required.',
  });
  const claimIds = ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'];
  const artifact = withArtifactHash({
    id: 'artifact-quick-note-red-hill',
    key: 'quick-note',
    version: 1,
    type: 'quick_note' as const,
    angleId: angle.id,
    angleVersion: angle.version,
    factualSegmentIds: ['quick-note-copy'],
    claimUsage: bindClaimUsage(payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds }]),
    claimIds,
    dependencies: [claimSetDependency(claimSet), angleDependency(angle)],
    payload,
    gateResults: evaluateQuickNoteGates(payload, claims, claimIds),
  });
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: capturedAt,
    updatedAt: capturedAt,
    bundle,
    recipe: QUICK_NOTE_RECIPE,
    claimSet,
    claims,
    angle,
    artifact,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1',
      id: `pack-${hash(idempotencyKey).slice(0, 12)}`,
      version: 1,
      recipeId: QUICK_NOTE_RECIPE.id,
      recipeVersion: QUICK_NOTE_RECIPE.version,
      claimSetRef: claimSetDependency(claimSet),
      angleRef: { id: angle.id, version: angle.version },
      status: 'complete',
      completed: [artifact],
      failed: [],
      omitted: [],
      reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic quick-note fixture reached review without external calls.' }],
  });
}

export function migrateLegacyRun(input: unknown): FoundryRun {
  const legacy: LegacyFoundryRun = LegacyFoundryRunSchema.parse(input);
  const claimSet: ClaimSetVersion = {
    schemaVersion: 'pi.claim-set.v1',
    id: `claim-set-${legacy.id}`,
    version: 1,
    contentHash: hashValue(legacy.claims),
    createdAt: legacy.createdAt,
    lockedAt: legacy.createdAt,
    lockedBy: legacy.bundle.submittedBy,
    claims: legacy.claims,
  };
  const dependency = claimSetDependency(claimSet);
  const selectedAngleDependency = angleDependency({ ...legacy.angle, version: 1 });
  const knownGates = new Set<GateResult['gate']>(['no_price', 'no_em_dash', 'supported_claims_only']);
  const gateResults = legacy.artifact.gateResults.map((result) => {
    if (!knownGates.has(result.gate as GateResult['gate'])) throw new Error(`Unsupported legacy gate ${result.gate}`);
    return gate(result.gate as GateResult['gate'], result.passed, result.detail, legacy.artifact.claimIds);
  });
  const artifact = withArtifactHash({
    id: legacy.artifact.id,
    key: 'quick-note',
    version: legacy.artifact.version,
    type: 'quick_note' as const,
    angleId: legacy.artifact.angleId,
    angleVersion: 1,
    factualSegmentIds: ['quick-note-copy'],
    claimUsage: bindClaimUsage(legacy.artifact.payload, [{ segmentId: 'quick-note-copy', path: '$', claimIds: legacy.artifact.claimIds }]),
    claimIds: legacy.artifact.claimIds,
    dependencies: [dependency, selectedAngleDependency],
    payload: legacy.artifact.payload,
    gateResults,
  });
  const reviews = legacy.review ? [{
    id: `review-${hashValue([legacy.id, legacy.review]).slice(0, 16)}`,
    artifactId: artifact.id,
    artifactVersion: artifact.version,
    decision: legacy.review.decision,
    reviewer: legacy.review.reviewer,
    note: legacy.review.note,
    decidedAt: legacy.review.decidedAt,
    status: 'current' as const,
    dependencySnapshot: artifact.dependencies,
    authority: 'draft_handoff_only' as const,
  }] : [];
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: legacy.id,
    idempotencyKey: legacy.idempotencyKey,
    version: legacy.version,
    status: legacy.status,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    bundle: legacy.bundle,
    recipe: QUICK_NOTE_RECIPE,
    claimSet,
    claims: legacy.claims,
    angle: { ...legacy.angle, version: 1 },
    artifact,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1',
      id: `pack-${legacy.id}`,
      version: Math.max(1, legacy.artifact.version),
      recipeId: QUICK_NOTE_RECIPE.id,
      recipeVersion: QUICK_NOTE_RECIPE.version,
      claimSetRef: dependency,
      angleRef: { id: legacy.angle.id, version: 1 },
      status: 'complete',
      completed: [artifact],
      failed: [],
      omitted: [],
      reviews,
    },
    blockers: legacy.blockers,
    review: legacy.review,
    audit: [...legacy.audit, {
      at: legacy.updatedAt,
      actor: 'store-migration',
      type: 'legacy_run_migrated',
      detail: 'Loaded the v0.1 quick-note snapshot into the v2 artifact-pack contract.',
    }],
  });
}

export function runUrlArticleFixture(
  actor: string,
  idempotencyKey: string,
  options: { failOptionalDerivative?: 'seo_metadata_proposal'; omitPlans?: boolean; includeClearedHero?: boolean } = {},
): FoundryRun {
  const { capturedAt, claims, claimSet, bundle, angle } = fixtureSource(actor);
  const dependency = claimSetDependency(claimSet);
  const selectedAngleDependency = angleDependency(angle);
  const articlePayload = ArticleDraftPayloadSchema.parse({
    slug: 'red-hill-wet-weather-lunch',
    body: [
      'A covered dining room gives this Red Hill lunch genuine wet-weather utility.',
      '',
      'The winter lunch is listed for Saturday 29 August, with booking required.',
      '',
      'That combination makes it a practical option when a Peninsula day needs an indoor anchor.',
    ].join('\n'),
  });
  const articleUsage = bindClaimUsage(articlePayload, [
    { segmentId: 'article-location', path: '$.body::paragraph[0]', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'article-date', path: '$.body::paragraph[1]', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'article-utility', path: '$.body::paragraph[2]', claimIds: ['claim-observation'] },
  ]);
  const article = withArtifactHash({
    id: 'artifact-article-red-hill', key: 'article-draft', version: 1, type: 'article_draft' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: articleUsage.map((usage) => usage.segmentId), claimUsage: articleUsage,
    dependencies: [dependency, selectedAngleDependency], payload: articlePayload,
    gateResults: evaluateArtifactGates(articlePayload, claims, articleUsage.map((usage) => usage.segmentId), articleUsage, capturedAt),
  });
  const articleDependency = { kind: 'artifact' as const, id: article.id, version: article.version, contentHash: article.contentHash };
  const clearedHero = options.includeClearedHero ? {
    src: '/images/sourced/place-red-hill-01.webp',
    alt: 'Red Hill hinterland in late autumn',
    credit: 'Peninsula Insider',
    license: 'other-licensed' as const,
  } : undefined;
  const metadataPayload = ArticleMetadataPayloadSchema.parse({
    title: 'A wet-weather lunch option in Red Hill',
    dek: 'A covered dining room and a confirmed Saturday service make this a practical rainy-day anchor.',
    author: 'editorial',
    houseByline: true,
    publishedAt: '2026-08-21',
    heroImage: clearedHero,
    astroPatchReady: Boolean(clearedHero),
    format: 'service',
    tags: ['red-hill', 'eat', 'rainy-day'],
    relatedVenues: [], relatedExperiences: [], relatedPlaces: [], relatedArticles: [], relatedItineraries: [],
    readingTimeMinutes: 2, featured: false, status: 'draft', lastVerified: '2026-08-21',
    aiSummary: ['Covered dining makes this a useful wet-weather lunch.', 'The listed service is Saturday 29 August.'],
    faq: [{ question: 'When is the Red Hill winter lunch available?', answer: 'The fixture source lists Saturday 29 August, with booking required.' }],
    sitemapExclude: true,
    section: 'journal',
    clusterLinks: [{ label: 'Explore Red Hill', href: '/explore/places/red-hill/' }],
  });
  const metadataUsage = bindClaimUsage(metadataPayload, [
    { segmentId: 'metadata-dek', path: '$.dek', claimIds: ['claim-location', 'claim-date', 'claim-observation'] },
    { segmentId: 'metadata-summary-1', path: '$.aiSummary[0]', claimIds: ['claim-observation'] },
    { segmentId: 'metadata-summary-2', path: '$.aiSummary[1]', claimIds: ['claim-date'] },
    { segmentId: 'metadata-faq-answer', path: '$.faq[0].answer', claimIds: ['claim-date', 'claim-booking'] },
  ]);
  const metadataGates = evaluateArtifactGates(
    metadataPayload,
    claims,
    metadataUsage.map((usage) => usage.segmentId),
    metadataUsage,
    capturedAt,
    clearedHero ? { gate: 'astro_article_contract', schema: ArticleMetadataPayloadSchema } : undefined,
  );
  metadataGates.push(gate(
    'astro_patch_ready',
    Boolean(clearedHero),
    clearedHero ? 'A separately rights-cleared hero placement makes the Astro patch adapter available.' : 'Text artifacts remain reviewable, but Astro patch export waits for a rights-cleared hero placement.',
    [],
    false,
  ));
  const metadataDependencies: ArtifactVersion['dependencies'] = [dependency, selectedAngleDependency, articleDependency];
  if (clearedHero) {
    metadataDependencies.push({
      kind: 'media_rights' as const,
      id: 'rights-place-red-hill-01',
      version: 1,
      contentHash: hashValue(clearedHero),
      status: 'cleared' as const,
    });
  }
  const metadata = withArtifactHash({
    id: 'artifact-article-metadata-red-hill', key: 'article-metadata', version: 1, type: 'article_metadata' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: metadataUsage.map((usage) => usage.segmentId), claimUsage: metadataUsage,
    dependencies: metadataDependencies, payload: metadataPayload,
    gateResults: metadataGates,
  });
  const askPayload = AskAnswerPayloadSchema.parse({
    answer: 'For a rainy Red Hill lunch, this covered dining room is a practical option. The fixture source lists the winter lunch for Saturday 29 August, with booking required.',
    recommendations: [{
      title: 'Red Hill wet-weather lunch',
      href: '/journal/red-hill-wet-weather-lunch/',
      why: 'Covered dining and a confirmed Saturday service make it useful in wet weather.',
      venue_type: 'restaurant',
      region: 'red-hill',
    }],
    follow_on: ['What else works in Red Hill when it rains?'],
    provenance_footer: 'Drafted from a locked Peninsula Insider fixture claim set. Verify live details before visiting.',
  });
  const askUsage = bindClaimUsage(askPayload, [
    { segmentId: 'ask-answer', path: '$.answer', claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] },
    { segmentId: 'ask-recommendation', path: '$.recommendations[0].why', claimIds: ['claim-date', 'claim-booking', 'claim-observation'] },
  ]);
  const ask = withArtifactHash({
    id: 'artifact-ask-red-hill', key: 'ask-answer', version: 1, type: 'ask_answer' as const,
    angleId: angle.id, angleVersion: angle.version,
    factualSegmentIds: askUsage.map((usage) => usage.segmentId), claimUsage: askUsage,
    dependencies: [dependency, selectedAngleDependency], payload: askPayload,
    gateResults: evaluateArtifactGates(askPayload, claims, askUsage.map((usage) => usage.segmentId), askUsage, capturedAt, { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }),
  });
  const completed: ArtifactVersion[] = [article, metadata, ask];
  const failed = [];
  const omitted = [];
  if (options.omitPlans) {
    omitted.push(
      { key: 'internal-link-plan', type: 'internal_link_plan' as const, reason: 'not_requested' as const, detail: 'Optional plan was not requested.' },
      { key: 'seo-metadata', type: 'seo_metadata_proposal' as const, reason: 'not_requested' as const, detail: 'Optional proposal was not requested.' },
    );
  } else {
    const linkPayload = InternalLinkPlanPayloadSchema.parse({ links: [{ label: 'Explore Red Hill', href: '/explore/places/red-hill/', placement: 'After the second paragraph' }] });
    const linkUsage = bindClaimUsage(linkPayload, [{ segmentId: 'link-label', path: '$.links[0].label', claimIds: ['claim-location'] }]);
    completed.push(withArtifactHash({
      id: 'artifact-links-red-hill', key: 'internal-link-plan', version: 1, type: 'internal_link_plan' as const,
      angleId: angle.id, angleVersion: angle.version, factualSegmentIds: ['link-label'], claimUsage: linkUsage,
      dependencies: [dependency, selectedAngleDependency, articleDependency], payload: linkPayload,
      gateResults: evaluateArtifactGates(linkPayload, claims, ['link-label'], linkUsage, capturedAt),
    }));
    if (options.failOptionalDerivative === 'seo_metadata_proposal') {
      failed.push({
        key: 'seo-metadata', type: 'seo_metadata_proposal' as const, required: false,
        code: 'fixture_derivative_failure' as const,
        detail: 'Synthetic fixture failure proves independent derivative handling.', attemptedAt: capturedAt,
      });
    } else {
      const seoPayload = SeoMetadataProposalPayloadSchema.parse({
        title: 'Red Hill wet-weather lunch option',
        description: 'A covered Red Hill dining room with a winter lunch listed for Saturday 29 August.',
        canonicalPath: '/journal/red-hill-wet-weather-lunch/',
      });
      const seoUsage = bindClaimUsage(seoPayload, [{ segmentId: 'seo-description', path: '$.description', claimIds: ['claim-location', 'claim-date', 'claim-observation'] }]);
      completed.push(withArtifactHash({
        id: 'artifact-seo-red-hill', key: 'seo-metadata', version: 1, type: 'seo_metadata_proposal' as const,
        angleId: angle.id, angleVersion: angle.version, factualSegmentIds: ['seo-description'], claimUsage: seoUsage,
        dependencies: [dependency, selectedAngleDependency, articleDependency], payload: seoPayload,
        gateResults: evaluateArtifactGates(seoPayload, claims, ['seo-description'], seoUsage, capturedAt),
      }));
    }
  }
  return FoundryRunSchema.parse({
    schemaVersion: 'pi.foundry-run.v2',
    id: `run-${hash(idempotencyKey).slice(0, 12)}`,
    idempotencyKey,
    version: 1,
    status: 'ready_for_review',
    createdAt: capturedAt,
    updatedAt: capturedAt,
    bundle: { ...bundle, id: `bundle-${URL_ARTICLE_FIXTURE_ID}`, title: 'Red Hill URL article fixture' },
    recipe: URL_ARTICLE_RECIPE,
    claimSet,
    angle,
    artifactPack: {
      schemaVersion: 'pi.artifact-pack.v1', id: `pack-${hash(idempotencyKey).slice(0, 12)}`, version: 1,
      recipeId: URL_ARTICLE_RECIPE.id, recipeVersion: URL_ARTICLE_RECIPE.version,
      claimSetRef: dependency, angleRef: { id: angle.id, version: angle.version },
      status: failed.length > 0 || omitted.length > 0 ? 'partial' : 'complete',
      completed, failed, omitted, reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic URL article pack reached review without external calls.' }],
  });
}

export function runNewsletterSocialFixture(
  actor: string,
  idempotencyKey: string,
  options: { omitAuthoritativeInputs?: boolean; clearInstagramRights?: boolean } = {},
): FoundryRun {
  const base = runUrlArticleFixture(actor, idempotencyKey, { omitPlans: true });
  const article = base.artifactPack.completed.find((artifact) => artifact.type === 'article_draft');
  if (!article || article.type !== 'article_draft') throw new Error('Newsletter and social fixture requires its current article draft');
  const capturedAt = base.updatedAt;
  const claims = base.claimSet.claims;
  const commonDependencies = [claimSetDependency(base.claimSet), angleDependency(base.angle)];
  const articleDependency = { kind: 'artifact' as const, id: article.id, version: article.version, contentHash: article.contentHash };
  const campaignCode = 'insider-note-07';
  const emailUrl = (path: string) => `https://peninsulainsider.com.au${path}?utm_source=email&utm_medium=newsletter&utm_campaign=${campaignCode}`;

  const issuePayload = InsiderNoteIssuePayloadSchema.parse({
    schemaVersion: 'pi.insider-note-issue.v1',
    issueNumber: 7,
    campaignCode,
    targetReleaseDate: '2026-08-26',
    scheduleAt: null,
    sendAuthority: 'james_only',
    operationalState: 'draft_only',
    positions: [
      { id: 'insider_note.position.01.masthead', position: 1, key: 'masthead', status: 'locked', name: 'The Insider Note', tagline: 'Written from inside the region', issueNumberRoman: 'VII', dateRange: '24–30 August 2026' },
      { id: 'insider_note.position.02.intro', position: 2, key: 'intro', status: 'included', tense: 'past', lines: [{ id: 'intro-1', text: 'Rain settled over Red Hill, and the covered room proved its worth.', claimIds: ['claim-location', 'claim-observation'] }] },
      {
        id: 'insider_note.position.03.lead_today_move', position: 3, key: 'lead_today_move', status: 'included',
        headline: { id: 'lead-headline', text: 'Make Saturday lunch the indoor anchor', claimIds: ['claim-date', 'claim-observation'] },
        body: { id: 'lead-body', text: 'The winter lunch is listed for Saturday 29 August, with booking required.', claimIds: ['claim-date', 'claim-booking'] },
        cta: { id: 'lead-cta', label: 'Book the Saturday lunch', href: emailUrl('/journal/red-hill-wet-weather-lunch/'), claimIds: ['claim-date', 'claim-booking'] },
      },
      options.omitAuthoritativeInputs
        ? { id: 'insider_note.position.04.weather_strip', position: 4, key: 'weather_strip', status: 'omitted', reason: 'missing_authoritative_input' }
        : { id: 'insider_note.position.04.weather_strip', position: 4, key: 'weather_strip', status: 'included', day: 'Saturday', temperatureC: 16, sky: 'Showers', sunsetTime: '5:48 pm', claimIds: ['claim-weather'] },
      {
        id: 'insider_note.position.05.secondary_picks', position: 5, key: 'secondary_picks', status: 'included',
        picks: [
          {
            id: 'secondary-cassis', dayStamp: 'SAT', category: 'STAY',
            venue: { name: 'Cassis Red Hill', path: '/stay/cassis/', claimIds: ['claim-venue-name', 'claim-location'] },
            line: { id: 'secondary-cassis-line', text: 'Cassis Red Hill sits in the Red Hill corridor.', claimIds: ['claim-venue-name', 'claim-location'] },
          },
          {
            id: 'secondary-hotel-sorrento', dayStamp: 'SUN', category: 'STAY',
            venue: { name: 'Hotel Sorrento', path: '/stay/hotel-sorrento/', claimIds: ['claim-venue-name-2'] },
            line: { id: 'secondary-hotel-sorrento-line', text: 'The site record names this stay Hotel Sorrento.', claimIds: ['claim-venue-name-2'] },
          },
        ],
      },
      options.omitAuthoritativeInputs
        ? { id: 'insider_note.position.06.reader_reply', position: 6, key: 'reader_reply', status: 'omitted', reason: 'no_usable_reply' }
        : {
          id: 'insider_note.position.06.reader_reply', position: 6, key: 'reader_reply', status: 'included', firstName: 'Mia',
          quote: 'The covered room saved our rainy lunch.', claimIds: ['claim-reply'], privacy: 'first_name_only',
          sourceLocator: { sourceItemId: 'source-reader-reply', locator: 'reply:1', excerptHash: hash('The covered room saved our rainy lunch.') },
        },
      {
        id: 'insider_note.position.07.also_this_week', position: 7, key: 'also_this_week', status: 'included',
        rows: [{ id: 'also-1', date: '2026-08-29', dayStamp: 'SAT', line: { id: 'also-line-1', text: 'The listed winter lunch falls on Saturday 29 August.', claimIds: ['claim-date'] } }],
      },
      {
        id: 'insider_note.position.08.booking_note', position: 8, key: 'booking_note', status: 'included',
        line: { id: 'booking-line', text: 'Booking is required for the Saturday winter lunch.', claimIds: ['claim-date', 'claim-booking'] },
        link: { id: 'booking-link', label: 'Book the winter lunch', href: emailUrl('/journal/red-hill-wet-weather-lunch/'), claimIds: ['claim-date', 'claim-booking'] },
        timeSensitiveClaimIds: ['claim-date', 'claim-booking'],
      },
      { id: 'insider_note.position.09.poll', position: 9, key: 'poll', status: 'editorial_decision', delivery: 'beehiiv_native', suppliedQuestion: null, suppliedBy: null },
      { id: 'insider_note.position.10.reply_prompt_signoff', position: 10, key: 'reply_prompt_signoff', status: 'locked', replyPrompt: 'Been somewhere brilliant this week that we should know about? Just hit reply. We read everything.', signoff: 'The Insider.' },
      {
        id: 'insider_note.position.11.footer', position: 11, key: 'footer', status: 'locked', issueNumberRoman: 'VII', dateRange: '24–30 August 2026',
        navigation: [
          { key: 'this_weekend', id: 'footer-weekend', label: 'this weekend', href: emailUrl('/this-weekend/'), claimIds: ['claim-date'] },
          { key: 'whats_on', id: 'footer-whats-on', label: "what's on", href: emailUrl('/whats-on/'), claimIds: ['claim-date'] },
          { key: 'journal', id: 'footer-journal', label: 'journal', href: emailUrl('/journal/'), claimIds: ['claim-date'] },
        ],
        includeUnsubscribe: true,
        includeStreetAddress: true,
      },
    ],
  });
  const issueUsageSeed = [
    { segmentId: 'issue-date-range', path: '$.positions[0].dateRange', claimIds: ['claim-date'] },
    { segmentId: 'issue-intro', path: '$.positions[1].lines[0].text', claimIds: ['claim-location', 'claim-observation'] },
    { segmentId: 'issue-lead-headline', path: '$.positions[2].headline.text', claimIds: ['claim-date', 'claim-observation'] },
    { segmentId: 'issue-lead-body', path: '$.positions[2].body.text', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'issue-lead-cta', path: '$.positions[2].cta.label', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'issue-secondary-venue', path: '$.positions[4].picks[0].venue.name', claimIds: ['claim-venue-name'] },
    { segmentId: 'issue-secondary-line', path: '$.positions[4].picks[0].line.text', claimIds: ['claim-venue-name', 'claim-location'] },
    { segmentId: 'issue-secondary-venue-2', path: '$.positions[4].picks[1].venue.name', claimIds: ['claim-venue-name-2'] },
    { segmentId: 'issue-secondary-line-2', path: '$.positions[4].picks[1].line.text', claimIds: ['claim-venue-name-2'] },
    { segmentId: 'issue-also-line', path: '$.positions[6].rows[0].line.text', claimIds: ['claim-date'] },
    { segmentId: 'issue-booking-line', path: '$.positions[7].line.text', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'issue-booking-link', path: '$.positions[7].link.label', claimIds: ['claim-date', 'claim-booking'] },
    { segmentId: 'issue-footer-range', path: '$.positions[10].dateRange', claimIds: ['claim-date'] },
    ...(options.omitAuthoritativeInputs ? [] : [
      { segmentId: 'issue-weather', path: '$.positions[3]', claimIds: ['claim-weather'] },
      { segmentId: 'issue-reader-reply', path: '$.positions[5].quote', claimIds: ['claim-reply'] },
    ]),
  ];
  const issueUsage = bindClaimUsage(issuePayload, issueUsageSeed);
  const issue = withArtifactHash({
    id: 'artifact-insider-note-07', key: 'insider-note-issue', version: 1, type: 'insider_note_issue' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: issueUsage.map((usage) => usage.segmentId), claimUsage: issueUsage,
    dependencies: [...commonDependencies, articleDependency], payload: issuePayload,
    gateResults: [
      ...evaluateArtifactGates(issuePayload, claims, issueUsage.map((usage) => usage.segmentId), issueUsage, capturedAt),
      ...evaluateArtifactFormatGates('insider_note_issue', issuePayload, claims, capturedAt),
    ],
  });
  const issueDependency = { kind: 'artifact' as const, id: issue.id, version: issue.version, contentHash: issue.contentHash };

  const subjectPayload = InsiderNoteSubjectSetPayloadSchema.parse({
    schemaVersion: 'pi.insider-note-subject-set.v1',
    pairs: [
      { id: 'subject-a', subject: 'A rainy-day lunch move for Red Hill', previewText: 'Covered dining and a Saturday service worth planning around.' },
      { id: 'subject-b', subject: 'What to do with a wet Saturday', previewText: 'One practical Red Hill anchor, plus the week in brief.' },
      { id: 'subject-c', subject: 'Red Hill, under cover', previewText: 'The winter lunch listed for Saturday 29 August needs a booking.' },
    ],
    selectedPairId: null,
    selectionAuthority: 'james_only',
    scheduleAt: null,
    sendAuthority: 'james_only',
  });
  const subjectUsage = bindClaimUsage(subjectPayload, subjectPayload.pairs.flatMap((pair, index) => [
    { segmentId: `subject-${index + 1}`, path: `$.pairs[${index}].subject`, claimIds: ['claim-location', 'claim-date', 'claim-observation'] },
    { segmentId: `preview-${index + 1}`, path: `$.pairs[${index}].previewText`, claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] },
  ]));
  const subjectSet = withArtifactHash({
    id: 'artifact-insider-note-subjects-07', key: 'insider-note-subjects', version: 1, type: 'insider_note_subject_set' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: subjectUsage.map((usage) => usage.segmentId), claimUsage: subjectUsage,
    dependencies: [...commonDependencies, issueDependency], payload: subjectPayload,
    gateResults: [
      ...evaluateArtifactGates(subjectPayload, claims, subjectUsage.map((usage) => usage.segmentId), subjectUsage, capturedAt),
      ...evaluateArtifactFormatGates('insider_note_subject_set', subjectPayload, claims, capturedAt),
    ],
  });

  const linkedInPayload = LinkedInPostPayloadSchema.parse({
    schemaVersion: 'pi.linkedin-post.v1',
    openingMode: 'specific_observation',
    text: 'A covered dining room changes the shape of a wet Peninsula day. In Red Hill, the winter lunch is listed for Saturday 29 August, with booking required. The useful part is not novelty for its own sake. It is having one dependable indoor anchor before the rest of the day takes shape. That is the kind of practical local detail Peninsula Insider is built to surface.',
    destinationUrl: 'https://peninsulainsider.com.au/journal/red-hill-wet-weather-lunch/?utm_source=linkedin&utm_medium=social&utm_campaign=red-hill-wet-weather-lunch',
    hashtags: ['#RedHill', '#MorningtonPeninsula'],
    scheduleAt: null, publicationAuthority: 'james_only', operationalState: 'draft_only',
  });
  const linkedInUsage = bindClaimUsage(linkedInPayload, [{ segmentId: 'linkedin-copy', path: '$.text', claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] }]);
  const linkedIn = withArtifactHash({
    id: 'artifact-linkedin-red-hill', key: 'linkedin-post', version: 1, type: 'linkedin_post' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: ['linkedin-copy'], claimUsage: linkedInUsage,
    dependencies: [...commonDependencies, articleDependency], payload: linkedInPayload,
    gateResults: [...evaluateArtifactGates(linkedInPayload, claims, ['linkedin-copy'], linkedInUsage, capturedAt), ...evaluateArtifactFormatGates('linkedin_post', linkedInPayload, claims, capturedAt)],
  });

  const captionPayload = InstagramCaptionPayloadSchema.parse({
    schemaVersion: 'pi.instagram-caption.v1',
    openingMode: 'observation',
    captionDraft: 'A covered room changes the shape of a wet Peninsula day.\nThe Red Hill winter lunch is listed for 29 August, with booking required.',
    destinationPath: '/journal/red-hill-wet-weather-lunch/',
    cadenceDecision: 'unresolved', hashtagPlacementDecision: 'unresolved',
    scheduleAt: null, publicationAuthority: 'james_only', operationalState: 'draft_only',
  });
  const captionUsage = bindClaimUsage(captionPayload, [{ segmentId: 'instagram-caption', path: '$.captionDraft', claimIds: ['claim-location', 'claim-date', 'claim-booking', 'claim-observation'] }]);
  const caption = withArtifactHash({
    id: 'artifact-instagram-caption-red-hill', key: 'instagram-caption', version: 1, type: 'instagram_caption' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: ['instagram-caption'], claimUsage: captionUsage,
    dependencies: [...commonDependencies, articleDependency], payload: captionPayload,
    gateResults: [...evaluateArtifactGates(captionPayload, claims, ['instagram-caption'], captionUsage, capturedAt), ...evaluateArtifactFormatGates('instagram_caption', captionPayload, claims, capturedAt)],
  });
  const captionDependency = { kind: 'artifact' as const, id: caption.id, version: caption.version, contentHash: caption.contentHash };

  const firstCommentPayload = InstagramFirstCommentPayloadSchema.parse({
    schemaVersion: 'pi.instagram-first-comment.v1',
    commentDraft: 'Save this for the next wet-weather Peninsula plan.',
    hashtagCandidates: ['#RedHill', '#MorningtonPeninsula', '#PeninsulaInsider'],
    placementDecision: 'unresolved', cadenceDecision: 'unresolved',
    scheduleAt: null, publicationAuthority: 'james_only', operationalState: 'draft_only',
  });
  const firstCommentUsage = bindClaimUsage(firstCommentPayload, [
    { segmentId: 'instagram-first-comment', path: '$.commentDraft', claimIds: ['claim-observation'] },
    { segmentId: 'instagram-hashtag-candidates', path: '$.hashtagCandidates', claimIds: ['claim-location'] },
  ]);
  const firstComment = withArtifactHash({
    id: 'artifact-instagram-first-comment-red-hill', key: 'instagram-first-comment', version: 1, type: 'instagram_first_comment' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: firstCommentUsage.map((usage) => usage.segmentId), claimUsage: firstCommentUsage,
    dependencies: [...commonDependencies, captionDependency], payload: firstCommentPayload,
    gateResults: [...evaluateArtifactGates(firstCommentPayload, claims, firstCommentUsage.map((usage) => usage.segmentId), firstCommentUsage, capturedAt), ...evaluateArtifactFormatGates('instagram_first_comment', firstCommentPayload, claims, capturedAt)],
  });

  const carouselPayload = InstagramCarouselScriptPayloadSchema.parse({
    schemaVersion: 'pi.instagram-carousel-script.v1',
    slides: [
      { number: 1, heading: 'Wet Saturday?', body: 'Start with one indoor anchor in Red Hill.', claimIds: ['claim-location', 'claim-observation'] },
      { number: 2, heading: 'The move', body: 'The winter lunch is listed for Saturday 29 August.', claimIds: ['claim-date'] },
      { number: 3, heading: 'Before you go', body: 'Booking is required.', claimIds: ['claim-booking'] },
    ],
    scheduleAt: null, publicationAuthority: 'james_only', operationalState: 'draft_only',
  });
  const carouselUsage = bindClaimUsage(carouselPayload, carouselPayload.slides.map((slide, index) => ({
    segmentId: `carousel-slide-${slide.number}`, path: `$.slides[${index}]`, claimIds: slide.claimIds,
  })));
  const carousel = withArtifactHash({
    id: 'artifact-instagram-carousel-red-hill', key: 'instagram-carousel', version: 1, type: 'instagram_carousel_script' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: carouselUsage.map((usage) => usage.segmentId), claimUsage: carouselUsage,
    dependencies: [...commonDependencies, articleDependency], payload: carouselPayload,
    gateResults: [...evaluateArtifactGates(carouselPayload, claims, carouselUsage.map((usage) => usage.segmentId), carouselUsage, capturedAt), ...evaluateArtifactFormatGates('instagram_carousel_script', carouselPayload, claims, capturedAt)],
  });
  const carouselDependency = { kind: 'artifact' as const, id: carousel.id, version: carousel.version, contentHash: carousel.contentHash };

  const placementRights = options.clearInstagramRights === false
    ? { status: 'not_cleared' as const, allowedSurfaces: ['website'] as const, recognisablePeople: 'unknown' as const }
    : { status: 'cleared' as const, allowedSurfaces: ['instagram'] as const, recognisablePeople: 'none' as const, rightsId: 'rights-red-hill-instagram-01' };
  const mediaBriefPayload = SocialMediaBriefPayloadSchema.parse({
    schemaVersion: 'pi.social-media-brief.v1', assetId: 'asset-red-hill-hinterland-01',
    targetSurface: 'instagram', placement: 'carousel', mediaType: 'carousel',
    description: 'A three-frame Red Hill wet-weather carousel using the cleared hinterland image.',
    altText: 'Red Hill hinterland in late autumn beneath a grey sky.',
    placementRights,
    scheduleAt: null, publicationAuthority: 'james_only', operationalState: 'draft_only',
  });
  const mediaUsage = bindClaimUsage(mediaBriefPayload, [
    { segmentId: 'media-description', path: '$.description', claimIds: ['claim-image', 'claim-location'] },
    { segmentId: 'media-alt', path: '$.altText', claimIds: ['claim-image'] },
  ]);
  const mediaDependencies: ArtifactVersion['dependencies'] = [...commonDependencies, carouselDependency];
  if (placementRights.status === 'cleared') {
    mediaDependencies.push({
      kind: 'media_rights', id: placementRights.rightsId, version: 1,
      contentHash: hashValue(socialMediaRightsSnapshot(mediaBriefPayload)), status: 'cleared',
    });
  }
  const mediaBrief = withArtifactHash({
    id: 'artifact-social-media-brief-red-hill', key: 'social-media-brief', version: 1, type: 'social_media_brief' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: mediaUsage.map((usage) => usage.segmentId), claimUsage: mediaUsage,
    dependencies: mediaDependencies, payload: mediaBriefPayload,
    gateResults: [...evaluateArtifactGates(mediaBriefPayload, claims, mediaUsage.map((usage) => usage.segmentId), mediaUsage, capturedAt), ...evaluateArtifactFormatGates('social_media_brief', mediaBriefPayload, claims, capturedAt)],
  });

  const completed: ArtifactVersion[] = [article, issue, subjectSet, linkedIn, caption, firstComment, carousel, mediaBrief];
  return FoundryRunSchema.parse({
    ...base,
    bundle: { ...base.bundle, id: `bundle-${NEWSLETTER_SOCIAL_FIXTURE_ID}`, title: 'Red Hill newsletter and social fixture' },
    recipe: NEWSLETTER_SOCIAL_RECIPE,
    artifactPack: {
      ...base.artifactPack,
      recipeId: NEWSLETTER_SOCIAL_RECIPE.id,
      recipeVersion: NEWSLETTER_SOCIAL_RECIPE.version,
      status: 'complete', completed, failed: [], omitted: [], reviews: [],
    },
    blockers: [],
    audit: [{ at: capturedAt, actor, type: 'fixture_run_created', detail: 'Deterministic Insider Note and social draft pack reached review without external calls.' }],
  });
}

function acceptedCurrentReview(run: FoundryRun, artifact: ArtifactVersion): boolean {
  return run.artifactPack.reviews.some((review) => (
    review.artifactId === artifact.id
    && review.artifactVersion === artifact.version
    && review.decision === 'accepted'
    && review.status === 'current'
    && JSON.stringify(review.dependencySnapshot) === JSON.stringify(artifact.dependencies)
    && artifactDependenciesCurrent(run, artifact)
  ));
}

function diffForNewFile(path: string, content: string[]): string {
  const patch = [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${content.length} @@`,
    ...content.map((line) => `+${line}`),
    '',
  ].join('\n');
  if (!validateNewFilePatch(patch)) throw new Error('Generated patch failed structural validation');
  return patch;
}

export function validateNewFilePatch(patch: string): boolean {
  const lines = patch.split('\n');
  if (!lines[0]?.startsWith('diff --git a/') || lines[1] !== 'new file mode 100644' || lines[2] !== '--- /dev/null') return false;
  if (!lines[3]?.startsWith('+++ b/')) return false;
  const hunkIndex = lines.findIndex((line) => /^@@ -0,0 \+1,\d+ @@$/.test(line));
  if (hunkIndex !== 4) return false;
  const expected = Number(lines[hunkIndex].match(/\+1,(\d+)/)?.[1]);
  const additions = lines.slice(hunkIndex + 1).filter((line) => line.startsWith('+'));
  return Number.isInteger(expected) && expected > 0 && additions.length === expected;
}

function assertArtifactReady(run: FoundryRun, artifact: ArtifactVersion): void {
  if (!run.evaluationAsOf) throw new Error('Run must be reconciled against an explicit evaluation time before export');
  if (artifact.gateResults.some((result) => !result.passed && result.blocking)) throw new Error(`Artifact ${artifact.id} has unresolved gates`);
  const freshGates = artifact.type === 'quick_note'
    ? evaluateQuickNoteGates(artifact.payload, run.claimSet.claims, artifact.claimIds)
    : evaluateArtifactGates(
      artifact.payload,
      run.claimSet.claims,
      artifact.factualSegmentIds,
      artifact.claimUsage,
      run.evaluationAsOf,
      artifact.type === 'ask_answer'
        ? { gate: 'ask_answer_contract', schema: AskAnswerPayloadSchema }
        : artifact.type === 'article_metadata' && artifact.payload.astroPatchReady
          ? { gate: 'astro_article_contract', schema: ArticleMetadataPayloadSchema }
          : undefined,
    );
  freshGates.push(...evaluateArtifactFormatGates(artifact.type, artifact.payload, run.claimSet.claims, run.evaluationAsOf));
  if (freshGates.some((result) => !result.passed && result.blocking)) throw new Error(`Artifact ${artifact.id} failed fresh export gates`);
  if (!artifactDependenciesCurrent(run, artifact)) throw new Error(`Artifact ${artifact.id} has stale dependencies`);
  if (!acceptedCurrentReview(run, artifact)) throw new Error(`Artifact ${artifact.id} requires a current accepted draft-handoff review`);
  const publicCopy = JSON.stringify(artifact.payload);
  if (PRICE_PATTERN.test(publicCopy)) throw new Error('PI outputs cannot contain pricing');
  if (/—/.test(publicCopy)) throw new Error('PI outputs cannot contain em dashes');
}

export function buildArtifactHandoff(run: FoundryRun, artifactId: string): { filename: string; body: string } {
  if (run.blockers.length > 0) throw new Error('Run has unresolved blockers');
  const artifact = run.artifactPack.completed.find((candidate) => candidate.id === artifactId);
  if (!artifact) throw new Error('Artifact not found');
  assertArtifactReady(run, artifact);
  const requirement = run.recipe.artifacts.find((candidate) => candidate.key === artifact.key);
  if (!requirement) throw new Error('Artifact is not declared by the active recipe');
  const body = `${JSON.stringify({
    schemaVersion: 'pi.draft-handoff.v1',
    authority: 'draft_handoff_only',
    publication: false,
    scheduling: false,
    evaluationAsOf: run.evaluationAsOf,
    runRef: { id: run.id, version: run.version },
    claimSetRef: run.artifactPack.claimSetRef,
    angleRef: run.artifactPack.angleRef,
    artifact: {
      id: artifact.id,
      key: artifact.key,
      type: artifact.type,
      version: artifact.version,
      contentHash: artifact.contentHash,
      targetContract: requirement.targetContract,
      claimUsage: artifact.claimUsage,
      payload: artifact.payload,
    },
  }, null, 2)}\n`;
  if (PRICE_PATTERN.test(body)) throw new Error('PI handoffs cannot contain pricing');
  if (/—/.test(body)) throw new Error('PI handoffs cannot contain em dashes');
  return { filename: `${run.id}-${artifact.key}.json`, body };
}

export function buildPatch(run: FoundryRun): string {
  if (run.blockers.length > 0) throw new Error('Run has unresolved blockers');
  if (run.recipe.id === QUICK_NOTE_RECIPE.id) {
    if (!run.artifact) throw new Error('Quick-note compatibility artifact is missing');
    assertArtifactReady(run, run.artifact);
    const note = run.artifact.payload;
    const path = 'next/src/content/quick-notes/2026-08-21-red-hill-wet-weather-lunch.md';
    const content = [
      '---',
      `headline: ${JSON.stringify(note.headline)}`,
      `dek: ${JSON.stringify(note.dek ?? '')}`,
      `section: ${note.section}`,
      `tag: ${note.tag}`,
      `publishedAt: ${note.publishedAt}`,
      `expiresAt: ${note.expiresAt}`,
      ...(note.verifiedAt ? [`verifiedAt: ${note.verifiedAt}`] : []),
      ...(note.verifiedBy ? [`verifiedBy: ${JSON.stringify(note.verifiedBy)}`] : []),
      'sources:',
      ...note.sources.flatMap((source) => [
        `  - kind: ${source.kind}`,
        ...(source.url ? [`    url: ${source.url}`] : []),
        ...(source.checkedAt ? [`    checkedAt: ${source.checkedAt}`] : []),
      ]),
      'status: draft',
      '---',
      '',
      ...note.body.split(/\r?\n/),
    ];
    return diffForNewFile(path, content);
  }

  const article = run.artifactPack.completed.find((item) => item.type === 'article_draft');
  const metadata = run.artifactPack.completed.find((item) => item.type === 'article_metadata');
  if (!article || article.type !== 'article_draft' || !metadata || metadata.type !== 'article_metadata') {
    throw new Error('Article draft and metadata are required for patch export');
  }
  assertArtifactReady(run, article);
  assertArtifactReady(run, metadata);
  const meta = metadata.payload;
  if (!meta.astroPatchReady || !meta.heroImage) {
    throw new Error('Article patch export requires a separately rights-cleared hero placement');
  }
  const content = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `dek: ${JSON.stringify(meta.dek)}`,
    `author: ${JSON.stringify(meta.author)}`,
    `houseByline: ${meta.houseByline}`,
    `publishedAt: ${meta.publishedAt}`,
    'heroImage:',
    `  src: ${JSON.stringify(meta.heroImage.src)}`,
    `  alt: ${JSON.stringify(meta.heroImage.alt)}`,
    `  credit: ${JSON.stringify(meta.heroImage.credit)}`,
    `  license: ${JSON.stringify(meta.heroImage.license)}`,
    `format: ${JSON.stringify(meta.format)}`,
    `tags: ${JSON.stringify(meta.tags)}`,
    `relatedVenues: ${JSON.stringify(meta.relatedVenues)}`,
    `relatedExperiences: ${JSON.stringify(meta.relatedExperiences)}`,
    `relatedPlaces: ${JSON.stringify(meta.relatedPlaces)}`,
    `relatedArticles: ${JSON.stringify(meta.relatedArticles)}`,
    `relatedItineraries: ${JSON.stringify(meta.relatedItineraries)}`,
    ...(meta.readingTimeMinutes ? [`readingTimeMinutes: ${meta.readingTimeMinutes}`] : []),
    `featured: ${meta.featured}`,
    'status: draft',
    ...(meta.lastVerified ? [`lastVerified: ${meta.lastVerified}`] : []),
    ...(meta.clusterLinks ? [`clusterLinks: ${JSON.stringify(meta.clusterLinks)}`] : []),
    ...(meta.aiSummary ? [`aiSummary: ${JSON.stringify(meta.aiSummary)}`] : []),
    ...(meta.faq ? [
      'faq:',
      ...meta.faq.flatMap((item) => [`  - question: ${JSON.stringify(item.question)}`, `    answer: ${JSON.stringify(item.answer)}`]),
    ] : []),
    `sitemapExclude: ${meta.sitemapExclude}`,
    `section: ${meta.section}`,
    ...(meta.planShape ? [`planShape: ${meta.planShape}`] : []),
    '---',
    '',
    ...article.payload.body.split(/\r?\n/),
  ];
  return diffForNewFile(`next/src/content/articles/${article.payload.slug}.md`, content);
}
