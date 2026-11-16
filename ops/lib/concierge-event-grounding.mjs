/** Production event answer boundary. Uses canonical publication and occurrences.
 * No models, inferred availability or broadening of an empty result.
 */
import {selectEventPromotions} from '../../next/src/lib/event-discovery.mjs';
import {eventContentKind} from '../../next/src/lib/event-publication.mjs';
import {getAustralianSeasonLower} from '../../next/src/lib/season.ts';
const months='january february march april may june july august september october november december'.split(' ');
export function resolveMonthPlace(query,now=new Date()) {
 const q=String(query).toLowerCase().replaceAll('’',"'").trim().replace(/[?.!]$/,'');
 const match=q.match(/^(?:what'?s on|events)(?: in)? ([a-z][a-z -]*?) (?:in )?(january|february|march|april|may|june|july|august|september|october|november|december)(?: (20\d{2}))?$/);
 if(!match||!Number.isFinite(+new Date(now)))return null;
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne',year:'numeric',month:'2-digit'}).formatToParts(new Date(now));
 const currentYear=Number(local.find(p=>p.type==='year').value),currentMonth=Number(local.find(p=>p.type==='month').value);
 const month=months.indexOf(match[2])+1,year=match[3]?Number(match[3]):currentYear+(month<currentMonth?1:0);
 const start=`${year}-${String(month).padStart(2,'0')}-01`,end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
 return {place:match[1].trim().replace(/\s+/g,'-'),start,end,yearBasis:match[3]?'explicit':'next-occurrence-of-month',timezone:'Australia/Melbourne',resolved:true};
}
export function groundEventRecords(records,context,now=new Date()) {
 now=new Date(now);
 if(!context||!context.resolved)return {disposition:'clarify',matches:[],season:null};
 const days=(Date.parse(context.end)-Date.parse(context.start))/86400000+1;
 if(context.timezone!=='Australia/Melbourne'||!Number.isInteger(days)||days<1||days>366||!context.place||!Number.isFinite(+now))throw Error('invalid-event-context');
 const eligible=records.filter(r=>r.verifiedAt&&Number.isFinite(Date.parse(r.verifiedAt))&&Date.parse(r.verifiedAt)<=+now&&(!r.validUntil||Date.parse(r.validUntil)>+now)&&eventContentKind(r.data)==='event');
 const selected=selectEventPromotions(eligible,{now,windowStart:new Date(context.start+'T00:00:00Z'),windowDays:days,placeId:context.place});
 const matches=selected.map(hit=>({id:hit.originalEvent.id,revision:hit.originalEvent.revision,title:hit.event.data.title,occurrence:hit.day,href:hit.href,place:context.place,startsAt:hit.occurrence.startsAt.toISOString(),endsAt:hit.occurrence.endsAt.toISOString()}));
 return {disposition:matches.length?'answer':'abstain',matches,season:getAustralianSeasonLower(new Date(context.start+'T12:00:00Z'))};
}
export function eventAnswer(records,query,now=new Date()) {
 const context=resolveMonthPlace(query,now),result=groundEventRecords(records,context,now);
 if(!context)return {answer:'Which town and month should I check? Please include the year if you mean a particular year.',recommendations:[],follow_on:[],provenance_footer:'A date and exact locality are needed to match published event occurrences.',disposition:'clarify'};
 const label=`${context.place.replaceAll('-',' ')} from ${context.start} to ${context.end}`;
 const escape=text=>String(text).replace(/[\\\[\]()*_`<>]/g,'');
 const answer=result.matches.length?`Published events for ${label}:\n\n${result.matches.map(m=>`- ${escape(m.title)} — ${m.occurrence}. https://peninsulainsider.com.au${m.href}`).join('\n')}\n\nCheck the event page with the operator before booking.`:`I couldn't verify a matching published event for ${label}.`;
 return {answer,recommendations:[],follow_on:[],disposition:result.disposition,provenance_footer:`${result.season[0].toUpperCase()+result.season.slice(1)} in Victoria. ${context.yearBasis==='explicit'?'Year supplied.':`Interpreted the month as ${context.start.slice(0,4)}.`} Dates and locality are checked separately from live ticket availability.`,matches:result.matches};
}
