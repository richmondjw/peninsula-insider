#!/usr/bin/env python3
"""
Peninsula Insider — Autonomous Executor
===========================================================================
Closes the write side of the strategy loop: the brain no longer only *ranks*
opportunities, it *acts* on the safest, highest-ROI class of them without a
human in the loop.

Scope (deliberately narrow and safe):
  - `ctr-fix` and `striking-distance` opportunities whose target is a **journal
    article** (`/journal/{slug}/` → next/src/content/articles/{slug}.md|.mdx). For
    those, the whole SEO surface is two frontmatter fields — `title` and `dek` —
    so the edit is deterministic and confined (a striking-distance rewrite is
    optimised for the driving query). Venue/event pages derive their meta from
    templates; auto-editing those safely needs template-aware handling, so they
    are logged and left for a human/next iteration, never blindly edited.

Guardrails (why this is safe to run unattended):
  1. Cap — at most MAX_ACTIONS_PER_RUN edits per run (default 1), so a bad
     heuristic can never rewrite the site in one pass.
  2. Idempotent — never re-acts on a target already in the attribution ledger.
  3. Grounded — the new copy is drafted by Claude from the page's real title/dek;
     if the model isn't reachable it SKIPS (never fabricates a title).
  4. Gated — output must pass length limits, the em-dash/house-style sanitizer,
     a prohibited-word check, and a frontmatter-still-parses check before commit.
  5. Measured + reversible — every action is recorded to the learning ledger and
     re-measured next cycle; if it hurt the page the loop shows it, and it's a
     one-line git revert.

Usage:
  python engine/auto_act.py --dry-run        # show what it would change
  python engine/auto_act.py                  # execute (writes files, records ledger)
  python engine/auto_act.py --limit 2
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import strategy_engine as se  # reuse record_action + paths

try:
    import zoneinfo
    AEST = zoneinfo.ZoneInfo("Australia/Sydney")
except Exception:
    AEST = None

REPO_ROOT = se.REPO_ROOT
ARTICLES_DIR = REPO_ROOT / "next/src/content/articles"
STRATEGY_JSON = se.STRATEGY_JSON

MAX_ACTIONS_PER_RUN = 1          # conservative default; raise once trust is earned

# Opportunity kinds safe to auto-execute today: both edit only a journal
# article's title + meta description (reversible, no new factual claims). CTR
# fixes target low-CTR page-1 pages; striking-distance targets near-page-1 queries.
ACTIONABLE_KINDS = {"ctr-fix", "striking-distance"}
TITLE_MAX = 65                    # before the " · Peninsula Insider" suffix
DEK_MIN, DEK_MAX = 70, 165        # healthy meta-description window
PROHIBITED = ["stunning", "vibrant", "nestled", "charming", "hidden gem",
              "must-visit", "you won't be disappointed", "world-class"]


# ── Source resolution ────────────────────────────────────────────────────────
def resolve_article_source(target: str) -> Path | None:
    """Map a /journal/{slug}/ target to its content file, or None if not a
    journal article we can safely edit."""
    path = re.sub(r"^https?://[^/]+", "", target).strip("/")
    parts = path.split("/")
    if len(parts) != 2 or parts[0] != "journal":
        return None
    slug = parts[1]
    for ext in (".md", ".mdx"):
        p = ARTICLES_DIR / f"{slug}{ext}"
        if p.exists():
            return p
    return None


# ── Frontmatter helpers (single-line quoted fields) ──────────────────────────
_FM_RE = re.compile(r"^(---\n.*?\n---\n)(.*)$", re.S)


def _split_frontmatter(text: str):
    m = _FM_RE.match(text)
    if not m:
        return None, None
    return m.group(1), m.group(2)


def get_fm_field(text: str, key: str) -> str | None:
    fm, _ = _split_frontmatter(text)
    if fm is None:
        return None
    m = re.search(rf"^{re.escape(key)}:\s*(.*)$", fm, re.M)
    if not m:
        return None
    val = m.group(1).strip()
    if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
        val = val[1:-1]
    return val


def set_fm_field(text: str, key: str, value: str) -> str | None:
    fm, body = _split_frontmatter(text)
    if fm is None:
        return None
    pat = re.compile(rf"^({re.escape(key)}:\s*).*$", re.M)
    if not pat.search(fm):
        return None
    quoted = json.dumps(value, ensure_ascii=False)  # safe quoting/escaping
    fm2 = pat.sub(lambda m: m.group(1) + quoted, fm, count=1)
    return fm2 + body


# ── Drafting (grounded, via the claude CLI — same mechanism as content_generator) ─
DRAFT_SYSTEM = (
    "You are an SEO editor for Peninsula Insider, a premium local guide to the "
    "Mornington Peninsula, Victoria, Australia. Rewrite a page's title and meta "
    "description to earn more clicks from Google for its obvious search intent. "
    "Rules: Australian English; specific and concrete; no clickbait; no em-dashes; "
    "never use the words stunning, vibrant, nestled, charming, hidden gem, "
    "must-visit, world-class. Title <= 60 characters, no site name. Meta "
    "description 70-160 characters. Keep the page's actual topic; do not invent "
    "facts. Respond ONLY with minified JSON: {\"title\":\"...\",\"dek\":\"...\"}."
)


def _draft_prompt(slug: str, current_title: str, current_dek: str, query: str = "") -> str:
    """Build the drafting prompt. When a driving query is known (striking-distance),
    the rewrite is optimised for that exact query."""
    intent = (f"Optimise the rewrite for the search query: \"{query}\". "
              if query else "Rewrite both to improve click-through for this page's "
              "obvious search intent. ")
    return (
        f"Page: /journal/{slug}/\n"
        f"Current title: {current_title}\n"
        f"Current meta description: {current_dek}\n\n"
        f"{intent}Return only the JSON."
    )


def draft_title_dek(slug: str, current_title: str, current_dek: str,
                    query: str = "") -> tuple[str, str] | None:
    """Ask Claude for an improved title+dek. Returns None if unavailable (skip,
    never fabricate)."""
    prompt = _draft_prompt(slug, current_title, current_dek, query)
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).resolve().parent))
    import llm
    out = llm.complete(prompt, system=DRAFT_SYSTEM, max_tokens=400)
    if not out:
        return None
    m = re.search(r"\{.*\}", out, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        title, dek = str(data["title"]).strip(), str(data["dek"]).strip()
    except (json.JSONDecodeError, KeyError, TypeError):
        return None
    return (title, dek) if title and dek else None


# ── Validation ───────────────────────────────────────────────────────────────
def validate(title: str, dek: str) -> str | None:
    """Return an error string if the draft is unacceptable, else None."""
    title = re.sub(r"\s*—\s*", " - ", title)
    dek = re.sub(r"\s*—\s*", " - ", dek)
    if "—" in title or "—" in dek:
        return "em-dash survived"
    if not (0 < len(title) <= TITLE_MAX):
        return f"title length {len(title)} out of range"
    if not (DEK_MIN <= len(dek) <= DEK_MAX):
        return f"dek length {len(dek)} out of range"
    low = f"{title} {dek}".lower()
    hit = [w for w in PROHIBITED if w in low]
    if hit:
        return f"prohibited words: {hit}"
    return None


def _now_iso() -> str:
    try:
        return datetime.now(AEST).strftime("%Y-%m-%d %H:%M %Z") if AEST else datetime.now().isoformat()
    except Exception:
        return datetime.now().isoformat()


# ── Executor ─────────────────────────────────────────────────────────────────
def load_queue() -> list[dict]:
    if not STRATEGY_JSON.exists():
        return []
    try:
        return json.loads(STRATEGY_JSON.read_text()).get("commissioning_queue", [])
    except (json.JSONDecodeError, OSError):
        return []


def already_actioned_targets() -> set[str]:
    return {a.get("target") for a in se.load_actioned()}


def auto_act(limit: int = MAX_ACTIONS_PER_RUN, dry_run: bool = False,
             today: date | None = None) -> list[dict]:
    today = today or (datetime.now(AEST).date() if AEST else date.today())
    done = already_actioned_targets()
    actions, skipped = [], []

    for opp in load_queue():
        if len(actions) >= limit:
            break
        kind = opp.get("kind")
        if kind not in ACTIONABLE_KINDS:
            continue
        target = opp.get("target", "")
        if target in done:
            continue
        src = resolve_article_source(target)
        if src is None:
            skipped.append((target, "not a safely-editable journal article"))
            continue
        text = src.read_text()
        cur_title = get_fm_field(text, "title")
        cur_dek = get_fm_field(text, "dek")
        if not cur_title or not cur_dek:
            skipped.append((target, "missing title/dek frontmatter"))
            continue

        draft = draft_title_dek(src.stem, cur_title, cur_dek, opp.get("query", ""))
        if not draft:
            skipped.append((target, "no draft (model unavailable) — skipped, not fabricated"))
            continue
        new_title = re.sub(r"\s*—\s*", " - ", draft[0])
        new_dek = re.sub(r"\s*—\s*", " - ", draft[1])
        err = validate(new_title, new_dek)
        if err:
            skipped.append((target, f"rejected: {err}"))
            continue

        updated = set_fm_field(text, "title", new_title)
        updated = set_fm_field(updated, "dek", new_dek) if updated else None
        if not updated or _split_frontmatter(updated)[0] is None:
            skipped.append((target, "frontmatter write failed"))
            continue

        action = {
            "target": target, "file": str(src.relative_to(REPO_ROOT)),
            "old_title": cur_title, "new_title": new_title,
            "old_dek": cur_dek, "new_dek": new_dek, "ts": _now_iso(),
        }
        if dry_run:
            actions.append({**action, "dry_run": True})
            continue

        src.write_text(updated)
        se.record_action(target, kind, opp.get("query", ""),
                         f"auto: title/meta rewrite (was: {cur_title[:50]})", se.load_gsc(se.GSC_REPORT), today)
        actions.append(action)

    for t, why in skipped[:10]:
        print(f"  skip {t}: {why}")
    return actions


def main():
    ap = argparse.ArgumentParser(description="Peninsula Insider Autonomous Executor")
    ap.add_argument("--limit", type=int, default=MAX_ACTIONS_PER_RUN)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    actions = auto_act(limit=args.limit, dry_run=args.dry_run)
    print(f"\n{'[dry-run] ' if args.dry_run else ''}Auto-actions: {len(actions)}")
    for a in actions:
        print(f"  ✎ {a['file']}")
        print(f"    title: {a['old_title']!r}")
        print(f"        →  {a['new_title']!r}")
        print(f"    dek:   {a['new_dek']!r}")
    if not actions:
        print("  (nothing safely actionable this run)")


if __name__ == "__main__":
    main()
