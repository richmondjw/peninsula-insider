# Thirteen venues we cannot reach: a contact-route inventory of all 137

Register item A27. Branch `pi/venue-contact-reachability`. Companions:
`2026-09-14-source-links-and-contradictions.md` (the link queue this reads from),
`2026-09-14-unschemad-closure-signals.md` (the other half of the discarded-field defect), and
`link-health-ledger.json`, which is the evidence behind every verdict below.

A27 records that the four intake tables behind the corrections workflow, the partner enquiry form
and the operator update form do not exist in production. All three end in the same physical act:
somebody contacts a venue. Nobody had asked the corpus whether that is possible. This asks it.

**Nothing here was fetched.** Every reachability verdict is read from the committed link-health
ledger, which only `audit-link-health.mjs --probe` writes and a human commits in a reviewable diff.
No record was edited; a wrong website is an editorial act with a person's name on it, not something
a survey decides.

## Headline

| | |
|---|---:|
| Venue records | 137 |
| **Venues we cannot reach at all** | **13** |
| — carrying nothing: no website, no booking URL, no phone, no email | 13 |
| — carrying only routes the ledger records as dead | 0 |
| Venues with no website | 22 |
| Venues with no phone number | 36 |
| Venues with no route the ledger has ever confirmed live | 31 |
| Contact routes the build can see | 328 |
| Contact routes the schema silently discards | 47, across 22 venues |
| Live venue routes that resolve and are not the business | 1 |

Reproduce with `cd next && npm run audit:venue-reachability`, which takes no network and reads no
clock.

## 1. What counts as a contact route, and how each one is scored

Five fields, and the difference between the first three and the last two is most of this report.

| Field | Declared in `content.config.ts` | Count | What the build does with it |
|---|---|---:|---|
| `website` | yes | 115 | rendered in the venue detail panel |
| `bookingUrl` | yes | 112 | rendered as the primary action |
| `phone` | yes | 101 | rendered as a `tel:` link |
| `liveStatusUrl` | yes | 0 | never set; see section 6 |
| `email` | **no** | 1 | **stripped by Zod before any surface sees it** |
| `sameAs.*` | **no** | 46 | **stripped by Zod before any surface sees it** |

A URL route is scored from its ledger row, never inferred:

| State | Ledger verdict | Meaning |
|---|---|---|
| reachable | `ok` | a probe fetched a real page |
| unverifiable | `blocked`, `unknown` | the host refuses robots. A person with a browser very likely gets through, so this is never counted as broken — the council is this site's most-cited publisher and refuses most automated reads |
| broken | `dead`, `parked`, `tls-fault` | nothing a reader can use |
| misdirected | `moved` | dead where we publish it, alive somewhere the record does not point |
| unledgered | no row | an unknown, reported as one |

A phone number cannot be probed from a repository, so it is scored `unverifiable` — present, and
whether it rings is outside this evidence. A venue carrying one is never counted unreachable here.

Current distribution of the 328 declared routes: 184 confirmed live, 144 unverifiable (101 of them
phone numbers, 43 URLs behind a bot wall), **0 broken, 0 misdirected, 0 unledgered.**

## 2. The thirteen

Every one of them carries nothing at all. Not a dead website — no website, no booking URL, no
phone, no email. All thirteen are published; none is excluded from the sitemap.

| Venue | Type | How it got here |
|---|---|---|
| Balnarring Bakehouse | bakery | never carried one |
| Mornington Main Street Market | market | never carried one |
| Mount Eliza Farmers Market | market | never carried one |
| Rye Beachside Market | market | never carried one |
| Balnarring Market | market | website retired 2026-09-13: certificate does not match the hostname |
| Driftaway on Dundas | cottage | website retired: serves the Squarespace "Website Expired" page |
| Lightfoot Wines | winery | website retired: domain does not resolve |
| Mornington Farmers' Market | market | website retired: domain does not resolve |
| Phaedrus Estate | winery | website retired: domain does not resolve, no replacement found |
| Red Hill Market | market | website retired: NetRegistry redirector answering 200 with "Not found" |
| Small Stone Pantry | cafe | website retired: domain does not resolve |
| The Orchard Luxury Accommodation | cottage | website retired: TLS handshake fails |
| Villa Mallorca | cottage | website retired: domain does not resolve |

Two populations, and they need different things.

**Four never had a route.** No `retiredSourceLinks`, no `sourceStatus`, nothing removed — the
records were written without contact details and nobody noticed, because nothing in the build asks.

