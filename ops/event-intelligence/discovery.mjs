import {parse} from '../../next/node_modules/parse5/dist/index.js';
import {safeUrl,hash} from './data.mjs';
const patterns={mpt:/\/whats-on\/view\/\d+\//i,libraries:/\/Whats-On\/Events\/[^/]+$/i,mprg:/\/Exhibitions\/Current-exhibitions\/[^/]+$/i,'mt-eliza-art':/\/pages\/(opening|gala|whats-on)/i,'westernport-writes':/\.pdf$|trybooking\.com\/au\/event/i};
export function actualAnchors(body){
 const rows=[];const visit=node=>{if(node.tagName==='a'){const href=node.attrs?.find(a=>a.name==='href')?.value;if(href)rows.push(href);}for(const child of node.childNodes??[])visit(child);};visit(parse(body));return rows;
}
export function discoverLinks(evidence) {
 const links=new Map(); const pattern=patterns[evidence.sourceId];
 for(const href of actualAnchors(evidence.body)) {
  if(/[\[\]{}<>]/.test(href))continue;
  let url;try{url=safeUrl(new URL(href,evidence.url).href);}catch{continue;}
  if(href.startsWith('#'))continue;url.hash='';
  if(url.href===new URL(evidence.url).href.split('#')[0]||/\.(?:jpe?g|png|gif|svg|webp|mp4|zip)$/i.test(url.pathname))continue;
  const same=url.hostname===new URL(evidence.url).hostname;
  const eventLink=pattern?.test(url.href)||/\/(events?|exhibitions?)\/[^/?]+/i.test(url.pathname);
  if(!eventLink || /past-exhibitions|archive|wp-json/i.test(url.href))continue;
  links.set(url.href,{id:hash(url.href).slice(0,24),url:url.href,sourceId:evidence.sourceId,evidenceId:evidence.id,retrievalAllowed:same,format:/\.pdf($|\?)/i.test(url.href)?'pdf':'html',status:'discovered',requiresReview:true});
 }
 return [...links.values()];
}

export function balancedLeads(leads,limit=20){
 const queues=new Map();
 for(const lead of leads){if(!lead.retrievalAllowed||lead.format!=='html')continue;const queue=queues.get(lead.sourceId)??[];queue.push(lead);queues.set(lead.sourceId,queue);}
 const selected=[];
 while(selected.length<limit&&[...queues.values()].some(q=>q.length))for(const queue of queues.values()){if(queue.length&&selected.length<limit)selected.push(queue.shift());}
 return selected;
}
