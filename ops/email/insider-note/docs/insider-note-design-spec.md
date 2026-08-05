# The Insider Note — Email Design Spec v1.1

Canonical reference build: `reference/insider-note-2026-08-05-v3.html` (Issue VII, 6–11 August 2026).
Fillable master: `templates/insider-note-template.html`.
Agent procedure: `docs/SKILL-insider-note.md`.

## Changelog

**v1.1 — 2026-08-05.** Three corrections, all forced by Issue VII going out with a broken link.

1. **Every per-issue URL is now a token.** The v1 template carried Issue VII's own event
   URLs hard-coded in the markup while instructing the agent to fill tokens only and never
   touch markup. Following the procedure exactly would have shipped Issue VIII pointing at
   Issue VII's events. Added `{{LEAD_URL}}`, `{{C1_URL}}`, `{{C2_URL}}`, `{{ED_URL}}`.
   Site-section destinations (`/whats-on/`, `/whats-on/this-weekend/`, `/journal/`) stay
   hard-coded because they are stable and carry no per-issue meaning.
2. **Removed a dead link from the master.** The editorial CTA pointed at
   `/journal/rainy-day-mornington-peninsula/`, which has never existed. It shipped in Issue VII
   to 17 inboxes. A redirect now covers those clicks, but the slot is a token from here.
3. **Two filled buttons are permitted**, not one — see §3. Issue VII shipped with a gold
   THE ONE button and a navy calendar button, and it held up. The constraint that matters is
   one *gold* element, not one button.

This document is the spec every future issue is designed to. If a request conflicts with
the spec, the spec wins unless a human editor overrides it in writing.

---

## 1. Concept

The Note is a **weekly dispatch, not a digest**. One good move a day, Thursday to Tuesday.
The design expresses that in three ways:

1. **Navy is the page.** The whole email sits on Harbour Navy `#0B2E4A`. Cream and white
   panels are *set into* that navy with a 14px inset on both sides, so each module reads as
   a card laid on a dark board. This is the signature that separates the email from the
   website (where light is the default) while using the identical palette.
2. **The week has a spine.** A five-cell day strip under the nameplate (`THU 06 … TUE 11`)
   states the range of the issue and highlights the anchor day. It is the visual promise of
   "one good move a day".
3. **One thing is the biggest thing.** Exactly one item per issue is `THE ONE` — the largest
   type, the only filled button, the only gold tab. Everything else is subordinate.

Tone of design: editorial, coastal, unhurried. No gradients, no rounded corners, no shadows,
no emoji, no icon sets. Colour and type do all the work.

---

## 2. Tokens

Mirrors `next/src/styles/v6-tokens.css`. Never introduce a colour outside this list.

| Role | Hex | Use |
| --- | --- | --- |
| Harbour Navy | `#0B2E4A` | Email shell, lead panel, sign-off |
| Deep Navy | `#07223A` | Day spine, footer |
| Spine Highlight | `#0F3A5C` | Anchor-day cell in the spine |
| Navy Hairline | `#2E4A63` / `#3E5A72` / `#24455F` | Rules on navy (masthead / section / rail rows) |
| Ink | `#14202A` | Headlines and body on light panels, type on gold |
| Body Grey | `#3A4750` / `#4B5862` | Editorial body / card body |
| Cream Page | `#F2EFEA` | Standfirst and "Before Sunday" panels |
| White Page | `#FFFFFF` | Editorial panel only |
| Outer Paper | `#E7E2DA` | Client background behind the 600px shell |
| Gold | `#F5C177` | Top edge, THE ONE tab, button, poll block, footer links |
| Gold Shadow | `#C08F45` | 3px bottom edge under the gold button |
| Gold Muted | `#C9A26B` | Big day numerals on cream |
| Gold Border | `#6B5A3E` | Issue-box border on navy |
| Bronze | `#8A5620` | Eyebrows and 3px rules on light panels |
| Bronze Deep | `#7A5320` / `#6B5222` | Eyebrow / body inside the gold poll block |
| Blue Link | `#10527E` | Links on light panels |
| Sky | `#7FB2D4` | "Insider" wordmark, rail day labels, link underlines |
| Sky Muted | `#9FC3DC` / `#7A9CB6` / `#D7E2EA` | Footer text / spine labels / body on navy |
| Light Hairline | `#D3D5CF` / `#E4E1DB` | Rules on cream |

