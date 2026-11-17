/** Evidence-only relationship projection. No requests, writes, fuzzy names or fallbacks. */
import { venueHref, routeSlug, isListableVenue } from './editorial.ts';
import { haversineKm } from './itinerary.ts';
import { selectEventPromotions } from './event-discovery.mjs';
export const refId = value => String(typeof value === 'string' ? value : value?.id ?? '');
const order = (a,b) => a.href.localeCompare(b.href, 'en');
export function venueRelationshipHold(entry) {
  const d=entry?.data ?? entry;
  if (!d || !isListableVenue(entry) || d.status === 'closed' || ['closed','temporarily-closed'].includes(d.operatingStatus)) return 'unavailable-venue';
  if (d.sitemapExclude || ['draft','review','archived','retired'].includes(d.status)) return 'excluded-venue';
  return null;
}
export function validRelationshipCoordinates(c) {
  return typeof c?.lat==='number' && typeof c?.lng==='number' && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.lat>=-38.6 && c.lat<=-38.1 && c.lng>=144.6 && c.lng<=145.35;
}
export function articleRelationshipHref(a) {
  return `/${a.data.section==='plans'?'explore/plans':'journal'}/${routeSlug(a)}/`;
}
export function publishedRelationshipContent(entry, now, article=false) {
  const d=entry?.data;
  return Boolean(d && (!article || d.status==='published') && (!d.status || d.status==='published') && !d.sitemapExclude && Number.isFinite(+new Date(d.publishedAt)) && +new Date(d.publishedAt)<=+now && !entry.relationshipHold && !(d.format==='weekend-picker' && String(routeSlug(entry)).startsWith('peninsula-this-weekend')));
}
export function relationshipBodyOverrides(article, overrides = {text:{}}) {
  if(article.data.section==='plans') return {}; // Actual plan article renderer does not apply body overrides.
  return Object.fromEntries(Object.entries(overrides.text??{}).filter(([key])=>key.startsWith('body.block:')).map(([key,value])=>[key.slice(11),value]));
}
export function buildRelationshipIndex({venues=[],articles=[],itineraries=[],events=[],bodyLinks=[],now=new Date(),radiusKm=5}={}) {
  now=new Date(now); if (!Number.isFinite(+now) || !Number.isFinite(radiusKm) || radiusKm<=0 || radiusKm>10) throw new Error('Invalid relationship clock or radius');
  const byVenue=new Map(), byContent=new Map(), holds=[];
  const venueById=new Map(venues.map(v=>[String(routeSlug(v)),v]));
  const active=venues.filter(v=>!venueRelationshipHold(v)).sort((a,b)=>String(routeSlug(a)).localeCompare(String(routeSlug(b)),'en'));
  for(const v of venues) {
    const id=String(routeSlug(v)), reason=venueRelationshipHold(v);
    byVenue.set(id,{id,href:venueHref(v),name:v.data.name,mentions:[],selections:[],plans:[],events:[],nearby:[]});
    if(reason) holds.push({kind:'venue',id,reason});
    else if(!validRelationshipCoordinates(v.data.coordinates)) holds.push({kind:'venue',id,reason:'missing-or-invalid-coordinates'});
  }
  const add=(content,href,id,kind,evidence)=>{
    const v=venueById.get(id), bucket=byVenue.get(id);
    if(!v || venueRelationshipHold(v)) {holds.push({kind,id:content.id,venueId:id,reason:v?venueRelationshipHold(v):'unknown-venue-reference'});return;}
    const edge={id:String(routeSlug(content)),label:content.data.title,href,venueId:id,venueHref:bucket.href,evidence};
    if(!bucket[kind].some(x=>x.href===href)) bucket[kind].push(edge);
    const reverse=byContent.get(href)??[];
    if(!reverse.some(x=>x.href===bucket.href)) reverse.push({id, label:v.data.name, href:bucket.href, evidence});
    byContent.set(href,reverse);
  };
  const eligibleArticles=new Map();
  for(const a of articles) {
    const id=String(routeSlug(a));
    if(!publishedRelationshipContent(a,now,true)) {holds.push({kind:'article',id,reason:a.relationshipHold??'unpublished-future-excluded-or-redirected'});continue;}
    eligibleArticles.set(id,a);
    for(const r of a.data.relatedVenues??[]) add(a,articleRelationshipHref(a),refId(r),'selections','explicit-editorial-reference');
    if(!a.relationshipBodyAvailable) holds.push({kind:'article',id,reason:'rendered-body-evidence-unavailable'});
  }
  const byHref=new Map();
  for(const v of active) {const href=venueHref(v);byHref.set(href,[...(byHref.get(href)??[]),v]);}
  for(const link of bodyLinks) {
    const a=eligibleArticles.get(link.articleId), matches=byHref.get(link.href)??[];
    if(!a) continue;
    if(matches.length!==1) {holds.push({kind:'body-anchor',id:link.articleId,href:link.href,reason:'ambiguous-or-unavailable-canonical-target'});continue;}
    add(a,articleRelationshipHref(a),String(routeSlug(matches[0])),'mentions','rendered-canonical-body-anchor');
  }
  for(const it of itineraries) {
    if(!publishedRelationshipContent(it,now)) {holds.push({kind:'itinerary',id:String(routeSlug(it)),reason:'unpublished-future-or-excluded'});continue;}
    const refs=[...(it.data.stops??[]).map(s=>s.venue),it.data.anchorStay,...(it.data.nightStays??[])].filter(Boolean);
    for(const r of refs) add(it,`/explore/plans/${routeSlug(it)}/`,refId(r),'plans','explicit-stop-or-overnight-stay');
    // altStays and inferred/fallback stays are not scheduled stops.
  }
  const promotions=selectEventPromotions([...events].sort((a,b)=>String(routeSlug(a)).localeCompare(String(routeSlug(b)),'en')),{now});
  for(const p of promotions) {
    const id=refId(p.event.data.venue), v=venueById.get(id);
    if(v && !venueRelationshipHold(v)) byVenue.get(id).events.push(p.event);
    else holds.push({kind:'event',id:p.slug,reason:id?'unavailable-or-unknown-location':'no-explicit-physical-venue'});
    for(const host of p.event.data.hostVenues??[]) if(refId(host)!==id) holds.push({kind:'event-host',id:p.slug,venueId:refId(host),reason:'participation-is-not-occurrence-location'});
  }
  for(const v of active) {
    const bucket=byVenue.get(String(routeSlug(v))), coordinates=v.data.coordinates;
    if(!validRelationshipCoordinates(coordinates)) continue;
    const seen=new Set([bucket.href]);
    const candidates=active.filter(other=>validRelationshipCoordinates(other.data.coordinates)).map(other=>({id:String(routeSlug(other)),label:other.data.name,href:venueHref(other),distanceKm:haversineKm(coordinates,other.data.coordinates)})).filter(x=>x.distanceKm<=radiusKm).sort((a,b)=>a.distanceKm-b.distanceKm || order(a,b));
    for(const candidate of candidates) if(!seen.has(candidate.href)) {seen.add(candidate.href);bucket.nearby.push(candidate);}
  }
  for(const bucket of byVenue.values()) {
    bucket.mentions.sort(order);bucket.selections=bucket.selections.filter(x=>!bucket.mentions.some(m=>m.href===x.href)).sort(order);bucket.plans.sort(order);
  }
  for(const values of byContent.values())values.sort(order);
  holds.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
  return {byVenue,byContent,report:{version:1,generatedAt:now.toISOString(),radiusKm,proximityEvidence:'Stored coordinates; approximate straight-line distance, not a route or independent location verification',coverage:{venues:venues.length,eligibleVenues:active.length,articles:articles.length,itineraries:itineraries.length,eligiblePromotions:promotions.length},venues:[...byVenue.values()].sort((a,b)=>a.id.localeCompare(b.id,'en')).map(v=>({id:v.id,href:v.href,mentions:v.mentions,selections:v.selections,plans:v.plans,events:v.events.map(e=>({id:routeSlug(e),day:e.data._promotionDay})),nearby:v.nearby,gaps:['mentions','selections','plans','events','nearby'].filter(k=>!v[k].length)})),holds}};
}
