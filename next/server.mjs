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

const originalCreateServer = http.createServer;
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
      if (!req.headers['x-forwarded-proto']) {
        req.headers['x-forwarded-proto'] = 'https';
      }
      return originalHandler.call(this, req, res);
    };
  }
  return originalCreateServer.apply(this, args);
};

await import('./dist/server/entry.mjs');
