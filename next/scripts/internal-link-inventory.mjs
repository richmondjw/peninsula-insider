import {inventory,excluded} from './internal-link-quality.mjs';
import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const pages=await inventory('dist');
const rows=[['route','classification','canonical','allInboundPages','contentInboundPages','outboundInternalDestinations']];
const links=[['source','target','anchorText','placement']];
const incoming=new Map(),body=new Map();
for(const p of pages.values()) {
 if(excluded(p.route))continue;
 const seen=new Set();
 for(const a of p.links) {
  if(!a.url||seen.has(a.url.pathname+'|'+a.text+'|'+a.chrome))continue;
  seen.add(a.url.pathname+'|'+a.text+'|'+a.chrome);
  links.push([p.route,a.url.pathname+a.url.search+a.url.hash,a.text,a.chrome?'navigation':'content']);
  if(a.url.pathname===p.route)continue;
  if(!incoming.has(a.url.pathname))incoming.set(a.url.pathname,new Set());incoming.get(a.url.pathname).add(p.route);
  if(!a.chrome){if(!body.has(a.url.pathname))body.set(a.url.pathname,new Set());body.get(a.url.pathname).add(p.route);}
 }
}
for(const p of pages.values()) rows.push([p.route,excluded(p.route)?'private or machine utility':p.redirect?'redirect':p.noindex?'noindex':p.canonical?.pathname===p.route?'public canonical':'noncanonical or missing canonical',p.canonical?.href??'',incoming.get(p.route)?.size??0,body.get(p.route)?.size??0,new Set(p.links.filter(a=>a.url).map(a=>a.url.pathname)).size]);
const csv=rows=>rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
await writeFile('../ops/reports/seo/internal-linking/page-inventory.csv',csv(rows));
await writeFile('../ops/reports/seo/internal-linking/link-inventory.csv',csv(links));
await writeFile('../ops/reports/seo/internal-linking/link-inventory.csv.gz',gzipSync(Buffer.from(csv(links))));
console.log(`Inventory: ${rows.length-1} rendered pages and ${links.length-1} distinct anchor records.`);
