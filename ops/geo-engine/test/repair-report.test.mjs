import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operationalAttention} from '../lib/report.mjs';
import {publicImageSourceUrl} from '../../../next/src/lib/image-source-url.mjs';

test('image source links preserve public URLs but reject provenance notes and unsafe schemes',()=>{
  for (const value of ['Victoria Content Hub asset 161358, downloaded 2026-09-28','/asset-note/','javascript:alert(1)','https://','https://user:pass@example.com/',null,42])
    assert.equal(publicImageSourceUrl(value),null);
  for (const value of ['https://example.com/image/161358','http://example.com/?a=1&b=2'])
    assert.equal(publicImageSourceUrl(value),value);
});
test('unreleased findings and collector failures cannot be reported as no operational work',()=>{
  const notes=operationalAttention({liveCrawl:{matchesCurrentDeployment:false},discovery:{error:'TypeError'},changes:{planned:[{wouldApply:false}],deferred:[{reason:'unsupported source'}]}}).join(' ');
  assert.match(notes,/current deployment/);assert.match(notes,/TypeError/);
  assert.match(notes,/unsupported source/);assert.match(notes,/safety thresholds unchanged/);
  assert.deepEqual(operationalAttention({}),[]);
});

import {parsePage} from '../lib/html.mjs';
import {auditPage} from '../lib/technical.mjs';
test('cancelled Event schema suppresses only orphan promotion, not broken-link auditing',()=>{
  const html='<script type="application/ld+json">{"@graph":[{"@type":"Event","eventStatus":"https://schema.org/EventCancelled"}]}</script>';
  assert.equal(parsePage(html).eventCancelled,true);
  assert.equal(parsePage(html.replace('EventCancelled','EventScheduled')).eventCancelled,false);
  const page={urlPath:'/whats-on/cancelled/',pageType:'event',indexable:true,orphan:true,eventCancelled:true,outgoingInternal:[{to:'/missing/'}]};
  const ctx={knownPaths:new Set(),assetLike:()=>false};
  assert.ok(!auditPage(page,ctx).some(f=>f.rule==='orphan_page'));
  assert.ok(auditPage(page,ctx).some(f=>f.rule==='broken_internal_link'));
  assert.ok(auditPage({...page,eventCancelled:false},ctx).some(f=>f.rule==='orphan_page'));
});
