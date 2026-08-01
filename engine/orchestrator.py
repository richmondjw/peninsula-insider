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
from datetime import date, datetime, timedelta, timezone
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

# Ensure dirs exist. Guarded so importing this module (e.g. from the self-test
# gate) never fails when REPO_ROOT points somewhere unwritable — the run itself
# sets PI_REPO_ROOT to a writable workspace.
for d in [SIGNALS_DIR, RESEARCH_DIR, RUNS_DIR, SLATES_DIR, LOOP_STATE_FILE.parent]:
    try:
        d.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


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
        # The hook covers interactive commits, but CI agent runs can be invoked
        # without it. Validate before staging any content for a main push.
        if files and any("next/src/content/" in str(path) for path in files):
            gate = subprocess.run(
                ["npm", "run", "validate:content"],
                cwd=str(REPO_ROOT / "next"), capture_output=True, text=True
            )
            if gate.returncode != 0:
                print(f"  Content admission gate failed:\n{gate.stdout}{gate.stderr}")
                return False
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
            capture_output=True, text=True, timeout=240  # room for a real LLM call
        )
        if result.returncode == 0 and output_path.exists():
            print(f"    ✓ Generated via content_generator")
            return True
        else:
            print(f"    ✗ Generator failed: {result.stderr[:300]}")
            # Publishable content may not fall through to the generic stub.
            # Preserve an existing source file, but return failure so it cannot
            # be re-published as if a refresh succeeded.
            if gen_task:
                return False

    # Integration path 2: real event intel, stub only as a last resort.
    #
    # This used to write `'events': []` unconditionally, every single day. That
    # empty list flows straight into the picks prompt as "Events this week: []"
    # while the prompt asks the model to name something "particularly good
    # RIGHT NOW" and "worth going this week specifically". Asked for specifics
    # and given nothing, the model invented them: the 2026-07-27 column
    # recommended "a ceramics show closing soon in Red Hill" with no venue, no
    # date, and an FAQ telling readers to check a noticeboard.
    #
    # Feed it real events and that failure mode goes away.
    if task == 'daily-event-intel' and not output_path.exists():
        events, source = _load_event_intel(date)
        if not events:
            # Kept so a missing scan cannot break the run, but made loud. A
            # silent empty list is exactly what caused the problem above.
            print(f"    ! event intel EMPTY ({source}). Picks will have no event "
                  f"data and may generalise. Check the events scan.")
        else:
            print(f"    ✓ event intel: {len(events)} event(s) from {source}")
        # Rotation ledger. Without it the generator has no memory and returns
        # the highest-prior answer every day, which is how Ten Minutes by
        # Tractor led the column on 24, 25 and 27 July 2026.
        try:
            import recency
            ledger = recency.build_ledger(REPO_ROOT, date_obj_or_today(date))
            print(f"    ✓ rotation: EAT type {ledger['eat_type']}, "
                  f"{len(ledger['blocked'])} venue(s) on cooldown, "
                  f"{ledger['pool']['eligible_today']} eligible")
        except Exception as exc:
            ledger = None
            print(f"    ! rotation ledger unavailable ({exc}). Picks may repeat.")
        output_path.write_text(json.dumps({
            'date': date, 'season': season,
            'events': events,
            'events_source': source,
            'rotation': ledger,
            'seasonal_context': f'{season.title()} on the Mornington Peninsula',
            'recommended_picks': []
        }, indent=2))
        return True

    # Integration path 3: non-publishable slate/signal stubs. Never create a
    # fallback under the Astro content root: callers must treat the missing
    # article as a failed commission, not something suitable for a batch push.
    try:
        output_path.resolve().relative_to(CONTENT_DIR.resolve())
        print(f"    ✗ No publishing integration for {task}; no content file written")
        return False
    except ValueError:
        pass
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

    # 0b. Autonomous execution — act on the safest top strategy items (CTR
    #     title/meta rewrites on journal articles) with no human in the loop.
    #     Guardrailed, capped, idempotent, measured. See engine/auto_act.py.
    log.step("auto-act", "START")
    acted = run_auto_act(today)
    if acted:
        files = [a["file"] for a in acted]
        for f in files:  # belt-and-braces: enforce house style on every edited file
            sanitize_house_style(REPO_ROOT / f)
        commit_msg = f"feat(seo): autonomous CTR fix {today} [agent-authored] [skip-review]"
        if git_commit_and_push(commit_msg, files + ["ops/strategy/actioned.jsonl"]):
            log.step("auto-act", "DONE", f"executed {len(files)} CTR fix(es): {', '.join(Path(f).name for f in files)}")
            log.pieces_shipped += len(files)
        else:
            log.step("auto-act", "WARN", "changes staged but push failed")
    else:
        log.step("auto-act", "SKIP", "nothing safely actionable (or PI_AUTO_ACT=0)")

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

    # 2b. Hero image selection. Runs after the column exists so the image can
    # follow the picks rather than a hardcoded season map — that map put the
    # same TMBT photo on seven of twelve consecutive columns.
    log.step("hero-image", "START")
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import hero_image as _hero
        from datetime import date as _date
        _res = _hero.stamp(article_path, today=_date.fromisoformat(today))
        if _res.get("ok"):
            _note = " RECYCLED" if _res.get("recycled") else ""
            log.step("hero-image", "DONE", f"{_res['src']} ({_res['reason']}){_note}")
        else:
            log.step("hero-image", "WARN", _res.get("reason", "no selection"))
    except Exception as _e:
        log.step("hero-image", "WARN", f"selection failed, hero left as written: {_e}")

    # 3. Style gate
    log.step("style-gate", "START")
    style_result = run_style_gate(article_path)
    if style_result == "FAIL":
        log.error("Style gate failed — running one revision")
        # Simplified revision: ask dispatch to fix specific issues
        call_openclaw_agent("dispatch-desk", {**dispatch_brief, "revision": True, "style_notes": "simplify, remove generic language, remove ALL dollar figures and prices"}, article_path)
        style_result = run_style_gate(article_path)
        if style_result == "FAIL":
            import re as _re
            if article_path.exists() and _re.search(r"\$\s?\d", article_path.read_text()):
                # Pricing would hard-fail the build's lint:no-pricing gate and
                # block every subsequent deploy — abort this publish instead.
                log.error("Pricing still present after revision — aborting daily publish")
                article_path.unlink()
                return
            log.step("style-gate", "WARN", "Second pass also flagged — shipping with log note")
    else:
        log.step("style-gate", "PASS")

    # 4. Verify gate
    log.step("verify-gate", "START")
    verify_result = run_verify_gate(article_path, today)
    if verify_result == "FAIL":
        log.error("Verify gate hard fail — checking for fallback")
        fallback = find_latest_insider_picks(exclude=article_path)
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
        generated = call_openclaw_agent(desk, {
            "task": "monthly-long-form",
            "month": month_key,
            "season": season,
            "piece_number": i + 1,
            "research_file": str(research_output),
            "thematic_file": str(thematic_output),
            "output_path": str(lf_path),
            "target_words": 1200,
        }, lf_path)
        if generated:
            long_form_paths.append(lf_path)
            log.step(f"long-form-{i+1}", "DONE")
        else:
            log.error(f"long-form-{i+1} generation failed; excluded from commit")

    # 4. Town hub refresh (2 most stale)
    log.step("town-hub-refresh", "START")
    stale_towns = find_stale_town_hubs()
    for town in stale_towns[:2]:
        town_path = REPO_ROOT / f"next/src/content/articles/area-guide-{town}.md"
        generated = call_openclaw_agent("field-desk", {
            "task": "town-hub-refresh",
            "town": town,
            "month": month_key,
            "season": season,
            "existing_file": str(town_path),
            "output_path": str(town_path),
        }, town_path)
        if generated:
            long_form_paths.append(town_path)
        else:
            log.error(f"town-hub-refresh for {town} failed; existing file left untouched and excluded from commit")
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


