/** Pure event projection shared by the writer and offline integration audit.
 * No source edits, database calls, embedding calls or inferred booking availability.
 */
import { createHash } from 'node:crypto';
import { readdir,readFile } from 'node:fs/promises';
import {join,basename} from 'node:path';
import { selectEventPromotions, hasPromotionGeography } from '../../next/src/lib/event-discovery.mjs';
import { isPublicEventRecord } from '../../next/src/lib/event-publication.mjs';
import { recordDisposition } from '../../next/src/lib/event-occurrence.mjs';

import {validateEventSource} from '../lib/concierge-event-source.mjs';
export {validateEventSource} from '../lib/concierge-event-source.mjs';

/** Match the collection's recursive JSON glob; unreadable/malformed input fails. */
export async function readEventSources(dir) {
  const records=[];
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const path=join(dir,entry.name);
    if(entry.isDirectory())records.push(...await readEventSources(path));
    else if(entry.isFile()&&entry.name.endsWith('.json'))records.push({slug:basename(entry.name,'.json'),data:JSON.parse(await readFile(path,'utf8'))});
  }
  return records;
}

export function chunkEvent(data, slug, now = new Date()) {
  now = new Date(now);
  if (!Number.isFinite(+now)) throw new Error('Invalid event projection clock');
  validateEventSource(data,slug);
  const excluded = reason => ({chunks: [], excluded: reason});
  // Astro's events collection defaults an omitted legacy status to published.
  // Apply that same default on a copy; explicit lifecycle/CMS decisions win.
  if (data && data.status === undefined) data = {...data,status:'published'};
  if (!data || data.status !== 'published') return excluded('not-published');
  if (!isPublicEventRecord(data, now)) return excluded('publication-not-approved');
  if (!recordDisposition(data, now).promotable) return excluded('not-promotable');
  if (!hasPromotionGeography(data, now)) return excluded('geography-not-approved');
  // This is an explicitly bounded next-occurrence projection, not a claim that
  // every day of a series is available. The same rule/exception resolver as the
  // public site decides whether the occurrence is still running or upcoming.
  const match = selectEventPromotions([{id:slug,data}], {now,windowDays:366})[0];
  if (!match) return excluded('no-approved-occurrence-within-366-days');
  const ev = match.event.data;
  const value = ev.place?.id ?? ev.place ?? ev.suburb;
  const region = String(value).trim().toLowerCase().replace(/[.']/g,'').replace(/\s+/g,'-');
  const base = {
    source_entity_type:'event', source_entity_id:`event_${slug.replace(/-/g,'_')}`,
    page_slug:slug, page_title:ev.title, editorial_tier:'A', category:ev.category || 'event',
    region, vendor_relationship:'none', freshness_flag:'fresh', event_date:match.day,
  };
  const date = `Next verified occurrence: ${match.day} (Australia/Melbourne). This does not verify ticket availability.`;
  const chunks = [{...base,chunk_id:`${slug}::summary::0`,section_heading:'Overview',chunk_purpose:'event_summary',
    text:`${ev.title}. ${ev.summary ?? ''} ${date} Locality: ${region}. Category: ${base.category}.`}];
  for (const [field,suffix,purpose,heading,min] of [['editorNote','editor_note','event_editor_note',"Editor's note",60],['editorVerdict','verdict','event_verdict',"Editor's verdict",30]]) {
    if (typeof ev[field]==='string' && ev[field].length>min) chunks.push({...base,chunk_id:`${slug}::${suffix}::0`,section_heading:heading,chunk_purpose:purpose,text:`${ev.title}. ${date} ${ev[field]}`});
  }
  return {chunks,excluded:null,occurrence:match.day};
}

export function projectEventInventory(records, now) {
  const ids = new Set(), chunks = [], outcomes = [];
  for (const {slug,data} of records) {
    if (ids.has(slug)) throw new Error(`Duplicate event source: ${slug}`);
    ids.add(slug);
    const revision = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    try {
      const result = chunkEvent(data,slug,now);
      chunks.push(...result.chunks);
      outcomes.push({slug,revision,status:result.excluded?'excluded':'projected',reason:result.excluded,occurrence:result.occurrence ?? null,chunkIds:result.chunks.map(c=>c.chunk_id)});
    } catch (error) {
      outcomes.push({slug,revision,status:'failed',reason:error.message,chunkIds:[]});
    }
  }
  return {chunks,outcomes,complete:outcomes.every(r=>r.status!=='failed')};
}
