#!/usr/bin/env python3
"""Vision-tag every image in v2-staging and flag the ones that show
foreign labels, recognisable non-Australian landmarks, or other
context-breakers for an Australian regional travel magazine.

Writes:
  next/dist/v2-staging/_health/images-meta.json   structured metadata
  next/dist/v2-staging/_health/images.html        viewer with flags
"""
from __future__ import annotations
import argparse, base64, json, os, re, sys, time, urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).parent
SRC = ROOT / "next" / "dist" / "v2-staging" / "images" / "sourced"
HEALTH = ROOT / "next" / "dist" / "v2-staging" / "_health"
META = HEALTH / "images-meta.json"
HTML_OUT = HEALTH / "images.html"

MODEL = "gpt-4o-mini"
ENDPOINT = "https://api.openai.com/v1/chat/completions"

PROMPT = """Audit this image for an Australian regional travel magazine \
covering the Mornington Peninsula in Victoria, Australia. Reply in compact JSON only:

{
 "caption": "<single factual sentence>",
 "visible_text": "<readable label/sign text in image, else empty>",
 "geography_hint": "<best-guess country/region or 'unknown'>",
 "label_country": "<2-letter ISO if a wine/beer/food label is visible, else empty>",
 "subject_tags": ["<tag>", ...],
 "flag": <true ONLY if the image is clearly unsuitable: visible foreign label, recognisable non-Australian landmark, or context-breaking subject>,
 "flag_reason": "<one sentence why, or empty>"
}

Be lenient — generic vineyards, beaches, restaurant interiors with no foreign markers are fine. Flag only the clear mismatches."""


def find_key() -> str | None:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        for cand in (parent / ".env", parent / ".openclaw" / ".env"):
            if cand.exists():
                for line in cand.read_text(encoding="utf-8", errors="ignore").splitlines():
                    line = line.strip()
                    if line.startswith("OPENAI_API_KEY=") and not line.startswith("#"):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("OPENAI_API_KEY")


def caption(api_key: str, img: Path) -> dict:
    data = base64.b64encode(img.read_bytes()).decode("ascii")
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": PROMPT},
            {"type": "image_url", "image_url":
                {"url": f"data:image/webp;base64,{data}"}}]}],
        "temperature": 0.1, "max_tokens": 320,
    }
    req = urllib.request.Request(
        ENDPOINT, method="POST",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        payload = json.loads(r.read().decode("utf-8"))
    text = payload["choices"][0]["message"]["content"].strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"caption": text, "flag": False, "flag_reason": "parse-error"}


def scan(meta: dict, only_missing: bool = True) -> dict:
    api_key = find_key()
    if not api_key:
        print("  no OPENAI_API_KEY found"); return meta
    files = sorted(SRC.glob("*.webp"))
    todo = [f for f in files if f.name not in meta] if only_missing else files
    print(f"  {len(todo)} of {len(files)} to caption")
    for i, f in enumerate(todo, 1):
        try:
            meta[f.name] = caption(api_key, f)
            meta[f.name]["filename"] = f.name
            meta[f.name]["size_bytes"] = f.stat().st_size
            if i % 10 == 0 or i == len(todo):
                print(f"  [{i}/{len(todo)}] {f.name}", flush=True)
                META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
            time.sleep(0.3)
        except Exception as e:
            print(f"  ERR {f.name}: {e}")
            time.sleep(1)
    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


