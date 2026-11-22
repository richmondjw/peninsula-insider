import { isAbsolute, relative, resolve } from 'node:path';
import { realUrlCaptureEnabled } from './capture/kernel.js';

export interface RuntimeConfig {
  dataFile: string;
  dataRoot: string;
  environment: string;
  host: '127.0.0.1' | '0.0.0.0';
  port: number;
  realUrlsEnabled: boolean;
  staticDir?: string;
}

export function loadRuntimeConfig(environment = process.env): RuntimeConfig {
  const dataRoot = resolve(environment.FOUNDRY_DATA_ROOT ?? '.foundry-data');
  const dataFile = resolve(environment.FOUNDRY_DATA_FILE ?? resolve(dataRoot, 'runs.json'));
  const candidate = relative(dataRoot, dataFile);

  if (candidate.startsWith('..') || isAbsolute(candidate)) {
    throw new Error('FOUNDRY_DATA_FILE must remain inside FOUNDRY_DATA_ROOT');
  }

  const runtime = environment.NODE_ENV ?? 'development';
  if (runtime === 'production') {
    throw new Error('The fixture-auth, file-store Workbench is disabled in production');
  }

  const host = environment.FOUNDRY_HOST ?? '127.0.0.1';
  if (host !== '127.0.0.1' && host !== '0.0.0.0') {
    throw new Error('FOUNDRY_HOST must be 127.0.0.1 or 0.0.0.0');
  }

  // Real URL capture defaults off, and even when it is switched on locally it may never be
  // combined with a listener that is reachable from the team network.
  const realUrlsEnabled = realUrlCaptureEnabled(environment);
  if (realUrlsEnabled && host !== '127.0.0.1') {
    throw new Error('FOUNDRY_REAL_URLS_ENABLED=1 is allowed only with the loopback listener FOUNDRY_HOST=127.0.0.1');
  }

  return {
    dataFile,
    dataRoot,
    environment: runtime,
    host,
    port: Number(environment.FOUNDRY_PORT ?? 4310),
    realUrlsEnabled,
    staticDir: environment.FOUNDRY_STATIC_DIR ? resolve(environment.FOUNDRY_STATIC_DIR) : undefined,
  };
}
