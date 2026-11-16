import {astroRecord} from './publication.mjs';
import {publicEventData} from '../../next/src/lib/event-publication.mjs';
import {htmlEscape} from './data.mjs';
export function routineFixture(now=new Date()){
 const day=new Date(+now+86400000).toISOString().slice(0,10);
 const fields={title:'Synthetic verified art session',venueName:'Synthetic gallery',officialEventUrl:'https://example.com/synthetic-event',status:'scheduled',startDate:day+'T10:00:00+11:00',endDate:day+'T12:00:00+11:00'};
 const evidence={id:'fixture-official',url:fields.officialEventUrl,authority:'official',retrievedAt:now.toISOString(),body:Object.values(fields).join(' ')};
 const candidate={id:'synthetic-event',kind:'event',fields,summary:'Synthetic test fixture only. An art session with its date, venue and official source retained for verification. Check the organiser before making plans.',category:'Arts & Culture',reviewStatus:'review',geography:{shireConfirmed:true,evidenceId:evidence.id,quote:'Synthetic gallery',verified:true,verifiedBy:'James'},proofs:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,{evidenceId:evidence.id,value,quote:value,verified:true,verifiedBy:'James'}]))};
 const record=astroRecord(candidate,[evidence],{now,standingAuthority:true});record.status='published';
 const html='<html><body><article data-routine-event="'+htmlEscape(JSON.stringify(publicEventData(record)))+'"><h1>'+record.title+'</h1><a href="'+fields.officialEventUrl+'">Check organiser</a></article></body></html>';
 const feed={window:{start:new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(now),end:new Date(+now+90*86400000).toISOString().slice(0,10)},events:[{url:'https://peninsulainsider.com.au/whats-on/synthetic-event/',title:record.title,sourceUrl:record.primarySourceUrl,startDate:day}]};
 return {packet:{candidates:[candidate],evidence:[evidence]},record,html,feed};
}
