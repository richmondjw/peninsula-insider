/** Rewire only anchors to destinations declared by built redirect/canonical pages.
 * Source offsets preserve HTML, scripts, editorial copy, metadata and saved state.
 */
import {inventory,destination,excluded,BASE} from './internal-link-quality.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
export function rewrites(page,pages) {
  const edits=[];
  for(const a of page.links) {
    if(!a.url||excluded(a.url.pathname)||!a.location)continue;
    const target=destination(a.url,pages);
    if(!target||target.pathname===a.url.pathname)continue;
    const targetPage=pages.get(target.pathname);
    if(!targetPage||targetPage.noindex||target.hash&&!targetPage.ids.includes(decodeURIComponent(target.hash.slice(1))))continue;
    const href=BASE+target.pathname+target.search+target.hash;
    edits.push({start:a.location.startOffset,end:a.location.endOffset,href,old:a.href});
  }
  return edits;
}
export async function apply(dist) {
  const pages=await inventory(dist); const changes=[];
  for(const page of pages.values()) {
    if(excluded(page.route)||page.redirect)continue;
    const edits=rewrites(page,pages); if(!edits.length)continue;
    let html=page.html;
    for(const e of edits.sort((a,b)=>b.start-a.start)) {
      html=html.slice(0,e.start)+'href="'+e.href.replaceAll('&','&amp;').replaceAll('"','&quot;')+'"'+html.slice(e.end);
      changes.push({source:page.route,from:e.old,to:e.href});
    }
    await writeFile(page.file,html);
  }
  return changes;
}
if(process.argv[1]?.endsWith('canonicalize-internal-links.mjs')) {
  const changes=await apply(path.resolve('dist'));
  await mkdir('../ops/reports/seo/internal-linking',{recursive:true});
  await writeFile('../ops/reports/seo/internal-linking/canonical-rewires.json',JSON.stringify({generatedAt:new Date().toISOString(),changes},null,2)+'\n');
  console.log(`Canonical internal links: ${changes.length} anchors rewired to declared destinations.`);
}
