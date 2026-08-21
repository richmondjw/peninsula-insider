# Redirect Rules — paste-ready list (Cloudflare UI)

**Why this exists:** the PI26 API token cannot reach the
`http_request_dynamic_redirect` ruleset phase. Confirmed by probe on
2026-08-16: three other zone phases return "could not find entrypoint ruleset"
(authorised, empty) while this one returns "request is not authorized", and a
`PUT` to create the entrypoint fails the same way. Adding
`Zone -> Dynamic Redirect -> Edit` and `Account -> Account Rulesets -> Edit`
(with the account resource included) did not lift it. Not worth further
credential rounds — these can be entered once by hand instead.

**Where:** Cloudflare dashboard -> peninsulainsider.com.au -> **Rules** ->
**Redirect Rules** -> Create rule. No API permission needed.

**Per rule:** name it, choose **Custom filter expression**, paste the
expression, then under Then: **Type = Static**, **Status = 301 (Permanent)**,
**Preserve query string = off**, target URL as given.

Free plan allows 10 rules. These are the 10 highest-URL-count groups,
covering 25 legacy URLs. Already covered by existing Page Rules and NOT
repeated here: `/places/*`, `/escape/*`, `/spa/*`.

---

### 1. Boat hire (4 URLs) -> https://peninsulainsider.com.au/boating/hire/
```
(http.request.uri.path in {"/boating/boat-hire/" "/boating/hire/rye-boat-hire/" "/boating/hire/sorrento-boat-hire/" "/journal/mornington-peninsula-boat-hire/"})
```

### 2. Editorial approach (3) -> https://peninsulainsider.com.au/editorial-approach/
```
(http.request.uri.path in {"/ethics/" "/methodology/" "/our-approach/"})
```

### 3. Walks (3) -> https://peninsulainsider.com.au/explore/walks/
```
(http.request.uri.path in {"/explore/best-walks/" "/explore/mornington-peninsula-walk/" "/walks/"})
```

### 4. Accommodation (3) -> https://peninsulainsider.com.au/stay/best-accommodation/
```
(http.request.uri.path in {"/explore/where-to-base-yourself/" "/journal/where-to-stay-mornington-peninsula/" "/stay/where-to-stay-mornington-peninsula/"})
```

### 5. Golf (3) -> https://peninsulainsider.com.au/explore/golf/
```
(http.request.uri.path in {"/golf/" "/journal/best-golf-courses-mornington-peninsula/" "/journal/mornington-peninsula-golf-guide/"})
```

### 6. Boat ramps (2) -> https://peninsulainsider.com.au/boating/ramps/
```
(http.request.uri.path in {"/boating/ramp/" "/journal/mornington-peninsula-boat-ramps/"})
```

### 7. Port Phillip Estate (2) -> https://peninsulainsider.com.au/wine/port-phillip-estate/
```
(http.request.uri.path in {"/eat/port-phillip-estate-restaurant/" "/stay/port-phillip-estate/"})
```

### 8. Eat hub (2) -> https://peninsulainsider.com.au/eat/
```
(http.request.uri.path in {"/eat-drink/" "/journal/where-to-eat-mornington-peninsula/"})
```

### 9. Fishing charters (2) -> https://peninsulainsider.com.au/fishing/charters/
```
(http.request.uri.path in {"/fishing/charter/" "/journal/mornington-peninsula-fishing-charters/"})
```

### 10. Beaches (2) -> https://peninsulainsider.com.au/explore/beaches/
```
(http.request.uri.path in {"/journal/mornington-peninsula-beach-guide/" "/journal/the-peninsula-beach-swimming-guide/"})
```

---

## Deliberately excluded

- **`/plans/*`** — `/plans/` is the canonical index (sitewide nav, self-canonical,
  204 KB) while `/plans/<slug>/` canonicalises to `/explore/plans/<slug>/`. A
  wildcard would bounce `/plans/` -> `/explore/plans/` -> back. Fix the content
  split first.
- **~30 one-off journal/wine stubs** with distinct targets (squid, snapper,
  King George whiting, hot springs guide, rainy day, with-kids, dog-friendly x4,
  markets x5, truffles, strawberry farm, breweries, distilleries, Ashcombe Maze,
  Moorooduc, Barmah Park, Balnarring market, couples, corrections, partners,
  free things, things-to-do, cellar doors, spas x2, fishing locations/species).
  Each needs its own target, so they cannot share a rule and there is no slot
  for them. They keep their `consolidate`-mode canonical stubs from Phase 0,
  which is a correct implementation — a hint rather than a directive, but the
  equity does pass. Do NOT collapse them onto a shared target to save rule
  slots: that would redirect each to a less relevant page, which is worse than
  the stub.
