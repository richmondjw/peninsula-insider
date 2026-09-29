import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { Site } from './harness.mjs';

const canRunBrowser = existsSync(puppeteer.executablePath());
if (process.env.CI) assert.ok(canRunBrowser, 'CI must execute Chromium journeys; a skip is not release evidence');
const site = canRunBrowser ? await Site.open() : null;
test.after(() => site?.close());

const visibleControlSelector = '#site-nav a[href], #site-nav button:not([disabled]), #site-nav summary';
const focusVisibleControl = (reader, index) => reader.page.evaluate((selector, requestedIndex) => {
  const controls = [...document.querySelectorAll(selector)]
    .filter((el) => !el.closest('[hidden], [aria-hidden="true"]') && el.getClientRects().length > 0);
  controls.at(requestedIndex)?.focus();
}, visibleControlSelector, index);
const activeControlIs = (reader, index) => reader.page.evaluate((selector, requestedIndex) => {
  const controls = [...document.querySelectorAll(selector)]
    .filter((el) => !el.closest('[hidden], [aria-hidden="true"]') && el.getClientRects().length > 0);
  return document.activeElement === controls.at(requestedIndex);
}, visibleControlSelector, index);

test('mobile navigation traps Tab and Shift+Tab among visible controls when panels are closed', { skip: !canRunBrowser }, async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({ width: 390, height: 844 });
    await reader.load('/');
    assert.equal(await reader.page.$eval('#site-nav', (nav) => nav.getAttribute('role')), null);
    assert.equal(await reader.page.$eval('#site-nav', (nav) => nav.getAttribute('aria-modal')), null);

    await reader.page.click('.mobile-menu');
    await reader.waitFor(() => document.querySelector('#site-nav')?.classList.contains('open'), 'mobile navigation did not open');
    await reader.waitFor(() => document.activeElement?.classList.contains('mobile-menu-close'), 'mobile navigation did not move focus to Close');
    assert.equal(await reader.page.$eval('body', (body) => body.style.overflow), 'hidden');
    assert.deepEqual(await reader.page.$eval('#site-nav', (nav) => ({
      role: nav.getAttribute('role'),
      modal: nav.getAttribute('aria-modal'),
      focus: document.activeElement?.className,
    })), { role: 'dialog', modal: 'true', focus: 'mobile-menu-close' });

    const closedPanelState = await reader.page.evaluate((selector) => ({
      hiddenPanels: document.querySelectorAll('#site-nav [data-v5-mega][hidden]').length,
      visible: [...document.querySelectorAll(selector)]
        .filter((el) => !el.closest('[hidden], [aria-hidden="true"]') && el.getClientRects().length > 0)
        .map((el) => ({ text: el.textContent?.trim(), inHiddenPanel: Boolean(el.closest('[hidden]')) })),
    }), visibleControlSelector);
    assert.ok(closedPanelState.hiddenPanels > 0);
    assert.ok(closedPanelState.visible.length > 1);
    assert.ok(closedPanelState.visible.every((control) => !control.inHiddenPanel));

    await focusVisibleControl(reader, -1);
    await reader.page.keyboard.press('Tab');
    assert.equal(await activeControlIs(reader, 0), true);

    await focusVisibleControl(reader, 0);
    await reader.page.keyboard.down('Shift');
    await reader.page.keyboard.press('Tab');
    await reader.page.keyboard.up('Shift');
    assert.equal(await activeControlIs(reader, -1), true);

    await reader.page.keyboard.press('Escape');
    await reader.waitFor(() => !document.querySelector('#site-nav')?.classList.contains('open'), 'Escape did not close mobile navigation');
    assert.equal(await reader.page.$eval('body', (body) => body.style.overflow), '');
    assert.equal(await reader.page.evaluate(() => document.activeElement?.classList.contains('mobile-menu')), true);
  } finally { await reader.close(); }
});

