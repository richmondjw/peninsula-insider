/**
 * sources.mjs - decide what a fetched source page actually said.
 *
 * Split out from the probe so the deciding is testable without a network.
 * Bytes in, verdict out: no filesystem, no clock, no network. The probe does
 * the fetching and hands the result here.
 *
 * WHY THE COMPARISON IS ON A CANONICAL FORM AND THE RAW STRINGS ARE KEPT
 * ---------------------------------------------------------------------
 * Wikimedia writes a licence as "CC BY-SA 4.0". LICENSES.md writes the same
 * licence as "CC-BY-SA-4.0". Those are the same grant spelled two ways, and a
 * checker that reported them as a disagreement would bury the real
 * disagreements in noise. So both sides are reduced to a canonical identifier
 * by a declared table, and the comparison happens there.
 *
 * The raw strings travel with the verdict regardless. A canonical form is a
 * convenience for counting; a person deciding whether to publish a photograph
 * should see what the source actually said, not this module's opinion of it.
 *
 * WHAT A MATCH HERE IS AND IS NOT
 * -------------------------------
 * A match means the licence named on the source page today is the licence
 * LICENSES.md wrote down. It is not a check that the photograph in
 * public/images/sourced is the photograph on that page, which nothing
 * automatable can establish, and it is not permission to publish. It is one
 * fact, checked, and recorded with the date it was checked on.
 *
 * House rules: no em-dashes, no exclamation marks.
 */

/**
 * Licence spellings reduced to one identifier each.
 *
 * Matched against a string with every character except letters and digits
 * removed, upper-cased. The table is exact and ordered: the first pattern
 * whose canonical key the reduced string starts with wins, and anything the
 * table does not hold comes back null, which reports as "not comparable"
 * rather than as a disagreement.
 */
export const LICENCE_IDS = [
  ['CC0', 'cc0'],
  ['PUBLICDOMAIN', 'cc0'],
  ['CCBYSA20', 'cc-by-sa-2.0'],
  ['CCBYSA25', 'cc-by-sa-2.5'],
  ['CCBYSA30', 'cc-by-sa-3.0'],
  ['CCBYSA40', 'cc-by-sa-4.0'],
  ['CCBY20', 'cc-by-2.0'],
  ['CCBY25', 'cc-by-2.5'],
  ['CCBY30', 'cc-by-3.0'],
  ['CCBY40', 'cc-by-4.0'],
  ['UNSPLASH', 'unsplash'],
];

/** Strip a string to letters and digits, upper-cased. */
export function reduce(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** The canonical licence identifier a string names, or null. */
export function licenceId(value) {
  const flat = reduce(value);
  if (flat.length === 0) return null;
  // Longest key first so CCBYSA40 is never matched as CCBY.
  const table = [...LICENCE_IDS].sort((a, b) => b[0].length - a[0].length);
  for (const [key, id] of table) {
    if (flat.startsWith(key)) return id;
  }
  return null;
}

/** Remove HTML tags and collapse whitespace. Wikimedia returns markup. */
export function plainText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The Commons file title a file-page URL names, or null when the URL is not a
 * Commons file page.
 */
export function commonsTitle(url) {
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    return null;
  }
  if (parsed.host.toLowerCase() !== 'commons.wikimedia.org') return null;
  const match = /^\/wiki\/(File:.+)$/.exec(parsed.pathname);
  if (!match) return null;
  return decodeURIComponent(match[1]).replace(/_/g, ' ');
}

/**
 * The API call that returns the licence and author of up to fifty Commons
 * files at once.
 *
 * Batched deliberately. An earlier version of the probe fetched each file's
 * HTML page and then its API record, twenty-two pairs of requests at four at a
 * time, and Wikimedia rate-limited it halfway through: eleven files came back
 * with no licence, which reads exactly like eleven files whose licence could
 * not be established. A throttled probe that reports "not comparable" is worse
 * than no probe, because the emptiness looks like a finding. One request for
 * the whole set is both politer and honest.
 *
 * The page fetch is dropped with it. The API says whether the file exists,
 * which is the only reachability fact the HTML page could have added.
 */