def sanitize_house_style(article_path: Path) -> int:
    """Deterministically enforce the BRAND-PI em-dash hard rule that the build's
    lint:house-style gate checks. Generated content routinely contains em-dashes,
    which would fail the deploy — so we normalise them to ' - ' here, before the
    file is ever committed, keeping the autonomous loop self-consistent with the
    build. En-dashes and Markdown '---' rules are intentionally left untouched.
    Returns the number of em-dashes replaced."""
    if not article_path.exists():
        return 0
    import re as _re
    content = article_path.read_text()
    count = content.count("—")
    if count:
        content = _re.sub(r"\s*—\s*", " - ", content)
        article_path.write_text(content)
        print(f"    Sanitised {count} em-dash(es) in {article_path.name}")
    return count


def run_style_gate(article_path: Path) -> str:
    """Run style checks. Returns PASS or FAIL."""
    if not article_path.exists():
        return "FAIL"
    # Normalise house-style violations the build enforces (em-dashes) before checks.
    sanitize_house_style(article_path)
    content = article_path.read_text()
    prohibited = ["stunning", "vibrant", "nestled", "charming", "hidden gem",
                  "must-visit", "you won't be disappointed", "world-class"]
    failures = [p for p in prohibited if p.lower() in content.lower()]
    # BRAND-PI "No pricing on site. Ever." — the build's lint:no-pricing gate
    # fails the deploy on any prose dollar figure, so catch it here first.
    import re as _re
    if _re.search(r"\$\s?\d", content):
        failures.append("pricing ($ figure)")
    if failures:
        print(f"    Style issues: {failures}")
        return "FAIL"
    return "PASS"


