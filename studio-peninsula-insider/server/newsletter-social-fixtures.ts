import {
  ClaimSchema, FoundryRunSchema, InsiderNoteIssuePayloadSchema, InsiderNoteSubjectSetPayloadSchema,
  InstagramCaptionPayloadSchema, InstagramCarouselScriptPayloadSchema, InstagramFirstCommentPayloadSchema,
  LinkedInPostPayloadSchema, RecipeDefinitionSchema, SocialMediaBriefPayloadSchema,
  type ArtifactVersion, type Claim, type FoundryRun, type GateResult, type RecipeDefinition,
} from '../shared/contracts.js';
import { withFixtureOriginAuthority } from './origin-authority.js';
import {
  angleDependency, bindClaimUsage, claimSetDependency, evaluateArtifactGates,
  hash, hashValue, runUrlArticleFixture, socialMediaRightsBindingHash, withArtifactHash,
} from './fixture-runner.js';

export const NEWSLETTER_SOCIAL_FIXTURE_ID = 'red-hill-newsletter-social';
export const NEWSLETTER_WEATHER_EVIDENCE_TEXT = 'Saturday is forecast to reach 16 degrees with showers and a 5:48 pm sunset.';
export const NEWSLETTER_SOCIAL_RECIPE: RecipeDefinition = RecipeDefinitionSchema.parse({
  schemaVersion: 'pi.recipe-definition.v1', id: 'newsletter_social_v1', version: 1, label: 'Insider Note and social draft pack',
  sourceKinds: ['url', 'text_note', 'image', 'document'], textOnlyAllowed: true, externalCalls: false, artifacts: [
    { key: 'article-draft', type: 'article_draft', required: true, dependsOnKeys: [], targetContract: 'astro.articles.body.v1' },
    { key: 'insider-note-issue', type: 'insider_note_issue', required: true, dependsOnKeys: ['article-draft'], targetContract: 'email.insider-note.positions.v1' },
    { key: 'insider-note-subjects', type: 'insider_note_subject_set', required: true, dependsOnKeys: ['insider-note-issue'], targetContract: 'email.insider-note.subject-set.v1' },
    { key: 'linkedin-post', type: 'linkedin_post', required: true, dependsOnKeys: ['article-draft'], targetContract: 'social.linkedin.draft.v1' },
    { key: 'instagram-caption', type: 'instagram_caption', required: true, dependsOnKeys: ['article-draft'], targetContract: 'social.instagram.caption-draft.v1' },
    { key: 'instagram-first-comment', type: 'instagram_first_comment', required: true, dependsOnKeys: ['instagram-caption'], targetContract: 'social.instagram.first-comment-draft.v1' },
    { key: 'instagram-carousel', type: 'instagram_carousel_script', required: false, dependsOnKeys: ['article-draft'], targetContract: 'social.instagram.carousel-script.v1' },
    { key: 'social-media-brief', type: 'social_media_brief', required: true, dependsOnKeys: ['instagram-carousel'], targetContract: 'social.media-placement-brief.v1' },
  ],
});

function gate(gateName: GateResult['gate'], passed: boolean, detail: string, claimIds: string[] = [], blocking = true): GateResult {
  return passed ? { gate: gateName, scope: 'artifact', passed: true, blocking: false, detail, claimIds }
    : { gate: gateName, scope: 'artifact', passed: false, blocking, detail, claimIds };
}
function claimIsUsable(claim: Claim | undefined, asOf: string): boolean {
  return Boolean(claim && !claim.restrictedFromArtifacts && ['supported', 'approved'].includes(claim.verification) && claim.evidence.length > 0 && (!claim.expiresAt || claim.expiresAt > asOf));
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
    const textOnly = Boolean(issue && collectPropertyValues(payload, 'image').length === 0);
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
      gate('media_placement_rights', textOnly, textOnly ? 'V1 Insider Note output is deliberately text-only.' : 'Newsletter images are blocked until exact asset, placement, rights and release binding is implemented.'),
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
        && ['none', 'released'].includes(brief.data.placementRights.recognisablePeople)
        && (brief.data.placementRights.recognisablePeople === 'none'
          ? brief.data.placementRights.releaseIds.length === 0
          : brief.data.placementRights.releaseIds.length > 0);
      results.push(gate('media_placement_rights', rights, rights ? 'Placement rights explicitly allow this Instagram surface.' : 'Instagram handoff is blocked until rights allow the exact target surface and people are released.'));
    }
    return results;
  }

  return [];
}

