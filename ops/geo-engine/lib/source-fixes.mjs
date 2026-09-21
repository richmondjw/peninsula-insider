// Deliberately bounded source transformations. Models judge patches; they cannot
// supply executable code, paths, facts, policy changes, or replacement prose.
import fs from 'node:fs';
import path from 'node:path';
import { ChangeSet, PLANE } from './autofix.mjs';
import { Ledger } from './ledger.mjs';
import { ORIGIN, REPO_ROOT, STATE_DIR, readJson, sha256 } from './util.mjs';
import { decodeEntities, stripTags, sentences, metaContent } from './html.mjs';

export const PATCH_ACTIONS = ['rewrite_title', 'rewrite_meta_description', 'add_missing_meta_description',
  'fix_broken_internal_link', 'add_internal_link', 'fix_malformed_jsonld', 'sitemap_remove_dead_url', 'sitemap_remove_noindex'];
const escaped = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePath = p => typeof p === 'string' && /^\/(?:[a-z0-9-]+\/)*$/.test(p) && !/^\/(admin|dev|account|ops|me)\//.test(p);
const TOPIC_STOP = new Set('the a an and or of on in to for with from by at best guide insider every complete ultimate our your'.split(' '));
export function preservesTopic(before, after, minimum = 1) {
  const words=s=>new Set(String(s).toLowerCase().replace(/\s*[·|]\s*peninsula insider\s*$/i,'').match(/[a-z0-9]+/g)?.filter(w=>w.length>2 && !TOPIC_STOP.has(w))??[]);
  const original=words(before), proposed=words(after);
  // These region identifiers may never disappear from an existing search title.
  if(['mornington','peninsula'].some(w=>original.has(w) && !proposed.has(w)))return false;
  return !original.size || [...original].filter(w=>proposed.has(w)).length/original.size>=minimum;
}

export function isSensitivePage(urlPath, page) {
  return /\b(safety|medical|emergency|legal|privacy|terms|corrections)\b/i.test(`${urlPath.replaceAll('-',' ')} ${page?.title??''} ${page?.h1??''}`);
}

function mappedDestination(root, from, pages) {
  for(const rel of ['ops/cloudflare-redirects.csv','ops/wellness-redirects.csv']) {
    const file=path.join(root,rel);if(!fs.existsSync(file))continue;
    for(const line of fs.readFileSync(file,'utf8').split('\n')) {
      const [source,target,status]=line.split(',');
      if(source?.replace(/\/?$/,'/')!==from || status!=='301' || !target?.startsWith('/'))continue;
      const dest=target.replace(/\/?$/,'/');
      if(safePath(dest) && pages[dest]?.indexable && !pages[dest]?.redirectTarget)return dest;
    }
  }
  return null;
}

export function removeTrailingJsonCommas(text) {
  let quoted=false, escape=false, out='';
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted) {out+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
    if(c==='"')quoted=true;
    if(c===',' && /^\s*[}\]]/.test(text.slice(i+1)))continue;
    out+=c;
  }
  return out;
}

export function registerPatchDecision(registry) {
  registry.register('risk.exact_source_patch', {
    question: 'Compare only the supplied exact source edit and evidence.',
    fields: {
      containsNewClaim:{type:'boolean',question:'Does afterEdit introduce a factual claim that is absent from beforeEdit and the supplied source evidence?',criteria:{true:'The edit adds a new claim about a place, price, date, availability, quality or commercial benefit not stated in the source evidence.',false:'The edit reuses the supplied existing headline or sentence, or changes only linking, metadata presentation or syntax without a new factual claim.'}}
    },
  }, () => ({value:{containsNewClaim:true},confidence:0,rationale:'Exact patches require a successful remote assessment. Reversibility is proved by code and hash-checked backups, not model opinion.'}));
}

export function patchAssessmentInput(patch) {
  const {before,after}=patch;
  let start=0,endBefore=before.length,endAfter=after.length;
  while(start<Math.min(before.length,after.length) && before[start]===after[start])start++;
  while(endBefore>start && endAfter>start && before[endBefore-1]===after[endAfter-1]){endBefore--;endAfter--;}
  start=before.lastIndexOf('\n',start-1)+1;
  const beforeLineEnd=before.indexOf('\n',endBefore),afterLineEnd=after.indexOf('\n',endAfter);
  return {action:patch.action,evidence:patch.evidence,expected:patch.expected,
    beforeEdit:before.slice(start,beforeLineEnd<0?before.length:beforeLineEnd),
    afterEdit:after.slice(start,afterLineEnd<0?after.length:afterLineEnd),
    hashBefore:patch.hashBefore,hashAfter:patch.hashAfter};
}

