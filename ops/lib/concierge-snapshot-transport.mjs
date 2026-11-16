/** Production-facing RPC boundary. No credentials, endpoint or implicit activation.
 * The deployed backend must implement this versioned contract atomically.
 */
import {readPrepared,prepareSnapshot,commitPrepared} from './concierge-snapshot.mjs';
export const SNAPSHOT_PROTOCOL='concierge-snapshot-v1';
function one(rows,empty=false) {
  if(!Array.isArray(rows)||rows.length>(empty?1:1)||(!empty&&rows.length!==1))throw Error('snapshot-rpc-shape');
  return rows[0]??null;
}
export async function connectSnapshotWriter(rpc) {
  if(typeof rpc!=='function')throw Error('snapshot-rpc-required');
  const capability=one(await rpc('concierge_snapshot_capabilities',{}));
  if(capability.protocol!==SNAPSHOT_PROTOCOL||capability.atomicCommit!==true||capability.retainedRollback!==true)throw Error('snapshot-backend-incompatible');
  const read=async(token=null)=>{
    const snapshot=one(await rpc('concierge_snapshot_read',{snapshot_token:token}),true);
    if(snapshot){readPrepared(snapshot);if(token!==null&&snapshot.token!==token)throw Error('snapshot-read-token');}
    return snapshot;
  };
  return {
    read:()=>read(),readSnapshot:read,
    commit:async prepared=>{
      readPrepared(prepared);
      const result=one(await rpc('concierge_snapshot_commit',{
        expected_token:prepared.expectedToken, snapshot_token:prepared.token, snapshot_payload:prepared.payload,
        operation:prepared.operation??'forward',runtime_bundle:prepared.runtimeBundle??null,
      }));
      if(result.committed!==true||result.token!==prepared.token||typeof result.retry!=='boolean')throw Error('snapshot-commit-ack');
      return {committed:true,retry:result.retry};
    },
  };
}

/** All canonical source/CMS admission and complete inventory evidence must be
 * supplied before preparation. Never falls back to legacy REST upserts/deletes.
 * A failed embedding or invalid source cannot invoke the commit RPC.
 */
export async function refreshConciergeSnapshot({rpc,manifest,records,embed,dimensions}) {
  const storage=await connectSnapshotWriter(rpc);
  const previous=await storage.read();
  const prepared=await prepareSnapshot(previous,manifest,records,{embed,dimensions});
  return {token:prepared.token,...await commitPrepared(storage,prepared)};
}
