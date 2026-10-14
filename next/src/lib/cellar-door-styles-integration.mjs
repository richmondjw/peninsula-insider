// Remove stylesheet-request waterfalls for this route alone. Embed the exact
// shared build CSS, with URLs resolved against the stylesheet's original URL.
// Do not prune selectors: runtime navigation/dialog states need shared rules.
import {readFile,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function rebaseCssUrls(css,href){
 const rebased=css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g,(match,double,single,bare)=>{
  const value=double??single??bare;
  if(!value||/^(?:\/|#|data:|https?:|blob:)/i.test(value))return match;
  const resolved=new URL(value,'https://peninsulainsider.com.au'+href);
  return `url("${resolved.pathname}${resolved.search}${resolved.hash}")`;
 });
 return rebased.replace(/(@import\s+)(["'])([^"']+)\2/g,(match,prefix,quote,value)=>{
  if(/^(?:\/|#|data:|https?:|blob:)/i.test(value))return match;
  const resolved=new URL(value,'https://peninsulainsider.com.au'+href);
  return `${prefix}${quote}${resolved.pathname}${resolved.search}${resolved.hash}${quote}`;
 });
}
export async function inlineCellarStyles(html,resolve){
 // The responsive hook has already emitted the hero's actual AVIF candidates.
 // Discover the exact candidates early, after viewport metadata. A responsive
 // preload before that metadata uses the wrong mobile layout width and can
 // download an additional, oversized candidate.
 const heroSource=html.match(/<source\b[^>]*data-pi-avif-source[^>]*>/)?.[0];
 if(heroSource){
  const srcset=heroSource.match(/srcset="([^"]+)"/)?.[1];
  const sizes=heroSource.match(/sizes="([^"]+)"/)?.[1];
  const viewport=html.match(/<meta\b[^>]*name="viewport"[^>]*>/)?.[0];
  html=html.replace(/<link\b[^>]*data-cellar-hero-preload[^>]*>/g,'');
  if(srcset&&sizes&&viewport)html=html.replace(viewport,`${viewport}<link data-cellar-hero-preload rel="preload" as="image" type="image/avif" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`);
 }
 if(!html.includes('href="/fonts/sora-700.woff2" as="font"'))html=html.replace('<head>','<head><link rel="preload" href="/fonts/sora-700.woff2" as="font" type="font/woff2" crossorigin>');
 const links=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)];
 for(const [tag] of links){
  // Preserve conditional, switchable and disabled links as links. Converting
  // them to unconditional style elements would change their activation.
  if(/\s(?:media|disabled|title)(?:\s*=|\s|>)/i.test(tag))continue;
  const href=tag.match(/href="([^"]+)"/)?.[1];
  if(!href?.startsWith('/')||href.startsWith('//'))continue;
  const css=await resolve(href.split('?')[0]);
  if(css)html=html.replace(tag,`<style data-cellar-bundled-style>${rebaseCssUrls(css,href).replaceAll('</style','<\\/style')}</style>`);
 }
 return html;
}
export default function cellarDoorStyles(){return {name:'pi-cellar-door-styles',hooks:{'astro:build:done':async({dir})=>{
 const root=await realpath(fileURLToPath(dir));
 const page=path.join(root,'wine/best-cellar-doors/index.html');
 const html=await readFile(page,'utf8');
 const output=await inlineCellarStyles(html,async href=>{
  const file=await realpath(path.join(root,href));
  if(!file.startsWith(root+path.sep))throw new Error('Stylesheet escapes build directory');
  return readFile(file,'utf8');
 });
 await writeFile(page,output);
}}};}