export function sourceFile(root, urlPath) {
  if (!safePath(urlPath)) return null;
  const stem = path.join(root, 'next/src/pages', urlPath.slice(1));
  const candidates = [stem.replace(/[\\/]$/, '') + '.astro', path.join(stem, 'index.astro')];
  const file = candidates.find(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!file || !fs.realpathSync(file).startsWith(fs.realpathSync(path.join(root,'next/src/pages')) + path.sep)) return null;
  return file;
}

export function proposePatch(finding, {pages, root = REPO_ROOT}) {
  if(isSensitivePage(finding.urlPath,pages[finding.urlPath]))return null;
  if (['sitemap_url_missing_page','noindex_in_sitemap'].includes(finding.rule) && safePath(finding.urlPath)) {
    const page=pages[finding.urlPath];
    if(finding.rule==='sitemap_url_missing_page' && page || finding.rule==='noindex_in_sitemap' && page?.indexable!==false) return null;
    const file=path.join(root,'next/src/pages/sitemap.xml.ts');
    if(!fs.existsSync(file))return null;
    const before=fs.readFileSync(file,'utf8');
    const lines=before.split('\n');
    const matches=lines.filter(line=>{
      const m=line.match(/^\s*entries\.push\(url\('([^']+)'[^;]*\);\s*$/);
      return m && m[1].replace(/\/?$/,'/')===finding.urlPath;
    });
    if(matches.length!==1)return null; // Never rewrite loops, filters or generated sitemap output.
    const after=before.replace(matches[0]+'\n','');
    return {file:'next/src/pages/sitemap.xml.ts',urlPath:'/sitemap.xml',affectedPath:finding.urlPath,rule:finding.rule,
      action:page?'sitemap_remove_noindex':'sitemap_remove_dead_url',before,after,hashBefore:sha256(before),hashAfter:sha256(after),
      expected:{sitemapAbsent:ORIGIN+finding.urlPath},evidence:{sourceLiteral:matches[0],indexable:page?.indexable??false}};
  }
  if (finding.rule==='orphan_page') {
    const target=pages[finding.urlPath];
    const anchor=target?.h1;
    if(!target?.indexable || target.redirectTarget || !anchor || anchor.length<8 || anchor.length>80 || /[<>&{}]/.test(anchor))return null;
    for(const source of Object.values(pages)) {
      if(isSensitivePage(source.urlPath,source))continue;
      if(!source.indexable || source.urlPath===target.urlPath || !source.venues?.some(v=>target.venues?.includes(v)))continue;
      const file=sourceFile(root,source.urlPath);if(!file)continue;
      const before=fs.readFileSync(file,'utf8');
      const paragraphs=[...before.matchAll(/<p(?:\s[^>]*)?>([^<>{}]+)<\/p>/g)].filter(m=>m[1].includes(anchor));
      if(paragraphs.length!==1)continue;
      const literal=paragraphs[0][0];
      const after=before.replace(literal,literal.replace(anchor,`<a href="${target.urlPath}">${anchor}</a>`));
      return {file:path.relative(root,file).split(path.sep).join('/'),urlPath:source.urlPath,rule:finding.rule,
        action:'add_internal_link',before,after,hashBefore:sha256(before),hashAfter:sha256(after),expected:{link:target.urlPath},
        evidence:{existingAnchor:anchor,sharedVerifiedVenue:source.venues.filter(v=>target.venues.includes(v))}};
    }
    return null;
  }
  const page = pages[finding.urlPath];
  if (!page || !page.indexable || page.redirectTarget) return null;
  const file = sourceFile(root, finding.urlPath);
  if (!file) return null; // Dynamic templates/collections need an explicit mapper, never a guessed edit.
  const before = fs.readFileSync(file,'utf8');
  let after = before, action, expected, evidence;
  const layout = before.match(/<BaseLayout\b[^>]*>/s)?.[0];
  if (['duplicate_title','missing_title','title_too_long','title_too_short'].includes(finding.rule) && layout) {
    const title = layout.match(/\btitle="([^"]*)"/);
    const h1 = page.h1?.trim();
    if (!title || !h1 || h1.length < 20 || h1.length > 65 || /[{}<>]/.test(h1)) return null;
    // Extractive only: existing headline, no generated or inferred claims.
    const replacement = `${h1} · Peninsula Insider`;
    if(replacement.length>65)return null;
    if(!preservesTopic(decodeEntities(title[1]),replacement))return null;
    if (Object.values(pages).some(p => p.urlPath !== finding.urlPath && p.title?.toLowerCase() === replacement.toLowerCase())) return null;
    after = before.replace(layout, layout.replace(title[0], `title="${escaped(replacement)}"`));
    action = 'rewrite_title'; expected = {title:replacement}; evidence = {existingHeadline:h1};
  } else if (['missing_meta_description','meta_description_length','duplicate_meta_description'].includes(finding.rule) && layout) {
    const prose=before.slice(before.indexOf('<BaseLayout'));
    const lead = [...prose.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
      .filter(m=>!/[{}]/.test(m[1])).map(m=>stripTags(m[1])).find(s=>s.length>=80);
    const sentence = sentences(lead??'').find(s => s.length >= 80 && s.length <= 160 && !/[{}<>]/.test(s));
    if (!sentence) return null;
    const attr = layout.match(/\bdescription="([^"]*)"/);
    if(attr && !preservesTopic(decodeEntities(attr[1]),sentence,.6))return null;
    if (!attr && /\bdescription\s*=/.test(layout)) return null;
    const updated = attr ? layout.replace(attr[0], `description="${escaped(sentence)}"`) : layout.replace('<BaseLayout', `<BaseLayout description="${escaped(sentence)}"`);
    after = before.replace(layout, updated); action = attr ? 'rewrite_meta_description' : 'add_missing_meta_description';
    expected = {description:sentence}; evidence = {existingSentence:sentence};
  } else if (finding.rule === 'broken_internal_link') {
    // Only an existing rendered redirect is authoritative. Never fuzzy-match a venue.
    const target = pages[finding.target]?.redirectTarget ?? mappedDestination(root,finding.target,pages);
    if (!target || !safePath(target) || !pages[target]?.indexable || pages[target]?.redirectTarget) return null;
    const literal = `href="${finding.target}"`;
    if (!before.includes(literal)) return null;
    after = before.replaceAll(literal, `href="${target}"`); action = 'fix_broken_internal_link';
    expected = {link:target,absentLink:finding.target}; evidence = {redirectFrom:finding.target,redirectTo:target};
  } else if (finding.rule === 'invalid_jsonld') {
    // Repair only static JSON with a trailing comma. Dynamic Astro expressions are out of scope.
    const blocks = [...before.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)];
    for (const block of blocks) {
      try { JSON.parse(block[1]); continue; } catch {}
      const repaired = removeTrailingJsonCommas(block[1]);
      try { JSON.parse(repaired); } catch { continue; }
      after = before.replace(block[0], block[0].replace(block[1], repaired));
      action = 'fix_malformed_jsonld'; expected = {validJsonLd:true}; evidence = {repair:'Remove trailing commas from static JSON only'}; break;
    }
  }
  if (!action || before === after) return null;
  return {file:path.relative(root,file).split(path.sep).join('/'),urlPath:finding.urlPath,rule:finding.rule,
    action,before,after,hashBefore:sha256(before),hashAfter:sha256(after),expected,evidence};
}

