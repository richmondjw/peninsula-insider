# Google Search Console auth: one-time setup

This connects the strategy brain to **live** Search Console data, so the daily
loop works from the last few days of search performance.

**Status (2026-11-25): not set up.** The `GSC_TOKEN_JSON` repository secret is
empty, so the daily job has never pulled Search Console data: every strategy
snapshot since the first on 2026-07-06 carries the same search period, ending
2026-04-19. The reports in `ops/reports/` were last committed on 2026-04-22,
after a pull made on a local machine. Until the steps below are done, the
strategy brief opens with a stale-data warning, withholds every search-derived
priority and reports itself degraded.

Client ID provided: `375681744731-jgl3ath0p5r3e9g3njbo25cgrqa7eo5a.apps.googleusercontent.com`

> **A client ID alone cannot authenticate.** Google OAuth needs the paired
> **client secret** to run a one-time browser consent, which mints a **refresh
> token**. The automation then reuses that token headlessly, with no browser
> ever again. Nothing sensitive is committed to git.

## What only the owner can do

Three things, about ten minutes in total. They need a browser signed in to the
Google account that owns the Search Console property, so they cannot be done by
an agent or by CI.

1. Download the OAuth client secret (step 1).
2. Approve the consent screen once, locally (step 2).
3. Save the resulting token as the `GSC_TOKEN_JSON` secret (step 3).

## Step 1: get the client secret (2 min, once)

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
open the OAuth 2.0 Client ID matching the ID above (it must be a **Desktop app**
client) and download its JSON. It contains `client_secret`.

While you are there, confirm three things:

- The **Search Console API** is enabled for the project.
- Your Google account is a **verified owner** (or full user) of
  `sc-domain:peninsulainsider.com.au` in Search Console.
- The OAuth consent screen's **publishing status is "In production"**, not
  "Testing". Google expires refresh tokens issued by an app in Testing after
  seven days, which would take the feed down again a week after you set it up.
  (Google has moved this setting between menus more than once: look for
  "Publishing status" under the OAuth consent screen or Audience.)

## Step 2: mint the token locally (once, needs a browser)

```bash
cp ops/gsc-auth/gsc-client-secret.example.json ops/config/gsc-client-secret.json
# edit ops/config/gsc-client-secret.json: paste client_secret + project_id
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
python3 ops/scripts/gsc-search-analytics.py --check
```

The first run opens a browser for consent, writes `ops/tokens/gsc-token.json`,
then prints the property's impressions and clicks for the last 28 days. Seeing
those numbers means the token works. `--check` writes no report.

Both `ops/config/` and `ops/tokens/` are gitignored. They never reach the repo.
From then on, local runs refresh the token automatically.

## Step 3: hand the token to the daily GitHub Action (headless)

```bash
gh secret set GSC_TOKEN_JSON < ops/tokens/gsc-token.json
```

Or paste the file's contents at **Settings, Secrets and variables, Actions, New
repository secret**, name `GSC_TOKEN_JSON`. Paste the **token** file, not the
client secret file from step 1: the scripts reject the client secret with a
message saying so.

## Step 4: confirm it works, without waiting for tomorrow

Run the **Strategy Engine** workflow by hand (Actions, Strategy Engine, Run
workflow). Its `Search Console feed check` job authenticates with the secret and
prints the property totals in the run summary. It writes and commits nothing.

- Green with numbers: done. The next daily run (06:00 AEST) pulls fresh data,
  commits both reports with the strategy, and the brief loses its warning.
- Red: the job log gives one of the reasons in the table below.

Do not use the daily workflow's `dry_run` input for this. The orchestrator does
not honour it, so a "dry run" publishes.

## What the daily job does with it

`engine/orchestrator.py` runs `ops/scripts/gsc-search-analytics.py` and
`ops/scripts/gsc-coverage-monitor.py` before the strategy step, then commits
`ops/reports/gsc-search-analytics.md` and `ops/reports/gsc-coverage-report.md`
alongside `ops/strategy/`.

A pull that fails never fails the publish, but it is no longer silent:

| Outcome | Meaning | What to do |
|---|---|---|
| `ok` | Reports refreshed | Nothing |
| `no-credentials` | `GSC_TOKEN_JSON` is not set | Steps 1 to 3 |
| `auth-failed` | Google rejected the token (expired, revoked, or the wrong file was pasted) | Mint a new token (step 2), replace the secret (step 3) |
| `api-error` | The API refused or failed: no access to the property, API not enabled, quota, outage | Read the reason in the run log |
| `no-data` | Authenticated, but the property returned no rows | Check the token's account can see the property |
| `missing-deps` | Google client libraries not installed | Restore the `pip install` line in the workflow |
| `timeout` | The pull ran past its time limit | Re-run; if it repeats, read the run log |

On any failure the previous report is left untouched. The strategy brain then
measures the age of that report: after 7 days it warns, after 14 it withholds
everything built on it and reports the loop as degraded
(`ops/strategy/README.md`). While degraded, the daily workflow keeps one issue
open, labelled `pi-alert`, naming the cause.

## How the code resolves credentials

`ops/scripts/gsc_client.get_credentials()` tries, in order:

1. `GSC_TOKEN_JSON` env var (headless / CI, preferred)
2. `ops/tokens/gsc-token.json` (local cache)
3. `ops/config/gsc-client-secret.json` or `GSC_CLIENT_SECRET_JSON`, for the
   interactive consent. Only from a terminal: in CI this stops with
   `no-credentials` instead of waiting on a browser that will never open.

## Security

- Never commit `ops/config/gsc-client-secret.json` or `ops/tokens/*` (gitignored).
- The client **ID** is not secret (it is sent to browsers). The client
  **secret** and the **token** are: keep them in the local gitignored files or
  in GitHub secrets.
- The token file contains the client secret and a long-lived refresh token.
  Treat the `GSC_TOKEN_JSON` secret as you would a password.
- Scopes: the token is minted with both Search Console scopes,
  `webmasters.readonly` and `webmasters` (read and write). The write scope
  exists because `ops/scripts/gsc-index-report.py` submits the sitemap. The
  daily feed only reads.
- To revoke: remove the app's access at
  <https://myaccount.google.com/permissions>, then delete the secret.
