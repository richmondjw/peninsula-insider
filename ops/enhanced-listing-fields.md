# Enhanced listing facts

Approved 20 September 2026 as part of the website uplift. This extends the existing venue schema; it does not introduce a portal or payment processing.

Existing fields already cover description, gallery, official website/booking, phone/email, usual opening hours, booking requirement, dogs, seasonal notes, coordinates and related editorial content. `visitorInformation` adds optional accessibility and children notes, indoor/outdoor setting, menu URL, labelled social profiles and a rights-confirmed video link. Video opens the official destination rather than loading a tracking embed.

The block requires a source URL, submitting business identity, editorial reviewer, check date and approval status. Store personal contact details only in the private intake queue, never in this public content record. Unknown facts remain absent. Pending, rejected, invalid-date or future-dated blocks do not render. Do not substitute the build date for a check.

Use the existing content-authoring/editor review workflow to publish factual changes. Anonymous listing updates only insert requests into `venue_change_requests`; the new schema adds no endpoint, grants or direct operator write path to content. Never map that request's untrusted text onto editorial fields. The strict block rejects Picks, verdict, tier, rank and paid-partner keys; the rendering helper explicitly selects only approved factual fields. Existing commercial-firewall checks remain enforced. Backend source permissions must still be verified independently; these schema tests do not prove deployed RLS.

Existing gallery images render only when rights are recorded and provenance is verified, with credit and any illustrative disclosure. Asset review records must establish permission and intended use before setting these states. No existing image is automatically approved by this change.

Rollback is removing the optional block/gallery item or returning the block to pending. This does not change the editorial verdict, ordering or recommendation. Free factual corrections remain independent of the USD99 enhanced-page offer.
