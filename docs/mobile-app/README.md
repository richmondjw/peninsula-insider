# Peninsula Insider — Mobile App Workspace

This folder holds planning, decisions, and handover docs for the **Peninsula Insider iOS app** — the native concierge product proposed in [`docs/peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md`](../peninsula-insider-pocket-concierge-app-strategy-2026-04-14.md).

## Strategic shift from the April thesis

The 14 April strategy doc concluded "PWA first, Capacitor iOS later." On 5 May 2026, after fresh research into 2026 vibe-coding tooling and App Store dynamics, the decision flipped to **Expo (React Native) first** for iOS. Reasons in one paragraph:

- LLM codegen quality on TypeScript + Expo Router is materially better than on Capacitor or pure Swift, and Claude Code's strengths line up with Expo's conventions.
- Apple's "thin wrapper" review bots are stricter on Capacitor (ITMS-90338 history); Expo + native chat + push + Wallet + offline saves clears the bar comfortably.
- EAS Build / Submit / Update collapse the build–TestFlight–OTA surface area to a handful of CLI calls.
- The differentiated features that make this app worth shipping (push, Apple Wallet Pass, Sign in with Apple, offline saves, location) need real native APIs anyway.

The April thesis on **what** the product is — opinionated concierge, taste-led, focused, context-aware — stands. Only the **how** has changed.

## Documents in this folder

| File | What it is |
|------|-----------|
| [`decisions-2026-05-05.md`](decisions-2026-05-05.md) | Locked decisions (bundle ID, app name, repo layout, stack). Two require James's call. |
| [`sprint-0-apple-paperwork-2026-05-05.md`](sprint-0-apple-paperwork-2026-05-05.md) | Step-by-step checklist for Apple Developer enrolment + identifiers + keys. |
| [`sprint-1-handover-2026-05-05.md`](sprint-1-handover-2026-05-05.md) | What needs to be in place before scaffolding the Expo app, and the day-by-day Sprint 1 plan. |

## Sprint 0 status

| Item | Status | Owner |
|------|--------|-------|
| Strategic shift documented | Done | Remy |
| Decisions drafted | Done — 2 awaiting James | Remy |
| Apple Developer enrolment | Pending | James |
| App Store Connect record | Pending Apple approval | James |
| APNs Auth Key | Pending Step 4 | James |
| App Store Connect API Key | Pending Step 6 | James |
| Bundle ID registered | Pending Step 3 | James |
| Repo scaffold | Sprint 1 | Remy |
