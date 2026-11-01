import {selectEventPromotions} from '../../next/src/lib/event-discovery.mjs';
import {parse} from '../../next/node_modules/parse5/dist/index.js';
import {isPublicEventRecord} from '../../next/src/lib/event-publication.mjs';
export function verifyRoutinePublic(expected,html,feed,now=new Date()){
 const nodes=[];function walk(node){nodes.push(node);for(const child of node.childNodes??[])walk(child);}walk(parse(html));
 const attr=(node,name)=>node.attrs?.find(item=>item.name===name)?.value;
 const marker=nodes.find(node=>attr(node,'data-routine-event')!==undefined);
 let actual;try{actual=JSON.parse(attr(marker,'data-routine-event'));}catch{throw Error('Missing public routine receipt');}
 if(!isPublicEventRecord(actual,now)||actual.intelligence.approvedContent!==expected.intelligence.approvedContent||actual.intelligence.revision!==expected.intelligence.revision)throw Error('Public routine receipt differs or has expired');
 if(!nodes.some(node=>node.tagName==='a'&&attr(node,'href')===expected.primarySourceUrl))throw Error('Public primary-source link missing');
 if(nodes.some(node=>node.tagName==='figure'&&/event-detail__image/.test(attr(node,'class')??'')))throw Error('Text-only publication unexpectedly redistributed an image');
 const entry=feed.events?.find(item=>item.url==='https://peninsulainsider.com.au/whats-on/'+expected.slug+'/');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(feed.window?.start??'')||!/^\d{4}-\d{2}-\d{2}$/.test(feed.window?.end??''))throw Error('Public feed window is missing');
 const windowStart=new Date(feed.window.start+'T00:00:00Z'),windowEnd=new Date(feed.window.end+'T00:00:00Z'),windowDays=Math.round((+windowEnd-+windowStart)/86400000)+1;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Melbourne'}).format(now);
 if(!Number.isFinite(+windowStart)||!Number.isFinite(+windowEnd)||windowStart.toISOString().slice(0,10)!==feed.window.start||windowEnd.toISOString().slice(0,10)!==feed.window.end||windowDays<1||windowDays>366||feed.window.start!==today)throw Error('Public feed window is invalid or stale');
 const projected=selectEventPromotions([{id:expected.eventId,data:expected}],{now,windowStart,windowDays,limit:1})[0];
 if(projected&&(!entry||entry.title!==expected.title||entry.sourceUrl!==expected.primarySourceUrl||entry.startDate!==projected.day))throw Error('Public upcoming feed does not match the next active occurrence');
 if(!projected&&entry)throw Error('Public feed exposes an ineligible occurrence');
 return {detail:true,feed:Boolean(entry),revision:actual.intelligence.revision};
}
