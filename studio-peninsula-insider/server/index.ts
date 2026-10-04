import { createApp } from './app.js';
import { loadRuntimeConfig } from './config.js';
import { FileFoundryStore } from './store.js';

const config = loadRuntimeConfig();
const store = new FileFoundryStore(config.dataFile, config.dataRoot);

createApp(store, { staticDir: config.staticDir }).listen(config.port, config.host, () => {
  const displayHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host;
  console.log(`Peninsula Insider Workbench listening on http://${displayHost}:${config.port}`);
});
