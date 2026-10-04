import test from 'node:test';import assert from 'node:assert/strict';
import {operationalHeartbeatHealthy as healthy} from './runtime/healthcheck.mjs';
const now=Date.parse('2026-10-04T10:00:00Z');
test('watchdog refuses stopped degraded future overdue and incomplete cycle states',()=>{
 const valid={checkedAt:new Date(now).toISOString(),status:'waiting',nextRunAt:new Date(now+900000).toISOString(),lastCycle:{state:'complete'}};
 assert.equal(healthy(valid,now),true);
 for(const status of ['degraded','failed','stopped'])assert.equal(healthy({...valid,status},now),false);
 assert.equal(healthy({...valid,checkedAt:new Date(now+120000).toISOString()},now),false);
 assert.equal(healthy({...valid,nextRunAt:new Date(now-360000).toISOString()},now),false);
 assert.equal(healthy({...valid,lastCycle:{state:'failed'}},now),false);
 assert.equal(healthy({...valid,status:'running',startedAt:new Date(now-26*60000).toISOString()},now),false);
});
