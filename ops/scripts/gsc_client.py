"""
Shared GSC client: auth, API service, constants, URL loading.
Imported by all gsc-*.py scripts.

Auth resolution order (first that works wins):
  1. GSC_TOKEN_JSON env var: an authorized-user token JSON (with refresh_token).
     This is the headless / CI path: no browser flow, nothing committed to git.
     Provide it as a GitHub Actions secret so the daily engine can pull GSC.
  2. ops/tokens/gsc-token.json (gitignored): a token minted by a prior local run.
  3. ops/config/gsc-client-secret.json (gitignored): full OAuth client secret;
     triggers the one-time interactive browser consent to mint the token above.
     The client secret JSON can also be supplied via GSC_CLIENT_SECRET_JSON.
     Only ever attempted from an interactive terminal, never in CI.

A client *ID* alone is not sufficient: OAuth needs the client secret to run the
consent flow once, which produces the refresh token the automation then reuses.

Failure contract. Every feed script exits with one of the codes below, so the
caller (engine/orchestrator.py) can tell "never configured" from "configured
and broken" instead of logging both as a harmless skip:

  0  ok
  3  no-credentials   nothing to authenticate with in this environment
  4  auth-failed      a token is present but Google rejected it
  5  api-error        the Search Console API refused or failed a request
  6  no-data          authenticated, but the property returned no rows
  7  missing-deps     the Google client libraries are not installed

A script that fails leaves the last good report on disk untouched.

The Google libraries are imported on first use, not at module import, so the
pure report-building code can be imported and tested without them.
"""

import csv
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

BASE         = Path(__file__).resolve().parents[2]
CLIENT_FILE  = BASE / "ops" / "config" / "gsc-client-secret.json"
TOKEN_FILE   = BASE / "ops" / "tokens" / "gsc-token.json"
DATA_DIR     = BASE / "ops" / "data"
REPORTS_DIR  = BASE / "ops" / "reports"
CSV_FILE     = BASE / "ops" / "reports" / "seo-classification.csv"

SITE_URL    = "sc-domain:peninsulainsider.com.au"
SITE_BASE   = "https://peninsulainsider.com.au"
SITEMAP_URL = f"{SITE_BASE}/sitemap.xml"

SCOPES = [
    "https://www.googleapis.com/auth/webmasters",
    "https://www.googleapis.com/auth/webmasters.readonly",
]

AUTH_DOC = "ops/gsc-auth/README.md"

EXIT_OK             = 0
EXIT_NO_CREDENTIALS = 3
EXIT_AUTH_FAILED    = 4
EXIT_API_ERROR      = 5
EXIT_NO_DATA        = 6
EXIT_MISSING_DEPS   = 7

EXIT_REASONS = {
    EXIT_OK: "ok",
    EXIT_NO_CREDENTIALS: "no-credentials",
    EXIT_AUTH_FAILED: "auth-failed",
    EXIT_API_ERROR: "api-error",
    EXIT_NO_DATA: "no-data",
    EXIT_MISSING_DEPS: "missing-deps",
}


class FeedError(Exception):
    """A feed failure with a stable exit code and reason (see module docstring)."""

    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code

    @property
    def reason(self) -> str:
        return EXIT_REASONS.get(self.code, "error")


def run_cli(main) -> None:
    """Run a feed script's entry point, turning a FeedError into its exit code.
    The message goes to stderr; it never contains credential material."""
    try:
        main()
    except FeedError as e:
        print(f"GSC feed failed ({e.reason}): {e}", file=sys.stderr)
        sys.exit(e.code)


def _short(error) -> str:
    """One bounded line of an exception, safe to log."""
    return " ".join(str(error).split())[:200]


def _google() -> SimpleNamespace:
    """Import the Google client libraries on first use."""
    try:
        from google.auth.exceptions import RefreshError, TransportError
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as e:
        raise FeedError(
            EXIT_MISSING_DEPS,
            f"Google client libraries are not installed ({e.name}). Run: pip install "
            "google-api-python-client google-auth-oauthlib google-auth-httplib2",
        ) from e
    return SimpleNamespace(
        RefreshError=RefreshError, TransportError=TransportError, Request=Request,
        Credentials=Credentials, InstalledAppFlow=InstalledAppFlow, build=build,
    )


def _load_env_token(g):
    """Load an authorized-user token from GSC_TOKEN_JSON (headless / CI path).
    Returns None when the variable is unset. A value that is set but unusable is
    an error in its own right: reporting it as "no credentials" would send the
    owner to mint a token they believe they already supplied."""
    raw = os.environ.get("GSC_TOKEN_JSON", "").strip()
    if not raw:
        return None
    try:
        return g.Credentials.from_authorized_user_info(json.loads(raw), SCOPES)
    except (json.JSONDecodeError, ValueError, KeyError, TypeError) as e:
        raise FeedError(
            EXIT_AUTH_FAILED,
            f"GSC_TOKEN_JSON is set but is not a usable authorized-user token ({_short(e)}). "
            f"It must be the full contents of ops/tokens/gsc-token.json, not the client "
            f"secret file. See {AUTH_DOC}.",
        ) from e


def _client_secret_path() -> Path | None:
    """Return a client-secret JSON path, materialising GSC_CLIENT_SECRET_JSON to
    a temp file if that env var is set, else the on-disk CLIENT_FILE if present."""
    raw = os.environ.get("GSC_CLIENT_SECRET_JSON", "").strip()
    if raw:
        tmp = Path(tempfile.gettempdir()) / "gsc-client-secret.json"
        tmp.write_text(raw, encoding="utf-8")
        return tmp
    return CLIENT_FILE if CLIENT_FILE.exists() else None