**Type.** Sora (display: 300/500/600/700/800) and Figtree (body + eyebrows: 400/600/700).
Both loaded from Google Fonts; every element also carries the fallback stack
`'Helvetica Neue',Helvetica,Arial,sans-serif`, and an MSO conditional forces Arial in Outlook.
No third face, ever.

**Scale (desktop → mobile via media query).**

| Element | Desktop | Mobile | Weight / tracking |
| --- | --- | --- | --- |
| Nameplate | 46px / 0.94 | 36px / 0.96 | 800, −0.045em ("Insider" 300) |
| THE ONE headline | 44px / 1.0 | 32px / 1.04 | 800, −0.04em |
| Editorial headline | 32px / 1.06 | 26px / 1.1 | 800, −0.04em |
| Poll question | 27px | 24px | 800, −0.035em |
| Standfirst | 23px / 1.36 | 20px / 1.34 | 500, −0.015em |
| Card headline | 23px / 1.12 | 22px | 700, −0.03em |
| Card day numeral | 40px | 38px | 800, −0.05em |
| Rail title | 17px / 1.28 | 16px | 600, −0.025em |
| Body (lead, editorial) | 16.5px / 1.64 | same | 400 |
| Body (cards) | 14.5px / 1.58 | same | 400 |
| Eyebrow | 10–11px | 9–10px | 600/700, 0.14–0.22em, uppercase |
| Spine numeral | 18px | 15px | 600 (800 on anchor day) |

Never set body copy below 14.5px or eyebrows below 9px.

**Spacing.** Shell 600px. Panel inset 14px each side (10px mobile). Text padding inside
navy 30px (20px mobile), inside panels 30px (18px mobile). Vertical rhythm between modules
26–36px. Card grid inside the cream panel: `240 + 32 gap + 240 = 512` — these three numbers
must always sum to the panel's inner width, or images and text fall out of register.

**Ornament vocabulary** (the only decorative devices permitted):
6px gold top edge · 3px bronze rule above light-panel eyebrows · 4px bronze cap on the
editorial panel · 3px gold vertical bar left of the lead event name · 1px hairlines with a
nowrap label at section heads · 2px gold underline under the sign-off · 2px sky underline on
inline links · framed ISSUE box.

---

## 3. Module order (fixed)

1. **Gold edge** — 6px.
2. **Nameplate** — stacked "Peninsula / Insider", framed `ISSUE / <roman>` box right.
3. **Dateline** — hairline, `THE INSIDER NOTE` left, day range right.
4. **Week spine** — 5 equal cells, anchor day on `#0F3A5C` in gold.
5. **Cover band** — full-inset photo, 572×200.
6. **Standfirst** — cream panel: bronze rule, `THE WEEK AHEAD`, 2–3 sentence editorial voice.
7. **THE ONE** — gold tab + hairline, 572×362 photo, day · place eyebrow, 44px headline,
   event name on a gold bar, body, one gold button.
8. **Before Sunday** — cream panel, two day cards (numeral + day/place, headline, body, link).
9. **The editorial** — white panel with bronze cap, headline, 572×318 photo, body, link.
10. **Also on the calendar** — 3 rail rows on navy (when/place left, title right) + calendar link.
11. **One tap** — full gold block, poll question, Beehiiv poll placeholder.
12. **Sign-off** — reply prompt, gold rule, "The Insider".
13. **Footer** — deep navy: wordmark, three nav links, hairline, legal lines, unsubscribe.

Modules may be **omitted** (a quiet week may have no editorial) but never reordered, and
nothing new is invented without a spec revision.

**Gold and buttons (revised v1.1).** Exactly **one gold block** per issue — that is the
constraint that protects the hierarchy. Buttons: at most **two filled**, and they must differ
in weight — the gold THE ONE button is the primary and always comes first; a navy secondary is
permitted in the closing block. Never two gold buttons. Never a filled button inside a cream
or white panel; those modules use inline links only.

Module 11 may be either a **poll** (native Beehiiv block) or a **calendar close** (gold panel,
one line of copy, navy button to `/whats-on/`). Issue VII shipped the calendar close because
the poll placeholder could not be replaced through the API. Both are canonical; pick one, never
both.

