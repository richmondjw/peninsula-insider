# Keystatic CMS — Cloudflare Pages Deployment

This document captures the Cloudflare Pages build settings for the Keystatic
CMS editor deployment. The editor runs as a separate Cloudflare Pages project
pointing at the same repo as the main static site.

## Why separate deployments?

The live site (`peninsulainsider.com.au`) is a fully static GitHub Pages build.
Keystatic needs a server runtime to handle GitHub OAuth callbacks and render the
editor UI. Cloudflare Pages (with server-side rendering) handles this cleanly
without touching the main static deployment.

## Cloudflare Pages project settings

| Setting | Value |
|---|---|
| **Framework preset** | Astro |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `next` |
| **Node.js version** | `22` |

## Environment variables (set in CF Pages dashboard)

| Variable | Value |
|---|---|
| `KEYSTATIC` | `1` |
| `KEYSTATIC_GITHUB_CLIENT_ID` | From GitHub OAuth App (see keystatic-setup.md) |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | From GitHub OAuth App (see keystatic-setup.md) |
| `KEYSTATIC_SECRET` | Random 32-char hex string (run: `openssl rand -hex 32`) |

> **Important:** `KEYSTATIC_GITHUB_CLIENT_SECRET` is sensitive — add it as a
> Secret (not a Variable) in the CF Pages dashboard.

## Editor URL

Once deployed, Emma's editor is at:

```
https://<cf-pages-project>.pages.dev/keystatic
```

Or with a custom domain:

```
https://cms.peninsulainsider.com.au/keystatic
```

## How it works

1. Emma visits `/keystatic` on the CF Pages URL
2. Keystatic redirects to GitHub OAuth (via `/api/keystatic/github/oauth/callback`)
3. Emma authorises the OAuth app with her GitHub account
4. Keystatic shows the editor — all reads/writes go directly to the
   `richmondjw/peninsula-insider` repo
5. When Emma saves, Keystatic opens a PR against `main` with prefix `keystatic/`
6. James reviews and merges → GitHub Actions deploys the site

## Notes

- Emma needs to be a collaborator on `richmondjw/peninsula-insider` (or the repo
  can be accessed via the OAuth app's `repo` scope)
- Branches created by Keystatic follow the pattern `keystatic/<slug>-<timestamp>`
- The CF Pages project only serves the editor — it does NOT replace the static
  GitHub Pages site
- All content writes are PRs, so Emma cannot accidentally break production