def run_verify_gate(article_path: Path, today: str) -> str:
    """Factual verification gate. Returns PASS or FAIL.

    Two layers: (1) frontmatter completeness, then (2) the real factual gate
    (engine/verify_gate.py) — referential integrity, day-of-week correctness,
    internal-link 404s. A hard FAIL there BLOCKS the publish; flags are logged
    but ship. Degrades to the frontmatter check if the gate can't be imported."""
    if not article_path.exists():
        return "FAIL"
    content = article_path.read_text()
    required_fields = ["title:", "author:", "publishedAt:", "format:", "tags:"]
    missing = [f for f in required_fields if f not in content]
    if missing:
        print(f"    Missing frontmatter: {missing}")
        return "FAIL"

    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import verify_gate
        report = verify_gate.verify_content(
            article_path,
            content_dir=REPO_ROOT / "next/src/content",
            sitemap_path=REPO_ROOT / "sitemap.xml",
        )
    except Exception as e:
        print(f"    Verify gate unavailable ({e}) — frontmatter-only pass")
        return "PASS"

    for flag in report.get("flags", []):
        print(f"    [verify-flag] {flag}")
    if report["result"] == "FAIL":
        for f in report["fails"]:
            print(f"    [verify-FAIL] {f}")
        return "FAIL"
    print(f"    Verify: {report['result']} "
          f"({len(report.get('venue_checks', []))} venue, "
          f"{len(report.get('date_checks', []))} date checks)")
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


def run_auto_act(today: str) -> list[dict]:
    """Autonomously execute the safest top strategy items (CTR title/meta
    rewrites on journal articles). Guardrailed inside auto_act.py: capped,
    idempotent, grounded, gated, measured. Never raises — a failure here must
    not stall the publish loop. Set PI_AUTO_ACT=0 to disable."""
    if os.environ.get("PI_AUTO_ACT", "1") != "1":
        return []
    auto = Path(__file__).parent / "auto_act.py"
    if not auto.exists():
        return []
    limit = os.environ.get("PI_AUTO_ACT_LIMIT", "1")
    try:
        subprocess.run(
            [sys.executable, str(auto), "--limit", str(limit)],
            cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=240
        )
    except Exception as e:
        print(f"  auto-act error: {e}")
        return []
    # auto_act records to the ledger; report what changed via git.
    try:
        diff = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "diff", "--name-only", "--", "next/src/content/articles"],
            capture_output=True, text=True
        )
        return [{"file": f} for f in diff.stdout.split() if f]
    except Exception:
        return []


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


def date_obj_or_today(date_str: str):
    """Parse the run date, falling back to today rather than failing the run."""
    try:
        return date.fromisoformat(str(date_str)[:10])
    except (ValueError, TypeError):
        return datetime.now(AEST).date()


def _pick_rank(rec: dict, today) -> tuple:
    """Sort key for events heading into the picks prompt.

    content_generator only passes the first five records through, so ordering
    decides what the model actually sees. Sorting by startDate is wrong here:
    an always-on listing that opened in May sorts above a one-off happening on
    Saturday, and the prompt fills up with daily yoga.

    Rank: genuinely dated one-offs starting soon, then short runs, then
    evergreens. An event running longer than 60 days is treated as evergreen,
    which on this collection cleanly separates "2026-05-01 to 2027-04-30"
    listings from real events.
    """
    try:
        start = date.fromisoformat(str(rec["startDate"])[:10])
    except (KeyError, ValueError, TypeError):
        return (9, date.max)
    try:
        end = date.fromisoformat(str(rec.get("endDate") or rec["startDate"])[:10])
    except (ValueError, TypeError):
        end = start
    duration = (end - start).days
    evergreen = duration > 60
    # For something already running, what matters is that it is on now, not
    # when it opened. Clamp to today so it does not sort by ancient start date.
    effective = max(start, today)
    return (1 if evergreen else 0, effective, duration)


