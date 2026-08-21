import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ClaimSchema, type ArtifactVersion, type FoundryRun } from '../shared/contracts.js';
import { createApp } from '../server/app.js';
import {
  buildArtifactHandoff,
  evaluateArtifactFormatGates,
  evaluateArtifactGates,
  hashValue,
  runNewsletterSocialFixture,
} from '../server/fixture-runner.js';
import { FileFoundryStore } from '../server/store.js';

function artifact<T extends ArtifactVersion['type']>(run: FoundryRun, type: T): Extract<ArtifactVersion, { type: T }> {
  const found = run.artifactPack.completed.find((candidate) => candidate.type === type);
  if (!found || found.type !== type) throw new Error(`Missing ${type}`);
  return found as Extract<ArtifactVersion, { type: T }>;
}

async function harness(evaluationClock?: () => string) {
  const directory = await mkdtemp(join(tmpdir(), 'pi-newsletter-social-'));
  const store = new FileFoundryStore(join(directory, 'runs.json'), directory, evaluationClock);
  return { app: createApp(store), store };
}

async function review(app: ReturnType<typeof createApp>, run: FoundryRun, item: ArtifactVersion) {
  return (await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
    artifactId: item.id,
    decision: 'accepted',
    reviewer: 'fixture-reviewer',
    expectedVersion: run.version,
    expectedArtifactVersion: item.version,
  }).expect(200)).body as FoundryRun;
}

