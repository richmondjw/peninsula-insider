import {htmlEscape,safeUrl} from './data.mjs';
export function gradeAsset(asset,{eventId,edition,channel='web',now=new Date()}={}) {
 const errors=[];if(asset.eventId!==eventId || asset.edition!==edition)errors.push('wrong-event-or-edition');
 if(asset.depiction==='actual' && asset.confirmedSubject!==true)errors.push('unconfirmed-subject');
 if(asset.ocrWarnings?.length)errors.push('embedded-text-needs-review');
 if(!asset.licence?.evidenceUrl || !asset.licence?.channels?.includes(channel))errors.push('permission-missing');
 if(asset.licence?.verifiedBy!=='James'||asset.licence?.verified!==true||String(asset.licence?.permissionText??'').trim().length<10)errors.push('permission-unverified');
 if(asset.licence?.expiresAt&&(!Number.isFinite(new Date(asset.licence.expiresAt).getTime())||new Date(asset.licence.expiresAt)<=now))errors.push('permission-expired');
 if(asset.licence?.attributionRequired&&!asset.credit)errors.push('attribution-missing');
 try{safeUrl(asset.sourceUrl);safeUrl(asset.licence?.evidenceUrl);}catch{errors.push('unsafe-source-or-permission-url');}
 const relevance=errors.some(e=>/event|edition|subject|text/.test(e))?0:100;
 const quality=asset.width>=1200&&asset.height>=630&&asset.cropReviewed===true?100:asset.width>=600&&asset.height>=315&&asset.cropReviewed===true?75:0;
 const rights=errors.some(e=>/permission|attribution|unsafe/.test(e))?0:100;
 return {relevance,quality,rights,errors,ready:relevance>=90&&quality>=70&&rights===100};
}
export function fallbackSvg(candidate) {
 const title=String(candidate.fields.title??'Peninsula Insider').slice(0,72);
 const kind=({event:'Event',experience:'Experience',offer:'Offer'})[candidate.kind]??'Listing';
 const meta=[candidate.fields.startDate?.slice(0,10),candidate.fields.suburb].filter(Boolean).join(' · ');
 // Original deterministic PI graphic, never a fabricated photograph or organiser logo.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="${htmlEscape(title)}"><rect width="1200" height="800" fill="#F2EFEA"/><rect x="0" y="0" width="24" height="800" fill="#173C50"/><text x="80" y="100" font-family="sans-serif" font-size="26" fill="#173C50">PENINSULA INSIDER · ${kind.toUpperCase()}</text><foreignObject x="80" y="220" width="1040" height="340"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:64px;line-height:1.2;color:#14202A;overflow-wrap:anywhere">${htmlEscape(title)}</div></foreignObject><text x="80" y="690" font-family="sans-serif" font-size="30" fill="#4B5862">${htmlEscape(meta)}</text><text x="80" y="750" font-family="sans-serif" font-size="18" fill="#4B5862">PI graphic · verified listing details</text></svg>`;
}
