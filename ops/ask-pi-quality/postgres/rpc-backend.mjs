/** Synthetic CI adapter for the exact proposed SQL functions, not a REST server. */
import {readFile} from 'node:fs/promises';
import {identifier,query,connect} from './adapter.mjs';
export async function install(schema) {
 identifier(schema);
 const sql=await readFile(new URL('../../backend/concierge-snapshot.sql',import.meta.url),'utf8');
 await query(sql.replaceAll('__SCHEMA__',schema));
}
export async function invoke(schema,name,args={},client) {
 const s=identifier(schema);let sql,values;
 if(name==='concierge_snapshot_capabilities'){sql=`SELECT * FROM ${s}.concierge_snapshot_capabilities()`;values=[];}
 else if(name==='concierge_snapshot_read'){sql=`SELECT * FROM ${s}.concierge_snapshot_read($1)`;values=[args.snapshot_token??null];}
 else if(name==='concierge_snapshot_commit'){sql=`SELECT * FROM ${s}.concierge_snapshot_commit($1,$2,$3,$4,$5::jsonb)`;values=[args.expected_token??null,args.snapshot_token,args.snapshot_payload,args.operation??'forward',args.runtime_bundle??null];}
 else throw Error('unsupported synthetic RPC');
 const result=client?await client.query(sql,values):await query(sql,values);
 return JSON.parse(JSON.stringify(result.rows));
}
export const asArgs=prepared=>({expected_token:prepared.expectedToken??null,snapshot_token:prepared.token,snapshot_payload:prepared.payload,operation:prepared.operation??'forward',runtime_bundle:prepared.runtimeBundle??null});
