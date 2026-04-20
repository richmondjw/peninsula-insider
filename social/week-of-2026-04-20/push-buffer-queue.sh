#!/usr/bin/env bash
# Push all Mon–Sun posts to Buffer queue (no scheduled times)
set -euo pipefail

API_KEY="eNkrBNfVMnnnr6F9cqq8WTVFpDiLw_Jf0gn-okjGf7q"
FB="69e5913b031bfa423c20f7cf"
LI="69e58e43031bfa423c20f0bf"
IG="69e5d3b7031bfa423c21c0d8"
SUPA="https://vjlyihscyrfmndjlkfew.supabase.co/storage/v1/object/public/social"
META_FB=', metadata: { facebook: { type: post } }'
META_IG=', metadata: { instagram: { type: post, shouldShareToFeed: true } }'

push() {
  local label="$1" channel="$2" text="$3" img="${4:-}" meta="${5:-}"
  local body r status id err
  if [[ -n "$img" ]]; then
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg u "$img" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, mode: addToQueue, assets: { images: [{ url: \"" + $u + "\" }] }" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  else
    body=$(jq -n --arg t "$text" --arg c "$channel" --arg m "$meta" \
      '{query: ("mutation { createPost(input: { text: " + ($t|@json) + ", channelId: \"" + $c + "\", schedulingType: automatic, mode: addToQueue" + $m + " }) { ... on PostActionSuccess { post { id status dueAt } } ... on MutationError { message } } }")}')
  fi
  r=$(curl -sS -X POST https://api.buffer.com \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$body")
  status=$(echo "$r" | jq -r '.data.createPost.post.status // "ERR"')
  id=$(echo "$r"     | jq -r '.data.createPost.post.id // "-"')
  err=$(echo "$r"    | jq -r '.data.createPost.message // .errors[0].message // ""')
  printf '  %-22s %s  %s  %s\n' "$label" "$status" "$id" "$err"
  sleep 3
}

label() { printf '\n\033[1;36m── %s ──\033[0m\n' "$1"; }

# ── Monday ───────────────────────────────────────────────────────────────────

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

label "Monday 20 Apr"
push "Facebook"  "$FB" "$MON_FB" "$SUPA/fb/pi-social-2026-04-20-mon-week-ahead-fb-191x1-hero-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$MON_LI" "$SUPA/li/pi-social-2026-04-20-mon-week-ahead-li-191x1-hero-v01.png"
push "Instagram" "$IG" "$MON_IG" "$SUPA/ig/pi-social-2026-04-20-mon-week-ahead-ig-4x5-s01-v01.png" "$META_IG"

# ── Tuesday ──────────────────────────────────────────────────────────────────

TUE_FB="If you like the Peninsula best when it feels considered rather than chaotic, our newsletter is where that starts.

We use it to send the best local reads, timely weekend thinking, and the places or experiences worth paying attention to before everyone else catches up.

Join here and stay one step ahead of the usual scramble."

TUE_LI="For local media, the newsletter is not just a distribution channel. It is the trust product.

For Peninsula Insider, that means giving readers timely, useful, specific guidance on where to go, what matters this week, and how to make better choices on the Peninsula.

We are treating subscription growth as a core editorial priority, not a bolt-on."

TUE_IG="The best Peninsula plans usually happen before Friday.

Our newsletter is where we send the local edit, not just the leftovers.

Subscribe if you want the Peninsula in your inbox with some judgement attached."

label "Tuesday 21 Apr"
push "Facebook"  "$FB" "$TUE_FB" "$SUPA/fb/pi-social-2026-04-20-tue-start-in-sorrento-fb-191x1-hero-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$TUE_LI" "$SUPA/li/pi-social-2026-04-20-tue-start-in-sorrento-li-191x1-hero-v01.png"
push "Instagram" "$IG" "$TUE_IG" "$SUPA/ig/pi-social-2026-04-20-tue-start-in-sorrento-ig-4x5-s01-v01.png" "$META_IG"

# ── Wednesday ────────────────────────────────────────────────────────────────

WED_FB="We are expanding Peninsula Insider into some of the decisions people actually need help making here, not just the ones that look good in search.

That means stronger coverage around:
- weddings
- corporate events
- walks

Not generic directories. Useful guides with a Peninsula point of view, honest tradeoffs, and local context that helps people choose properly."

WED_LI="We are building the next Peninsula Insider verticals around high-intent local decisions, not just broad lifestyle traffic.

The first wave is weddings, corporate events, and walks.

The editorial logic is straightforward: if a reader is choosing where to base wedding guests, how to shape a corporate retreat, or which walk actually suits the day they want, generic content is not enough. Precision wins."

WED_IG="Coming into sharper focus at Peninsula Insider:

Weddings. Walks. Corporate events.

Not as content filler. As genuinely useful local guides for decisions people are already making."

label "Wednesday 22 Apr"
push "Facebook"  "$FB" "$WED_FB" "$SUPA/fb/pi-social-2026-04-20-wed-walk-lunch-soak-fb-191x1-summary-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$WED_LI" "$SUPA/li/pi-social-2026-04-20-wed-walk-lunch-soak-li-191x1-summary-v01.png"
push "Instagram" "$IG" "$WED_IG" "$SUPA/ig/pi-social-2026-04-20-wed-walk-lunch-soak-ig-4x5-s01-v01.png" "$META_IG"

# ── Thursday ─────────────────────────────────────────────────────────────────

THU_FB="This weekend is shaping up as the kind of Peninsula weekend where your base matters as much as your plans.

Right now, Sorrento is looking like the strongest long-weekend anchor, especially if you want a mix of atmosphere, culture, and one genuinely good half-day out.

We will have the full read in Peninsula This Weekend soon."

THU_LI="One editorial test we use a lot at Peninsula Insider is whether a recommendation creates a coherent day, not just a good individual stop.

That matters even more on a long weekend.

The strongest recommendations are usually geographic as much as cultural, because they reduce friction, improve flow, and make the region feel more legible to the reader."

THU_IG="Our early read on the long weekend: base beats bounce.

Pick the right Peninsula pocket, and the whole weekend gets easier.

Full weekend edit soon."

label "Thursday 23 Apr"
push "Facebook"  "$FB" "$THU_FB" "$SUPA/fb/pi-social-2026-04-20-thu-weekend-moods-fb-191x1-summary-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$THU_LI" "$SUPA/li/pi-social-2026-04-20-thu-weekend-moods-li-191x1-summary-v01.png"
push "Instagram" "$IG" "$THU_IG" "$SUPA/ig/pi-social-2026-04-20-thu-weekend-moods-ig-4x5-s01-v01.png" "$META_IG"

# ── Friday ────────────────────────────────────────────────────────────────────

FRI_FB="Peninsula This Weekend is live.

This week's edition is built around the shape of the long weekend, the picks worth making space for, the strongest fallback if the weather turns or energy dips, and the Peninsula moves that are better left alone.

If you want one clear local read on how to do the weekend well, start here."

FRI_LI="Our weekly Peninsula This Weekend product is designed to do one job well: help readers make better local decisions with less noise.

This week's edition takes the long weekend seriously as an editorial object, not just a bundle of listings. It is structured around the actual shape of the weekend, the best move, the strongest alternative, the useful fallback, and what is not worth forcing.

That level of curation is where local media still has an edge."

FRI_IG="Peninsula This Weekend is up.

The good picks. The better base. The fallback if plans wobble. The moves to skip.

Exactly the sort of weekend guide we wish more places published."

label "Friday 24 Apr"
push "Facebook"  "$FB" "$FRI_FB" "$SUPA/fb/pi-social-2026-04-20-fri-this-weekend-fb-191x1-hero-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$FRI_LI" "$SUPA/li/pi-social-2026-04-20-fri-this-weekend-li-191x1-hero-v01.png"
push "Instagram" "$IG" "$FRI_IG" "$SUPA/ig/pi-social-2026-04-20-fri-this-weekend-ig-4x5-s01-v01.png" "$META_IG"

# ── Saturday ─────────────────────────────────────────────────────────────────

SAT_FB="If you are on the Peninsula this weekend, the best version of the day is usually the one with a bit of room left in it.

One good anchor. One good meal. One shift in pace.

That is usually enough.

If you have not read this week's weekend guide yet, it is there to help you avoid overcomplicating things."

SAT_IG="A Peninsula reminder for the weekend:

you do not need to do everything for the day to feel well chosen.

One strong move is often enough."

label "Saturday 25 Apr (ANZAC Day)"
push "Facebook"  "$FB" "$SAT_FB" "$SUPA/fb/pi-social-2026-04-20-sat-peninsula-today-fb-4x5-hero-v01.png" "$META_FB"
push "Instagram" "$IG" "$SAT_IG" "$SUPA/ig/pi-social-2026-04-20-sat-peninsula-today-ig-4x5-hero-v01.png" "$META_IG"

# ── Sunday ────────────────────────────────────────────────────────────────────

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

label "Sunday 26 Apr"
push "Facebook"  "$FB" "$SUN_FB" "$SUPA/fb/pi-social-2026-04-20-sun-week-close-fb-4x5-hero-v01.png" "$META_FB"
push "LinkedIn"  "$LI" "$SUN_LI" "$SUPA/li/pi-social-2026-04-20-sun-week-close-li-191x1-hero-v01.png"
push "Instagram" "$IG" "$SUN_IG" "$SUPA/ig/pi-social-2026-04-20-sun-week-close-ig-4x5-hero-v01.png" "$META_IG"

printf '\n\033[1;32m✓ All 20 posts queued across Facebook, LinkedIn, Instagram\033[0m\n'
