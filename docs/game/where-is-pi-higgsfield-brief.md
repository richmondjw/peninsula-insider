# Where in the Peninsula is PI? Build brief for Higgsfield (game type)

Version 1, 2026-09-11. Owner: James. Paste everything below the line into a fresh Higgsfield build session as the opening message. It is written to pre-answer every gate in Higgsfield's game pipeline (profile, experience formula, STYLE FORMULA, asset manifest, thresholds, six-function contract) so the builder has nothing left to invent except execution.

Why this shape: the two 9 September prototypes (`find-the-insider-lab`, `insider-beyond-the-map`) drifted because their briefs left room. One became a 3D Babylon RPG in a fictional "Lantern Cove", the other an evidence puzzle in a fictional "Bay Steps" behind an invitation cookie, and both spent more words on compliance hedging than on the Peninsula. Everything below closes those gaps: real places only, 2D painted scenes, public URL, authored case data, locked style.

---

## 0. Decisions already made (do not re-ask)

- `create_website` with `type: "game"`, `category: "adventure"`, `subdomain: "where-is-pi"`. No template.
- `meta: { game: "Where in the Peninsula is PI?", minPlayers: 1, maxPlayers: 4 }`. Solo is the primary mode; 2 to 4 seats share one notebook (Search Party). Never block solo play on other players.
- Do NOT publish to the Higgsfield community feed. Deploy only.
- Public URL, anonymous play, no sign-in, no invitation cookie, no gate of any kind. Progress persists in the room; the room id is generated client-side and remembered in localStorage.
- 2D only. Painted scene backgrounds, DOM and CSS, no WebGL, no Babylon, no 3D anywhere.
- Real Mornington Peninsula places only, drawn from the slug lists in section 6. No invented towns, coves, studios or villages. Invented characters (witnesses) are fine; invented geography is not.
- The STYLE FORMULA in section 5 is approved. Skip the approval gate and use it byte-identical.
- Keep design notes to `design/plan.md` and `design/assets.csv`. No compliance essays, no external-review documents, no "not tested" disclaimers inside the game UI.

## 1. The game in one breath

PI is the Peninsula Insider's in-house local: the friend with better taste who is always twenty minutes ahead of you. Every case starts with where she was last seen. You ask witnesses, search painted scenes for what she left behind, and read the land itself to work out where she went next. The sun is the clock. Catch her before it sets and she tells you what to order. The route you deduced becomes a real Peninsula day out.

Experience formula: **The player feels like a local who is finally in on the secret, because every clue rewards knowing the Peninsula and every solved case hands them a real day they could drive tomorrow.**

## 2. Game profile

| Axis | Choice |
|---|---|
| Time | Pause-at-will. A case clock advances only on player actions (travel, ask, search). No real-time countdown. |
| Space | Discrete: a hand-drawn map of the Peninsula with 37 real towns as nodes; 3 to 5 visited per case. |
| Agency | One investigator (solo) or a shared notebook (Search Party). |
| Conflict | Versus the sunset and versus authored misdirection. Never versus other players. |
| Content | Authored cases as data. Case 01 is fully written in section 7. |
| Outcome | Found her before sunset (rank awarded) / Sunset (she has moved on; case can be replayed). |
| Players | Solo primary. Co-op 2 to 4 shares one notebook and one clock. |
| Session | 6 to 10 minutes per case. |
| Engagement | Discovery first, story second. |
| Platforms | Mobile browser first, desktop second. Touch, pointer, keyboard (physical key codes). |
| Language | English. Every player-visible string lives in one `STRINGS` object inside the case data. |

## 3. Loops and verbs

Core loop (one stop): arrive at a place → talk to up to 3 witnesses → search the scene (3 or 4 hotspots) → read the notebook → choose the next place on the map.

Verbs (all server-validated in `logic.js`):

