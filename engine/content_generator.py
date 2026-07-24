#!/usr/bin/env python3
"""
Peninsula Insider — Content Generator
Generates actual article content using Claude (OpenClaw).
This is the writer module — called by orchestrator when agents need to produce content.

Usage:
  python content_generator.py --task daily-insider-picks --date 2026-06-29 --output /path/to/output.md
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
import zoneinfo
import subprocess
import tempfile

AEST = zoneinfo.ZoneInfo("Australia/Sydney")

# ── PI Editorial Voice ─────────────────────────────────────────────────────
PI_VOICE_SYSTEM_PROMPT = """You are writing for Peninsula Insider — a premium local's guide to the Mornington Peninsula, Victoria, Australia.

VOICE RULES (non-negotiable):
- Specific always beats generic. Name the dish, the wine, the trail junction, the closing date.
- No brochure language: never write "stunning", "vibrant", "nestled", "charming", "hidden gem", "must-visit", "world-class".
- One clear opinion per pick. Recommend or don't. No hedge.
- Time-anchor everything. The reader decides this weekend.
- No preamble. Start with the thing, not with "This week..."
- Write like a knowledgeable local who has been there, not a tourism board.
- Sentences max 35 words.
- Oxford comma. Present tense for venues. Past tense for experiences the writer has had.
- The Peninsula Insider house byline means nobody claims to be a human writer.
- NO PRICING, EVER. Never state a dollar figure, price range, or cost ("$135pp",
  "from $40") - the site has a hard no-pricing rule enforced at build time.
  Say "bookings essential", "book ahead", or "check the website" instead.

SEASON CONTEXT:
- Summer (Dec-Feb): beaches, outdoor dining, crowds, hot springs, sailing
- Autumn (Mar-May): truffle season (from late May), harvest, cellar door specials, quieter
- Winter (Jun-Aug): fireside, cellar doors, hot springs, spa stays, farm dinners, dramatically empty beaches
- Spring (Sep-Nov): wildflowers, reopenings, outdoor dining returns, new vintage releases

ARTICLE SCHEMA (all fields required):
---
title: "[Title — no quotes around it if simple]"
dek: "[One-sentence hook that names all three picks specifically]"
author: "editorial"
houseByline: true
publishedAt: YYYY-MM-DD
heroImage:
  src: "/images/sourced/[existing-image].webp"
  alt: "[Descriptive alt with location and season]"
  credit: "Peninsula Insider"
  license: "other-licensed"
format: "insider-edit"
tags: [insider-picks, [season], weekly]
relatedVenues: []
relatedExperiences: []
readingTimeMinutes: 4
featured: false
status: "draft"
lastVerified: YYYY-MM-DD
agentRun: YYYY-MM-DD-daily
clusterLinks:
  - label: "[Title of related PI page]"
    href: "/[path]"
  - label: "[Title of related PI page]"
    href: "/[path]"
  - label: "[Title of related PI page]"
    href: "/[path]"
faq:
  - question: "[Practical question]"
    answer: "[Complete answer with address, hours, price, booking URL if known]"
  - question: "[Second practical question]"
    answer: "[Complete answer]"
---

