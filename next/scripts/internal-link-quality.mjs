import { parse } from 'parse5';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://peninsulainsider.com.au';
export const BASE = (process.env.ASTRO_BASE??'').replace(/\/$/,'');
export const excluded = p => /^\/(agents|admin|pi-admin|api|account|me|preview|dev|ask)(\/|$)/.test(p);
export function urlFor(href, from) {
  if (!href || href==='#' || /^(mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  try { const u = new URL(href, SITE + from); if(u.origin!==SITE)return null; if(BASE&&(u.pathname===BASE||u.pathname.startsWith(BASE+'/')))u.pathname=u.pathname.slice(BASE.length)||'/'; if (!path.extname(u.pathname)&&!u.pathname.endsWith('/')) u.pathname+='/'; return u; } catch { return null; }
}
export function inspect(html, route) {
  const tree = parse(html, {sourceCodeLocationInfo:true});
  const result = {route, links:[], ids:[], canonical:null, noindex:false, redirect:null};
  const text = n => n.nodeName === '#text' ? n.value : n.tagName === 'img' ? (n.attrs.find(a=>a.name==='alt')?.value ?? '') : (n.childNodes??[]).map(text).join(' ');
  function visit(n, chrome=false) {
    const a=Object.fromEntries((n.attrs??[]).map(a=>[a.name,a.value]));
    chrome ||= n.tagName==='nav' || n.tagName==='footer' || /(?:^|\s)(?:v5-masthead|utility-bar)(?:\s|$)/.test(a.class??'');
    if (a.id) result.ids.push(a.id);
    if (n.tagName==='link' && a.rel==='canonical') result.canonical=urlFor(a.href,route);
    if (n.tagName==='meta' && a.name==='robots') result.noindex=/noindex/i.test(a.content);
    if (n.tagName==='meta' && a['http-equiv']?.toLowerCase()==='refresh') result.redirect=urlFor(a.content?.replace(/^.*?url=/i,''),route);
    if (n.tagName==='a' && a.href) result.links.push({href:a.href, url:a['data-pi-consent']==='open'?null:urlFor(a.href,route),text:text(n).replace(/\s+/g,' ').trim(),title:a.title??'',aria:a['aria-label']??'',hidden:a['aria-hidden']==='true',rel:a.rel??'',chrome,location:n.sourceCodeLocation?.attrs?.href});
    for (const c of n.childNodes??[]) visit(c,chrome);
  }
  visit(tree); return result;
}
export async function inventory(dist) {
  const pages=new Map();
  async function walk(dir) {
    for (const e of await readdir(dir,{withFileTypes:true})) {
      const f=path.join(dir,e.name);
      if(e.isDirectory()) await walk(f);
      else if(e.name.endsWith('.html')) {
        const rel=path.relative(dist,f).replaceAll('\\','/');
        const route='/'+rel.replace(/index\.html$/,'');
        const html=await readFile(f,'utf8'); pages.set(route,{...inspect(html,route),file:f,html});
      }
    }
  }
  await walk(dist); return pages;
}
export function destination(url,pages) {
  let u=new URL(url); const seen=new Set();
  while(true) {
    const route=u.pathname; if(seen.has(route)) throw new Error('Canonical cycle: '+route); seen.add(route);
    const p=pages.get(route)??pages.get(route.endsWith('/')?route:route+'/');
    if(!p) return null;
    const next=p.redirect??p.canonical;
    if(!next || next.pathname===p.route) return u;
    const v=new URL(next); v.search=u.search||v.search; v.hash=u.hash||v.hash; u=v;
  }
}
export function score(pages) {
  const eligible=[...pages.values()].filter(p=>!excluded(p.route)&&!p.noindex&&!p.redirect&&p.canonical?.pathname===p.route);
  const edges=[], broken=[], noncanonical=[], empty=[], generic=[], missingFragments=[], nofollow=[];
  const incoming=new Map(); const body=new Map();
  for(const p of pages.values()) {
    if(excluded(p.route)||p.redirect) continue;
    for(const a of p.links) {
      if(!a.url || excluded(a.url.pathname) || /^\/cdn-cgi\//.test(a.url.pathname) || (path.extname(a.url.pathname)&&!['.html','.htm'].includes(path.extname(a.url.pathname)))) continue;
      const target=pages.get(a.url.pathname)??pages.get(a.url.pathname.endsWith('/')?a.url.pathname:a.url.pathname+'/');
      const row={source:p.route,target:a.url.pathname,text:a.text,chrome:a.chrome};
      if(!target) {broken.push(row);continue;}
      edges.push(row);
      if(target.route!==p.route) { incoming.set(target.route,(incoming.get(target.route)??0)+1); if(!a.chrome) body.set(target.route,(body.get(target.route)??0)+1); }
      const canonical=destination(a.url,pages);
      if(canonical && canonical.pathname!==a.url.pathname) noncanonical.push({...row,canonical:canonical.pathname+canonical.hash});
      // A duplicate decorative image link is fine if the same page also has a named link to the destination.
      if(!a.text&&!a.title && !p.links.some(b=>b!==a&&b.url?.pathname===a.url.pathname&&b.text)) empty.push(row);
      if(/^(click here|read more|learn more|details|view)$/i.test(a.text.replace(/[→↗]/g,'').trim())) generic.push(row);
      if(a.url.hash&&!target.ids.includes(decodeURIComponent(a.url.hash.slice(1)))&&a.url.hash.toLowerCase()!=='#top') missingFragments.push({...row,fragment:a.url.hash});
      if(target.route!==p.route && /\bnofollow\b/.test(a.rel)) nofollow.push(row);
    }
  }
  const depths=new Map([['/',0]]); const queue=['/'];
  for(let i=0;i<queue.length;i++) for(const e of edges.filter(e=>e.source===queue[i])) if(!depths.has(e.target)){depths.set(e.target,depths.get(e.source)+1);queue.push(e.target);}
  const orphans=eligible.filter(p=>p.route!=='/'&&!incoming.has(p.route)).map(p=>p.route);
  const unreachable=eligible.filter(p=>!depths.has(p.route)).map(p=>p.route);
  const deep=eligible.filter(p=>depths.get(p.route)>3).map(p=>({route:p.route,depth:depths.get(p.route)}));
  const noBody=eligible.filter(p=>p.route!=='/'&&!body.has(p.route)).map(p=>p.route);
  const components=[
    {criterion:'Route and fragment integrity',weight:25,total:edges.length+broken.length,defects:broken.length+missingFragments.length},
    {criterion:'Direct canonical destinations',weight:20,total:eligible.length,defects:new Set(noncanonical.map(e=>e.source)).size},
    {criterion:'Inbound links and homepage reachability',weight:20,total:eligible.length,defects:new Set([...orphans,...unreachable]).size},
    {criterion:'Public pages within three clicks',weight:10,total:eligible.length,defects:deep.length},
    {criterion:'Named anchors and followed internal links',weight:15,total:edges.length,defects:empty.length+generic.length+nofollow.length},
    {criterion:'Links from page content',weight:10,total:eligible.length,defects:noBody.length},
  ].map(c=>({...c,earned:c.weight*Math.max(0,1-c.defects/Math.max(1,c.total))}));
  return {generatedAt:new Date().toISOString(),scope:'Built public canonical HTML; Google does not provide this score. Semantic relevance requires separate review.',pages:pages.size,eligible:eligible.length,edges:edges.length,score:Number(components.reduce((s,c)=>s+c.earned,0).toFixed(2)),components,broken,missingFragments,noncanonical,empty,generic,nofollow,orphans,unreachable,deep,noBody};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const dist=path.resolve(process.argv.includes('--dist')?process.argv[process.argv.indexOf('--dist')+1]:'dist');
  const report=score(await inventory(dist));
  const out=process.argv.includes('--json')?process.argv[process.argv.indexOf('--json')+1]:null;
  if(out){await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({...report,broken:report.broken.slice(0,8),noncanonical:report.noncanonical.slice(0,8),empty:report.empty.slice(0,8)},null,2));
  if(process.argv.includes('--assert')&&(report.score<99||report.broken.length||report.missingFragments.length||report.orphans.length||report.unreachable.length||report.noncanonical.length)) process.exitCode=1;
}
