const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const extension = path.resolve(root, '../fillpro');
const output = path.join(root, 'assets/marketplace/captures');
const inputs = ['manifest.json', 'background.js', 'popup.js', 'popup.html', 'popup.css',
  'ui-i18n.js', 'file-store.js', 'licensing.js', 'page-picker.js',
  'profile-backup.js', 'safe-patterns.js', 'vendor/re2js-2.8.6.umd.js',
  'recovery-store.js', 'profile-recovery.js', 'editor-recovery-ui.js'];
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fingerprint = () => Object.fromEntries(inputs.map((file) => [file, digest(path.join(extension, file))]));

const fixture = `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Job application - local demonstration</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff;color:#172c29;font:18px/1.45 system-ui}
main{padding:30px 32px;max-width:820px}h1{font-size:30px;margin:0 0 6px}p{margin:0 0 24px;color:#52645f}
form{display:grid;grid-template-columns:1fr 1fr;gap:22px 20px}label{display:grid;gap:8px;font-weight:600}
input,select{font:18px system-ui;color:#172c29;background:#fafcfb;border:1px solid #afbeb9;border-radius:6px;width:100%;height:52px;padding:10px 12px}
input[type=file]{font-size:14px;padding:12px 8px}input[type=checkbox]{width:22px;height:22px;accent-color:#087d6a}
.wide{grid-column:1/-1}.check{display:flex;align-items:center;gap:10px}small{font-size:13px;color:#52685f;font-weight:400}
</style><main><h1>Job application</h1><p>Contact details</p><form id="application">
<label>Full name<input id="full_name" name="full_name" autocomplete="name"></label>
<label>Email<input id="email" name="email" type="email" autocomplete="email"></label>
<label>Phone<input id="phone" name="phone" type="tel" autocomplete="tel"></label>
<label>Resume<input id="resume" name="resume" type="file" accept=".pdf"></label>
<label class="wide">Account password<input id="password" name="password" type="password" autocomplete="new-password"><small>Leave sign-ins to your password manager.</small></label>
</form></main></html>`;