[Article body — no H1, start with body text]
"""

# ── Valid cluster link targets ─────────────────────────────────────────────
CLUSTER_LINK_TARGETS = [
    ("/journal/things-to-do-mornington-peninsula/", "Things to Do on the Mornington Peninsula"),
    ("/journal/where-to-eat-mornington-peninsula/", "Where to Eat on the Mornington Peninsula"),
    ("/wine/best-cellar-doors/", "Best Cellar Doors on the Mornington Peninsula"),
    ("/stay/best-accommodation/", "Best Accommodation on the Mornington Peninsula"),
    ("/explore/best-walks/", "Best Walks on the Mornington Peninsula"),
    ("/journal/how-to-plan-a-peninsula-weekend/", "How to Plan a Peninsula Weekend"),
    ("/journal/dog-friendly-mornington-peninsula/", "Dog-Friendly Mornington Peninsula"),
    ("/journal/mornington-peninsula-in-winter/", "Mornington Peninsula in Winter"),
    ("/journal/peninsula-this-weekend/", "Peninsula This Weekend"),
    ("/eat/best-restaurants/", "Best Restaurants on the Mornington Peninsula"),
]

HERO_IMAGES = {
    "winter": "/images/sourced/explore-cape-schanck-lighthouse-01.webp",
    "spring": "/images/sourced/explore-cape-schanck-lighthouse-01.webp",
    "summer": "/images/sourced/explore-cape-schanck-lighthouse-01.webp",
    "autumn": "/images/sourced/explore-cape-schanck-lighthouse-01.webp",
}


def get_season(month: int) -> str:
    seasons = {
        12: "summer", 1: "summer", 2: "summer",
        3: "autumn", 4: "autumn", 5: "autumn",
        6: "winter", 7: "winter", 8: "winter",
        9: "spring", 10: "spring", 11: "spring",
    }
    return seasons.get(month, "summer")


def generate_insider_picks(date_str: str, research_data: dict | None = None) -> str | None:
    """
    Generate an Insider Picks column using Claude (via OpenClaw or claude CLI).
    Returns the full markdown content of the article, or None when no LLM
    backend is available — publishing callers must SKIP, never fabricate.
    (The template fallback shipped 19 identical date-swapped articles between
    2026-07-05 and 2026-07-24 before this was enforced.)
    """
    now = datetime.fromisoformat(date_str) if "-" in date_str else datetime.now(AEST)
    season = get_season(now.month)
    
    # Build context from research data
    research_context = ""
    if research_data:
        events = research_data.get("events", [])
        recommended = research_data.get("recommended_picks", [])
        seasonal_ctx = research_data.get("seasonal_context", "")
        research_context = f"""
RESEARCH DATA:
Season context: {seasonal_ctx}
Events this week: {json.dumps(events[:5], indent=2)}
Recommended picks: {json.dumps(recommended, indent=2)}
"""

    prompt = f"""Write an Insider Picks column for Peninsula Insider.

Date: {date_str}
Season: {season.title()}
{research_context}

Write three picks:
1. EAT/DRINK/WINE: A specific restaurant, cellar door, or food experience that is particularly good RIGHT NOW in {season}. Be specific about what dish, wine, or event makes it worth going this week specifically.

2. EXPERIENCE/WALK: An outdoor or nature experience that is at its best in {season} on the Peninsula. Be specific about conditions, timing, what makes winter/summer/etc the right time.

3. DISCOVERY/CULTURAL: Something off the main track — a gallery show with a closing date, a market, a new opening, or something locals know that visitors discover through PI.

Each pick: 130-180 words. Structure: hook sentence → detail paragraph → practical note (address, time needed, how to book — never a price) → pairing suggestion (one sentence).

After the three picks, write a footer with the three picks' key details (name, address, key practical info).

Use the full frontmatter schema specified in your system prompt. For clusterLinks, choose 3 from:
{json.dumps(CLUSTER_LINK_TARGETS, indent=2)}

The slug will be: insider-picks-{date_str}
heroImage src should be: {HERO_IMAGES.get(season, HERO_IMAGES['winter'])}

