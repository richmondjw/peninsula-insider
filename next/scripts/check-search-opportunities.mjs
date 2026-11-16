import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const dist = path.resolve('dist');
const routes = ['/eat/best-restaurants/', '/explore/places/rosebud/', '/journal/dog-friendly-wineries-mornington-peninsula/', '/journal/dog-friendly-cafes-pubs-wineries-mornington-peninsula/'];
const htmlNamespace = 'http://www.w3.org/1999/xhtml';
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const nodes = root => [root, ...(root.childNodes ?? []).flatMap(nodes)];
const copy = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(copy).join('');
const resolvePage = route => path.join(dist, route.replace(/^\//, ''), 'index.html');
for (const route of routes) {
  const doc = nodes(parse(fs.readFileSync(resolvePage(route), 'utf8')));
  assert.equal(doc.filter(n => n.tagName === 'h1').length, 1, `${route}: one H1`);
  // SVG map titles must not be concatenated into the document title.
  assert.equal(doc.filter(n => n.tagName === 'title' && n.namespaceURI === htmlNamespace).length, 1, `${route}: one document title`);
  assert.ok(doc.some(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical' && attr(n, 'href') === `https://peninsulainsider.com.au${route}`), `${route}: canonical`);
  const main = doc.find(n => n.tagName === 'main');
  assert.ok(main, `${route}: main`);
  const visible = copy(main);
  const ids = new Set(doc.map(n => attr(n, 'id')).filter(Boolean));
  for (const anchor of nodes(main).filter(n => n.tagName === 'a')) {
    const href = attr(anchor, 'href');
    if (!href || !href.startsWith('/') && !href.startsWith('#')) continue;
    const url = new URL(href, `https://peninsulainsider.com.au${route}`);
    const destination = resolvePage(url.pathname);
    assert.ok(fs.existsSync(destination), `${route}: destination ${href}`);
    if (url.hash) {
      const targetIds = url.pathname === route ? ids : new Set(nodes(parse(fs.readFileSync(destination, 'utf8'))).map(n => attr(n, 'id')));
      assert.ok(targetIds.has(decodeURIComponent(url.hash.slice(1))), `${route}: fragment ${href}`);
    }
  }
  for (const script of doc.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')) {
    const schema = JSON.parse(copy(script));
    if (schema['@type'] === 'FAQPage') for (const faq of schema.mainEntity) {
      assert.ok(visible.includes(faq.name), `${route}: FAQ question visible`);
      assert.ok(visible.includes(faq.acceptedAnswer.text), `${route}: FAQ answer visible`);
    }
    if (schema['@type'] === 'ItemList') for (const item of schema.itemListElement) {
      const url = new URL(item.url);
      const page = nodes(parse(fs.readFileSync(resolvePage(url.pathname), 'utf8')));
      assert.ok(page.some(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical' && attr(n, 'href') === item.url), `ItemList destination is canonical: ${item.url}`);
    }
  }
  // Empty alt text can intentionally mark decorative images. Absence cannot.
  for (const image of nodes(main).filter(n => n.tagName === 'img')) assert.notEqual(attr(image, 'alt'), undefined, `${route}: image has an alt attribute`);
  console.log(`PASS ${route}: semantic HTML, canonical, links, FAQ parity and image attributes`);
}