describe('Insider Note and social recipes', () => {
  it('builds the stable 11-position issue and channel-specific artifact union', () => {
    const run = runNewsletterSocialFixture('fixture-editor', 'newsletter-contract-v1');
    const issue = artifact(run, 'insider_note_issue');
    const expectedIds = Array.from({ length: 11 }, (_, index) => {
      const suffixes = ['masthead', 'intro', 'lead_today_move', 'weather_strip', 'secondary_picks', 'reader_reply', 'also_this_week', 'booking_note', 'poll', 'reply_prompt_signoff', 'footer'];
      return `insider_note.position.${String(index + 1).padStart(2, '0')}.${suffixes[index]}`;
    });
    expect(issue.payload.positions.map((position) => position.id)).toEqual(expectedIds);
    expect(issue.payload.positions[4]).toMatchObject({ status: 'included' });
    if (issue.payload.positions[4].status !== 'included') throw new Error('Secondary picks omitted');
    expect(issue.payload.positions[4].picks).toHaveLength(2);
    expect(issue.payload.positions[8]).toMatchObject({ status: 'editorial_decision', suppliedQuestion: null, suppliedBy: null });
    expect(issue.gateResults.every((gate) => gate.passed)).toBe(true);

    const subjectSet = artifact(run, 'insider_note_subject_set');
    expect(subjectSet.payload.pairs).toHaveLength(3);
    expect(subjectSet.payload).toMatchObject({ selectedPairId: null, selectionAuthority: 'james_only', sendAuthority: 'james_only' });
    expect(subjectSet.gateResults.every((gate) => gate.passed)).toBe(true);
    expect(artifact(run, 'instagram_carousel_script').payload.slides).toHaveLength(3);
    expect(artifact(run, 'instagram_caption').payload.captionDraft.split('\n')).toHaveLength(2);
    expect(artifact(run, 'instagram_first_comment').payload.hashtagCandidates).toHaveLength(3);
    expect(artifact(run, 'linkedin_post').payload.hashtags.length).toBeLessThanOrEqual(3);
    expect(run.artifactPack.completed).toHaveLength(8);
  });

  it('honestly omits weather and reader reply when authoritative inputs are absent', () => {
    const run = runNewsletterSocialFixture('fixture-editor', 'newsletter-honest-omission-v1', { omitAuthoritativeInputs: true });
    const issue = artifact(run, 'insider_note_issue');
    expect(issue.payload.positions[3]).toMatchObject({ status: 'omitted', reason: 'missing_authoritative_input' });
    expect(issue.payload.positions[5]).toMatchObject({ status: 'omitted', reason: 'no_usable_reply' });
    expect(issue.gateResults.find((gate) => gate.gate === 'authoritative_input_present')).toMatchObject({ passed: true });
    expect(issue.claimUsage.some((usage) => usage.segmentId === 'issue-weather')).toBe(false);
    expect(issue.claimUsage.some((usage) => usage.segmentId === 'issue-reader-reply')).toBe(false);
  });

  it('normalizes all six subject candidates for distinctness', () => {
    const run = runNewsletterSocialFixture('fixture-editor', 'subject-normalization-v1');
    const subjectSet = artifact(run, 'insider_note_subject_set');
    const payload = structuredClone(subjectSet.payload);
    payload.pairs[0].previewText = `${payload.pairs[0].subject.toLocaleUpperCase()}!!!`;
    const gates = evaluateArtifactFormatGates('insider_note_subject_set', payload, run.claimSet.claims, run.claimSet.lockedAt);
    expect(gates.find((gate) => gate.gate === 'subject_pairs_distinct')).toMatchObject({ passed: false, blocking: true });
  });

  it('requires exact first-name-only reader-reply locator lineage', () => {
    const run = runNewsletterSocialFixture('fixture-editor', 'reply-lineage-v1');
    const issue = artifact(run, 'insider_note_issue');
    const payload = structuredClone(issue.payload);
    if (payload.positions[5].status !== 'included') throw new Error('Reader reply omitted');
    payload.positions[5].sourceLocator.locator = 'reply:wrong';
    const gates = evaluateArtifactFormatGates('insider_note_issue', payload, run.claimSet.claims, run.claimSet.lockedAt);
    expect(gates.find((gate) => gate.gate === 'authoritative_input_present')).toMatchObject({ passed: false, blocking: true });
    const alteredQuote = structuredClone(issue.payload);
    if (alteredQuote.positions[5].status !== 'included') throw new Error('Reader reply omitted');
    alteredQuote.positions[5].quote = 'A different reply.';
    expect(evaluateArtifactFormatGates('insider_note_issue', alteredQuote, run.claimSet.claims, run.claimSet.lockedAt).find((gate) => gate.gate === 'authoritative_input_present')).toMatchObject({ passed: false, blocking: true });
  });

  it('blocks nested pricing, broken email UTMs and social format violations', () => {
    const run = runNewsletterSocialFixture('fixture-editor', 'nested-guardrails-v1');
    const issue = artifact(run, 'insider_note_issue');
    const badIssue = structuredClone(issue.payload);
    if (badIssue.positions[7].status !== 'included') throw new Error('Booking note omitted');
    badIssue.positions[7].link.href = 'https://peninsulainsider.com.au/journal/red-hill-wet-weather-lunch/';
    const formatGates = evaluateArtifactFormatGates('insider_note_issue', badIssue, run.claimSet.claims, run.claimSet.lockedAt);
    expect(formatGates.find((gate) => gate.gate === 'email_utm_complete')).toMatchObject({ passed: false, blocking: true });

    const subjectSet = artifact(run, 'insider_note_subject_set');
    const priced = structuredClone(subjectSet.payload);
    priced.pairs[0].subject = 'A $95 lunch in Red Hill';
    const commonGates = evaluateArtifactGates(priced, run.claimSet.claims, subjectSet.factualSegmentIds, subjectSet.claimUsage, run.updatedAt);
    expect(commonGates.find((gate) => gate.gate === 'no_price')).toMatchObject({ passed: false, blocking: true });

    const badCaption = { ...artifact(run, 'instagram_caption').payload, captionDraft: '#RedHill one line', openingMode: 'observation' as const };
    expect(evaluateArtifactFormatGates('instagram_caption', badCaption, run.claimSet.claims, run.claimSet.lockedAt).find((gate) => gate.gate === 'instagram_caption_contract')).toMatchObject({ passed: false });
    const badLinkedIn = { ...artifact(run, 'linkedin_post').payload, text: 'Thoughts? Like if you agree.' };
    expect(evaluateArtifactFormatGates('linkedin_post', badLinkedIn, run.claimSet.claims, run.claimSet.lockedAt).find((gate) => gate.gate === 'linkedin_post_contract')).toMatchObject({ passed: false });
  });

  it('blocks Instagram media review and handoff without exact placement rights', async () => {
    const { app } = await harness();
    const run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-newsletter-social', fixtureVariant: 'rights_not_cleared', actor: 'fixture-editor', idempotencyKey: 'rights-block-v1',
    }).expect(201)).body as FoundryRun;
    const media = artifact(run, 'social_media_brief');
    expect(media.gateResults.find((gate) => gate.gate === 'media_placement_rights')).toMatchObject({ passed: false, blocking: true });
    expect(run.status).toBe('needs_revision');
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: media.id, decision: 'accepted', reviewer: 'fixture-reviewer', expectedVersion: run.version, expectedArtifactVersion: media.version,
    }).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${media.id}/handoff`).expect(400);
  });

  it('invalidates placement rights when the bound media asset changes', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-newsletter-social', actor: 'fixture-editor', idempotencyKey: 'rights-asset-swap-v1',
    }).expect(201)).body as FoundryRun;
    const media = artifact(run, 'social_media_brief');
    const payload = { ...media.payload, assetId: 'asset-never-cleared-999' };
    run = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${media.id}`).send({
      editor: 'fixture-editor', expectedVersion: run.version, expectedArtifactVersion: media.version,
      payload, factualSegmentIds: media.factualSegmentIds, claimUsage: media.claimUsage,
    }).expect(200)).body as FoundryRun;
    const swapped = artifact(run, 'social_media_brief');
    expect(swapped.dependencies.some((dependency) => dependency.kind === 'media_rights')).toBe(false);
    expect(swapped.gateResults.find((gate) => gate.gate === 'dependency_current')).toMatchObject({ passed: false, blocking: true });
    await request(app).put(`/api/foundry/runs/${run.id}/review`).send({
      artifactId: swapped.id, decision: 'accepted', reviewer: 'fixture-reviewer', expectedVersion: run.version, expectedArtifactVersion: swapped.version,
    }).expect(400);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${swapped.id}/handoff`).expect(400);
  });

  it('reconciles expiring booking evidence when the injected evaluation clock advances', async () => {
    const addBookingExpiry = (source: FoundryRun) => {
      const run = structuredClone(source);
      const booking = run.claimSet.claims.find((claim) => claim.id === 'claim-booking');
      if (!booking) throw new Error('Booking claim missing');
      booking.expiresAt = '2026-08-25T00:00:00.000Z';
      run.claimSet.claims = ClaimSchema.array().parse(run.claimSet.claims);
      run.claimSet.contentHash = hashValue(run.claimSet.claims);
      run.artifactPack.claimSetRef.contentHash = run.claimSet.contentHash;
      run.artifactPack.completed = run.artifactPack.completed.map((item) => ({
        ...item,
        dependencies: item.dependencies.map((dependency) => dependency.kind === 'claim_set'
          ? { ...dependency, contentHash: run.claimSet.contentHash }
          : dependency),
      })) as ArtifactVersion[];
      return run;
    };
    let evaluationAsOf = '2026-08-22T00:00:00.000Z';
    const { app, store } = await harness(() => evaluationAsOf);
    const base = addBookingExpiry(runNewsletterSocialFixture('fixture-editor', 'expiry-clock-advance-v1'));
    const early = await store.create(base);
    const earlyIssue = artifact(early, 'insider_note_issue');
    expect(early.evaluationAsOf).toBe(evaluationAsOf);
    expect(earlyIssue.gateResults.find((gate) => gate.gate === 'booking_note_contract')).toMatchObject({ passed: true });
    const reviewedEarly = await store.review(early.id, {
      artifactId: earlyIssue.id, decision: 'accepted', reviewer: 'fixture-reviewer',
      expectedVersion: early.version, expectedArtifactVersion: earlyIssue.version,
    });
    expect(JSON.parse(buildArtifactHandoff(reviewedEarly, earlyIssue.id).body)).toMatchObject({
      authority: 'draft_handoff_only', evaluationAsOf,
    });

    evaluationAsOf = '2026-08-26T00:00:00.000Z';
    const late = await store.get(early.id) as FoundryRun;
    const lateIssue = artifact(late, 'insider_note_issue');
    expect(late.evaluationAsOf).toBe(evaluationAsOf);
    expect(lateIssue.gateResults.find((gate) => gate.gate === 'booking_note_contract')).toMatchObject({ passed: false, blocking: true });
    expect(late.artifactPack.reviews.find((item) => item.artifactId === lateIssue.id)?.status).toBe('stale');
    await expect(store.review(late.id, {
      artifactId: lateIssue.id, decision: 'accepted', reviewer: 'fixture-reviewer',
      expectedVersion: late.version, expectedArtifactVersion: lateIssue.version,
    })).rejects.toThrow('unresolved blocking gates');
    await request(app).get(`/api/foundry/runs/${late.id}/artifacts/${lateIssue.id}/handoff`).expect(400);
  });

  it('persists independent reviews and exports only the accepted artifact handoff', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-newsletter-social', actor: 'fixture-editor', idempotencyKey: 'independent-handoff-v1',
    }).expect(201)).body as FoundryRun;
    const issue = artifact(run, 'insider_note_issue');
    const subjects = artifact(run, 'insider_note_subject_set');
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${issue.id}/handoff`).expect(400);
    run = await review(app, run, issue);
    const handoff = await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${issue.id}/handoff`).expect(200).expect('Content-Type', /json/);
    expect(handoff.body).toMatchObject({ authority: 'draft_handoff_only', publication: false, scheduling: false });
    expect(handoff.body.artifact.payload).toMatchObject({ sendAuthority: 'james_only', scheduleAt: null });
    expect(JSON.stringify(handoff.body)).not.toMatch(/\$\s?\d|—/);
    await request(app).get(`/api/foundry/runs/${run.id}/artifacts/${subjects.id}/handoff`).expect(400);
    run = await review(app, run, artifact(run, 'insider_note_subject_set'));
    expect(run.artifactPack.reviews.filter((item) => item.status === 'current')).toHaveLength(2);
    expect(buildArtifactHandoff(run, artifact(run, 'insider_note_subject_set').id).body).toContain('"selectedPairId": null');
  });

  it('stales issue and dependent subject reviews after an atomic issue edit', async () => {
    const { app } = await harness();
    let run = (await request(app).post('/api/foundry/runs').send({
      fixtureId: 'red-hill-newsletter-social', actor: 'fixture-editor', idempotencyKey: 'newsletter-stale-v1',
    }).expect(201)).body as FoundryRun;
    run = await review(app, run, artifact(run, 'insider_note_issue'));
    run = await review(app, run, artifact(run, 'insider_note_subject_set'));
    const issue = artifact(run, 'insider_note_issue');
    const payload = structuredClone(issue.payload);
    payload.positions[1].lines[0].text = 'Rain settled over Red Hill, and the covered room showed its value.';
    const claimUsage = issue.claimUsage.map((usage) => usage.segmentId === 'issue-intro'
      ? { ...usage, contentHash: hashValue(payload.positions[1].lines[0].text) }
      : usage);
    const edited = (await request(app).put(`/api/foundry/runs/${run.id}/artifacts/${issue.id}`).send({
      editor: 'fixture-editor', expectedVersion: run.version, expectedArtifactVersion: issue.version,
      payload, factualSegmentIds: issue.factualSegmentIds, claimUsage,
    }).expect(200)).body as FoundryRun;
    expect(edited.artifactPack.reviews.filter((item) => item.status === 'current')).toHaveLength(0);
    expect(edited.artifactPack.reviews.filter((item) => item.status === 'stale')).toHaveLength(2);
    await request(app).get(`/api/foundry/runs/${edited.id}/artifacts/${issue.id}/handoff`).expect(400);
  });
});
