import test from 'node:test';
import assert from 'node:assert/strict';
import { Site, DIST } from './harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
const editorFiles = fs.readdirSync(path.join(DIST, '_astro')).filter(name => name.endsWith('.js') && fs.readFileSync(path.join(DIST, '_astro', name),'utf8').includes('delegation installed at module load'));
assert.equal(editorFiles.length, 1, 'editor remains a separate lazy chunk');
const site = await Site.open();
test.after(() => site.close());

test('anonymous reading never loads editing tools, including soft navigation', async () => {
  const reader = await site.reader();
  try {
    await reader.load('/eat/');
    await reader.navigate('/journal/');
    assert.equal(await reader.page.evaluate(() => !!document.__piEditDelegationInstalled), false);
    assert.equal(await reader.page.$('.pi-edit-toggle'), null);
    assert.equal(await reader.page.$('.pi-admin-tools'), null);
    const scripts = await reader.page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.name.endsWith('.js')).map(r => r.name));
    assert.equal(scripts.some(url => editorFiles.some(name => url.endsWith('/' + name))), false);
  } finally { await reader.close(); }
});

test('an authenticated editor gets editing tools after load and navigation', async () => {
  const reader = await site.reader({signedIn:true, supabase:[{match:'admin_user_allowlist',body:{role:'editor',can_publish:false}}]});
  try {
    await reader.load('/eat/');
    await reader.waitFor(() => !!document.querySelector('.pi-edit-toggle'), 'editor toggle');
    assert.equal(await reader.page.evaluate(() => !!document.__piEditDelegationInstalled), true);
    await reader.navigate('/journal/');
    await reader.waitFor(() => document.querySelectorAll('.pi-edit-toggle').length === 1, 'remounted editor toggle');
    assert.equal(await reader.page.evaluate(() => window.__J.pageErrors.length), 0);
  } finally { await reader.close(); }
});

test('a signed-in reader outside the editor allowlist gets no editing controls', async () => {
  const reader = await site.reader({signedIn:true});
  try {
    await reader.load('/eat/');
    assert.equal(await reader.page.$('.pi-edit-toggle'), null);
    assert.equal(await reader.page.$('.pi-admin-tools'), null);
  } finally { await reader.close(); }
});

test('editing activates after same-page auth change and disappears on sign-out', async () => {
 const reader = await site.reader({supabase:[{match:'admin_user_allowlist',body:{role:'editor',can_publish:false}}]});
 try {
 await reader.load('/eat/');
 await reader.page.evaluate(() => {
 const value=JSON.stringify({access_token:'harness-token',refresh_token:'harness-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'harness-user-a',aud:'authenticated',role:'authenticated'}});
 localStorage.setItem('pi.auth',value);
 const channel=new BroadcastChannel('pi.auth');channel.postMessage({event:'SIGNED_IN',session:JSON.parse(value)});channel.close();
 });
 await reader.waitFor(() => !!document.querySelector('.pi-edit-toggle'), 'same-page editor activation');
 await reader.page.evaluate(() => { const value=localStorage.getItem('pi.auth');localStorage.removeItem('pi.auth');const channel=new BroadcastChannel('pi.auth');channel.postMessage({event:'SIGNED_OUT',session:null});channel.close(); });
 await reader.waitFor(() => !document.querySelector('.pi-edit-toggle'), 'signed-out editor removal');
 assert.equal(await reader.page.$('.pi-admin-tools'), null);
 } finally { await reader.close(); }
});

for (const width of [1280, 390]) {
  test(`admin tools are discreet, operable and dismissible at ${width}px`, async () => {
    const reader = await site.reader({signedIn:true, supabase:[{match:'admin_user_allowlist',body:{role:'editor',can_publish:false}}]});
    try {
      await reader.page.setViewport({width, height:844, hasTouch:width === 390});
      await reader.load('/eat/');
      await reader.waitFor(() => !!document.querySelector('.pi-admin-tools__tab'), 'admin tab');
      assert.equal(await reader.page.$eval('.pi-admin-tools__panel', el => el.hidden), true);
      assert.equal(await reader.page.$eval('.pi-edit-toggle', el => el.getBoundingClientRect().width), 0);
      for (let i = 0; i < 2; i++) {
        if (width === 390) await reader.page.tap('.pi-admin-tools__tab');
        else await reader.page.click('.pi-admin-tools__tab');
        assert.equal(await reader.page.$eval('.pi-admin-tools__tab', el => el.getAttribute('aria-expanded')), 'true');
        const box = await reader.page.$eval('.pi-admin-tools__panel', el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right};});
        assert.ok(box.left >= 0 && box.right <= width, 'panel fits viewport');
        await reader.page.click('.pi-edit-toggle');
        assert.equal(await reader.page.$eval('.pi-edit-toggle', el => el.getAttribute('aria-pressed')), i === 0 ? 'true' : 'false');
        await reader.page.click('.pi-theme-toggle');
        assert.equal(await reader.page.$eval('.pi-theme-toggle', el => el.getAttribute('aria-pressed')), i === 0 ? 'true' : 'false');
        await reader.page.keyboard.press('Escape');
        assert.equal(await reader.page.$eval('.pi-admin-tools__panel', el => el.hidden), true);
        assert.equal(await reader.page.evaluate(() => document.activeElement.className), 'pi-admin-tools__tab');
      }
      await reader.page.click('.pi-admin-tools__tab');
      await reader.page.click('.pi-admin-tools__close');
      assert.equal(await reader.page.$eval('.pi-admin-tools__panel', el => el.hidden), true);
      await reader.page.click('.pi-admin-tools__tab');
      await reader.page.mouse.click(5, 200);
      assert.equal(await reader.page.$eval('.pi-admin-tools__panel', el => el.hidden), true);
      await reader.navigate('/journal/');
      await reader.waitFor(() => document.querySelectorAll('.pi-admin-tools').length === 1, 'one remounted tab');
      assert.equal(await reader.page.$eval('.pi-admin-tools__panel', el => el.hidden), true);
    } finally { await reader.close(); }
  });
}
