import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const phase = process.argv[2] || 'candidate';
const url = process.env.CELLAR_URL || 'http://127.0.0.1:4324/wine/best-cellar-doors/';
const out = `../reports/cellar-doors/${phase}`;
await mkdir(out, {recursive:true});
const browser = await puppeteer.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const results=[];
for (const width of [320,390,768,1440]) {
 const page=await browser.newPage();
 await page.setViewport({width,height:width===1440?1000:844,deviceScaleFactor:1});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle0',timeout:120000});
 await page.screenshot({path:`${out}/${width}-first-screen.png`});
 // Exercise actual lazy loading before diagnosing a zero-size image as broken.
 await page.evaluate(async()=>{ for(let y=0;y<document.documentElement.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,80));}window.scrollTo(0,0); });
 await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
 const report=await page.evaluate(()=>({title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent),images:[...document.querySelectorAll('main img')].map(i=>({src:i.currentSrc,alt:i.alt,loaded:i.complete&&i.naturalWidth>0,width:i.naturalWidth})),canonical:document.querySelector('link[rel=canonical]')?.href,schema:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),timing:performance.getEntriesByType('navigation')[0]?.toJSON()}));
 let axe;
 if(phase!=='live-baseline') {
  await page.addScriptTag({content:await readFile(new URL('../../../audit-tools/node_modules/axe-core/axe.min.js',import.meta.url),'utf8')});
  axe=await page.evaluate(async()=>{const a=await window.axe.run();return {version:a.testEngine.version,violations:a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};});
 }
 results.push({...report,errors,axe}); await page.close();
}
await writeFile(`${out}/evidence.json`,JSON.stringify({url,phase,capturedAt:new Date().toISOString(),results},null,2));
await browser.close(); console.log(`${out}: captured four viewports and image/DOM evidence`);