export function runNewsletterSocialFixture(
  actor: string,
  idempotencyKey: string,
  options: { omitAuthoritativeInputs?: boolean; clearInstagramRights?: boolean } = {},
): FoundryRun {
  const sourceBase = runUrlArticleFixture(actor, idempotencyKey, { omitPlans: true });
  const sourceArticle = sourceBase.artifactPack.completed.find((artifact) => artifact.type === 'article_draft');
  if (!sourceArticle || sourceArticle.type !== 'article_draft') throw new Error('Newsletter and social fixture requires its current article draft');
  const capturedAt = sourceBase.updatedAt;
  const evidence = (sourceItemId: string, excerpt: string, locator: string) => [{
    sourceItemId, locatorType: 'manual' as const, locator, excerpt, excerptHash: hash(excerpt), capturedAt,
  }];
  const claims = ClaimSchema.array().parse([
    ...sourceBase.claimSet.claims.map((claim) => ['claim-date', 'claim-booking'].includes(claim.id) ? { ...claim, expiresAt: '2026-08-30T00:00:00.000Z' } : claim),
    { id: 'claim-weather', text: NEWSLETTER_WEATHER_EVIDENCE_TEXT, origin: 'external_fact', verification: 'supported', evidence: evidence('source-weather', NEWSLETTER_WEATHER_EVIDENCE_TEXT, 'weather:1'), restrictedFromArtifacts: false, expiresAt: '2026-08-30T00:00:00.000Z' },
    { id: 'claim-venue-name', text: 'The site record names the venue Cassis Red Hill.', origin: 'external_fact', verification: 'supported', evidence: evidence('source-venue-records', 'Cassis Red Hill', 'venue:cassis'), restrictedFromArtifacts: false },
    { id: 'claim-venue-name-2', text: 'The site record names the venue Hotel Sorrento.', origin: 'external_fact', verification: 'supported', evidence: evidence('source-venue-records', 'Hotel Sorrento', 'venue:hotel-sorrento'), restrictedFromArtifacts: false },
    { id: 'claim-reply', text: 'The covered room saved our rainy lunch.', origin: 'first_party_observation', verification: 'approved', evidence: evidence('source-reader-reply', 'The covered room saved our rainy lunch.', 'reply:1'), restrictedFromArtifacts: false },
    { id: 'claim-image', text: 'The image depicts Red Hill hinterland beneath a grey sky.', origin: 'first_party_observation', verification: 'approved', evidence: evidence('source-image-red-hill', 'Red Hill hinterland beneath a grey sky.', 'image:1'), restrictedFromArtifacts: false },
  ]);
  const claimSet = { ...sourceBase.claimSet, id: 'claim-set-red-hill-newsletter-social', contentHash: hashValue(claims), claims };
  const bundle = {
    ...sourceBase.bundle,
    id: `bundle-${NEWSLETTER_SOCIAL_FIXTURE_ID}`,
    title: 'Red Hill newsletter and social fixture',
    sourceItems: [
      ...sourceBase.bundle.sourceItems,
      { id: 'source-weather', kind: 'text_note' as const, contentHash: hash(NEWSLETTER_WEATHER_EVIDENCE_TEXT), capturedAt },
      { id: 'source-venue-records', kind: 'document' as const, contentHash: hash('Cassis Red Hill\nHotel Sorrento'), capturedAt },
      { id: 'source-reader-reply', kind: 'text_note' as const, contentHash: hash('The covered room saved our rainy lunch.'), capturedAt },
      { id: 'source-image-red-hill', kind: 'image' as const, contentHash: hash('Red Hill hinterland beneath a grey sky.'), capturedAt },
    ],
  };
  const base = { ...sourceBase, bundle, claimSet };
  const commonDependencies = [claimSetDependency(claimSet), angleDependency(base.angle)];
  const article = withArtifactHash({
    ...sourceArticle,
    dependencies: sourceArticle.dependencies.map((dependency) => dependency.kind === 'claim_set' ? claimSetDependency(claimSet) : dependency),
  }, claims);
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
  }, claims);
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
  }, claims);

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
  }, claims);

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
  }, claims);
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
  }, claims);

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
  }, claims);
  const carouselDependency = { kind: 'artifact' as const, id: carousel.id, version: carousel.version, contentHash: carousel.contentHash };

  const placementRights = options.clearInstagramRights === false
    ? { status: 'not_cleared' as const, allowedSurfaces: ['website'] as const, recognisablePeople: 'unknown' as const, rightsId: 'rights-red-hill-instagram-01', rightsVersion: 1, releaseIds: [] }
    : { status: 'cleared' as const, allowedSurfaces: ['instagram'] as const, recognisablePeople: 'none' as const, rightsId: 'rights-red-hill-instagram-01', rightsVersion: 1, releaseIds: [] };
  const mediaBriefPayload = SocialMediaBriefPayloadSchema.parse({
    schemaVersion: 'pi.social-media-brief.v1', assetId: 'asset-red-hill-hinterland-01', assetVersion: 1,
    assetContentHash: hash('red-hill-hinterland-fixture-v1'),
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
      kind: 'media_rights', id: placementRights.rightsId, version: placementRights.rightsVersion,
      contentHash: socialMediaRightsBindingHash(mediaBriefPayload), status: 'cleared',
    });
  }
  const mediaBrief = withArtifactHash({
    id: 'artifact-social-media-brief-red-hill', key: 'social-media-brief', version: 1, type: 'social_media_brief' as const,
    angleId: base.angle.id, angleVersion: base.angle.version,
    factualSegmentIds: mediaUsage.map((usage) => usage.segmentId), claimUsage: mediaUsage,
    dependencies: mediaDependencies, payload: mediaBriefPayload,
    gateResults: [...evaluateArtifactGates(mediaBriefPayload, claims, mediaUsage.map((usage) => usage.segmentId), mediaUsage, capturedAt), ...evaluateArtifactFormatGates('social_media_brief', mediaBriefPayload, claims, capturedAt)],
  }, claims);

  const completed: ArtifactVersion[] = [article, issue, subjectSet, linkedIn, caption, firstComment, carousel, mediaBrief];
  return FoundryRunSchema.parse(withFixtureOriginAuthority({
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
  }));
}
