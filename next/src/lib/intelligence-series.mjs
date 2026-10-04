import {recordDisposition,resolveOccurrence} from './event-occurrence.mjs';
export function hasExplicitSeries(data){return !!data?.intelligence && Array.isArray(data?.seriesOccurrences) && data.seriesOccurrences.length>0;}
export function occurrenceData(data,day){
 if(!hasExplicitSeries(data))return data;
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
export function nextSeriesData(data,now=new Date()){
 if(!hasExplicitSeries(data))return data;
 const sessions=[...data.seriesOccurrences].sort((a,b)=>a.date.localeCompare(b.date));
 const next=sessions.find(s=>!['cancelled','postponed'].includes(s.status)&&explicitOccurrence(data,s.date,now).phase!=='past');
 return occurrenceData(data,(next??sessions.at(-1)).date);
}
