#!/usr/bin/env python3
import pickle, json
from collections import defaultdict, Counter

recs = pickle.load(open("records.pkl", "rb"))

def flatten(obj):
    """Yield (type, node) pairs for a parsed JSON-LD payload (dict or list, possibly with @graph)."""
    out = []
    if isinstance(obj, list):
        for item in obj:
            out.extend(flatten(item))
    elif isinstance(obj, dict):
        if "@graph" in obj and isinstance(obj["@graph"], list):
            for item in obj["@graph"]:
                out.extend(flatten(item))
        else:
            t = obj.get("@type")
            if isinstance(t, list):
                for tt in t:
                    out.append((tt, obj))
            elif t:
                out.append((t, obj))
    return out

# Per-file: list of (type, node)
file_entities = {}
for r in recs:
    ents = []
    for obj in r["parsed"]:
        ents.extend(flatten(obj))
    file_entities[r["file"]] = {"template": r["template"], "entities": ents}

# 1. DUPLICATE TYPE DETECTION per page
dup_report = defaultdict(list)  # template -> list of (file, type, count)
for f, data in file_entities.items():
    type_counts = Counter(t for t, n in data["entities"])
    for t, c in type_counts.items():
        if c > 1:
            dup_report[data["template"]].append((f, t, c))

print("=== DUPLICATE @type PER PAGE ===")
total_dupe_pages = set()
for tmpl, items in dup_report.items():
    print(f"-- template: {tmpl} ({len(items)} dup instances across {len(set(i[0] for i in items))} files)")
    for f, t, c in items[:8]:
        print(f"   {f}  {t} x{c}")
        total_dupe_pages.add(f)
print(f"TOTAL files with any duplicate @type: {len(total_dupe_pages)}")
print()

# 2. Organization vs NewsMediaOrganization co-occurrence
org_conflict_files = []
org_only = 0
nmo_only = 0
both = 0
for f, data in file_entities.items():
    types = set(t for t, n in data["entities"])
    has_org = "Organization" in types
    has_nmo = "NewsMediaOrganization" in types
    if has_org and has_nmo:
        both += 1
        org_conflict_files.append(f)
    elif has_org:
        org_only += 1
    elif has_nmo:
        nmo_only += 1
print("=== Organization vs NewsMediaOrganization ===")
print(f"Files with Organization only: {org_only}")
print(f"Files with NewsMediaOrganization only: {nmo_only}")
print(f"Files with BOTH on same page: {both}")
for f in org_conflict_files[:10]:
    print("  both:", f)
print()

# 3. @id usage stats
id_present = 0
id_absent = 0
id_values = Counter()
for f, data in file_entities.items():
    for t, n in data["entities"]:
        if "@id" in n:
            id_present += 1
            id_values[n["@id"]] += 1
        else:
            id_absent += 1
print("=== @id USAGE ===")
print(f"Entities WITH @id: {id_present}")
print(f"Entities WITHOUT @id: {id_absent}")
reused_ids = {k: v for k, v in id_values.items() if v > 1}
print(f"Distinct @id values reused across >1 entity: {len(reused_ids)}")
for k, v in list(reused_ids.items())[:10]:
    print(f"   {k} used {v}x")
print(f"Distinct @id values total: {len(id_values)}")
print()

pickle.dump(file_entities, open("file_entities.pkl", "wb"))
print("Saved file_entities.pkl")
