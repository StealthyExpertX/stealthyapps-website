const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.tmp', 'release-experience-audit');
const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const ROUTES = [
  '/fillpro/',
  '/fillpro/privacy/',
  '/support/',
  '/contact/',
  '/fillpro/job-application-autofill/',
  '/fillpro/resume-upload-autofill/',
  '/fillpro/local-form-autofill/',
  '/fillpro/browser-autofill-vs-fillpro/',
];

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function routeToFile(url) {
  const requestUrl = new URL(url, 'http://127.0.0.1');
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!path.extname(pathname)) pathname = `${pathname}.html`;

  const target = path.resolve(ROOT, `.${pathname}`);
  if (!target.startsWith(ROOT)) return null;
  return target;
}

function serveStatic(request, response) {
  const target = routeToFile(request.url);
  if (!target) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(target, (error, body) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': CONTENT_TYPES[path.extname(target)] || 'application/octet-stream',
    });
    response.end(body);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(serveStatic);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });
}

function slug(route, viewport, theme) {
  const clean = route
    .replace(/^\/|\/$/g, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/gi, '-');
  return `${clean || 'home'}-${viewport}-${theme}.png`;
}

async function auditPage(page, route, viewport, theme, errors) {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem('fillpro-theme', selectedTheme);
  }, theme);

  const response = await page.goto(route, { waitUntil: 'networkidle' });
  if (!response || !response.ok()) {
    errors.push(`${route}: failed to load (${response ? response.status() : 'no response'})`);
    return;
  }

  await page.screenshot({
    path: path.join(OUT_DIR, slug(new URL(route).pathname, viewport.name, theme)),
    fullPage: true,
  });

  const report = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const interactiveSelector =
      'a, button, input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
    const tinyTargets = Array.from(document.querySelectorAll(interactiveSelector))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (element.getAttribute('aria-hidden') === 'true') return false;
        if (element.closest('[hidden], .sr-only, [inert]')) return false;
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (rect.bottom < 0 || rect.right < 0 || rect.top > viewportHeight || rect.left > viewportWidth) {
          return false;
        }
        return rect.width < 30 || rect.height < 30;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const label =
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.textContent ||
          element.tagName.toLowerCase();
        return `${label.trim().replace(/\s+/g, ' ').slice(0, 60)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
      });

    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries && navEntries[0];
    const loadMs = nav ? nav.loadEventEnd - nav.startTime : 0;
    const domContentLoadedMs = nav ? nav.domContentLoadedEventEnd - nav.startTime : 0;

    return {
      hasH1: Boolean(document.querySelector('h1')),
      hasMain: Boolean(document.querySelector('main')),
      hasFooter: Boolean(document.querySelector('footer')),
      hasThemeToggle: Boolean(document.querySelector('.theme-toggle')),
      resolvedTheme: html.getAttribute('data-theme-resolved'),
      scrollWidth: Math.max(
        html.scrollWidth,
        document.scrollingElement ? document.scrollingElement.scrollWidth : 0,
      ),
      viewportWidth,
      tinyTargets,
      loadMs,
      domContentLoadedMs,
    };
  });

  if (!report.hasH1) errors.push(`${route}: missing h1`);
  if (!report.hasMain) errors.push(`${route}: missing main`);
  if (!report.hasFooter) errors.push(`${route}: missing footer`);
  if (!report.hasThemeToggle) errors.push(`${route}: missing theme toggle`);
  if (report.resolvedTheme !== theme) {
    errors.push(`${route}: expected ${theme} theme, got ${report.resolvedTheme || 'unset'}`);
  }
  if (report.scrollWidth > report.viewportWidth + 1) {
    errors.push(`${route}: horizontal overflow ${report.scrollWidth}px on ${report.viewportWidth}px viewport`);
  }
  if (report.tinyTargets.length) {
    errors.push(`${route}: tiny visible targets on ${viewport.name}/${theme}: ${report.tinyTargets.join(', ')}`);
  }
  if (report.loadMs > 2500) {
    errors.push(`${route}: local load budget exceeded (${Math.round(report.loadMs)}ms)`);
  }
  if (report.domContentLoadedMs > 1500) {
    errors.push(`${route}: local DOMContentLoaded budget exceeded (${Math.round(report.domContentLoadedMs)}ms)`);
  }
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  const errors = [];
  let checks = 0;

  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
          reducedMotion: 'reduce',
        });

        for (const route of ROUTES) {
          const page = await context.newPage();
          const pageErrors = [];
          page.on('console', (message) => {
            if (message.type() === 'error') {
              pageErrors.push(`${route}: console error: ${message.text()}`);
            }
          });
          page.on('pageerror', (error) => {
            pageErrors.push(`${route}: page error: ${error.message}`);
          });

          await auditPage(page, `${server.origin}${route}`, viewport, theme, pageErrors);
          checks += 1;
          await page.close();
          errors.push(...pageErrors);
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (errors.length) {
    console.error(`FillPro release experience audit failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    console.error(`Screenshots saved to ${OUT_DIR}`);
    process.exit(1);
  }

  console.log(
    `FillPro release experience audit passed: ${checks} rendered page checks, ${ROUTES.length} routes, ${VIEWPORTS.length} viewports, ${THEMES.length} themes. Screenshots saved to ${OUT_DIR}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
