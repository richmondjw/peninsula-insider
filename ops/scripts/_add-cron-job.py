"""One-shot script: adds the Peninsula Insider SEO weekly cron job to jobs.json."""
import datetime, json, pathlib

CRON_FILE = pathlib.Path(r"C:\Users\James\.openclaw\cron\jobs.json")

KEY = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHlpaHNjeXJmbW5kamxrZmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjI2MjYsImV4cCI6MjA5MDIzODYyNn0."
       "wykovkUv5HsFQrJ-SFlrHlOodJc2bUbpjNG16sSB7cI")
BASE_URL = "https://vjlyihscyrfmndjlkfew.supabase.co/rest/v1"
JOB_ID   = "b7e3f1a2-4c8d-4e9f-a0b1-c2d3e4f56789"
TG_TO    = "7197145937"

next_monday = datetime.datetime(2026, 4, 27, 0, 0, 0, tzinfo=datetime.timezone.utc)
now_ms      = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
next_ms     = int(next_monday.timestamp() * 1000)

REPORT_BOILERPLATE = f"""## Cron Run Reporting (MANDATORY — do this first and last)

At the START of this job, write a run record to Mission Control:
```bash
RUN_ID=$(curl -s "{BASE_URL}/cron_job_runs" \\
  -H "apikey: {KEY}" -H "Authorization: Bearer {KEY}" \\
  -H "Content-Type: application/json" -H "Prefer: return=representation" \\
  -d '{{"cron_job_id":"{JOB_ID}","task_id":"system","agent_id":"remy","status":"running","trigger_source":"schedule","started_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}}' | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
START_TIME=$(date +%s%3N)
```

At the END of this job (success or failure), close the run record:
```bash
END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))
curl -s "{BASE_URL}/cron_job_runs?id=eq.$RUN_ID" -X PATCH \\
  -H "apikey: {KEY}" -H "Authorization: Bearer {KEY}" \\
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \\
  -d '{{"status":"completed","completed_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","duration_ms":\'$DURATION\',"output_summary":"Peninsula Insider SEO Digest delivered"}}'
```
If the job fails, use "status":"failed" and set "error_message" instead of output_summary.

---"""

TASK_BODY = f"""{REPORT_BOILERPLATE}

You are Remy. Read this week's Peninsula Insider GSC report and deliver a concise SEO digest to James.

Step 1 — Find the latest weekly report:
```bash
ls -t /home/node/.openclaw/workspace/peninsula-insider/ops/reports/gsc-weekly-*.md 2>/dev/null | head -1
```

Step 2 — Read that file. If none exists, report: "GSC weekly report not yet generated — check Windows Task Scheduler."

Step 3 — Extract and summarise:
- Indexed pages: X/126 KEEP_IMPROVE now indexed (PASS), delta from last run
- Total impressions (28d)
- Top 3 queries by impressions and their avg position
- Top keyword gap: highest-impression query at position 4–20
- One specific recommended action for James this week

Step 4 — Save digest to Mission Control documents table (doc_type: report, project: Peninsula Insider, tags: [seo, weekly, peninsula-insider]).

Deliver via Telegram in this format:
📊 **Peninsula Insider SEO — Week [N]**
• Indexed: X/126 pages (+Y new this week)
• Impressions (28d): N
• Top query: "[query]" — pos X.x
• Keyword gap: "[query]" — pos X.x, N impressions
• Action: [one specific next step]"""

new_job = {
    "id":           JOB_ID,
    "agentId":      "main",
    "sessionKey":   "agent:main:main",
    "name":         "Peninsula Insider — Weekly SEO Digest",
    "enabled":      True,
    "createdAtMs":  now_ms,
    "updatedAtMs":  now_ms,
    "schedule":     {"kind": "cron", "expr": "0 0 * * 1", "tz": "UTC"},
    "sessionTarget":"isolated",
    "wakeMode":     "now",
    "payload":      {"kind": "agentTurn", "message": TASK_BODY, "timeoutSeconds": 300},
    "delivery":     {"mode": "announce", "channel": "telegram", "to": TG_TO},
    "state": {
        "nextRunAtMs":       next_ms,
        "lastRunAtMs":       0,
        "lastRunStatus":     None,
        "lastStatus":        None,
        "lastDurationMs":    0,
        "lastDeliveryStatus":"not-delivered",
        "consecutiveErrors": 0,
        "lastDelivered":     False,
    },
}

data = json.loads(CRON_FILE.read_text(encoding="utf-8"))

# Guard: don't add twice
if any(j["id"] == JOB_ID for j in data["jobs"]):
    print("Job already present — skipping.")
else:
    data["jobs"].append(new_job)
    CRON_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Added job: {new_job['name']}")
    print(f"Total jobs: {len(data['jobs'])}")
    print(f"Next run: {next_monday.isoformat()}")
