#!/usr/bin/env bash
# Fixup script — Mon (to queue), Wed LI retry, Thu-Sun with rate-limit pauses
set -euo pipefail

API_KEY="eNkrBNfVMnnnr6F9cqq8WTVFpDiLw_Jf0gn-okjGf7q"
FB="69e5913b031bfa423c20f7cf"
LI="69e58e43031bfa423c20f0bf"
IG="69e5d3b7031bfa423c21c0d8"
SUPA="https://vjlyihscyrfmndjlkfew.supabase.co/storage/v1/object/public/social"

gql_post() {
  curl -sS -X POST https://api.buffer.com \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$1"
}

# Scheduled post with image
push_sched() {
  local label="$1" channel="$2" text="$3" due="$4" img="${5:-}" meta="${6:-}"
  local body r
  if [[ -n "$img" ]]; then
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg d "$due" --arg u "$img" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, dueAt: \"" + $d + "\", mode: customScheduled, assets: { images: [{ url: \"" + $u + "\" }] }" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  else
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg d "$due" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, dueAt: \"" + $d + "\", mode: customScheduled" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  fi
  r=$(gql_post "$body")
  local status id err
  status=$(echo "$r" | jq -r '.data.createPost.post.status // "ERR"')
  id=$(echo "$r"     | jq -r '.data.createPost.post.id // "-"')
  err=$(echo "$r"    | jq -r '.data.createPost.message // .errors[0].message // ""')
  printf '  %-22s %s  %s  %s\n' "$label" "$status" "$id" "$err"
}

