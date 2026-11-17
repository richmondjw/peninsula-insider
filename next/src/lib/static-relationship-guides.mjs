/** Route-owned metadata; prose is shared with these routes, never a shadow article. */
export const staticRelationshipGuides = Object.freeze([
 {id:'guide:family-friendly',href:'/explore/family-friendly/',title:'Family-Friendly Things to Do on the Mornington Peninsula'},
 {id:'guide:rainy-day',href:'/explore/rainy-day/',title:'Rainy Day Activities on the Mornington Peninsula'},
]);
export function eligibleStaticRelationshipGuide(g) {
 const owned=staticRelationshipGuides.find(x=>x.id===g.id && x.href===g.href);
 return owned && g.evidenceEligible===true ? {...g,data:{title:owned.title},relationshipKind:'static-guide'} : null;
}
