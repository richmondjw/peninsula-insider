import {zonedInstant,zonedParts,addDaysIso} from '../../next/src/lib/event-occurrence.mjs';
import {hash,safeUrl} from './data.mjs';
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ordinalNames={1:'first',2:'second',3:'third',4:'fourth',5:'fifth','-1':'last'};
function dateOnly(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value??''))throw new Error('Series requires explicit calendar dates');const date=new Date(value+'T00:00:00Z');if(date.toISOString().slice(0,10)!==value)throw new Error('Invalid series calendar date');return date;}
export function seriesContract(series){
 if(!series?.id||!['weekly','monthly'].includes(series.frequency))throw new Error('Explicit weekly/monthly series identity and frequency required; other patterns require adapter review');
 const start=dateOnly(series.validFrom),end=dateOnly(series.validUntil);if(end<=start||end-start>1096*86400000)throw new Error('Series requires positive, bounded range of at most three years');
 if(!Array.isArray(series.exceptions))throw new Error('Explicit exception inventory required');
 if(series.frequency==='weekly'&&(!Array.isArray(series.daysOfWeek)||!series.daysOfWeek.length||series.daysOfWeek.some(d=>!Number.isInteger(d)||d<0||d>6)))throw new Error('Explicit weekdays required');
 if(series.frequency==='monthly'&&(!Number.isInteger(series.weekday)||series.weekday<0||series.weekday>6||!Object.hasOwn(ordinalNames,series.ordinal)))throw new Error('Explicit monthly weekday and ordinal required');
 const note=series.frequency==='weekly'?'Every '+[...new Set(series.daysOfWeek)].map(d=>dayNames[d]).join(' and '):'The '+ordinalNames[series.ordinal]+' '+dayNames[series.weekday]+' of each month';
 return {start,end,recurrence:series.frequency,recurrenceNote:note,occurrenceExceptions:series.exceptions};
}
export function materializeSeries(candidate,{maxOccurrences=366}={}){
 const series=candidate.series,contract=seriesContract(series);const exceptions=new Map();
 const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
 for(const value of [candidate.fields.startTime,candidate.fields.endTime])if(value!=null&&!clock.test(value))throw new Error('Invalid explicit series clock');
 for(const exception of series.exceptions)for(const value of [exception.startTime,exception.endTime])if(value!=null&&!clock.test(value))throw new Error('Invalid exception clock');
 for(const item of series.exceptions){
 for(const key of Object.keys(item))if(!['date','status','rescheduledTo','startTime','endTime','venueName','sourceUrl','note'].includes(key))throw new Error('Unsupported exception field requires adapter review: '+key);
 if(item.sourceUrl)safeUrl(item.sourceUrl);
 if(item.status==='moved'&&!item.venueName)throw new Error('Moved occurrence requires explicit venue');
 if(item.status!=='rescheduled'&&item.rescheduledTo)throw new Error('New date requires explicit rescheduled status');
 dateOnly(item.date);if(exceptions.has(item.date))throw new Error('Conflicting exceptions require review');if(!['cancelled','postponed','rescheduled','sold-out','moved','as-scheduled'].includes(item.status))throw new Error('Invalid exception status');if(item.status==='rescheduled'){dateOnly(item.rescheduledTo);}exceptions.set(item.date,item);}
 const occurrences=[];
 for(let day=new Date(contract.start);day<=contract.end;day.setUTCDate(day.getUTCDate()+1)){
  const iso=day.toISOString().slice(0,10),weekday=day.getUTCDay();const monthEnd=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate();const nth=Math.floor((day.getUTCDate()-1)/7)+1;
  const scheduled=series.frequency==='weekly'?series.daysOfWeek.includes(weekday):weekday===series.weekday&&(series.ordinal===-1?day.getUTCDate()+7>monthEnd:nth===series.ordinal);if(!scheduled)continue;
  const exception=exceptions.get(iso);exceptions.delete(iso);const date=exception?.status==='rescheduled'?exception.rescheduledTo:iso;
  occurrences.push({id:hash(series.id+':'+iso+':'+(candidate.fields.startTime??candidate.fields.startDate?.slice(11,16)??'')).slice(0,24),seriesId:series.id,originalDate:iso,date,status:exception?.status??'scheduled',timezone:'Australia/Melbourne',startTime:exception?.startTime??candidate.fields.startTime??candidate.fields.startDate?.slice(11,16)??null,endTime:exception?.endTime??candidate.fields.endTime??candidate.fields.endDate?.slice(11,16)??null,venueName:exception?.venueName??candidate.fields.venueName,sourceUrl:exception?.sourceUrl??candidate.fields.officialEventUrl,...(exception?.note?{note:exception.note}:{}),reviewRequired:true});
  if(occurrences.length>maxOccurrences)throw new Error('Occurrence capacity exceeded; refusing silent truncation');
 }
 if(exceptions.size)throw new Error('Exception does not match an occurrence in the bounded series');
 if(!occurrences.length)throw new Error('Series bounds contain no scheduled occurrences');
 const actualDates=new Set();
 for(const occurrence of occurrences){
  if(occurrence.date<series.validFrom||occurrence.date>series.validUntil)throw new Error('Rescheduled occurrence exceeds approved series bounds; explicit bounds review required');
  if(actualDates.has(occurrence.date))throw new Error('Multiple occurrences on the same day require a multi-session website adapter');
  actualDates.add(occurrence.date);
  for(const [key,clockValue] of [['startTime',occurrence.startTime],['endTime',occurrence.endTime]]){
   if(clockValue==null)continue;if(!clock.test(clockValue))throw new Error('Invalid materialised series clock');
   const day=key==='endTime'&&occurrence.startTime&&clockValue<=occurrence.startTime?addDaysIso(occurrence.date,1):occurrence.date;
   const instant=zonedInstant(day,clockValue),parts=zonedParts(instant),again=zonedParts(new Date(instant.getTime()+3600000));
   const [year,month,date]=day.split('-').map(Number),[hour,minute]=clockValue.split(':').map(Number);
   const matches=p=>p.year===year&&p.month===month&&p.day===date&&p.hour===hour&&p.minute===minute;
   if(!matches(parts)||matches(again))throw new Error('Series clock falls in a daylight-saving gap or repeated hour; offset evidence adapter required');
  }
 }
 return {seriesId:series.id,contract,occurrences,publicationApproved:false};
}