async function capture() {
  fs.mkdirSync(output, { recursive: true });
  const hashes = fingerprint();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'skip-retyping-media-'));
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(fixture);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let context;
  const assertions = [];
  const framing = {};
  try {
    context = await chromium.launchPersistentContext(userData, {
      channel: 'chromium', headless: true, viewport: { width: 820, height: 540 },
      deviceScaleFactor: 2,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging'],
    });
    const worker = context.serviceWorkers().find((item) => item.url().endsWith('/background.js')) ||
      await context.waitForEvent('serviceworker', { predicate: (item) => item.url().endsWith('/background.js') });
    const extensionId = new URL(worker.url()).host;
    let popup = await context.newPage();
    await popup.setViewportSize({ width: 360, height: 540 });
    await worker.evaluate(async () => {
      await chrome.storage.local.set({ onboardingSeen: true, appearanceTheme: 'light', interfaceLanguage: 'en' });
    });
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.locator('#btnCreateFirst').click();
    for (const [id, value] of Object.entries({ profileName: 'Job search', f_first_name: 'Alex', f_last_name: 'Morgan', f_email: 'alex@example.com', f_phone: '+1 207 555 0148' })) {
      await popup.locator(`#${id}`).fill(value);
    }
    await popup.locator('details.advanced-fields > summary').click();
    await popup.locator('#btnAddProfileFile').click();
    await popup.locator('.profile-file-pattern').fill('resume');
    await popup.locator('.profile-file-input').setInputFiles({ name: 'alex-resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% Local fictional demonstration\n%%EOF') });
    await popup.waitForFunction(() => !hasPendingProfileFiles());
    await popup.locator('#editorSave').click();
    await popup.locator('#editor').waitFor({ state: 'hidden' });
    assertions.push('Profile and resume saved using the real editor; fictional data only.');
    const form = await context.newPage();
    await form.goto(`http://127.0.0.1:${server.address().port}/apply`);
    const grant = await context.browser().newBrowserCDPSession();
    const { targetInfos } = await grant.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
    const target = targetInfos.find((item) => item.url === form.url());
    assert(target, 'The demonstration form tab must exist');
    await grant.send('Extensions.triggerAction', { id: extensionId, targetId: target.targetId });
    await grant.detach();
    const shot = async (name) => {
      await popup.locator('#toast').waitFor({ state: 'hidden' });
      await popup.evaluate(() => window.scrollTo(0, 0));
      await form.screenshot({ path: path.join(output, `${name}-form.png`) });
      const lastProfile = await popup.locator('.profile-item').last().boundingBox();
      assert(lastProfile, 'Capture must include a real saved profile');
      assert(lastProfile.y + lastProfile.height <= 540, 'The saved profile must fit without cropping controls');
      await popup.screenshot({ path: path.join(output, `${name}-popup.png`), clip: { x: 0, y: 0, width: 360, height: Math.min(540, Math.ceil(lastProfile.y + lastProfile.height + 14)) } });
      if (['before', 'filled', 'undo'].includes(name)) {
        framing[name] = {
          fill: await popup.locator('[data-fill]').first().boundingBox(),
          undo: await popup.locator('#btnUndoResult').boundingBox(),
          password: await form.locator('label').filter({ has: form.locator('#password') }).boundingBox(),
        };
      }
    };
    await popup.reload();
    await popup.locator('[data-fill]').waitFor();
    await form.bringToFront();
    await shot('before');
    await popup.locator('[data-fill]').click();
    await form.waitForFunction(() => document.querySelector('#email').value === 'alex@example.com');
    await popup.waitForFunction(() => !document.querySelector('[data-fill]').disabled);
    const filled = await form.evaluate(() => ({
      name: document.querySelector('#full_name').value, email: document.querySelector('#email').value,
      phone: document.querySelector('#phone').value, resume: document.querySelector('#resume').files[0]?.name,
      password: document.querySelector('#password').value,
    }));
    assert.equal(filled.name, 'Alex Morgan');
    assert.equal(filled.email, 'alex@example.com');
    assert.equal(filled.phone, '+1 207 555 0148');
    assert.equal(filled.resume, 'alex-resume.pdf');
    assert.equal(filled.password, '');
    assertions.push('Fill Page click filled contact details and the saved resume; password stayed empty.');
    await shot('filled');
    await form.bringToFront();
    // A popup rendered in an automation tab has sender.tab; native action popups do not.
    // Dispatch the same production Undo message from the target frame, without mocking it.
    const undo = await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id },
        func: () => new Promise((resolve) => chrome.runtime.sendMessage({ action: 'undoLastFill' }, resolve)) });
      return execution.result;
    });
    assert(undo?.ok, `Production Undo failed: ${JSON.stringify(undo)}`);
    assert.equal(await form.locator('#email').inputValue(), '', 'Undo did not restore email');
    assert.equal(await form.locator('#resume').evaluate((input) => input.files.length), 0);
    assertions.push('Production Undo message from the target frame restored empty contact fields and removed the filled attachment; native popup click not certified by this capture.');
    await popup.reload();
    await popup.locator('[data-fill]').waitFor();
    await shot('undo');
    const localized = require('./fillpro-localized-marketplace-copy.json');
    const locales = { en: { ui: { beforeTitle: 'Job application', fullName: 'Full name', email: 'Email', phone: 'Phone', resume: 'Resume' } }, ...localized };
    for (const [locale, copy] of Object.entries(locales)) {
      await worker.evaluate((language) => chrome.storage.local.set({ interfaceLanguage: language }), locale);
      await form.reload();
      await form.evaluate(({ ui, password, language }) => {
        document.documentElement.lang = language.replace('_', '-');
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.querySelector('h1').textContent = ui.beforeTitle;
        document.querySelector('main > p').remove();
        document.querySelector('small').remove();
        for (const [id, label] of Object.entries({ full_name: ui.fullName, email: ui.email, phone: ui.phone, resume: ui.resume, password })) document.querySelector(`#${id}`).parentElement.firstChild.textContent = label;
      }, { ui: copy.ui, password: locale === 'en' ? 'Account password' : copy.ui.password, language: locale });
      await popup.reload();
      await popup.locator('[data-fill]').waitFor();
      await form.bringToFront();
      await popup.locator('[data-fill]').click();
      await form.waitForFunction(() => document.querySelector('#resume').files.length === 1);
      await popup.waitForFunction(() => !document.querySelector('[data-fill]').disabled);
      assert.equal(await form.locator('#full_name').inputValue(), 'Alex Morgan', `${locale}: full name regression`);
      assert.equal(await form.locator('#password').inputValue(), '', `${locale}: password changed`);
      await shot(`${locale}-filled`);
      await popup.locator('[data-edit]').click();
      await popup.locator('#profileName').waitFor();
      const saveBounds = await popup.locator('#editorSave').boundingBox();
      assert(saveBounds && saveBounds.y >= 0 && saveBounds.y + saveBounds.height <= 540,
        `${locale}: editor Save must remain visible without scrolling through the entire form`);
      await popup.screenshot({ path: path.join(output, `${locale}-editor.png`) });
      if (!await popup.locator('details.advanced-fields').evaluate((details) => details.open)) await popup.locator('details.advanced-fields > summary').click();
      await popup.locator('#profileFiles').screenshot({ path: path.join(output, `${locale}-files.png`) });
      await popup.locator('#editorCancel').click();
      assertions.push(`${locale}: real translated editor/result and localized fixture; full name/resume correct and password unchanged. Advanced UI may retain English.`);
    }
    assert.deepEqual(fingerprint(), hashes, 'Extension inputs changed during capture');
    const artifacts = Object.fromEntries(fs.readdirSync(output).filter((file) => file.endsWith('.png')).map((file) => [file, digest(path.join(output, file))]));
    fs.writeFileSync(path.join(output, 'provenance.json'), `${JSON.stringify({ schemaVersion: 1, capturedAt: new Date().toISOString(), buildVersion: '1.0.0', source: 'Unpacked working source, not a certified store ZIP', fixture: 'Local fictional form; not a compatibility claim for any job website', pixelRatio: 2, framing, extensionHashes: hashes, captureScriptHash: digest(__filename), assertions, filled, artifacts }, null, 2)}\n`);
    console.log(`Real extension capture passed: ${assertions.length} task assertions; ${Object.keys(artifacts).length} images.`);
  } finally {
    await context?.close();
    await new Promise((resolve) => server.close(resolve));
    const resolved = path.resolve(userData);
    assert(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep), 'Temporary profile cleanup escaped temp');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

if (require.main === module) capture().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { capture };