---

## 4. Content rules

- **Never rewrite supplied editorial copy.** Formatting only.
- Standfirst: one idea, 2–3 sentences, no listing of the items below it.
- Headlines: sentence case, no colons-as-titles, no questions except the poll.
- Card body: 2 sentences, ~30 words. Lead body: 3 sentences max.
- Eyebrows: `Day N` · `Place`, or `Day range` · `Place`. Bronze on light, gold on navy, sky on rail.
- Link labels: verb + noun + `→` ("See Friday's session →"). Never "Read more" or "Click here".
- Subject ≤42 characters, one proper noun and a day. Preheader 85–110 characters, never a
  restatement of the subject, ending with the `&zwnj;` padding chain already in the template.
- Roman numerals for the issue number, everywhere it appears (title, box, footer).

---

## 5. Imagery

| Slot | Ratio | Rendered | Export |
| --- | --- | --- | --- |
| Cover band | 2.86:1 | 572×200 | 1144×400 |
| THE ONE | 1.58:1 | 572×362 | 1144×724 |
| Editorial | 1.8:1 | 572×318 | 1144×636 |
| Day card | 1.36:1 | 240×176 | 480×352 |

Rules: real photography only (no illustration, no stock composites); JPEG, quality 72–78,
each file under 220KB; hosted at `https://peninsulainsider.com.au/images/email/<slug>.jpg`;
descriptive alt text written as a sentence (it is read aloud and shown when images are
blocked); no text baked into images; `display:block` and `border:0` on every `<img>`; the
email must still read correctly with all images off.

---

## 6. Build constraints (non-negotiable)

- Tables only — `role="presentation" cellpadding="0" cellspacing="0" border="0"`. No flex,
  grid, float, position, or JavaScript.
- Every style inlined on the element. The `<head>` block carries only the media query and
  utility classes; the email must read correctly if it is stripped.
- Explicit `width` attribute **and** `style="width:…px"` on every structural cell.
- `mso-line-height-rule:exactly` beside every `line-height` on text cells.
- Any cell whose sibling should take the remaining width needs `width="100%"`; any label cell
  that must hug its text needs `white-space:nowrap`. Both were live bugs — check them.
- Buttons: padded `<td>` with a background colour and a `display:block` anchor, plus the
  `v:roundrect` MSO fallback (`arcsize="0%"` — the brand has no rounded corners).
- Total HTML under 100KB (Gmail clips above ~102KB). Current build ≈35KB.
- `{{unsubscribe_url}}` and `{{web_url}}` are Beehiiv merge tags — leave them literal.

**Mobile (≤620px).** Single column: `.stack` collapses the card grid, `.gap` becomes 26px of
vertical space, `.stack-img` goes fluid, insets drop to 10px, padding to 18–20px, and the
display sizes step down per the scale table. The spine stays five across at 15px/9px. Tap
targets: the gold button is 50px tall, inline links carry 2px underlines and 14px minimum
type. Verify at 320, 375, 414 and 600px.

---

## 7. QA checklist before send

1. Fill every `{{TOKEN}}`; grep the file for `{{` and confirm only the two Beehiiv merge tags remain.
2. Subject and preheader set in Beehiiv; preheader matches the hidden div.
3. All five images uploaded, `https`, correct pixel dimensions, alt text present.
4. Every link resolves and carries `?utm_source=newsletter&utm_medium=email&utm_campaign=insider-note-<NN>`.
5. Images-off render: read the whole email top to bottom.
6. Litmus/Beehiiv preview: Gmail web + iOS, Apple Mail, Outlook 365 Windows, Outlook mobile.
7. Card image and text edges align (the 240/32/240 rule); THE ONE tab hugs its label; button
   label on one line; "The Insider" on one line.
8. File size under 100KB; no `<script>`; no external CSS beyond the Google Fonts link.
9. Poll block replaced with the real Beehiiv poll, options matching the days in the issue.
10. Issue roman numeral consistent in title, issue box and footer.

---

## 8. Change control

Version this file with the design. Any new module, colour, font, or ornament requires a
spec revision (bump to v2 with a dated changelog entry) and a human editor's sign-off.
Per-issue variation happens in **content and photography only**.