def _interactive() -> bool:
    """True only when a person is at a terminal. The browser consent flow waits
    on a local callback, so starting it in CI would hang the job until its
    timeout instead of failing with a reason."""
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        return False
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError):
        return False


def get_credentials():
    g = _google()

    # 1. Headless / CI: token supplied via environment (no browser flow).
    creds = _load_env_token(g)
    persist_to_file = creds is None  # only write local token cache for file-based flows

    # 2. Local token cache from a prior interactive run.
    if creds is None and TOKEN_FILE.exists():
        creds = g.Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.refresh_token:
            print("Refreshing OAuth token...")
            try:
                creds.refresh(g.Request())
            except g.RefreshError as e:
                raise FeedError(
                    EXIT_AUTH_FAILED,
                    f"Google rejected the stored token ({_short(e)}). Mint a new one and "
                    f"replace the secret. See {AUTH_DOC}.",
                ) from e
            except g.TransportError as e:
                raise FeedError(
                    EXIT_API_ERROR, f"could not reach Google to refresh the token ({_short(e)})"
                ) from e
        else:
            # 3. First-time auth: needs the client secret + an interactive consent.
            client_path = _client_secret_path()
            if not client_path:
                raise FeedError(
                    EXIT_NO_CREDENTIALS,
                    "No GSC credentials. Provide GSC_TOKEN_JSON (headless), or a client "
                    f"secret at {CLIENT_FILE} / GSC_CLIENT_SECRET_JSON and run an "
                    f"interactive auth once. See {AUTH_DOC}.",
                )
            if not _interactive():
                raise FeedError(
                    EXIT_NO_CREDENTIALS,
                    "A client secret is present but no token, and this is not an interactive "
                    "terminal, so the one-time browser consent cannot run here. Mint the token "
                    f"locally and provide it as GSC_TOKEN_JSON. See {AUTH_DOC}.",
                )
            flow = g.InstalledAppFlow.from_client_secrets_file(str(client_path), SCOPES)
            creds = flow.run_local_server(port=0)
            persist_to_file = True
        if persist_to_file:
            TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
            TOKEN_FILE.write_text(creds.to_json())
    return creds


def get_service():
    creds = get_credentials()
    return _google().build("searchconsole", "v1", credentials=creds)


def _http_status(error) -> int | None:
    """HTTP status of a googleapiclient HttpError, without importing its class."""
    status = getattr(error, "status_code", None)
    if status is None:
        status = getattr(getattr(error, "resp", None), "status", None)
    try:
        return int(status) if status is not None else None
    except (TypeError, ValueError):
        return None


def execute(request, what: str = "request"):
    """Execute one API request. A refused or failed request raises FeedError; it
    is never swallowed, because a swallowed error here once meant an empty
    report written over a good one and logged as a successful pull."""
    try:
        return request.execute()
    except FeedError:
        raise
    except Exception as e:
        status = _http_status(e)
        module = type(e).__module__ or ""
        if status in (401,):
            raise FeedError(EXIT_AUTH_FAILED, f"{what}: Google rejected the credentials ({_short(e)})") from e
        if status == 403:
            raise FeedError(
                EXIT_API_ERROR,
                f"{what}: permission denied ({_short(e)}). The Google account behind the token "
                f"needs access to {SITE_URL}, and the Search Console API must be enabled for "
                "the OAuth client's project.",
            ) from e
        if status is not None:
            raise FeedError(EXIT_API_ERROR, f"{what}: HTTP {status} ({_short(e)})") from e
        if module.startswith("google.auth") and type(e).__name__ == "RefreshError":
            raise FeedError(EXIT_AUTH_FAILED, f"{what}: token refresh rejected ({_short(e)})") from e
        if isinstance(e, OSError) or module.startswith(("google.auth", "httplib2")):
            raise FeedError(EXIT_API_ERROR, f"{what}: transport failure ({type(e).__name__}: {_short(e)})") from e
        raise


def ensure_output_dirs() -> None:
    for directory in (DATA_DIR, REPORTS_DIR):
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass  # read-only checkout: the write itself will report the problem


ensure_output_dirs()


def write_report(path: Path, text: str) -> None:
    """Replace a report in one step, so a run killed mid-write cannot leave a
    truncated file where the last good report was."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def load_keep_improve_urls() -> list[str]:
    urls = []
    with CSV_FILE.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["bucket"] == "KEEP_IMPROVE":
                urls.append(row["url"])
    return urls


def slug(url: str) -> str:
    return url.replace(SITE_BASE, "") or "/"


_HOST_RE = re.compile(r"^https?://[^/]+", re.I)
_FILE_RE = re.compile(r"\.[a-z0-9]{2,5}$", re.I)


def norm_path(url: str) -> str:
    """Canonical site path for a URL or path. Search Console reports http and
    https, and slash and no-slash, as separate rows for what is one page (the
    site serves trailing slashes only), so every consumer keys on this."""
    path = _HOST_RE.sub("", (url or "").strip())
    path = path.split("#", 1)[0].split("?", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    path = re.sub(r"/{2,}", "/", path)
    if not path.endswith("/") and not _FILE_RE.search(path.rsplit("/", 1)[-1]):
        path += "/"
    return path


def canonical_url(url_or_path: str) -> str:
    """The canonical absolute URL to hand the URL Inspection API. Inspecting the
    no-slash form reports on a redirect, not on the page."""
    return SITE_BASE + norm_path(url_or_path)


def cell(value) -> str:
    """One markdown table cell: single line, pipes escaped, house style kept."""
    text = " ".join(str(value).split())
    text = text.replace(chr(0x2014), "-")  # em-dash, by code point
    return text.replace("|", "\\|")
