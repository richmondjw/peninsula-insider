import {hash,safeUrl,TZ,candidateRevision,validateCandidate} from './data.mjs';
import {assessShireLocation} from './geography.mjs';
import {materializeSeries} from './series.mjs';
export const POLICY_VERSION='pi-editorial-1.0';
export const RUBRIC=Object.freeze({provenance:2,geography:1.5,dates:2,status:1,copy:1,price:1,media:0.5,canonical:0.5,quality:0.5});
const stamp=v=>typeof v==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
function civil(v){const m=/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(String(v));if(!m)return false;const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return d.getUTCFullYear()===+m[1]&&d.getUTCMonth()+1===+m[2]&&d.getUTCDate()===+m[3]&&Number.isFinite(Date.parse(v));}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function pointer(body,p){if(typeof p!=='string'||!p.startsWith('/'))throw Error('Structured pointer required');return p.slice(1).split('/').reduce((v,k)=>v?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],JSON.parse(body));}
/** Evaluation only. The registry and complete canonical catalogue are trusted caller inputs, never candidate assertions. */
export function evaluateEditorial(candidate,evidence,{now=new Date(),registry=[],catalogue=[],catalogueComplete=false,priorHold=null,resolution=null}={}){
 const time=+now;if(!Number.isFinite(time))throw Error('Valid evaluation clock required');
 const fields=candidate?.fields??{},revision=candidateRevision(candidate),checks={},reasons=[],bindings=[];
 let next=Date.parse(fields.startDate??fields.endDate);if(candidate.series){try{const day=new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(now);next=Date.parse(materializeSeries(candidate).occurrences.find(o=>o.date>=day&&o.status!=='cancelled')?.date);}catch{next=NaN;}}const near=!Number.isFinite(next)||next-time<=7*86400000;
 const maxAgeHours=near?24:72;let expires=time+maxAgeHours*3600000;
 // A far-event receipt cannot retain its wider window after entering the near-event regime.
 if(!near)expires=Math.min(expires,next-7*86400000);
 const sources=new Map();for(const e of evidence??[]){try{const registered=registry.find(r=>r.id===e.sourceId&&r.authority==='official');if(!registered||e.authority!=='official'||typeof e.body!=='string'||hash(e.body)!==e.hash||!stamp(e.retrievedAt))throw Error();safeUrl(e.url,registered.hosts);if(e.url!==registered.url&&!registered.admittedUrls?.includes(e.url))throw Error();const age=time-Date.parse(e.retrievedAt);if(age<0||age>maxAgeHours*3600000||sources.has(e.id))throw Error();sources.set(e.id,e);}catch{ /* Unrelated evidence cannot hold this candidate; missing referenced evidence fails proofs. */ }}
 function proof(key,value){const p=candidate.proofs?.[key],e=sources.get(p?.evidenceId);if(!e||!equal(p?.value,value))return false;let ok=false;try{ok=equal(pointer(e.body,p.pointer),value);}catch{}// Candidate-supplied reviewer booleans cannot authenticate personal review.
if(ok){bindings.push({id:e.id,hash:e.hash,sourceId:e.sourceId,url:e.url,retrievedAt:e.retrievedAt});expires=Math.min(expires,Date.parse(e.retrievedAt)+maxAgeHours*3600000);}return ok;}
 checks.provenance=proof('officialEventUrl',fields.officialEventUrl)&&proof('title',fields.title)&&proof('venueName',fields.venueName);
 let geo=false,outside=false;try{if(candidate.geography?.boundaryEvidenceId){const e=sources.get(candidate.geography.boundaryEvidenceId);if(!e)throw Error();const c=fields.coordinates;if(!proof('coordinates',c))throw Error();const result=assessShireLocation(e,[c.lng,c.lat],{now});geo=result.state==='inside';outside=result.state==='outside';if(geo){bindings.push({id:e.id,hash:e.hash,sourceId:e.sourceId,url:e.url,retrievedAt:e.retrievedAt});expires=Math.min(expires,Date.parse(e.retrievedAt)+maxAgeHours*3600000);}}else{const p=candidate.proofs?.shire,v=fields.venueName;try{const e=sources.get(p?.evidenceId),located=pointer(e.body,p.pointer);geo=equal(located,{shire:'MORNINGTON PENINSULA SHIRE',venueName:v})&&equal(p.value,located)&&proof('shire',located);}catch{}}checks.geography=geo;}catch{}checks.geography=geo;
 const kind=['event','experience','offer'].includes(candidate.kind),dateKeys=candidate.kind==='event'?['startDate']:candidate.kind==='offer'?['endDate','terms']:['availability'];
 checks.dates=kind&&candidate.timezone===TZ&&dateKeys.every(k=>fields[k]!=null&&proof(k,fields[k]))&&['endDate','startTime','endTime'].filter(k=>fields[k]!=null).every(k=>proof(k,fields[k]));
 for(const k of ['startTime','endTime'])if(fields[k]!=null&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(fields[k]))checks.dates=false;
 let ended=false;for(const k of ['startDate','endDate'])if(fields[k]!=null){const v=fields[k];if(!civil(v))checks.dates=false;}
 if(fields.startDate&&fields.endDate&&Date.parse(fields.endDate)<Date.parse(fields.startDate))checks.dates=false;
 if(candidate.series){try{if(!proof('series',candidate.series)||!materializeSeries(candidate).occurrences.length||materializeSeries(candidate).occurrences.some(o=>o.venueName!==fields.venueName))throw Error();}catch{checks.dates=false;}}
 const final=candidate.series?.validUntil??fields.endDate??(candidate.kind==='event'?fields.startDate:null);if(final){const today=new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(now);ended=checks.dates&&(/T/.test(final)?Date.parse(final)<time:final<today);}
 checks.status=proof('status',fields.status)&&['scheduled','available','on-request'].includes(fields.status)&&(!fields.bookingUrl||proof('bookingUrl',fields.bookingUrl));try{if(fields.bookingUrl)safeUrl(fields.bookingUrl);}catch{checks.status=false;}
 checks.copy=(!candidate.summary||proof('summary',candidate.summary))&&Object.entries(fields).every(([k,v])=>proof(k,v))&&kind&&proof('kind',candidate.kind)&&typeof fields.title==='string'&&fields.title.trim().length>=3&&['summary','description'].filter(k=>fields[k]!=null).every(k=>proof(k,fields[k]))&&!candidate.conflicts?.some(c=>c.resolved!==true)&&!candidate.sourceReview?.required;
 checks.price=!candidate.price; if(candidate.price){const p=candidate.price;checks.price=stamp(p.checkedAt)&&stamp(p.validUntil)&&Date.parse(p.checkedAt)<=time&&Date.parse(p.validUntil)>time&&proof('price',p)&&Date.parse(p.validUntil)<=time+maxAgeHours*3600000;if(checks.price)expires=Math.min(expires,Date.parse(p.validUntil));}
 checks.media=!candidate.media&&!candidate.assets?.length; // Unreviewed imagery must be omitted; branded/text fallback is permitted.
 checks.canonical=catalogueComplete&&checks.provenance&&!catalogue.some(c=>c!==candidate&&((c.fields?.officialEventUrl===fields.officialEventUrl&&c.fields?.startDate===fields.startDate&&c.fields?.endDate===fields.endDate)||c.id===candidate.id));
 checks.quality=validateCandidate(candidate).length===0&&!Object.values(fields).some(v=>typeof v==='string'&&/<script|javascript:|\b(?:guaranteed|selling fast)\b/i.test(v));
 if(priorHold){const valid=resolution?.holdId===priorHold.id&&resolution?.revision===revision&&resolution?.resolvedBy==='James'&&stamp(resolution?.resolvedAt)&&Date.parse(resolution.resolvedAt)<=time; if(!valid)reasons.push('prior-hold-unresolved');}
 const critical=['media','provenance','geography','dates','status','copy','price','canonical','quality'];for(const key of critical)if(!checks[key])reasons.push('critical:'+key);
 const score=Object.entries(RUBRIC).reduce((s,[k,w])=>s+(checks[k]?w:0),0);
 const nonlisting=candidate.kind==='nonlisting'&&proof('kind','nonlisting');
 const decision=reasons.includes('prior-hold-unresolved')?'hold':outside||nonlisting?'reject':ended&&checks.provenance&&checks.geography&&checks.copy?'archive':reasons.length||score<9?'hold':'publish-eligible';
 const result={policyVersion:POLICY_VERSION,authority:'automated-editorial-evaluation',revision,checkedAt:now.toISOString(),expiresAt:new Date(expires).toISOString(),maxAgeHours,score,checks,critical,reasons,decision,evidence:bindings.filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i)};
 return {...result,decisionHash:hash(result),personalApproval:null,prominenceEligible:false};
}
export function editorialDecisionCurrent(decision,candidate,evidence,options={}){const now=options.now??new Date();if(!options.registry||options.catalogueComplete!==true)return false;try{const original=evaluateEditorial(candidate,evidence,{...options,now:new Date(decision.checkedAt)}),current=evaluateEditorial(candidate,evidence,{...options,now});return decision.policyVersion===POLICY_VERSION&&decision.decision==='publish-eligible'&&equal(original,decision)&&current.decision==='publish-eligible'&&+now>=Date.parse(decision.checkedAt)&&+now<Date.parse(decision.expiresAt);}catch{return false;}}

/** Legacy adaptation never changes raw facts, inferred dates, approval identity or evidence. */
export function assessLegacyEditorial(candidate,evidence,options={}){return evaluateEditorial(candidate,evidence,options);}
