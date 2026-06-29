# Peninsula Insider — Agentic Content Engine
## Architecture v1.0 — June 2026

---

## 1. System Philosophy

Peninsula Insider runs as a **fully agentic publication**. No human approvals in the publish path. Content ships on a loop. Quality is enforced by the pipeline itself, not by a gatekeeper.

The system operates on three tempos:

| Tempo | Trigger | Output |
|---|---|---|
| **Daily** | 6:00 AEST cron | Insider Picks column, event intel update, concierge corpus refresh |
| **Weekly** | Monday 07:00 AEST | Slate, editorial commissions, SEO signal brief, competitive scan |
| **Monthly** | 1st of month 06:00 AEST | Deep seasonal research, long-form editorial, thematic content batch |

Plus a **continuous feedback loop** that reads search and traffic signals and feeds them back into the editorial intelligence layer.

---

## 2. Agent Hierarchy

```
REMY (Orchestrator)
├── SIGNAL AGENT          — reads SEO, Analytics, competitive data
├── RESEARCH AGENT        — Firecrawl + web search for topics/events
├── COMMISSIONING AGENT   — selects what to write based on signals
├── DESK AGENTS
│   ├── TABLE DESK        — Eat/Drink/Wine content
│   ├── STAY DESK         — Accommodation content  
│   ├── FIELD DESK        — Walks/Activities/Family
│   ├── ESCAPES DESK      — Itineraries/Weekends
│   └── DISPATCH DESK     — Events/Insider Picks/Newsletter
├── STYLE AGENT           — voice/brand QA gate
├── VERIFY AGENT          — factual accuracy, dead links, stale data
└── PUBLISH AGENT         — Git commit → push → live
```

**Loop engineering:** Each agent reports a structured completion signal. REMY does not move forward until it receives that signal. If an agent fails, REMY retries with a simplified brief (50% scope), then falls back to a cached template. The loop never stalls — it degrades gracefully.

---

## 3. Loop Engineering Model

Every content project has a **project lifecycle**:

```
BRIEF → RESEARCH → DRAFT → STYLE_PASS → VERIFY → COMMIT → DONE
```

State is tracked in `.claude/newsroom/loop-state/YYYY-MM-DD.json`

If any step times out (>10 min elapsed), the orchestrator:
1. Logs the stall
2. Simplifies the brief (drop FAQs, reduce word count by 40%)
3. Re-runs the stuck step once
4. If still failing → uses last successful template output for that content type
5. Always writes a completion record — even failed runs are logged

**Completion is non-negotiable.** The loop commits something every run. It may be lightweight, but it ships.

---

## 4. Feedback Circuits

### 4A. SEO Signal Feed (Weekly)
- Source: Semrush API → keyword rankings, traffic by page, SERP position
- Processed into: content gap map, keyword opportunity list
- Feeds: weekly commissioning brief
- Storage: `.claude/signals/seo-YYYY-WW.json`

### 4B. Competitive Intelligence (Weekly)
- Source: Firecrawl → rival sites (see list below)
- Extracts: new topics, format experiments, seasonal angles
- Processed into: thematic gap analysis, "they covered / we haven't" delta
- Feeds: monthly long-form brief
- Storage: `.claude/signals/competitive-YYYY-WW.json`

### 4C. Content Performance (Weekly)
- Source: GA4 or Semrush traffic data
- Extracts: top pages, declining pages, rising queries
- Processed into: editorial priority matrix
- Feeds: next week's commissioning decisions
- Storage: `.claude/signals/perf-YYYY-WW.json`

### 4D. Seasonal Intelligence (Monthly)
- Source: web research + Peninsula event calendars + previous year signal files
- Extracts: what's happening, what's seasonal, what queries spike
- Processed into: editorial calendar seeding + long-form brief
- Feeds: monthly content batch

---

## 5. Content Surface Map

Content is produced to serve traffic-generating surfaces in priority order:

| Priority | Surface | URL pattern | Update freq |
|---|---|---|---|
| 1 | Town hubs | `/explore/[town]` | Monthly |
| 2 | Best-of pages | `/eat/best-restaurants`, `/wine/best-cellar-doors` | Weekly |
| 3 | Insider Picks column | `/journal/insider-picks-*` | Daily |
| 4 | Seasonal features | `/journal/[season]-peninsula-*` | Monthly |
| 5 | Practical guides | `/journal/how-to-*`, `/journal/dog-friendly-*` | Quarterly |
| 6 | Venue deep-dives | `/wine/[venue]`, `/eat/[venue]` | On signal |
| 7 | Newsletter (Beehiiv) | Beehiiv API push | Weekly |

---

## 6. Competitive Site Targets

Sites to monitor for thematic intelligence:

- visitmorningtonpeninsula.com.au
- weekendnotes.com (Mornington Peninsula section)
- timeout.com/melbourne (peninsula coverage)
- goodfood.com.au (peninsula restaurants)
- broadsheet.com.au/melbourne (peninsula features)
- theaureview.com (victoria travel)
- traveller.com.au (mornington peninsula)

---

## 7. OpenClaw Integration

The system runs inside OpenClaw as a set of named agents with:
- Persistent context per agent (warm files loaded on each run)
- Token budget enforcement (each agent gets a budget; REMY allocates)
- Completion signals via structured JSON output
- Git operations via shell tool

**Token optimisation strategy:**
- Agents load only their warm context (not the full vault)
- Research agent caches search results to avoid re-fetching
- Style agent uses a diff-only pass (not full re-read)
- REMY reads summaries, not full article text
- All agent outputs are append-only logs (no full rewrites)

---

## 8. Deployment Model

Site is static Astro on GitHub Pages (peninsulainsider.com.au).

Deploy path:
1. Agent writes `.md` file to `next/src/content/articles/`
2. Commit + push to `main`
3. GitHub Actions `build-and-deploy.yml` triggers
4. Astro builds static output
5. Deploys to `gh-pages` branch or configured host
6. Live in <3 min from commit

No human approval in this path. The VERIFY + STYLE gates are the approval.

---

## 9. File Conventions

Every agent-authored file must include:
```yaml
authoredBy: "editorial"     # never invent human names
houseByline: true
status: "published"         # set by PUBLISH agent only
lastVerified: YYYY-MM-DD    # set by VERIFY agent
agentRun: YYYY-MM-DD-[tempo]  # daily/weekly/monthly + date
```

---

## 10. Reporting

Every run produces:
- `.claude/newsroom/runs/YYYY-MM-DD-[tempo].json` — machine log
- `.claude/newsroom/runs/YYYY-MM-DD-[tempo].md` — human summary
- CHANGELOG.md update — every meaningful content ship
