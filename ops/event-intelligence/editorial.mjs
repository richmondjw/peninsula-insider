const audienceWeights={fit:.30,geography:.20,usefulness:.15,distinctiveness:.15,timeliness:.10,seasonal:.05,demand:.05};
const priorityWeights={significance:.25,distinctiveness:.20,opportunity:.20,reporting:.15,urgency:.10,coverageGap:.10};
function weighted(values,weights) {
 const missing=Object.keys(weights).filter(k=>typeof values?.[k]?.score!=='number'||!values[k].reason);
 const score=Object.entries(weights).reduce((sum,[key,weight])=>sum+Math.max(0,Math.min(100,values?.[key]?.score??0))*weight,0);
 return {score:Math.round(score),missing,reasons:Object.fromEntries(Object.keys(weights).map(k=>[k,values?.[k]?.reason??'Unknown; not inferred']))};
}
export function gradeEditorial(candidate) {
 const audiences=Object.fromEntries(Object.entries(candidate.audienceAssessments??{}).map(([segment,values])=>[segment,weighted(values,audienceWeights)]));
 const priority=weighted(candidate.editorialAssessment,priorityWeights);
 // Sponsorship never enters factual, audience or editorial ranking.
 return {audiences,priority,sponsored:candidate.sponsored===true,productionReady:Boolean(candidate.summary&&candidate.category),recommendedPath:priority.score>=80?'feature-brief':priority.score>=65?'enhanced-listing':'standard-listing'};
}
export function productionDecision(candidate,verification,visual) {
 if(!verification.ready)return {path:'review',reasons:verification.errors};
 const grade=gradeEditorial(candidate);
 if(!grade.productionReady)return {path:'review',reasons:['original-summary-and-category-required']};
 return {path:grade.recommendedPath,requiresHumanApproval:true,visualTreatment:visual?.ready?'approved-asset':'branded-graphic',featureRequiresReporting:grade.recommendedPath==='feature-brief',sponsoredLabel:grade.sponsored?'Sponsored':null,grade};
}