HTML_TPL = """<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<title>V2 image audit</title><style>
:root{{--paper:#fbf7f1;--warm:#f5ede0;--ink:#201B17;--ochre:#b8732e;--line:#e6dfd3;--red:#b3261e;--soft:#665}}
html,body{{background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;margin:0;padding:0}}
.wrap{{max-width:74rem;margin:2rem auto;padding:0 1.5rem 4rem}}
h1{{font-family:Newsreader,Georgia,serif;font-size:2.4rem;font-weight:500;margin:0 0 .4rem}}
.meta{{color:var(--soft);font-size:.92rem;margin-bottom:1.6rem}}
h2{{font-family:Newsreader,serif;font-weight:500;font-size:1.5rem;margin:2.2rem 0 1rem}}
.banner{{padding:1rem 1.4rem;background:#fde7e6;color:var(--red);border:1px solid var(--red);border-radius:3px;margin:1rem 0}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:1.2rem}}
.card{{background:#fff;border:1px solid var(--line);border-radius:3px;overflow:hidden}}
.card.flagged{{border-color:var(--red);border-width:2px}}
.card img{{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--warm)}}
.card-body{{padding:.7rem .9rem .9rem}}
.card h3{{font-family:ui-monospace,monospace;font-size:.78rem;font-weight:500;margin:0 0 .4rem;word-break:break-all}}
.caption{{font-size:.84rem;line-height:1.45;margin:0 0 .5rem}}
.tag{{display:inline-block;padding:1px 6px;margin:1px 2px 1px 0;font-size:.66rem;background:var(--warm);border:1px solid var(--line);border-radius:2px;color:var(--soft)}}
.tag.flag{{background:#fde7e6;color:var(--red);border-color:var(--red)}}
.flag-reason{{font-size:.76rem;color:var(--red);font-style:italic;margin-top:.4rem}}
</style></head><body><div class="wrap">
<h1>V2 image audit</h1>
<p class="meta">{n_total} images · {n_flagged} flagged · model: {model}</p>
{banner}
<h2>Flagged ({n_flagged})</h2><div class="grid">{flagged}</div>
<h2>All ({n_total})</h2><div class="grid">{all_}</div>
</div></body></html>"""


def card(name: str, d: dict) -> str:
    flag = bool(d.get("flag"))
    tags = (d.get("subject_tags") or [])[:5]
    geo = d.get("geography_hint") or ""
    label_cc = d.get("label_country") or ""
    tag_html = "".join(f'<span class="tag">{t}</span>' for t in tags)
    if geo and geo.lower() != "unknown":
        tag_html += f'<span class="tag">{geo}</span>'
    if label_cc:
        tag_html += f'<span class="tag">label:{label_cc}</span>'
    flag_html = ""
    if flag:
        reason = d.get("flag_reason") or ""
        flag_html = (f'<span class="tag flag">flag</span>'
                     f'<div class="flag-reason">{reason}</div>')
    return (f'<div class="card{" flagged" if flag else ""}">'
            f'<img src="../images/sourced/{name}" alt="" loading="lazy">'
            f'<div class="card-body"><h3>{name}</h3>'
            f'<p class="caption">{d.get("caption","")}</p>'
            f'{tag_html}{flag_html}</div></div>')


def write_html(meta: dict):
    HEALTH.mkdir(exist_ok=True)
    flagged = {k: v for k, v in meta.items() if v.get("flag")}
    banner = (f'<div class="banner"><strong>{len(flagged)} flagged</strong> '
              f'— review below; replace or whitelist.</div>') if flagged else ""
    flagged_html = "".join(card(k, flagged[k]) for k in sorted(flagged)) or "<p>None.</p>"
    all_html = "".join(card(k, meta[k]) for k in sorted(meta))
    HTML_OUT.write_text(HTML_TPL.format(
        n_total=len(meta), n_flagged=len(flagged), model=MODEL,
        banner=banner, flagged=flagged_html, all_=all_html), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()
    HEALTH.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META.read_text(encoding="utf-8")) if META.exists() else {}
    if not args.report:
        meta = scan(meta, only_missing=not args.all)
    write_html(meta)
    flagged = sum(1 for v in meta.values() if v.get("flag"))
    print(f"\n  total: {len(meta)}  flagged: {flagged}")
    print(f"  open: http://localhost:8765/_health/images.html")


if __name__ == "__main__":
    main()
