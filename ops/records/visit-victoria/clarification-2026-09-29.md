# Visit Victoria clarification, 2026-09-29

Recorded by a Claude Code session on James Richmond's instruction, 2026-09-29.

**Status: approved by Visit Victoria.** James reported on 2026-09-29 that Visit
Victoria replied and approved all four points below. The written reply itself has
not yet been filed here. **TODO: save the reply email (PDF or .eml) alongside this
file as `clarification-2026-09-29-reply.*`.** Until it is filed, this record rests on
James's report.

## Questions put to contenthub@visitvictoria.com.au

1. We plan to keep an internal catalogue linking asset IDs to the venue pages they
   depict, with our editorial team (supported by internal software tools, some
   AI-assisted) choosing which approved asset appears on which page. We won't use
   the Works or their metadata to train models. Is this compatible with clause (c)
   of Prohibited uses?
2. Is placing HTML/CSS text over an unaltered image on a web page acceptable? And
   are social tiles with a headline set on the image considered derivatives?
3. Can Works appear in our email newsletter and in organic social posts that we
   later boost to promote Peninsula tourism?
4. Is "Photo: [Creator], courtesy of Visit Victoria" the preferred credit format?

## Answer

Approved (per James, 2026-09-29).

## Reading of Q2 used in the house rules

The approval is read narrowly. CSS text over an unaltered image on a web page is
permitted. For social tiles, **confirm from the reply text** whether a headline set
into the image was approved; until then social tiles must keep type outside the
photograph (for example a text panel beside or below it).

## Not covered by this clarification

- Using a vision model to draft alt text or captions from a Work. Not asked of Visit
  Victoria.
- Model releases for identifiable people. The terms leave these to us.

## Decision recorded 2026-09-29 (James Richmond)

Having been told the vision question was not covered by the clarification, James
directed that alt text for the first batch be drafted by Claude's vision model
("complete the alt text for these, using your image intelligence"), as an editorial
aid under the internal-tools approval in Q1. Scope and safeguards:

- Thumbnails (720px) were read locally by the model to write alt text and shot
  attributes only. No Work was used for training, fine-tuning, generation or editing,
  and none was sent to a generative image or video service.
- Every drafted alt text is marked `altBy: claude-vision-draft` in
  `entity-map.json` and remains open to human correction.
- James also directed that every reviewed candidate be accepted into its entity's
  gallery, with the top-ranked matching Work as hero where the current hero is a
  stand-in, wrong subject or uncleared.
- If Visit Victoria objects, the drafts are replaced by hand-written alt text; the
  placement itself is unaffected.
