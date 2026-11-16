import {verifyCandidate} from './verify.mjs';
export function operationalReport({sources=[],receipts=[],candidates=[],evidence=[]},{now=new Date()}={}){
 const bySource=new Map(receipts.map(r=>[r.sourceId??r.id,r]));
 const sourceHealth=sources.map(source=>{const receipt=bySource.get(source.id),last=new Date(receipt?.lastSuccessAt??receipt?.retrievedAt??0),due=!Number.isFinite(last.getTime())||last>now||now-last>=(source.cadenceHours??24)*3600000;return {id:source.id,due,state:!receipt?'unobserved':receipt.status==='failed'?'failed':due?'stale':'current',error:receipt?.error??null};});
 const alerts=[];const reviewQueue=[];
 for(const candidate of candidates){const verified=verifyCandidate(candidate,evidence,{now});const end=candidate.fields?.endDate??candidate.fields?.startDate;const cancelled=['cancelled','postponed'].includes(candidate.fields?.status);const past=verified.errors.includes('past-event')||verified.errors.includes('past-offer');const conflict=verified.errors.includes('unresolved-conflict');const deadline=end?new Date(end):null;const soon=deadline&&deadline-now>=0&&deadline-now<=72*3600000;
  const actionable=Boolean(candidate.approval||candidate.reviewStatus==='published');
  if((cancelled||past||conflict)&&actionable)alerts.push({id:candidate.id,priority:'urgent',reason:cancelled?'cancellation-or-postponement':past?'expiry':'conflicting-facts',action:'human-review-and-withdrawal-check'});
  if(!verified.ready||!candidate.approval)reviewQueue.push({id:candidate.id,reason:verified.ready?'publication-approval':'verification',dueSoon:Boolean(soon),historical:past,factScore:verified.factScore});
 }
 for(const source of sourceHealth)if(['failed','stale','unobserved'].includes(source.state))alerts.push({sourceId:source.id,priority:'normal',reason:'source-'+source.state,action:'retrieve-or-investigate'});
 return {createdAt:now.toISOString(),sourceHealth,alerts,reviewQueue,counts:{sources:sources.length,healthy:sourceHealth.filter(s=>s.state==='current').length,candidates:candidates.length,awaitingReview:reviewQueue.length},publicationChanges:[],note:'Review proposals only; no automatic approval, cancellation or expiry mutation.'};
}