export function candidatePriority(finding, patch, pages, ledger) {
  const severity={duplicate_title:3,broken_internal_link:3,invalid_jsonld:2,sitemap_url_missing_page:2,noindex_in_sitemap:2};
  const history=ledger.successRateFor(patch.action);
  const weight=history?.samples>=3 ? .8+.4*history.successRate : 1;
  return ((severity[finding.rule]??1)+Math.min(1,Math.log10(1+(pages[patch.urlPath]?.search?.impressions??0))/4))*weight;
}

export async function applySourceFixes({findings,pages,service,policy,runId,root=REPO_ROOT,fetchImpl=fetch,ledger=new Ledger()}) {
  const changes = [], deferred = [];
  if(!policy.enabled)return {changes,deferred};
  const changeSet = new ChangeSet({runId,root});
  const touched = new Set();
  const previousRelease = readJson(path.join(STATE_DIR,'release.json'));
  // Prove the complete release path on one patch before enabling full-size batches.
  const commissioned = ledger.data.interventions.some(i=>i.mode==='deployed' && i.deployedSha);
  const batchLimit = Math.min(5,policy.maxChangesPerRun,commissioned?5:1);
  const historyDir=path.join(STATE_DIR,'releases');
  const recent=fs.existsSync(historyDir) ? fs.readdirSync(historyDir).filter(f=>f.endsWith('.json'))
    .map(f=>readJson(path.join(historyDir,f))).filter(Boolean).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,3) : [];
  if(recent.length===3 && recent.every(r=>['rejected','rolled_back','rollback_failed'].includes(r.status) && Date.now()-Date.parse(r.createdAt)<7*86400000)) {
    throw Error('Release circuit breaker: three failed batches in seven days; investigate before further publication');
  }
  try {
    const candidates=findings.map(finding=>({finding,patch:proposePatch(finding,{pages,root})})).filter(c=>c.patch);
    candidates.sort((a,b)=>candidatePriority(b.finding,b.patch,pages,ledger)-candidatePriority(a.finding,a.patch,pages,ledger));
    for (const {finding,patch} of candidates) {
      if (changes.length >= batchLimit) break;
      if (touched.size >= 20) break;
      if (!patch || touched.has(patch.file) || !policy.allowedActions.includes(patch.action)) continue;
      if(patch.expected.title && changes.some(c=>c.expected.title?.toLowerCase()===patch.expected.title.toLowerCase()))continue;
      touched.add(patch.file);
      const deployed=ledger.lastInterventionFor(patch.urlPath);
      if(deployed && (deployed.result==='awaiting_measurement' || Date.now()-Date.parse(deployed.deployedAt)<28*86400000)) {
        deferred.push({urlPath:patch.urlPath,reason:'deployed experiment is still in its observation window'});continue;
      }
      if(previousRelease && ['rejected','rolled_back'].includes(previousRelease.status)
          && Date.now()-Date.parse(previousRelease.updatedAt)<7*86400000
          && previousRelease.changes?.some(c=>c.file===patch.file && c.hashAfter===patch.hashAfter)) {
        deferred.push({urlPath:patch.urlPath,reason:'identical failed patch quarantined for seven days'});continue;
      }
      // Live evidence must agree with the audited title before editing; no stale-build fixes.
      const response = await fetchImpl(ORIGIN + patch.urlPath,{signal:AbortSignal.timeout(20000)});
      const html = await response.text();
      const liveTitle = decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
      if (response.status !== 200 || (!patch.expected.sitemapAbsent && liveTitle !== pages[patch.urlPath].title)) {
        deferred.push({urlPath:patch.urlPath,reason:'live/source mismatch'}); continue;
      }
      patch.rollbackExpected=patch.expected.sitemapAbsent
        ? {sitemapPresent:patch.expected.sitemapAbsent}
        : {title:liveTitle,description:metaContent(html,'description')};
      if(patch.affectedPath) {
        const affected=await fetchImpl(ORIGIN+patch.affectedPath,{signal:AbortSignal.timeout(20000)});
        if(patch.action==='sitemap_remove_dead_url' && affected.status!==404)continue;
        if(patch.action==='sitemap_remove_noindex' && !/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(await affected.text()))continue;
      }
      if(patch.expected.link) {
        const destination=await fetchImpl(ORIGIN+patch.expected.link,{signal:AbortSignal.timeout(20000)});
        if(destination.status!==200)continue;
      }
      const verdict = await service.decide('risk.exact_source_patch',patchAssessmentInput(patch));
      if (verdict.provider !== 'jev' || verdict.error || !Number.isFinite(verdict.confidence) || verdict.confidence < Math.max(.92,policy.confidenceThreshold)
          || verdict.value?.containsNewClaim !== false) {
        deferred.push({urlPath:patch.urlPath,reason:'exact patch assessment not accepted',verdict}); continue;
      }
      const result = changeSet.applyTextChange({file:path.join(root,patch.file),plane:PLANE.SOURCE,
        opportunity:{id:`${finding.rule}:${patch.urlPath}`,proposedAction:patch.action},
        transform:s=>{if(sha256(s)!==patch.hashBefore)throw Error('source changed during assessment');return patch.after;}});
      if (result.changed) changes.push({...patch,before:undefined,after:undefined,...result.change,verdict});
    }
  } catch (error) {
    const rollback = changeSet.revertAll(); changeSet.save();
    throw Error(`Source application failed: ${error.message}; reverted ${rollback.reverted}`);
  }
  if (changes.length) changeSet.save();
  return {changes,deferred};
}