Remember: no brochure language. Specific. Local. Opinionated. Start with the thing, not with "This week"."""

    # Generate via the shared LLM client (Anthropic SDK / OpenRouter in CI,
    # `claude` CLI locally). None means no backend produced text — the caller
    # must skip the publish and alert, NOT substitute canned content.
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).resolve().parent))
    import llm
    out = llm.complete(prompt, system=PI_VOICE_SYSTEM_PROMPT, max_tokens=2000)
    return _clean_llm_output(out) if out else None


def _clean_llm_output(text: str) -> str:
    """Normalise raw LLM output into a valid article file. Models sometimes
    wrap the whole document in a markdown code fence and emit an unquoted
    title containing a colon — both break Astro's frontmatter parse at build
    time (first seen on the 2026-07-24 run)."""
    import re as _re
    t = text.strip()
    if t.startswith("```"):
        lines = t.splitlines()[1:]  # drop the opening fence line
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        t = "\n".join(lines).strip()

    def _quote_title(m):
        v = m.group(1).strip()
        if v and v[0] not in "\"'":
            v = '"' + v.replace('"', "'") + '"'
        return f"title: {v}"

    t = _re.sub(r"^title:\s*(.+)$", _quote_title, t, count=1, flags=_re.MULTILINE)
    return t + "\n"


def generate_template_picks(date_str: str, season: str) -> str:
    """Generate a template Insider Picks when LLM is not available."""
    now_aest = datetime.now(AEST)
    
    picks_by_season = {
        "winter": {
            "eat": {
                "name": "Quealy Winemakers",
                "hook": "The kitchen at Quealy is running its winter menu through August — and the mushroom tart with truffle cream is worth the drive to Balnarring alone.",
                "detail": "Winemakers Kathleen Quealy and Kevin McCarthy have been farming this site for three decades, and the food program reflects the same unhurried rigour. The winter menu leans hard into preserved, earthy, slow-cooked. The braised short rib comes from the paddock next door.",
                "practical": "Red Hill Road, Balnarring. Bookings essential on weekends. Open Thu–Sun for lunch, Fri–Sat for dinner. Cellar door open daily for tastings without booking.",
                "pair": "Pair lunch with a cellar door tasting — the Turbul Meunier is the current standout.",
                "venue_slug": "quealy-winemakers",
                "booking": "quealy.com.au",
            },
            "experience": {
                "name": "Cape Schanck Lighthouse Walk",
                "hook": "The boardwalk at Cape Schanck is at its most theatrical right now — Bass Strait in full winter swell, the lighthouse tracking through grey sky, the headland emptied of the summer crowd.",
                "detail": "The 4-kilometre return track to Pulpit Rock is one of the most dramatic short walks in Victoria, and mid-winter is when it earns that. The boardwalk extends out over sheer rock with water on both sides. In the right conditions — high swell, overcast — it feels genuinely wild.",
                "practical": "Cape Schanck Road, Cape Schanck. 90 minutes return. Easy difficulty. Wear layers. Check wind conditions before the boardwalk. Lighthouse tours run selected days.",
                "pair": "Finish with lunch at the Flinders Hotel — 10 minutes' drive, warm room, long menu.",
            },
            "discovery": {
                "name": "MPRG Winter Exhibition",
                "hook": "The Mornington Peninsula Regional Gallery has a new winter show running through mid-August — and the Thursday evening openings are when the rooms are worth being in.",
                "detail": "MPRG is consistently underestimated. The main gallery runs contemporary Australian works alongside Peninsula-focused shows in the side rooms. The winter program tends toward darker, more interior work that suits the season. Entry is free, which makes it the most overlooked cultural proposition on the Peninsula.",
                "practical": "2/350 Dunns Road, Mornington. Free entry. Open most days — check mprg.mornpen.vic.gov.au for current hours. 5 minutes from Main Street.",
                "pair": "Walk down to Mornington Pier afterwards if the rain holds off — coffee at any of the Main Street cafes on the way back.",
            },
        }
    }
    
    picks = picks_by_season.get(season, picks_by_season["winter"])
    eat = picks["eat"]
    exp = picks["experience"]
    disc = picks["discovery"]
    
    # Build cluster links — pick 3 relevant ones
    cluster = CLUSTER_LINK_TARGETS[:3]
    cluster_yaml = "\n".join([f'  - label: "{c[1]}"\n    href: "{c[0]}"' for c in cluster])
    
    content = f"""---
title: "Insider Picks — {now_aest.strftime('%d %B').lstrip('0')}: The {season.title()} Edit"
dek: "{eat['name']}'s winter kitchen, the Cape Schanck boardwalk at its most dramatic, and MPRG's current show before it closes."
author: "editorial"
houseByline: true
publishedAt: {date_str}
heroImage:
  src: "/images/sourced/explore-cape-schanck-lighthouse-01.webp"
  alt: "Cape Schanck Lighthouse Walk in {season} light, Mornington Peninsula"
  credit: "Peninsula Insider"
  license: "other-licensed"
format: "insider-edit"
tags: [insider-picks, {season}, weekly, peninsula]
relatedVenues: [{eat.get('venue_slug', '')}]
relatedExperiences: []
readingTimeMinutes: 4
featured: false
status: "draft"
lastVerified: {date_str}
agentRun: {date_str}-daily
clusterLinks:
{cluster_yaml}
faq:
  - question: "Where is {eat['name']} and do you need to book?"
    answer: "{eat['practical']}"
  - question: "How long is the Cape Schanck Lighthouse Walk?"
    answer: "The Cape Schanck Lighthouse walk is a 4-kilometre return track to Pulpit Rock, taking approximately 90 minutes. It is rated easy difficulty but the boardwalk section is exposed. Check wind conditions before you go. Lighthouse tours run on selected days — see parksvictoria.vic.gov.au for details."
---

{eat['hook']}

