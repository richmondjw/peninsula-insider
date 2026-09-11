Build me a browser game called **Where in the Peninsula is PI?** for Peninsula Insider, an editorial guide to the Mornington Peninsula in Victoria, Australia. Create it as `type: "game"`, `category: "adventure"`, `subdomain: "where-is-pi"`, no template. Do not publish it to the community feed; deploy only. Use my unlimited generations for every image and audio asset.

The decisions below are final. Do not re-ask them, do not soften them, and do not add a sign-in gate, an invitation cookie, a 3D engine, fictional places, or compliance disclaimers inside the game. The only planning files are `design/plan.md` (one page) and `design/assets.csv`.

## The idea

PI is Peninsula Insider's in-house local: the friend with better taste who is always twenty minutes ahead of you. This is Where in the World is Carmen Sandiego, but there is no crime. PI has simply gone for the day, and you are chasing her across real Peninsula towns. At each stop you ask three witnesses, search a painted scene for what she left behind, and read the land to work out where she went next. The sun is the clock. Catch her before it sets and she tells you what to order. The route you deduced becomes a real day out someone could drive tomorrow.

Experience formula: the player feels like a local who is finally in on the secret, because every clue rewards knowing the Peninsula and every solved case hands them a real day.

The whole thing should feel like stepping into a painting: whimsical, luminous, a little magical, never techie.

## Profile

Pause-at-will (the clock advances only on player actions). Discrete space: a hand-drawn map with 37 real towns as nodes, 3 to 5 visited per case. Solo is the primary mode; 2 to 4 seats may share one notebook and one clock ("Search Party") but solo must never wait on anyone. Conflict is versus the sunset and authored misdirection, never versus other players. Content is authored case data; Case 01 is written in full below. Outcome: Found her (rank awarded) or Sunset (replayable). Session 6 to 10 minutes. Engagement: discovery first, story second. Mobile browser first, desktop second; touch, pointer and keyboard on physical key codes. All player-visible strings in one STRINGS object.

`meta: { game: "Where in the Peninsula is PI?", minPlayers: 1, maxPlayers: 4 }`

## Verbs (all validated on the server)

- **Travel** to a place on the map. Costs `round(haversine_km * 1.6) + 10` minutes. A wrong place costs that plus 40 and returns one flavour line from someone who has not seen her.
- **Ask** a witness (10 min). Each stop has three: one points to the correct next place, one gives a "tell" about PI (what she is carrying, what she wants from lunch), one is a decoy pointing to a plausible wrong place.
- **Search** a hotspot in the scene (15 min). Three or four per scene. Returns a clue that confirms the next place or adds a tell.
- **Hint**: free once, then 30 min each. Reveals the correct witness line for the current stop.
- **Name the venue** at the final stop: choose one of three real venues. The tells decide it. Wrong once costs 40 min; wrong twice is Sunset.
- **Restart**, always available, including after game over.

Keep every number in one TUNING object. Case 01 starts 08:10, sunset 19:40. Ranks by minutes left when she is found: Daytripper 0 to 29, Weekender 30 to 89, Sea-changer 90 to 149, Local 150 to 239, Insider 240 and up.

## Screen

Three regions: stacked on mobile, side by side on desktop.

