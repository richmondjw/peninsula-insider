// One-time OAuth bootstrap for Google Analytics Data API (GA4) access.
// Run once: `npm run auth` from ops/scripts/ga4/
// Saves a refresh token to ops/tokens/ga4-token.json for non-interactive future use.
//
// Mirrors ops/scripts/seo/auth.mjs deliberately — same loopback-redirect Desktop-app flow.
// If you change one, consider whether the other should match.

import fs from 'node:fs/promises';
import http from 'node:http';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
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
  if (!installed) {
    throw new Error(
      'client secret JSON is not an installed-app credential. Recreate the OAuth client as Desktop app, not Web application.',
    );
  }
  const { client_id, client_secret } = installed;

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
      console.log('\n--- Google Analytics 4 authorisation ---');
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

  const redirectUri = `http://localhost:${port}`;
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirectUri);
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh_token returned. Revoke prior consent at https://myaccount.google.com/permissions and re-run.',
    );
  }
  oauth2.setCredentials(tokens);
  await fs.writeFile(PATHS.token, JSON.stringify(tokens, null, 2), 'utf8');
  console.log('Saved token to', PATHS.token);

  // GA4 Admin API v1beta to list accessible properties for verification + capture.
  const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth2 });
  const accountSummaries = await admin.accountSummaries.list({ pageSize: 50 });
  const summaries = accountSummaries.data.accountSummaries || [];
  console.log('\nAccessible GA4 accounts and properties:');
  let pi = null;
  for (const acc of summaries) {
    console.log(`  Account: ${acc.displayName} (${acc.account})`);
    for (const p of acc.propertySummaries || []) {
      const tag = p.displayName.toLowerCase().includes('peninsula') ? '  [MATCH]' : '';
      console.log(`    - ${p.property} : ${p.displayName}${tag}`);
      if (!pi && p.displayName.toLowerCase().includes('peninsula')) {
        pi = { propertyId: p.property, displayName: p.displayName, parent: acc.account };
      }
    }
  }

  if (!pi) {
    console.log(
      '\nNo property name matches "peninsula". Pick the right one from the list above and enter its full ID (e.g. properties/123456789):',
    );
    const rl = readline.createInterface({ input, output });
    const propertyId = (await rl.question('Property ID: ')).trim();
    rl.close();
    if (!propertyId.startsWith('properties/')) {
      throw new Error(`Expected "properties/<numeric-id>", got: ${propertyId}`);
    }
    pi = { propertyId, displayName: '(manually entered)', parent: '(unknown)' };
  }

  await fs.writeFile(PATHS.property, JSON.stringify(pi, null, 2), 'utf8');
  console.log(`\nSaved property to ${PATHS.property}`);
  console.log(`Using ${pi.propertyId} (${pi.displayName})`);
  console.log('\nReady. Run `npm run pull` to fetch the first daily GA4 report.');
}

main().catch((err) => {
  console.error('\nAuth failed:', err.message);
  process.exit(1);
});