## {eat['name']}

{eat['detail']}

{eat['practical']}

{eat['pair']}

## The walk for this weather

{exp['hook']}

{exp['detail']}

{exp['practical']}

{exp['pair']}

## Worth making time for

{disc['hook']}

{disc['detail']}

{disc['practical']}

{disc['pair']}

---

**{eat['name']}**  
Tasting, lunch, dinner. Book at {eat.get('booking', 'venue website')}.

**Cape Schanck Lighthouse Walk**  
Cape Schanck Road, Cape Schanck. 90 minutes return.

**Mornington Peninsula Regional Gallery**  
2/350 Dunns Road, Mornington. Free entry. mprg.mornpen.vic.gov.au

_Confirm current hours and availability directly with each venue before visiting._
"""
    return content


def _fail_no_llm(task: str, date_str: str) -> None:
    """No LLM backend produced content for a publishable article: alert loudly
    and exit non-zero WITHOUT writing an output file, so the orchestrator's
    gates see a missing article instead of committing canned content."""
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).resolve().parent))
    import llm
    msg = (f"{task} for {date_str}: no LLM backend produced content "
           f"(llm.available() = {llm.available()}). Publish skipped - "
           "check ANTHROPIC_API_KEY / OPENROUTER_API_KEY secrets and provider status.")
    print(f"✗ {msg}", file=sys.stderr)
    try:
        import alert
        alert.emit_alert(
            title=f"PI content engine: {task} publish skipped (no LLM)",
            body=msg, severity="error", dedup_key="llm-unavailable")
    except Exception as e:
        print(f"  alert emit failed: {e}", file=sys.stderr)
    sys.exit(2)


def load_research(research_file: str | None) -> dict | None:
    if research_file and Path(research_file).exists():
        try:
            return json.loads(Path(research_file).read_text())
        except:
            return None
    return None


def main():
    parser = argparse.ArgumentParser(description="PI Content Generator")
    parser.add_argument("--task", required=True, 
                        choices=["daily-insider-picks", "weekend-picks", "newsletter", "long-form", "town-hub-refresh"])
    parser.add_argument("--date", default=datetime.now(AEST).strftime("%Y-%m-%d"))
    parser.add_argument("--output", required=True)
    parser.add_argument("--research-file", default=None)
    parser.add_argument("--season", default=None)
    parser.add_argument("--word-target", type=int, default=700)
    args = parser.parse_args()

    now_aest = datetime.now(AEST)
    season = args.season or get_season(now_aest.month)
    research_data = load_research(args.research_file)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Generating: {args.task}")
    print(f"Date: {args.date}, Season: {season}")
    print(f"Output: {output_path}")

    if args.task == "daily-insider-picks":
        content = generate_insider_picks(args.date, research_data)
        if content is None:
            _fail_no_llm(args.task, args.date)
        output_path.write_text(content)
        print(f"✓ Written: {output_path} ({len(content)} chars)")

    elif args.task == "weekend-picks":
        content = generate_insider_picks(args.date, research_data)
        if content is None:
            _fail_no_llm(args.task, args.date)
        # Adjust frontmatter for weekend-picks format
        content = content.replace('"insider-edit"', '"weekend-guide"')
        content = content.replace('tags: [insider-picks', 'tags: [weekend-picks')
        output_path.write_text(content)
        print(f"✓ Written: {output_path}")

    elif args.task == "newsletter":
        content = generate_template_picks(args.date, season)
        # Strip to newsletter format
        newsletter = f"""# Peninsula Radar — {args.date}

**Subject:** Peninsula Radar — {datetime.fromisoformat(args.date).strftime('%d %b')}: Three things for this weekend

---

{content.split('---')[2].strip()[:800]}

— The Peninsula Insider team
"""
        output_path.write_text(newsletter)
        print(f"✓ Newsletter written: {output_path}")

    else:
        # Generic: write a placeholder that signals the agent needs to fill it
        placeholder = f"""---
title: "[{args.task} — {args.date}]"
author: "editorial"
houseByline: true
publishedAt: {args.date}
format: "guide"
tags: [{season}, peninsula]
status: "draft"
lastVerified: {args.date}
agentRun: {args.date}-{args.task}
---

[Content to be generated by {args.task} agent]
"""
        output_path.write_text(placeholder)
        print(f"✓ Placeholder written: {output_path}")


if __name__ == "__main__":
    main()
