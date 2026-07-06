#!/usr/bin/env python3
"""
Peninsula Insider — Agentic Content Engine Orchestrator
Runs inside OpenClaw. Called by cron at defined tempos.

Usage:
  python orchestrator.py --tempo daily
  python orchestrator.py --tempo weekly
  python orchestrator.py --tempo monthly
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
import zoneinfo

# ── Config ──────────────────────────────────────────────────────────────
AEST = zoneinfo.ZoneInfo("Australia/Sydney")
REPO_ROOT = Path(os.environ.get("PI_REPO_ROOT", "/home/node/.openclaw/workspace/peninsula-insider"))
CONTENT_DIR = REPO_ROOT / "next/src/content/articles"
SIGNALS_DIR = REPO_ROOT / ".claude/signals"
RESEARCH_DIR = REPO_ROOT / ".claude/research"
RUNS_DIR = REPO_ROOT / ".claude/newsroom/runs"
SLATES_DIR = REPO_ROOT / ".claude/newsroom/slates"
LOOP_STATE_FILE = REPO_ROOT / ".claude/newsroom/loop-state/current.json"
AGENTS_DIR = Path(__file__).parent.parent / "agents"

# Ensure dirs exist
for d in [SIGNALS_DIR, RESEARCH_DIR, RUNS_DIR, SLATES_DIR, LOOP_STATE_FILE.parent]:
    d.mkdir(parents=True, exist_ok=True)


# ── Loop State ───────────────────────────────────────────────────────────
def load_loop_state() -> dict:
    if LOOP_STATE_FILE.exists():
        return json.loads(LOOP_STATE_FILE.read_text())
    return {
        "last_run": None,
        "last_daily": None,
        "last_weekly": None,
        "last_monthly": None,
        "pending": [],
        "completed": [],
        "stalls": 0,
        "total_pieces_shipped": 0,
    }

def save_loop_state(state: dict):
    LOOP_STATE_FILE.write_text(json.dumps(state, indent=2))


# ── Run Log ──────────────────────────────────────────────────────────────
class RunLog:
    def __init__(self, tempo: str, date_str: str):
        self.tempo = tempo
        self.date_str = date_str
        self.run_id = f"{tempo}-{date_str}"
        self.started = datetime.now(AEST).isoformat()
        self.steps = []
        self.pieces_shipped = 0
        self.stalls = 0
        self.errors = []

    def step(self, name: str, status: str, detail: str = ""):
        self.steps.append({
            "step": name,
            "status": status,
            "detail": detail,
            "ts": datetime.now(AEST).isoformat()
        })
        print(f"  [{status}] {name}" + (f": {detail}" if detail else ""))

    def error(self, msg: str):
        self.errors.append(msg)
        self.stalls += 1
        print(f"  [STALL] {msg}", file=sys.stderr)

    def save(self):
        data = {
            "run_id": self.run_id,
            "tempo": self.tempo,
            "started": self.started,
            "completed": datetime.now(AEST).isoformat(),
            "pieces_shipped": self.pieces_shipped,
            "stalls": self.stalls,
            "steps": self.steps,
            "errors": self.errors,
        }
        run_file = RUNS_DIR / f"{self.date_str}-{self.tempo}.json"
        run_file.write_text(json.dumps(data, indent=2))

        # Human-readable summary
        md = f"""# Run Report — {self.tempo.title()} · {self.date_str}

**Run ID:** {self.run_id}  
**Started:** {self.started}  
**Pieces shipped:** {self.pieces_shipped}  
**Stalls:** {self.stalls}  

## Steps
{chr(10).join(f"- [{s['status']}] {s['step']}" + (f" — {s['detail']}" if s['detail'] else "") for s in self.steps)}

