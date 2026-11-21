import {commit} from './adapter.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {schema,prepared,crash}=JSON.parse(input);
try{const result=await commit(schema,prepared,{hook:async phase=>{if(phase===crash)process.exit(75);}});console.log(JSON.stringify(result));}
catch(error){console.error(error.message);process.exitCode=1;}
