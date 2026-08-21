#!/usr/bin/env python3
import pickle, json, re
from collections import defaultdict, Counter

fe = pickle.load(open("file_entities.pkl", "rb"))

def get_entities(type_name):
    out = []
    for f, data in fe.items():
        for t, n in data["entities"]:
            if t == type_name:
                out.append((f, n))
    return out

print("=== ARTICLE COMPLETENESS ===")
articles = get_entities("Article")
print(f"Total Article nodes: {len(articles)}")
required = ["headline", "image", "datePublished", "dateModified", "author"]
missing_counts = Counter()
missing_examples = defaultdict(list)
for f, n in articles:
    for field in required:
        if field not in n or not n.get(field):
            missing_counts[field] += 1
            if len(missing_examples[field]) < 5:
                missing_examples[field].append(f)
for field in required:
    print(f"  missing '{field}': {missing_counts[field]} / {len(articles)}")
    if missing_examples[field]:
        print(f"    e.g. {missing_examples[field]}")
# author type check
author_types = Counter()
for f, n in articles:
    a = n.get("author")
    if isinstance(a, dict):
        author_types[a.get("@type")] += 1
    elif isinstance(a, list):
        for aa in a:
            if isinstance(aa, dict):
                author_types[aa.get("@type")] += 1
    else:
        author_types["MISSING/other"] += 1
print("  author @type distribution:", dict(author_types))
print()

print("=== EVENT COMPLETENESS ===")
events = get_entities("Event")
print(f"Total Event nodes: {len(events)}")
required = ["name", "startDate", "location", "offers", "eventStatus"]
missing_counts = Counter()
missing_examples = defaultdict(list)
for f, n in events:
    for field in required:
        if field not in n or not n.get(field):
            missing_counts[field] += 1
            if len(missing_examples[field]) < 5:
                missing_examples[field].append(f)
for field in required:
    print(f"  missing '{field}': {missing_counts[field]} / {len(events)}")
    if missing_examples[field]:
        print(f"    e.g. {missing_examples[field]}")
print()

print("=== BREADCRUMBLIST COMPLETENESS ===")
bcs = get_entities("BreadcrumbList")
print(f"Total BreadcrumbList nodes: {len(bcs)}")
bad_position = []
relative_url = []
for f, n in bcs:
    items = n.get("itemListElement", [])
    positions = [it.get("position") for it in items if isinstance(it, dict)]
    expected = list(range(1, len(items) + 1))
    if positions != expected:
        bad_position.append((f, positions))
    for it in items:
        if isinstance(it, dict):
            item_url = it.get("item")
            url_str = item_url if isinstance(item_url, str) else (item_url.get("@id") if isinstance(item_url, dict) else None)
            if url_str and not url_str.startswith("http"):
                relative_url.append((f, url_str))
print(f"  BreadcrumbList with non-sequential/broken position: {len(bad_position)}")
for f, p in bad_position[:5]:
    print(f"    {f}: {p}")
print(f"  BreadcrumbList items with non-absolute URL: {len(relative_url)}")
for f, u in relative_url[:5]:
    print(f"    {f}: {u}")

# Which templates HAVE breadcrumbs vs not
bc_files = set(f for f, n in bcs)
by_template_total = Counter()
by_template_with_bc = Counter()
for f, data in fe.items():
    by_template_total[data["template"]] += 1
    if f in bc_files:
        by_template_with_bc[data["template"]] += 1
print("  BreadcrumbList coverage by template (of files with any JSON-LD):")
for t in by_template_total:
    print(f"    {t:12s} {by_template_with_bc[t]:4d} / {by_template_total[t]:4d}")
print()

print("=== IMAGEOBJECT COMPLETENESS ===")
imgs = get_entities("ImageObject")
print(f"Total ImageObject nodes: {len(imgs)}")
missing_url = sum(1 for f, n in imgs if not n.get("url") and not n.get("contentUrl"))
missing_dims = sum(1 for f, n in imgs if not n.get("width") or not n.get("height"))
print(f"  missing url/contentUrl: {missing_url}")
print(f"  missing width or height: {missing_dims}")
