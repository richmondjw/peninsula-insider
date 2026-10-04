import {selectEventPromotions} from './event-discovery.mjs';
import {eventMapItems} from './event-map.mjs';
import {isPublicEventRecord,currentVerifiedPrice,publicEventData} from './event-publication.mjs';
import {recordDisposition,dayIsoOf} from './event-occurrence.mjs';
const slugFor=entry=>String(entry.data?.slug??entry.slug??entry.id??'').replace(/\.json$/,'');
export function publicPlanningCatalog(entries,now=new Date()){return entries.filter(entry=>isPublicEventRecord(entry.data,now)).map(entry=>({id:slugFor(entry),data:publicEventData(entry.data)}));}
/** Preserve the reader's saved identity and notes; current facts replace stale saved snapshots. */
export function projectSavedEvent(item,catalog,{now=new Date()}={}){
 const original=catalog.find(entry=>slugFor(entry)===item.slug);
 const promotion=original?selectEventPromotions([original],{now,windowDays:366,limit:1})[0]:null;
 if(promotion){const data=promotion.event.data,coordinates=eventMapItems([promotion],{now})[0];return {...item,title:data.title??item.title,href:promotion.href,image_url:data.heroImage?.src??'',dek:[promotion.dateLabel,data.summary].filter(Boolean).join(' · '),eventStatus:promotion.occurrence?.label??'Current listing',eventAvailable:true,eventKind:promotion.kind,lat:coordinates?.lat??null,lng:coordinates?.lng??null,eventDate:promotion.day,calendarAllowed:promotion.kind==='event'&&promotion.occurrence?.bookable===true,bookingAllowed:promotion.occurrence?.bookable===true};}
 let label='Current event details unavailable';if(original&&isPublicEventRecord(original.data,now)){const disposition=recordDisposition(original.data,now),end=dayIsoOf(original.data.endDate??original.data.startDate);label=disposition.status==='cancelled'?'Cancelled':disposition.status==='postponed'?'Postponed':end&&end<dayIsoOf(now)?'This listing has ended':disposition.bookingStatus==='sold-out'?'Sold out':'This listing needs a current check';}
 return {...item,title:original?.data.title??item.title,href:original&&isPublicEventRecord(original.data,now)?`/whats-on/${slugFor(original)}/`:'/whats-on/',dek:label,eventStatus:label,eventAvailable:false,lat:null,lng:null,calendarAllowed:false,bookingAllowed:false};
}
export function gateRemoteRecommendations(recommendations,catalog,{now=new Date()}={}){
 if(!Array.isArray(recommendations))return [];const promotions=selectEventPromotions(catalog,{now,windowDays:366,limit:catalog.length}),bySlug=new Map(promotions.map(item=>[item.slug,item]));const knownSlugs=new Set(catalog.map(slugFor));
 return recommendations.flatMap(rec=>{if(!rec||typeof rec!=='object')return [];let url;try{url=new URL(rec.href??'', 'https://peninsulainsider.com.au');if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return [];}catch{return [];}
  const pathMatch=url.pathname.match(/^\/whats-on\/([^/]+)\/?$/),slug=pathMatch?.[1]??String(rec.slug??''),eventLike=Boolean(pathMatch)||['event','offer'].includes(String(rec.kind??rec.entity_type??rec.type??'').toLowerCase())||knownSlugs.has(slug);
  if(!eventLike)return [rec];if(url.hostname!=='peninsulainsider.com.au'&&pathMatch)return [];const promotion=bySlug.get(slug);if(!promotion)return [];const data=promotion.event.data,price=currentVerifiedPrice(data,now);
  return [{kind:'event',slug:promotion.slug,href:promotion.href,title:data.title,hero_image:data.heroImage?.src??null,category:promotion.kind,venue_type:promotion.kind,region:data.suburb??data.venueRegion??'',price_band:price?.label??null,price_checked_at:price?.checkedAt??null,price_expires_at:price?.expiresAt??null,why:promotion.dateLabel,signature:data.summary??''}];
 });
}
