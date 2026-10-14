import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {reviewedCellarPhoto} from '../src/lib/cellar-door-media.mjs';
const guide=JSON.parse(await readFile('src/data/cellar-door-shortlist.json','utf8'));
const layers=[],manifest=[];
let index=0;
for(const p of guide.selections){
 const v=JSON.parse(await readFile(`src/content/venues/${p.photoVenue ?? p.slug}.json`,'utf8'));
 const image=reviewedCellarPhoto(v); if(!image) continue; const bytes=await readFile('public'+image.src);
 const thumbnail=await sharp(bytes).resize(600,400,{fit:'cover'}).png().toBuffer();
 const x=index%2*600,y=Math.floor(index/2)*450;
 layers.push({input:thumbnail,left:x,top:y});
 layers.push({input:Buffer.from(`<svg width="600" height="50"><rect width="600" height="50" fill="white"/><text x="12" y="32" font-family="sans-serif" font-size="22" fill="#0b2e4a">${v.name.replaceAll('&','&amp;')}</text></svg>`),left:x,top:y+400});
 manifest.push({slug:p.slug,...image,assetBytes:bytes.length,dimensions:((m)=>({width:m.width,height:m.height,format:m.format}))(await sharp(bytes).metadata())}); index++;
}
await mkdir('../reports/cellar-doors',{recursive:true});
await sharp({create:{width:1200,height:Math.ceil(index/2)*450,channels:3,background:'white'}}).composite(layers).png().toFile('../reports/cellar-doors/photo-review.png');
await writeFile('../reports/cellar-doors/media-manifest.json',JSON.stringify(manifest,null,2));
console.log('Media contact sheet and full provenance manifest saved.');
