import {staticRelationshipGuides} from '../src/lib/static-relationship-guides.mjs';
/** Extends the existing link-graph inventory; never crawls or writes content. */
import {relationshipEvidenceDefects} from '../src/lib/relationship-evidence.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {parse as yaml} from 'yaml';
import {buildRelationshipIndex,articleRelationshipHref} from '../src/lib/relationship-index.mjs';
import {pageFacts,contextualMentions,descendants,attr,targetState} from './journal-link-audit.mjs';
export async function auditRelationships(inventory,contentRoot,contextual,now=new Date()) {
  const readJson=async folder=>Promise.all((await readdir(new URL(folder+'/',contentRoot))).filter(f=>f.endsWith('.json')).sort().map(async f=>{const data=JSON.parse(await readFile(new URL(folder+'/'+f,contentRoot),'utf8'));return {id:data.slug || f.slice(0,-5),data};}));
  const [venues,itineraries,events]=await Promise.all(['venues','itineraries','events'].map(readJson));
  const articles=[];
  for(const file of (await readdir(new URL('articles/',contentRoot),{recursive:true})).filter(f=>/\.mdx?$/.test(f)).sort()) {
    const raw=await readFile(new URL('articles/'+file,contentRoot),'utf8');const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if(!match)continue;const data=yaml(match[1]);const id=data.slug??file.replace(/\.mdx?$/,'');articles.push({id,data});
  }
  const facts=new Map([...inventory].map(([url,p])=>{const fact=pageFacts(p.html,url);delete fact.dom;return [url,fact];}));
  const bodyLinks=[];const panels=[];const eventPanels=[];const invalidRenderedLinks=[];const bodyHolds=[];
  for(const a of articles) {
    const path=articleRelationshipHref(a),page=facts.get(path);
    const sourcePage=new URL('../pages/'+path.slice(1,-1)+'.astro',contentRoot);
    if(existsSync(sourcePage))a.relationshipHold='static-route-needs-rendered-evidence';
    if(!page || page.noindex || page.stub || page.canonical!==path)a.relationshipHold='absent-noncanonical-or-noindex-page';
    if(!a.relationshipHold) {
      const evidence=contextualMentions(pageFacts(inventory.get(path).html,path),contextual.catalogue,facts,{allowPlans:true});a.relationshipBodyAvailable=!evidence.excluded;
      for(const m of evidence.mentions)if(m.status==='linked' && m.entityId.startsWith('venue:'))bodyLinks.push({articleId:a.id,href:m.target});
    }
  }
  for(const [url,supplied] of inventory)for(const root of descendants(pageFacts(supplied.html,url).dom).filter(n=>attr(n,'data-venue-relationships')!==undefined)) {
    const links=descendants(root).filter(n=>n.tagName==='a').map(n=>attr(n,'href')).filter(Boolean);
    const edges=descendants(root).filter(n=>attr(n,'data-relationship-kind')).flatMap(group=>descendants(group).filter(n=>attr(n,'data-relationship-target')).map(n=>({kind:attr(group,'data-relationship-kind'),href:attr(n,'data-relationship-target'),actualHrefs:[...new Set(descendants(n).filter(a=>a.tagName==='a').map(a=>attr(a,'href')))],...(attr(n,'data-relationship-distance')!==undefined?{distanceKm:Number(attr(n,'data-relationship-distance'))}:{})})));
    panels.push({url,venueId:attr(root,'data-venue-relationships'),edges,links:[...new Set(links)].sort()});
    for(const href of links) {
      if(!href.startsWith('/'))continue;
      const entity=contextual.catalogue.find(e=>e.href===href)??{href};
      const state=targetState(entity,facts);
      if(state!=='eligible')invalidRenderedLinks.push({url,href,state});
    }
  }
  for(const [url,supplied] of inventory)for(const root of descendants(pageFacts(supplied.html,url).dom).filter(n=>attr(n,'data-venue-events')!==undefined)) {
    const events=descendants(root).filter(n=>attr(n,'data-event-promotion')).map(n=>{const e=JSON.parse(attr(n,'data-event-promotion'));return {id:String(e.data.slug??e.id),day:attr(n,'data-event-promotion-day'),href:attr(descendants(n).find(a=>a.tagName==='a')??{},'href')};});
    for(const event of events){const href=event.href;if(!href || targetState({href},facts)!=='eligible')invalidRenderedLinks.push({url,href,state:'invalid-event-destination'});}
    eventPanels.push({url,venueId:attr(root,'data-venue-events'),events});
  }
  const guides=staticRelationshipGuides.map(guide=>{
    const page=facts.get(guide.href);
    const eligible=page && !page.noindex && !page.stub && page.canonical===guide.href;
    if(!eligible)return {...guide,evidenceEligible:false};
    const evidence=contextualMentions(pageFacts(inventory.get(guide.href).html,guide.href),contextual.catalogue,facts);
    for(const m of evidence.mentions)if(m.status==='linked' && m.entityId.startsWith('venue:'))bodyLinks.push({articleId:guide.id,href:m.target});
    return {...guide,evidenceEligible:!evidence.excluded};
  });
  const index=buildRelationshipIndex({venues,articles,itineraries,events,guides,bodyLinks,now});
  const requiredVenueIds=venues.filter(v=>{const e=contextual.catalogue.find(e=>e.id==='venue:'+v.id);if(!e || targetState(e,facts)!=='eligible')return false;const path=e.href.split('#')[0];return !e.href.includes('#') || facts.get(path)?.ids.includes(e.href.split('#')[1]);}).filter(v=>!venues.some(other=>other.id!==v.id && contextual.catalogue.find(e=>e.id==='venue:'+other.id)?.href===contextual.catalogue.find(e=>e.id==='venue:'+v.id)?.href && other.id===contextual.catalogue.find(e=>e.id==='venue:'+v.id)?.href.split('/').filter(Boolean).at(-1))).map(v=>v.id);
  const evidenceDefects=relationshipEvidenceDefects(index,panels,eventPanels,{requiredVenueIds});
  return {...index.report,bodyHolds,evidenceDefects,eventPanels,mode:'Built evidence review queue; renderedPanels records actual UI coverage. Missing evidence is not permission to fabricate a relation.',renderedPanels:panels,unindexedContextualPages:contextual.articles.filter(a=>!a.excluded && !articles.some(entry=>articleRelationshipHref(entry)===a.url) && !guides.some(g=>g.evidenceEligible && g.href===a.url) && a.mentions.some(m=>m.status==='linked' && m.entityId.startsWith('venue:'))).map(a=>({url:a.url,reason:'rendered-guide-evidence-not-in-runtime-content-index',links:a.mentions.filter(m=>m.status==='linked' && m.entityId.startsWith('venue:')).map(m=>m.target)})),invalidRenderedLinks};
}
