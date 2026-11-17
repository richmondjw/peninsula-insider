/** Compare the rendered relationship contract to independently reconstructed evidence. */
export function relationshipEvidenceDefects(index,panels,eventPanels,{requiredVenueIds=[]}={}) {
 const defects=[];
 for(const panel of panels) {
  const expected=index.byVenue.get(panel.venueId);
  if(!expected){defects.push({venueId:panel.venueId,reason:'unknown-panel-venue'});continue;}
  for(const kind of ['mentions','selections','plans','nearby']) {
   const wanted=(kind==='nearby'?expected[kind].slice(0,6):expected[kind]);
   const edges=panel.edges.filter(e=>e.kind===kind);
   for(const edge of edges){if(edge.actualHrefs && (edge.actualHrefs.length!==1 || edge.actualHrefs[0]!==edge.href))defects.push({venueId:panel.venueId,href:edge.href,reason:'edge-anchor-mismatch'});const match=wanted.find(e=>e.href===edge.href);if(!match)defects.push({venueId:panel.venueId,kind,href:edge.href,reason:'unsupported-rendered-edge'});else if(kind==='nearby' && (!Number.isFinite(edge.distanceKm) || Math.abs(edge.distanceKm-match.distanceKm)>0.000001)) defects.push({venueId:panel.venueId,href:edge.href,reason:'distance-evidence-mismatch'});}
   for(const edge of wanted)if(!edges.some(e=>e.href===edge.href))defects.push({venueId:panel.venueId,kind,href:edge.href,reason:'missing-rendered-edge'});
  }
 }
 for(const id of requiredVenueIds){const expected=index.byVenue.get(id);if(expected && ['mentions','selections','plans','nearby'].some(k=>expected[k].length) && !panels.some(p=>p.venueId===id))defects.push({venueId:id,reason:'missing-relationship-panel'});}
 for(const panel of eventPanels){const expected=index.byVenue.get(panel.venueId)?.events??[];for(const event of panel.events)if(!expected.some(e=>String(e.data.slug??e.id)===event.id && e.data._promotionDay===event.day && event.href===`/whats-on/${event.id}/`))defects.push({venueId:panel.venueId,eventId:event.id,reason:'unsupported-rendered-event-location-or-day'});}
 for(const id of requiredVenueIds)for(const e of index.byVenue.get(id)?.events??[])if(!eventPanels.some(p=>p.venueId===id && p.events.some(x=>x.id===String(e.data.slug??e.id) && x.day===e.data._promotionDay)))defects.push({venueId:id,eventId:e.id,reason:'missing-rendered-event'});
 return defects;
}
