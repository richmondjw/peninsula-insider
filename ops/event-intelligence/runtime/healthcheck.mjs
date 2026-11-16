import {readFile} from 'node:fs/promises';
export function operationalHeartbeatHealthy(report,now=Date.now()) {
 const checked=Date.parse(report?.checkedAt??report?.updatedAt);
 if(!Number.isFinite(checked)||checked>now+60000||now-checked>30*60000)return false;
 if(!['waiting','running'].includes(report.status))return false;
 if(report.status==='waiting') {
  const next=Date.parse(report.nextRunAt);
  return report.lastCycle?.state==='complete'&&Number.isFinite(next)&&next>=now-5*60000;
 }
 const started=Date.parse(report.startedAt??report.checkedAt);
 return Number.isFinite(started)&&now-started<25*60000;
}
if(process.argv[1]?.endsWith('healthcheck.mjs')) {
 try { const report=JSON.parse(await readFile((process.argv[2]??'/data')+'/runner-health.json','utf8'));
  if(!operationalHeartbeatHealthy(report))throw Error('Missing, overdue or degraded event heartbeat');
  console.log('Operational heartbeat current');
 }catch(error) {console.error(error.message);process.exitCode=1;}
}