test('desktop navigation remains non-modal and its expandable controls remain available', { skip: !canRunBrowser }, async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({ width: 1280, height: 900 });
    await reader.load('/');
    assert.deepEqual(await reader.page.$eval('#site-nav', (nav) => ({
      role: nav.getAttribute('role'),
      modal: nav.getAttribute('aria-modal'),
    })), { role: null, modal: null });
    assert.deepEqual(await reader.page.$eval('.mobile-menu-close', (control, selector) => ({
      display: getComputedStyle(control).display,
      focusable: [...document.querySelectorAll(selector)]
        .filter((el) => !el.closest('[hidden], [aria-hidden="true"]') && el.getClientRects().length > 0)
        .includes(control),
    }), visibleControlSelector), { display: 'none', focusable: false });
    await reader.page.click('[data-pillar-toggle]');
    assert.deepEqual(await reader.page.$eval('[data-pillar-menu]', (menu) => ({
      expanded: menu.querySelector('[data-pillar-toggle]').getAttribute('aria-expanded'),
      hidden: menu.querySelector('[data-v5-mega]').hidden,
    })), { expanded: 'true', hidden: false });
  } finally { await reader.close(); }
});


test('expanded mobile menus scroll independently and restore page scrolling on close and resize', { skip: !canRunBrowser }, async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({ width: 390, height: 667 });
    await reader.load('/');
    await reader.page.click('.mobile-menu');
    await reader.page.click('[data-pillar-toggle]');
    const before = await reader.page.evaluate(() => ({ y: scrollY, rootOverflow: document.documentElement.style.overflow }));
    assert.equal(before.rootOverflow, 'hidden');
    await reader.page.mouse.move(250, 500);
    await reader.page.mouse.wheel({ deltaY: 600 });
    await reader.waitFor(() => document.querySelector('#site-nav').scrollTop > 0, 'expanded menu did not scroll');
    assert.equal(await reader.page.evaluate(() => scrollY), before.y, 'background page scrolled');
    const lastLink = await reader.page.$('#site-nav .mobile-note');
    await lastLink.focus();
    assert.equal(await lastLink.evaluate(el => { const r=el.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight; }), true);
    // Escape first closes the expanded section, then the mobile dialog.
    await reader.page.keyboard.press('Escape');
    await reader.page.keyboard.press('Escape');
    assert.equal(await reader.page.evaluate(() => document.documentElement.style.overflow), '');
    assert.equal(await reader.page.$eval('.mobile-menu', el => el.getAttribute('aria-expanded')), 'false');
    await reader.page.click('.mobile-menu');
    await reader.page.setViewport({ width: 1280, height: 900 });
    await reader.waitFor(() => !document.querySelector('#site-nav').classList.contains('open'), 'resize did not close menu');
    assert.equal(await reader.page.evaluate(() => document.documentElement.style.overflow), '');
    assert.equal(await reader.page.$eval('#site-nav', el => el.hasAttribute('aria-modal')), false);
  } finally { await reader.close(); }
});


test('mobile navigation hands focus to search without competing dialogs', { skip: !canRunBrowser }, async () => {
  const reader = await site.reader();
  try {
    await reader.page.setViewport({ width: 390, height: 844 });
    await reader.load('/');
    for (const trigger of ['link', 'shortcut']) {
      await reader.page.click('.mobile-menu');
      await reader.waitFor(() => document.activeElement?.classList.contains('mobile-menu-close'), 'menu focus missing');
      if (trigger === 'link') await reader.page.click('#site-nav [data-open-search]');
      else await reader.page.keyboard.press('/');
      await reader.waitFor(() => document.activeElement?.id === 'siteSearchOverlayInput', 'search did not receive focus');
      assert.equal(await reader.page.$eval('#site-nav', el => el.classList.contains('open')), false);
      await reader.page.keyboard.press('Tab');
      assert.equal(await reader.page.evaluate(() => document.querySelector('#siteSearchOverlay').contains(document.activeElement)), true);
      await reader.page.keyboard.press('Escape');
      await reader.waitFor(() => document.querySelector('#siteSearchOverlay').dataset.open !== 'true', 'search did not close');
      assert.equal(await reader.page.evaluate(() => document.activeElement?.classList.contains('mobile-menu')), true);
      assert.equal(await reader.page.evaluate(() => document.documentElement.style.overflow), '');
    }
  } finally { await reader.close(); }
});
