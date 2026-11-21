#!/usr/bin/env node
/** Read-only local inventory. No database/model calls, no ingestion claim. */
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {projectEventInventory,readEventSources} from './concierge-events.mjs';
const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
if(!args.includes('--now')||!args.includes('--out'))throw Error('Usage: --now ISO_INSTANT --out REPORT_PATH [--content DIR]');
const now=new Date(value('--now'));if(!Number.isFinite(+now))throw Error('Invalid audit clock');
const dir=resolve(args.includes('--content')?value('--content'):'next/src/content/events');
const records=await readEventSources(dir);
const projection=projectEventInventory(records,now);
const report={schemaVersion:1,mode:'local-source-projection-only',clock:now.toISOString(),candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),horizonDays:366,sourceCount:records.length,projected:projection.outcomes.filter(r=>r.status==='projected').length,excluded:projection.outcomes.filter(r=>r.status==='excluded').length,failed:projection.outcomes.filter(r=>r.status==='failed').length,...projection};
await writeFile(resolve(value('--out')),JSON.stringify(report,null,2));
console.log(JSON.stringify({sources:report.sourceCount,projected:report.projected,excluded:report.excluded,failed:report.failed}));
process.exitCode=projection.complete?0:1;
