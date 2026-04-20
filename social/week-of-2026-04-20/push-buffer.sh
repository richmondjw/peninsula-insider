#!/usr/bin/env bash
# Push Mon-Fri social pack to Buffer API
set -euo pipefail

API_KEY="eNkrBNfVMnnnr6F9cqq8WTVFpDiLw_Jf0gn-okjGf7q"
FB="69e5913b031bfa423c20f7cf"
LI="69e58e43031bfa423c20f0bf"
IG="69e5d3b7031bfa423c21c0d8"

# Build JSON body using jq — @json properly quotes and escapes the text
post() {
  local channel="$1" text="$2" due="$3" service="${4:-}" type="${5:-post}"
  local meta=""
  [[ "$service" == "facebook" ]]  && meta=", metadata: { facebook: { type: $type } }"
  [[ "$service" == "instagram" ]] && meta=", metadata: { instagram: { type: $type } }"
  local body
  body=$(jq -n \
    --arg t "$text" --arg c "$channel" --arg d "$due" --arg m "$meta" \
    '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, dueAt: \"" + $d + "\", mode: customScheduled" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  curl -sS -X POST https://api.buffer.com \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$body"
}

post_with_image() {
  local channel="$1" text="$2" due="$3" imgurl="$4" service="${5:-instagram}" type="${6:-post}"
  local meta=""
  [[ "$service" == "instagram" ]] && meta=", metadata: { instagram: { type: $type } }"
  [[ "$service" == "facebook" ]]  && meta=", metadata: { facebook: { type: $type } }"
  local body
  body=$(jq -n \
    --arg t "$text" --arg c "$channel" --arg d "$due" --arg u "$imgurl" --arg m "$meta" \
    '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, dueAt: \"" + $d + "\", mode: customScheduled, assets: { images: [{ url: \"" + $u + "\" }] }" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  curl -sS -X POST https://api.buffer.com \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$body"
}

label() { printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"; }

# ── MONDAY 20 Apr @ 20:00 AEST ───────────────────────────────────────────────
label "Monday (20 Apr)"

MON_FB="The long weekend is coming into focus, and the Peninsula is one of those places where a good plan matters.

Not because there is nothing to do. Because there is too much, and most roundups do not help you choose well.

This week we are shaping our Peninsula This Weekend guide around the moves actually worth making, the ones to skip, and the backup options if the weather or energy shifts.

If you want the Peninsula weekender's version, not the generic event-list version, keep an eye on Peninsula Insider."

MON_LI="One of the clearest editorial opportunities on the Mornington Peninsula is not more content. It is better curation.

This week Peninsula Insider is building around a simple product idea: a trusted local weekend brief that helps readers decide what is genuinely worth doing, what fits the mood of the weekend, and what to skip.

In a region with constant activity, utility is the differentiator."

MON_IG="A good Peninsula weekend is rarely about doing more. It is about choosing better.

We are working on this week's Peninsula This Weekend edit now, with the picks actually worth your time over the long weekend.

Stay close."

printf 'Facebook... '
post "$FB" "$MON_FB" "2026-04-20T20:00:00+10:00" "facebook" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'LinkedIn... '
post "$LI" "$MON_LI" "2026-04-20T20:00:00+10:00" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'Instagram (with image)... '
post_with_image "$IG" "$MON_IG" "2026-04-20T20:00:00+10:00" \
  "https://peninsulainsider.com.au/social/week-of-2026-04-20/exports-png/ig/pi-social-2026-04-20-mon-week-ahead-ig-4x5-s01-v01.png" \
  "instagram" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

# ── TUESDAY 21 Apr @ 09:00 AEST ──────────────────────────────────────────────
label "Tuesday (21 Apr)"

TUE_FB="If you like the Peninsula best when it feels considered rather than chaotic, our newsletter is where that starts.

We use it to send the best local reads, timely weekend thinking, and the places or experiences worth paying attention to before everyone else catches up.

Join here and stay one step ahead of the usual scramble."

TUE_LI="For local media, the newsletter is not just a distribution channel. It is the trust product.

For Peninsula Insider, that means giving readers timely, useful, specific guidance on where to go, what matters this week, and how to make better choices on the Peninsula.

We are treating subscription growth as a core editorial priority, not a bolt-on."

printf 'Facebook... '
post "$FB" "$TUE_FB" "2026-04-21T09:00:00+10:00" "facebook" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'LinkedIn... '
post "$LI" "$TUE_LI" "2026-04-21T09:00:00+10:00" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

# ── WEDNESDAY 22 Apr @ 09:00 AEST ────────────────────────────────────────────
label "Wednesday (22 Apr)"

WED_FB="We are expanding Peninsula Insider into some of the decisions people actually need help making here, not just the ones that look good in search.

That means stronger coverage around:
- weddings
- corporate events
- walks

Not generic directories. Useful guides with a Peninsula point of view, honest tradeoffs, and local context that helps people choose properly."

WED_LI="We are building the next Peninsula Insider verticals around high-intent local decisions, not just broad lifestyle traffic.

The first wave is weddings, corporate events, and walks.

The editorial logic is straightforward: if a reader is choosing where to base wedding guests, how to shape a corporate retreat, or which walk actually suits the day they want, generic content is not enough. Precision wins."

printf 'Facebook... '
post "$FB" "$WED_FB" "2026-04-22T09:00:00+10:00" "facebook" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'LinkedIn... '
post "$LI" "$WED_LI" "2026-04-22T09:00:00+10:00" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

# ── THURSDAY 23 Apr @ 08:00 AEST ─────────────────────────────────────────────
label "Thursday (23 Apr)"

THU_FB="This weekend is shaping up as the kind of Peninsula weekend where your base matters as much as your plans.

Right now, Sorrento is looking like the strongest long-weekend anchor, especially if you want a mix of atmosphere, culture, and one genuinely good half-day out.

We will have the full read in Peninsula This Weekend soon."

THU_LI="One editorial test we use a lot at Peninsula Insider is whether a recommendation creates a coherent day, not just a good individual stop.

That matters even more on a long weekend.

The strongest recommendations are usually geographic as much as cultural, because they reduce friction, improve flow, and make the region feel more legible to the reader."

printf 'Facebook... '
post "$FB" "$THU_FB" "2026-04-23T08:00:00+10:00" "facebook" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'LinkedIn... '
post "$LI" "$THU_LI" "2026-04-23T08:00:00+10:00" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

# ── FRIDAY 24 Apr @ 07:00 AEST ───────────────────────────────────────────────
label "Friday (24 Apr)"

FRI_FB="Peninsula This Weekend is live.

This week's edition is built around the shape of the long weekend, the picks worth making space for, the strongest fallback if the weather turns or energy dips, and the Peninsula moves that are better left alone.

If you want one clear local read on how to do the weekend well, start here."

FRI_LI="Our weekly Peninsula This Weekend product is designed to do one job well: help readers make better local decisions with less noise.

This week's edition takes the long weekend seriously as an editorial object, not just a bundle of listings. It is structured around the actual shape of the weekend, the best move, the strongest alternative, the useful fallback, and what is not worth forcing.

That level of curation is where local media still has an edge."

printf 'Facebook... '
post "$FB" "$FRI_FB" "2026-04-24T07:00:00+10:00" "facebook" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf 'LinkedIn... '
post "$LI" "$FRI_LI" "2026-04-24T07:00:00+10:00" | jq -c '{status:.data.createPost.post.status, dueAt:.data.createPost.post.dueAt, id:.data.createPost.post.id, err:.errors[0].message}'

printf '\n\033[1;32mAll posts queued.\033[0m\n'
