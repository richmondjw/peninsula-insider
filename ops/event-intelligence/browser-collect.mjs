import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {hash,safeUrl} from './data.mjs';
import {atomicJson} from './collect.mjs';
const require=createRequire(new URL('../../next/package.json',import.meta.url));
export async function collectLibraryPages({directory,executablePath,maxPages=10,launch}={}){
 const url='https://library.mornpen.vic.gov.au/Whats-On/Events',host=new URL(url).hostname;
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>20)throw new Error('Browser page budget must be 1–20');
 await mkdir(directory,{recursive:true});const browser=await (launch??require('puppeteer').launch)({headless:true,...(executablePath?{executablePath}:{})});const pages=[],seen=new Set();let complete=false,reason=null;
 try{const page=await browser.newPage();let response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  for(let index=1;index<=maxPages;index++){
   safeUrl(page.url(),[host]);if(response?.status()!==200){reason='HTTP '+response?.status();break;}
   const body=await page.content();if(/cf-chl-|verify you are human|access denied/i.test(body)){reason='access-review-required';break;}
   const fingerprint=hash(body);if(seen.has(fingerprint)){reason='repeated-page';break;}seen.add(fingerprint);
   const controls=await page.$$eval('input[type="submit"][value="Next"]',nodes=>nodes.map(node=>({name:node.name,disabled:node.disabled})));
   if(controls.length!==1){reason='pagination-layout-changed';break;}
   const evidence={id:hash('libraries-rendered:'+fingerprint),sourceId:'libraries',url:page.url(),retrievedAt:new Date().toISOString(),hash:fingerprint,contentType:'text/html-rendered',body,authority:'official',lineage:'libraries',page:index,retrievalMethod:'normal-public-form-pagination'};
   await atomicJson(directory+'/page-'+index+'.json',{evidence,reviewRequired:true,publicationApproved:false});pages.push({page:index,evidenceId:evidence.id,url:evidence.url});
   if(controls[0].disabled){complete=true;break;}if(index===maxPages){reason='page-budget-reached';break;}
   const nextName=controls[0].name;if(!nextName||!/^[A-Za-z0-9$_]+$/.test(nextName)){reason='unexpected-pagination-control';break;}
   [response]=await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),page.evaluate(()=>document.querySelector('input[type="submit"][value="Next"]').click())]);
  }
 }catch(error){reason=error.message;}finally{await browser.close();}
 const receipt={sourceId:'libraries',retrievedAt:new Date().toISOString(),complete,reason,pages,publicationApproved:false};await atomicJson(directory+'/receipt.json',receipt);return receipt;
}
if(process.argv[1]?.endsWith('browser-collect.mjs')){const result=await collectLibraryPages({directory:process.argv[2]??'ops/reports/events/intelligence/library-pages',executablePath:process.env.PI_BROWSER_EXECUTABLE,maxPages:Number(process.argv[3]??10)});console.log(JSON.stringify(result,null,2));if(!result.complete)process.exitCode=1;}
