import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { orientationFrame, orientationLandPath, projectOrientationPoint } from './home-orientation-map.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const land = JSON.parse(read('../data/home-orientation-land.json'));
const towns = ['mornington', 'red-hill', 'sorrento'].map(slug => JSON.parse(read(`../content/places/${slug}.json`)));
const component = read('../components/v5/home/HomeOrientation.astro');

function contains(ring, { lng, lat }) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('orientation coastline is closed, compact, licensed geographic data', () => {
  assert.equal(land.license, 'CC BY 4.0');
  assert.match(land.sourceUrl, /^https:\/\/services\.ga\.gov\.au\//);
  assert.ok(land.copyright.includes('Commonwealth of Australia'));
  assert.equal(land.rings.length, 3);
  assert.ok(land.rings.flat().length < 250);
  for (const ring of land.rings) {
    assert.deepEqual(ring[0], ring.at(-1));
    assert.ok(ring.every(p => p.length === 2 && p.every(Number.isFinite)));
    assert.match(orientationLandPath(ring), /^M[\d.-]+ [\d.-]+ L.* Z$/);
    assert.doesNotMatch(orientationLandPath(ring), /NaN|Infinity/);
  }
});

test('coastline and unchanged source town coordinates share one undistorted north-up projection', () => {
  const centre = { lat: (orientationFrame.north + orientationFrame.south) / 2, lng: (orientationFrame.east + orientationFrame.west) / 2 };
  const origin = projectOrientationPoint(centre);
  const east = projectOrientationPoint({ ...centre, lng: centre.lng + .01 / Math.cos(centre.lat * Math.PI / 180) });
  const north = projectOrientationPoint({ ...centre, lat: centre.lat + .01 });
  assert.ok(Math.abs((east.x - origin.x) - (origin.y - north.y)) < 1e-8, 'equivalent ground distances must use the same x/y scale');
  const [mornington, redHill, sorrento] = towns.map(town => projectOrientationPoint(town.coordinates));
  assert.ok(mornington.y < sorrento.y && sorrento.y < redHill.y);
  assert.ok(sorrento.x < mornington.x && mornington.x < redHill.x);
  for (const town of towns) {
    assert.ok(land.rings.some(ring => contains(ring, town.coordinates)), `${town.name} must be on land without moving its source coordinates`);
    const { x, y } = projectOrientationPoint(town.coordinates);
    assert.ok(x > 16 && x < orientationFrame.width - 16 && y > 16 && y < orientationFrame.height - 16);
  }
});

test('orientation retains accessible caption, area destinations and static low-detail map', () => {
  for (const slug of ['mornington', 'red-hill', 'sorrento']) assert.ok(component.includes(`/explore/places/${slug}/`));
  assert.ok(component.includes('href="/map/"'));
  assert.ok(component.indexOf('<figcaption>') > component.indexOf('</svg>'));
  assert.match(component, /aria-labelledby="home-town-map-title home-town-map-desc"/);
  assert.match(component, /min-height:44px/);
  assert.match(component, /a:focus-visible\{outline:3px/);
  assert.match(component, /font:600 18px var\(--font-ui\)/);
  assert.match(component, /clip-path="url\(#home-town-map-frame\)"/);
  assert.ok(component.includes(land.sourceUrl) && component.includes(land.licenseUrl));
  assert.doesNotMatch(component, /<script|<image|<filter|<pattern|<linearGradient|<radialGradient|https?:\/\/[^\s]+tiles/i);
});

test('navy labels and numerals meet AA contrast on water, land and coral', () => {
  const luminance = hex => hex.match(/\w\w/g).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
  for (const background of ['dceff0', 'fff4dc', 'f36b4f']) assert.ok((luminance(background) + .05) / (luminance('102d42') + .05) >= 4.5);
});
