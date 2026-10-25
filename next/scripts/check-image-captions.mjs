/** Caption admission and legacy review inventory. No image identities are inferred. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import { captionIssues } from '../src/lib/image-presentation.mjs';

export function imageRecords(value, key = '$', result = []) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value.src === 'string' && /(?:images\/|https?:)/.test(value.src)) result.push({key, image:value});
  for (const [name, child] of Object.entries(value)) if (child && typeof child === 'object') imageRecords(child, `${key}.${name}`, result);
  return result;
}
function content(text, file) {
  if (file.endsWith('.json')) return JSON.parse(text);
  return parse(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '{}');
}
function walk(dir) {
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.(?:json|md|mdx)$/.test(e.name)?[path.join(dir,e.name)]:[]);
}
export function checkImages(current, previous = []) {
 const old = new Map(previous.map(r=>[r.key,JSON.stringify(r.image)]));
 return current.flatMap(r=>old.get(r.key)===JSON.stringify(r.image)?[]:captionIssues(r.image).map(issue=>`${r.key}: ${issue}`));
}
if (process.argv[1]?.endsWith('check-image-captions.mjs')) {
 // Checkout's PR merge commit includes its base parent at depth two.
 const event = process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH) ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')) : {};
 const base = process.env.PI_CAPTION_BASE || event.pull_request?.base?.sha || 'HEAD^';
 const report = [], failures = [];
 let changed;
 try { changed = new Set(execFileSync('git',['diff','--name-only',base,'--','src/content','src/data'],{encoding:'utf8'}).trim().split('\n').map(f=>f.replace(/^next\//,''))); }
 catch { console.error(`Caption gate cannot compare ${base}; fetch the base or set PI_CAPTION_BASE.`); process.exit(1); }
 for (const file of [...walk('src/content'),...walk('src/data')]) {
  let current; try { current=imageRecords(content(fs.readFileSync(file,'utf8'),file)); } catch { continue; }
  for (const record of current) for (const issue of captionIssues(record.image)) report.push({file,key:record.key,issue});
  if (!changed.has(file.replaceAll('\\','/'))) continue;
  let previous=[]; try { previous=imageRecords(content(execFileSync('git',['show',`${base}:next/${file.replaceAll('\\','/')}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']}),file)); } catch {}
  failures.push(...checkImages(current,previous).map(issue=>`${file}: ${issue}`));
 }
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync('reports/image-caption-review.json',JSON.stringify({base,issues:report},null,2)+'\n');
 console.log(`Caption review: ${report.length} legacy issues inventoried; ${failures.length} changed-image failures.`);
 if (failures.length) {console.error(failures.join('\n'));process.exitCode=1;}
}
