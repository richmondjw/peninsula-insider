---
description: Peninsula Insider newsroom runtime — weekly operational artifacts. Personas + templates live in OpenClaw at JWR_PKM_2026/04-agents/peninsula-insider/.
tags: [peninsula-insider, newsroom, runtime]
---

# PI Newsroom — Runtime Artifacts

Weekly work product of the editorial sub-org. Personas and templates live upstream in OpenClaw.

## Structure

```
.claude/newsroom/
├── house-style.md             (Vera — living guide, evolved from template)
├── slates/                    (Sloane — weekly slate + 4-week look-ahead)
├── briefs/                    (Margot — one per commissioned piece)
├── signals/                   (Scout Phase 2 — weekly signal brief)
├── retros/                    (Sloane — Friday retro per week)
├── hooks/                     (Freya Phase 2 — headline triplets + hook library)
├── perf/                      (Dex Phase 2 — Friday performance brief)
├── columns/                   (Section editors — weekly columns + events calendar)
└── editor-letters/            (Tyler — weekly, drafted one week ahead)
```

## Canonical specs

`~/.openclaw/workspace/JWR_PKM_2026/04-agents/peninsula-insider/` — personas, playbooks, triggers, templates.

## Spawnable agents

`peninsula-insider/.claude/agents/` — Claude Code-compatible tight specs. Both Claude Code and OpenClaw read from here.