- **Travel** to a place. Costs clock minutes based on real distance (section 8). A wrong place costs the minutes plus a 40 minute penalty and returns one flavour line from a witness who has not seen her.
- **Ask** a witness. Costs 10 minutes. Each witness has one line. One witness per stop points to the correct next place, one gives a "tell" about PI (what she is drinking, whether she has the dog, bay side or ocean side), one is a decoy that points to a plausible wrong place.
- **Search** a hotspot in the painted scene. Costs 15 minutes. Returns a clue that either confirms the next place or adds a tell.
- **Hint**. Free the first time, then costs 30 minutes each. Reveals the relevant witness line.
- **Name the venue**. At the final stop the player picks one of three real venues. Tells decide it. Correct: found her. Wrong: one more try, then sunset.
- **Restart**. Always available.

Loops: knowledge narrows the map (positive), but every stop still requires the player to choose (counterweight). A wrong turn is never fatal on its own; three wrong turns in one case will usually cost the sunset. Comeback path: the free hint plus the notebook always contain enough to finish.

Information map: player sees the map, the current scene, revealed witness lines, revealed hotspot clues, notebook tells, clock and sunset time. Hidden until earned: unrevealed witness lines and hotspot text. Server-only, never in `viewFor`: the correct route, the correct final venue, decoy flags, and the unrevealed text of any witness or hotspot. In Search Party every seat sees the same notebook; the seat that took the action is recorded on each entry.

## 4. Interface

Three regions, stacked on mobile, side by side on desktop:

