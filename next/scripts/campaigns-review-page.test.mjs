import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const authoredPage = resolve(root, 'public/campaigns/index.html');
const generatedPage = resolve(root, 'dist/campaigns/index.html');
const pagePath = process.env.CAMPAIGNS_PAGE
  ? resolve(process.env.CAMPAIGNS_PAGE)
  : process.env.CAMPAIGNS_GENERATED === '1'
    ? generatedPage
    : authoredPage;
const pageUrl = pathToFileURL(pagePath);
const safeUrl = /^(?:#|data:|blob:|(?:\.?\.?\/)?[^:/?#][^:?#]*(?:[/?#]|$))/i;
const remoteUrl = /(?:https?:\/\/|wss?:\/\/|\/\/)[^\s"'<>]+/i;

function attributes(html) {
  return [...html.matchAll(/<(?:a|area|base|embed|form|iframe|img|input|link|object|script|source|track|video)\b[^>]*>/gi)]
    .flatMap(([tag]) => [...tag.matchAll(/\b(href|src|action|poster|data)\s*=\s*(["'])(.*?)\2/gi)]
      .map(([, name,, value]) => ({ name: name.toLowerCase(), value, tag })));
}

function removeInertProvenance(html) {
  return html
    .replace(/<details\b[^>]*\bclass=(['"])source-context\1[^>]*>[\s\S]*?<\/details>/gi, '')
    .replace(/<script\b[^>]*\bid=(['"])campaign-data\1[^>]*>[\s\S]*?<\/script>/gi, '');
}

function executableScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs]) => !/\btype\s*=\s*(["'])application\/json\1/i.test(attrs))
    .map(([, , code]) => code)
    .join('\n');
}

test('campaigns review page is a standalone noindex review surface', async () => {
  const html = await readFile(fileURLToPath(pageUrl), 'utf8');

  assert.match(html, /<meta\s+name="robots"\s+content="noindex,nofollow">/i);
  assert.match(html, /<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*default-src 'none';[^"]*connect-src 'none';/i);
  assert.match(html, /Review only/i);
  assert.doesNotMatch(html, /password protection|password-protected|enter password/i);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
  assert.doesNotMatch(executableScripts(html), /\bfetch\s*\(|\bnew\s+XMLHttpRequest\b|\bnew\s+WebSocket\b/i);
});

test('campaigns review page cannot navigate to or load external resources', async () => {
  const html = await readFile(fileURLToPath(pageUrl), 'utf8');
  const unsafeAttributes = attributes(html).filter(({ value }) => !safeUrl.test(value));

  assert.deepEqual(unsafeAttributes, [], 'all navigation and resource attributes must be local, fragment, data, or blob URLs');
  assert.doesNotMatch(html, /\btarget\s*=\s*(["'])_blank\1/i);
  assert.doesNotMatch(executableScripts(html), /\b(?:location|window\.open)\s*(?:\.href\s*=|\()/i);
  assert.doesNotMatch(executableScripts(html), /\.href\s*=\s*d\.url\b/i);

  // URLs are permitted only as visibly inert provenance in the source drawer or
  // as inert source records in the non-executing campaign-data JSON script.
  assert.doesNotMatch(removeInertProvenance(html), remoteUrl);
});

test('generated campaigns review page exists when generated validation is requested', async () => {
  if (process.env.CAMPAIGNS_GENERATED === '1') {
    await access(generatedPage);
  }
});
