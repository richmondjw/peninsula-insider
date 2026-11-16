#!/usr/bin/env node
/**
 * review-sheet.mjs
 *
 * Builds a local, offline review sheet from ops/reports/visit-victoria/proposed-matches.json
 * so a person can approve Visit Victoria Works for entities: pick a hero, tick gallery
 * images, and write the alt text and caption by hand (house rule: alt text for Visit
 * Victoria Works is written by a person). The sheet exports entity-map.json, which the
 * person saves to ops/records/visit-victoria/entity-map.json.
 *
 * Thumbnails are made with ffmpeg into a folder OUTSIDE the repository; Works are never
 * committed at full size and never leave this machine through this script.
 *
 *   node ops/scripts/visit-victoria/review-sheet.mjs --source "<download dir>" --out "<review dir>"
 *
 * House rules: no em-dashes, no exclamation marks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SOURCE = arg('--source');
const OUTDIR = arg('--out');
if (!SOURCE || !OUTDIR) { console.error('usage: review-sheet.mjs --source <dir> --out <dir>'); process.exit(2); }

const report = JSON.parse(fs.readFileSync(path.join(REPO, 'ops/reports/visit-victoria/proposed-matches.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(REPO, report.catalogue), 'utf8'));
const byKey = new Map(catalogue.works.map((w) => [w.assetKey, w]));

const thumbs = path.join(OUTDIR, 'thumbs');
fs.mkdirSync(thumbs, { recursive: true });
function thumb(w) {
  const out = path.join(thumbs, `${w.assetKey}.jpg`);
  if (!fs.existsSync(out)) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(SOURCE, w.file), '-vf', 'scale=720:-2', '-frames:v', '1', '-q:v', '4', out]);
    if (r.status !== 0) { console.error('ffmpeg failed', w.file, String(r.stderr).slice(0, 200)); return null; }
  }
  return `thumbs/${w.assetKey}.jpg`;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const repoPublic = path.join(REPO, 'next/public');

let done = 0;
const rows = report.proposals.map((p) => {
  const keys = [...p.heroPick.map((h) => h.assetKey), ...p.galleryPool];
  const works = keys.map((k) => byKey.get(k)).filter(Boolean);
  const cards = works.map((w, i) => {
    const t = thumb(w); done++;
    if (done % 25 === 0) process.stderr.write(`thumbs ${done}\n`);
    return `<figure class="card" data-key="${esc(w.assetKey)}">
      <img loading="lazy" src="${esc(t)}" alt="">
      <figcaption><b>${esc(w.assetKey)}</b> ${esc(w.width)}x${esc(w.height)}${w.dateCreated ? ' &middot; ' + esc(w.dateCreated.slice(0, 4)) : ''}${w.peopleSignal === 'yes' ? ' &middot; people' : ''}<br><span class="muted">${esc(w.credit)}</span></figcaption>
      <label><input type="radio" name="hero:${esc(p.entity)}" value="${esc(w.assetKey)}"${i === 0 && p.action === 'replace hero' ? ' checked' : ''}> hero</label>
      <label><input type="checkbox" class="gal" value="${esc(w.assetKey)}"> gallery</label>
    </figure>`;
  }).join('');
  const cur = p.currentHeroSrc && !/^https?:/.test(p.currentHeroSrc) ? pathToFileURL(path.join(repoPublic, p.currentHeroSrc)).href : p.currentHeroSrc;
  const defaultCaption = [p.name, p.place].filter(Boolean).join(', ') + ', Mornington Peninsula';
  return `<section class="entity${p.action === 'replace hero' ? ' urgent' : ''}" data-entity="${esc(p.entity)}">
    <header>
      <div><h2>${esc(p.name)}</h2><code>${esc(p.entity)}</code></div>
      <div class="state"><span class="pill ${esc(p.currentHero.state)}">${esc(p.currentHero.state)}</span> ${esc(p.currentHero.why)}<br><span class="muted">${esc(p.action)}</span></div>
      ${cur ? `<img class="current" src="${esc(cur)}" alt="current hero" title="Current hero in JSON (live page may show a CMS override)">` : ''}
    </header>
    <div class="grid">${cards}
      <figure class="card none"><label><input type="radio" name="hero:${esc(p.entity)}" value=""${p.action === 'replace hero' ? '' : ' checked'}> keep current hero</label></figure>
    </div>
    <div class="fields">
      <label>Alt text (write it yourself: what is in the picture)<textarea class="alt" rows="2" placeholder="e.g. Pool terrace at dusk with the valley beyond"></textarea></label>
      <label>Caption (must name the place and region)<input class="caption" value="${esc(defaultCaption)}"></label>
      <label class="skip"><input type="checkbox" class="skipme"> skip this entity for now</label>
    </div>
  </section>`;
}).join('\n');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visit Victoria matches: review</title>
<style>
:root{--ink:#1d2a2e;--mute:#6b7a7f;--line:#dfe5e4;--bg:#f6f4ef;--accent:#1f5f6b;--warn:#b0552b}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,sans-serif;color:var(--ink);background:var(--bg);padding:0 16px 96px}
.top{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.top h1{font-size:18px;margin:0 auto 0 0}.top button{font:inherit;padding:8px 14px;border-radius:6px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer}
.top button.ghost{background:transparent;color:var(--accent)}.top label{color:var(--mute)}
.entity{background:#fff;border:1px solid var(--line);border-radius:10px;margin:16px 0;padding:16px}
.entity.urgent{border-left:4px solid var(--warn)}
header{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}header h2{margin:0;font-size:17px}header code{color:var(--mute);font-size:12px}
.state{flex:1;min-width:220px}.current{width:160px;height:100px;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;background:#eee;font-size:12px}
.pill.stand-in,.pill.wrong-subject,.pill.uncleared,.pill.placeholder,.pill.missing{background:#f6e0d6;color:var(--warn)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:14px 0}
.card{margin:0;border:1px solid var(--line);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px}
.card img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:4px;background:#eee}
.card.none{justify-content:center;align-items:center;color:var(--mute)}
figcaption{font-size:12px}.muted{color:var(--mute)}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fields label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mute)}
.fields textarea,.fields input:not([type=checkbox]){font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;color:var(--ink)}
.fields .skip{flex-direction:row;align-items:center}
@media (max-width:700px){.fields{grid-template-columns:1fr}}
</style></head><body>
<div class="top"><h1>Visit Victoria: approve matches (${report.proposals.length} entities, batch ${esc(report.batch)})</h1>
<label>Approved by <input id="who" value="james" size="8"></label>
<button class="ghost" id="copy">Copy JSON</button><button id="save">Export entity-map.json</button></div>
<p class="muted">Pick one hero per entity (or keep current), tick gallery images, write the alt text yourself. Entities with an empty alt text and a new hero are exported as <code>needsAlt</code>. Save the file to <code>ops/records/visit-victoria/entity-map.json</code>. Credits are fixed by the catalogue: Photo: Creator, courtesy of Visit Victoria.</p>
${rows}
<script>
function build(){
  const entries=[];
  document.querySelectorAll('.entity').forEach(s=>{
    if(s.querySelector('.skipme').checked) return;
    const e=s.dataset.entity; const hero=(s.querySelector('input[type=radio]:checked')||{}).value||null;
    const gallery=[...s.querySelectorAll('.gal:checked')].map(x=>x.value).filter(k=>k!==hero);
    if(!hero&&!gallery.length) return;
    const alt=s.querySelector('.alt').value.trim(); const caption=s.querySelector('.caption').value.trim();
    entries.push({entity:e,hero,gallery,alt,caption,needsAlt:!!hero&&!alt});
  });
  return {record:'Visit Victoria entity map (human approved)',batch:${JSON.stringify(report.batch)},approvedBy:document.getElementById('who').value,approvedAt:new Date().toISOString(),source:'ops/reports/visit-victoria/proposed-matches.json',entries};
}
document.getElementById('save').onclick=()=>{const b=new Blob([JSON.stringify(build(),null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='entity-map.json';a.click();};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(JSON.stringify(build(),null,1)).then(()=>{document.getElementById('copy').textContent='Copied'});
</script></body></html>`;

fs.writeFileSync(path.join(OUTDIR, 'review.html'), html);
console.log(`wrote ${path.join(OUTDIR, 'review.html')} (${done} thumbnails)`);
