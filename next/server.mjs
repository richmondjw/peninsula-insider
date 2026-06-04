// Custom Railway entrypoint for Keystatic CMS.
//
// Railway terminates TLS at the edge and forwards plain HTTP to the
// container. Astro 6 only honors X-Forwarded-Proto when security.allowedDomains
// is configured AND the proxy actually sends the header. Railway's behaviour
// here is inconsistent, so we monkey-patch http.createServer to inject
// X-Forwarded-Proto: https on every incoming request before Astro's adapter
// processes it. Without this, request.url.origin comes back as http:// and
// Keystatic's GitHub OAuth redirect_uri mismatches the registered callback.

import http from 'node:http';

console.log('[server.mjs] wrapper booting — patching http.createServer');

const originalCreateServer = http.createServer;
let patchedListenerInstalled = false;

http.createServer = function patchedCreateServer(...args) {
  let handlerIdx = -1;
  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === 'function') {
      handlerIdx = i;
      break;
    }
  }
  if (handlerIdx >= 0) {
    const originalHandler = args[handlerIdx];
    args[handlerIdx] = function wrappedHandler(req, res) {
      const before = req.headers['x-forwarded-proto'];
      req.headers['x-forwarded-proto'] = 'https';
      req.headers['x-forwarded-host'] = req.headers.host;
      // security.allowedDomains isn't being honored at runtime, so the
      // forwarded headers aren't trusted. Force Astro down its "encrypted
      // socket" fallback path instead — that path defaults to https without
      // needing allowedDomains.
      if (req.socket && !req.socket.encrypted) {
        try {
          Object.defineProperty(req.socket, 'encrypted', {
            value: true,
            configurable: true,
            writable: true,
          });
        } catch {}
      }
      if (!patchedListenerInstalled) {
        console.log('[server.mjs] first request — xfp before:', before, 'host:', req.headers.host, 'encrypted now:', req.socket?.encrypted, 'url:', req.url);
        patchedListenerInstalled = true;
      }
      return originalHandler.call(this, req, res);
    };
    console.log('[server.mjs] wrapped createServer listener');
  } else {
    console.log('[server.mjs] createServer called with no listener arg — passing through');
  }
  return originalCreateServer.apply(this, args);
};

await import('./dist/server/entry.mjs');
console.log('[server.mjs] entry.mjs imported');
