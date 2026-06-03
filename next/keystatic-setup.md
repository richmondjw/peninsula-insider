# Keystatic CMS — Setup Guide

Step-by-step instructions to get the Keystatic GitHub-backed CMS editor live
so Emma can edit content from a hosted URL, with changes coming in as PRs.

## Overview

1. Create GitHub OAuth App → get Client ID + Secret
2. Generate a random KEYSTATIC_SECRET
3. Deploy to Cloudflare Pages with the env vars
4. Set the OAuth callback URL to match the CF Pages URL
5. Done — Emma visits `/keystatic` to start editing

---

## Step 1 — Create GitHub OAuth App

Go to: https://github.com/settings/applications/new

Fill in:

| Field | Value |
|---|---|
| **Application name** | Peninsula Insider CMS |
| **Homepage URL** | `https://cms.peninsulainsider.com.au` (or your CF Pages URL) |
| **Authorization callback URL** | `https://<cf-pages-url>/api/keystatic/github/oauth/callback` |

> ⚠️ The callback URL must be exact. You may need to come back and update it
> once you know your Cloudflare Pages URL (Step 4).

Click **Register application**.

Copy:
- **Client ID** → `KEYSTATIC_GITHUB_CLIENT_ID`
- Click **Generate a new client secret** → copy it → `KEYSTATIC_GITHUB_CLIENT_SECRET`

---

## Step 2 — Generate KEYSTATIC_SECRET

Run this locally to generate a random secret:

```bash
openssl rand -hex 32
```

Copy the output → `KEYSTATIC_SECRET`

---

## Step 3 — Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Authorise Cloudflare to access `richmondjw/peninsula-insider`
3. Select the `richmondjw/peninsula-insider` repo

### Build settings

| Setting | Value |
|---|---|
| **Framework preset** | Astro |
| **Build command** | `pnpm build` |
| **Build output directory** | `dist` |
| **Root directory** | `next` |

### Environment variables

In **Settings → Environment variables**, add:

| Variable | Type | Value |
|---|---|---|
| `KEYSTATIC` | Variable | `1` |
| `KEYSTATIC_GITHUB_CLIENT_ID` | Variable | Your Client ID from Step 1 |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | **Secret** | Your Client Secret from Step 1 |
| `KEYSTATIC_SECRET` | **Secret** | Your random hex string from Step 2 |

> Mark the `_SECRET` variables as **Secrets** so they're not visible in the
> dashboard after saving.

Click **Save and Deploy**.

---

## Step 4 — Update OAuth callback URL

Once CF Pages gives you a URL (e.g. `peninsula-insider-cms.pages.dev`):

1. Go back to your GitHub OAuth App: https://github.com/settings/developers → **OAuth Apps**
2. Update the **Authorization callback URL** to:
   ```
   https://peninsula-insider-cms.pages.dev/api/keystatic/github/oauth/callback
   ```
   (replace with your actual CF Pages URL)

If you set up a custom domain (e.g. `cms.peninsulainsider.com.au`), use that
instead.

---

## Step 5 — Give Emma access

Emma needs to be able to authenticate via the OAuth app. Two options:

**Option A — Collaborator (recommended for now)**
Add Emma as a collaborator on `richmondjw/peninsula-insider`:
- Repo → **Settings** → **Collaborators** → **Add people**
- Add Emma's GitHub username
- Select **Write** access

**Option B — GitHub App (better for teams, more complex)**
Use a GitHub App instead of an OAuth App for finer-grained permissions.
See Keystatic docs: https://keystatic.com/docs/github-app

---

## Emma's editor URL

```
https://<cf-pages-project>.pages.dev/keystatic
```

or with custom domain:

```
https://cms.peninsulainsider.com.au/keystatic
```

Emma signs in with her GitHub account → edits content → saves → PR is created
with branch prefix `keystatic/` → James reviews and merges → site deploys.

---

## GitHub Actions — Production build

The existing deploy workflow at `.github/workflows/deploy.yml` builds with
`npm run build:search` which does NOT set `KEYSTATIC=0` explicitly.

**Action needed:** Add `KEYSTATIC=0` to the Build Astro site step in `deploy.yml`
so the production GitHub Pages build stays fully static and does not require the
GitHub OAuth env vars.

Find the "Build Astro site" step in `.github/workflows/deploy.yml` and add to
its `env:` block:

```yaml
- name: Build Astro site
  working-directory: next
  env:
    KEYSTATIC: '0'          # ← add this line
    PUBLIC_CONCIERGE_API_URL: ...
    # ... rest of existing env vars
```

Without this, the GitHub Actions build will attempt to include the keystatic()
integration (since `KEYSTATIC` is unset) and will output `server` mode instead
of `static`. This will cause the build to produce a server bundle instead of
static HTML, breaking the GitHub Pages deploy.

---

## Summary of env vars

| Variable | Where | Description |
|---|---|---|
| `KEYSTATIC` | CF Pages + GitHub Actions | `1` for CMS, `0` for static prod build |
| `KEYSTATIC_GITHUB_CLIENT_ID` | CF Pages | OAuth App Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | CF Pages (secret) | OAuth App Client Secret |
| `KEYSTATIC_SECRET` | CF Pages (secret) | Random signing secret |

---

## How content changes flow

```
Emma edits in Keystatic UI
        ↓
Keystatic creates PR: keystatic/venues-jackalope-1234567890
        ↓
James reviews PR on GitHub
        ↓
James merges PR
        ↓
GitHub Actions deploy.yml triggers (manual dispatch)
        ↓
Static site rebuilds with KEYSTATIC=0
        ↓
peninsulainsider.com.au updates
```

---

## Troubleshooting

**OAuth callback URL mismatch:**
The CF Pages URL and the OAuth App callback URL must match exactly (including
trailing slash behaviour). If you see a GitHub error about invalid redirect URI,
double-check the callback URL in your OAuth App settings.

**Build fails with "KEYSTATIC_GITHUB_CLIENT_ID not set":**
Ensure all four env vars are set in CF Pages. Check Settings → Environment
variables → make sure they apply to "Production" deployments.

**Emma gets "Not authorized" after OAuth:**
Emma needs to be a collaborator on the repo with at least Write access (Step 5).

**GitHub Actions build produces server bundle:**
Add `KEYSTATIC: '0'` to the Build Astro site step's env block (see section
above).
