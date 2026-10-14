const {default:lighthouse}=await import(new URL('../../../audit-tools/node_modules/lighthouse/core/index.js',import.meta.url));
const {default:desktopConfig}=await import(new URL('../../../audit-tools/node_modules/lighthouse/core/config/desktop-config.js',import.meta.url));
const {launch}=await import(new URL('../../../audit-tools/node_modules/chrome-launcher/dist/index.js',import.meta.url));
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.CELLAR_URL||'http://127.0.0.1:4334/wine/best-cellar-doors/';
const phase=process.argv[2]||'candidate';
const out=`../reports/cellar-doors/${phase}-lab`;
await mkdir(out,{recursive:true});
const chrome=await launch({chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless=new']});
const runs=[];
try{
 for(const formFactor of ['mobile','desktop'])for(let repeat=1;repeat<=3;repeat++){
  const result=await lighthouse(url,{port:chrome.port,output:['html','json'],logLevel:'error',onlyCategories:['performance','accessibility','seo']},formFactor==='desktop'?desktopConfig:undefined);
  const l=result.lhr;
  await writeFile(`${out}/${formFactor}-${repeat}.html`,result.report[0]);
  await writeFile(`${out}/${formFactor}-${repeat}.json`,result.report[1]);
  runs.push({formFactor,repeat,version:l.lighthouseVersion,settings:l.configSettings,performance:l.categories.performance.score,accessibility:l.categories.accessibility.score,seo:l.categories.seo.score,lcp:l.audits['largest-contentful-paint'].numericValue,cls:l.audits['cumulative-layout-shift'].numericValue,tbt:l.audits['total-blocking-time'].numericValue,bytes:l.audits['total-byte-weight'].numericValue,runtimeError:l.runtimeError});
  console.log(`${formFactor} ${repeat}: performance ${l.categories.performance.score}, LCP ${runs.at(-1).lcp}`);
 }
 await writeFile(`${out}/summary.json`,JSON.stringify({url,phase,runs,limitation:'Local production-build lab measurements. Deployment/network and field CWV not verified. No field INP measured.'},null,2));
}finally{await chrome.kill();}
