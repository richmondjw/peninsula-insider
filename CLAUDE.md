# Peninsula Insider — Claude Code Project

Live site: https://peninsulainsider.com.au
Repo: `peninsula-insider` on GitHub (`richmondjw/peninsula-insider`)
Astro app: `next/`

## Build and deploy

```bash
# Build (must run on Linux/Docker — node_modules are Linux binaries)
cd next && npm run build:search

# Copy to live root
cd .. && ./build-live.sh

# Commit and push
git add -A
git commit -m "build: description"
git push origin main
```

Keep output **static**. Do not add Vercel adapters or SSR.

After any deploy: verify the live page with `curl -s <url> | grep "expected string"` before reporting done.

## Project structure

```
next/src/content/articles/   — Journal articles (Markdown, source of truth)
next/src/data/venues/        — Venue JSON
next/src/data/events/        — Events JSON
next/src/data/experiences/   — Experiences JSON
docs/                        — Editorial, product, and strategy reference docs
.claude/agents/              — Editorial team agent definitions (sub-agents)
.claude/newsroom/            — Live editorial state: slates, retros, look-ahead, signals
```

## Editorial voice (non-negotiable)

- Sound local, not tourist-board
- Specific over generic — name the place, the dish, the person
- Opinionated with a reason — state who something is for and who it is not for
- Never invent contributors, sources, or quotes
- No exclamation marks in editorial copy
- British spelling and cadence
- "Could this run anywhere else?" — if yes, it needs a sharper Peninsula angle

## House bylines

- **By James Richmond** — signed essays, editor letters, opinionated longform, high-trust flagship pieces
- **By The Peninsula Insider** — service journalism, guides, roundups, collaboratively produced content

## Recurring editorial formats

| Format | Description |
|--------|-------------|
| **Peninsula This Weekend** | Weekly flagship dispatch — one anchor, two alternates, a day shape, fallback, local edge, skip, verdict |
| **The Insider Edit** | Strongest picks in a category — decisive, taste-led |
| **Weekend Notes** | Practical planning layer tied to current conditions and upcoming events |
| **Cellar Door Dispatch** | Wine-country reporting, new releases, harvest notes |
| **Long Lunch List** | Restaurant curation built around mood, occasion, booking urgency |
| **Stay Notes** | Accommodation reviews and planning-oriented roundups |
| **Slow Peninsula** | Walks, beaches, wellness, rainy-day, shoulder-season, reset pieces |

## Content labels

`Editor's Pick` · `Worth Booking Early` · `Better Midweek` · `Best in Autumn` · `Bring the Kids` · `Save for a Sunny Day`

## Editorial team (Claude sub-agents)

Invoke via Task tool or `@agent-name`. Not sure who to use? Start with `newsroom`.

| Agent | Role | Invoke for |
|-------|------|-----------|
| `newsroom` | Dispatcher | Unsure who to use, or need to sequence a multi-agent workflow |
| `tyler-eic` | Editor-in-Chief | Brand voice, Editor's Letter, standards memos, editorial-commercial decisions |
| `sloane-managing` | Managing Editor | Weekly rhythm, slate, Monday commissioning, Wednesday checkpoint, Friday retro |
| `margot-executive` | Executive Editor | Pitch triage, commissioning briefs, structural edits, slot placement |
| `lucien-food` | Section Editor, Food & Drink | Food/wine pitches, producer profiles, restaurant coverage |
| `iris-culture` | Section Editor, Culture & Events | Events picks, arts coverage, weekend dispatch cultural lane |
| `vera-copy` | Copy Chief | Final line edit, house style, fact-checking, publication gate |
| `freya-headlines` | Headlines Editor | Headlines, SEO title tags, newsletter subject lines, social hooks |
| `dex-performance` | Performance Editor | Analytics, content scoring, search position, evergreen audits |
| `otto-research` | Research Editor | Event verification, venue health, fact-checking, research briefs |

**When to use agents vs work directly:**
- Work directly for: builds, file edits, git operations, technical changes
- Use agents for: any task requiring editorial judgement, voice, commissioning, or publication standards

## Key docs (load on demand — do not eagerly read all)

| Doc | Contents |
|-----|----------|
| `docs/editorial-system-2026-04-09.md` | Formats, bylines, voice rules, content labels |
| `docs/editorial-ops-system-2026-04-09.md` | Daily/weekly loops, desk ownership model |
| `docs/newsletter-product-2026-04-09.md` | Newsletter structure and issue format |
| `docs/strategic-review-2026-04-09.md` | Full site strategy and vision |
| `docs/roadmap-2026-04-09.md` | 24-week implementation roadmap |
| `HANDOVER-CLAUDE.md` | Technical handover brief and build conventions |

## Changelog

Every meaningful change must be logged in `CHANGELOG.md`:
- date
- files changed
- why it changed
- any follow-up items

## Red lines

- Do not switch to Vercel/SSR without explicit instruction
- Do not reintroduce Resend or custom email plumbing (newsletter = Beehiiv)
- Do not publish without a successful build confirmation
- Do not report a task done without verifying the live page
