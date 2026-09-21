// Strict provider-shape separation: search rankings are not AI citations.
export function normalizeSearch(result) {
  const candidates=[result?.structuredContent,result?.details,result];
  for(const item of result?.content??[]) if(item.type==='text') {
    try{candidates.push(JSON.parse(item.text));}catch{ /* prose is not a typed observation */ }
  }
  return candidates.find(x=>x&&['answer','results','error','raw'].includes(x.kind))??{kind:'error',message:'Unrecognised search envelope'};
}

export function discoveryRecord(question,response,receipt,observedAt) {
  if(response.query!==question.query)throw Error('Search returned a different query');
  const surface=`OpenClaw grounded search (${response.provider??'unknown'})`;
  if(response.kind==='answer') {
    if(typeof response.content!=='string'||!response.content.trim())throw Error('Empty grounded answer');
    if(!Array.isArray(response.citations))throw Error('Answer lacks explicit citation metadata');
    return {questionId:question.id,query:question.query,kind:'ai_answer',surface,observedAt,
      answer:response.content,receipt,cached:response.cached===true,
      citations:response.citations.map(c=>({url:c.url,context:response.content,contextScope:'answer'}))};
  }
  if(response.kind==='results'&&Array.isArray(response.results))return {
    questionId:question.id,query:question.query,kind:'search_results',surface,observedAt,receipt,
    results:response.results.map(r=>({url:new URL(r.url).href,title:r.title,snippet:r.snippet??null})),
    limitation:'Observed search results only; no AI citation inference.'};
  throw Error('Provider did not return observable answers or search results');
}
