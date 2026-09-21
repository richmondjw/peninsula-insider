import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('bounded gateway orchestration passes five Python lifecycle checks',()=>{
  execFileSync('python3',[fileURLToPath(new URL('./gateway_step_test.py',import.meta.url))],{stdio:'pipe',timeout:10000});
});
