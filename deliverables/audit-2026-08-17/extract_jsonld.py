#!/usr/bin/env python3
import json, re, os, sys
from collections import defaultdict, Counter

DIST = "/home/node/.openclaw/workspace/peninsula-insider/next/dist"

SCRIPT_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE
)

def classify(path):
    rel = path[len(DIST):].lstrip("/")
    if rel == "index.html":
        return "homepage"
    if rel.startswith("explore/places/"):
        return "town"
    if rel.startswith("eat/"):
        return "venue_eat"
    if rel.startswith("wine/"):
        return "venue_wine"
    if rel.startswith("explore/"):
        return "hub"
    if rel.startswith("journal/"):
        return "article"
    if rel.startswith("whats-on/"):
        return "event"
    if rel.startswith("stay/"):
        return "venue_stay"
    if rel.startswith("do/"):
        return "venue_do"
    return "other"

results = []
syntax_failures = []
all_files = []
for root, dirs, files in os.walk(DIST):
    for f in files:
        if f == "index.html":
            all_files.append(os.path.join(root, f))

total_files = len(all_files)
files_with_jsonld = 0
total_blocks = 0
parse_ok = 0
parse_fail = 0

per_file_records = []

for fp in all_files:
    with open(fp, "r", encoding="utf-8", errors="replace") as fh:
        html = fh.read()
    blocks = SCRIPT_RE.findall(html)
    if not blocks:
        continue
    files_with_jsonld += 1
    tmpl = classify(fp)
    rel = fp[len(DIST):]
    file_types = []
    file_parsed = []
    for b in blocks:
        total_blocks += 1
        b_stripped = b.strip()
        try:
            obj = json.loads(b_stripped)
            parse_ok += 1
            file_parsed.append(obj)
        except json.JSONDecodeError as e:
            parse_fail += 1
            syntax_failures.append({"file": rel, "error": str(e), "snippet": b_stripped[:300]})
    per_file_records.append({
        "file": rel,
        "template": tmpl,
        "n_blocks": len(blocks),
        "parsed": file_parsed,
    })

print(f"Total index.html files: {total_files}")
print(f"Files containing JSON-LD: {files_with_jsonld}")
print(f"Total <script type=ld+json> blocks: {total_blocks}")
print(f"Parsed OK: {parse_ok}")
print(f"Parse FAILED: {parse_fail}")
print()
if syntax_failures:
    print("=== SYNTAX FAILURES ===")
    for s in syntax_failures[:50]:
        print(s["file"], "|", s["error"])
        print("  snippet:", s["snippet"][:200])
else:
    print("No JSON syntax failures found.")

# Save per-file records for further analysis
import pickle
with open("/home/node/.openclaw/workspace/peninsula-insider/deliverables/audit-2026-08-17/records.pkl", "wb") as f:
    pickle.dump(per_file_records, f)

print()
print("=== TEMPLATE DISTRIBUTION (files with JSON-LD) ===")
tmpl_counts = Counter(r["template"] for r in per_file_records)
for t, c in tmpl_counts.most_common():
    print(t, c)
