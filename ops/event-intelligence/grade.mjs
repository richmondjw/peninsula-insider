import { readFileSync,realpathSync } from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
export function validateEvidenceRefs(refs,root=process.cwd()){if(!Array.isArray(refs)||!refs.length)return false;return refs.every(ref=>{try{if(typeof ref.path!=='string'||path.isAbsolute(ref.path)||!ref.sha256?.match(/^[a-f0-9]{64}$/))return false;const file=realpathSync(path.resolve(root,ref.path)),relative=path.relative(realpathSync(root),file);if(relative.startsWith('..')||path.isAbsolute(relative))return false;return createHash('sha256').update(readFileSync(file)).digest('hex')===ref.sha256;}catch{return false;}});}

export function gradeStage(rubric, receipt) {
  const results = rubric.checks.map(id => ({id, passed: receipt.checks?.[id]?.passed === true && typeof receipt.checks[id].evidence === 'string' && receipt.checks[id].evidence.trim().length > 0 && (!rubric.requireHashedEvidence || validateEvidenceRefs(receipt.checks[id].references))}));
  const score = Math.round(results.filter(x => x.passed).length / results.length * 100) / 10;
  const criticalFailures = rubric.critical.filter(id => !results.find(x => x.id === id)?.passed);
  return {stage:rubric.id,score,passed:score >= 9 && criticalFailures.length === 0,criticalFailures,failed:results.filter(x=>!x.passed).map(x=>x.id)};
}
export function gradeSequence(rubrics, receipts) {
  const grades=[];
  for (const stage of rubrics.stages) {
    const receipt=receipts.find(r=>r.stage===stage.id);
    if (!receipt) return {passed:false,nextStage:stage.id,grades};
    const grade=gradeStage(stage,receipt); grades.push(grade);
    if (!grade.passed) return {passed:false,nextStage:stage.id,grades};
  }
  return {passed:true,nextStage:null,grades};
}
if (process.argv[1]?.endsWith('grade.mjs')) {
  const rubrics=JSON.parse(readFileSync(new URL('./rubrics.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  const receipts=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')));
  const result=gradeSequence(rubrics,receipts); console.log(JSON.stringify(result,null,2));
  // A supplied stage must pass; remaining stages are explicitly pending.
  if(result.grades.some(g=>!g.passed)) process.exitCode=1;
}
