import {verifyAutomatedCandidate} from './editorial-automation.mjs';
import {seriesContract,materializeSeries} from './series.mjs';
import {assessShireLocation} from './geography.mjs';
import {validateCandidate,candidateRevision,safeUrl} from './data.mjs';
function validDate(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(String(value));
 if(!match)return false;
 const day=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
 return day.getUTCFullYear()===Number(match[1])&&day.getUTCMonth()+1===Number(match[2])&&day.getUTCDate()===Number(match[3])&&Number.isFinite(new Date(value).getTime());
}
const essential=['title','venueName','officialEventUrl','status'];
export function verifyCandidate(candidate,evidence,{now=new Date(),maxAgeHours=24*7,automation}={}) {
 if(automation!==undefined){const checked=verifyAutomatedCandidate(candidate,evidence,{...automation,now});return {...checked,revision:checked.originalRevision??candidateRevision(candidate),factScore:checked.ready?checked.score*10:0,fields:checked.assessment?.decision.checks??{},checkedAt:now.toISOString(),authority:checked.actor};}
 const errors=validateCandidate(candidate);if(candidate.sourceReview?.required===true)errors.push('source-change-needs-review');const fields={};const byId=new Map(evidence.map(e=>[e.id,e]));
 const required=[...essential,...(candidate.kind==='event'?['startDate']:candidate.kind==='offer'?['endDate','terms']:['availability']),...['endDate','startTime','endTime','organiser','accessibility','coordinates'].filter(key=>candidate.fields?.[key]!=null),...(candidate.series?['series']:[])].filter((key,index,all)=>all.indexOf(key)===index);
 if(candidate.series){try{seriesContract(candidate.series);materializeSeries(candidate);}catch(error){errors.push('series-invalid: '+error.message);}}
 for(const key of required){
  const proof=candidate.proofs?.[key];const source=byId.get(proof?.evidenceId);const age=source?now-new Date(source.retrievedAt):NaN;
  const quote=String(proof?.quote??'');
  const located=quote.length>=3&&source?.body?.includes(quote);
  const expectedValue=key==='series'?candidate.series:candidate.fields?.[key];
  const valueMatch=JSON.stringify(proof?.value)===JSON.stringify(expectedValue);
  const confirmed=proof?.verifiedBy==='James' && proof?.verified===true;
  const fresh=Number.isFinite(age)&&age>=0&&age<=maxAgeHours*3600000;
  const score=source?.authority==='official'&&located&&valueMatch&&confirmed&&fresh?100:0;
  fields[key]={score,evidenceId:proof?.evidenceId??null,reasons:[!source&&'missing-evidence',source?.authority!=='official'&&'not-official',!located&&'quote-not-located',!valueMatch&&'value-mismatch',!confirmed&&'not-human-verified',!fresh&&'stale-or-future-evidence'].filter(Boolean)};
 }
 const scope=byId.get(candidate.geography?.evidenceId);
 if(!scope || scope.authority!=='official')errors.push('scope-source-required');
 const geo=candidate.geography;
 const scopeAge=scope?now-new Date(scope.retrievedAt):NaN;
 if(geo?.verifiedBy!=='James'||geo?.verified!==true||String(geo?.quote??'').length<3||!scope?.body?.includes(geo.quote)||!Number.isFinite(scopeAge)||scopeAge<0||scopeAge>maxAgeHours*3600000)errors.push('scope-not-verified');
 if(candidate.geography?.boundaryEvidenceId){try{const coordinates=candidate.fields.coordinates;const assessment=assessShireLocation(byId.get(candidate.geography.boundaryEvidenceId),[coordinates?.lng,coordinates?.lat],{now});if(assessment.state!=='inside')errors.push('scope-boundary-'+assessment.state);}catch(error){errors.push('scope-boundary-invalid: '+error.message);}}
 for(const exception of candidate.series?.exceptions??[]){if(!exception.venueName||exception.venueName===candidate.fields.venueName)continue;const geo=candidate.geography?.occurrences?.[exception.date],source=byId.get(geo?.evidenceId),age=source?now-new Date(source.retrievedAt):NaN;if(geo?.shireConfirmed!==true||geo?.verifiedBy!=='James'||geo?.verified!==true||String(geo?.quote??'').length<3||!source?.body?.includes(geo.quote)||source?.authority!=='official'||!Number.isFinite(age)||age<0||age>maxAgeHours*3600000)errors.push('scope-moved-occurrence-unverified: '+exception.date);if(geo?.boundaryEvidenceId){try{const assessment=assessShireLocation(byId.get(geo.boundaryEvidenceId),[geo.coordinates?.lng,geo.coordinates?.lat],{now});if(assessment.state!=='inside')errors.push('scope-moved-occurrence-boundary-'+assessment.state+': '+exception.date);}catch(error){errors.push('scope-moved-occurrence-boundary-invalid: '+exception.date);}}}
 if(candidate.conflicts?.some(c=>c.resolved!==true))errors.push('unresolved-conflict');
 if(candidate.fields?.status!=='scheduled' && candidate.kind==='event')errors.push('not-scheduled');
 if(candidate.kind==='event'){
  const start=new Date(candidate.fields.startDate);const end=candidate.series?new Date(candidate.series.validUntil+'T00:00:00Z'):candidate.fields.endDate?new Date(candidate.fields.endDate):start;
  if(!validDate(candidate.fields.startDate)||!validDate(candidate.fields.endDate??candidate.fields.startDate))errors.push('invalid-date');
  if(end<start)errors.push('inverted-range');
  if(!candidate.series&&end.getTime()<now.getTime() && /T/.test(candidate.fields.startDate))errors.push('past-event');
  // Date-only bounds expire after the stated final local calendar day.
  if((candidate.series||!/T/.test(candidate.fields.startDate)) && String(candidate.series?.validUntil??candidate.fields.endDate??candidate.fields.startDate)<new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(now))errors.push('past-event');
 }
 if(candidate.kind==='offer'){
  const end=candidate.fields.endDate;
  if(!validDate(end)||(candidate.fields.startDate&&!validDate(candidate.fields.startDate)))errors.push('invalid-date');
  if(candidate.fields.startDate&&end<candidate.fields.startDate)errors.push('inverted-range');
  const expired=/T/.test(end??'')?new Date(end)<now:String(end)<new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(now);
  if(expired)errors.push('past-offer');
 }
 if(candidate.fields?.bookingUrl){try{safeUrl(candidate.fields.bookingUrl);}catch{errors.push('unsafe-booking-url');}const proof=candidate.proofs?.bookingUrl,source=byId.get(proof?.evidenceId),age=source?now-new Date(source.retrievedAt):NaN;if(proof?.verified!==true||proof?.verifiedBy!=='James'||proof?.value!==candidate.fields.bookingUrl||String(proof?.quote??'').length<3||!source?.body?.includes(proof.quote)||source?.authority!=='official'||!Number.isFinite(age)||age<0||age>maxAgeHours*3600000)errors.push('booking-unverified');}
 if(candidate.price){
  const proof=candidate.proofs?.price;const source=byId.get(proof?.evidenceId);
  const expiry=new Date(candidate.price.validUntil),checked=new Date(candidate.price.checkedAt);
  const priceAge=source?now-new Date(source.retrievedAt):NaN;
  if(!source || source.authority!=='official'||!Number.isFinite(priceAge)||priceAge<0||priceAge>maxAgeHours*3600000||proof?.verified!==true||String(proof?.quote??'').length<3||!source.body?.includes(proof?.quote??'\u0000')||proof?.verifiedBy!=='James'||proof?.value!==candidate.price.label||!(checked<=now&&now<expiry)||expiry-checked>7*86400000)errors.push('price-not-verified');
 }
 const factScore=Math.round(required.reduce((sum,key)=>sum+fields[key].score,0)/required.length);
 return {revision:candidateRevision(candidate),factScore,fields,errors,ready:errors.length===0&&required.every(key=>fields[key].score>=95),checkedAt:now.toISOString(),independentSources:new Set(evidence.map(e=>e.lineage??e.sourceId)).size};
}
