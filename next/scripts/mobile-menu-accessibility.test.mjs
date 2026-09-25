import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const masthead = readFileSync(new URL('../src/components/v5/chrome/V5Masthead.astro', import.meta.url), 'utf8');
const editorialShell = readFileSync(new URL('../src/styles/editorial-shell.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('mobile menu exposes fixed control names and expandable sections without making desktop navigation a dialog', () => {
  assert.match(masthead, /<nav aria-label="Main navigation" class="site-nav" id="site-nav">/);
  assert.doesNotMatch(masthead, /<nav[^>]*aria-modal=/);
  assert.match(masthead, /<button[^>]*class="mobile-menu-close"[^>]*aria-label="Close navigation"[^>]*>\s*Close\s*<\/button>/);
  assert.match(masthead, /aria-controls=\{`v5-panel-\$\{p\.key\}`\}/);
  assert.doesNotMatch(masthead, /toggle\.setAttribute\('aria-label'/);
  assert.doesNotMatch(masthead, /button\.setAttribute\('aria-label'/);
});

test('open mobile navigation locks scrolling, contains outside focus, closes on outside taps, and resets above the breakpoint', () => {
  assert.match(masthead, /const mobileMedia=window\.matchMedia\('\(max-width: 1100px\)'\)/);
  assert.match(masthead, /const previousOverflow=document\.body\.style\.overflow/);
  assert.match(masthead, /document\.body\.style\.overflow='hidden'/);
  assert.match(masthead, /document\.body\.style\.overflow=previousOverflow/);
  assert.match(masthead, /if\(!nav\.contains\(document\.activeElement\)\)\{e\.preventDefault\(\);\(e\.shiftKey\?last:first\)\.focus\(\);return;\}/);
  assert.match(masthead, /if\(button\.getAttribute\('aria-expanded'\)==='true'&&!nav\.contains\(e\.target as Node\)&&!button\.contains\(e\.target as Node\)\)\{close\(\);button\.focus\(\);\}/);
  assert.match(masthead, /const onMediaChange=\(e:MediaQueryListEvent\)=>\{if\(!e\.matches&&button\.getAttribute\('aria-expanded'\)==='true'\)close\(\);\}/);
  assert.match(masthead, /mobileMedia\.addEventListener\('change',onMediaChange\)/);
  assert.match(masthead, /mobileMedia\.removeEventListener\('change',onMediaChange\)/);
});

test('mobile focus trap includes only visible enabled controls and skips closed panel descendants', () => {
  assert.match(masthead, /const focusable=\(\)=>\[\.\.\.nav\.querySelectorAll<HTMLElement>\('a\[href\], button:not\(\[disabled\]\), summary'\)\]\.filter\(el=>/);
  assert.match(masthead, /!el\.closest\('\[hidden\], \[aria-hidden="true"\]'\)/);
  assert.match(masthead, /el\.getClientRects\(\)\.length>0/);
  assert.match(masthead, /function trapFocus\(e:KeyboardEvent\)/);
  assert.match(masthead, /if\(e\.shiftKey&&document\.activeElement===first\)/);
  assert.match(masthead, /else if\(!e\.shiftKey&&document\.activeElement===last\)/);
});

test('dialog semantics are applied only while the mobile menu is open', () => {
  assert.match(masthead, /function close\(\)\{[\s\S]*nav\.removeAttribute\('role'\);[\s\S]*nav\.removeAttribute\('aria-modal'\);/);
  assert.match(masthead, /function open\(\)\{[\s\S]*nav\.setAttribute\('role','dialog'\);[\s\S]*nav\.setAttribute\('aria-modal','true'\);/);
  assert.match(masthead, /if\(e\.key==='Tab' && button\.getAttribute\('aria-expanded'\)==='true'\)\{trapFocus\(e\);return;\}/);
  assert.match(masthead, /focusable\(\)\[0\]\?\.focus\(\)/);
  assert.match(masthead, /button\.focus\(\);/);
});

test('mobile menu controls and links meet the 44px touch-target contract with visible focus', () => {
  assert.match(masthead, /\.mobile-menu-close\{[^}]*min-height:44px[^}]*min-width:44px/);
  assert.match(masthead, /\.site-nav \.pillar-menu__trigger>a\{[^}]*min-height:44px/);
  assert.match(masthead, /\.mobile-menu-close:focus-visible,[\s\S]*\.mobile-menu:focus-visible\{[\s\S]*outline:3px solid/);
  assert.match(editorialShell, /\.pi-shell \.mobile-menu\{width:44px;height:44px\}/);
});

test('desktop navigation does not render the mobile close control', () => {
  assert.match(masthead, /\.mobile-menu-close\{display:none\}/);
  assert.match(masthead, /@media\(max-width:1100px\)\{[\s\S]*\.mobile-menu-close\{display:flex/);
});

test('discovery journeys run the mobile-menu browser coverage in CI', () => {
  assert.match(packageJson.scripts['test:discovery-journeys'], /tests\/journeys\/mobile-menu-accessibility\.test\.mjs/);
});
