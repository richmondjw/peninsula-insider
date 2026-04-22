"""
Shared GSC client — auth, API service, constants, URL loading.
Imported by all gsc-*.py scripts.
"""

import csv
import json
import sys
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


def get_credentials() -> Credentials:
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing OAuth token...")
            creds.refresh(Request())
        else:
            if not CLIENT_FILE.exists():
                sys.exit(f"Client secret not found: {CLIENT_FILE}\nRun gsc-index-report.py first to authenticate.")
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
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