**Nine lost theirs to PI-007**, which is the system working: each retired a website that was
genuinely dead and wrote down what it saw rather than leaving a link that went nowhere. The honest
consequence is that the record now has nothing, and that consequence was invisible until this
inventory. Seven of the thirteen also carry `operatingStatus: verify-open`, which asks an editor to
confirm the business is trading using contact details the record does not have.

### The whole market category

**All six markets in the corpus are in that list.** Not a sample of the type — the type. Three
never had a route and three had one retired. A market has no front door to call, so the pattern is
explicable, but it means the one category whose facts change most often between seasons is the
category with no way to check them.

## 3. Only-dead routes: zero, and why that is not a clean bill of health

No venue carries a route the ledger records as dead. That number is the direct product of the
PI-007 sweep on 2026-09-13, which fetched every URL in a source field and retired the ones that had
died. Before that sweep, nine of the thirteen above were exactly this class: a published website we
believed we could use, that nobody could.

The class is therefore empty by maintenance, not by construction. It refills the moment an
operator's domain lapses, and nothing reports that until someone runs `--probe` again. The ledger
carries `updatedAt` 2026-09-14T00:33Z; a probe is a deliberate human act and this survey does not perform one.

## 4. A URL that resolves and is not the business

HTTP 200 is not proof of life. Two signals are available offline, and both read the ledger.

### Landers: a title that gives it away

Three ledger rows carry a for-sale, expired or coming-soon title. **None is cited by a live venue
route** — all three were caught by PI-007 and now survive only in `retiredSourceLinks`, which is
where a dead link belongs.

| URL | Status seen | Title recorded | Now |
|---|---|---|---|
| `www.arthursseat.com.au/book/` | **200** | "arthursseat.com.au - This website is for sale! …" | replaced on the gondola tour record with `aseagle.com.au/tickets/` |
| `www.driftawayondundas.com` | 404 | "Squarespace - Website Expired" | retired; Driftaway on Dundas now has no route (section 2) |
| `www.ouestfrance.com.au` | 404 | "ConnectYourDomain Error | Wix.com" | retired on Ouest France Bistro |

The gondola link is the case worth keeping in view: it answered **200** for as long as anybody
checked status codes. A checker that reads only the status line scores it healthy forever. The only
reason it was caught is that the probe records the page title, and a human read it.

### Off-domain redirects: the probe ended up somewhere else

Eleven ledger rows redirect off the registrable domain that was requested. Eight of those sit on
live venue routes, covering four venues. Three are an operator who changed domain and redirects
properly — benign, and worth repointing at the real domain when someone is in the file anyway:

| Venue | Route | Requested | Landed on | Title |
|---|---|---|---|---|
| endota spa Mornington | `website`, `bookingUrl` | `endota.com.au` | `endotaspa.com.au` | "Day Spa \| Massage \| Facials - endota spa" |
| Johnny Ripe | `website`, `bookingUrl` | `johnnyripe.com.au` | `johnnyripe.au` | "Johnny Ripe \| FRESHLY MADE ON THE MORNINGTON PENINSULA" |
| Scorpo Wines | `website`, `bookingUrl` | `scorpowines.com.au` | `scorpowines.com` | "Scorpo Vineyard & Wines …" |

The fourth is the live instance of the defect class:

| Venue | Route | Requested | Landed on | Title |
|---|---|---|---|---|
| **Kooyong** | `website` | `kooyong.com` | **`portphillipestate.com.au`** | **"About - Port Phillip Estate"** |

A reader who clicks the website link on the Kooyong page arrives at a different venue's About page.
Both estates share ownership, so this is a redirect the operator chose rather than a lapsed domain,
and the link is not dangerous — but it does not reach Kooyong, and a checker reading status codes
calls it perfect. Kooyong also carries a phone number, so it is not unreachable; it is
mis-signposted. **Not corrected here**, because choosing the right URL is an editorial call and the
same value is duplicated in the discarded `sameAs.officialSite` field, which section 5 says should
not be resolved twice in two places.

## 5. What the schema throws away

Forty-seven contact routes across 22 venues sit in fields `next/src/content.config.ts` does not
declare, so Zod strips them before any page, template, feed or export sees them. The file looks
answered; the site is as mute as if it were blank.

| Field | Routes | Venues | What it is |
|---|---:|---:|---|
| `email` | 1 | 1 | Moke Dining, `hello@mokedining.com.au` |
| `sameAs.officialSite` | 21 | 21 | duplicates the venue's own `website` on all 21 — no unique route lost |
| `sameAs.halliday` | 21 | 21 | Wine Companion profile |
| `sameAs.mpva` | 4 | 4 | Mornington Peninsula Vignerons profile |

Two consequences worth recording:

