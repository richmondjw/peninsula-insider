# Routine event publication authority

James authorised removal of per-event publication approval on 1 November 2026 at
10:13:33 UTC (message `Sentinel_d25f9be50a808191af4932dd34f3ee8f`).
The recorded authority applies only to verified routine PI website event listings
and updates. It does not approve the research backlog, social posts, sponsorship,
features, new source admission, or repository/release permission changes.

`routine-publisher.mjs` consumes a complete private packet and checks every candidate
against the unchanged factual/geographic verifier, with a shorter 24-hour evidence
window. Explicit source-review holds, cancellation, expiry, unresolved conflicts,
missing facts and Shire evidence still block. Existing factual proof attribution
is preserved; the publisher never marks facts as verified by James or by itself.
It removes only the separate requirement for James's approval of each listing.

Candidates must have an original summary and category and qualify for a standard
listing. Sponsored and enhanced/feature content are held. Duplicate source ranges
and duplicate title/venue/occurrence identities are held across the packet and
public catalogue. The publisher does not merge conflicting dates. A text-only
detail is used; no source photograph or organiser logo is copied. Existing manual
listings, edited records and image-bearing records are protected. Updates to an
intact record previously created under this authority use exact prior-byte hashes
and retain the existing private rollback receipts and lock discipline.

## Preparation and activation

The collector remains read-only with respect to public content. Do not change its
read-only catalogue mount. Use a separate authorised writer stage after a complete
collection cycle, with a stable complete packet snapshot, an isolated content
checkout and private history outside public content:

```
node ops/event-intelligence/routine-publisher.mjs <private-packet.json> <checkout/next/src/content/events> <private-history>
node ops/event-intelligence/routine-publisher.mjs <private-packet.json> <checkout/next/src/content/events> <private-history> --apply
```

The first command is dry-run; the second promotes qualifying records locally.
Both report holds without approving them. Receipts identify the publisher and
James's standing authority separately from factual verification. Reader-facing
automated receipts expire after 24 hours unless freshly verified and repromoted.
This also applies to plans/saves through the existing common public-content gate.

These commands do not commit, push, approve PRs or deploy. Activation requires:

1. Release this change through existing protected tests and a reviewed PR; do not
   bypass the current event-journey failures or change branch protections.
2. Configure the separate writer stage to run after successful collection using
   a consistent private snapshot. Do not feed an actively mutating packet.
3. Run dry-run, inspect holds and exercise qualifying synthetic content in an
   isolated checkout. No bulk approval or edits to the live packet are needed.
4. Wire writer output into the existing protected release path. Keep PR approval
   subject to action-time confirmation; standing event authority does not waive
   this repository approval boundary. Use existing authorised release mechanisms,
   without adding credentials or granting persistent access.
5. Verify completed deployment receipts and public event/feed/detail outcomes.
   Local promotion or passing tests alone is not activation or public publication.

No production writer schedule, service replacement or release is installed by this
patch. The pending research backlog remains unverified and is expected to be held.
