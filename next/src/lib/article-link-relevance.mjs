/** Editorial relevance precedes presentation format. References stay explicit. */
const refId = value => typeof value === 'string' ? value : value?.id ?? '';
const generic = new Set(['daily','weekly','insider-picks','mornington-peninsula','guide']);
export function articleLinkRelevance(a,b) {
  const tags = data => new Set((data.tags??[]).map(tag=>String(tag).trim().toLowerCase()).filter(tag=>tag&&!generic.has(tag)));
  const left=tags(a.data), right=tags(b.data);
  let score=[...left].filter(tag=>right.has(tag)).length*3;
  for(const field of ['relatedPlaces','relatedVenues','relatedExperiences','relatedItineraries']) {
    const refs=new Set((a.data[field]??[]).map(refId).filter(Boolean));
    const other=new Set((b.data[field]??[]).map(refId).filter(Boolean));
    score+=[...refs].filter(id=>other.has(id)).length*4;
  }
  if(score>0&&a.data.format&&a.data.format===b.data.format)score++;
  return score;
}
