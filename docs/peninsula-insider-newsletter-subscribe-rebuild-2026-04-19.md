# Peninsula Insider — Newsletter Subscribe Rebuild

**Prepared for:** James Richmond  
**Prepared by:** Remy  
**Date:** 19 April 2026  
**Status:** Implementation brief  
**Purpose:** Replace the raw Beehiiv embed experience with a first-party Peninsula Insider subscribe form, backed by a webhook/API path, with elegant success and error handling.

---

## 1. Problem Statement

The current newsletter signup experience has degraded because the site is relying on the raw Beehiiv embed.

That causes several problems:
- the form looks foreign inside the Peninsula Insider design system
- iframe sizing creates white dead space and broken-looking slabs
- the key footer conversion surface feels ugly rather than premium
- the user experience is controlled by Beehiiv's embedded UI rather than Peninsula Insider's brand

This is not a styling bug alone. It is a product architecture issue.

---

## 2. Target Experience

Peninsula Insider should use a **first-party front-end subscribe form** with a local success experience and Beehiiv only as the backend destination.

The user should experience:
- a beautiful Peninsula Insider input field and button
- light animation and loading state
- elegant success message on page
- no visible third-party embed UI

Beehiiv should be treated as:
- the mailing list backend
- not the on-site UI

---

## 3. Proposed Architecture

### Front-end
A native form component rendered on:
- the footer newsletter block
- the dedicated `/newsletter/` page

Component responsibilities:
- email validation
- loading state
- success state
- error state
- optional subtle animation

### Backend
A subscribe endpoint external to the static front-end.

Because the current Astro build is `output: static`, Peninsula Insider cannot currently host a live server API route directly within the site build.

So the subscription submit target should be one of:
1. **Supabase Edge Function** (recommended)
2. **Cloudflare Worker**
3. **tiny backend service**
4. future SSR/API route after platform evolution

### Flow
1. user enters email in Peninsula Insider form
2. front-end POSTs to external subscribe endpoint
3. endpoint validates + forwards to Beehiiv
4. endpoint returns JSON success/error response
5. front-end shows a polished success state

---

## 4. Recommended Backend: Supabase Edge Function

### Why this is the best fit
- already aligned with existing Mission Control / Supabase infrastructure
- easy secrets handling
- small surface area
- no need to re-architect the site immediately
- keeps the site static while still allowing real form handling

### Proposed endpoint
`POST /functions/v1/pi-newsletter-subscribe`

### Expected request body
```json
{
  "email": "user@example.com",
  "source": "footer" | "newsletter-page",
  "list": "insiders-dispatch"
}
```

### Endpoint responsibilities
- validate email
- optionally normalize to lowercase
- optionally capture source surface
- send to Beehiiv subscribe API or webhook
- return clear JSON response

### Success response
```json
{
  "ok": true,
  "message": "You're in. Wednesday's dispatch is on its way."
}
```

### Error response
```json
{
  "ok": false,
  "message": "We couldn't subscribe you right now. Please try again in a moment."
}
```

---

## 5. Front-End Component Requirements

### Shared subscribe component
Create a reusable Peninsula Insider component for the form.

Suggested responsibilities:
- email field
- submit button
- loading state
- success state
- error state
- small success animation or reveal

### Surfaces
#### Footer block
- compact
- premium
- elegant
- dark-mode compatible
- conversion-first

#### Newsletter page
- roomier
- more editorial framing
- still uses same underlying submit system

### Copy direction
#### Button states
- Subscribe
- Joining…
- You're in

#### Success line options
- You're in. Wednesday's dispatch is on its way.
- Beautiful. We'll see you in Wednesday's dispatch.
- You're on the list. The Peninsula just got closer.

Tone should feel:
- warm
- elegant
- editorial
- not startup-SaaS-y

---

## 6. Design Direction

The form should feel like part of Peninsula Insider's luxury/editorial identity.

### Visual principles
- restrained
- high-contrast but soft
- premium gold accent acceptable
- minimal chrome
- subtle motion only
- no boxed widget feeling

### Avoid
- raw third-party embed look
- bulky white slab
- giant empty form area
- generic bootstrap form feel
- bright CTA spam energy

---

## 7. Implementation Sequence

### Phase 1 — Emergency visual cleanup
- remove raw Beehiiv embed from footer block
- replace with cleaner interim CTA or local shell
- stop the site looking broken

### Phase 2 — First-party form UI
- create Peninsula Insider front-end form component
- use local loading/success/error states
- implement on footer and newsletter page

### Phase 3 — Webhook/API integration
- create external subscribe endpoint (recommended: Supabase Edge Function)
- forward to Beehiiv
- return JSON states to front end

### Phase 4 — Polish
- success animation
- microcopy polish
- optional analytics tagging
- optional event tracking for conversions

---

## 8. SEO / UX Considerations

This change is not directly about ranking, but it matters to:
- conversion rate
- perceived quality
- trust
- list growth
- reducing friction on a key owned-audience surface

The newsletter experience should reinforce:
- Peninsula Insider's editorial seriousness
- not undermine it with ugly third-party UI

---

## 9. Recommended Immediate Build Tasks

### Front-end
- create reusable subscribe form component
- replace footer CTA/iframe logic
- replace newsletter page iframe blocks
- support inline success/error states

### Backend
- create Supabase Edge Function for newsletter subscribe
- store Beehiiv API credentials as secrets
- define JSON contract for success/error responses

### Integration
- wire footer and newsletter page to new endpoint
- test mobile and desktop states
- verify Beehiiv list receipt

---

## 10. Final Recommendation

Peninsula Insider should stop using the raw Beehiiv embed as the primary visible subscribe UI.

Instead, it should use:
- a Peninsula Insider-designed front-end form
- a webhook/API bridge to Beehiiv
- a beautiful inline success state

That restores the sweeter, more premium experience James remembers and gives the site long-term control over one of its most important conversion surfaces.
