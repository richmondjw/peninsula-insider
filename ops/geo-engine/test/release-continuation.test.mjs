import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('release continuation is admitted, one-shot, identified, bounded and release-only',()=>{
  execFileSync('python3',[new URL('./release_continuation_test.py',import.meta.url).pathname],{stdio:'pipe'});
});
