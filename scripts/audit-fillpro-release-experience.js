const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(os.tmpdir(), `fillpro-release-experience-audit-${process.pid}`);
const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const ROUTES = [
  '/skip-retyping/',
  '/skip-retyping/checkout/',
  '/skip-retyping/changelog/',
  '/skip-retyping/privacy/',
  '/skip-retyping/terms/',
  '/skip-retyping/refunds/',
  '/skip-retyping/docs/getting-started/',
  '/skip-retyping/docs/smart-rules/',
  '/skip-retyping/download/',
  '/skip-retyping/download/chrome/',
  '/skip-retyping/download/edge/',
  '/skip-retyping/download/firefox/',
  '/support/',
  '/contact/',
  '/skip-retyping/job-application-autofill/',
  '/skip-retyping/resume-upload-autofill/',
  '/skip-retyping/local-form-autofill/',
  '/skip-retyping/browser-autofill-vs-skip-retyping/',
  '/skip-retyping/de/',
  '/skip-retyping/es/',
  '/skip-retyping/fr/',
  '/skip-retyping/pt-br/',
  '/skip-retyping/ja/',
  '/skip-retyping/ko/',
  '/skip-retyping/zh-cn/',
  '/skip-retyping/ru/',
];
const LOCALIZED_THEME_MARKERS = {
  '/skip-retyping/de/': ['Aktuelles Design:', 'Wechseln zu:'],
  '/skip-retyping/es/': ['Tema actual:', 'Cambiar a:'],
  '/skip-retyping/fr/': ['Thème actuel :', 'Passer au thème'],
  '/skip-retyping/pt-br/': ['Tema atual:', 'Mudar para:'],
  '/skip-retyping/ja/': ['現在のテーマ:', 'テーマに切り替えます'],
  '/skip-retyping/ko/': ['현재 테마:', '테마로 전환합니다'],
  '/skip-retyping/zh-cn/': ['当前主题：', '切换到'],
  '/skip-retyping/ru/': ['Текущая тема:', 'Переключить на тему'],
};

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
    window.localStorage.setItem('skip-retyping-theme', selectedTheme);
  }, theme);

  const response = await page.goto(route, { waitUntil: 'networkidle' });
  if (!response || !response.ok()) {
    errors.push(`${route}: failed to load (${response ? response.status() : 'no response'})`);
    return;
  }

  await page.addStyleTag({
    content: 'html * { content-visibility: visible !important; contain-intrinsic-size: none !important; }',
  });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: path.join(OUT_DIR, slug(new URL(route).pathname, viewport.name, theme)),
    fullPage: true,
  });

  const pathname = new URL(route).pathname;
  if (pathname === '/skip-retyping/') {
    try {
      await page.mouse.move(Math.max(12, viewport.width - 24), 120);
      await page.waitForFunction(() => {
        const media = document.querySelector('.demo-shell video, [data-skip-retyping-demo-poster]');
        return Boolean(
          media &&
          (media.tagName === 'VIDEO' || (media.complete && media.naturalWidth > 0)),
        );
      });
      await page.waitForTimeout(120);
      await page.locator('.launch-hero').screenshot({
        path: path.join(OUT_DIR, 'hero-visual-' + viewport.name + '-' + theme + '.png'),
      });
      const demoPath = path.join(
        OUT_DIR,
        'hero-demo-' + viewport.name + '-' + theme + '.png',
      );
      await page.locator('.launch-demo-card').screenshot({ path: demoPath });
      const stats = await sharp(demoPath).stats();
      const colorDeviation = stats.channels
        .slice(0, 3)
        .reduce((sum, channel) => sum + channel.stdev, 0);
      if (colorDeviation < 18) {
        errors.push(
          route + ': real product demo appears blank on ' + viewport.name + '/' + theme +
          ' (' + colorDeviation.toFixed(2) + ')',
        );
      }

      const heroReport = await page.evaluate(() => {
        const shell = document.querySelector('.demo-shell');
        const hero = document.querySelector('.launch-hero');
        const demo = document.querySelector('.launch-demo-card');
        const copy = document.querySelector('.launch-hero-copy');
        const media = document.querySelector('.demo-shell video, [data-skip-retyping-demo-poster]');
        if (!shell || !hero || !demo || !copy || !media) return { ok: false };

        const shellStyle = getComputedStyle(shell);
        const heroStyle = getComputedStyle(hero);
        const demoRect = demo.getBoundingClientRect();
        const copyRect = copy.getBoundingClientRect();
        const overlapWidth = Math.max(
          0,
          Math.min(demoRect.right, copyRect.right) - Math.max(demoRect.left, copyRect.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(demoRect.bottom, copyRect.bottom) - Math.max(demoRect.top, copyRect.top),
        );
        return {
          ok: true,
          hasDecorativeCanvas: Boolean(document.querySelector('.hero-3d-canvas')),
          mediaReady:
            media.tagName === 'VIDEO' ||
            Boolean(media.complete && media.naturalWidth > 0),
          overflowX: shellStyle.overflowX,
          overflowY: shellStyle.overflowY,
          scrollbarWidth: shellStyle.scrollbarWidth || '',
          heroOverflowY: heroStyle.overflowY,
          copyDemoOverlap: overlapWidth * overlapHeight,
        };
      });
      if (!heroReport.ok || !heroReport.mediaReady) {
        errors.push(route + ': product demo media is missing on ' + viewport.name + '/' + theme);
      } else {
        if (heroReport.hasDecorativeCanvas) {
          errors.push(route + ': decorative WebGL canvas returned on ' + viewport.name + '/' + theme);
        }
        if (heroReport.scrollbarWidth !== 'none' || heroReport.overflowY !== 'hidden') {
          errors.push(
            route + ': hero demo shell scrollbar can become visible on ' +
            viewport.name + '/' + theme + ': ' + JSON.stringify(heroReport),
          );
        }
        if (['auto', 'scroll'].includes(heroReport.heroOverflowY)) {
          errors.push(
            route + ': hero became an internal scroll container on ' +
            viewport.name + '/' + theme + ': ' + JSON.stringify(heroReport),
          );
        }
        if (heroReport.copyDemoOverlap > 1) {
          errors.push(
            route + ': hero copy overlaps the product demo on ' +
            viewport.name + '/' + theme,
          );
        }
      }
    } catch (error) {
      errors.push(
        route + ': product hero check failed on ' +
        viewport.name + '/' + theme + ': ' + error.message,
      );
    }
    try {
      const reviewRail = page.locator('.launch-review-rail');
      await reviewRail.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const rail = document.querySelector('.launch-review-rail');
        if (!rail) return;
        const header = document.querySelector('.launch-header');
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const top = rail.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
        window.scrollTo(0, Math.max(0, top));
      });
      await page.waitForTimeout(80);
      const reviewPath = path.join(OUT_DIR, `review-rail-${viewport.name}-${theme}.png`);
      await reviewRail.screenshot({ path: reviewPath });
      const reviewStats = await sharp(reviewPath).stats();
      const reviewAlphaMean = reviewStats.channels[3] ? reviewStats.channels[3].mean : 255;
      const reviewColorDeviation = reviewStats.channels
        .slice(0, 3)
        .reduce((sum, channel) => sum + channel.stdev, 0);
      if (reviewAlphaMean < 0.5 || reviewColorDeviation < 18) {
        errors.push(
          `${route}: review-before-submit section appears blank on ${viewport.name}/${theme} (${reviewColorDeviation.toFixed(2)})`,
        );
      }
    } catch (error) {
      errors.push(`${route}: review-before-submit section check failed on ${viewport.name}/${theme}: ${error.message}`);
    }
  }

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
      themeToggle: (() => {
        const button = document.querySelector('.theme-toggle');
        const rect = button ? button.getBoundingClientRect() : null;
        return button
          ? {
              mode: button.dataset.theme || '',
              resolved: button.dataset.resolvedTheme || '',
              label: button.getAttribute('aria-label') || '',
              title: button.getAttribute('title') || '',
              width: rect.width,
              height: rect.height,
            }
          : null;
      })(),
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
  if (report.themeToggle) {
    if (viewport.width <= 720 && report.themeToggle.width > 46) {
      errors.push(
        `${route}: mobile theme control stretched to ${Math.round(report.themeToggle.width)}px`,
      );
    }
    const expectedNextTheme = theme === 'dark' ? 'light' : 'system';
    if (report.themeToggle.mode !== theme) {
      errors.push(`${route}: theme toggle mode expected ${theme}, got ${report.themeToggle.mode || 'unset'}`);
    }
    if (report.themeToggle.resolved !== theme) {
      errors.push(
        `${route}: theme toggle resolved theme expected ${theme}, got ${report.themeToggle.resolved || 'unset'}`,
      );
    }
    const localizedMarkers = LOCALIZED_THEME_MARKERS[pathname];
    if (localizedMarkers) {
      for (const marker of localizedMarkers) {
        if (!report.themeToggle.label.includes(marker)) {
          errors.push(`${route}: localized theme label missing ${marker}`);
        }
      }
      if (!report.themeToggle.title.trim()) errors.push(`${route}: localized theme title is empty`);
    } else {
      if (!report.themeToggle.label.includes(`Current theme: ${theme}`)) {
        errors.push(`${route}: theme toggle label does not expose current ${theme} theme`);
      }
      if (!report.themeToggle.label.includes(`Switch to ${expectedNextTheme} theme`)) {
        errors.push(`${route}: theme toggle label does not expose next ${expectedNextTheme} theme`);
      }
      if (!report.themeToggle.title.includes(`Next: ${expectedNextTheme}`)) {
        errors.push(`${route}: theme toggle title does not expose next ${expectedNextTheme} theme`);
      }
    }
  }
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

