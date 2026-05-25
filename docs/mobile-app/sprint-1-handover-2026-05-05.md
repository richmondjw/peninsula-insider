# Sprint 1 Handover — From Sprint 0 to TestFlight

**Date:** 5 May 2026
**Author:** Remy
**Status:** Draft, ready to execute once Sprint 0 is complete

This document tells future-Remy (or future-James) exactly how to start Sprint 1 the moment Apple approval lands.

## Preconditions (all from Sprint 0)

- [ ] Apple Developer Program: enrolled and approved
- [ ] Bundle ID registered: `au.com.peninsulainsider.app` with capabilities (SIWA, Push, Associated Domains, Wallet)
- [ ] App Store Connect record created with name "Peninsula Insider"
- [ ] APNs Auth Key downloaded; Key ID + Team ID noted
- [ ] App Store Connect API Key downloaded; Issuer ID + Key ID noted
- [ ] `~/.apple-keys/peninsula-insider.env` populated
- [ ] Decision 1 (Individual vs Org) and Decision 2 (monorepo vs separate repo) confirmed by James in [`decisions-2026-05-05.md`](decisions-2026-05-05.md)

## Sprint 1 goal

A signed-in Peninsula Insider app installed on James's iPhone via TestFlight, rendering Saved articles from the existing Supabase, with the Ask tab calling the existing `/ask` endpoint. Five working days, four if approval lands fast.

## Day-by-day plan

### Day 1 — Scaffold and auth

**Outcomes:** Expo project compiling locally, signed in via Supabase magic link.

1. From repo root: `npx create-expo-app@latest mobile --template default` — TypeScript + Expo Router default.
2. Add `mobile/` to repo's existing `.gitignore` for build outputs (`.expo`, `dist`, `ios/`, `android/`).
3. `cd mobile && npx expo install @supabase/supabase-js expo-secure-store expo-crypto react-native-url-polyfill`.
4. Create `mobile/lib/supabase.ts` mirroring `next/src/lib/auth.ts`. Use `expo-secure-store` for `auth.storage` so the session lives in iOS Keychain not AsyncStorage.
5. Wire magic-link sign-in screen: paste email → Supabase sends OTP → app handles redirect via deep link (custom scheme `peninsulainsider://`).
6. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to `mobile/.env.local` (use the same values as `next/.env`).

### Day 2 — Sign in with Apple, Saved tab

**Outcomes:** Apple sign-in works; Saved tab lists `article_saves` for the current user.

1. `npx expo install expo-apple-authentication`.
2. Configure Sign in with Apple in Supabase Auth dashboard: Services ID + key (from Step 4 of Sprint 0).
3. Add a "Continue with Apple" button on the auth screen (mandatory for App Store now that we offer Google).
4. Build `app/(tabs)/saved.tsx` that calls `c.from('article_saves').select('*')` exactly as `next/src/lib/auth.ts:listSaves` does. RLS already protects the data.
5. Each row renders a `SavedCard` — title, dek, image, link out to `https://peninsulainsider.com.au/<section>/<slug>`. Tap = open in in-app `expo-web-browser`.
6. Add a "Sign out" button that calls `supabase.auth.signOut()`.

### Day 3 — Ask tab + tab navigator

**Outcomes:** Ask tab posts to `/ask` and renders streaming response.

1. Identify the deployed `/ask` endpoint (Vercel function, Supabase Edge Function, or wherever — confirm with James). Copy its URL into an env var.
2. Build `app/(tabs)/ask.tsx`: chat thread UI, text input at the bottom, `fetch(askUrl, { method: 'POST', body: { question } })`.
3. Render messages using a `MessageBubble` component — style consistent with `BRAND-PI.md` voice rules (no em-dashes in any UI copy).
4. Add tab navigator: `app/(tabs)/_layout.tsx` with four tabs — Ask, Now, Saved, Pass. Now and Pass are placeholders for Sprint 1.
5. Splash screen + app icon: use the existing `pi-mark.svg` from `next/public/images/`. Generate iOS icon set via `npx expo-cli icon` or manual export. App icon must be 1024×1024 PNG, no transparency, no rounded corners (Apple adds those).

### Day 4 — Privacy manifest, EAS, first build

**Outcomes:** EAS Build completes; app installs on James's phone via QR code.

1. Add `mobile/ios/PrivacyInfo.xcprivacy` declaring required reasons for `UserDefaults` (CA92.1) and any other Required Reasons APIs Expo modules pull in.
2. `npx eas init` from `mobile/`. Choose existing project or create new — this links it to your EAS account.
3. Configure `eas.json`:
   - `preview` profile: internal distribution, simulator + ad-hoc.
   - `production` profile: store distribution.
