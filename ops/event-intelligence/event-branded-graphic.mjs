import {createHash} from 'node:crypto';
import sharp from '../../next/node_modules/sharp/lib/index.js';
import {editorialDecisionCurrent} from './editorial-policy.mjs';

const clean = value => {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new Error('Unsupported graphic text');
  return value.normalize('NFC').trim();
};
const xml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
async function measuredTextWidth(value,{size,weight='400'}={}) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="8192" height="140" font-family="Sora,Arial,sans-serif"><text x="0" y="100" font-size="${size}" font-weight="${weight}" fill="white">${xml(value)}</text></svg>`;
  const {info}=await sharp(Buffer.from(svg),{limitInputPixels:8192*140}).trim().toBuffer({resolveWithObject:true});
  return info.width;
}
function titleLines(title) {
  const lines=[''];
  for (const word of title.split(/\s+/u)) {
    if (word.length > 35) throw new Error('Graphic title cannot fit safely');
    const index=lines.length-1, next=lines[index] ? lines[index]+' '+word : word;
    if (next.length <= 35) lines[index]=next;
    else if (lines.length < 3) lines.push(word);
    else throw new Error('Graphic title cannot fit safely');
  }
  return lines;
}

/** Original PI text graphic from current verified listing facts; no event photograph. */
export async function renderEventBrandedGraphic({listing,decision,evidence=[],editorialOptions={},now=new Date()}={}) {
  const checkedAt=new Date(+now);
  if (!Number.isFinite(+checkedAt)) throw new Error('Valid graphic review clock required');
  if (listing?.kind!=='event') throw new Error('Event listing required for event graphic');
  if (!editorialDecisionCurrent(decision,listing,evidence,{...editorialOptions,now:checkedAt})) throw new Error('Current editorial listing decision required');
  const listingRevision=decision.revision;
  const title=clean(listing.fields?.title), venue=clean(listing.fields?.venueName);
  if (!title || !venue || title.length>90 || venue.length>60) throw new Error('Bounded verified graphic facts required');
  const start=listing.fields?.startDate, instant=new Date(start);
  if (typeof start!=='string' || !Number.isFinite(+instant)) throw new Error('Verified event date required');
  const date=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',day:'numeric',month:'long',year:'numeric'}).format(instant);
  const lines=titleLines(title);
  for (const line of lines) if (await measuredTextWidth(line,{size:59,weight:'700'})>1012) throw new Error('Graphic title cannot fit safely');
  if (await measuredTextWidth(`${date} · ${venue}`,{size:27})>1012) throw new Error('Graphic venue cannot fit safely');
  const text=lines.map((line,index)=>`<text x="94" y="${270+index*76}" font-size="59" font-weight="700" fill="#F2EFEA">${xml(line)}</text>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Sora,Arial,sans-serif"><rect width="1200" height="630" fill="#0B2E4A"/><rect x="0" y="0" width="18" height="630" fill="#F5C177"/><text x="94" y="100" font-size="34" font-weight="700" fill="#F2EFEA">Peninsula <tspan fill="#F5C177">Insider</tspan></text><text x="94" y="170" font-size="25" fill="#F5C177">EVENT LISTING</text>${text}<line x1="94" y1="526" x2="1106" y2="526" stroke="#F5C177" stroke-width="2"/><text x="94" y="573" font-size="27" fill="#F2EFEA">${xml(date)} · ${xml(venue)}</text></svg>`;
  const bytes=await sharp(Buffer.from(svg),{limitInputPixels:1200*630}).png().toBuffer();
  return {bytes,assetHash:createHash('sha256').update(bytes).digest('hex'),mediaType:'image/png',width:1200,height:630,subject:'original-factual-graphic',title,venue,date,listingRevision,checkedAt:checkedAt.toISOString(),reusePermission:'not-assessed',publicationAuthorityGranted:false};
}
