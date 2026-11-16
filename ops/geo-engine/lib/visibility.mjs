// Observations must contain an actual dated answer and citation context.
// Search-result URLs alone are NOT AI-answer citations.
import {sha256} from './util.mjs';
export function validateObservation(raw,benchmark,now=Date.now()) {
  const question=benchmark.questions.find(q=>q.id===raw.questionId);
  if(!question||question.query!==raw.query)throw Error('Unknown benchmark question');
  if(raw.kind!=='ai_answer'||typeof raw.surface!=='string'||!raw.surface.trim()
    ||typeof raw.answer!=='string'||!raw.answer.trim()
    ||typeof raw.receipt!=='string'||!raw.receipt.trim())throw Error('Actual answer and collection receipt required');
  const at=Date.parse(raw.observedAt);
  if(!Number.isFinite(at)||at>now+300000)throw Error('Invalid observation date');
  if(!Array.isArray(raw.citations))throw Error('Explicit citations array required');
  const citations=raw.citations.map(c=>{
    const url=new URL(c.url);
    if(!['https:','http:'].includes(url.protocol)||!c.context||!raw.answer.includes(c.context))throw Error('Citation must have exact answer context');
    return {url:url.href,domain:url.hostname,context:c.context,contextScope:c.contextScope??'passage',
      isPI:['peninsulainsider.com.au','www.peninsulainsider.com.au'].includes(url.hostname)};
  });
  const id=sha256(JSON.stringify([raw.questionId,raw.surface,raw.observedAt,raw.answer,citations]));
  return {id,questionId:raw.questionId,query:raw.query,surface:raw.surface,kind:'ai_answer',
    observedAt:raw.observedAt,answer:raw.answer,receipt:raw.receipt,citations,cached:raw.cached===true,
    piMentioned:/\bpeninsula\s+insider\b|peninsulainsider\.com\.au/i.test(raw.answer),
    piCited:citations.some(c=>c.isPI),measurement:'observed'};
}
export function importObservations(benchmark,rows) {
  const checked=rows.map(row=>validateObservation(row,benchmark)); // Validate entire batch before mutation.
  return {...benchmark,questions:benchmark.questions.map(q=>{
    const observations=new Map((q.observations??[]).map(o=>[o.id,o]));
    for(const row of checked.filter(o=>o.questionId===q.id)) observations.set(row.id,row);
    return {...q,observations:[...observations.values()],measurement:observations.size?'observed':q.measurement};
  })};
}
export function visibilitySummary(benchmark,now=Date.now()) {
  const recent=(benchmark?.questions??[]).flatMap(q=>q.observations??[])
    .filter(o=>o.kind==='ai_answer'&&now-Date.parse(o.observedAt)<28*86400000);
  const latest=new Map();
  for(const o of recent) {
    const key=JSON.stringify([o.questionId,o.surface]);
    if(!latest.has(key)||Date.parse(o.observedAt)>Date.parse(latest.get(key).observedAt))latest.set(key,o);
  }
  const observations=[...latest.values()];
  return {state:observations.length?'observed':'not_yet_measurable',windowDays:28,observations:observations.length,
    questionsObserved:new Set(observations.map(o=>o.questionId)).size,
    surfaces:[...new Set(observations.map(o=>o.surface))],
    piCitationShare:observations.length?observations.filter(o=>o.piCited).length/observations.length:null,
    uniquePIUrls:[...new Set(observations.flatMap(o=>o.citations.filter(c=>c.isPI).map(c=>c.url)))],
    competitorDomains:[...new Set(observations.flatMap(o=>o.citations.filter(c=>!c.isPI).map(c=>c.domain)))],
    reason:observations.length?'Dated imported answer receipts; sampled surface only, not all AI platforms.'
      :'No observed AI-answer receipts. Inferred page coverage is not citation visibility.'};
}
