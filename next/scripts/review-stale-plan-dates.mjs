import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10) === value;
}
/** Review-only: explicit full dates in reader copy, never inferred years or metadata. */
export function stalePlanDates(plan, asOf) {
  if (!validDate(asOf)) throw new Error('Supply a valid YYYY-MM-DD review date');
  const fields = [['dek',plan.dek],['editorNote',plan.editorNote],...(plan.stops??[]).map((s,i)=>[`stops[${i}].note`,s.note])];
  const flags=[];
  for (const [field,text] of fields) {
    if (typeof text !== 'string') continue;
    const found = [...text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(m=>m[0]);
    for (const m of text.matchAll(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi)) found.push(`${m[3]}-${String(months.indexOf(m[2].toLowerCase())+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    for (const date of [...new Set(found)].sort()) if (validDate(date) && date<asOf) flags.push({slug:plan.slug,field,date,reason:'Past explicit date in evergreen reader copy: editorial review required'});
  }
  return flags;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const asOf=process.argv[2];
  if (!validDate(asOf??'')) throw new Error('Usage: node scripts/review-stale-plan-dates.mjs YYYY-MM-DD');
  const dir=new URL('../src/content/itineraries/',import.meta.url);
  console.log(JSON.stringify({asOf,mode:'review-only; no content changes or schedule',flags:readdirSync(dir).filter(f=>f.endsWith('.json')).sort().flatMap(f=>stalePlanDates(JSON.parse(readFileSync(new URL(f,dir),'utf8')),asOf))},null,2));
}
