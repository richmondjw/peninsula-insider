# Peninsula Insider iOS App — Locked Decisions

**Date:** 5 May 2026
**Author:** Remy
**Status:** Sprint 0 — 2 items need James's call (flagged ⚠️ below). Everything else is locked.

## Product framing
Lifted directly from [`docs/peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md`](../peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md). Not re-derived here. The app is **PI in Your Pocket** — the curated, opinionated, context-aware Peninsula concierge. Editorial site stays separate as the SEO / authority engine.

## ⚠️ Decision 1 — Apple Developer Program enrolment type

| Option | Pros | Cons | Cost | Time |
|--------|------|------|------|------|
| **Individual** (recommended for speed) | Fastest enrolment; no D-U-N-S; can transfer to Org later | Seller name on App Store reads "James Richmond" not "Peninsula Insider" | $99 USD/yr | 24–72 hours |
| **Organisation** | Seller name reads "Peninsula Insider Pty Ltd" or your trading entity; cleaner for partnerships, advertising, Pass billing | Needs D-U-N-S Number (free, 5–10 business days for Australian entities); tax + legal entity verification | $99 USD/yr | 1–2 weeks total |

**Remy's recommendation:** **Enrol as Individual today** to unblock Sprint 1, then start the D-U-N-S process in parallel and transfer the account to the company entity once approved (Apple supports this and James doesn't lose anything in the transition). The seller name visibility cost is small relative to the time-to-launch cost.

**Override path:** If James wants the App Store seller name to read "Peninsula Insider" from day one, go straight to Organisation. Sprint 1 still proceeds locally; only TestFlight submission is gated on Apple approval.

→ **James, please confirm: Individual (default) or Organisation?**

## ⚠️ Decision 2 — Repo layout

| Option | Pros | Cons |
|--------|------|------|
| **Monorepo: `mobile/` directory in this repo (recommended)** | Shared types with `next/`, single CI, single source of truth for backend contract, easier for Claude Code to work across | Larger repo; build outputs need clearer separation |
| **Separate repo `peninsula-insider-app`** | Cleaner isolation; smaller clones | Duplicates type definitions; cross-repo refactors are painful; backend contract drift risk |

**Remy's recommendation:** **Monorepo with `mobile/` at repo root.** The web (`next/`) and the app share Supabase tables, types, the `/ask` endpoint contract, and the brand persona doc. Keeping them in one repo means a schema change is one PR, not two coordinated PRs.

→ **James, please confirm: Monorepo (default) or separate repo?**

## Decisions locked (no input needed)

### Bundle ID
**`au.com.peninsulainsider.app`**

Reverse-DNS form of `peninsulainsider.com.au`. Australian convention for AU-domain apps. Globally unique within Apple's namespace.

### App display name
**Peninsula Insider** (30-char limit, we use 17)

### Subtitle (30-char limit) — three candidates
1. **"Mornington Peninsula concierge"** (30) — most descriptive, exact category match
2. **"Your Peninsula concierge"** (24) — branded, less SEO
3. **"The Peninsula, with taste"** (25) — voice-led, on-brand for PI

**Default:** option 1 for App Store discoverability; revisit at submission if voice wins out.

### App SKU (internal)
**`pi-app-001`**

### Categories
- Primary: **Travel**
- Secondary: **Food & Drink**

### Age rating
**4+** (no objectionable content; concierge content is general audience)

### Capabilities to enable on App ID
- Sign in with Apple (mandatory once we offer Google OAuth, which we do)
- Push Notifications
- Associated Domains (Universal Links — `peninsulainsider.com.au` deep-links into the app)
- Wallet (for Insider Pass v1 PassKit integration; safe to enable up front)

### Stack (locked from research, 5 May)
| Layer | Choice |
|-------|--------|
| Frontend | Expo SDK 53+ with Expo Router, TypeScript |
| Editor | Cursor for inline + Claude Code in terminal for multi-file |
| Backend | Existing Supabase project (no new infra) |
| Build/CI | EAS Build + EAS Submit |
| OTA | EAS Update (JS-only fixes without re-review) |
| Auth | Supabase Auth — Google + magic link (already wired) + **add Sign in with Apple** |
| Push | Expo Push Service from Supabase Edge Function |
| Storage | Supabase Storage (already used) |
| Analytics/crash | PostHog or Sentry (TBD; both ship privacy manifests) |

### App Store seller / privacy contacts
- **Support URL:** `https://peninsulainsider.com.au/contact`
- **Marketing URL:** `https://peninsulainsider.com.au`
- **Privacy Policy URL:** `https://peninsulainsider.com.au/privacy`

### Privacy practices declaration draft (refined at submission)
- **Data linked to user:** email, user ID, content (saves, likes, lists, alerts preferences)
- **Data not linked:** none currently
- **Data not collected (initially):** location (added when Now-tab v0.5 ships), health, financial, browsing history, contacts, photos, audio
- **Tracking:** none

### Encryption export compliance
**`ITSAppUsesNonExemptEncryption = false`** in Info.plist — only standard HTTPS/TLS used.

### What's deferred (decided NOT now)
- Android via React Native — possible later from same Expo codebase; out of scope for v1
- Native Swift/SwiftUI — secondary path if the Expo build hits a wall on a specific feature
- Operator dashboard as a separate app target — feature flag inside the same app for v1
- IAP for Insider Pass — needs Apple guidance call before submission; v1 may launch Pass-free or with physical-only perks. See sprint-1-handover for the decision tree.