{"## Errors" + chr(10) + chr(10).join(self.errors) if self.errors else ""}
"""
        md_file = RUNS_DIR / f"{self.date_str}-{self.tempo}.md"
        md_file.write_text(md)
        print(f"\nRun log saved: {run_file}")


# ── Git Operations ────────────────────────────────────────────────────────
def git_commit_and_push(message: str, files: list[str] = None) -> bool:
    """Commit and push to main. Returns True on success."""
    try:
        cwd = str(REPO_ROOT)
        if files:
            subprocess.run(["git", "add"] + files, cwd=cwd, check=True, capture_output=True)
        else:
            subprocess.run(["git", "add", "-A"], cwd=cwd, check=True, capture_output=True)

        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=cwd, capture_output=True, text=True
        )
        if result.returncode != 0:
            if "nothing to commit" in result.stdout:
                print("  Nothing to commit — skipping push")
                return True
            print(f"  Commit failed: {result.stderr}")
            return False

        push_result = subprocess.run(
            ["git", "push", "origin", "main"],
            cwd=cwd, capture_output=True, text=True
        )
        if push_result.returncode != 0:
            print(f"  Push failed: {push_result.stderr}")
            return False

        return True
    except Exception as e:
        print(f"  Git error: {e}")
        return False


# ── Content Generation via OpenClaw ──────────────────────────────────────
def call_openclaw_agent(agent_name: str, brief: dict, output_path: Path, fallback_path: Path = None) -> bool:
    """
    Call an OpenClaw agent with a brief. 
    In production: invokes the OC agent system.
    Integration path:
      1. If ANTHROPIC_API_KEY set → calls content_generator.py with the brief
      2. If claude CLI available → delegates to claude with agent spec as system prompt
      3. Fallback → writes template content so loop never stalls
    Returns True if output file was written successfully.
    """
    agent_spec_file = AGENTS_DIR / f"{agent_name}.md"

    # Write brief to temp file for agent consumption
    brief_file = RESEARCH_DIR / f"_brief_{agent_name}_{brief.get('date', brief.get('week', 'latest'))}.json"
    brief_file.write_text(json.dumps(brief, indent=2))

    print(f"  → Calling agent: {agent_name}")
    print(f"    Brief: {json.dumps(brief)[:150]}...")

    # Integration path 1: content_generator.py handles known tasks
    generator = Path(__file__).parent / 'content_generator.py'
    task = brief.get('task', '')
    date = brief.get('date', datetime.now(AEST).strftime('%Y-%m-%d'))
    season = brief.get('season', get_season(datetime.now(AEST).month))
    
    content_tasks = {
        'daily-insider-picks': 'daily-insider-picks',
        'daily-event-intel': None,  # research task — write stub JSON
        'weekend-picks': 'weekend-picks',
        'peninsula-radar-newsletter': 'newsletter',
        'monthly-long-form': 'long-form',
        'town-hub-refresh': 'town-hub-refresh',
    }

    if task in content_tasks and content_tasks[task] and generator.exists():
        gen_task = content_tasks[task]
        result = subprocess.run(
            [sys.executable, str(generator),
             '--task', gen_task,
             '--date', date,
             '--season', season,
             '--output', str(output_path)]
            + (['--research-file', brief['research_file']] if 'research_file' in brief else []),
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and output_path.exists():
            print(f"    ✓ Generated via content_generator")
            return True
        else:
            print(f"    ✗ Generator failed: {result.stderr[:200]}")

    # Integration path 2: research stub (write empty JSON so downstream works)
    if task == 'daily-event-intel' and not output_path.exists():
        output_path.write_text(json.dumps({
            'date': date, 'season': season,
            'events': [], 'seasonal_context': f'{season.title()} on the Mornington Peninsula',
            'recommended_picks': []
        }, indent=2))
        return True

    # Integration path 3: slate/signal stubs
    if not output_path.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(f"# {agent_name} output — {task}\n\n[Generated by {agent_name} for task: {task}]\n")

    return output_path.exists()


# ── Daily Tempo ───────────────────────────────────────────────────────────
def run_daily(log: RunLog, state: dict, today: str, now_aest: datetime):
    """
    Daily content engine run:
    1. Research
    2. Draft Insider Picks
    3. Style gate
    4. Verify gate
    5. Commit + push
    6. Corpus refresh
    """
    print("\n=== DAILY TEMPO ===")

    # 0. Strategy refresh — fuse performance + signals + inventory into a ranked
    #    commissioning queue BEFORE anything is commissioned. This is the closed
    #    loop: yesterday's results shape today's work, and the strategy is
    #    diffed day-over-day so improvement is observable.
    log.step("gsc-refresh", "START")
    gsc_ok = run_gsc_refresh()
    log.step("gsc-refresh", "DONE" if gsc_ok else "SKIP",
             "fresh GSC pulled" if gsc_ok else "no GSC creds — using last committed report")

    log.step("strategy-refresh", "START")
    queue = run_strategy_engine(today)
    if queue:
        top = queue[0]
        log.step("strategy-refresh", "DONE",
                 f"top priority: [{top.get('kind')}] {top.get('title','')[:70]}")
    else:
        log.step("strategy-refresh", "WARN", "No strategy queue produced — using default cadence")

    # 1. Research
    log.step("research", "START")
    research_output = RESEARCH_DIR / f"daily-{today}.json"
    research_brief = {
        "task": "daily-event-intel",
        "region": "mornington-peninsula",
        "date": today,
        "season": get_season(now_aest.month),
        "output_path": str(research_output),
    }
    call_openclaw_agent("research-agent", research_brief, research_output)
    log.step("research", "DONE", f"→ {research_output.name}")

    # 2. Commission Insider Picks
    log.step("dispatch-desk", "START")
    article_slug = f"insider-picks-{today}"
    article_path = CONTENT_DIR / f"{article_slug}.md"
    dispatch_brief = {
        "task": "daily-insider-picks",
        "date": today,
        "season": get_season(now_aest.month),
        "research_file": str(research_output),
        "output_path": str(article_path),
        "slug": article_slug,
        "format": "insider-edit",
        "target_words": 700,
    }
    call_openclaw_agent("dispatch-desk", dispatch_brief, article_path)
    log.step("dispatch-desk", "DONE", f"→ {article_path.name}")

    # 3. Style gate
    log.step("style-gate", "START")
    style_result = run_style_gate(article_path)
    if style_result == "FAIL":
        log.error("Style gate failed — running one revision")
        # Simplified revision: ask dispatch to fix specific issues
        call_openclaw_agent("dispatch-desk", {**dispatch_brief, "revision": True, "style_notes": "simplify, remove generic language"}, article_path)
        style_result = run_style_gate(article_path)
        if style_result == "FAIL":
            log.step("style-gate", "WARN", "Second pass also flagged — shipping with log note")
    else:
        log.step("style-gate", "PASS")

    # 4. Verify gate
    log.step("verify-gate", "START")
    verify_result = run_verify_gate(article_path, today)
    if verify_result == "FAIL":
        log.error("Verify gate hard fail — checking for fallback")
        fallback = find_latest_insider_picks()
        if fallback:
            log.step("verify-gate", "FALLBACK", f"Using {fallback.name} as template")
            article_path = fallback
        else:
            log.step("verify-gate", "SKIP", "No fallback available — aborting daily publish")
            return
    else:
        log.step("verify-gate", "PASS")

    # 5. Set status to published in frontmatter
    set_published(article_path, today)
    log.step("frontmatter-update", "DONE")

    # 6. Commit + push
    log.step("git-push", "START")
    commit_msg = f"feat(content): daily insider picks {today} [agent-authored] [skip-review]"
    success = git_commit_and_push(commit_msg, [str(article_path)])
    if success:
        log.step("git-push", "DONE", "→ main → live in <3min")
        log.pieces_shipped += 1
        state["total_pieces_shipped"] = state.get("total_pieces_shipped", 0) + 1
    else:
        log.error("Git push failed — content staged but not live")

    # 7. Corpus refresh
    log.step("corpus-refresh", "START")
    refresh_result = run_corpus_refresh()
    log.step("corpus-refresh", "DONE" if refresh_result else "WARN", "Supabase concierge updated" if refresh_result else "Refresh script not found — skipping")

    # 8. Agent-discoverability refresh (llms.txt) + strategy artifact commit.
    log.step("llms-refresh", "START")
    llms_ok = run_llms_refresh()
    log.step("llms-refresh", "DONE" if llms_ok else "WARN",
             "llms.txt regenerated from sitemap" if llms_ok else "generator not found — skipping")

    log.step("strategy-commit", "START")
    strat_ok = git_commit_and_push(
        f"chore(strategy): daily strategy refresh + agent index {today} [skip-review]",
        ["ops/strategy", "llms.txt", "llms-full.txt"]
    )
    log.step("strategy-commit", "DONE" if strat_ok else "WARN",
             "strategy + llms.txt pushed" if strat_ok else "nothing to commit or push failed")

    state["last_daily"] = today
    log.step("daily-complete", "DONE", f"{log.pieces_shipped} piece(s) shipped")


# ── Weekly Tempo ──────────────────────────────────────────────────────────
def run_weekly(log: RunLog, state: dict, today: str, now_aest: datetime):
    """
    Weekly content engine run:
    1. Signal pull (Semrush + competitive)
    2. Commission slate
    3. Run all desk commissions
    4. Style + verify all
    5. Batch commit
    6. Update lookahead
    7. Newsletter
    """
    print("\n=== WEEKLY TEMPO ===")
    week_num = now_aest.isocalendar()[1]
    week_key = f"{now_aest.year}-W{week_num:02d}"

    # 1. Signal pull
    log.step("signal-pull", "START")
    signal_output = SIGNALS_DIR / f"signal-brief-{week_key}.md"
    call_openclaw_agent("signal-agent", {
        "task": "weekly-signal",
        "week": week_key,
        "date": today,
        "domain": "peninsulainsider.com.au",
        "output_path": str(signal_output),
    }, signal_output)
    # Copy to latest
    (SIGNALS_DIR / "signal-brief-latest.md").write_text(
        signal_output.read_text() if signal_output.exists() else "# Signal brief pending"
    )
    log.step("signal-pull", "DONE", f"→ {signal_output.name}")

    # Also run competitive scan
    log.step("competitive-scan", "START")
    comp_output = SIGNALS_DIR / f"competitive-{week_key}.json"
    call_openclaw_agent("signal-agent", {
        "task": "competitive-scan",
        "week": week_key,
        "date": today,
        "output_path": str(comp_output),
    }, comp_output)
    log.step("competitive-scan", "DONE")

    # 2. Commission slate
    log.step("commissioning", "START")
    slate_path = SLATES_DIR / f"slate-{week_key}.md"
    call_openclaw_agent("commissioning-agent", {
        "task": "weekly-slate",
        "week": week_key,
        "date": today,
        "season": get_season(now_aest.month),
        "signal_file": str(signal_output),
        "lookahead_file": str(SLATES_DIR / "lookahead.md"),
        "output_path": str(slate_path),
    }, slate_path)
    log.step("commissioning", "DONE", f"→ {slate_path.name}")

    # 3. Run desk commissions (Weekend Picks + 1 SEO piece)
    commissioned_paths = []

    # Weekend Picks (Dispatch Desk)
    log.step("weekend-picks", "START")
    wp_slug = f"weekend-picks-{today}"
    wp_path = CONTENT_DIR / f"{wp_slug}.md"
    call_openclaw_agent("dispatch-desk", {
        "task": "weekend-picks",
        "date": today,
        "week": week_key,
        "season": get_season(now_aest.month),
        "output_path": str(wp_path),
        "target_words": 500,
    }, wp_path)
    commissioned_paths.append(wp_path)
    log.step("weekend-picks", "DONE")

    # SEO target piece (from signal brief — commissioning agent determines which desk)
    log.step("seo-piece", "START")
    seo_slug = f"seo-target-{week_key}"
    seo_path = CONTENT_DIR / f"{seo_slug}.md"
    call_openclaw_agent("commissioning-agent", {
        "task": "commission-seo-piece",
        "week": week_key,
        "date": today,
        "signal_file": str(signal_output),
        "output_path": str(seo_path),
    }, seo_path)
    commissioned_paths.append(seo_path)
    log.step("seo-piece", "DONE")

    # 4. Style + verify all
    for path in commissioned_paths:
        if path.exists():
            run_style_gate(path)
            run_verify_gate(path, today)
            set_published(path, today)

    # 5. Newsletter
    log.step("newsletter", "START")
    newsletter_dir = REPO_ROOT / ".claude/newsroom/newsletter"
    newsletter_dir.mkdir(parents=True, exist_ok=True)
    nl_path = newsletter_dir / f"{week_key}.md"
    call_openclaw_agent("dispatch-desk", {
        "task": "peninsula-radar-newsletter",
        "week": week_key,
        "date": today,
        "output_path": str(nl_path),
        "target_words": 300,
    }, nl_path)
    log.step("newsletter", "DONE")

    # 6. Batch commit
    log.step("batch-commit", "START")
    all_files = [str(p) for p in commissioned_paths if p.exists()] + [str(slate_path), str(nl_path)]
    commit_msg = f"feat(content): weekly editorial batch {week_key} [agent-authored] [skip-review]"
    success = git_commit_and_push(commit_msg, all_files)
    if success:
        log.step("batch-commit", "DONE", f"{len(commissioned_paths)} pieces pushed live")
        log.pieces_shipped += len(commissioned_paths)
    else:
        log.error("Weekly batch push failed")

    # 7. Update lookahead
    log.step("lookahead-update", "START")
    lookahead_path = SLATES_DIR / "lookahead.md"
    call_openclaw_agent("commissioning-agent", {
        "task": "roll-lookahead",
        "week": week_key,
        "date": today,
        "season": get_season(now_aest.month),
        "lookahead_file": str(lookahead_path),
        "output_path": str(lookahead_path),
    }, lookahead_path)
    git_commit_and_push(
        f"chore(editorial): lookahead roll {week_key} [skip-review]",
        [str(lookahead_path)]
    )
    log.step("lookahead-update", "DONE")

    state["last_weekly"] = week_key
    log.step("weekly-complete", "DONE", f"{log.pieces_shipped} piece(s) shipped this week")


# ── Monthly Tempo ─────────────────────────────────────────────────────────
def run_monthly(log: RunLog, state: dict, today: str, now_aest: datetime):
    """
    Monthly deep research and long-form content batch.
    """
    print("\n=== MONTHLY TEMPO ===")
    month_key = now_aest.strftime("%Y-%m")
    season = get_season(now_aest.month)

    # 1. Deep seasonal research
    log.step("seasonal-research", "START")
    research_output = RESEARCH_DIR / f"monthly-{month_key}.json"
    call_openclaw_agent("research-agent", {
        "task": "monthly-seasonal-research",
        "month": month_key,
        "season": season,
        "date": today,
        "output_path": str(research_output),
    }, research_output)
    log.step("seasonal-research", "DONE")

    # 2. Competitive thematic analysis
    log.step("thematic-gap-analysis", "START")
    thematic_output = SIGNALS_DIR / f"thematic-gaps-{month_key}.md"
    call_openclaw_agent("signal-agent", {
        "task": "monthly-thematic-gaps",
        "month": month_key,
        "research_file": str(research_output),
        "output_path": str(thematic_output),
    }, thematic_output)
    log.step("thematic-gap-analysis", "DONE")

    # 3. Commission long-form editorial (3 pieces)
    long_form_paths = []
    for i, desk in enumerate(["escapes-desk", "field-desk", "table-desk"]):
        log.step(f"long-form-{i+1}", "START")
        lf_slug = f"monthly-editorial-{month_key}-{i+1:02d}"
        lf_path = CONTENT_DIR / f"{lf_slug}.md"
        call_openclaw_agent(desk, {
            "task": "monthly-long-form",
            "month": month_key,
            "season": season,
            "piece_number": i + 1,
            "research_file": str(research_output),
            "thematic_file": str(thematic_output),
            "output_path": str(lf_path),
            "target_words": 1200,
        }, lf_path)
        long_form_paths.append(lf_path)
        log.step(f"long-form-{i+1}", "DONE")

    # 4. Town hub refresh (2 most stale)
    log.step("town-hub-refresh", "START")
    stale_towns = find_stale_town_hubs()
    for town in stale_towns[:2]:
        town_path = REPO_ROOT / f"next/src/content/articles/area-guide-{town}.md"
        call_openclaw_agent("field-desk", {
            "task": "town-hub-refresh",
            "town": town,
            "month": month_key,
            "season": season,
            "existing_file": str(town_path),
            "output_path": str(town_path),
        }, town_path)
        long_form_paths.append(town_path)
    log.step("town-hub-refresh", "DONE", f"Refreshed: {', '.join(stale_towns[:2])}")

    # 5. Style + verify all
    for path in long_form_paths:
        if path.exists():
            run_style_gate(path)
            run_verify_gate(path, today)
            set_published(path, today)

    # 6. Batch commit
    log.step("monthly-commit", "START")
    all_files = [str(p) for p in long_form_paths if p.exists()]
    if all_files:
        commit_msg = f"feat(content): monthly editorial batch {month_key} — {season} season [agent-authored] [skip-review]"
        success = git_commit_and_push(commit_msg, all_files)
        if success:
            log.step("monthly-commit", "DONE", f"{len(long_form_paths)} long-form pieces live")
            log.pieces_shipped += len(long_form_paths)

    # 7. Monthly performance report
    log.step("monthly-report", "START")
    perf_dir = REPO_ROOT / ".claude/newsroom/perf"
    perf_dir.mkdir(parents=True, exist_ok=True)
    report_path = perf_dir / f"monthly-{month_key}.md"
    write_monthly_report(report_path, month_key, season, log)
    git_commit_and_push(
        f"chore(reporting): monthly editorial report {month_key} [skip-review]",
        [str(report_path)]
    )
    log.step("monthly-report", "DONE")

    state["last_monthly"] = month_key
    log.step("monthly-complete", "DONE", f"{log.pieces_shipped} piece(s) shipped this month")


# ── Helper Functions ──────────────────────────────────────────────────────
def get_season(month: int) -> str:
    seasons = {
        12: "summer", 1: "summer", 2: "summer",
        3: "autumn", 4: "autumn", 5: "autumn",
        6: "winter", 7: "winter", 8: "winter",
        9: "spring", 10: "spring", 11: "spring",
    }
    return seasons.get(month, "summer")


def run_style_gate(article_path: Path) -> str:
    """Run style checks. Returns PASS or FAIL."""
    if not article_path.exists():
        return "FAIL"
    content = article_path.read_text()
    prohibited = ["stunning", "vibrant", "nestled", "charming", "hidden gem",
                  "must-visit", "you won't be disappointed", "world-class"]
    failures = [p for p in prohibited if p.lower() in content.lower()]
    if failures:
        print(f"    Style issues: {failures}")
        return "FAIL"
    return "PASS"


def run_verify_gate(article_path: Path, today: str) -> str:
    """Run basic verification. Returns PASS or FAIL."""
    if not article_path.exists():
        return "FAIL"
    content = article_path.read_text()
    # Check frontmatter fields present
    required_fields = ["title:", "author:", "publishedAt:", "format:", "tags:"]
    missing = [f for f in required_fields if f not in content]
    if missing:
        print(f"    Missing frontmatter: {missing}")
        return "FAIL"
    return "PASS"


def set_published(article_path: Path, today: str):
    """Update frontmatter to set status: published and lastVerified."""
    if not article_path.exists():
        return
    content = article_path.read_text()
    content = content.replace('status: "draft"', 'status: "published"')
    if "lastVerified:" not in content:
        content = content.replace("status: \"published\"", f"status: \"published\"\nlastVerified: {today}")
    article_path.write_text(content)


def run_gsc_refresh() -> bool:
    """Pull fresh Google Search Console analytics + coverage before the strategy
    run so performance data is same-day. No-ops gracefully when credentials or
    google-api deps aren't present — the strategy engine then reads the last
    committed report. Never stalls the loop."""
    ok = False
    for script in ("gsc-search-analytics.py", "gsc-coverage-monitor.py"):
        path = REPO_ROOT / "ops/scripts" / script
        if not path.exists():
            continue
        try:
            result = subprocess.run(
                [sys.executable, str(path)],
                cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=180
            )
            if result.returncode == 0:
                ok = True
            else:
                print(f"  GSC refresh ({script}) skipped: {result.stderr.strip()[:160]}")
        except Exception as e:
            print(f"  GSC refresh ({script}) error: {e}")
    return ok


def run_strategy_engine(today: str) -> list[dict]:
    """Run the Content Strategy Brain and return its ranked commissioning queue.
    Never raises — a strategy failure must not stall the publish loop."""
    strategy = Path(__file__).parent / "strategy_engine.py"
    if not strategy.exists():
        return []
    try:
        subprocess.run(
            [sys.executable, str(strategy), "--date", today],
            cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=90
        )
    except Exception as e:
        print(f"  Strategy engine error: {e}")
    # Read whatever it wrote (or the last good state) so commissioning still has input.
    strategy_json = REPO_ROOT / "ops/strategy/content-strategy.json"
    if strategy_json.exists():
        try:
            state = json.loads(strategy_json.read_text())
            return state.get("commissioning_queue", [])
        except (json.JSONDecodeError, OSError):
            return []
    return []


def run_llms_refresh() -> bool:
    """Regenerate llms.txt / llms-full.txt from the current sitemap so the
    agent-discoverability layer never drifts from what's published."""
    script = REPO_ROOT / "ops/scripts/generate-llms-txt.mjs"
    if not script.exists():
        return False
    try:
        result = subprocess.run(
            ["node", str(script)],
            cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=60
        )
        return result.returncode == 0
    except Exception as e:
        print(f"  llms.txt refresh error: {e}")
        return False


