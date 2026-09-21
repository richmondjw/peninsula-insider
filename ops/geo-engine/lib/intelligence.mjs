// Read-only intelligence over dated connector evidence. Missing data stays missing.
export function searchTrends(doc) {
  if (doc?.gsc?.status !== 'observed') return {available:false};
  const aggregate = rows => {
    const out = new Map();
    for (const r of rows ?? []) {
      const [page, query] = r.keys ?? [];
      if (!page || !query) continue;
      const x = out.get(query) ?? {query,impressions:0,clicks:0,pages:new Set()};
      x.impressions += r.impressions ?? 0; x.clicks += r.clicks ?? 0; x.pages.add(page); out.set(query,x);
    }
    return out;
  };
  const current=aggregate(doc.gsc.current?.page_queries?.rows), previous=aggregate(doc.gsc.previous?.page_queries?.rows);
  const changes=[...new Set([...current.keys(),...previous.keys()])].map(query=>{
    const a=current.get(query), b=previous.get(query);
    return {query,currentImpressions:a?.impressions??0,previousImpressions:b?.impressions??0,
      clickDelta:(a?.clicks??0)-(b?.clicks??0), impressionDelta:(a?.impressions??0)-(b?.impressions??0),
      pages:[...(a?.pages??[])], evidence:'observed_export',
      caveat:'Absence may reflect privacy filtering or export truncation, not zero demand.'};
  });
  return {available:true,observedAt:doc.observed_at,windows:doc.ranges,
    propertyTotals:{current:doc.gsc.current?.totals?.rows?.[0]??null,previous:doc.gsc.previous?.totals?.rows?.[0]??null},
    emerging:changes.filter(x=>x.previousImpressions===0&&x.currentImpressions>=20),
    rising:changes.filter(x=>x.previousImpressions>=20&&x.impressionDelta>=20),
    declining:changes.filter(x=>x.previousImpressions>=20&&x.impressionDelta<=-20),
    possibleCannibalisation:changes.filter(x=>x.pages.length>1&&x.currentImpressions>=20)
      .map(x=>({...x,caveat:'Multiple landing pages are a review signal, not proof of harmful cannibalisation.'})),
    devices:doc.gsc.current?.devices??null,
    limitations:doc.gsc.limitations??[]};
}

export function attachEngagement(pages,doc) {
  for(const p of Object.values(pages)) p.analytics=null;
  if(doc?.ga4?.status!=='observed') return {available:false,attached:0};
  let attached=0;
  const byPath=new Map();
  for(const row of doc.ga4.current?.organic_pages?.rows??[]) {
    const value=(row.dimension_values??row.dimensionValues)?.[0]?.value;
    if(!value?.startsWith('/'))continue;
    const key=new URL(value,'https://peninsulainsider.com.au').pathname.replace(/\/?$/,'/');
    const metrics=row.metric_values??row.metricValues;
    const sessions=Number(metrics?.[0]?.value),engagedSessions=Number(metrics?.[1]?.value);
    if(!Number.isFinite(sessions)||!Number.isFinite(engagedSessions))continue;
    const prior=byPath.get(key)??{organicSessions:0,engagedSessions:0};
    prior.organicSessions+=sessions;prior.engagedSessions+=engagedSessions;byPath.set(key,prior);
  }
  for(const [key,value] of byPath) if(pages[key]) {
    pages[key].analytics={...value,engagementRate:value.organicSessions?value.engagedSessions/value.organicSessions:null,
      observedAt:doc.observed_at,window:doc.ranges.current,source:'GA4 organic landing pages'};attached++;
  }
  return {available:true,attached,limitations:doc.ga4.limitations??[]};
}

// A durable research queue, not an automatic editorial publisher. Never invent evidence.
export function researchQueue(gaps,previous={items:[]},now=new Date().toISOString()) {
  const prior=new Map((previous.items??[]).map(x=>[x.key,x]));
  for(const gap of gaps.candidates??[]) {
    if(gap.verdict!=='create'||gap.provider!=='jev'||gap.confidence<0.8)continue;
    const key=gap.label.trim().toLowerCase();
    const old=prior.get(key);
    prior.set(key,{...old,key,readerQuestion:gap.label,firstSeenAt:old?.firstSeenAt??now,lastSeenAt:now,
      status:old?.status??'research_required',confidence:gap.confidence,signals:gap,
      requiredEvidence:['Current primary local sources','Existing PI coverage and overlap review','Verified entities and dates'],
      acceptance:['Evidence-linked factual claims','Human review of subjective local recommendations','No fabricated experience or quotations'],
      workflow:'Research -> evidence -> outline -> draft -> fact-check -> editorial publication decision',
      externalWorkItem:old?.externalWorkItem??null});
  }
  return {version:1,updatedAt:now,items:[...prior.values()]};
}

export function entityIntelligence(vocab,graph,now=new Date().toISOString()) {
  const date=now.slice(0,10);
  const events=(vocab.events??[]).map(e=>({slug:e.slug,title:e.title,
    timing:!e.startDate?'unknown':String(e.endDate??e.startDate).slice(0,10)<date?'past':String(e.startDate).slice(0,10)>date?'upcoming':'current',
    missing:['startDate','venueName','suburb','url'].filter(k=>!e[k]),
    matchedVenue:graph.edges.some(x=>x.from===`event:${e.slug}`&&x.rel==='HELD_AT'),
    action:'Verify dates, recurrence and historical value; never delete an expired URL automatically.'}));
  const names=new Map();
  for(const v of vocab.venues??[]) {
    const key=v.name.toLowerCase().replace(/[^a-z0-9]/g,'');
    names.set(key,[...(names.get(key)??[]),v.slug]);
  }
  return {observedAt:now,events,venues:(vocab.venues??[]).map(v=>({slug:v.slug,
    missing:['place','address','website'].filter(k=>!v[k]),hoursPresent:v.hasHours,
    freshness:'unverified',action:'Verify with primary venue source; presence does not establish freshness.'})),
    possibleDuplicateVenues:[...names.values()].filter(x=>x.length>1),
    note:'Source-record checks only. No fabricated facts, automatic deletion, or inferred recurrence.'};
}
