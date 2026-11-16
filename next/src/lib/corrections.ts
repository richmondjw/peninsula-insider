/**
 * corrections.ts - the shared vocabulary and client-side helpers behind the
 * corrections queue (PI-016).
 *
 * WHY THE CASE REFERENCE IS MINTED IN THE BROWSER. The site is a static
 * build on GitHub Pages with no application server; Supabase is reached
 * straight from the page with the publishable key and RLS is the only gate.
 * pi.corrections grants the anonymous role INSERT and nothing else, on
 * purpose: a public SELECT on a table of unpublished corrections would leak
 * every unverified allegation anyone had ever filed. That means a
 * server-generated id can never be read back to show the reporter. So the
 * reference is generated here, written as part of the insert, and printed on
 * screen in the same tick. It is the reporter's only handle on the case.
 *
 * That design makes collision resistance this module's problem. See
 * generateCaseRef below for the arithmetic.
 *
 * This module deliberately has no imports. corrections.test.mjs loads it
 * with Node's bare TypeScript type-stripping and no bundler resolution, the
 * same arrangement season.ts and its test use. A leaf module with zero edges
 * stays loadable by the browser bundle and by plain Node alike.
 */

/**
 * The correction taxonomy. These are NOT new vocabulary: they are the four
 * classes already written into ops/correction-handling.md ("Factual error",
 * "Stale information", "Disputed framing", "Off-scope") and the class values
 * already used by docs/CHANGELOG-corrections.md. The editor sets this at
 * triage; the reporter never sees it.
 */
export const CORRECTION_CLASSES = ['factual', 'stale', 'framing', 'off-scope'] as const;
export type CorrectionClass = (typeof CORRECTION_CLASSES)[number];

/**
 * What standing the reporter has. This changes how a claim gets verified,
 * never how fast it gets looked at: correcting a factual error is free and
 * handled the same way whoever reports it.
 */
export const REPORTER_RELATIONSHIPS = [
  'reader',
  'operator',
  'subject',
  'representative',
  'other',
] as const;
export type ReporterRelationship = (typeof REPORTER_RELATIONSHIPS)[number];

/** Urgency as the reporter sees it. Advisory input to triage, not a promise. */
export const CORRECTION_SEVERITIES = ['urgent', 'normal', 'minor'] as const;
export type CorrectionSeverity = (typeof CORRECTION_SEVERITIES)[number];

/** Lifecycle. 'closed' and 'reopened' are both reachable, repeatedly. */
export const CORRECTION_STATUSES = [
  'received',
  'in-triage',
  'needs-verification',
  'accepted',
  'applied',
  'declined',
  'closed',
  'reopened',
] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const CORRECTIONS_EMAIL = 'corrections@peninsulainsider.com.au';
export const SITE_ORIGIN = 'https://peninsulainsider.com.au';

/**
 * Crockford base32, minus I, L, O and U. Chosen so a reference read aloud
 * down a phone line, or copied off a screenshot, survives the trip: there is
 * no 1/I/l confusion and no 0/O confusion left to make.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const CASE_REF_PREFIX = 'PI-C';
const CASE_REF_RANDOM_LEN = 6;

/** PI-C-YYMMDD-XXXXXX, uppercase, no ambiguous glyphs. */
export const CASE_REF_PATTERN = /^PI-C-\d{6}-[0-9A-HJKMNP-TV-Z]{6}$/;

/**
 * Draw `count` values in [0, ALPHABET.length) from the best source available.
 * crypto.getRandomValues everywhere that matters; Math.random only where it
 * does not exist, which in practice is nowhere this ships to. The modulo is
 * unbiased because 256 is an exact multiple of 32.
 */
function randomIndices(count: number): number[] {
  const out: number[] = [];
  const c: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(count);
    c.getRandomValues(bytes);
    for (let i = 0; i < count; i++) out.push(bytes[i] % ALPHABET.length);
    return out;
  }
  for (let i = 0; i < count; i++) out.push(Math.floor(Math.random() * ALPHABET.length));
  return out;
}

/**
 * Mint a case reference: PI-C-<YYMMDD>-<6 random base32 chars>.
 *
 * COLLISION ARITHMETIC. The date segment partitions the space by day, so two
 * references only ever collide within the same day. Six base32 characters is
 * 32^6 = 1,073,741,824 values per day. ops/correction-handling.md puts
 * realistic volume at nought to three corrections a week and names ten a week
 * as the point to revisit capacity. At even a thousand a day the birthday
 * probability of any collision is under one in two thousand, and a collision
 * is not silent data loss in any case: case_ref carries a UNIQUE constraint,
 * so the insert fails loudly and the form can retry.
 *
 * Date is taken in local time on purpose. The reference is a human handle,
 * not a timestamp; pi.corrections.received_at is the record of when it
 * landed. A reporter in Melbourne quoting a reference should see the day they
 * actually sent it.
 *
 * @param now   injectable clock, for tests
 * @param draw  injectable randomness, for tests
 */
