import { createApp } from './app.js';
import { loadRuntimeConfig } from './config.js';
import { FileFoundryStore } from './store.js';

const config = loadRuntimeConfig();
const store = new FileFoundryStore(config.dataFile, config.dataRoot);

createApp(store).listen(config.port, '127.0.0.1', () => {
  console.log(`Peninsula Insider Workbench API listening on http://127.0.0.1:${config.port}`);
});
