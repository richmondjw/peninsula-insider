// Recover this cycle's uncommitted patches only. Never reset/checkout a tree.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ChangeSet} from '../lib/autofix.mjs';
import {REPO_ROOT,ENGINE_DIR,readJson,writeJson} from '../lib/util.mjs';
const dirty=execFileSync('git',['diff','--name-only'],{cwd:REPO_ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const since=Number(process.argv[2])*1000;
const backups=path.join(ENGINE_DIR,'.rollback');
if(dirty.length && Number.isFinite(since) && fs.existsSync(backups)) {
  const results=[];
  for(const dir of fs.readdirSync(backups)) {
    const manifest=path.join(backups,dir,'manifest.json');
    if(!fs.existsSync(manifest) || fs.statSync(manifest).mtimeMs<since)continue;
    const saved=readJson(manifest);
    const cs=new ChangeSet({root:REPO_ROOT,runId:saved.runId});
    cs.changes=saved.changes.filter(c=>dirty.includes(c.file));
    results.push({runId:saved.runId,...cs.revertAll()});
  }
  writeJson(path.join(ENGINE_DIR,'.runs/local-recovery.json'),{at:new Date().toISOString(),results});
  console.log(JSON.stringify({localRecovery:results.map(r=>({runId:r.runId,reverted:r.reverted}))}));
}
