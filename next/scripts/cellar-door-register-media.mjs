import {readFile,writeFile} from 'node:fs/promises';
import {reviewedCellarPhoto} from '../src/lib/cellar-door-media.mjs';
const guide=JSON.parse(await readFile('src/data/cellar-door-shortlist.json','utf8'));
const registryPath='src/data/visit-victoria-page-images.json';
const ledgerPath='../ops/records/visit-victoria/placements.json';
const registry=JSON.parse(await readFile(registryPath,'utf8'));
const ledger=JSON.parse(await readFile(ledgerPath,'utf8'));
for(const p of guide.selections){
 const v=JSON.parse(await readFile(`src/content/venues/${p.photoVenue ?? p.slug}.json`,'utf8'));
 const image=reviewedCellarPhoto(v); if(!image) continue; const key=`best-cellar-doors-${p.slug}`;
 registry.images[key]={...image,page:'/wine/best-cellar-doors/',role:p.slug==='montalto'?'hero-and-selection':'selection',entity:`venues/${p.photoVenue ?? p.slug}`};
 if(!ledger.placements.some(x=>x.entity===`pages/${key}`&&x.src===image.src))ledger.placements.push({assetKey:image.src.match(/\/(vv-\d+)-/)[1],surface:'site',entity:`pages/${key}`,field:registry.images[key].role,src:image.src,page:'/wine/best-cellar-doors/',role:'page-image',recordedAt:'2026-10-14',status:'review-candidate'});
}
await writeFile(registryPath,JSON.stringify(registry,null,2)+'\n');
await writeFile(ledgerPath,JSON.stringify(ledger,null,1)+'\n');
console.log('Registered only the eight approved guide photos and their review placements.');
