/** Check reader figures and known standalone caption paths, excluding metadata/scripts. */
import fs from 'node:fs';
import path from 'node:path';
export function figureCaptionIssues(html) {
 const issues=[];
 for(const figure of html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)) {
  const captions=[...figure[1].matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi)];
  if(captions.length>1) issues.push('Multiple captions on one figure');
  const text=captions.map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).join(' ');
  if(/This image shows|Conceptual oversized/i.test(text)) issues.push('Machine-like public caption');
  if(/data-journal-image-caption/.test(figure[1]) && /data-pi-media-disclosure/.test(figure[1])) issues.push('Duplicate Journal caption/disclosure');
 }
 const standalone = new Set(['event-image-credit','pi-card__image-note','itinerary-card__photo-credit','itinerary-detail__image-credit']);
 for(const caption of html.matchAll(/<p\b[^>]*\bclass=(['"])([^'"]*)\1[^>]*>([\s\S]*?)<\/p>/gi)){
  if(!caption[2].split(/\s+/).some(c=>standalone.has(c)))continue;
  const text=caption[3].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  if(/This image shows|Conceptual oversized/i.test(text))issues.push('Machine-like standalone caption');
 }
 return issues;
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
if(process.argv[1]?.endsWith('assert-image-captions.mjs')){
 const failures=[];let pages=0;
 for(const file of walk('dist')) {if(/(?:^|[\\/])(?:admin|agents)[\\/]/.test(file))continue;pages++;for(const issue of figureCaptionIssues(fs.readFileSync(file,'utf8')))failures.push(`${file}: ${issue}`);}
 console.log(`Caption rendering: ${pages} reader pages, ${failures.length} failures.`);
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
}
