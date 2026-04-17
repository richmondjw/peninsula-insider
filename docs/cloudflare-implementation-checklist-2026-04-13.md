# Cloudflare Implementation Checklist — Peninsula Insider

**Date:** 13 April 2026  
**Purpose:** Immediate hardening checklist for putting Peninsula Insider behind Cloudflare without breaking the current GitHub Pages + Astro V2 deployment.

---

## Goal
Add edge protection and control before search/chat increase the platform surface area.

---

## 1. DNS / proxy setup
- Move DNS for `peninsularinsider.com.au` and `www.peninsularinsider.com.au` into Cloudflare
- Proxy the active records through Cloudflare (orange cloud)
- Keep GitHub Pages origin as the backend target for now
- Verify SSL/TLS mode is appropriate for GitHub Pages setup

## 2. Core controls to enable immediately
- Bot Fight Mode
- Always Use HTTPS
- Auto Minify only if it does not interfere with build output
- basic caching defaults
- security event logging / analytics review

## 3. Verify after cutover
Check these exact routes after DNS/proxy changes:
- `/`
- `/V2/`
- `/V2/eat/`
- `/V2/stay/`
- `/V2/wine/`
- `/V2/whats-on/`
- `/V2/privacy/`
- `/V2/terms/`
- `/V2/sitemap-index.xml`

Also verify:
- `_astro` assets load correctly under `/V2/`
- Beehiiv embed still renders on newsletter page
- Google Analytics still loads
- canonical links and robots access are intact

## 4. Near-term next settings (after cutover is stable)
- WAF rules if noisy traffic appears
- rate limiting for obvious abusive request patterns
- bot score review
- page rules / cache rules only if needed after observation

## 5. Do not do yet
- aggressive country blocking
- over-tight WAF rules before baseline traffic is observed
- anything that risks blocking search engine indexing before route verification

## 6. Success criteria
- site still serves normally through Cloudflare
- no V2 path regressions
- bot visibility and control improved
- origin exposure reduced
- ready for future search and concierge surface expansion
