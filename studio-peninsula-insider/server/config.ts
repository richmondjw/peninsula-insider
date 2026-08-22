import { isAbsolute, relative, resolve } from 'node:path';
import { realUrlCaptureEnabled } from './capture/kernel.js';
import { resolveTeamWorkbenchConfig, TEAM_MODE_ENV_VAR, type TeamWorkbenchConfig } from './team-workbench.js';

export interface RuntimeConfig {
  dataFile: string;
  dataRoot: string;
  environment: string;
  host: '127.0.0.1' | '0.0.0.0';
  port: number;
  expectedHost: string;
  realUrlsEnabled: boolean;
  teamWorkbench: TeamWorkbenchConfig;
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
  const realUrlsEnabled = realUrlCaptureEnabled(environment);
  if (runtime === 'production') {
    throw new Error('The fixture-auth, file-store Workbench is disabled in production');
  }

  const host = environment.FOUNDRY_HOST ?? '127.0.0.1';
  if (host !== '127.0.0.1' && host !== '0.0.0.0') {
    throw new Error('FOUNDRY_HOST must be 127.0.0.1 or 0.0.0.0');
  }
  if (realUrlsEnabled && host !== '127.0.0.1') {
    throw new Error('Real URL capture requires native loopback FOUNDRY_HOST=127.0.0.1');
  }

  // Team mode is an authenticated-session boundary, not a public deployment
  // gate. It stays on loopback until a verified external session exists.
  const teamWorkbench = resolveTeamWorkbenchConfig(environment);
  if (teamWorkbench.teamModeEnabled && host !== '127.0.0.1') {
    throw new Error(`${TEAM_MODE_ENV_VAR}=enabled requires native loopback FOUNDRY_HOST=127.0.0.1`);
  }

  const port = Number(environment.FOUNDRY_PORT ?? 4310);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('FOUNDRY_PORT must be a valid TCP port');
  const expectedHost = environment.FOUNDRY_EXPECTED_HOST ?? `127.0.0.1:${port}`;
  let expectedHostUrl: URL;
  try { expectedHostUrl = new URL(`http://${expectedHost}`); } catch { throw new Error('FOUNDRY_EXPECTED_HOST must be a valid local host and port'); }
  if (!['127.0.0.1', 'localhost'].includes(expectedHostUrl.hostname) || expectedHostUrl.host !== expectedHost) {
    throw new Error('FOUNDRY_EXPECTED_HOST must be a valid local host and port');
  }

  return {
    dataFile,
    dataRoot,
    environment: runtime,
    host,
    port,
    expectedHost,
    realUrlsEnabled,
    teamWorkbench,
    staticDir: environment.FOUNDRY_STATIC_DIR ? resolve(environment.FOUNDRY_STATIC_DIR) : undefined,
  };
}