async function auditStaticPresentation(browser, origin, errors) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      hasTouch: false,
      colorScheme: theme,
    });
    const page = await context.newPage();

    try {
      await page.addInitScript((value) => {
        window.localStorage.setItem('skip-retyping-theme', value);
      }, theme);
      await page.goto(`${origin}/skip-retyping/`, { waitUntil: 'networkidle' });
      const report = await page.evaluate(() => {
        const root = document.documentElement;
        const targetSelectors = [
          '.launch-strip',
          '.launch-section',
          '.launch-band',
          '.launch-final',
          '.browser-download-card',
          '.launch-use-grid article',
          '.workflow-list article',
          '.compare-lanes article',
          '.price-card',
          '.launch-faq-list details',
        ].join(',');
        const hidden = Array.from(document.querySelectorAll(targetSelectors))
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              Number.parseFloat(style.opacity) < 0.99 ||
              style.visibility !== 'visible' ||
              style.display === 'none'
            );
          })
          .map((element) => element.className || element.tagName);
        return {
          scrollY: window.scrollY,
          hidden,
          pointerNode: Boolean(document.querySelector('.site-pointer-glow')),
          pointerClass: root.classList.contains('pointer-glow-active'),
          pointerX: root.style.getPropertyValue('--pointer-x'),
          pointerY: root.style.getPropertyValue('--pointer-y'),
          revealClass: root.classList.contains('reveal-ready'),
          revealItems: document.querySelectorAll('.reveal-item').length,
        };
      });

      if (report.scrollY !== 0) {
        errors.push(`/skip-retyping/: fresh page moved before user input on ${theme}`);
      }
      if (report.hidden.length) {
        errors.push(`/skip-retyping/: content starts hidden on ${theme}: ${report.hidden.slice(0, 8).join(', ')}`);
      }
      if (
        report.pointerNode ||
        report.pointerClass ||
        report.pointerX ||
        report.pointerY ||
        report.revealClass ||
        report.revealItems
      ) {
        errors.push(`/skip-retyping/: obsolete pointer/reveal behavior returned on ${theme}: ${JSON.stringify(report)}`);
      }
    } catch (error) {
      errors.push(`/skip-retyping/: static presentation audit failed on ${theme}: ${error.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }
}
async function auditProductHero(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push('/skip-retyping/: console error during product hero audit: ' + message.text());
      }
    });
    page.on('pageerror', (error) => {
      errors.push('/skip-retyping/: page error during product hero audit: ' + error.message);
    });
    await page.goto(origin + '/skip-retyping/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const media = document.querySelector('.demo-shell video, [data-skip-retyping-demo-poster]');
      return Boolean(
        media &&
        (media.tagName === 'VIDEO' || (media.complete && media.naturalWidth > 0)),
      );
    });

    const playback = await page.evaluate(() => {
      const button = document.querySelector('.demo-play-button');
      const video = document.querySelector('.demo-shell video');
      return {
        buttonState: button?.dataset.state || '',
        buttonLabel: button?.getAttribute('aria-label') || '',
        videoPresent: Boolean(video),
        videoPaused: video ? video.paused : null,
        hasDecorativeCanvas: Boolean(document.querySelector('.hero-3d-canvas')),
      };
    });
    if (playback.hasDecorativeCanvas) {
      errors.push('/skip-retyping/: decorative WebGL canvas returned');
    }
    if (playback.buttonState !== 'playing' || !/^Pause/.test(playback.buttonLabel)) {
      errors.push('/skip-retyping/: product demo must start in the playing state');
    }

    const demoButton = page.locator('.demo-play-button');
    await demoButton.click();
    await page.waitForTimeout(120);
    const pausedState = await demoButton.evaluate((button) => ({
      state: button.dataset.state,
      label: button.getAttribute('aria-label') || '',
    }));
    if (pausedState.state !== 'paused' || !/^Play/.test(pausedState.label)) {
      errors.push('/skip-retyping/: clicking the product demo did not pause it');
    }
    await demoButton.click();
    await page.waitForTimeout(120);
    const resumedState = await demoButton.evaluate((button) => ({
      state: button.dataset.state,
      label: button.getAttribute('aria-label') || '',
    }));
    if (resumedState.state !== 'playing' || !/^Pause/.test(resumedState.label)) {
      errors.push('/skip-retyping/: clicking the product demo again did not resume it');
    }

    const reviewRail = page.locator('.launch-review-rail');
    await reviewRail.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const rail = document.querySelector('.launch-review-rail');
      if (!rail) return;
      const header = document.querySelector('.launch-header');
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const top = rail.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
      window.scrollTo(0, Math.max(0, top));
    });
    await page.waitForFunction(() => {
      const rail = document.querySelector('.launch-review-rail');
      if (!rail) return false;
      const style = getComputedStyle(rail);
      return Number.parseFloat(style.opacity) > 0.98 && style.visibility === 'visible';
    });
    await page.waitForTimeout(700);
    const reviewPath = path.join(OUT_DIR, 'review-rail-motion-light.png');
    await reviewRail.screenshot({ path: reviewPath });
    const reviewStats = await sharp(reviewPath).stats();
    const reviewColorDeviation = reviewStats.channels
      .slice(0, 3)
      .reduce((sum, channel) => sum + channel.stdev, 0);
    if (reviewColorDeviation < 18) {
      errors.push(
        '/skip-retyping/: review-before-submit reveal capture appears blank (' +
        reviewColorDeviation.toFixed(2) + ')',
      );
    }
  } catch (error) {
    errors.push('/skip-retyping/: product hero audit failed: ' + error.message);
  } finally {
    await page.close();
    await context.close();
  }
}
async function auditContactSubmission(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  let capturedPayload = null;
  const directSendPattern = 'https://formsubmit.co/ajax/**';

  try {
    await page.route(directSendPattern, async (route) => {
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: 'true' }),
      });
    });

    await page.goto(`${origin}/contact/?topic=product&product=Skip%20Retyping`, {
      waitUntil: 'networkidle',
    });

    const sendButton = page.getByRole('button', { name: 'Send message' });
    if (!(await sendButton.isDisabled())) {
      errors.push('/contact/: direct-send button should be disabled before required fields are complete');
    }
    const initialStatus =
      (await page.locator('[data-contact-status]').textContent())?.trim() || '';
    if (initialStatus !== 'Add a name, email, and message to send.') {
      errors.push('/contact/: untouched form should show a calm setup prompt');
    }

    await page.locator('#contactName').fill('Release Tester');
    await page.locator('#contactReply').fill('release-test@example.com');
    await page.locator('#contactMessage').fill('The company field did not fill on the example signup page.');
    if (await sendButton.isDisabled()) {
      errors.push('/contact/: direct-send button stayed disabled after valid fields were complete');
      return;
    }

    await sendButton.click();
    await page.locator('[data-contact-status][data-state="success"]').waitFor();

    if (!capturedPayload) {
      errors.push('/contact/: direct-send request was not made');
    } else {
      const expected = {
        email: 'release-test@example.com',
        name: 'Release Tester',
        topic: 'Skip Retyping',
        reason: 'Question about Skip Retyping',
        _replyto: 'release-test@example.com',
        _captcha: 'false',
        _subject: 'Product: Question about Skip Retyping | Skip Retyping',
      };
      for (const [key, value] of Object.entries(expected)) {
        if (capturedPayload[key] !== value) {
          errors.push(`/contact/: direct-send payload ${key} mismatch`);
        }
      }
      if ('marketingConsent' in capturedPayload || 'directSendConsent' in capturedPayload) {
        errors.push('/contact/: removed consent fields returned to the direct-send payload');
      }
    }

    capturedPayload = null;
    await page.goto(
      `${origin}/contact/?topic=product&reason=uninstall&product=Skip%20Retyping`,
      { waitUntil: 'networkidle' },
    );
    const uninstallState = await page.evaluate(() => ({
      reason: document.getElementById('contactReason')?.value || '',
      reasonLabel:
        document.querySelector('#contactReason option:checked')?.textContent?.trim() || '',
      nameRequired: document.getElementById('contactName')?.required,
      emailRequired: document.getElementById('contactReply')?.required,
      note:
        document.querySelector('[data-contact-context-note]')?.textContent?.trim() || '',
    }));
    if (
      uninstallState.reason !== 'uninstall' ||
      uninstallState.reasonLabel !== 'I removed Skip Retyping'
    ) {
      errors.push('/contact/: uninstall feedback reason was not preselected');
    }
    if (uninstallState.nameRequired || uninstallState.emailRequired) {
      errors.push('/contact/: uninstall feedback should allow an anonymous note');
    }
    if (!/Name and email are optional/.test(uninstallState.note)) {
      errors.push('/contact/: uninstall feedback does not explain its optional fields');
    }
    await page
      .locator('#contactMessage')
      .fill('I could not fill the custom field on my application.');
    if (await sendButton.isDisabled()) {
      errors.push('/contact/: anonymous uninstall feedback stayed disabled');
    } else {
      await sendButton.click();
      await page.locator('[data-contact-status][data-state="success"]').waitFor();
      if (
        capturedPayload?.reason !== 'I removed Skip Retyping' ||
        'email' in (capturedPayload || {}) ||
        '_replyto' in (capturedPayload || {})
      ) {
        errors.push('/contact/: anonymous uninstall payload is incorrect');
      }
    }

    await page.unroute(directSendPattern);
    await page.route(directSendPattern, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Support form is temporarily unavailable.' }),
      });
    });

    await page.goto(`${origin}/contact/?topic=product&product=Skip%20Retyping`, {
      waitUntil: 'networkidle',
    });
    await page.locator('#contactName').fill('Release Tester');
    await page.locator('#contactReply').fill('release-test@example.com');
    await page.locator('#contactMessage').fill('Testing the email-app fallback after a send failure.');
    await sendButton.click();
    await page.locator('[data-contact-status][data-state="error"]').waitFor();
    if (await page.locator('[data-email-options]').isHidden()) {
      errors.push('/contact/: email-app fallback stayed hidden after direct-send failure');
    }
    const fallbackHref =
      (await page.locator('[data-compose-link="default"]').getAttribute('href')) || '';
    if (!decodeURIComponent(fallbackHref).includes('| Skip Retyping')) {
      errors.push('/contact/: email-app fallback subject is missing the Skip Retyping suffix');
    }
  } catch (error) {
    errors.push(`/contact/: submission audit failed: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

async function auditCheckoutPlanSelection(browser, origin, errors) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const expected = {
    free: 'Check Chrome availability',
    monthly: 'Check Chrome availability',
    yearly: 'Check Chrome availability',
    lifetime: 'Check Chrome availability',
  };

  try {
    for (const [plan, action] of Object.entries(expected)) {
      await page.goto(`${origin}/skip-retyping/checkout/?plan=${plan}`, {
        waitUntil: 'networkidle',
      });
      const state = await page.evaluate(() => ({
        selected: document.querySelector('[data-checkout-plan][aria-current="true"]')?.getAttribute('data-checkout-plan') || '',
        action: document.querySelector('[data-checkout-action]')?.textContent?.trim() || '',
      }));
      if (state.selected !== plan || state.action !== action) {
        errors.push(`/skip-retyping/checkout/: ${plan} selection regressed: ${JSON.stringify(state)}`);
      }
    }

    for (const invalidPlan of ['unknown']) {
      await page.goto(origin + '/skip-retyping/checkout/?plan=' + invalidPlan, {
        waitUntil: 'networkidle',
      });
      const fallback = await page
        .locator('[data-checkout-plan][aria-current="true"]')
        .getAttribute('data-checkout-plan');
      const lifetimeCard = await page.locator('[data-checkout-plan="lifetime"]').count();
      if (fallback !== 'lifetime' || lifetimeCard !== 1) {
        errors.push('/skip-retyping/checkout/: ' + invalidPlan + ' query exposed an unavailable plan');
      }
    }  } catch (error) {
    errors.push(`/skip-retyping/checkout/: plan interaction audit failed: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

async function auditDemoPlayback(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const reducedPage = await reducedContext.newPage();

  try {
    await page.goto(`${origin}/skip-retyping/`, { waitUntil: 'networkidle' });
    await page.locator('.demo-shell video').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const video = document.querySelector('.demo-shell video');
      return Boolean(video && !video.paused && video.currentTime > 0);
    });
    const pauseButton = page.getByRole('button', { name: 'Pause the Skip Retyping demo' });
    await pauseButton.click();
    await page.waitForFunction(() => document.querySelector('.demo-shell video')?.paused);
    const playButton = page.getByRole('button', { name: 'Play the Skip Retyping demo' });
    await playButton.click();
    await page.waitForFunction(() => !document.querySelector('.demo-shell video')?.paused);
    await page.getByRole('button', { name: 'Pause the Skip Retyping demo' }).waitFor();
    await page.locator('.launch-demo-card').screenshot({
      path: path.join(OUT_DIR, 'hero-demo-playing.png'),
    });

    await reducedPage.goto(`${origin}/skip-retyping/`, { waitUntil: 'networkidle' });
    await reducedPage.locator('.demo-shell video').waitFor({ state: 'visible' });
    const reducedState = await reducedPage.evaluate(() => ({
      paused: document.querySelector('.demo-shell video')?.paused,
      label: document.querySelector('.demo-play-button')?.getAttribute('aria-label'),
    }));
    if (!reducedState.paused || reducedState.label !== 'Play the Skip Retyping demo') {
      errors.push(`/skip-retyping/: reduced-motion demo state regressed: ${JSON.stringify(reducedState)}`);
    }
  } catch (error) {
    errors.push(`/skip-retyping/: hero demo playback failed: ${error.message}`);
  } finally {
    await page.close();
    await reducedPage.close();
    await context.close();
    await reducedContext.close();
  }
}

async function auditSmartRuleLab(browser, origin, errors) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${origin}/skip-retyping/docs/smart-rules/`, { waitUntil: 'networkidle' });
    const label = page.locator('#ruleLabLabel');
    const match = page.locator('#ruleLabMatch');
    const result = page.locator('[data-rule-result]');
    await label.fill('Business contact address');
    await match.fill('work email');
    if (!/No match/.test(await result.textContent())) {
      errors.push('/skip-retyping/docs/smart-rules/: mismatch guidance did not appear');
    }
    await page.getByRole('button', { name: 'Portfolio' }).click();
    const labelFocused = await label.evaluate((node) => document.activeElement === node);
    if (!/Match found/.test(await result.textContent()) || !labelFocused) {
      errors.push('/skip-retyping/docs/smart-rules/: preset did not update the example and return focus');
    }
    await label.fill('Work-email address');
    await match.fill('/work.?email/i');
    if (!/Match found/.test(await result.textContent())) {
      errors.push('/skip-retyping/docs/smart-rules/: optional regex example did not match');
    }
    await match.fill('/[/');
    if (!/not valid/.test(await result.textContent())) {
      errors.push('/skip-retyping/docs/smart-rules/: invalid regex guidance did not appear');
    }
    if (pageErrors.length) {
      errors.push(`/skip-retyping/docs/smart-rules/: console/page errors: ${pageErrors.join(' | ')}`);
    }
  } catch (error) {
    errors.push(`/skip-retyping/docs/smart-rules/: interactive guide failed: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function auditInstalledExtensionState(browser, origin, errors) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.addInitScript(() => {
      window.__fillProBridgeMessages = [];
      window.__SKIP_RETYPING_TEST_EXTENSION_IDS__ = ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'];
      window.chrome = {
        runtime: {
          lastError: null,
          sendMessage(extensionId, message, callback) {
            window.__fillProBridgeMessages.push(message);
            if (extensionId !== 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') {
              callback(undefined);
              return;
            }
            callback(
              message?.action === 'getPublicInstallState'
                ? { installed: true, version: '1.0.0' }
                : { ok: true, surface: 'action_popup' },
            );
          },
        },
      };
    });
    await page.goto(`${origin}/skip-retyping/checkout/?plan=yearly`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.skipRetypingInstalled === 'true');
    const report = await page.evaluate(() => ({
      note: document.querySelector('[data-installed-note]')?.textContent?.trim() || '',
      free: document.querySelector('[data-checkout-plan="free"] .launch-button')?.textContent?.trim() || '',
      monthly: document.querySelector('[data-checkout-plan="monthly"] .launch-button')?.textContent?.trim() || '',
      yearly: document.querySelector('[data-checkout-plan="yearly"] .launch-button')?.textContent?.trim() || '',
      hero: document.querySelector('[data-checkout-action]')?.textContent?.trim() || '',
      nav: Array.from(document.querySelectorAll('.launch-links a')).map((node) => node.textContent.trim()),
      title: document.getElementById('checkout-title')?.textContent?.trim() || '',
    }));
    if (
      !/from the toolbar/.test(report.note) ||
      report.free !== 'Open Skip Retyping' ||
      report.monthly !== 'Choose monthly in Skip Retyping' ||
      report.yearly !== 'Choose yearly in Skip Retyping' ||
      report.hero !== 'Choose yearly in Skip Retyping' ||
      report.nav.includes('Open Skip Retyping') ||
      report.title !== 'Skip Retyping is already installed.'
    ) {
      errors.push(`/skip-retyping/checkout/: installed-extension state regressed: ${JSON.stringify(report)}`);
    }
    await page.locator('[data-checkout-plan="monthly"] .launch-button').click();
    await page.locator('[data-checkout-plan="free"] .launch-button').click();
    const bridgeMessages = await page.evaluate(() => window.__fillProBridgeMessages);
    if (
      !bridgeMessages.some(
        (message) => message?.action === 'openPublicPlan' && message.plan === 'monthly',
      ) ||
      !bridgeMessages.some((message) => message?.action === 'openPublicSurface')
    ) {
      errors.push(`/skip-retyping/checkout/: installed CTA bridge regressed: ${JSON.stringify(bridgeMessages)}`);
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'checkout-installed-extension-dark.png'), fullPage: true });

    await page.goto(`${origin}/skip-retyping/de/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.skipRetypingInstalled === 'true');
    const germanActions = await page
      .locator('main a[data-installed-action="installed"]')
      .allTextContents();
    if (!germanActions.length || germanActions.some((label) => label.trim() !== 'Skip Retyping öffnen')) {
      errors.push(`/skip-retyping/de/: installed CTA was not localized: ${JSON.stringify(germanActions)}`);
    }
  } catch (error) {
    errors.push(`/skip-retyping/checkout/: installed-extension audit failed: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true, maxRetries: 8, retryDelay: 125 });
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
          bypassCSP: true,
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
    await auditStaticPresentation(browser, server.origin, errors);
    await auditProductHero(browser, server.origin, errors);
    await auditDemoPlayback(browser, server.origin, errors);
    await auditContactSubmission(browser, server.origin, errors);
    await auditCheckoutPlanSelection(browser, server.origin, errors);
    await auditSmartRuleLab(browser, server.origin, errors);
    await auditInstalledExtensionState(browser, server.origin, errors);
    checks += 7;
  } finally {
    await browser.close();
    await server.close();
  }

  if (errors.length) {
    console.error(`Skip Retyping release experience audit failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    console.error(`Screenshots saved to ${OUT_DIR}`);
    process.exit(1);
  }

  console.log(
    `Skip Retyping release experience audit passed: ${checks} rendered page checks, ${ROUTES.length} routes, ${VIEWPORTS.length} viewports, ${THEMES.length} themes. Screenshots saved to ${OUT_DIR}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
