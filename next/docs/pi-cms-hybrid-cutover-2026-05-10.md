# PI CMS Hybrid Cutover Plan — 2026-05-10

## Why this exists

The CMS/admin layer now has three real parts:
- editable UI seams in the Astro source
- structured content backing for homepage admin surfaces
- schema + migration plan for content, media, revisions, and admin allowlist

What it still does **not** have is honest server-side protection.

As long as the app is pure static output, `/admin` can only be cosmetic. Real route protection, session checks, and write endpoints require server execution.

## Recommended cutover shape

### 1. Keep public rendering mostly static in practice
Use Astro server output on Vercel, but preserve `prerender = true` for public-first pages wherever we want static characteristics.

### 2. Turn on hybrid admin mode behind an env flag
Use `PI_ADMIN_HYBRID=1` to activate:
- Astro server output via Vercel adapter
- `src/middleware.ts` admin route protection
- redirect unauthenticated users to `/admin/login`
- 401 on protected admin API routes

### 3. Keep the public site stable during cutover
The admin rollout should not force a full app re-architecture in one shot. The switch should be deployment-gated and reversible.

## What has already been scaffolded
- `src/middleware.ts`
- `src/pages/admin/login.astro`
- env-gated hybrid config in `astro.config.mjs`
- route helpers in `src/lib/admin.ts`

## Next secure step
The current admin gate still relies on the existing admin hint (`?admin=1` / cookie seam). That is fine as a transitional scaffold, but not good enough for production.

Production-grade next step:
1. Validate Supabase user session server-side
2. Check `pi.profiles.is_editor = true`
3. Check explicit allowlist / publish rights in CMS admin table
4. Set a short-lived server cookie or session contract for admin routes
5. Reject all writes that do not pass server validation

## Suggested implementation order
1. Enable `PI_ADMIN_HYBRID=1` in a preview environment only
2. Confirm `/admin/login` and middleware behaviour on preview
3. Add server-side Supabase session validation
4. Upgrade admin API routes from scaffold to real reads/writes
5. Connect homepage fields to CMS tables instead of JSON-only backing
6. Extend editable coverage from homepage to hero components on `eat`, `stay`, `whats-on`

## Principle
The admin layer should feel small, elegant, and deliberate.
The shift to hybrid/server mode is infrastructure work in service of trust — not a reason to bloat the product.
