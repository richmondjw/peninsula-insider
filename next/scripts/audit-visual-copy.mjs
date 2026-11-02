import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
const root = path.resolve('dist');
const matches=[]; let pages=0;
async function walk(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  if(entry.isDirectory()){if(!['admin','agents','_astro'].includes(entry.name))await walk(path.join(dir,entry.name));continue;}
  if(!entry.name.endsWith('.html'))continue;
  const file=path.join(dir,entry.name);pages++;
  const parts=[];
  function text(node){if(['script','style'].includes(node.tagName))return;if(node.nodeName==='#text')parts.push(node.value);for(const child of node.childNodes??[])text(child);}
  text(parse(await fs.readFile(file,'utf8')));
  const visible=parts.join(' ');
  // Target disclosure/promotion strings, never general discussion of art.
  const pattern=/\billustrati(?:ve|on)s?\b|Conceptual (?:coastal|editorial)|original editorial illustration|Illustration\s*[:·]|go in the draw|250 to dine|Jackalope.{0,30}voucher|voucher.{0,30}Jackalope/gi;
  for(const hit of visible.matchAll(pattern))matches.push({file:path.relative(root,file),context:visible.slice(Math.max(0,hit.index-50),hit.index+hit[0].length+100)});
 }
}
await walk(root);
console.log(JSON.stringify({pages,matches},null,2));
// Campaigns contains an internal production brief discussing an illustration,
// not a disclosure under an image. Report it for review; don't erase its prose.
if(matches.some(m=>m.file!==path.join('campaigns','index.html')))process.exitCode=1;
