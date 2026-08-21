import { isAbsolute, relative, resolve } from 'node:path';

export interface RuntimeConfig {
  dataFile: string;
  dataRoot: string;
  environment: string;
  port: number;
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

  return {
    dataFile,
    dataRoot,
    environment: runtime,
    port: Number(environment.FOUNDRY_PORT ?? 4310),
  };
}
