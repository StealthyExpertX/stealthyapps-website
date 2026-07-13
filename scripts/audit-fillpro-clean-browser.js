const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ROUTES = [
  '/fillpro/',
  '/fillpro/download/',
  '/fillpro/#pricing',
  '/fillpro/privacy/',
  '/support/',
  '/contact/',
  '/fillpro/docs/getting-started/',
];
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function routeToFile(url) {
  const requestUrl = new URL(url, 'http://127.0.0.1');
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!path.extname(pathname)) pathname += '.html';
  const target = path.resolve(ROOT, `.${pathname}`);
  return target.startsWith(ROOT) ? target : null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const target = routeToFile(request.url);
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.setHeader('Content-Type', CONTENT_TYPES[path.extname(target)] || 'application/octet-stream');
      response.end(fs.readFileSync(target));
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function issueUrls(value, urls = []) {
  if (!value || typeof value !== 'object') return urls;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && /url/i.test(key) && /^https?:/.test(item)) urls.push(item);
    else if (item && typeof item === 'object') issueUrls(item, urls);
  }
  return urls;
}

function isHeadlessGpuDiagnostic(text) {
  return /GL Driver Message[\s\S]*GPU stall due to ReadPixels/i.test(text || '');
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const failures = [];
  const observations = [];

  try {
    for (const route of ROUTES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Log.enable');
      await cdp.send('Audits.enable');

      await page.addInitScript(() => {
        window.__fillproCspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__fillproCspViolations.push({
            blockedURI: event.blockedURI,
            directive: event.effectiveDirective,
            sourceFile: event.sourceFile,
          });
        });
      });

      page.on('console', (message) => {
        if (!['warning', 'error'].includes(message.type())) return;
        if (isHeadlessGpuDiagnostic(message.text())) return;
        const location = message.location();
        const source = location.url || '';
        if (!source || source.startsWith(server.origin)) {
          failures.push(`${route}: ${message.type()} ${message.text()} ${source}`.trim());
        }
      });
      page.on('pageerror', (error) => failures.push(`${route}: page error ${error.message}`));
      page.on('requestfailed', (request) => {
        if (request.url().startsWith(server.origin)) {
          failures.push(`${route}: first-party request failed ${request.url()} (${request.failure()?.errorText || 'unknown'})`);
        }
      });
      cdp.on('Log.entryAdded', ({ entry }) => {
        if (isHeadlessGpuDiagnostic(entry.text)) return;
        const firstParty = entry.url && entry.url.startsWith(server.origin);
        if (firstParty && ['warning', 'error'].includes(entry.level)) {
          failures.push(`${route}: browser ${entry.level} ${entry.text} ${entry.url}`);
        }
      });
      cdp.on('Audits.issueAdded', ({ issue }) => {
        const urls = issueUrls(issue.details);
        const firstParty = urls.some((url) => url.startsWith(server.origin));
        if (issue.code === 'ContentSecurityPolicyIssue' && (firstParty || urls.length === 0)) {
          failures.push(`${route}: browser reported a first-party CSP issue`);
        }
        if (firstParty && issue.code === 'DeprecationIssue') {
          failures.push(`${route}: first-party deprecated feature ${JSON.stringify(urls)}`);
        }
      });

      const response = await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
      if (!response || !response.ok()) failures.push(`${route}: load failed`);

      if (route === '/fillpro/') {
        await page.mouse.move(1180, 220);
        await page.waitForFunction(
          () => document.documentElement.classList.contains('hero-3d-ready'),
          null,
          { timeout: 10000 },
        );
        await page.waitForTimeout(1400);
      }

      const report = await page.evaluate(() => {
        const controls = Array.from(document.querySelectorAll('input, select, textarea'))
          .filter((element) => element.type !== 'hidden');
        const unlabeled = controls.filter((element) => {
          if (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby')) return false;
          if (!element.id) return true;
          return !document.querySelector(`label[for="${CSS.escape(element.id)}"]`) && !element.closest('label');
        });
        const unnamed = controls.filter((element) => !element.id || !element.getAttribute('name'));
        return {
          csp: window.__fillproCspViolations || [],
          unlabeled: unlabeled.map((element) => element.outerHTML.slice(0, 160)),
          unnamed: unnamed.map((element) => element.outerHTML.slice(0, 160)),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });
      if (report.csp.length) failures.push(`${route}: CSP violations ${JSON.stringify(report.csp)}`);
      if (report.unlabeled.length) failures.push(`${route}: unlabeled fields ${report.unlabeled.join(' | ')}`);
      if (report.unnamed.length) failures.push(`${route}: fields missing id/name ${report.unnamed.join(' | ')}`);
      if (report.horizontalOverflow) failures.push(`${route}: horizontal overflow`);
      observations.push(`${route} clean`);

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length) {
    console.error(`Clean-browser audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(
    `Clean-browser audit passed: ${observations.length} routes, no first-party console errors/warnings, CSP violations, deprecated APIs, unlabeled fields, missing field ids/names, failed requests, or overflow.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