export function generateCaseRef(
  now: Date = new Date(),
  draw: (count: number) => number[] = randomIndices,
): string {
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const tail = draw(CASE_REF_RANDOM_LEN)
    .map((n) => ALPHABET[((n % ALPHABET.length) + ALPHABET.length) % ALPHABET.length])
    .join('');
  return `${CASE_REF_PREFIX}-${yy}${mm}${dd}-${tail}`;
}

/** True for a string this module could have minted. Used to validate quoted refs. */
export function isCaseRef(value: unknown): boolean {
  return typeof value === 'string' && CASE_REF_PATTERN.test(value.trim());
}

/**
 * Turn whatever the reporter pasted into the affected-URL field into
 * something an editor can open.
 *
 * This is the other half of "missing information is handled". Requiring the
 * field stops an empty submission; normalising it stops the submission that
 * technically has a URL but points at a Google cache, or is just the path
 * fragment out of the address bar, or carries the newsletter's utm tail.
 * Readers paste all three.
 *
 * Returns the canonical absolute URL when the input resolves to a PI page,
 * the cleaned absolute URL when it resolves off-site (an editor still wants
 * to see it - a correction about a syndicated copy is still a correction),
 * and null when there is nothing usable. Never throws.
 *
 * Deliberately NOT a gate. The form requires the field and lets the browser
 * check it against a pattern; this only improves what gets stored. A reporter
 * whose URL cannot be parsed still gets their correction filed, with the raw
 * text kept verbatim, because losing the report is worse than storing a
 * messy pointer.
 */
export function normaliseAffectedUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;

  // Strip a wrapping pair of angle brackets or quotes - mail clients add them.
  raw = raw.replace(/^[<"'\s]+/, '').replace(/[>"'\s]+$/, '');
  if (!raw) return null;

  // A bare path or a bare host, both common out of an address bar.
  if (raw.startsWith('/')) raw = SITE_ORIGIN + raw;
  else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) raw = 'https://' + raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname || !url.hostname.includes('.')) return null;

  // Campaign tails are noise on a correction. Everything else survives:
  // a query string can be the whole point on a filtered listing page.
  const TRACKING = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|_hs)/i;
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  url.hash = '';

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (host === 'peninsulainsider.com.au') {
    url.protocol = 'https:';
    url.hostname = 'peninsulainsider.com.au';
    url.port = '';
    // The site emits trailing-slash directory URLs; match them so two
    // reports of the same page land on the same affected_url.
    if (!/\.[a-z0-9]{2,5}$/i.test(url.pathname) && !url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
  }

  return url.toString();
}

/**
 * Which required fields are still missing, by form field name. The browser
 * enforces `required` itself; this exists so the page can say what is
 * missing in one sentence rather than leaving the reporter hunting for the
 * field the browser focused, and so the rule has one definition that a test
 * can pin.
 */
export const REQUIRED_FIELDS = [
  'affected_url',
  'claim',
  'proposed_correction',
  'evidence',
] as const;

export function missingRequiredFields(values: Record<string, unknown>): string[] {
  return REQUIRED_FIELDS.filter((name) => {
    const v = values[name];
    return typeof v !== 'string' || v.trim().length === 0;
  });
}
/**
 * Human labels for the four required fields, in the words the form uses.
 * Kept here rather than in the page so the "what is still missing" sentence
 * has one definition a test can pin.
 */
export const REQUIRED_FIELD_LABELS: Record<string, string> = {
  affected_url: 'the page it is on',
  claim: 'what is wrong',
  proposed_correction: 'what it should say',
  evidence: 'how you know',
};

/**
 * One sentence naming what is still missing. The browser already blocks the
 * submit and focuses the first empty control; this exists because a reporter
 * looking at a long form wants to be told what is outstanding rather than
 * made to hunt for a highlighted box.
 */
