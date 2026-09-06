const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = fs.mkdtempSync(path.join(require('os').tmpdir(), 'skip-retyping-resilience-'));
const ROUTES = [
  '/skip-retyping/',
  '/skip-retyping/checkout/',
  '/skip-retyping/privacy/',
  '/skip-retyping/terms/',
  '/skip-retyping/refunds/',
  '/skip-retyping/docs/getting-started/',
  '/skip-retyping/docs/smart-rules/',
  '/support/',
  '/contact/',
];
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function resolveFile(rawUrl) {
  const url = new URL(rawUrl, 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!path.extname(pathname)) pathname += '.html';
  const target = path.resolve(ROOT, `.${pathname}`);
  return target.startsWith(ROOT) ? target : null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (new URL(request.url, 'http://127.0.0.1').pathname === '/_audit-layout-fault.css') {
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end('.launch-main { grid-template-columns: 760px !important; } html, body { overflow-x: hidden !important; }');
        return;
      }
      if (new URL(request.url, 'http://127.0.0.1').pathname === '/_audit-control-fault.css') {
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end('#contactName, #contactMessage { height: 12px !important; min-height: 0 !important; padding: 0 !important; line-height: 40px !important; }');
        return;
      }
      if (new URL(request.url, 'http://127.0.0.1').pathname === '/_audit-text-scale.css') {
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        const sizes = new URL(request.url, 'http://127.0.0.1').searchParams.get('sizes') || '';
        response.end(sizes.split(',').filter((size) => /^\d+(?:\.\d+)?$/.test(size))
          .map((size) => `[data-audit-font-size="${size}"] { font-size: ${Number(size) * 2}px !important; }`)
          .join('\n'));
        return;
      }
      const target = resolveFile(request.url);
      if (!target || !fs.existsSync(target)) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.setHeader('Content-Type', TYPES[path.extname(target)] || 'application/octet-stream');
      response.end(fs.readFileSync(target));
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({
        origin: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function collectRuntimeErrors(page, route, failures) {
  page.on('pageerror', (error) => failures.push(`${route}: ${error.message}`));
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) {
      failures.push(`${route}: console ${message.type()} ${message.text()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://127.0.0.1')) {
      failures.push(`${route}: failed request ${request.url()}`);
    }
  });
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]'), (node) => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const interactive = Array.from(
      document.querySelectorAll('button, a.button, a.launch-button, input, select, textarea'),
    ).filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const unnamed = interactive.filter((node) => {
      if (node.matches('input, select, textarea')) {
        if (node.getAttribute('aria-label') || node.getAttribute('aria-labelledby')) return false;
        return !node.labels?.length;
      }
      return !(node.getAttribute('aria-label') || node.textContent.trim() || node.getAttribute('title'));
    });
    const clipped = interactive.filter((node) => {
      const style = getComputedStyle(node);
      const textEntry = node.matches('textarea, input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input[type="password"], input[type="number"]');
      if (textEntry || node.matches('select')) {
        const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
        const available = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (available + 2 < line) return true;
        // Editing can scroll within a native field; commands must remain fully visible.
        if (textEntry) return false;
        const value = node.nextElementSibling;
        if (value?.matches('.select-current-value') && !value.hidden &&
          getComputedStyle(value).display !== 'none' &&
          value.textContent === node.selectedOptions[0]?.textContent) return false;
      }
      return node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2;
    });
    const smallCommands = interactive.filter((node) => {
      if (node.tagName === 'A' && !node.matches('.button, .launch-button')) return false;
      const rect = node.getBoundingClientRect();
      return rect.width < 24 || rect.height < 24;
    });
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    const viewportWidth = document.documentElement.clientWidth;
    // Root overflow can be hidden while an entire grid track is off-screen.
    const outsideViewport = Array.from(document.querySelectorAll(
      'main, main > *, h1, h2, h3, p, li, button, a.button, a.launch-button, input, select, textarea, video, iframe, .select-current-value',
    )).filter((node) => {
      if (node.closest('.table-scroll, pre.copyable')) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
        style.visibility !== 'hidden' && (rect.left < -1 || rect.right > viewportWidth + 1);
    }).map((node) => ({
      element: node.outerHTML.slice(0, 100),
      left: Math.round(node.getBoundingClientRect().left),
      right: Math.round(node.getBoundingClientRect().right),
    }));
    return {
      duplicates: [...new Set(duplicates)],
      unnamed: unnamed.map((node) => node.outerHTML.slice(0, 140)),
      clipped: clipped.map((node) => node.outerHTML.slice(0, 140)),
      smallCommands: smallCommands.map((node) => node.outerHTML.slice(0, 140)),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      outsideViewport,
      hasMain: Boolean(main),
      hasHeading: Boolean(main?.querySelector('h1')),
      footerLeft: footer?.getBoundingClientRect().left ?? 0,
      footerRight: footer?.getBoundingClientRect().right ?? 0,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

async function enlargeText(page, origin) {
  const sizes = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('body, body *'));
    const measured = elements.map((node) => [node, parseFloat(getComputedStyle(node).fontSize)]);
    for (const [node, size] of measured) {
      if (Number.isFinite(size) && size > 0) node.setAttribute('data-audit-font-size', String(size));
    }
    return [...new Set(measured.map(([, size]) => size).filter((size) => Number.isFinite(size) && size > 0))];
  });
  await page.addStyleTag({ url: `${origin}/_audit-text-scale.css?sizes=${sizes.join(',')}` });
}

async function main() {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    for (const route of ROUTES) {
      const page = await context.newPage();
      collectRuntimeErrors(page, route, failures);
      const response = await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${route}: page failed to load`);
      const report = await inspectPage(page);
      if (report.duplicates.length) failures.push(`${route}: duplicate ids ${report.duplicates.join(', ')}`);
      if (report.unnamed.length) failures.push(`${route}: unnamed controls ${report.unnamed.join(' | ')}`);
      if (report.clipped.length) failures.push(`${route}: clipped controls ${report.clipped.join(' | ')}`);
      if (report.smallCommands.length) failures.push(`${route}: command target below 24px ${report.smallCommands.join(' | ')}`);
      if (report.overflow) failures.push(`${route}: horizontal overflow at 320px`);
      if (report.outsideViewport.length) failures.push(`${route}: content outside 320px viewport ${JSON.stringify(report.outsideViewport.slice(0, 5))}`);
      if (!report.hasMain || !report.hasHeading) failures.push(`${route}: missing main heading structure`);
      if (report.footerLeft < -1 || report.footerRight > report.viewportWidth + 1) {
        failures.push(`${route}: footer exceeds the mobile viewport`);
      }
      if (route === '/skip-retyping/') {
        const mode = await page.locator('html').getAttribute('data-theme-resolved');
        if (mode !== 'dark') failures.push('/skip-retyping/: system dark theme was not honored');
        if (await page.locator('html').evaluate((node) => node.classList.contains('reveal-ready'))) {
          failures.push('/skip-retyping/: reduced motion still enabled scroll reveals');
        }
        await page.locator('.theme-toggle').click();
        await page.reload({ waitUntil: 'networkidle' });
        if (
          (await page.locator('html').getAttribute('data-theme-mode')) !== 'dark' ||
          (await page.locator('html').getAttribute('data-theme-resolved')) !== 'dark'
        ) {
          failures.push('/skip-retyping/: explicit dark theme did not persist');
        }
        await page.locator('.theme-toggle').click();
        await page.reload({ waitUntil: 'networkidle' });
        if (
          (await page.locator('html').getAttribute('data-theme-mode')) !== 'light' ||
          (await page.locator('html').getAttribute('data-theme-resolved')) !== 'light'
        ) {
          failures.push('/skip-retyping/: explicit light theme did not persist');
        }
        await page.keyboard.press('Tab');
        if (!(await page.locator('.skip-link').evaluate((node) => node === document.activeElement))) {
          failures.push('/skip-retyping/: skip link is not the first keyboard stop');
        }
      }
      await page.close();
    }
    await context.close();

    const noScript = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    const noScriptPage = await noScript.newPage();
    const response = await noScriptPage.goto(`${server.origin}/skip-retyping/`, { waitUntil: 'load' });
    if (!response?.ok()) failures.push('no-script: product page failed to load');
    const noScriptReport = await inspectPage(noScriptPage);
    if (!noScriptReport.hasHeading || noScriptReport.overflow || noScriptReport.outsideViewport.length) {
      failures.push(`no-script: core product page is not usable ${JSON.stringify({ ...noScriptReport, outsideViewport: noScriptReport.outsideViewport.slice(0, 5) })}`);
    }
    await noScript.close();

    const textScale = await browser.newContext({ viewport: { width: 390, height: 844 } });
    for (const route of ROUTES) {
      const page = await textScale.newPage();
      await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      const before = await page.locator('h1').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      await enlargeText(page, server.origin);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const after = await page.locator('h1').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      if (after < before * 1.95) failures.push(`${route}: text enlargement did not double heading size`);
      const report = await inspectPage(page);
      if (report.overflow || report.clipped.length || report.outsideViewport.length) {
        failures.push(`${route}: 200% text stress failed ${JSON.stringify({ clipped: report.clipped, outsideViewport: report.outsideViewport.slice(0, 5) })}`);
      }
      await page.close();
    }
    await textScale.close();

    for (const colorScheme of ['light', 'dark']) {
      const layoutContext = await browser.newContext({ colorScheme, reducedMotion: 'reduce' });
      const page = await layoutContext.newPage();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        for (const route of ['/skip-retyping/', '/skip-retyping/checkout/']) {
          await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
          const sections = page.locator('main > section');
          // content-visibility can defer layout until a section is scrolled into view.
          for (let index = 0; index < await sections.count(); index++) {
            await sections.nth(index).scrollIntoViewIfNeeded();
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const report = await inspectPage(page);
            if (report.overflow || report.outsideViewport.length) {
              failures.push(`${route}: ${colorScheme}/${width}px section ${index} clips content ${JSON.stringify(report.outsideViewport.slice(0, 3))}`);
              break;
            }
          }
          if (route === '/skip-retyping/' && width === 390) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: path.join(ARTIFACTS, `product-mobile-${colorScheme}.png`) });
          }
        }
      }
      await layoutContext.close();
    }

    const faultContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const faultPage = await faultContext.newPage();
    await faultPage.goto(`${server.origin}/skip-retyping/`, { waitUntil: 'networkidle' });
    await faultPage.addStyleTag({ url: `${server.origin}/_audit-layout-fault.css` });
    const fault = await inspectPage(faultPage);
    if (fault.overflow || !fault.outsideViewport.length) {
      failures.push('detector self-test: must detect the original hidden-overflow grid defect independently of root scroll width');
    }
    await faultPage.goto(`${server.origin}/contact/`, { waitUntil: 'networkidle' });
    await enlargeText(faultPage, server.origin);
    await faultPage.locator('#contactName').fill('A long editable value '.repeat(12));
    await faultPage.locator('#contactMessage').fill('A long editable message\n'.repeat(30));
    await faultPage.locator('#contactName').press('End');
    const scrolls = await faultPage.locator('#contactName').evaluate((node) => node.scrollLeft > 0);
    const editReport = await inspectPage(faultPage);
    if (!scrolls || editReport.clipped.length) {
      failures.push('detector self-test: accessible scrolling native text controls must remain editable at 200% text');
    }
    await faultPage.addStyleTag({ url: `${server.origin}/_audit-control-fault.css` });
    const shortControls = await inspectPage(faultPage);
    for (const id of ['contactName', 'contactMessage']) {
      if (!shortControls.clipped.some((node) => node.includes(`id="${id}"`))) {
        failures.push(`detector self-test: missed clipped text line in ${id}`);
      }
    }
    await faultPage.locator('#contactReason').selectOption('product_help');
    await faultPage.locator('.select-current-value').evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    const missingValue = await inspectPage(faultPage);
    if (!missingValue.clipped.some((node) => node.includes('id="contactReason"'))) {
      failures.push('detector self-test: missed inaccessible selected reason without its readable value');
    }
    await faultContext.close();
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length) {
    console.error(`Skip Retyping resilience audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(
    `Skip Retyping website resilience audit passed: ${ROUTES.length} core routes, true 200% text, 320/390/768/1440px scrolled light/dark layouts, keyboard, no-script, and hidden-clipping detector self-test.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
