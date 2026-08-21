# Field Notes No. VI ("Six Days, Six Places") — revision brief

From James / Peninsula Insider editorial. Dated 2026-08-01. Issue-specific record of what was wrong with the first draft of `weekly-picks-2026-08-03.html` and how it was resolved. The standing process this brief introduced lives in `FIELD-NOTES-PROCESS.md`.

## Blockers, and how each was resolved

- **A1 — Avani/Elgee mixup.** The card's headline said Avani, the body described Elgee Park. Resolved against the source: the hero image and venue record both confirm the pick was Avani Wines (Red Hill). Body copy replaced with the brief's "If Avani" text: "A small family estate in Red Hill, hand-worked and unusually devoted to a single grape," which matches `avani-wines.json`'s editorNote.
- **A2 — Em-dash in the lead.** Replaced "Not a subtle restaurant — it knows exactly what it is." with "Not a subtle restaurant; it knows exactly what it is." Full issue swept; zero em-dashes remain (including hidden preheader and HTML comments).
- **A3 — Hero image.** The overhead vegetable-prep stock shot matched nothing about Mr Vincenzo's. No rights-cleared email image exists for this venue yet, so the lead now uses the typographic treatment (navy panel, verdict line large in the display face) per the brief's own preferred fallback — not a substitute stock photo.
- **A4 — Layout bugs.** Checked the date-range markup directly: `27&nbsp;JUL&nbsp;&ndash;&nbsp;2&nbsp;AUG&nbsp;2026` already has correct spacing both sides of the en dash; the collision was resolved by construction, the "THE LEAD" side-column label that caused it was removed when the lead module was rebuilt as "Today's move."

## Also found and fixed while rebuilding (not in the original blocker list)

- The Doot Doot Doot secondary card used a Cape Schanck coastline photo, unrelated to the venue. Replaced with the venue's own hero image (`venue-italian-dining-01.webp`).
- The hidden preheader text referenced "the Flinders cliff path," a pick that doesn't exist anywhere in this issue. Rewritten to match the three picks actually featured.
- Doot Doot Doot was tagged Culture; venue record confirms `type: restaurant`. Fixed to Eat per brief §B.

## Structural changes applied (brief §B/§C)

- Lead reframed as "Today's move," CTA changed to "Book the corner table →," linking to the venue's actual booking URL (`mrvincenzos.com`, sourced from the venue record).
- Weather strip added: Thu 6 Aug, 14°, low chance of rain, sunset 5:38pm — real data from BOM's Sorrento forecast (issued 4:53pm AEST Mon 3 Aug 2026) and sunrise-sunset.org, for the actual send day per the standing weekly rhythm.
- "Also this week" thumbnails dropped for a clean text list.
- Copy: "New picks land most days" → "every day" language folded into the standing process; the generic "Browse the Journal" CTA module itself was dropped since it isn't part of the fixed 11-module order, replaced by the Poll module.
- Masthead: "Field Notes" is now the nameplate; "Written from inside the region" moved from the sign-off into the masthead as the standing subtitle.

## Open items — need editorial/James before send, not fabricated by design

- **From the replies**: omitted. No usable reader reply has arrived yet. Per the standing rule, never faked or self-quoted — reinstate once editorial has a real one.
- **One booking note**: omitted. No genuinely time-sensitive opening/closing was confirmed.
- **Poll**: built as a static 6-option preview (the six real picks). A true one-tap beehiiv poll is a native block in their editor; swap this markup for the native widget once imported so taps are actually recorded.
- **Rights-cleared email image list**: none has been supplied yet for this issue. The lead uses the typographic fallback as a result; once editorial supplies a cleared list, the Avani and Doot Doot Doot images should also be re-confirmed against it, not just checked for "is this the right venue."
- **Subject/preview pairs (§5)**: not yet drafted; James's call, three pairs due Thu AM per the weekly rhythm.
