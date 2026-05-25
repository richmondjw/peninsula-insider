# Sprint 0 — Apple Paperwork Checklist

**Date:** 5 May 2026
**Owner:** James
**Outcome:** A registered bundle ID, an App Store Connect record, an APNs Auth Key, and an App Store Connect API Key — i.e. everything Sprint 1 needs to ship to TestFlight.
**Time:** ~30 min of clicking, then 24 h–2 weeks of Apple-side approval (depending on Decision 1).

> Read [`decisions-2026-05-05.md`](decisions-2026-05-05.md) first if you haven't. The two ⚠️ decisions there gate Step 2 and the repo work.

## Pre-flight (5 min)

- [ ] Decide on Apple ID. Use a stable one — account transfers are painful. Recommended: a dedicated apple-id like `apple@peninsulainsider.com.au` rather than a personal account, but if you're going Individual a personal Apple ID is fine.
- [ ] Confirm two-factor auth is enabled on that Apple ID. Apple Developer Program enrolment requires 2FA.
- [ ] Have a physical iOS device on hand for testing later (any iPhone running iOS 17+).
- [ ] Have Xcode installed (latest stable, currently Xcode 16). Command Line Tools also need to be installed: `xcode-select --install` in Terminal.
- [ ] Have a payment method ready ($99 USD).

## Step 1 — D-U-N-S Number (only if going Organisation)

Skip this step if enrolling as Individual.

1. Open <https://developer.apple.com/enroll/duns-lookup/>.
2. Select country **Australia**.
3. Search by your legal company name (e.g. "Optiflows Pty Ltd" or whatever entity owns Peninsula Insider).
4. **If a number is found** — note it down, move to Step 2.
5. **If not found** — request a new D-U-N-S number through that same page. Free for App Store Connect enrolment. Apple's intake form forwards to Dun & Bradstreet; takes 5–10 business days.

While waiting for D-U-N-S, you can still do everything in Sprint 1 that doesn't require a registered bundle ID — but you can't push to TestFlight until enrolled.

## Step 2 — Apple Developer Program enrolment

1. Open <https://developer.apple.com/programs/enroll/>.
2. Sign in with the Apple ID from Pre-flight.
3. Choose **Individual** or **Organisation** per Decision 1.
4. Pay $99 USD.
5. Wait for approval email.
   - Individual: typically 24–72 hours.
   - Organisation: typically 1–2 weeks (after D-U-N-S is in hand).

Do not start Step 3 until you receive "Welcome to the Apple Developer Program" email.

## Step 3 — Register the bundle ID

Once enrolled:

1. Open <https://developer.apple.com/account/resources/identifiers/list>.
2. Click **+** (top-left of identifiers list).
3. Choose **App IDs** → **Continue** → **App** → **Continue**.
4. Fill in:
   - **Description:** `Peninsula Insider`
   - **Bundle ID:** `Explicit` → `au.com.peninsulainsider.app`
5. Scroll the **Capabilities** list. Tick:
   - [x] **Sign In with Apple** (required — we already offer Google OAuth on the web)
   - [x] **Push Notifications**
   - [x] **Associated Domains** (for Universal Links)
   - [x] **Wallet** (Insider Pass)
6. Click **Continue**, then **Register**.

## Step 4 — APNs Auth Key

1. Open <https://developer.apple.com/account/resources/authkeys/list>.
2. Click **+**.
3. Name: `PI APNs Production`.
4. Tick **Apple Push Notifications service (APNs)**.
5. Click **Configure** next to APNs → leave the dropdown on `Sandbox & Production` (single key works for both) → **Save**.
6. Click **Continue** → **Register** → **Download**.
7. **Save the `.p8` file outside this repo.** Recommended path: `~/.apple-keys/AuthKey_<KEYID>.p8`.
8. Note these for later (you'll paste them into Supabase + EAS):
   - **Key ID** (10 chars, on the page after download)
   - **Team ID** (10 chars — find at <https://developer.apple.com/account#MembershipDetailsCard>)
   - The **bundle ID** you registered

Apple only lets you download the .p8 once. If you lose it, revoke the key and create a new one.

## Step 5 — App Store Connect record

1. Open <https://appstoreconnect.apple.com/apps>.
2. Click **+** → **New App**.
3. Fill in:
   - **Platforms:** iOS (tick only iOS for now)
   - **Name:** `Peninsula Insider`
   - **Primary Language:** English (Australia)
   - **Bundle ID:** `au.com.peninsulainsider.app` (the one from Step 3)
   - **SKU:** `pi-app-001`
   - **User Access:** Full Access
4. Click **Create**.
5. Inside the new app record → **App Information**:
   - **Subtitle:** `Mornington Peninsula concierge`
   - **Category:** Primary `Travel`, Secondary `Food & Drink`
   - **Content Rights:** tick "I have the rights" (we own the editorial corpus)
6. **Pricing and Availability** → set price tier `Free` for now (Pass purchases happen via Stripe or future IAP).

Don't worry about screenshots, description, keywords, or App Privacy details yet — those land in Sprint 3, before submission.

## Step 6 — App Store Connect API Key (for EAS)

1. In App Store Connect, go to **Users and Access** → **Integrations** tab → **Team Keys** → **Generate API Key**.
2. **Name:** `EAS Submit`.
3. **Access:** `App Manager` (sufficient for EAS).
4. Click **Generate**.
5. **Download the `.p8` file** (one-time only).
6. Save outside this repo: `~/.apple-keys/AuthKey_API_<KEYID>.p8`.
7. Note these for the EAS configuration:
   - **Issuer ID** (UUID at the top of the page)
   - **Key ID** (10 chars, next to the row you just generated)

## Step 7 — Hand the keys to Sprint 1

Once Steps 1–6 are done, fill in the values below into a local file at `~/.apple-keys/peninsula-insider.env` (DO NOT commit). Sprint 1 will read these.

```
# Peninsula Insider iOS — Apple credentials, do not commit
APPLE_TEAM_ID=
APPLE_BUNDLE_ID=au.com.peninsulainsider.app

# APNs key (Step 4)
APPLE_APNS_KEY_ID=
APPLE_APNS_KEY_PATH=~/.apple-keys/AuthKey_<KEYID>.p8

# App Store Connect API key (Step 6)
APPLE_ASC_ISSUER_ID=
APPLE_ASC_KEY_ID=
APPLE_ASC_KEY_PATH=~/.apple-keys/AuthKey_API_<KEYID>.p8

# Apple ID (used by EAS for some interactive flows)
APPLE_ID=
```

Once that file exists, ping Remy in the next session and we kick off Sprint 1 immediately.

## Common gotchas

- **Two-factor auth not enabled** → enrolment fails silently. Set it up before Step 2.
- **Wrong Apple ID associated with Org enrolment** → you can't change it later without a support ticket. Decide carefully.
- **D-U-N-S requested through a third-party paid service** → Apple's free portal is fine; don't pay anyone.
- **Bundle ID mismatch** → if you typo the bundle ID in Step 3 vs Step 5, App Store Connect will reject the App record. The bundle ID is case-sensitive.
- **APNs key revocation cascade** → deleting an APNs key kills push for any app using it. We have only one app, so safe — but be aware.
- **Lost .p8** → both Apple .p8 keys can only be downloaded once. Revoke and regenerate if lost.