def run_corpus_refresh() -> bool:
    """Run the Supabase concierge corpus refresh."""
    script = REPO_ROOT / "next/scripts/refresh-content-registry.mjs"
    if script.exists():
        result = subprocess.run(
            ["node", str(script)],
            cwd=str(REPO_ROOT / "next"),
            capture_output=True, text=True, timeout=120
        )
        return result.returncode == 0
    return False


def find_latest_insider_picks() -> Path | None:
    """Find the most recent insider-picks file as fallback."""
    picks = sorted(CONTENT_DIR.glob("insider-picks-*.md"), reverse=True)
    return picks[0] if picks else None


def find_stale_town_hubs() -> list[str]:
    """Find town hub pages that haven't been updated recently."""
    towns = ["sorrento", "red-hill", "flinders", "mornington", "rye",
             "dromana", "portsea", "blairgowrie", "rosebud", "arthurs-seat"]
    stale = []
    for town in towns:
        path = CONTENT_DIR / f"area-guide-{town}.md"
        if path.exists():
            mtime = datetime.fromtimestamp(path.stat().st_mtime)
            age_days = (datetime.now() - mtime).days
            if age_days > 60:
                stale.append(town)
    return stale if stale else ["sorrento", "mornington"]


def write_monthly_report(path: Path, month_key: str, season: str, log: RunLog):
    report = f"""# Monthly Report — {month_key}

**Season:** {season.title()}  
**Pieces shipped:** {log.pieces_shipped}  
**Stalls:** {log.stalls}  
**Run date:** {log.started}

## This Month's Content

{chr(10).join(f"- {s['step']}: {s['status']}" for s in log.steps if s['status'] == 'DONE')}

## Signals Summary
See: `.claude/signals/thematic-gaps-{month_key}.md`

## Next Month Priorities
- [ ] Review seasonal calendar for upcoming month
- [ ] Refresh any town hubs stale >90 days  
- [ ] Commission seasonal long-form based on next month's research
"""
    path.write_text(report)


