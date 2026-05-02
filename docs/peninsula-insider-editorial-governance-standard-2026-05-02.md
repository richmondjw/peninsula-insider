# Peninsula Insider — Editorial Governance Standard
**Version:** 1.0
**Date:** 2 May 2026
**Owner:** James Richmond / Emma Richmond
**Applies to:** All editorial content featuring Peninsula businesses, venues, or individuals

---

## The governing rule

> **"If a business is featured, all facts are verified, images are owned or approved, and any commercial relationship is disclosed."**

This rule applies to every piece of content published on Peninsula Insider, regardless of format, length, or whether the feature is paid or editorial.

---

## 1. Accuracy standard

### What this means in practice
- Business name, address, and contact details are verified before publish
- Opening hours, pricing, and offerings reflect current reality — not assumptions or old data
- Any claim about quality, awards, or recognition is sourced (Halliday score, hat rating, media citation)
- Seasonal information is flagged with a last-verified date

### The rule
No factual claim about a business may be published without a primary source, a confidence rating, and a last-verified date in the article frontmatter.

```yaml
lastVerified: YYYY-MM-DD
```

### What to do when facts cannot be verified
- Use hedged language: "as of our last visit" / "at time of writing"
- Flag with `status: needs-verification` in frontmatter
- Do not publish until core facts (name, location, offering) are confirmed

### What happens when a business reports an error
- Correct factual errors within 24 hours of being notified
- Log the correction in `docs/site-changelog.md`
- Do not add a visible correction notice unless the error was materially misleading

---

## 2. Image standard

### The hierarchy (use in this order)
1. **Original PI photography** — taken by or commissioned by Peninsula Insider
2. **Venue-approved media kit** — images provided by the venue with explicit permission for editorial use
3. **Wikimedia Commons / CC-licensed** — with correct attribution and licence record
4. **Unsplash / free-use stock** — only if Peninsula-specific and contextually accurate

### What is never acceptable
- Screenshots of venue social media posts
- Images downloaded from venue websites without permission
- Google Maps / Street View images
- Any image where the licence or origin is unknown

### How to record image rights
Every hero image must include a `credit` and `license` field in frontmatter:

```yaml
heroImage:
  src: "/images/sourced/article-[slug]-01.webp"
  alt: "Descriptive alt text"
  credit: "Source name or photographer"
  license: "cc-by-3.0 | wikimedia-cc-by | pi-original | venue-approved | tmp-placeholder"
```

Any image with `license: "tmp-placeholder"` must be resolved before the article moves to `status: published`.

---

## 3. Editorial tone standard

### What is allowed
- Honest, specific, opinionated editorial assessment
- Negative observations if factually supported ("the service was slow on our visit" — if true)
- Comparative assessments ("stronger than most on the ridge")

### What is not allowed
- False statements of fact presented as editorial
- Statements that could constitute defamation (false, specific, damaging claims)
- Exaggerated claims that mislead ("the best in Australia" without a basis)
- Invented quotes or attributions

### The test
> "Would I be comfortable if the business owner read this piece and rang me to discuss it?"
>
> If yes: publish. If no: revise or escalate to editorial review.

---

## 4. Disclosure standard

### Commercial content
Every article or listing that involves a commercial relationship must carry the `Partner Content` eyebrow label. No exceptions.

```yaml
partnerContent: true
```

### Editorial content with a commercial relationship
If a venue is also a paying partner, any separately commissioned editorial piece about that venue must carry a disclosure note:

> *This venue is a Peninsula Insider commercial partner. This editorial piece was written independently.*

### Invited content
If a venue invited Peninsula Insider to visit (complimentary meal, hosted visit, media access), this must be disclosed:

> *Peninsula Insider visited as a guest of [Venue].*

### No disclosure required
Purely independent editorial coverage — no payment, no invitation, no commercial relationship — requires no disclosure beyond our standard editorial voice.

---

## 5. Removal and correction requests

### If a business asks to be removed
- Evaluate: is the content factually accurate and fairly presented?
- If yes: we are not obligated to remove it. Respond: *"Peninsula Insider independently curates venues we believe are worth knowing. We are happy to review any factual inaccuracies."*
- If errors exist: correct them within 24 hours, notify the business.
- Escalate commercial sensitivity (e.g., active dispute, legal threat) to James.

### If a business disputes a claim
- Log the dispute in `docs/site-changelog.md` with date and nature of complaint
- Investigate within 48 hours
- If the claim is inaccurate: correct and notify
- If the claim is accurate and fair: respond professionally, maintain the content

### The standard response to "Why are we on your site?"
> *"Peninsula Insider independently curates and features venues we believe are worth knowing to our readers. Where any content is paid or commercially arranged, it is clearly disclosed. If you'd like to discuss your listing or flag any inaccuracies, we're happy to talk."*

---

## 6. Pre-publish governance checklist

This checklist must be completed for every article before `status` is changed from `draft` or `needs-verification` to `published`.

### Accuracy gate
- [ ] Business name, location, and core offering verified against a primary source
- [ ] Opening hours and pricing checked (or appropriately hedged)
- [ ] Any award, rating, or recognition claim sourced
- [ ] `lastVerified` date set in frontmatter

### Image gate
- [ ] Every image has a confirmed `credit` and `license` in frontmatter
- [ ] No `tmp-placeholder` licenses remaining
- [ ] No social media screenshots or unattributed images

### Tone gate
- [ ] No false statements of fact
- [ ] No defamatory or exaggerated claims
- [ ] "Comfortable if the owner rang me" test passed

### Disclosure gate
- [ ] Commercial relationship disclosed where applicable (`partnerContent: true`)
- [ ] Hosted visit disclosed where applicable
- [ ] No implied endorsement beyond what is true and evidenced

### Final
- [ ] Article reviewed by a second editor (or Remy acting as copy gate) before publish
- [ ] `status: published` only set after all above are checked

---

## 7. Integration with the automated pipeline

### Daily accuracy scan
The `pi-daily-accuracy-scan` cron job should check for:
- Articles with `status: published` but no `lastVerified` date
- Articles with `lastVerified` dates older than 90 days (flag for refresh)
- Articles with `license: "tmp-placeholder"` on any image

### Weekly QA
The Friday Performance Council cron should surface:
- Any articles published in the past week that did not pass all checklist gates
- Any outstanding removal or correction requests

### Escalation
Any legal threat, formal complaint, or media dispute escalates immediately to James. Remy does not respond to legal threats independently.

---

## 8. What this protects

| Risk | Protection |
|---|---|
| Defamation claim | Tone gate + accuracy gate |
| Copyright infringement | Image gate |
| Misleading information claim | Accuracy gate + hedging rules |
| Undisclosed commercial relationship | Disclosure gate |
| Outdated information complaints | `lastVerified` + 90-day refresh flag |
| Removal dispute | Documented process + standard response |

---

## 9. Version history

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-02 | Initial standard. Drafted from Emma Richmond governance framework. |
