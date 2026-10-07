import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const script = fileURLToPath(new URL('./post-publish-verify.mjs', import.meta.url));
const source = 'https://www.mornpen.vic.gov.au/Things-to-do/Events/Whats-on/MORNINGTON-RACECOURSE-MARKET-1-1';

test('live event quality rejects missing imagery and thin copy, and checks release identity', async () => {
  let mode = 'good';
  let origin = '';
  const server = createServer((request, response) => {
    const url = request.url || '/';
    if (url === '/style.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end('body { color: black; }');
      return;
    }
    if (url === '/hero.png') {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(Buffer.alloc(12_000));
      return;
    }
    if (url === '/deployment.json') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ sourceSha: 'abc123' }));
      return;
    }
    if (url === '/sitemap.xml') {
      response.writeHead(200, { 'content-type': 'application/xml' });
      response.end('<urlset><url><loc>' + origin + '/market/</loc></url></urlset>');
      return;
    }
    if (url === '/market/') {
      const figure = mode === 'good'
        ? '<figure class="event-detail__image"><img src="/hero.png" alt="Conceptual market scene"><figcaption><p>AI-assisted artwork</p><p data-pi-media-disclosure="illustrative">Illustrative image</p></figcaption></figure>'
        : '';
      const prose = mode === 'good'
        ? Array(145).fill('practical').join(' ')
        : 'A short stub.';
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!doctype html><html><head>' +
        '<link rel="canonical" href="' + origin + '/market/">' +
        '<title>Mornington Racecourse Market | Peninsula Insider</title>' +
        '<meta name="description" content="A complete market guide with visitor details, current source and practical information.">' +
        '<meta property="og:title" content="Mornington Racecourse Market">' +
        '<meta property="og:description" content="A complete visitor guide">' +
        '<meta property="og:image" content="' + origin + '/hero.png">' +
        '<link rel="stylesheet" href="/style.css"></head>' +
        '<body data-page="event"><h1>Mornington Racecourse Market</h1>' +
        '<p>Next date; No booking required.</p>' + figure +
        '<div class="prose"><p>' + prose + '</p><p><a href="' + source +
        '">Check source</a></p></div></body></html>');
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const args = ['--kind=event', '--event-quality', '--expect-illustration',
    '--expect-sha=abc123', origin + '/market/'];
  try {
    const good = await run(process.execPath, [script, ...args]);
    assert.match(good.stdout, /PASS/);

    mode = 'bad';
    await assert.rejects(run(process.execPath, [script, ...args]), (error) => {
      assert.match(error.stdout, /event-editorial-image/);
      assert.match(error.stdout, /event-useful-copy/);
      return true;
    });

    mode = 'good';
    await assert.rejects(
      run(process.execPath, [script, ...args.slice(0, 3), '--expect-sha=wrong', args[4]]),
      (error) => {
        assert.match(error.stdout, /release-sha/);
        return true;
      }
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