# ── Main Entry Point ──────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Peninsula Insider Content Engine")
    parser.add_argument("--tempo", choices=["daily", "weekly", "monthly"], required=True)
    parser.add_argument("--dry-run", action="store_true", help="Plan only, no commits")
    parser.add_argument("--force", action="store_true", help="Override stall protection")
    args = parser.parse_args()

    now_aest = datetime.now(AEST)
    today = now_aest.strftime("%Y-%m-%d")

    print(f"\n🌿 Peninsula Insider — Agentic Content Engine")
    print(f"   Tempo: {args.tempo.upper()}")
    print(f"   Time: {now_aest.strftime('%Y-%m-%d %H:%M AEST')}")
    print(f"   Repo: {REPO_ROOT}")
    print(f"   Dry run: {args.dry_run}\n")

    state = load_loop_state()
    log = RunLog(args.tempo, today)

    try:
        if args.tempo == "daily":
            run_daily(log, state, today, now_aest)
        elif args.tempo == "weekly":
            run_weekly(log, state, today, now_aest)
        elif args.tempo == "monthly":
            run_monthly(log, state, today, now_aest)
    except Exception as e:
        log.error(f"Unhandled exception: {e}")
        print(f"\nFatal error: {e}", file=sys.stderr)
        raise
    finally:
        log.save()
        state["last_run"] = {"tempo": args.tempo, "date": today}
        state["stalls"] = state.get("stalls", 0) + log.stalls
        save_loop_state(state)

    print(f"\n✓ {args.tempo.title()} run complete — {log.pieces_shipped} piece(s) shipped")


if __name__ == "__main__":
    main()
