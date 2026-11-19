# Ask PI voice release configuration

Prepared configuration only. The JSON beside this document has NOT been applied to Cloudflare. It is not consumed by the site's deployment workflow.

## Observed owner and baseline

On 19 November 2026 the signed-in Cloudflare dashboard showed the active Response Header Transform Rule **Set baseline browser security headers**, ID `ba0560cec4844455a5141809c6c8bf99`, for zone `peninsulainsider.com.au` (`06ffbace3351617a7fe95cf1fdbe71ff`). It matches all incoming requests, is first in its phase, and sets:

- Content-Security-Policy: `object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests`
- Permissions-Policy: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- Referrer-Policy: `strict-origin-when-cross-origin`
- X-Content-Type-Options: `nosniff`
- X-Frame-Options: `SAMEORIGIN`

Normal owner route: Cloudflare dashboard, this zone, Rules, Response Header Transform Rules. No worker, origin change, new credential or service is needed. Preserve the existing baseline rule completely.

## Narrow proposed exception

Create `ask-voice-header-rule.json` as a new response-header transform **after the baseline rule**. Use Set static, not Add, so only one effective Permissions-Policy remains. It changes only microphone from deny to self, and only for HTTPS GET/HEAD on the exact canonical host and raw/normalised `/ask/` path. Queries do not widen the path. `/ask`, `/ask/index.html`, encoded aliases, subpaths, other hosts and assets stay denied unless they redirect to the canonical document.

The exception permits the browser to ask for microphone permission; it does not grant that permission. The UI requires disclosure and a separate Start action. Recognition is guarded by canonical pathname and effective document policy. The dedicated page omits ClientRouter, so crossing the boundary loads a new document. Shared chat mic links use a plain `/ask/` URL and force reload; no unsent text goes into the auto-submitting `q` parameter.

## Release gates and verification

Owner approval on 19 November authorizes this narrow exception and publication after verification. Do not apply or publish until the exact code/config has independent review and required CI passes. Native recognition and an appropriate iPhone Safari capture check remain distinct from fake-recognition tests. If controlled real-device QA is unavailable, retain draft status and report the gap.

Controlled tests must prove allow on `/ask/` and denial on `/`, `/about/`, `/privacy/`, `/ask/index.html`, and JS/CSS assets; camera, geolocation, payment and USB remain denied everywhere. Test full navigation into/out of Ask, shared link, back/forward, denied permissions, cancel, no-speech/error fallback, text edits, and no automatic submission. Browser-provider disclosure must precede capture; local recognition must never silently retry online.

After authorized application and publication, verify public deployment.json ancestry, the exact route and asset headers, effective browser policy, and browser permission approval/denial. Capture a controlled non-sensitive phrase, edit it and cancel; do not send a customer question. Record browser/OS/device and label emulation accurately. Do not treat mocked speech events as audio evidence.

## Rollback

Disable only the newly added exception. The untouched baseline then denies microphone on every route again. Verify public `/ask/` and asset headers/effective browser policy. If code rollback is needed, revert this PR normally. Do not weaken or delete the baseline rule, change unrelated headers, purge unrelated configuration, or bypass a denial.

References: [Cloudflare response header transforms](https://developers.cloudflare.com/rules/transform/response-header-modification/), [Astro router opt-out](https://docs.astro.build/en/guides/view-transitions/), [WebKit speech/Siri prerequisite](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/).
