---
name: insider-note-email
description: Build a weekly Peninsula Insider "The Insider Note" newsletter email from supplied editorial content. Use whenever an issue of The Insider Note is being produced, updated, or QA'd. Produces one send-ready HTML file for Beehiiv import.
---

# Skill: Build an issue of The Insider Note

You are producing an issue of an existing, fixed email design. **You are not designing.**
The layout, palette, type scale, module order and ornament vocabulary are locked in
`docs/insider-note-design-spec.md`. Your job is to place this week's content into that
system correctly and prove it renders.

## Inputs you need before starting

Ask for anything missing — do not invent it:

- Issue number (arabic, for UTM) and its roman numeral.
- Send date and the day range covered (e.g. Thu 6 – Tue 11 August).
- The five days in the range and which one is the **anchor day** (the day of THE ONE).
- THE ONE: event name, day, place, 3-sentence body, listing URL → `{{LEAD_URL}}`.
- Two "Before Sunday" items: day, place, headline, 2-sentence body, URL → `{{C1_URL}}`, `{{C2_URL}}`.
- Editorial item: when, headline, body, URL → `{{ED_URL}}` (may be omitted in a quiet week).

**Every one of those four URLs is mandatory and must be verified live before you fill it.**
Issue VII went out with a hard-coded editorial URL that had never existed, to 17 subscribers.
`curl -s -o /dev/null -w "%{http_code}" <url>` each one; anything that is not 200 does not go in
the email. Append `?utm_source=newsletter&utm_medium=email&utm_campaign=insider-note-<NN>` to
each, with `&amp;` entities inside `href` attributes.
- Up to three "Also on the calendar" lines: when, place, title.
- Poll question and options.
- Five hosted image URLs on `https://peninsulainsider.com.au/images/email/`, with alt text,
  at the ratios in spec §5.
- Subject line and preheader.

## Procedure

1. **Read** `docs/insider-note-design-spec.md` in full, then open
   `reference/insider-note-2026-08-05-v3.html` as the reference render.
2. **Copy** `templates/insider-note-template.html` to
   `insider-note-<YYYY-MM-DD>.html`. Never edit the template itself.
3. **Fill tokens only.** Replace every `{{TOKEN}}` with supplied content. Do not touch
   markup, widths, colours, font sizes, padding, or module order. Leave `{{unsubscribe_url}}`
   and `{{web_url}}` literal — they are Beehiiv merge tags.
4. **Copy discipline.** Supplied editorial copy goes in verbatim. If a headline overflows
   (see step 6), ask the editor for a shorter line rather than rewriting it yourself.
   Escape `&`, `’`, `–`, `·` as entities as the template already does.
5. **Omissions.** If a module has no content this week, delete the whole `<tr>` block for it
   (comment-marked in the file). Never leave an empty panel and never reorder what remains.
   Keep it to one gold block and one filled button per issue.
6. **Render and measure.** Open the file and check at 600px and at 375px:
   - card image and text edges align (240 / 32 gap / 240 must sum to the panel's inner width);
   - the THE ONE gold tab hugs its label and the hairline fills the rest;
   - the button label and "The Insider" each sit on one line;
   - no headline wraps to a lonely single word;
   - the day spine reads as five even cells with the anchor day highlighted.
7. **Run the QA checklist** in spec §7 top to bottom. Grep for `{{` and confirm only the two
   merge tags remain. Confirm the file is under 100KB.
8. **Hand over** with: the file path, subject + preheader, the image list with alt text, and
   any spec deviation you had to make (there should be none).

## Hard rules

- Tables and inlined styles only. No JavaScript, no external CSS beyond the Google Fonts
  link, no flex/grid/float/position, no rounded corners, no shadows, no gradients, no emoji,
  no icon sets, no third typeface, no colour outside the token table.
- Every structural cell keeps its `width` attribute *and* inline `width`;
  every text cell keeps `mso-line-height-rule:exactly`.
- Body copy never below 14.5px; eyebrows never below 9px.
- The email must read completely with images blocked.
- Any change to the design itself — a new module, colour, ornament, or type size — is a spec
  revision requiring a human editor's sign-off. Propose it, don't ship it.

## Files

All paths are relative to `ops/email/insider-note/` in the peninsula-insider repo.

| File | Role |
| --- | --- |
| `docs/insider-note-design-spec.md` | The spec. Authority for every design decision. |
| `templates/insider-note-template.html` | Tokenised master. Copy, never edit. |
| `reference/insider-note-2026-08-05-v3.html` | Reference build, Issue VII. |
| `../insider-note-<date>.html` | Your output, one per issue, in `ops/email/`. |

## Known traps

- **Beehiiv `PATCH` on an existing post returns 403 on this plan.** An issue can be created
  through the API but never edited through it. Title, body and slug are human steps in the
  editor. Set the title before publishing or the archive URL keeps the default slug.
- **Do not pass a `status` filter when listing Beehiiv posts.** It silently returns an empty
  set and will make you report that no posts exist when they do.
- Credentials: `set -a; . /home/node/.openclaw/credentials/beehiiv/env; set +a` exports
  `$BEEHIIV_API_KEY`. Publication `pub_91e9b723-53c4-456e-a857-9faa2d61864b`. Never echo the key.
