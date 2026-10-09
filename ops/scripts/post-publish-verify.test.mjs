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
      const credit = mode === 'missing-credit' ? 'Peninsula Insider' : mode === 'legacy-credit' ? 'AI-assisted artwork' : 'Illustration · Peninsula Insider';
      const disclosure = mode === 'missing-disclosure' ? '' : ' data-pi-media-disclosure="illustrative"';
      const figure = mode !== 'bad'
        ? '<figure class="event-detail__image"><img src="/hero.png" alt="Conceptual market scene"><figcaption><p>' + credit + '</p><p' + disclosure + '>Illustrative image</p></figcaption></figure>'
        : '';
      const prose = mode !== 'bad'
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
        '">Check the latest details at the source</a></p></div></body></html>');
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  const args = ['--kind=event', '--event-quality', '--expect-illustration',
    '--expect-source-host=www.mornpen.vic.gov.au', '--expect-sha=abc123', origin + '/market/'];
  try {
    const good = await run(process.execPath, [script, ...args]);
    assert.match(good.stdout, /PASS/);

    for (const invalid of ['missing-credit', 'missing-disclosure', 'legacy-credit']) {
      mode = invalid;
      await assert.rejects(run(process.execPath, [script, ...args]), (error) => {
        assert.match(error.stdout, /event-illustration-disclosure/);
        return true;
      });
    }

    mode = 'bad';
    await assert.rejects(run(process.execPath, [script, ...args]), (error) => {
      assert.match(error.stdout, /event-editorial-image/);
      assert.match(error.stdout, /event-useful-copy/);
      return true;
    });

    mode = 'good';
    await assert.rejects(
      run(process.execPath, [script, ...args.slice(0, 4), '--expect-sha=wrong', args[5]]),
      (error) => {
        assert.match(error.stdout, /release-sha/);
        return true;
      }
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('article verification accepts illustration and photo credits and rejects missing attribution', async () => {
  let origin = '';
  let credit = 'Illustration: Peninsula Insider';
  const server = createServer((request, response) => {
    if (request.url === '/style.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end('body { color: black; }');
      return;
    }
    if (request.url !== '/article/') {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><html><head>' +
      '<link rel="canonical" href="' + origin + '/article/">' +
      '<title>A Peninsula morning | Peninsula Insider</title>' +
      '<meta name="description" content="An editorial guide to making the most of a morning on the Mornington Peninsula.">' +
      '<meta property="og:title" content="A Peninsula morning">' +
      '<meta property="og:description" content="A morning guide">' +
      '<meta property="og:image" content="' + origin + '/hero.webp">' +
      '<link rel="stylesheet" href="/style.css"></head>' +
      '<body data-page="article"><figure><img src="/hero.webp" alt="A conceptual Peninsula morning">' +
      '<figcaption>' + credit + '</figcaption></figure><p>Last verified today</p>' +
      '<a href="/eat/">Eat</a><a href="/stay/">Stay</a><a href="/explore/">Explore</a></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  try {
    for (const kind of ['article', 'dispatch']) {
      for (const value of ['Illustration: Peninsula Insider', 'Illustration · Peninsula Insider', 'Photograph by jem', 'Photo · Creator, courtesy of Visit Victoria']) {
        credit = value;
        const good = await run(process.execPath, [script, '--kind=' + kind, origin + '/article/']);
        assert.match(good.stdout, /PASS/);
      }
      credit = '';
      await assert.rejects(run(process.execPath, [script, '--kind=' + kind, origin + '/article/']), error => {
        assert.match(error.stdout, /hero-credit-visible/);
        return true;
      });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