# Add to queue (no specific time — for Mon posts whose window passed)
push_queue() {
  local label="$1" channel="$2" text="$3" img="${4:-}" meta="${5:-}"
  local body r
  if [[ -n "$img" ]]; then
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg u "$img" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, mode: addToQueue, assets: { images: [{ url: \"" + $u + "\" }] }" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  else
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, mode: addToQueue" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  fi
  r=$(gql_post "$body")
  local status id err
  status=$(echo "$r" | jq -r '.data.createPost.post.status // "ERR"')
  id=$(echo "$r"     | jq -r '.data.createPost.post.id // "-"')
  err=$(echo "$r"    | jq -r '.data.createPost.message // .errors[0].message // ""')
  printf '  %-22s %s  %s  %s\n' "$label" "$status" "$id" "$err"
}

label() { printf '\n\033[1;36m── %s ──\033[0m\n' "$1"; }

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

WED_LI="We are building the next Peninsula Insider verticals around high-intent local decisions, not just broad lifestyle traffic.

The first wave is weddings, corporate events, and walks.

The editorial logic is straightforward: if a reader is choosing where to base wedding guests, how to shape a corporate retreat, or which walk actually suits the day they want, generic content is not enough. Precision wins."

THU_FB="This weekend is shaping up as the kind of Peninsula weekend where your base matters as much as your plans.

Right now, Sorrento is looking like the strongest long-weekend anchor, especially if you want a mix of atmosphere, culture, and one genuinely good half-day out.

We will have the full read in Peninsula This Weekend soon."
THU_LI="One editorial test we use a lot at Peninsula Insider is whether a recommendation creates a coherent day, not just a good individual stop.

That matters even more on a long weekend.

The strongest recommendations are usually geographic as much as cultural, because they reduce friction, improve flow, and make the region feel more legible to the reader."
THU_IG="Our early read on the long weekend: base beats bounce.

Pick the right Peninsula pocket, and the whole weekend gets easier.

Full weekend edit soon."

FRI_FB="Peninsula This Weekend is live.

This week's edition is built around the shape of the long weekend, the picks worth making space for, the strongest fallback if the weather turns or energy dips, and the Peninsula moves that are better left alone.

If you want one clear local read on how to do the weekend well, start here."
FRI_LI="Our weekly Peninsula This Weekend product is designed to do one job well: help readers make better local decisions with less noise.

This week's edition takes the long weekend seriously as an editorial object, not just a bundle of listings. It is structured around the actual shape of the weekend, the best move, the strongest alternative, the useful fallback, and what is not worth forcing.

That level of curation is where local media still has an edge."
FRI_IG="Peninsula This Weekend is up.

The good picks. The better base. The fallback if plans wobble. The moves to skip.

Exactly the sort of weekend guide we wish more places published."

SAT_FB="If you are on the Peninsula this weekend, the best version of the day is usually the one with a bit of room left in it.

One good anchor. One good meal. One shift in pace.

That is usually enough.

If you have not read this week's weekend guide yet, it is there to help you avoid overcomplicating things."
SAT_IG="A Peninsula reminder for the weekend:

you do not need to do everything for the day to feel well chosen.

One strong move is often enough."

SUN_FB="A good local publication should make a place feel more legible.

That is the standard we are chasing at Peninsula Insider.

Not more noise about the Mornington Peninsula. Better judgement about what matters here, what is worth your time, and how to experience the region well.

More of that to come this week."
SUN_LI="Our editorial thesis for Peninsula Insider is becoming clearer:

The opportunity is not to cover everything on the Mornington Peninsula.
The opportunity is to become unusually useful on the choices that matter.

That means specific guidance, local context, strong curation, and products readers can build habits around."
SUN_IG="What we want Peninsula Insider to be is simple:

a publication that helps the Peninsula feel easier to choose, understand, and enjoy."

META_FB=', metadata: { facebook: { type: post } }'
META_IG=', metadata: { instagram: { type: post, shouldShareToFeed: true } }'

# ── Monday — add to queue (scheduled time has passed) ────────────────────────
label "Monday 20 Apr — add to queue"
push_queue "Facebook"  "$FB" "$MON_FB" "$SUPA/fb/pi-social-2026-04-20-mon-week-ahead-fb-191x1-hero-v01.png" "$META_FB"
sleep 2
push_queue "LinkedIn"  "$LI" "$MON_LI" "$SUPA/li/pi-social-2026-04-20-mon-week-ahead-li-191x1-hero-v01.png"
sleep 2
push_queue "Instagram" "$IG" "$MON_IG" "$SUPA/ig/pi-social-2026-04-20-mon-week-ahead-ig-4x5-s01-v01.png" "$META_IG"
sleep 3

# ── Wednesday LinkedIn retry ──────────────────────────────────────────────────
label "Wednesday 22 Apr — LinkedIn retry"
push_sched "LinkedIn" "$LI" "$WED_LI" "2026-04-21T23:00:00+00:00" \
  "$SUPA/li/pi-social-2026-04-20-wed-walk-lunch-soak-li-191x1-summary-v01.png"
sleep 3

# ── Thursday 23 Apr ───────────────────────────────────────────────────────────
label "Thursday 23 Apr — 8:00am AEST"
push_sched "Facebook"  "$FB" "$THU_FB" "2026-04-22T22:00:00+00:00" \
  "$SUPA/fb/pi-social-2026-04-20-thu-weekend-moods-fb-191x1-summary-v01.png" "$META_FB"
sleep 2
push_sched "LinkedIn"  "$LI" "$THU_LI" "2026-04-22T22:00:00+00:00" \
  "$SUPA/li/pi-social-2026-04-20-thu-weekend-moods-li-191x1-summary-v01.png"
sleep 2
push_sched "Instagram" "$IG" "$THU_IG" "2026-04-22T22:00:00+00:00" \
  "$SUPA/ig/pi-social-2026-04-20-thu-weekend-moods-ig-4x5-s01-v01.png" "$META_IG"
sleep 3

# ── Friday 24 Apr ─────────────────────────────────────────────────────────────
label "Friday 24 Apr — 7:00am AEST"
push_sched "Facebook"  "$FB" "$FRI_FB" "2026-04-23T21:00:00+00:00" \
  "$SUPA/fb/pi-social-2026-04-20-fri-this-weekend-fb-191x1-hero-v01.png" "$META_FB"
sleep 2
push_sched "LinkedIn"  "$LI" "$FRI_LI" "2026-04-23T21:00:00+00:00" \
  "$SUPA/li/pi-social-2026-04-20-fri-this-weekend-li-191x1-hero-v01.png"
sleep 2
push_sched "Instagram" "$IG" "$FRI_IG" "2026-04-23T21:00:00+00:00" \
  "$SUPA/ig/pi-social-2026-04-20-fri-this-weekend-ig-4x5-s01-v01.png" "$META_IG"
sleep 3

# ── Saturday 25 Apr ───────────────────────────────────────────────────────────
label "Saturday 25 Apr (ANZAC Day) — 9:00am AEST"
push_sched "Facebook"  "$FB" "$SAT_FB" "2026-04-24T23:00:00+00:00" \
  "$SUPA/fb/pi-social-2026-04-20-sat-peninsula-today-fb-4x5-hero-v01.png" "$META_FB"
sleep 2
push_sched "Instagram" "$IG" "$SAT_IG" "2026-04-24T23:00:00+00:00" \
  "$SUPA/ig/pi-social-2026-04-20-sat-peninsula-today-ig-4x5-hero-v01.png" "$META_IG"
sleep 3

# ── Sunday 26 Apr ─────────────────────────────────────────────────────────────
label "Sunday 26 Apr — 9:00am AEST"
push_sched "Facebook"  "$FB" "$SUN_FB" "2026-04-25T23:00:00+00:00" \
  "$SUPA/fb/pi-social-2026-04-20-sun-week-close-fb-4x5-hero-v01.png" "$META_FB"
sleep 2
push_sched "LinkedIn"  "$LI" "$SUN_LI" "2026-04-25T23:00:00+00:00" \
  "$SUPA/li/pi-social-2026-04-20-sun-week-close-li-191x1-hero-v01.png"
sleep 2
push_sched "Instagram" "$IG" "$SUN_IG" "2026-04-25T23:00:00+00:00" \
  "$SUPA/ig/pi-social-2026-04-20-sun-week-close-ig-4x5-hero-v01.png" "$META_IG"

printf '\n\033[1;32m✓ Fixup complete\033[0m\n'
