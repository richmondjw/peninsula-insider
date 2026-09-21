import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('bounded release worker refuses analysis, chunks reports and prevents duplicate sends',()=>{
  execFileSync('python3',[new URL('./release_worker_test.py',import.meta.url).pathname],{stdio:'pipe'});
});