1. **The scene.** One painted 16:9 background per place. Hotspots are absolutely positioned buttons over the painting (min 44px touch target) drawn as small amber ink circles that pulse once when the scene opens. Witnesses stand along the bottom edge of the scene as cel-shaded sprites; tap to ask.
2. **The notebook.** Kraft paper panel. Three sections: Tells (bullets), Clues (bullets, each tagged with the place it came from), Stamps (one rubber stamp per place visited; the final stamp is PI's own mark when found). The clock is a small sun icon travelling along an arc at the top of the notebook with the time in words ("Mid-morning", "Golden hour", "Last light").
3. **The map.** Hand-drawn Peninsula outline authored as inline SVG from the coordinates in section 6 (not a generated image). Visited places are stamped, the current place glows amber, all other places are tappable. Bay side and ocean side are labelled.

Entry path: launch → title card with "Last seen" line → one tap "Open the case" → first scene. Return visits open on the current scene with the notebook showing the current goal. Preferences (reduce motion, high contrast, text size) sit behind one icon and apply immediately.

End card: "Found her" or "Sunset". Shows the route as a stamped strip, the rank, PI's sign-off line, and two buttons: "Save PI's route" (links to the route on peninsulainsider.com.au, section 9) and "Share" (copies the emoji trail, e.g. `Where in the Peninsula is PI? Case 01 ☕→🌊→🍓→🍷 Found her at golden hour`).

Ranks by minutes remaining at the catch: Daytripper (0 to 29), Weekender (30 to 89), Sea-changer (90 to 149), Local (150 to 239), Insider (240+).

## 5. STYLE FORMULA (approved, use byte-identical in every asset prompt)

Soft impressionist gouache with visible broken brushwork over clean anime cel-shaded characters, delicate ink contours only on figures and objects, never on landscapes. Rounded readable silhouettes, wind-shaped tea-tree and moonah, weathered timber, basalt shelves. Environments in cream sand, sea-glass teal, eucalypt sage and dusk violet; PI and witnesses in warm terracotta and ivory that pop against them; clues and interactive objects carry one copper-amber glow. Luminous Australian golden-hour light, dappled shade, quiet magical-realist whimsy. High contrast between elements and backgrounds, consistent flat frontal perspective across every scene.

STYLE TOKEN: `impressionist gouache over anime cel characters, cream sand and sea-glass teal, terracotta figures, copper-amber clue glow, golden-hour light`

Rules the formula does not carry: whimsy is light, weather, wind and animals only (gulls that gossip, a ferry leaving a trail of light, glowing footprints). Never invent spirits, totems or "old stories" of place; this is Bunurong Country and none of that is ours to generate. Landscapes are painted from the real place descriptions in section 6, not from photographs, and not from Mediterranean or tropical references.

PI herself: mid-30s, sun hat, terracotta linen, canvas tote, a small scruffy dog on a rope lead. She is always leaving the frame, never facing the player, until the final card.

Type in the UI: a warm humanist serif for headings, a clean sans for body, a mono for the clock and stamps. Cream page, ink text, terracotta primary button, eucalypt for confirmed clues. No gradients, no dark scrims, no film grain.

## 6. Real-world data the builder must use

Place nodes (slug, name, lat, lng). These are the only travel destinations. Coordinates drive the map and the travel-minute formula.

```
mornington -38.2170 145.0390 | mount-eliza -38.1880 145.0920 | mount-martha -38.2760 145.0180
safety-beach -38.3120 144.9960 | dromana -38.3340 144.9640 | mccrae -38.3510 144.9260
rosebud -38.3560 144.9060 | capel-sound -38.3620 144.8770 | tootgarook -38.3730 144.8550
rye -38.3730 144.8220 | blairgowrie -38.3600 144.7770 | sorrento -38.3390 144.7430
portsea -38.3190 144.7100 | point-nepean -38.3070 144.6600 | st-andrews-beach -38.4180 144.8230
fingal -38.4180 144.8600 | cape-schanck -38.4939 144.8881 | boneo -38.4030 144.8850
flinders -38.4770 145.0180 | shoreham -38.4300 145.0500 | point-leo -38.4160 145.0720
merricks -38.3900 145.0900 | merricks-beach -38.4040 145.0950 | merricks-north -38.3700 145.0800
balnarring -38.3720 145.1240 | somers -38.3940 145.1590 | bittern -38.3400 145.1740
crib-point -38.3630 145.2040 | stony-point -38.3740 145.2180 | hastings -38.3080 145.1860
tyabb -38.2600 145.1870 | moorooduc -38.2350 145.1050 | tuerong -38.2600 145.0900
red-hill -38.3619 145.0543 | red-hill-south -38.3900 145.0350 | main-ridge -38.4050 145.0090
arthurs-seat -38.3550 144.9550
```

Region labels for the map: Mornington Bay Coast, Peninsula Tip, Ocean Coast, Red Hill Wine Country, Western Port.

Place intros to paint from (short forms):

- Mornington: Main Street runs down to the pier and bathing boxes; Saturday market; morning coffee culture; boats in the harbour.
- Cape Schanck: where the Peninsula runs out of land; the 1859 lighthouse on the last headland; a boardwalk down through tea-tree to a basalt beach that vanishes at high tide; open ocean to the horizon; best in the last two hours of light.
- Main Ridge: high hinterland on the ridge; strawberry farm, dairy, orchards, gravel roads under big gums, mist in the mornings.
- Red Hill: misty basalt plateau; a general store, a monthly market, vineyard restaurants that don't advertise from the highway; the winery restaurant cluster (Ten Minutes by Tractor, Montalto, Paringa Estate) has no peer in the state.
- Sorrento: limestone village at the tip; the ferry to Queenscliff; back beach ocean baths; gelato on the main street.

Venue and experience slugs that may appear as clue references or final-venue candidates (all real, all have pages on peninsulainsider.com.au at `/eat/`, `/drink/`, `/stay/`, `/explore/` sections; the builder only needs the slug and name):

`commonfolk-coffee` Commonfolk Coffee (Mornington) · `mornington-main-street-market` · `the-rocks-mornington` · `cape-schanck-boardwalk` · `cape-schanck-lighthouse-walk` · `bushrangers-bay-walk` · `sunny-ridge-strawberry-farm` Sunny Ridge Strawberry Farm (Main Ridge) · `main-ridge-dairy` Main Ridge Dairy · `ten-minutes-by-tractor` Ten Minutes by Tractor (Red Hill) · `montalto` Montalto (Red Hill) · `montalto-sculpture-trail` · `paringa-estate` Paringa Estate (Red Hill) · `red-hill-bakery` · `red-hill-market` · `sorrento-ferry` · `sorrento-gelato` · `sorrento-ocean-baths` · `flinders-general-store` · `laura-pt-leo` Laura (Point Leo) · `pt-leo-estate` · `peninsula-hot-springs` · `jetty-road-brewery` (Dromana) · `arthurs-seat-lookout`

## 7. Case 01, fully authored: "Took her coffee to go"

Season: spring. Sunset 19:40. Case opens 08:10 at Mornington.

Correct route: `mornington` → `cape-schanck` → `main-ridge` → `red-hill`. Final venue: **Montalto** (tells: she wanted a walk before lunch, and a view).

**Title card.** "Last seen: Mornington pier, Saturday 8:10am. Flat white, takeaway. The dog was with her." Button: "Open the case".

**Stop 1, Mornington (scene: pier and bathing boxes, low morning sun, market stalls setting up).**
- Witness, barista (correct): "Took her coffee to go. Asked me which way the wind was blowing. I said south-westerly, straight off the Strait. She smiled like that was the answer."
- Witness, newsagent (tell): "Bought a postcard. Lighthouse on it. And a lead for the dog, the old one had frayed."
- Witness, fisherman (decoy, points to Sorrento): "Reckon she was for the ferry. Everyone's for the ferry on a Saturday."
- Hotspots: the coffee cup lid in the bin (clue: "Lid marked with a compass rose drawn in biro. The needle points south, past the vineyards, to open ocean."), the market noticeboard (tell: "A torn flyer for a sculpture walk. One corner missing, as if someone took the map."), the dog's water bowl outside the cafe (flavour: "Still wet. She wasn't here long."), the pier end (flavour: "Gulls arguing over nothing. One of them looks smug.").
- Wrong turn lines: Sorrento: "Ferry deckhand: 'Had a woman with a dog? Mate, half the boat has a dog.' No sign of her." Rosebud: "Foreshore kiosk: 'Haven't seen her. Try somewhere with a view.'"

**Stop 2, Cape Schanck (scene: lighthouse on the headland, boardwalk through tea-tree, big ocean, late morning light).**
- Witness, park ranger (correct): "Went down the boardwalk with the dog, came back up with a punnet in her hand. Said she'd earned strawberries."
- Witness, photographer (tell): "Asked me where the light would be good at one o'clock. I said the ridge. Wanted somewhere with a view for lunch, she said."
- Witness, tourist (decoy, points to Flinders): "Someone said the best fish and chips are in Flinders. She might have gone that way?"
- Hotspots: boot prints on the boardwalk (clue: "Two sets going down, two coming back. Small dog prints beside them, heading for the car park and the hinterland road."), the lighthouse sign (flavour: "1859. She'd have read it. She reads everything."), a strawberry-punnet sticker on the bin (clue: "Sunny Ridge, Main Ridge. Printed this morning."), the lookout bench (tell: "A pencil sketch left under a stone: a sculpture on a hill, three lines, unfinished.").
- Wrong turn: Flinders: "General store: 'Not today. You want the ridge, not the coast.'"

**Stop 3, Main Ridge (scene: strawberry rows under big gums, gravel road, dairy gate, midday dapple).**
- Witness, strawberry picker (correct): "Ate three before she paid. Asked how far to the sculpture trail. Ten minutes, I told her, if you don't stop for cheese."
- Witness, dairy hand (tell): "Bought a goat's cheese and asked for it wrapped twice. Picnic, she said. Somewhere with a table and a view."
- Witness, cyclist (decoy, points to Arthurs Seat): "Told her the Eagle at Arthurs Seat has the best view on the Peninsula. She said 'the second best'."
- Hotspots: the honesty box (clue: "A five-dollar note folded into a tiny boat. Written on the hull: 'lunch, 1pm, walk first'."), a strawberry stem on the fence (flavour), the dairy chalkboard (tell: "Someone has drawn a small sculpture next to the word 'Montalto' and then rubbed it out. Badly."), the gum tree (flavour: "A kookaburra. Not laughing. Judging.").
- Wrong turn: Arthurs Seat: "Chairlift attendant: 'View's great. She's not here.'"

**Stop 4, Red Hill (scene: vineyard rows on the plateau, misty gullies, a long table under a tree, golden light).**
- Final venue choice from three: Ten Minutes by Tractor, Montalto, Paringa Estate.
- Notebook tells at this point should read: postcard with a lighthouse; wanted a walk before lunch; wanted a view; a sculpture, three times.
- Correct: Montalto. Found card: PI at the end of the sculpture trail, dog asleep, one glass poured. Her line: "Took you long enough. Sit at the outside table. Better view, and the kingfish is the order." Stamp: PI's mark.
- Wrong first pick: "The host at the door: 'Sculpture trail? That's next door.' 40 minutes gone." Second wrong pick: Sunset.

**Sunset card.** "Last light on the ridge. She's moved on. Her tab's still open somewhere." Button: "Try again".

Optional Search Party lines: when a second seat joins, the notebook shows "Two of you now. She'll be harder to miss."

## 8. Numbers fixed before code

- Travel minutes between places = round(haversine km × 1.6) + 10. Wrong place adds 40.
- Ask 10 min, search 15 min, hint 0 then 30 min each, wrong final venue 40 min.
- Case 01 par: 08:10 start; correct route with all correct witnesses and two searches per stop finishes about 14:30, leaving roughly 310 minutes: Insider rank. Three wrong turns and every hotspot: about 19:10, still a Local. The numbers are in one `TUNING` object; do not hard-code them elsewhere.
- Interactive nodes per scene: at most 8. DOM only, target 60fps on a mid-range phone, no layout thrash (render from a single view object, diff by version).
- Touch targets 44px minimum. Text scale option 100 / 125 / 150 percent.
- Reduce-motion preference disables the hotspot pulse, the sun arc animation and scene crossfades.
- Every action acknowledges within one frame with a disabled state on the tapped control, then re-enables on the next server view.

## 9. Website integration (phase 1 minimum)

- Every place, venue and experience the game names carries its real slug. The end card's "Save PI's route" button opens `https://peninsulainsider.com.au/plan/?pi-case=01&route=mornington,cape-schanck,main-ridge,red-hill&venue=montalto` in a new tab. The website side (ours, not Higgsfield's) reads those parameters and writes the route into the visitor's saved trip. The game only builds the URL.
- Each stamp in the notebook links to the place page: `https://peninsulainsider.com.au/places/<slug>/`.
- The Share button copies the emoji trail plus the game URL.
- Nothing else touches the website in phase 1. No accounts, no prizes, no cookies.

## 10. Six-function contract, mapped

`meta`: as in section 0.

`setup(players)`: `{ version: 1, caseId: "01", seed: 17, clock: 490, sunset: 1180, at: "mornington", route: ["mornington"], revealed: { witnesses: [], hotspots: [] }, notebook: { tells: [], clues: [], stamps: ["mornington"] }, wrongTurns: 0, hints: 0, finalAttempts: 0, status: "playing", seats: players }`. Clock values are minutes since midnight.

`validateAction(state, playerId, action)`: refuse unknown seats, refuse everything when `status !== "playing"` except `restart`, refuse `travel` to the current place or to a slug not in the place list, refuse `ask`/`search` for ids not at the current place or already revealed, refuse `guess` unless `at` is the final place of the case, refuse `hint` when nothing is left to reveal at this stop. Any action that would push `clock` past `sunset` is allowed and resolves to `status: "sunset"` in `applyAction` (the player gets to see the last thing happen).

`applyAction`: pure, copies state, advances clock, appends notebook entries with `{ text, place, by: playerId }`, sets `status` to `found` or `sunset`, computes rank at `found`. Randomness only from `seed` (used for which flavour gull line shows; nothing that affects the outcome).

`isGameOver`: `{ over: status !== "playing", winner: status === "found" ? "all" : null }`. Do not let the platform's "over" state block `restart`.

`viewFor(state, playerId)`: return clock, sunset, at, route, stamps, revealed witness and hotspot text, notebook, status, rank, and for the current place the list of witness and hotspot ids with `revealed` booleans and their labels only. Never return unrevealed text, the correct route, decoy flags, or the final venue.

Case content lives in a `CASES` constant inside `logic.js` (no imports allowed there). Keep it as plain JSON so future cases can be generated and dropped in.

## 11. Asset manifest (design/assets.csv)

| id | role | type | description | ratio | source |
|---|---|---|---|---|---|
| bg-mornington | scene background | image | Mornington pier and bathing boxes, morning market setting up, low sun | 16:9 | generate |
| bg-cape-schanck | scene background | image | Cape Schanck lighthouse headland, boardwalk through tea-tree, open ocean | 16:9 | generate |
| bg-main-ridge | scene background | image | Main Ridge strawberry rows under big gums, gravel road, midday dapple | 16:9 | generate |
| bg-red-hill | scene background | image | Red Hill vineyard plateau, misty gullies, long table under a tree, golden hour | 16:9 | generate |
| spr-pi | character sprite | image | woman in sun hat and terracotta linen walking away with small scruffy dog on rope lead | 1:1 | generate |
| spr-witness-a | character sprite | image | barista in apron holding takeaway cup | 1:1 | generate |
| spr-witness-b | character sprite | image | park ranger in wide hat with binoculars | 1:1 | generate |
| spr-witness-c | character sprite | image | strawberry picker with punnet | 1:1 | generate |
| cover | launch cover | image | PI walking off along the Cape Schanck boardwalk at golden hour, dog ahead, notebook in foreground | 3:2 | generate |
| icon | app icon | image | rubber-stamp compass rose with a sun hat brim | 1:1 | generate |
| amb-bay | ambience loop | audio | calm bay water, gulls, distant market | 12s | generate |
| amb-ocean | ambience loop | audio | wind off the Strait, gannets, surf below cliffs | 12s | generate |
| amb-ridge | ambience loop | audio | hinterland dusk, magpies, leaves | 12s | generate |
| sfx-stamp | feedback | audio | rubber stamp thunk | 1s | generate |

The map is inline SVG authored from the coordinates in section 6, not a generated image. Sprites are generated on a magenta key and keyed out. All backgrounds ship at 1280×720. The four remaining Case 01 witnesses (newsagent, fisherman, photographer, tourist, dairy hand, cyclist) reuse the three witness sprites with a CSS hue shift on the apron or hat; do not generate more than ten images.

## 12. Copy rules (non-negotiable)

- No em-dashes anywhere in the game, not in UI, not in witness lines. Use commas, full stops, colons.
- PI never greets the player and never speaks about herself in the third person. She speaks once, at the end.
- Sentences 8 to 18 words by default; witnesses may use 3 to 6 word sentences for punch.
- Name real things: tables, roads, the order. Never "a charming eatery".
- Bunurong acknowledgement on the title card footer: "Peninsula Insider acknowledges the Bunurong people, Traditional Owners of the lands and waters of the Mornington Peninsula." Nothing else about culture or history is invented.

## 13. Done means

- Case 01 plays start to finish on a phone in under ten minutes, both outcomes reachable.
- Two tabs on the same room share one notebook and one clock; a third tab still plays.
- `viewFor` never leaks the answer (assert in `tests/logic.test.ts`: the correct route and venue never appear in any view before `found`).
- Reduce-motion, contrast and text-scale options work before the first tap.
- `app-meta.json` filled with the generated cover and a real `og_title`.
- Handover: the live URL, the four background paintings and the PI sprite as files, and `design/plan.md` under one page.