**No venue is unreachable *because* of a stripped field, today.** Moke Dining also carries a website
and a phone, and every `officialSite` duplicates a declared `website`. The defect is real and the
blast radius is currently one address. Declaring the field is being handled on
`pi/declare-discarded-fields`; nothing in this branch touches `content.config.ts`.

**Twenty-five of the 46 `sameAs` URLs have no ledger row at all.** The link gate collects URLs by
leaf field name, and `halliday` and `mpva` are not in that list. They are invisible today because
the schema strips them; if `sameAs` is ever declared, 25 unprobed URLs enter the published corpus in
one commit. Whoever declares it should add those leaves to `SOURCE_FIELD_LEAVES` in
`audit-link-health.mjs` and probe them in the same change, or the `unledgeredSourceUrl` ratchet will
fail the build — correctly.

**And there is no social route anywhere.** No venue record carries an Instagram, Facebook or TikTok
handle in any field, declared or discarded. The only mentions are in prose: Flinders Sourdough's
editor note tells the reader to "check the Instagram for special loaves", which is a route the
record does not hold and the site cannot link.

## 6. What this cannot tell you

- **Whether a phone rings.** 101 numbers are scored `unverifiable` and not one has been dialled.
  A disconnected number looks identical to a live one from here.
- **Whether a live page carries a contact method.** 93 websites are confirmed to fetch. Whether any
  of them publishes an email address or an enquiry form is a question about page content, not about
  link health, and this survey does not read pages.
- **Whether 43 bot-walled URLs are healthy.** `blocked` is an honest unknown, deliberately not a
  fault.
- **Whether the ledger is current.** Its last write is stamped 2026-09-14T00:33Z, and all but one of its 477 rows were probed on 2026-09-13. Reachability decays without a probe,
  and the number in the headline is true of the tree, not of the internet this morning.

One softener on the reader-facing side, and it is only a softener: every venue page renders a
"Check live status" link, and since no record sets `liveStatusUrl`, all 137 fall back to a Google
Maps search built from the venue's name and address. A reader on an unreachable venue's page still
lands somewhere useful. That is a search query we construct, not a contact detail we hold — it
cannot be used by a corrections workflow that has to email an operator about a specific claim, and
it is not evidence that a route exists.

## 7. What would close the gap

Nothing below was done. Each is a decision, with a default.

1. **The four that never had a route** — Balnarring Bakehouse, Mornington Main Street Market, Mount
   Eliza Farmers Market, Rye Beachside Market. *Default: desk research one route each, sourced and
   dated like any other claim.* These are not dead businesses; nobody ever looked.
2. **The nine PI-007 retired** — each has an editor note in `sourceStatusNote` saying what was found.
   Several name a specific next step (Phaedrus Estate has an address from two directories; Red Hill
   Market is entangled with the Hill & Ridge market). *Default: work them through the existing
   PI-007 editor queue rather than opening a second one.*
3. **Kooyong's website** — *default: leave it.* It resolves, the operator chose the redirect, and it
   is not a reader safety issue. Repoint it if and when someone is in the record anyway.
4. **A minimum-contact expectation.** There is no rule that a published venue must carry one
   contact route, which is why four records could be written without one. *Default: do not add a
   build gate now.* A gate would fail on thirteen records that are correct about the world — the
   businesses exist, we simply have no route — and a gate that is red on arrival gets skipped.
   Revisit once the thirteen are worked down.

## The tool

`next/scripts/audit-venue-reachability.mjs`, run as `npm run audit:venue-reachability`.

**Not wired into the build.** It reports, exits 0 whatever it finds, and has no `--assert` mode and
no baseline. It is an inventory of a state of the world, and the world is allowed to be in a bad
state without turning the build red.

**Nothing time-driven.** The script never constructs a `Date`; a test asserts that from its source.
Every figure is a property of the files on disk, so the same tree gives the same numbers on any
machine on any day, and a remote server having a bad night changes nothing until a human runs
`--probe` and commits the result.

25 tests in `next/scripts/audit-venue-reachability.test.mjs`, wired into the Content Gate. None of
them pins a corpus count: an editor adding a phone number to Balnarring Bakehouse changes the answer
and must not break the suite. They assert the rules instead — that `blocked` is never scored broken,
that `moved` is scored misdirected rather than reachable, that a phone beside a dead website means
not-unreachable, that a for-sale title is caught through the ledger's HTML entities even when the
status code is 200, and that a www-to-apex redirect is not reported as leaving the domain.

The decisive one runs the whole CLI over the real corpus and hashes every file under
`src/content` before and after, asserting byte-identity — and checks the run actually produced its
output first, because a suite that only proved nothing happened would pass against a broken tool as
happily as against a correct one. An inventory that quietly corrected something would be the worst
outcome available here.