1. **The scene.** One painted 16:9 background per place. Hotspots are 44px-minimum buttons positioned over the painting, drawn as small copper-amber ink circles that pulse once when the scene opens. Witnesses stand along the bottom edge as cel-shaded sprites; tap to ask. Witness lines appear as hand-lettered speech on torn paper.
2. **The notebook.** Kraft paper. Sections: Tells, Clues (each tagged with the place it came from), Stamps (one rubber stamp per place visited; the last stamp is PI's own mark when found). The clock is a small sun travelling along an arc across the top of the notebook, with the time in words: Early, Mid-morning, Midday, Afternoon, Golden hour, Last light. The sky colour of the current scene shifts with the clock (pale dawn, white noon, terracotta golden hour, violet dusk) using a CSS tint over the painting.
3. **The map.** The Peninsula outline authored as inline SVG from the coordinates below (not a generated image). Visited places are stamped, the current place glows amber, the rest are tappable. Label the bay side and the ocean side and the five regions.

Entry: title card ("Last seen" line, one button "Open the case") then straight into the first scene. On return, open on the current scene with the notebook showing the current goal. Preferences behind one icon: reduce motion, high contrast, text scale 100/125/150. Reduce motion kills the pulse, the sun animation and crossfades.

End card: "Found her" or "Sunset". Shows the route as a stamped strip, the rank, PI's sign-off, and two buttons. "Save PI's route" opens `https://peninsulainsider.com.au/plan/?pi-case=01&route=<comma-separated place slugs>&venue=<venue slug>` in a new tab. "Share" copies: `Where in the Peninsula is PI? Case 01 ☕→🌊→🍓→🍷 Found her at golden hour` plus the game URL. Every stamp links to `https://peninsulainsider.com.au/places/<slug>/`.

## STYLE FORMULA (approved; insert byte-identical into every asset prompt, skip the approval gate)

Soft impressionist gouache with visible broken brushwork over clean anime cel-shaded characters, delicate ink contours only on figures and objects, never on landscapes. Rounded readable silhouettes, wind-shaped tea-tree and moonah, weathered timber, basalt shelves. Environments in cream sand, sea-glass teal, eucalypt sage and dusk violet; PI and witnesses in warm terracotta and ivory that pop against them; clues and interactive objects carry one copper-amber glow. Luminous Australian golden-hour light, dappled shade, quiet magical-realist whimsy. High contrast between elements and backgrounds, consistent flat frontal perspective across every scene.

STYLE TOKEN: `impressionist gouache over anime cel characters, cream sand and sea-glass teal, terracotta figures, copper-amber clue glow, golden-hour light`

Whimsy is light, weather, wind and animals only: gulls that gossip, a ferry leaving a trail of light, footprints that glow faintly, pollen in the air. Never invent spirits, totems or "old stories" of place; this is Bunurong Country and none of that is ours to make up. Paint landscapes from the place descriptions below, never from Mediterranean or tropical references, and never from photographs. PI: mid-30s, wide sun hat, terracotta linen, canvas tote, small scruffy dog on a rope lead, always walking out of frame until the final card. UI type: a warm humanist serif for headings, clean sans for body, mono for the clock and stamps. Cream page, ink text, terracotta primary button, eucalypt for confirmed clues. No gradients, no dark scrims, no film grain.

## Real places (the only travel nodes; slug, lat, lng)

mornington -38.2170 145.0390; mount-eliza -38.1880 145.0920; mount-martha -38.2760 145.0180; safety-beach -38.3120 144.9960; dromana -38.3340 144.9640; mccrae -38.3510 144.9260; rosebud -38.3560 144.9060; capel-sound -38.3620 144.8770; tootgarook -38.3730 144.8550; rye -38.3730 144.8220; blairgowrie -38.3600 144.7770; sorrento -38.3390 144.7430; portsea -38.3190 144.7100; point-nepean -38.3070 144.6600; st-andrews-beach -38.4180 144.8230; fingal -38.4180 144.8600; cape-schanck -38.4939 144.8881; boneo -38.4030 144.8850; flinders -38.4770 145.0180; shoreham -38.4300 145.0500; point-leo -38.4160 145.0720; merricks -38.3900 145.0900; merricks-beach -38.4040 145.0950; merricks-north -38.3700 145.0800; balnarring -38.3720 145.1240; somers -38.3940 145.1590; bittern -38.3400 145.1740; crib-point -38.3630 145.2040; stony-point -38.3740 145.2180; hastings -38.3080 145.1860; tyabb -38.2600 145.1870; moorooduc -38.2350 145.1050; tuerong -38.2600 145.0900; red-hill -38.3619 145.0543; red-hill-south -38.3900 145.0350; main-ridge -38.4050 145.0090; arthurs-seat -38.3550 144.9550.

Regions: Mornington Bay Coast, Peninsula Tip, Ocean Coast, Red Hill Wine Country, Western Port.

Paint from these: Mornington, Main Street running down to the pier and painted bathing boxes, Saturday market setting up, boats in the harbour. Cape Schanck, where the Peninsula runs out of land, the 1859 lighthouse on the last headland, a boardwalk down through tea-tree to a basalt beach, open ocean to the horizon. Main Ridge, high hinterland, strawberry rows under big gums, a dairy gate, gravel roads, morning mist. Red Hill, a misty basalt plateau of vineyards, a general store, winery restaurants that do not advertise from the highway, a long table under a tree.

Real venues and experiences (use these slugs and names only): commonfolk-coffee (Commonfolk Coffee, Mornington), mornington-main-street-market, cape-schanck-boardwalk, cape-schanck-lighthouse-walk, sunny-ridge-strawberry-farm (Sunny Ridge Strawberry Farm, Main Ridge), main-ridge-dairy (Main Ridge Dairy), ten-minutes-by-tractor (Ten Minutes by Tractor, Red Hill), montalto (Montalto, Red Hill), montalto-sculpture-trail, paringa-estate (Paringa Estate, Red Hill), sorrento-ferry, arthurs-seat-lookout, flinders-general-store.

## Case 01: "Took her coffee to go"

Correct route: mornington → cape-schanck → main-ridge → red-hill. Final venue: **montalto** (tells: she wanted a walk before lunch, a view, and a sculpture keeps appearing).

Title card: "Last seen: Mornington pier, Saturday 8:10am. Flat white, takeaway. The dog was with her."

**Mornington** (scene: pier and bathing boxes, low morning sun, market stalls going up)
- Barista, correct: "Took her coffee to go. Asked me which way the wind was blowing. I said south-westerly, straight off the Strait. She smiled like that was the answer."
- Newsagent, tell: "Bought a postcard. Lighthouse on it. And a new lead for the dog, the old one had frayed."
- Fisherman, decoy (Sorrento): "Reckon she was for the ferry. Everyone's for the ferry on a Saturday."
- Hotspots: coffee lid in the bin, clue: "A compass rose drawn on the lid in biro. The needle points south, past the vineyards, to open ocean." Market noticeboard, tell: "A torn flyer for a sculpture walk. One corner missing, as if someone took the map." Dog bowl outside the cafe, flavour: "Still wet. She wasn't here long." Pier end, flavour: "Gulls arguing over nothing. One of them looks smug."
- Wrong turns: Sorrento: "Ferry deckhand: 'Woman with a dog? Mate, half the boat has a dog.'" Rosebud: "Kiosk: 'Haven't seen her. Try somewhere with a view.'"

**Cape Schanck** (scene: lighthouse headland, boardwalk through tea-tree, big ocean, late morning)
- Ranger, correct: "Went down the boardwalk with the dog, came back up with a punnet in her hand. Said she'd earned strawberries."
- Photographer, tell: "Asked me where the light would be good at one o'clock. I said the ridge. She wanted somewhere with a view for lunch."
- Tourist, decoy (Flinders): "Someone said the best fish and chips are in Flinders. She might have gone that way?"
- Hotspots: boot prints on the boardwalk, clue: "Two sets going down, two coming back, small dog prints beside them, heading for the car park and the hinterland road." Punnet sticker on the bin, clue: "Sunny Ridge, Main Ridge. Printed this morning." Lookout bench, tell: "A pencil sketch under a stone: a sculpture on a hill, three lines, unfinished." Lighthouse sign, flavour: "1859. She'd have read it. She reads everything."
- Wrong turn, Flinders: "General store: 'Not today. You want the ridge, not the coast.'"

**Main Ridge** (scene: strawberry rows under big gums, gravel road, dairy gate, midday dapple)
- Picker, correct: "Ate three before she paid. Asked how far to the sculpture trail. Ten minutes, I told her, if you don't stop for cheese."
- Dairy hand, tell: "Bought a goat's cheese and asked for it wrapped twice. Picnic, she said. Somewhere with a table and a view."
- Cyclist, decoy (Arthurs Seat): "Told her the Eagle at Arthurs Seat has the best view on the Peninsula. She said 'the second best'."
- Hotspots: honesty box, clue: "A five-dollar note folded into a tiny boat. On the hull: 'lunch, 1pm, walk first'." Dairy chalkboard, tell: "Someone drew a small sculpture next to the word Montalto, then rubbed it out. Badly." Fence, flavour: "One strawberry stem. Evidence of a crime she'd admit to." Gum tree, flavour: "A kookaburra. Not laughing. Judging."
- Wrong turn, Arthurs Seat: "Chairlift attendant: 'View's great. She's not here.'"

**Red Hill** (scene: vineyard rows on the plateau, misty gullies, a long table under a tree, golden light). Choose from Ten Minutes by Tractor, Montalto, Paringa Estate.
- Correct, Montalto. Found card: PI at the end of the sculpture trail, dog asleep, one glass poured. Her only line in the game: "Took you long enough. Sit at the outside table. Better view, and the kingfish is the order."
- Wrong first pick: "The host at the door: 'Sculpture trail? That's next door.'" Second wrong pick: Sunset.

Sunset card: "Last light on the ridge. She's moved on. Her tab's still open somewhere." When a second seat joins a room, the notebook shows: "Two of you now. She'll be harder to miss."

## The six functions

`setup(players)`: `{ version: 1, caseId: "01", seed: 17, clock: 490, sunset: 1180, at: "mornington", route: ["mornington"], revealed: { witnesses: [], hotspots: [] }, notebook: { tells: [], clues: [], stamps: ["mornington"] }, wrongTurns: 0, hints: 0, finalAttempts: 0, status: "playing", seats: players }` (clock in minutes since midnight).

`validateAction`: refuse unknown seats; refuse everything except restart when status is not playing; refuse travel to the current place or an unknown slug; refuse ask/search for ids not at the current place or already revealed; refuse guess unless at the case's final place; refuse hint when nothing is left to reveal here. Actions that push the clock past sunset are allowed and resolve to status sunset in applyAction, so the player sees the last thing happen.

`applyAction`: pure, copy state, advance clock, append notebook entries as `{ text, place, by: playerId }`, set status found or sunset, compute rank on found. Randomness only from seed and only for flavour lines, never outcomes.

`isGameOver`: `{ over: status !== "playing", winner: status === "found" ? "all" : null }`, and restart must still work afterwards.

`viewFor`: return clock, sunset, at, route, stamps, revealed witness and hotspot text, notebook, status, rank, and for the current place the witness and hotspot ids with labels and revealed booleans only. Never return unrevealed text, the correct route, decoy flags or the final venue. Add a test in `tests/logic.test.ts` asserting that no view before found contains "cape-schanck", "main-ridge", "red-hill" or "montalto" as the answer.

Case content lives in a CASES constant inside `logic.js` as plain JSON so future cases can be dropped in.

## Assets (design/assets.csv, ten images maximum)

Backgrounds 16:9 at 1280×720: bg-mornington, bg-cape-schanck, bg-main-ridge, bg-red-hill as described above. Sprites 1:1 on a magenta key: spr-pi (woman in sun hat and terracotta linen walking away with a small scruffy dog on a rope lead), spr-witness-a (barista in apron with takeaway cup), spr-witness-b (park ranger in wide hat with binoculars), spr-witness-c (strawberry picker with punnet). Cover 3:2: PI walking off along the Cape Schanck boardwalk at golden hour, dog ahead, notebook in the foreground. Icon 1:1: rubber-stamp compass rose with a sun-hat brim. Reuse the three witness sprites for the other six witnesses with a CSS hue shift on apron or hat. Audio: amb-bay (calm bay water, gulls, distant market, 12s loop), amb-ocean (wind off the Strait, gannets, surf below cliffs, 12s), amb-ridge (hinterland dusk, magpies, leaves, 12s), sfx-stamp (rubber stamp thunk). The map is inline SVG, not an image.

## Copy rules

No em-dashes anywhere. PI never greets the player and never refers to herself in the third person; she speaks once, at the end. Sentences 8 to 18 words, witnesses may use 3 to 6 word sentences for punch. Name real things. Title card footer: "Peninsula Insider acknowledges the Bunurong people, Traditional Owners of the lands and waters of the Mornington Peninsula." Nothing else about culture or history is invented.

## Done means

Case 01 plays start to finish on a phone in under ten minutes with both outcomes reachable. Two tabs on the same room share one notebook and clock; a third tab still plays. The viewFor leak test passes. Preferences work before the first tap. `app-meta.json` carries the generated cover and a real `og_title`. Hand back the live URL, the four background paintings and the PI sprite as files, and a one-page `design/plan.md`.
