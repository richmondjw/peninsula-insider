import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { originalArtProvenance } from '../../next/src/lib/original-art-provenance.mjs';
import { hasOriginalArtProvenance } from './lib/original-art-figure.mjs';

const run = promisify(execFile);
const script = fileURLToPath(new URL('./post-publish-verify.mjs', import.meta.url));
const marketRoute = '/whats-on/mornington-racecourse-market/';
const originalImage = JSON.parse(readFileSync(new URL('../../next/src/content/events/mornington-racecourse-market.json', import.meta.url), 'utf8')).heroImage;
const fingerprint = originalArtProvenance(originalImage);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
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
    if (url.split('?')[0] === originalImage.src) {
      response.writeHead(200, { 'content-type': 'image/webp' });
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
      response.end('<urlset><url><loc>' + origin + marketRoute + '</loc></url></urlset>');
      return;
    }
    if (url === marketRoute) {
      const evidence = mode === 'missing-provenance' ? '' : ' data-pi-original-art="' + (mode === 'wrong-provenance' ? 'sha256:' + '0'.repeat(64) : fingerprint) + '"';
      const imageSrc = mode === 'wrong-image' ? '/images/generated/unreviewed.webp' : originalImage.src + (mode === 'cache-stamped' ? '?v=a1b2c3d4' : '');
      const alt = mode === 'wrong-alt' ? 'A photograph of the market' : originalImage.alt;
      const figure = mode === 'bad' ? '' : mode === 'caption-only'
        ? '<figure class="event-detail__image"><img src="' + originalImage.src + '" alt="' + escape(originalImage.alt) + '"><figcaption><p>Illustration · Peninsula Insider</p><p data-pi-media-disclosure="illustrative">Illustrative image</p></figcaption></figure>'
        : '<figure class="event-detail__image"' + evidence + '><img src="' + imageSrc + '" alt="' + escape(alt) + '"><figcaption></figcaption></figure>';
      const prose = mode !== 'bad'
        ? Array(145).fill('practical').join(' ')
        : 'A short stub.';
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!doctype html><html><head>' +
        '<link rel="canonical" href="' + origin + marketRoute + '">' +
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
    '--expect-source-host=www.mornpen.vic.gov.au', '--expect-sha=abc123', origin + marketRoute];
  try {
    const good = await run(process.execPath, [script, ...args]);
    assert.match(good.stdout, /PASS/);

    mode = 'cache-stamped';
    assert.match((await run(process.execPath, [script, ...args])).stdout, /PASS/);

    for (const invalid of ['missing-provenance', 'wrong-provenance', 'wrong-image', 'wrong-alt', 'caption-only']) {
      mode = invalid;
      await assert.rejects(run(process.execPath, [script, ...args]), (error) => {
        assert.match(error.stdout, /event-original-art-provenance/);
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


test('original-art evidence requires the complete reviewed rights record, not path or credit alone', () => {
  assert.match(fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(originalArtProvenance({ src: originalImage.src, credit: originalImage.credit }), null);
  for (const field of ['src', 'alt', 'credit', 'license', 'depicts', 'depictionStatus', 'creator', 'permission', 'permittedUses', 'rightsHolder', 'rightsEstablishedOn', 'rightsStatus', 'provenanceReview', 'decorative']) {
    const incomplete = { ...originalImage };
    delete incomplete[field];
    assert.equal(originalArtProvenance(incomplete), null, `missing ${field}`);
  }
  for (const change of [
    { src: '/images/sourced/market.webp' }, { src: 'https://example.com/images/generated/market.webp' },
    { alt: 'Photograph of Mornington Racecourse Market' }, { depictionStatus: 'actual' },
    { credit: 'Peninsula Insider' }, { credit: 'Illustration: Someone else' },
    { creator: 'Different creator' }, { rightsHolder: 'Different rights holder' },
    { rightsStatus: 'unknown' }, { provenanceReview: 'pending' },
    { license: 'cc-by' }, { licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { permission: 'Credit supplied, rights not established' }, { permittedUses: ['social'] },
    { rightsEstablishedOn: '2026-02-30' }, { decorative: true },
  ]) assert.equal(originalArtProvenance({ ...originalImage, ...change }), null, JSON.stringify(change));
  assert.notEqual(originalArtProvenance({ ...originalImage, permission: originalImage.permission + ' Updated record.' }), fingerprint,
    'a changed permission record invalidates the old fingerprint');
});

test('original-art fingerprint is bound to its hero, alt and reviewed local source', () => {
  const pageUrl = 'https://peninsulainsider.com.au/whats-on/mornington-racecourse-market/';
  const valid = `<figure class="event-detail__image" data-pi-original-art="${fingerprint}"><img src="${originalImage.src}" alt="${escape(originalImage.alt)}"><figcaption></figcaption></figure>`;
  const accepts = html => hasOriginalArtProvenance(html, originalImage, pageUrl);
  assert.equal(accepts(valid), true);
  assert.equal(accepts(valid.replace(originalImage.src, originalImage.src + '?v=a1b2c3d4')), true);
  assert.equal(accepts(valid.replace(originalImage.src, 'https://peninsulainsider.com.au' + originalImage.src)), true);
  for (const wrong of [
    valid.replace(` data-pi-original-art="${fingerprint}"`, ''),
    valid.replace(fingerprint, 'sha256:' + '0'.repeat(64)),
    valid.replace(originalImage.src, '/images/generated/different.webp'),
    valid.replace(originalImage.src, 'https://example.com' + originalImage.src),
    valid.replace(originalImage.src, originalImage.src + '?other=a1b2c3d4'),
    valid.replace(originalImage.src, originalImage.src + '?v=not-a-build-hash'),
    valid.replace(originalImage.src, originalImage.src + '?v=a1b2c3d4&amp;other=1'),
    valid.replace(originalImage.src, originalImage.src + '?v=a1b2c3d4&amp;v=00112233'),
    valid.replace(originalImage.src, originalImage.src + '#different'),
    valid.replace(originalImage.alt, ''),
    valid.replace('<img ', '<img srcset="/images/generated/different.webp 1280w" '),
    valid.replace('<img ', `<img data-pi-image-original-src="${originalImage.src}" `),
    valid.replace('<img ', '<source srcset="/images/generated/different.webp"><img '),
    valid.replace('<img ', '<img src="/other.webp"><img '),
    valid.replace('<figure ', `<figure data-pi-original-art="${fingerprint}" `),
    valid.replace(` data-pi-original-art="${fingerprint}"`, '').replace('<figcaption>', `<figcaption data-pi-original-art="${fingerprint}">`),
    valid.replace('<img ', '<!-- <img src="/ignored.webp"> --><img ').replace(` data-pi-original-art="${fingerprint}"`, ''),
  ]) assert.equal(accepts(wrong), false, wrong);
  assert.equal(hasOriginalArtProvenance(valid, null, pageUrl), false, 'source record is required');
  assert.equal(hasOriginalArtProvenance(valid, { ...originalImage, rightsStatus: 'unknown' }, pageUrl), false);
  assert.equal(hasOriginalArtProvenance(valid, { ...originalImage, permission: originalImage.permission + ' Revised.' }, pageUrl), false);
  const quoted = { ...originalImage, alt: 'Conceptual illustration of a maker\'s "fruit & flowers" stall' };
  const quotedFigure = valid.replace(fingerprint, originalArtProvenance(quoted)).replace(escape(originalImage.alt), escape(quoted.alt));
  assert.equal(hasOriginalArtProvenance(quotedFigure, quoted, pageUrl), true);
});
