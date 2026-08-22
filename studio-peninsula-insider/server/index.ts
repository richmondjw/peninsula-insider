import { resolve } from 'node:path';
import { createApp } from './app.js';
import { createCaptureRuntime } from './capture/kernel.js';
import { FileCaptureRepository } from './capture/repository.js';
import { loadRuntimeConfig } from './config.js';
import { RealUrlCoordinator } from './real-url-coordinator.js';
import { FileFoundryStore } from './store.js';

const config = loadRuntimeConfig();
let coordinator: RealUrlCoordinator | undefined;
let captureRuntime: ReturnType<typeof createCaptureRuntime> | undefined;
const captureRoot = resolve(config.dataRoot, 'real-url-capture');
if (config.realUrlsEnabled) {
  captureRuntime = createCaptureRuntime(captureRoot);
}
const immutableCaptureResolver = captureRuntime?.repository ?? new FileCaptureRepository(captureRoot);
const store = new FileFoundryStore(config.dataFile, config.dataRoot, immutableCaptureResolver);
if (captureRuntime) {
  coordinator = new RealUrlCoordinator(store, captureRuntime.kernel, captureRuntime.repository);
  await coordinator.reconcile();
}

createApp(store, {
  staticDir: config.staticDir,
  realUrlsEnabled: config.realUrlsEnabled,
  coordinator,
  expectedHost: config.expectedHost,
  // No server-owned verifier exists yet, so requesting team mode here fails
  // closed at startup rather than serving unauthenticated mutations.
  teamWorkbench: config.teamWorkbench,
}).listen(config.port, config.host, () => {
  const displayHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host;
  console.log(`Peninsula Insider Workbench listening on http://${displayHost}:${config.port}`);
});
