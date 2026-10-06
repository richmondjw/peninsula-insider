import {runEditorialService} from './editorial-service.mjs';
const [configPath,configHash,expectedRoot]=process.argv.slice(2);
runEditorialService({enabled:true,configPath,configHash,expectedRoot}).then(receipt=>console.log(JSON.stringify({state:receipt.state,runId:receipt.runId??null}))).catch(error=>{console.error(error.message);process.exitCode=1;});