export function describeMissingFields(names: readonly string[]): string {
  const labels = names.map((n) => REQUIRED_FIELD_LABELS[n] || n);
  if (labels.length === 0) return '';
  if (labels.length === 1) return 'Still needed: ' + labels[0] + '.';
  const head = labels.slice(0, -1).join(', ');
  return 'Still needed: ' + head + ' and ' + labels[labels.length - 1] + '.';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function textOrNull(value: unknown): string | null {
  const v = text(value);
  return v === '' ? null : v;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const v = text(value);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Everything the browser has to mint before it can write the two rows. */
export interface CorrectionSubmissionMeta {
  /** Client-minted uuid. See buildCorrectionRow for why the client owns it. */
  id: string;
  caseRef: string;
  userId?: string | null;
  clientToken?: string | null;
}

/**
 * Build the pi.corrections insert payload.
 *
 * TWO THINGS THIS FUNCTION EXISTS TO GUARANTEE.
 *
 * 1. It never emits an editorial field. The anonymous insert policy on
 *    pi.corrections carries a with-check that rejects any row arriving with a
 *    status, class, owner, decision timestamp, editor note, changelog or
 *    ledger reference, or contact_provided flag already set. A stray key here
 *    is not a cosmetic bug: it is every submission on the site failing with a
 *    policy violation. The row is therefore built by allowlist, and a test
 *    asserts the forbidden keys are absent rather than merely empty.
 *
 * 2. The id is minted client-side. The reporter's contact details go in a
 *    second table keyed on this id, and the anonymous role has no select
 *    policy on pi.corrections, so a server-generated id could never be read
 *    back to key the second row against. Same constraint that forces the case
 *    reference into the browser, same answer. Collision risk is a v4 uuid's,
 *    and the primary key turns a collision into a loud failure.
 *
 * affected_url is stored normalised where the input parsed and verbatim where
 * it did not. Losing a correction because its URL was unparseable would be
 * worse than storing a messy pointer.
 */
export function buildCorrectionRow(
  values: Record<string, unknown>,
  meta: CorrectionSubmissionMeta,
): Record<string, unknown> {
  const rawUrl = text(values.affected_url);
  return {
    id: meta.id,
    case_ref: meta.caseRef,
    user_id: meta.userId ?? null,
    affected_url: normaliseAffectedUrl(rawUrl) ?? rawUrl,
    claim: text(values.claim),
    proposed_correction: text(values.proposed_correction),
    evidence: text(values.evidence),
    evidence_url: textOrNull(values.evidence_url),
    reporter_relationship: oneOf(values.reporter_relationship, REPORTER_RELATIONSHIPS, 'reader'),
    severity: oneOf(values.severity, CORRECTION_SEVERITIES, 'normal'),
    client_token: meta.clientToken ?? null,
  };
}

/**
 * Build the pi.correction_reporters insert payload, or null when the reporter
 * gave no way to reach them.
 *
 * Returning null is the point of the function. Email is optional on purpose:
 * a reader who will not hand over an address must still be able to report a
 * factual error, and writing an empty contact row to record that absence
 * would put a personal-data row on disk saying nothing. No contact, no row,
 * and pi.corrections.contact_provided stays false, which is exactly what the
 * queue needs to know.
 */
export function buildReporterRow(
  values: Record<string, unknown>,
  correctionId: string,
): Record<string, unknown> | null {
  const email = textOrNull(values.contact_email);
  const name = textOrNull(values.contact_name);
  if (!email && !name) return null;
  return {
    correction_id: correctionId,
    contact_name: name,
    contact_email: email,
    // 'none' is a real answer: a name with no address is a case that can be
    // filed and credited but not replied to.
    contact_preference: email ? 'email' : 'none',
  };
}

/* ==========================================================================
   Outcome
   ========================================================================== */

export type CorrectionOutcome =
  | 'filed'               // case landed, reply requested, contact row landed
  | 'filed-no-reply'      // case landed, no address given, so no reply possible
  | 'filed-unanswerable'  // case landed, address given, contact row did NOT land
  | 'failed';             // case did not land; nothing was recorded

/**
 * Decide what the reporter is told, from what the database actually
 * confirmed. THIS IS THE RULE PI-016 TURNS ON, and it is the one piece of
 * the partner-enquiry shape (PI-015, PR #420) that /corrections/ never got.
 *
 * THE DEFECT THIS REPLACES. The page used a single boolean, `answerable`,
 * set only when the pi.correction_reporters insert came back clean. Anything
 * else - including a reporter who typed their address in and whose contact
 * row then failed to write - fell to one message:
 *
 *     "with no email address on the case, that reference is the only way to
 *      follow it up"
 *
 * For a reporter who supplied an address that is simply false, and it is the
 * worst kind of false: it is the identical wording shown to someone who
 * chose not to give one, so it reads as a description of their own choice
 * rather than as our failure. They have no reason to act on it, and the one
 * thing that would recover the case - quoting the reference at the mailbox -
 * is the thing they will not do. The correction survives; the reply is lost
 * silently, on a page whose entire subject is trust.
 *
 * Three facts, and only three, decide the message. All three are read from
 * awaited results or from the reporter's own input - never inferred from the
 * absence of a thrown exception, which is precisely how a form comes to
 * congratulate someone on a write that did not happen.
 *
 *   caseInserted     the pi.corrections row is confirmed on the server.
 *   replyRequested   the reporter supplied an email address. Not "supplied
 *                    anything": a name alone is a credit, not a reply route,
 *                    and buildReporterRow files it with preference 'none'.
 *   contactInserted  the pi.correction_reporters row is confirmed.
 *
 * Note the asymmetry with partner enquiries, and that it is deliberate.
 * There, contact is required and an enquiry nobody can answer is a lost
 * lead. Here, contact is optional and a correction nobody can answer is
 * still a correction, verified and fixed exactly the same way. So
 * 'filed-no-reply' is a complete success and reads as one; only
 * 'filed-unanswerable' - where we were asked for a reply and lost the means
 * to give it - is a partial.
 */
export function classifyOutcome(input: {
  caseInserted: boolean;
  replyRequested: boolean;
  contactInserted: boolean;
}): CorrectionOutcome {
  if (!input.caseInserted) return 'failed';
  if (!input.replyRequested) return 'filed-no-reply';
  return input.contactInserted ? 'filed' : 'filed-unanswerable';
}

/** True when the correction itself is on the server. */
export function isFiled(outcome: CorrectionOutcome): boolean {
  return outcome !== 'failed';
}

/** True only where a reply is actually possible, and so may be promised. */
export function promisesReply(outcome: CorrectionOutcome): boolean {
  return outcome === 'filed';
}

/**
 * True where the reporter's own input, not a failure of ours, is why no
 * reply is coming. Only 'filed-no-reply' may say so; saying it on
 * 'filed-unanswerable' is the defect above.
 */
export function silenceIsReporterChoice(outcome: CorrectionOutcome): boolean {
  return outcome === 'filed-no-reply';
}

/**
 * The words for each outcome, kept beside the rule rather than in the page so
 * a test can assert the copy against the rule rather than against itself.
 * The failure mode being guarded is copy drifting into optimism.
 */
export function outcomeMessage(outcome: CorrectionOutcome, caseRef: string): string {
  switch (outcome) {
    case 'filed':
      return (
        'Filed. Your reference is ' + caseRef + '. ' +
        'Write it down anyway, then leave it with us: we will reply when the case is resolved.'
      );
    case 'filed-no-reply':
      return (
        'Filed. Your reference is ' + caseRef + '. ' +
        'Write it down: you gave no email address, so that reference is the only way to ' +
        'follow the case up. Quote it to ' + CORRECTIONS_EMAIL + ' if you want an answer.'
      );
    case 'filed-unanswerable':
      return (
        'Filed, and the correction itself is safe with us - the reference is ' + caseRef + '. ' +
        'Your contact details did not save with it, though, so as things stand we cannot reply. ' +
        'Email ' + CORRECTIONS_EMAIL + ' quoting that reference and we will attach them to the case.'
      );
    case 'failed':
    default:
      return (
        'That did not file, and nothing was recorded. Try once more, and if it fails again ' +
        'email ' + CORRECTIONS_EMAIL + ' with the page URL and what is wrong.'
      );
  }
}

/**
 * Which status style the page shows. 'filed-unanswerable' is deliberately not
 * a success: something we were asked to do did not happen, and styling it as
 * a confirmation is how a reader stops reading before the second sentence.
 */
export function outcomeStatusKind(outcome: CorrectionOutcome): 'success' | 'error' {
  return outcome === 'filed' || outcome === 'filed-no-reply' ? 'success' : 'error';
}

/**
 * Whether to clear the form. Only where nothing is outstanding. On
 * 'filed-unanswerable' the case exists but the reporter still has something
 * to do with what they typed, and on 'failed' clearing it would destroy the
 * only copy of a correction that was never recorded.
 */
export function shouldResetForm(outcome: CorrectionOutcome): boolean {
  return outcome === 'filed' || outcome === 'filed-no-reply';
}

/** True when the reporter asked to be replied to, i.e. gave an address. */
export function wantsReply(values: Record<string, unknown>): boolean {
  const row = buildReporterRow(values, 'probe');
  return row !== null && row.contact_preference === 'email';
}
