// Validate identity and date inputs before the permissive display helpers can
// turn corrupt input into an ordinary exclusion. A failure blocks reconciliation.
export function validateEventSource(data,slug) {
  const object=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error(`Invalid event ${label}`);};
  const text=(v,label)=>{if(typeof v!=='string')throw Error(`Invalid event ${label}`);};
  const bool=(v,label)=>{if(typeof v!=='boolean')throw Error(`Invalid event ${label}`);};
  const date=(v,label)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10))throw Error(`Invalid event ${label}`);};
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid event source object');
  if(typeof slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw Error('Invalid event identity');
  if(typeof data.title!=='string'||!data.title.trim())throw Error('Missing event title');
  if(data.slug!==undefined&&data.slug!==slug)throw Error('Event slug does not match source filename');
  if(data.status!==undefined&&!['draft','review','scheduled','published','expired','past','archived'].includes(data.status))throw Error('Invalid event lifecycle');
  for(const [field,allowed] of Object.entries({recurrence:['one-off','weekly','monthly','annual','seasonal','ongoing'],occurrencePolicy:['cadence','confirmed-only'],dateBasis:['fixed','operator-calendar','on-request','opening-hours'],contentKind:['event','experience','offer'],bookingStatus:['open','sold-out','waitlist','closed','not-required','unknown']})) {
    if(data[field]!==undefined&&!allowed.includes(data[field]))throw Error(`Invalid event ${field}`);
  }
  for(const field of ['cancelled','postponed','skipThis','endsNextDay','reviewHold','factualReviewHold'])if(data[field]!==undefined)bool(data[field],field);
  for(const field of ['suburb','summary','venueName','startTime','endTime','timezone','recurrenceNote','verificationStatus','bookingStatus','reviewStatus'])if(data[field]!==undefined)text(data[field],field);
  for(const field of ['place','venue'])if(data[field]!==undefined){
    if(typeof data[field]==='string')continue;
    object(data[field],field);text(data[field].id,field+'.id');
  }
  for(const field of ['startDate','endDate','nextOccurrence','rescheduledTo','expiresAt','sourceUpdatedAt','lastVerifiedAt','lastCheckedDate','publishedAt']) {
    const value=data[field];
    if(value===undefined&&field!=='startDate')continue;
    date(value,field);
  }
  if(data.endDate&&Date.parse(data.endDate)<Date.parse(data.startDate))throw Error('Inverted event date range');
  for(const field of ['seriesOccurrences','occurrenceExceptions'])if(data[field]!==undefined){
    const values=data[field];if(!Array.isArray(values))throw Error(`Invalid event ${field}`);
    const days=new Set();
    for(const row of values){
      object(row,field);date(row.date,field+'.date');
      for(const key of ['date','originalDate','rescheduledTo'])if(row[key]!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(row[key]))throw Error(`Invalid event ${field}.${key}`);
      if(days.has(row.date))throw Error(`Duplicate event ${field} date`);days.add(row.date);
      const statuses=['cancelled','postponed','rescheduled','sold-out','moved','as-scheduled',...(field==='seriesOccurrences'?['scheduled']:[])];
      if(!statuses.includes(row.status))throw Error(`Invalid event ${field}.status`);
      for(const key of ['originalDate','rescheduledTo'])if(row[key]!==undefined)date(row[key],field+'.'+key);
      if(field==='seriesOccurrences'){text(row.id,field+'.id');date(row.originalDate,field+'.originalDate');text(row.venueName,field+'.venueName');text(row.sourceUrl,field+'.sourceUrl');}
      for(const key of ['startTime','endTime','venueName','sourceUrl','note'])if(row[key]!==undefined&&!(field==='seriesOccurrences'&&['startTime','endTime'].includes(key)&&row[key]===null))text(row[key],field+'.'+key);
    }
  }
  if(data.sourceReview!==undefined){object(data.sourceReview,'sourceReview');if(data.sourceReview.required!==undefined)bool(data.sourceReview.required,'sourceReview.required');}
  if(data.intelligence!==undefined){
    const receipt=data.intelligence;object(receipt,'intelligence');
    for(const key of ['revision','approvedContent','approvedBy'])if(receipt[key]!==undefined)text(receipt[key],'intelligence.'+key);
    for(const key of ['approvedAt','reviewedAt'])if(receipt[key]!==undefined)date(receipt[key],'intelligence.'+key);
    if(receipt.factScore!==undefined&&(typeof receipt.factScore!=='number'||!Number.isFinite(receipt.factScore)))throw Error('Invalid event intelligence.factScore');
    if(receipt.evidenceIds!==undefined){if(!Array.isArray(receipt.evidenceIds)||receipt.evidenceIds.some(v=>typeof v!=='string'))throw Error('Invalid event intelligence.evidenceIds');}
    if(receipt.standingAuthority!==undefined){
      object(receipt.standingAuthority,'intelligence.standingAuthority');
      for(const key of ['id','by','scope','source'])if(receipt.standingAuthority[key]!==undefined)text(receipt.standingAuthority[key],'standingAuthority.'+key);
      if(receipt.standingAuthority.at!==undefined)date(receipt.standingAuthority.at,'standingAuthority.at');
    }
    if(receipt.geography!==undefined){
      const geo=receipt.geography;object(geo,'intelligence.geography');
      if(geo.shireConfirmed!==undefined)bool(geo.shireConfirmed,'geography.shireConfirmed');
      for(const key of ['verifiedBy','evidenceId'])if(geo[key]!==undefined)text(geo[key],'geography.'+key);
      if(geo.checkedAt!==undefined)date(geo.checkedAt,'geography.checkedAt');
    }
  }
}