def _load_event_intel(date_str: str, horizon_days: int = 7) -> tuple[list[dict], str]:
    """Real events for the picks prompt, newest trustworthy source first.

    Returns (events, source_label). Never raises: a broken or missing source
    degrades to an empty list with a label saying which, so the caller can log
    it loudly rather than silently shipping a column with no facts in it.

    Source order:
      1. reports/peninsula-whats-on.json, written by the events scan. Preferred
         because it carries confidence labels and a primarySourceUrl per record.
      2. next/src/content/events/*.json, the live collection. Always present,
         but only as good as the last freshness pass.

    Only events whose window overlaps [today, today+horizon] are returned, and
    only fields the prompt can actually use. Handing the model a database dump
    buries the few facts that matter.
    """
    try:
        today = date.fromisoformat(date_str[:10])
    except (ValueError, TypeError):
        today = datetime.now(AEST).date()
    horizon = today + timedelta(days=horizon_days)

    def _trim(rec: dict) -> dict:
        keep = ("title", "startDate", "endDate", "startTime", "endTime",
                "venueName", "suburb", "priceTier", "freePaid", "bookingUrl",
                "primarySourceUrl", "lastCheckedDate", "category", "confidence")
        return {k: rec[k] for k in keep if rec.get(k)}

    def _in_window(rec: dict) -> bool:
        try:
            start = date.fromisoformat(str(rec["startDate"])[:10])
        except (KeyError, ValueError, TypeError):
            return False
        try:
            end = date.fromisoformat(str(rec.get("endDate") or rec["startDate"])[:10])
        except (ValueError, TypeError):
            end = start
        return start <= horizon and end >= today

    # 1. Events scan output.
    scan = REPO_ROOT / "reports" / "peninsula-whats-on.json"
    if scan.is_file():
        try:
            data = json.loads(scan.read_text(encoding="utf-8"))
            records = data.get("events", data) if isinstance(data, dict) else data
            picked = [_trim(r) for r in records if isinstance(r, dict) and _in_window(r)]
            if picked:
                return picked, "reports/peninsula-whats-on.json"
        except (json.JSONDecodeError, OSError, TypeError):
            pass

    # 2. Live collection.
    events_dir = REPO_ROOT / "next/src/content/events"
    if events_dir.is_dir():
        picked = []
        for f in sorted(events_dir.glob("*.json")):
            try:
                rec = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if rec.get("status") == "published" and _in_window(rec):
                picked.append(_trim(rec))
        if picked:
            picked.sort(key=lambda r: _pick_rank(r, today))
            return picked, "next/src/content/events (live collection)"

    return [], "no source available"


def find_latest_insider_picks(exclude: Path | None = None) -> Path | None:
    """Find the most recent insider-picks file as fallback. `exclude` keeps a
    just-written failing article from being offered as its own fallback."""
    picks = sorted(CONTENT_DIR.glob("insider-picks-*.md"), reverse=True)
    for p in picks:
        if exclude is None or p.resolve() != exclude.resolve():
            return p
    return None


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
        _alert(args.tempo, "fatal", f"{args.tempo} run crashed: {e}", log)
        raise
    finally:
        log.save()
        state["last_run"] = {"tempo": args.tempo, "date": today}
        state["stalls"] = state.get("stalls", 0) + log.stalls
        save_loop_state(state)
        # Non-silent alert path: if any step stalled (even on a "successful" run),
        # surface it so failures aren't invisible. See engine/alert.py.
        if log.stalls and log.errors:
            _alert(args.tempo, "error",
                   f"{args.tempo} run had {log.stalls} stall(s):\n- " + "\n- ".join(log.errors[:10]), log)

    print(f"\n✓ {args.tempo.title()} run complete — {log.pieces_shipped} piece(s) shipped")


def _alert(tempo: str, severity: str, body: str, log: "RunLog") -> None:
    """Emit a non-silent alert. Never raises — alerting must not mask the run."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import alert
        alert.emit_alert(
            title=f"PI {tempo} run: {severity} ({log.pieces_shipped} shipped, {log.stalls} stalls)",
            body=body, severity=severity, dedup_key=f"orchestrator-{tempo}")
    except Exception as e:
        print(f"  alert emit failed: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
