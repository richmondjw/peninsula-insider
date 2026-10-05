import {recordDisposition,resolveOccurrence,dayIsoOf,isCancelledRecord,occurrenceBounds,isoOffsetFor} from './event-occurrence.mjs';
import {ruleFor,occursOnDay,startOfDay,addDays,isoDate} from './event-schedule.ts';
export function hasExplicitSeries(data){return !!data?.intelligence && Array.isArray(data?.seriesOccurrences) && data.seriesOccurrences.length>0;}
export function hasLegacyExceptions(data){return !hasExplicitSeries(data) && Array.isArray((data?._seriesBase??data)?.occurrenceExceptions) && (data._seriesBase??data).occurrenceExceptions.length>0;}
function legacyRule(data,now){
 const dated={...data};for(const key of ['startDate','endDate','nextOccurrence'])if(dated[key])dated[key]=new Date(dated[key]);
 return ruleFor({data:dated},now);
}
function legacyData(data,day,now){
 const base=data._seriesBase??data,rule=legacyRule(base,now);if(!rule)return null;
 if(rule.kind==='range'&&rule.start<rule.end)return base;
 const pairs=Object.entries(rule.reschedules??{});
 const original=pairs.find(([,effective])=>effective===day)?.[0]??day;
 const effective=rule.reschedules?.[original]??day;
 if(!occursOnDay(rule,new Date(effective)))return null;
 const matches=base.occurrenceExceptions.filter(e=>e.date===original);
 const exception=matches.length===1?matches[0]:null;
 const ambiguous=matches.length>1;
 const moved=exception?.status==='moved'||(exception?.venueName!==undefined&&exception.venueName!==base.venueName);
 const changedDate=['rescheduled','postponed'].includes(exception?.status);
 const rescheduled=changedDate&&rule.reschedules?.[original]===effective;
 const value={...base,_seriesBase:base,_occurrenceOriginalDate:original,_occurrenceEffectiveDate:effective,
  _occurrencePreviousStartDate:rescheduled?(base.startTime?original+'T'+base.startTime+':00'+isoOffsetFor(occurrenceBounds(base,original).startsAt):original):undefined,
  startDate:new Date(effective),endDate:new Date(effective),nextOccurrence:new Date(effective),occurrenceExceptions:[],
  startTime:exception?.startTime??base.startTime,
  // A changed start without a new finish does not confirm the old end clock.
  endTime:exception?.endTime??(exception?.startTime&&exception.startTime!==base.startTime?undefined:base.endTime),
  venueName:moved?exception?.venueName:base.venueName,
  cancelled:isCancelledRecord(base)||exception?.status==='cancelled',
  postponed:base.postponed===true||changedDate||ambiguous||(moved&&!exception?.venueName),
  rescheduledTo:rescheduled?effective:undefined,postponedFrom:rescheduled?original:undefined,
  bookingStatus:exception?.status==='sold-out'?'sold-out':base.bookingStatus,
  officialEventUrl:exception?.sourceUrl??base.officialEventUrl};
 if(moved)for(const key of ['streetAddress','suburb','coordinates','place','venue'])delete value[key];
 return value;
}
export function occurrenceData(data,day,now=new Date()){
 if(!hasExplicitSeries(data))return hasLegacyExceptions(data)?legacyData(data,day,now):data;
 const session=data.seriesOccurrences.find(s=>s.date===day);if(!session)return null;
 const baseData=data._seriesBase??data;
 const moved=session.venueName!==baseData.venueName;
 const value={...baseData,_seriesBase:baseData,startDate:new Date(session.date),endDate:new Date(session.date),nextOccurrence:new Date(session.date),startTime:session.startTime??undefined,endTime:session.endTime??undefined,venueName:session.venueName,occurrenceExceptions:[],cancelled:baseData.cancelled===true||session.status==='cancelled',postponed:baseData.postponed===true||['postponed','rescheduled'].includes(session.status),rescheduledTo:session.status==='rescheduled'?session.date:undefined,postponedFrom:session.status==='rescheduled'?session.originalDate:undefined,bookingStatus:session.status==='sold-out'?'sold-out':baseData.bookingStatus,officialEventUrl:session.sourceUrl??baseData.officialEventUrl};
 if(moved)for(const key of ['streetAddress','suburb','coordinates','place','venue'])delete value[key];
 return value;
}
export function explicitOccurrence(data,day,now=new Date()){
 const actual=occurrenceData(data,day);if(!actual)return null;
 const result=resolveOccurrence(actual,day,now);
 const session=data.seriesOccurrences.find(s=>s.date===day);
 const base=recordDisposition(data._seriesBase??data,now);
 const safe=base.status==='scheduled'&&!base.unverified&&!base.expired;
 const phase=/** @type {'upcoming'|'running'|'past'} */(result.phase);
 return {...result,phase,note:session?.note??result.note,bookable:safe && (session?.status==='rescheduled' ? result.phase!=='past' && !result.soldOut && !recordDisposition(actual,now).expired : result.bookable),data:actual,session,label:session?.status==='rescheduled'?'Rescheduled from '+session.originalDate:session?.status==='moved'?'Moved to '+session.venueName:result.label};
}
export function legacyOccurrence(data,day,now=new Date()){
 const actual=occurrenceData(data,day,now);if(!actual)return null;
 const effective=actual._occurrenceEffectiveDate??day,result=resolveOccurrence(actual,effective,now);
 const phase=/** @type {'upcoming'|'running'|'past'} */(result.phase);
 const base=recordDisposition(data._seriesBase??data,now);
 const safe=base.status==='scheduled'&&!base.unverified&&!base.expired;
 const exception=(data._seriesBase??data).occurrenceExceptions?.find(e=>e.date===actual._occurrenceOriginalDate);
 return {...result,phase,data:actual,note:exception?.note??result.note,sourceUrl:exception?.sourceUrl??result.sourceUrl,
  bookable:safe&&(result.status==='rescheduled'?result.phase!=='past'&&!result.soldOut:result.bookable),
  label:result.status==='rescheduled'?'Rescheduled from '+actual._occurrenceOriginalDate:exception?.status==='moved'?(actual.venueName?'Moved to '+actual.venueName:'Venue to be confirmed'):result.label};
}
export function nextSeriesData(data,now=new Date()){
 if(!hasExplicitSeries(data)){
  if(!hasLegacyExceptions(data)||isCancelledRecord(data)||data._occurrenceEffectiveDate)return data;
  const base=data._seriesBase??data,rule=legacyRule(base,now);if(!rule||(rule.kind==='range'&&rule.start<rule.end))return data;
  const hinted=dayIsoOf(base.nextOccurrence);
  if(hinted){const selected=occurrenceData(base,hinted,now);if(selected&&resolveOccurrence(selected,selected._occurrenceEffectiveDate,now).phase!=='past')return selected;}
  const today=startOfDay(now),start=rule.start>today?rule.start:today;
  for(let day=start,i=0;day<=rule.end&&i<=370;day=addDays(day,1),i++){
   if(!occursOnDay(rule,day))continue;
   const selected=occurrenceData(base,isoDate(day),now);if(selected&&resolveOccurrence(selected,selected._occurrenceEffectiveDate,now).phase!=='past')return selected;
  }
  return hinted?occurrenceData(base,hinted,now)??data:data;
 }
 const sessions=[...data.seriesOccurrences].sort((a,b)=>a.date.localeCompare(b.date));
 const next=sessions.find(s=>!['cancelled','postponed'].includes(s.status)&&explicitOccurrence(data,s.date,now).phase!=='past');
 return occurrenceData(data,(next??sessions.at(-1)).date);
}
