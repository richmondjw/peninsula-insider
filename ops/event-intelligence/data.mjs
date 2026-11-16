import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
export const TZ='Australia/Melbourne';
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function safeUrl(value, hosts) {
  const u=new URL(value);
  if(u.protocol!=='https:' || u.username || u.password || (u.port && u.port!=='443')) throw new Error('HTTPS public URL required');
  if(hosts && !hosts.includes(u.hostname)) throw new Error('Unregistered host');
  if(u.hostname==='localhost' || isIP(u.hostname) || !u.hostname.includes('.')) throw new Error('Public hostname required');
  return u;
}
export function isPublicAddress(address) {
  if(isIP(address)===4) {
    const [a,b]=address.split('.').map(Number);
    return !([0,10,127].includes(a) || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || a>=224 || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19)));
  }
  const v=address.toLowerCase();
  return isIP(address)===6 && v.startsWith('2') && !v.startsWith('2001:db8');
}
export async function fetchEvidence(source,{fetcher=fetch,resolver=lookup,now=new Date(),maxBytes=2_000_000}={}) {
  const u=safeUrl(source.url,source.hosts);
  const addresses=await resolver(u.hostname,{all:true});
  if(!addresses.length || addresses.some(x=>!isPublicAddress(x.address))) throw new Error('Private/reserved address denied');
  const response=await fetcher(u,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'PeninsulaInsider-EventResearch/1.0'}});
  if(!response.ok) throw new Error(`Source HTTP ${response.status}; redirects require registry review`);
  const type=response.headers.get('content-type')??'';
  const pdf=source.allowPdf===true&&/^application\/pdf(?:;|$)/i.test(type);
  if(!/text\/html|application\/(ld\+)?json/.test(type)&&!pdf) throw new Error('Unsupported source format; manual adapter required');
  const reader=response.body.getReader(); const chunks=[]; let size=0;
  try { while(true) {const {done,value}=await reader.read();if(done) break;size+=value.length;if(size>maxBytes) throw new Error('Source too large');chunks.push(value);} }
  finally { await reader.cancel(); }
  const bytes=Buffer.concat(chunks);
  if(pdf){if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid PDF signature');const digest=createHash('sha256').update(bytes).digest('hex');return {id:hash(source.id+digest),sourceId:source.id,url:u.href,retrievedAt:now.toISOString(),hash:digest,contentType:type,base64:bytes.toString('base64'),byteSize:bytes.length,authority:source.authority,lineage:source.lineage??source.id};}
  const body=bytes.toString('utf8');
  return {id:hash(source.id+body),sourceId:source.id,url:u.href,retrievedAt:now.toISOString(),hash:hash(body),contentType:type,body,authority:source.authority,lineage:source.lineage??source.id};
}
export function structuredEvents(body) {
  const values=[];
  if(body.trim().startsWith('{')||body.trim().startsWith('[')) {try {values.push(JSON.parse(body));}catch{}}
  for(const match of body.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {values.push(JSON.parse(match[1]));}catch{}
  }
  const result=[];
  function visit(value,path) {
    if(!value || typeof value!=='object') return;
    if(Array.isArray(value)){value.forEach((x,i)=>visit(x,`${path}/${i}`));return;}
    const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
    if(types.some(t=>typeof t==='string' && /(^|\/)\w*Event$/.test(t))) result.push({value,path});
    for(const [key,item] of Object.entries(value)) if(item&&typeof item==='object') visit(item,`${path}/${key}`);
  }
  values.forEach((value,i)=>visit(value,`document/${i}`));return result;
}
export function extractCandidates(evidence) {
  return structuredEvents(evidence.body).map(({value,path})=>{
    const location=Array.isArray(value.location)?value.location[0]:value.location;
    const address=location?.address;
    const statusMap={'https://schema.org/EventScheduled':'scheduled','http://schema.org/EventScheduled':'scheduled','https://schema.org/EventCancelled':'cancelled','https://schema.org/EventPostponed':'postponed','https://schema.org/EventRescheduled':'rescheduled'};
    const fields={title:value.name,startDate:value.startDate,endDate:value.endDate,venueName:location?.name,streetAddress:address?.streetAddress,suburb:address?.addressLocality,officialEventUrl:value.url??evidence.url,organiser:value.organizer?.name,status:statusMap[value.eventStatus]??value.eventStatus??'unknown'};
    const proofs={};for(const [field,val] of Object.entries(fields))if(val)proofs[field]={evidenceId:evidence.id,path,value:val};
    const sourceIdentity=value['@id']?`${evidence.sourceId}:${value['@id']}`:`${evidence.sourceId}:${value.url??value.name}:${value.previousStartDate??value.startDate}`;
    const id=hash(sourceIdentity).slice(0,24);
    return {id,kind:'event',fields,proofs,geography:{shireConfirmed:false,evidenceId:null},category:null,summary:null,assets:[],sourceIdentity,previousStartDate:value.previousStartDate??null,reviewStatus:'review',extractionOnly:true,sourceStatus:value.eventStatus??null};
  });
}
export function candidateRevision(candidate) {
  const {approval,grades,...content}=candidate;return hash(content);
}
export function validateCandidate(c) {
  const errors=[];
  if(!/^[a-z0-9-]{8,80}$/.test(c.id??''))errors.push('invalid-id');
  if(!['event','experience','offer'].includes(c.kind))errors.push('invalid-kind');
  if(c.geography?.shireConfirmed!==true || !c.geography.evidenceId)errors.push('shire-evidence-required');
  for(const key of ['title','venueName','officialEventUrl'])if(!c.fields?.[key] || !c.proofs?.[key])errors.push(`missing-${key}`);
  try{safeUrl(c.fields?.officialEventUrl);}catch{errors.push('unsafe-official-url');}
  if(c.kind==='event' && !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(c.fields?.startDate??''))errors.push('event-date-required');
  if(c.kind==='offer' && (!c.fields?.endDate || !c.fields?.terms))errors.push('offer-validity-and-terms-required');
  if(c.kind==='experience' && !c.fields?.availability)errors.push('experience-availability-required');
  if(c.series && (!c.series.validUntil || !Array.isArray(c.series.exceptions)))errors.push('series-bounds-and-exceptions-required');
  return errors;
}
export function duplicateSignals(a,b) {
  const normal=x=>String(x??'').toLowerCase().replace(/[^a-z0-9]/g,'');
  // Only propose a review pair. Never automatically merge even exact matches.
  if(a.id===b.id)return ['same-source-identity'];
  if(normal(a.fields.title)!==normal(b.fields.title))return [];
  if(a.fields.startDate!==b.fields.startDate || a.fields.venueName!==b.fields.venueName)return [];
  return ['same-title-venue-occurrence'];
}
export function htmlEscape(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
