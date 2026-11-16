import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keep the generated-page assertion identical on Windows and POSIX shells.
const result = spawnSync(process.execPath, [
  '--test', fileURLToPath(new URL('./campaigns-review-page.test.mjs', import.meta.url)),
], {
  env: { ...process.env, CAMPAIGNS_GENERATED: '1' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
