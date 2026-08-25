const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
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
      if (new URL(request.url, 'http://127.0.0.1').pathname === '/_audit-text-scale.css') {
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end('html { font-size: 200% !important; }');
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
    const clipped = interactive.filter(
      (node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2,
    );
    const smallCommands = interactive.filter((node) => {
      if (node.tagName === 'A' && !node.matches('.button, .launch-button')) return false;
      const rect = node.getBoundingClientRect();
      return rect.width < 24 || rect.height < 24;
    });
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    return {
      duplicates: [...new Set(duplicates)],
      unnamed: unnamed.map((node) => node.outerHTML.slice(0, 140)),
      clipped: clipped.map((node) => node.outerHTML.slice(0, 140)),
      smallCommands: smallCommands.map((node) => node.outerHTML.slice(0, 140)),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      hasMain: Boolean(main),
      hasHeading: Boolean(main?.querySelector('h1')),
      footerLeft: footer?.getBoundingClientRect().left ?? 0,
      footerRight: footer?.getBoundingClientRect().right ?? 0,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

async function main() {
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
    const noScriptReport = await noScriptPage.evaluate(() => ({
      heading: document.querySelector('main h1')?.textContent?.trim() || '',
      primaryLink: Boolean(document.querySelector('main a[href]')),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (!noScriptReport.heading || !noScriptReport.primaryLink || noScriptReport.overflow) {
      failures.push(`no-script: core product page is not usable ${JSON.stringify(noScriptReport)}`);
    }
    await noScript.close();

    const textScale = await browser.newContext({ viewport: { width: 390, height: 844 } });
    for (const route of ['/skip-retyping/', '/skip-retyping/privacy/', '/skip-retyping/terms/', '/skip-retyping/refunds/', '/support/']) {
      const page = await textScale.newPage();
      await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ url: `${server.origin}/_audit-text-scale.css` });
      const report = await inspectPage(page);
      if (report.overflow || report.clipped.length) {
        failures.push(`${route}: 200% text stress failed ${JSON.stringify(report.clipped)}`);
      }
      await page.close();
    }
    await textScale.close();
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
    `Skip Retyping website resilience audit passed: ${ROUTES.length} core routes at 320px/system dark/reduced motion, persisted theme, keyboard skip link, no-script fallback, and 200% text stress.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
