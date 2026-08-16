# Cloudflare edge — proxy enabled + first server-side 301s

**Date:** 2026-08-16 (~15:0x UTC)
**Zone:** peninsulainsider.com.au (`06ffbace3351617a7fe95cf1fdbe71ff`), Free Website plan
**Why:** GitHub Pages cannot emit a server-side 301. Every migrated URL was a
client-side stub carrying a canonical — a *hint* Google can and did decline
(`/places/hastings/`, `/places/dromana/` were "Submitted and indexed" with
Google canonicalising them to themselves). A 301 is a directive.

## Changes

1. **SSL/TLS mode `full` -> `strict`.** Applied *before* proxying, to avoid a
   redirect loop. Origin cert verified first: GitHub Pages serves a cert with
   SAN covering both `peninsulainsider.com.au` and `www.peninsulainsider.com.au`.
2. **Proxy enabled (orange cloud) on 5 records:** 4x apex A records
   (185.199.108-111.153) and the `www` CNAME (`richmondjw.github.io`).
   All mail/verification records (MX, SPF, DKIM, DMARC, SendGrid, Beehiiv,
   Amazon SES, `studio.`) left DNS-only — proxying those would break sending.
3. **Three Page Rules (301 forwarding).** Free plan cap is 3.

| # | Pattern | Target | URLs |
|---|---------|--------|------|
| 1 | `*peninsulainsider.com.au/places/*` | `/explore/places/$2` | 37 towns + index |
| 2 | `*peninsulainsider.com.au/escape/*` | `/explore/plans/$2` | 6 itineraries + index |
| 3 | `*peninsulainsider.com.au/spa/*` | `/explore/spas-and-wellness/` | 1 |

## Verified at the edge (not from the build)

Local DNS was still cached on GitHub's IPs, so requests were forced through a
freshly resolved Cloudflare IP (172.67.159.47).

- `server: cloudflare`, `cf-ray` present, TLS verified, apex 200
- `/places/{sorrento,mount-eliza,mornington,hastings}/` and `/places/` -> 301, 1 hop, 200 final
- `/escape/wellness-weekend/`, `/escape/` -> 301, 1 hop, 200 final
- `/spa/` -> 301 -> `/explore/spas-and-wellness/` 200
- Canonical targets unaffected: `/explore/places/sorrento/`, `/plans/`, `/boating/` all 200
- `www` -> 301 to apex, through Cloudflare

## Known gaps

- **Dynamic Redirect (Single Redirects) is NOT on the API token.** The rulesets
  API returns `Authentication error` (code 10000) — a missing permission, not a
  plan limit; Free does include Single Redirects. Adding
  `Zone -> Dynamic Redirect -> Edit` to the PI26 token lifts the cap from 3
  rules to ~10 and lets the remaining classes be covered.
- **Not yet covered** (no clean 1:1 wildcard, needs Dynamic Redirect):
  `/journal/*` (22 stubs, targets fan out to explore/fishing/boating/eat/stay),
  `/wine/*`, `/fish/`, `/golf/`, `/do/`, `/walks/`, `/eat-drink/`,
  `/our-approach/`, `/methodology/`, `/ethics/`, `/complaints/`,
  `/partner-with-us/`.
- **`/plans/*` deliberately NOT wildcarded.** `/plans/` is the canonical index
  (sitewide nav points at it, self-canonical, 204 KB) while `/plans/<slug>/`
  canonicalises to `/explore/plans/<slug>/`. A blanket rule would bounce
  `/plans/` -> `/explore/plans/` -> back to `/plans/`. The split is real and
  should be resolved in content before any edge rule touches it.
- **`/escape/` index** canonicalises to `/plans/`, not `/explore/plans/`, so the
  wildcard sends it via a 1-hop chain. One low-value URL; accepted.

## Reversal

Grey-cloud the 5 records (`proxied:false`) and the site is back to direct
GitHub Pages in seconds. Page Rules can be deleted independently.

Token: `credentials/cloudflare/pi-zone-env` (mode 600). The pre-existing tunnel
token at `credentials/cloudflare/env` was left untouched.