4. Run `eas credentials --platform ios`. Paste API Key path + Issuer ID + Key ID from Sprint 0 Step 6. EAS auto-generates the distribution cert and provisioning profile.
5. `eas build --profile preview --platform ios`. Wait ~15 min. EAS sends a QR code; scan with iPhone camera; install.
6. Verify: open app, sign in with Apple, see Saved tab.

### Day 5 — TestFlight + EAS Update wired

**Outcomes:** Production build live on TestFlight internal; OTA update path tested.

1. Tag a release: `git tag -a v0.1.0 -m "Sprint 1 — TestFlight first build"`.
2. `eas build --profile production --platform ios`.
3. `eas submit --profile production --platform ios --latest`. EAS uploads to App Store Connect.
4. App Store Connect → Peninsula Insider → TestFlight → wait 10–15 min for build processing → "Manage" the build → choose `ITSAppUsesNonExemptEncryption: No`.
5. Add yourself to the **Internal Testing** group (instant; no beta review needed for internal).
6. Install via TestFlight app on iPhone.
7. Test the OTA path: change a string in Ask tab, `eas update --channel production --message "test ota"`. Verify it lands on the device after relaunch.
8. Update `CHANGELOG.md` with the v0.1.0 entry per `HANDOVER-CLAUDE.md` convention.

## Risk register for Sprint 1

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Apple approval slips beyond 72h | Medium | Decision 1 default is Individual; if delayed, scaffold locally without TestFlight push. |
| `/ask` endpoint isn't ready for cross-origin mobile calls | Medium | Confirm endpoint URL + CORS up front; add device ID header so concierge can rate-limit. |
| Sign in with Apple service ID misconfigured | Medium | Test on physical device, not simulator (SIWA needs a real Apple ID). |
| Privacy manifest missing for an Expo module | Medium | Run `npx expo-doctor` before EAS Build; it now flags missing manifests. |
| EAS Build queue is slow on free tier | Low | Pay $19/mo for priority builds during launch sprint; cancel after. |
| App Store Connect rejects "thin wrapper" | Low — Sprint 1 only ships internal testing, not external review | Ask + Saved are real native; no review until Sprint 3. |

## What Sprint 1 deliberately does NOT do

- Push notifications (Sprint 2)
- Universal Links / deep linking (Sprint 2)
- Now tab content (Sprint 2)
- Pass / Wallet (Sprint 3)
- Offline support (Sprint 3)
- App Store external review submission (Sprint 3)

## IAP decision tree for Insider Pass

This is the one strategic question Sprint 3 needs answered. Document the decision before then.

```
Is Insider Pass purchased and consumed entirely inside the iOS app?
├── Yes → Apple's IAP rules apply. 15–30% Apple cut. Use StoreKit 2.
└── No → can the Pass be purchased on the website (peninsulainsider.com.au) only?
    ├── Yes, web-only purchase, app just authenticates an existing pass → Reader Rule applies.
    │     The app can show Pass status without offering in-app purchase.
    │     This is the path App Store accepts most cleanly. Recommended.
    └── No, app needs to offer purchase → IAP only.

Are Pass perks digital (concierge access, premium content) or physical (event entry, vouchers, partner discounts)?
├── Mostly digital → Apple insists on IAP for digital subscription.
├── Mostly physical → Apple's "physical goods and services" exemption may allow Stripe, but get an explicit confirmation from Apple Review or a TRC ticket before submission.
└── Mixed → safest is web-purchase + app-authentication (Reader Rule) until product is settled.
```

**Recommendation:** Sprint 1 ships with no Pass-related screens. Sprint 2 adds a "View on web" link to the Pass tab. Sprint 3 makes the call based on where the Pass product lands commercially. This is a strategic decision James owns; Remy will surface it for review at start of Sprint 3.

## Files Sprint 1 will create or modify

```
mobile/                          (new, scaffolded by create-expo-app)
├── app/
│   ├── _layout.tsx              (root)
│   ├── (auth)/
│   │   └── sign-in.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── ask.tsx
│       ├── now.tsx              (placeholder)
│       ├── saved.tsx
│       └── pass.tsx             (placeholder)
├── components/
│   ├── MessageBubble.tsx
│   ├── SavedCard.tsx
│   └── SignInWithApple.tsx
├── lib/
│   └── supabase.ts
├── ios/PrivacyInfo.xcprivacy
├── app.json                     (Expo config — bundle ID, capabilities)
├── eas.json
├── package.json
└── .env.local                   (gitignored)

CHANGELOG.md                     (append v0.1.0 entry)
.gitignore                       (add mobile/ build artefacts)
```

That is Sprint 1 in full.
