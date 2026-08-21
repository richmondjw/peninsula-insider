"""
Shared GSC client — auth, API service, constants, URL loading.
Imported by all gsc-*.py scripts.

Auth resolution order (first that works wins):
  1. GSC_TOKEN_JSON env var  — an authorized-user token JSON (with refresh_token).
     This is the headless / CI path: no browser flow, nothing committed to git.
     Provide it as a GitHub Actions secret so the daily engine can pull GSC.
  2. ops/tokens/gsc-token.json (gitignored) — a token minted by a prior local run.
  3. ops/config/gsc-client-secret.json (gitignored) — full OAuth client secret;
     triggers the one-time interactive browser consent to mint the token above.
     The client secret JSON can also be supplied via GSC_CLIENT_SECRET_JSON.

A client *ID* alone is not sufficient: OAuth needs the client secret to run the
consent flow once, which produces the refresh token the automation then reuses.
"""

import csv
import json
import os
import sys
import tempfile
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

BASE         = Path(__file__).resolve().parents[2]
CLIENT_FILE  = BASE / "ops" / "config" / "gsc-client-secret.json"
TOKEN_FILE   = BASE / "ops" / "tokens" / "gsc-token.json"
DATA_DIR     = BASE / "ops" / "data"
REPORTS_DIR  = BASE / "ops" / "reports"
CSV_FILE     = BASE / "ops" / "reports" / "seo-classification.csv"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

SITE_URL    = "sc-domain:peninsulainsider.com.au"
SITE_BASE   = "https://peninsulainsider.com.au"
SITEMAP_URL = f"{SITE_BASE}/sitemap.xml"

SCOPES = [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/webmasters.readonly",
]


def _load_env_token() -> Credentials | None:
    """Load an authorized-user token from GSC_TOKEN_JSON (headless / CI path)."""
    raw = os.environ.get("GSC_TOKEN_JSON", "").strip()
    if not raw:
        return None
    try:
        return Credentials.from_authorized_user_info(json.loads(raw), SCOPES)
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"GSC_TOKEN_JSON present but unparseable: {e}", file=sys.stderr)
        return None


def _client_secret_path() -> Path | None:
    """Return a client-secret JSON path, materialising GSC_CLIENT_SECRET_JSON to
    a temp file if that env var is set, else the on-disk CLIENT_FILE if present."""
    raw = os.environ.get("GSC_CLIENT_SECRET_JSON", "").strip()
    if raw:
        tmp = Path(tempfile.gettempdir()) / "gsc-client-secret.json"
        tmp.write_text(raw, encoding="utf-8")
        return tmp
    return CLIENT_FILE if CLIENT_FILE.exists() else None


def get_credentials() -> Credentials:
    # 1. Headless / CI: token supplied via environment (no browser flow).
    creds = _load_env_token()
    persist_to_file = creds is None  # only write local token cache for file-based flows

    # 2. Local token cache from a prior interactive run.
    if creds is None and TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing OAuth token...")
            creds.refresh(Request())
        else:
            # 3. First-time auth: needs the client secret + an interactive consent.
            client_path = _client_secret_path()
            if not client_path:
                sys.exit(
                    "No GSC credentials. Provide GSC_TOKEN_JSON (headless), or a "
                    f"client secret at {CLIENT_FILE} / GSC_CLIENT_SECRET_JSON and run "
                    "an interactive auth once. See ops/config/README.md."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(client_path), SCOPES)
            creds = flow.run_local_server(port=0)
            persist_to_file = True
        if persist_to_file:
            TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            TOKEN_FILE.write_text(creds.to_json())
    return creds


def get_service():
    return build("searchconsole", "v1", credentials=get_credentials())


def load_keep_improve_urls() -> list[str]:
    urls = []
    with CSV_FILE.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["bucket"] == "KEEP_IMPROVE":
                urls.append(row["url"])
    return urls


def slug(url: str) -> str:
    return url.replace(SITE_BASE, "") or "/"
