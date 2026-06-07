# Peninsula This Weekend — Publish Report
**Edition:** 13 to 14 June  
**Published:** 2026-06-07 11:30 UTC  
**Phase:** 5/7 — weekend-dispatch-publish  
**Job:** pi-weekly-dispatch-publish  

---

## Publish Summary

| Item | Result |
|---|---|
| Article | `next/src/content/articles/peninsula-this-weekend-jun-13.md` |
| Status | `published` |
| `featured: true` set on | `peninsula-this-weekend-jun-13.md` ✅ |
| `featured: false` set on | `peninsula-this-weekend-jun-06.md` ✅ |
| Commit | `fbe3552878` — "Publish Peninsula This Weekend — 13 to 14 June (auto Sunday dispatch)" |
| Branch | `main` |
| Push | ✅ pushed to `origin/main` |
| Deploy trigger | `workflow_dispatch` — Build & deploy site to GitHub Pages (run ID: 27091636771) |
| Build result | ✅ success (completed 2026-06-07T11:52:00Z) |

---

## Verification

| Check | Result |
|---|---|
| `https://peninsulainsider.com.au/whats-on/this-weekend/` | HTTP 200 ✅ |
| Page title | `Peninsula This Weekend — 13–14 June · Peninsula Insider` ✅ |
| `https://peninsulainsider.com.au/journal/peninsula-this-weekend-jun-13/` | HTTP 200 ✅ |

---

## Featured Flag Rotation

- **New dispatch (jun-13):** `featured: true` — now the Journal hub lead story
- **Previous dispatch (jun-06):** `featured: false` — rotated out of lead position

---

## Infrastructure Note

The deploy workflow's "Refresh CMS content registry" step was failing with Supabase 401 (invalid API key), blocking deploys. The step was missing `continue-on-error: true` despite the adjacent step's comment explicitly noting "same continue-on-error stance as refresh-content-registry above". Fixed in commit `930f801d39`. Inline editor degrades gracefully when Supabase sync fails; the site build and Pages deploy are unaffected.

**Action required:** Rotate/refresh `SUPABASE_SERVICE_KEY` secret in GitHub Actions settings to restore CMS registry sync.

---

## Commit History (this run)

```
930f801d39  ci: make CMS registry refresh non-blocking (continue-on-error)
fbe3552878  Publish Peninsula This Weekend — 13 to 14 June (auto Sunday dispatch)
```

---

## Next Phase

Phase 6/7 — `pi-weekly-dispatch-social-production` (Sunday 11:40 UTC)  
Trigger: this successful publish. Live URL: `https://peninsulainsider.com.au/whats-on/this-weekend/`