export function commonsApiUrl(titles) {
  const list = Array.isArray(titles) ? titles : [titles];
  const params = new URLSearchParams({
    action: 'query',
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    titles: list.join('|'),
    format: 'json',
    formatversion: '2',
  });
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
}

/** Read one page object out of a Commons imageinfo response. */
function readCommonsPage(page) {
  if (!page || page.missing === true || page.invalid === true) {
    return { found: false, licence: null, artist: null, credit: null };
  }
  const meta = page.imageinfo?.[0]?.extmetadata ?? {};
  const value = (key) => (meta[key]?.value === undefined ? null : plainText(meta[key].value) || null);
  return {
    found: true,
    licence: value('LicenseShortName') ?? value('License'),
    artist: value('Artist'),
    credit: value('Credit'),
  };
}

/**
 * Read a batched Commons imageinfo response into a map keyed by the title the
 * caller asked for.
 *
 * The API normalises titles (underscores become spaces, the first letter is
 * capitalised) and reports what it did in `query.normalized`. Following that
 * mapping back is what lets a caller ask about the title in its own URL and
 * get an answer it can match up. A missing key means the API said nothing
 * about that file, which is not the same as the file being absent and must
 * never be read as one.
 */
export function readCommonsResponse(body, titles = []) {
  const asked = Array.isArray(titles) ? titles : [titles];
  const normalised = new Map();
  for (const pair of body?.query?.normalized ?? []) normalised.set(pair.to, pair.from);

  const byTitle = new Map();
  for (const page of body?.query?.pages ?? []) {
    const read = readCommonsPage(page);
    const original = normalised.get(page.title) ?? page.title;
    byTitle.set(original, read);
    byTitle.set(page.title, read);
  }
  // A title the response did not mention at all is reported as absent from the
  // map rather than as a missing file.
  const out = new Map();
  for (const title of asked) {
    if (byTitle.has(title)) out.set(title, byTitle.get(title));
  }
  return out;
}

/**
 * Compare what the file wrote down with what the source says now.
 *
 * `matches` and `differs` are only ever returned when both sides produced a
 * canonical identifier. Everything else is `not-comparable`, which is an
 * absence of evidence and is reported as such rather than being rounded to
 * either answer.
 */
export function compareLicence(fileLicence, sourceLicence) {
  const a = licenceId(fileLicence);
  const b = licenceId(sourceLicence);
  if (a === null || b === null) return 'not-comparable';
  return a === b ? 'matches' : 'differs';
}

/**
 * Compare the photographer the file names with the author the source names.
 *
 * Deliberately weak, and deliberately honest about being weak. A Commons
 * author field can be a username, a real name, a studio, or a sentence, and
 * the file's Photographer line can be any of those too. So the only positive
 * answer this gives is `contains`, meaning one string contains the other once
 * both are reduced to letters and digits. Anything else is `not-established`,
 * never `differs`, because two spellings of one person is far more likely here
 * than a genuine misattribution and reporting a difference nobody verified
 * would be exactly the invented claim this ticket exists to prevent.
 */
export function compareCreator(fileCreator, sourceArtist) {
  const a = reduce(fileCreator);
  const b = reduce(sourceArtist);
  if (a.length === 0 || b.length === 0) return 'not-established';
  if (a === b) return 'exact';
  if (a.includes(b) || b.includes(a)) return 'contains';
  return 'not-established';
}

/**
 * The verdict for an HTTP status, using the same vocabulary
 * audit-link-health.mjs settled on so two ledgers do not describe the same
 * web with different words.
 */
export function verdictForStatus(status) {
  if (status === null || status === undefined) return 'unknown';
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'moved';
  if ([400, 401, 403, 406, 429, 503].includes(status)) return 'blocked';
  if (status === 404 || status === 410) return 'dead';
  return 'unknown';
}
