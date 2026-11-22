import {connect} from './adapter.mjs';
import {invoke,asArgs} from './rpc-backend.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {schema,prepared,phase}=JSON.parse(input),c=await connect();
try{await c.query('BEGIN');await invoke(schema,'concierge_snapshot_commit',asArgs(prepared),c);if(phase==='before-commit')process.exit(75);await c.query('COMMIT');if(phase==='after-commit')process.exit(75);}
catch(error){console.error(error.message);process.exitCode=1;}
finally{await c.end();}
