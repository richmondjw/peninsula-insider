# Google Search Console auth — one-time setup

This connects the strategy brain to **live** Search Console data so the daily
loop pulls same-day performance instead of the last committed report.

Client ID provided: `375681744731-jgl3ath0p5r3e9g3njbo25cgrqa7eo5a.apps.googleusercontent.com`

> **A client ID alone cannot authenticate.** Google OAuth needs the paired
> **client secret** to run a one-time browser consent, which mints a **refresh
> token**. The automation then reuses that token headlessly — no browser ever
> again. Nothing sensitive is committed to git.

## Step 1 — get the client secret (2 min, once)

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
the OAuth 2.0 Client ID matching the ID above (must be a **Desktop app** client):
download its JSON. It contains `client_secret`. Confirm the **Search Console API**
is enabled for the project, and that your Google account is a **verified owner**
of `sc-domain:peninsulainsider.com.au` in Search Console.

## Step 2 — mint the token locally (once, needs a browser)

```bash
cp ops/gsc-auth/gsc-client-secret.example.json ops/config/gsc-client-secret.json
# edit ops/config/gsc-client-secret.json: paste client_secret + project_id
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
python3 ops/scripts/gsc-search-analytics.py
```

The first run opens a browser for consent, then writes `ops/tokens/gsc-token.json`
(both `ops/config/` and `ops/tokens/` are gitignored — they never reach the repo).
From then on, local runs refresh automatically.

## Step 3 — wire it into the daily GitHub Action (headless)

So CI never needs a browser, hand it the token as a secret:

```bash
# the token minted in step 2 — paste its contents as a repo secret
gh secret set GSC_TOKEN_JSON < ops/tokens/gsc-token.json
```

(Or paste the file contents at **Settings → Secrets and variables → Actions →
New repository secret**, name `GSC_TOKEN_JSON`.)

`daily-content.yml` already installs the Google libraries and passes
`GSC_TOKEN_JSON` to the engine. On the next run, `gsc_client.py` loads the token
from the environment (`_load_env_token`), refreshes it silently, and the strategy
brain gets same-day GSC data. If the secret is absent, everything still runs —
the brain falls back to the last committed report (graceful, never stalls).

## How the code resolves credentials

`ops/scripts/gsc_client.get_credentials()` tries, in order:
1. `GSC_TOKEN_JSON` env var (headless / CI — preferred)
2. `ops/tokens/gsc-token.json` (local cache)
3. `ops/config/gsc-client-secret.json` or `GSC_CLIENT_SECRET_JSON` → interactive consent

## Security

- Never commit `ops/config/gsc-client-secret.json` or `ops/tokens/*` (gitignored).
- The client **ID** is not secret (it's sent to browsers); the client **secret**
  and the **token** are — keep them in the local gitignored files or GitHub secrets.
- The requested scopes are read-only Search Console (`webmasters.readonly`).
