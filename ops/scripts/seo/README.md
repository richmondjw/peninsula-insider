# Peninsula Insider — SEO ops scripts

Daily Search Console pulls, indexation tracking, and the artefacts that drive the SEO daily review cycle.

## One-time setup

```bash
cd ops/scripts/seo
npm install
npm run auth
```

`npm run auth` opens a browser to authorise the Google account that has Search Console access to `peninsulainsider.com.au`. Saves a refresh token to `ops/tokens/gsc-token.json` (gitignored). After this, all subsequent pulls are non-interactive.

## Daily pull

```bash
cd ops/scripts/seo
npm run pull
```

Outputs:

| Path | Purpose |
|---|---|
| `ops/data/seo/YYYY-MM-DD.json` | Raw snapshot — performance, indexation, URL inspection results. Source of truth for diffs. |
| `ops/reports/seo/daily-log.md` | Human-readable digest, appended each run. The doc we read every morning. |

## Files

| File | Purpose |
|---|---|
| `package.json` | Local deps (googleapis only) — does not affect the Astro build. |
| `config.mjs` | Paths and the priority URL list inspected on every pull. Edit `PRIORITY_URLS` to change what gets URL-inspected. |
| `auth.mjs` | One-time OAuth bootstrap. |
| `pull.mjs` | Daily Search Console pull + digest renderer. |

## Notes

- GSC data has a ~2-day reporting lag — today's pull covers up to (today − 2).
- URL inspection has a stricter quota (~2,000 URLs/day per property). Keep `PRIORITY_URLS` to ~20 URLs.
- The OAuth refresh token in `ops/tokens/gsc-token.json` does not expire under normal use. If the pull starts failing with `invalid_grant`, re-run `npm run auth`.
- Credentials never leave `ops/tokens/` and that directory is gitignored at repo root.
