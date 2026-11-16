import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('editorial handoff is idempotent, detected-only and preserves rejections',()=>{
  execFileSync('python3',[fileURLToPath(new URL('./research_handoff_test.py',import.meta.url))]);
});
