// The release boundary is code, not a model prompt. Only generated source
// patches may pass, every existing CI check must pass, and live HTML is checked.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {metaContent, jsonLd, decodeEntities} from './html.mjs';
import {ORIGIN, REPO_ROOT, STATE_DIR, readJson, writeJson, sha256} from './util.mjs';
import {Ledger} from './ledger.mjs';

export const REQUIRED_CHECKS = ['Reject placeholder stubs and schema-invalid content',
  'Search, saves, trips and planning, driven end to end',
  'A build cannot manufacture the evidence it is judged against', 'cycle'];
export function checksPassed(checks) {
  return REQUIRED_CHECKS.every(name=>checks.some(c=>c.name===name && c.state==='SUCCESS'))
    && checks.length > 0 && checks.every(c=>['SUCCESS','SKIPPED','NEUTRAL'].includes(c.state));
}
export function validateScope(changes, files) {
  const allowed = new Set(changes.map(c=>c.file));
  if (!changes.length || changes.length > 5 || files.length !== allowed.size) throw Error('Invalid release change count');
  for (const file of files) {
    if (!allowed.has(file) || (!/^next\/src\/pages\/[a-z0-9/-]+\.astro$/.test(file) && file!=='next/src/pages/sitemap.xml.ts')
      || /(?:^|\/)(dev|admin|account|ops|me)(?:\/|\.)/.test(file) || file.includes('..')) throw Error(`Release scope refused: ${file}`);
  }
}
export function verifyHtml(html, expected) {
  if(expected.sitemapAbsent && html.includes(`<loc>${expected.sitemapAbsent}</loc>`))return false;
  if(expected.sitemapPresent && !html.includes(`<loc>${expected.sitemapPresent}</loc>`))return false;
  const title = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]??'');
  if (expected.title && title !== expected.title) return false;
  if (expected.description) {
    const value = metaContent(html,'description');
    if (value !== expected.description) return false;
  }
  if (expected.link && !html.includes(`href="${expected.link}"`)) return false;
  if (expected.absentLink && html.includes(`href="${expected.absentLink}"`)) return false;
  if (expected.validJsonLd) {
    const parsed=jsonLd(html);
    if(!parsed.blocks.length || parsed.invalid.length)return false;
  }
  return true;
}
const cmd = (bin,args,root=REPO_ROOT)=>execFileSync(bin,args,{cwd:root,encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
const git = (...args)=>cmd('git',args);
const gh = (...args)=>cmd('gh',args);
const json = (...args)=>{
  try{return JSON.parse(gh(...args));}catch(error){
    if(args[0]==='pr' && args[1]==='checks' && [1,8].includes(error.status) && error.stdout) return JSON.parse(String(error.stdout));
    throw error;
  }
};
const receiptFile = path.join(STATE_DIR,'release.json');
const save = r=>{r.updatedAt=new Date().toISOString();writeJson(receiptFile,r);writeJson(path.join(STATE_DIR,'releases',`${r.runId}.json`),r);return r;};

export function submitRelease(run, analytics) {
  const changes = run.changes.applied;
  if (!changes.length) return {status:'no_changes'};
  if (run.system.errors.length) throw Error('An errored audit cannot publish');
  const files = git('diff','--name-only').split('\n').filter(Boolean);
  validateScope(changes,files);
  if (git('diff','--cached','--name-only')) throw Error('Unexpected staged changes');
  for (const change of changes) {
    if (sha256(fs.readFileSync(path.join(REPO_ROOT,change.file),'utf8')) !== change.hashAfter) throw Error('Source changed after patch assessment');
    const built = change.urlPath==='/sitemap.xml' ? path.join(REPO_ROOT,'next/dist/sitemap.xml') : path.join(REPO_ROOT,'next/dist',change.urlPath,'index.html');
    if (!verifyHtml(fs.readFileSync(built,'utf8'),change.expected)) throw Error('Built patch acceptance failed');
  }
  const baseSha = git('rev-parse','HEAD');
  const branch = `geo-engine/auto-${run.runId}`;
  const r = save({runId:run.runId,status:'prepared',baseSha,branch,changes,analytics,createdAt:new Date().toISOString()});
  git('switch','-c',branch);
  git('add','--',...files);
  git('commit','-m',`fix(seo): evidence-backed automatic batch ${run.runId}`);
  r.headSha=git('rev-parse','HEAD');save(r);
  git('push','-u','origin',branch);
  r.prUrl=gh('pr','create','--base','main','--head',branch,'--title',`fix(seo): automatic improvement ${run.runId}`,'--body',
    `James-authorised bounded SEO automation. ${changes.length} exact source patches assessed by JEV. No new facts. Existing content, integrity and browser checks must pass before machine merge. Live verification and single scoped revert on technical failure are mandatory. Run: ${run.runId}.`);
  r.status='ci_pending';return save(r);
}

async function liveCheck(r) {
  const response = await fetch(`${ORIGIN}/deployment.json?geo=${Date.now()}`,{signal:AbortSignal.timeout(20000),cache:'no-store'});
  if (!response.ok) return {ready:false};
  const provenance = await response.json();
  if (provenance.sourceSha !== r.mergeSha) return {ready:false,provenance};
  for (const change of r.changes) {
    const res = await fetch(`${ORIGIN}${change.urlPath}?geo=${Date.now()}`,{signal:AbortSignal.timeout(20000),cache:'no-store'});
    if (res.status !== 200 || !verifyHtml(await res.text(),change.expected)) return {ready:true,ok:false,provenance};
  }
  return {ready:true,ok:true,provenance};
}

function recordDeployment(r) {
  const ledger = new Ledger();
  for (const change of r.changes) {
    if (ledger.data.interventions.some(i=>i.runId===r.runId && i.urlPath===change.urlPath && i.mode==='deployed')) continue;
    const row = r.analytics?.gsc?.current?.pages?.rows?.find(x=>{
      try{return new URL(x.keys[0]).pathname.replace(/\/?$/,'/')===change.urlPath;}catch{return false;}
    });
    ledger.recordIntervention({runId:r.runId,date:r.deployedAt.slice(0,10),urlPath:change.urlPath,
      action:change.action,mode:'deployed',deployedSha:r.mergeSha,deployedAt:r.deployedAt,
      changeMade:{file:change.file,hashBefore:change.hashBefore,hashAfter:change.hashAfter},
      searchBefore:row??null,searchWindowBefore:r.analytics?.ranges?.current??null,
      rollback:{mergeSha:r.mergeSha},confidence:change.verdict?.confidence,provider:'jev'});
  }
  ledger.save();
}

function startRollback(r, reason) {
  // Revert this commit only, preserving any unrelated work. Do not force-push/reset.
  git('fetch','origin','main:refs/remotes/origin/main');
  for (const change of r.changes) {
    if (sha256(git('show',`origin/main:${change.file}`)+'\n') !== change.hashAfter) {
      // git output trimming is unsuitable for arbitrary EOFs; compare raw bytes instead.
      const raw=execFileSync('git',['show',`origin/main:${change.file}`],{cwd:REPO_ROOT,encoding:'utf8'});
      if (sha256(raw)!==change.hashAfter) throw Error('Rollback held: affected source changed after release');
    }
  }
  const branch=`geo-engine/rollback-${r.runId}`;
  git('switch','-c',branch,'origin/main');
  r.rollbackBaseSha=git('rev-parse','HEAD');
  git('revert','--no-edit',r.mergeSha);
  r.rollbackHead=git('rev-parse','HEAD');r.rollbackBranch=branch;r.rollbackReason=reason;
  save(r);git('push','-u','origin',branch);
  r.rollbackPr=gh('pr','create','--base','main','--head',branch,'--title',`fix(seo): rollback ${r.runId}`,'--body',`Automatic scoped rollback of ${r.mergeSha}. Technical acceptance failed: ${reason}. Existing gates remain required.`);
  r.status='rollback_ci_pending';return save(r);
}

export async function advanceRelease() {
  const r=readJson(receiptFile);
  if (!r || ['verified','rolled_back','rejected','no_changes'].includes(r.status)) return r;
  if (r.status==='prepared') throw Error('Interrupted release preparation; retained receipt requires reconciliation');
  const rolling=r.status.startsWith('rollback_');
  const pr=rolling?r.rollbackPr:r.prUrl;
  if (r.status==='ci_pending' || r.status==='rollback_ci_pending') {
    const view=json('pr','view',pr,'--json','headRefOid,baseRefName,baseRefOid,state,mergeCommit,mergeable');
    if(view.headRefOid!==(rolling?r.rollbackHead:r.headSha) || view.baseRefName!=='main') throw Error('PR identity changed; refusing merge');
    if(view.state==='CLOSED'){r.status='rejected';return save(r);}
    if(view.state!=='MERGED') {
      if(view.baseRefOid !== (rolling?r.rollbackBaseSha:r.baseSha)) {
        git('fetch','origin','main:refs/remotes/origin/main');
        git('switch',rolling?r.rollbackBranch:r.branch);
        try {git('merge','--no-edit','origin/main');} catch(error) {
          git('merge','--abort');r.status=rolling?'rollback_failed':'rejected';r.reason='Main changed with a merge conflict';return save(r);
        }
        for(const change of r.changes) {
          const expected=rolling?change.hashBefore:change.hashAfter;
          if(sha256(fs.readFileSync(path.join(REPO_ROOT,change.file),'utf8'))!==expected) throw Error('Main changed an affected file; re-assessment required');
        }
        if(rolling){r.rollbackHead=git('rev-parse','HEAD');r.rollbackBaseSha=git('rev-parse','origin/main');}
        else {r.headSha=git('rev-parse','HEAD');r.baseSha=git('rev-parse','origin/main');}
        save(r);git('push','origin',rolling?r.rollbackBranch:r.branch);return r;
      }
      const checks=json('pr','checks',pr,'--json','name,state');
      if(checks.some(c=>['FAILURE','ERROR','CANCELLED','TIMED_OUT','ACTION_REQUIRED'].includes(c.state))) {
        r.status=rolling?'rollback_failed':'rejected';r.reason='CI rejected release';return save(r);
      }
      if(!checksPassed(checks) || view.mergeable!=='MERGEABLE') return r;
      // Exact expected head, never --admin and never bypass a failing check.
      gh('pr','merge',pr,'--squash','--match-head-commit',view.headRefOid);
    }
    const merged=json('pr','view',pr,'--json','mergeCommit');
    if(!merged.mergeCommit?.oid) return r;
    if(rolling){r.rollbackSha=merged.mergeCommit.oid;r.status='rollback_deploy_pending';}
    else {r.mergeSha=merged.mergeCommit.oid;r.status='deploy_pending';}
    return save(r);
  }
  if(r.status==='deploy_pending') {
    const live=await liveCheck(r);
    if(live.ready && !live.ok) return startRollback(r,'live patch assertions failed');
    const runs=json('run','list','--workflow','build-and-deploy.yml','--commit',r.mergeSha,'--json','status,conclusion,databaseId');
    const latest=runs[0];
    if(latest?.status==='completed' && latest.conclusion!=='success') return startRollback(r,'build/deploy workflow failed');
    if(live.ok && latest?.conclusion==='success') {
      r.status='verified';r.deployedAt=new Date().toISOString();r.provenance=live.provenance;
      recordDeployment(r);return save(r);
    }
    return r;
  }
  if(r.status==='rollback_deploy_pending') {
    const res=await fetch(`${ORIGIN}/deployment.json?geo=${Date.now()}`,{signal:AbortSignal.timeout(20000)});
    const provenance=await res.json();
    const runs=json('run','list','--workflow','build-and-deploy.yml','--commit',r.rollbackSha,'--json','status,conclusion');
    if(provenance.sourceSha===r.rollbackSha && runs[0]?.conclusion==='success') {
      for(const change of r.changes) {
        const page=await fetch(`${ORIGIN}${change.urlPath}?geo=${Date.now()}`,{signal:AbortSignal.timeout(20000)});
        if(page.status!==200 || !verifyHtml(await page.text(),change.rollbackExpected??{})) throw Error('Rollback live acceptance failed');
      }
      r.status='rolled_back';r.rollbackVerifiedAt=new Date().toISOString();return save(r);
    }
  }
  return r;
}
