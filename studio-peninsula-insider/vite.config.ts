import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: '.public-build',
  server: {
    port: 4311,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4310',
        changeOrigin: true,
        // The browser request is same-origin with Vite. Present the trusted
        // loopback proxy origin to the API's second same-origin check.
        headers: { Origin: 'http://127.0.0.1:4310' },
      },
    },
  },
});
