import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createCaptureKernel } from './capture/kernel.js';
import { loadRuntimeConfig } from './config.js';
import { FileIntakeLedger } from './intake/ledger.js';
import { UrlIntakeService } from './intake/service.js';
import { FileFoundryStore } from './store.js';

const config = loadRuntimeConfig();
const store = new FileFoundryStore(config.dataFile, config.dataRoot);
const intake = new UrlIntakeService({
  enabled: config.realUrlsEnabled,
  kernel: createCaptureKernel(config.dataRoot),
  ledger: new FileIntakeLedger(resolve(config.dataRoot, 'intake.json'), config.dataRoot),
  store,
});

createApp(store, { staticDir: config.staticDir, intake }).listen(config.port, config.host, () => {
  const displayHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host;
  console.log(`Peninsula Insider Workbench listening on http://${displayHost}:${config.port}`);
  console.log(`Real URL capture: ${config.realUrlsEnabled ? 'ENABLED (local loopback only)' : 'disabled'}`);
});
