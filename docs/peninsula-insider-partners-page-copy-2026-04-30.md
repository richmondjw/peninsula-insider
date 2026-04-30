# /partners/ — Web page copy

**Status:** Draft for the rebuilt public partners landing page.
**Source for:** `next/src/pages/partners/index.astro` (new) plus revised `next/src/pages/partners/apply.astro`.
**Date:** 30 April 2026

This document holds the copy for two surfaces:

1. **`/partners/`** — the public landing page. Replaces the current page that simply links to the apply form.
2. **`/partners/apply`** — the existing form, with revised intro copy and a split between editorial submission and commercial enquiry.

---

## /partners/ landing page

### Hero

**Eyebrow:** Peninsula Insider
**Headline:** Partner with us
**Sub:** A modern newsroom for the Mornington Peninsula. We work with Peninsula businesses we admire. Local writing. Original photography. Disclosed by default.

### Section 1 — How it works

Three short paragraphs.

> **We are a modern newsroom for the Peninsula.**
>
> Local first. Editor-led. Published every Thursday. Every claim verified. Every commercial relationship disclosed.
>
> Peninsula Insider takes commercial partnerships, and we are open about that. The publication is funded in part by the businesses who appear on it. What we do not do is let those businesses influence the editorial. Three rules hold the line: we work only with Peninsula businesses, the editor signs off everything that runs, and every paid item is clearly labelled. Once a year we publish a firewall audit naming what we ran, what we declined, and where the line strained.
>
> If your venue belongs on Peninsula Insider, we would like to talk.

### Section 2 — Three ways to work with us

Three cards, equal weight.

**Card 1 — Founders' Circle**
*Eyebrow:* By invitation
*Title:* Founders' Circle
*Body:* Six founding partners. Two-year commitment. The most ambitious editorial relationship we offer. Hero feature, photography across two seasons, short film, year-round placement, named seat in the masthead.
*CTA:* Request the prospectus

**Card 2 — Charter Story**
*Eyebrow:* Premium editorial
*Title:* Charter Story
*Body:* A 1,200-word feature, written by our desk, photographed, fact-checked, edited, and published to PI standard. Twelve commissions across 2026.
*CTA:* See pricing and apply

**Card 3 — Placement and listings**
*Eyebrow:* Always-on
*Title:* Placement and listings
*Body:* Hub sponsor, newsletter sponsor, sidebar showcase, sponsored listing. Simple inventory, transparent pricing, monthly or quarterly commitments.
*CTA:* See pricing and apply

### Section 3 — The standards we hold

A short list, presented as a card.

> **Curated commercial.** Only Peninsula businesses appear on PI. No programmatic, no off-region brands.
>
> **Editor-led.** James and Emma sign the editorial. They pick the cover. They never appear at advertiser-only events.
>
> **Disclosed by default.** Every paid item carries a Partner Content eyebrow. Every Founders' Circle partner is publicly listed.
>
> **Annual audit.** Once a year, we publish what we ran, what we declined, and where the line strained.
>
> **No fake bylines.** Every PI piece carries a real name or our house byline. We do not invent writers.

### Section 4 — Coming in 2026

Two cards, lighter weight.

**The Peninsula 50.** An annual ranked authority list, launching November 2026. Fifty venues across food, wine, stay, and experience that define the Peninsula in the year of publication. One Founding Sponsor per category. Express interest from the form below.

**The Insider Conversation.** A single-evening editor-hosted dinner with eight to ten named guests, written up as a feature with venue credit. Express interest from the form below.

### Section 5 — Download the kit

A single card with a CTA.

> **Peninsula Insider Partnership & Advertising Kit (PDF, 1.2MB)**
>
> Full menu, pricing, production cycle, and standards. Updated quarterly.
>
> *CTA:* Download the kit

### Section 6 — Get in touch

A single short paragraph above the apply form.

> Every partnership begins with a conversation. Tell us about your venue and what you would like to do, and we will be in touch within 48 hours. James and Emma read every enquiry personally.

Then the form.

### Footer block

> Peninsula Insider is a modern newsroom for the Mornington Peninsula. We publish on Thursdays, we mean what we recommend, and we tell you who is paying.
>
> James and Emma Richmond, Founders & Editors

---

## /partners/apply — revised intro

The current apply page has a single intake. We split it into two clear paths so the form can route correctly without losing the editorial-firewall language that is currently doing good work on this surface.

### Hero

Unchanged structure.

**Eyebrow:** Peninsula Insider
**Headline:** Tell us about your venue
**Sub:** Two ways to get in touch. Editorial submission for venues we should be writing about. Commercial enquiry for partnerships and placement.

### Two-card chooser, above the form

**Card A — Editorial submission**
*Title:* "Tell us about your venue"
*Body:* "If you run a Peninsula business and you think we should be writing about it, this is the path. No charge, no guarantee of coverage. Every submission is reviewed by the editorial team. If your venue fits the PI editorial brief, we will arrange a visit. If it does not, we will tell you."

**Card B — Commercial enquiry**
*Title:* "Partner with us"
*Body:* "If you are interested in a Charter Story, a placement, a listing, or the Founders' Circle, this is the path. We respond within 48 hours. James or Emma takes every commercial conversation personally."

The form itself stays. We add a single radio at the top: "What kind of enquiry is this?" with options *Editorial submission* and *Commercial enquiry*. The downstream routing handles each separately. Editorial submissions go to the editorial inbox; commercial enquiries go to James and Emma directly.

### Form footer text — revised

Replace the current "How this works" aside with:

> **How this works**
>
> Editorial submissions are reviewed by our editorial team. We do not accept every venue, and we do not guarantee coverage. If your venue fits the PI editorial brief, we will arrange a visit.
>
> Commercial enquiries are read by James and Emma personally. We respond within 48 hours.
>
> Either way, every submission lands with us. Nothing is automated. Nothing is filtered out. Nothing is ignored.

---

## Implementation notes for Pixel

**Routing.** `/partners/` is a new index page. `/partners/apply` stays at its current URL with the revised copy. The Founders' Prospectus is **not** linked from the public site; it is request-only. Add a hidden landing page at `/partners/founders/` that the prospectus PDF can link to, but do not place it in the nav.

**PDF assets.** The advertising kit is a 12-page PDF generated from `peninsula-insider-advertising-kit-2026-04-30.md`. The Founders' Prospectus is a separate 8-page PDF generated from `peninsula-insider-founders-prospectus-2026-04-30.md`. The Founders' Prospectus PDF is stored privately and emailed manually after a request, never auto-served.

**Form change.** The apply page form needs the new `enquiry_type` radio at the top, with the two values routing to different inboxes. The PI Concierge API endpoint (`POST /vendors/apply`) needs a corresponding update.

**Masthead update.** The about page masthead is updated to read:

> Founders, Editors & Publishers: James Richmond and Emma Richmond
> Editorial desk: The Peninsula Insider
> Photography: [contracted name]
> Contributors: [as named]

**Newsletter footer.** Once the Founders' Circle is signed, the newsletter footer adds a "Founding Partners" line listing the cohort, in plain text, no logos. Update copy lives in the newsletter config.
