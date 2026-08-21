#!/usr/bin/env python3
import pickle, json
from collections import defaultdict, Counter

recs = pickle.load(open("records.pkl", "rb"))

def walk(node, path="$"):
    """Yield (type, node, path, is_nested) for every dict with @type anywhere in the tree."""
    out = []
    if isinstance(node, dict):
        t = node.get("@type")
        if t:
            types = t if isinstance(t, list) else [t]
            for tt in types:
                out.append((tt, node, path))
        for k, v in node.items():
            if k in ("@context",):
                continue
            out.extend(walk(v, path + "." + k))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            out.extend(walk(item, path + f"[{i}]"))
    return out

all_nodes = []  # (file, template, type, node, path)
for r in recs:
    for obj in r["parsed"]:
        for t, n, p in walk(obj):
            all_nodes.append((r["file"], r["template"], t, n, p))

type_counts = Counter(t for _, _, t, _, _ in all_nodes)
print("=== DEEP-SCAN TYPE COUNTS (sitewide, incl. nested) ===")
for t, c in type_counts.most_common(40):
    print(f"  {t:30s} {c}")

pickle.dump(all_nodes, open("all_nodes.pkl", "wb"))
print()
print("Saved all_nodes.pkl, total nodes:", len(all_nodes))
