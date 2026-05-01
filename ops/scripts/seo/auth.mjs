// One-time OAuth bootstrap for Google Search Console API access.
// Run once: `npm run auth` from ops/scripts/seo/
// Saves a refresh token to ops/tokens/gsc-token.json for non-interactive future use.

import fs from 'node:fs/promises';
import http from 'node:http';
import { URL } from 'node:url';
import { exec } from 'node:child_process';
import { google } from 'googleapis';
import { PATHS, SCOPES } from './config.mjs';

const openInBrowser = (url) => {
  const platform = process.platform;
  const cmd = platform === 'win32'
    ? `start "" "${url}"`
    : platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log('(could not auto-open browser; copy the URL above manually)');
  });
};

async function main() {
  const raw = await fs.readFile(PATHS.clientSecret, 'utf8');
  const { installed } = JSON.parse(raw);
  if (!installed) throw new Error('client secret JSON is not an installed-app credential');
  const { client_id, client_secret } = installed;

  // Spin up a local server to catch the OAuth redirect
  let listeningPort = 0;
  const { code, port } = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${listeningPort}`);
      const codeParam = reqUrl.searchParams.get('code');
      const errorParam = reqUrl.searchParams.get('error');
      if (errorParam) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>OAuth error: ${errorParam}</h1><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${errorParam}`));
        return;
      }
      if (!codeParam) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>No code in callback</h1>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorised. You can close this tab and return to the terminal.</h1>');
      const capturedPort = listeningPort;
      server.close();
      resolve({ code: codeParam, port: capturedPort });
    });
    server.listen(0, '127.0.0.1', () => {
      listeningPort = server.address().port;
      const redirectUri = `http://localhost:${listeningPort}`;
      const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirectUri);
      const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
      });
      console.log('\n--- Google Search Console authorisation ---');
      console.log('Opening browser. If it does not open, copy this URL:\n');
      console.log(authUrl);
      console.log('\nWaiting for redirect to http://localhost:' + listeningPort + ' ...\n');
      openInBrowser(authUrl);
    });
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout after 15 minutes'));
    }, 15 * 60 * 1000);
  });

  // Exchange the code for tokens
  const redirectUri = `http://localhost:${port}`;
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirectUri);
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh_token returned. Revoke prior consent at https://myaccount.google.com/permissions and re-run.');
  }
  oauth2.setCredentials(tokens);
  await fs.writeFile(PATHS.token, JSON.stringify(tokens, null, 2), 'utf8');
  console.log('Saved token to', PATHS.token);

  // Verify by listing sites
  const webmasters = google.webmasters({ version: 'v3', auth: oauth2 });
  const sites = await webmasters.sites.list();
  const list = sites.data.siteEntry || [];
  console.log('\nAccessible Search Console properties:');
  for (const s of list) {
    console.log(`  - ${s.siteUrl} [${s.permissionLevel}]`);
  }
  const piMatch = list.find((s) =>
    s.siteUrl.includes('peninsulainsider.com.au'),
  );
  if (!piMatch) {
    console.log('\nWARNING: peninsulainsider.com.au not found in this account.');
    console.log('You may have authorised the wrong Google account. Token saved anyway.');
  } else {
    await fs.writeFile(
      PATHS.property,
      JSON.stringify({ siteUrl: piMatch.siteUrl, permissionLevel: piMatch.permissionLevel }, null, 2),
      'utf8',
    );
    console.log(`\nUsing property: ${piMatch.siteUrl}`);
    console.log('Saved property to', PATHS.property);
    console.log('\nReady. Run `npm run pull` to fetch the first daily report.');
  }
}

main().catch((err) => {
  console.error('\nAuth failed:', err.message);
  process.exit(1);
});
