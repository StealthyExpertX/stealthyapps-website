const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.tmp', 'release-experience-audit');
const THEMES = ['light', 'dark'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];
const ROUTES = [
  '/fillpro/',
  '/fillpro/checkout/',
  '/fillpro/privacy/',
  '/fillpro/docs/smart-rules/',
  '/fillpro/download/',
  '/fillpro/download/chrome/',
  '/fillpro/download/edge/',
  '/fillpro/download/firefox/',
  '/support/',
  '/contact/',
  '/fillpro/job-application-autofill/',
  '/fillpro/resume-upload-autofill/',
  '/fillpro/local-form-autofill/',
  '/fillpro/browser-autofill-vs-fillpro/',
  '/fillpro/de/',
  '/fillpro/es/',
  '/fillpro/fr/',
  '/fillpro/pt-br/',
  '/fillpro/ja/',
  '/fillpro/ko/',
  '/fillpro/zh-cn/',
  '/fillpro/ru/',
];
const LOCALIZED_THEME_MARKERS = {
  '/fillpro/de/': ['Aktuelles Design:', 'Wechseln zu:'],
  '/fillpro/es/': ['Tema actual:', 'Cambiar a:'],
  '/fillpro/fr/': ['Thème actuel :', 'Passer au thème'],
  '/fillpro/pt-br/': ['Tema atual:', 'Mudar para:'],
  '/fillpro/ja/': ['現在のテーマ:', 'テーマに切り替えます'],
  '/fillpro/ko/': ['현재 테마:', '테마로 전환합니다'],
  '/fillpro/zh-cn/': ['当前主题：', '切换到'],
  '/fillpro/ru/': ['Текущая тема:', 'Переключить на тему'],
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

  const pathname = new URL(route).pathname;
  if (pathname === '/fillpro/') {
    try {
      await page.mouse.move(Math.max(12, viewport.width - 24), 120);
      await page.waitForFunction(
        () => document.documentElement.classList.contains('hero-3d-ready'),
        null,
        { timeout: 8000 },
      );
      await page.locator('.launch-hero').screenshot({
        path: path.join(OUT_DIR, `hero-visual-${viewport.name}-${theme}.png`),
      });
      const canvas = page.locator('.hero-3d-canvas');
      const canvasPath = path.join(OUT_DIR, `hero-3d-${viewport.name}-${theme}.png`);
      await canvas.screenshot({ path: canvasPath });
      const stats = await sharp(canvasPath).stats();
      const alphaMean = stats.channels[3] ? stats.channels[3].mean : 255;
      const colorDeviation = stats.channels
        .slice(0, 3)
        .reduce((sum, channel) => sum + channel.stdev, 0);
      const contextReport = await page.evaluate(() => {
        const canvas = document.querySelector('.hero-3d-canvas');
        const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
        return {
          hasContext: Boolean(gl),
          width: gl?.drawingBufferWidth || 0,
          height: gl?.drawingBufferHeight || 0,
        };
      });
      if (!contextReport.hasContext || contextReport.width < 1 || contextReport.height < 1) {
        errors.push(
          `${route}: hero 3D WebGL context is unavailable on ${viewport.name}/${theme}: ${JSON.stringify(contextReport)}`,
        );
      }
      if (alphaMean < 0.5 || colorDeviation < 2) {
        errors.push(
          `${route}: captured hero 3D pixels appear blank on ${viewport.name}/${theme} (alpha ${alphaMean.toFixed(2)}, deviation ${colorDeviation.toFixed(2)})`,
        );
      }

      const framingReport = await page.evaluate(() => {
        const canvas = document.querySelector('.hero-3d-canvas');
        const demo = document.querySelector('.launch-demo-card');
        const copy = document.querySelector('.launch-hero-copy');
        if (!canvas || !demo || !copy) return { ok: false };

        const rect = (element) => {
          const bounds = element.getBoundingClientRect();
          return {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
            width: bounds.width,
            height: bounds.height,
          };
        };
        const overlapArea = (a, b) => {
          const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          return width * height;
        };

        const canvasRect = rect(canvas);
        const demoRect = rect(demo);
        const copyRect = rect(copy);
        const demoArea = demoRect.width * demoRect.height || 1;
        return {
          ok: true,
          canvasOpacity: Number.parseFloat(window.getComputedStyle(canvas).opacity) || 0,
          demoOverlapRatio: overlapArea(canvasRect, demoRect) / demoArea,
          copyToDemoOverlap: overlapArea(canvasRect, copyRect) / Math.max(overlapArea(canvasRect, demoRect), 1),
        };
      });
      if (!framingReport.ok) {
        errors.push(`${route}: hero 3D framing elements are missing on ${viewport.name}/${theme}`);
      } else {
        if (framingReport.canvasOpacity < 0.08) {
          errors.push(
            `${route}: hero 3D layer is too faint to be a useful product visual on ${viewport.name}/${theme} (${framingReport.canvasOpacity.toFixed(2)})`,
          );
        }
        if (framingReport.demoOverlapRatio < 0.45) {
          errors.push(
            `${route}: hero 3D layer is not anchored to the product demo on ${viewport.name}/${theme} (${framingReport.demoOverlapRatio.toFixed(2)})`,
          );
        }
        if (framingReport.copyToDemoOverlap > 0.55) {
          errors.push(
            `${route}: hero 3D layer is competing with the hero copy on ${viewport.name}/${theme} (${framingReport.copyToDemoOverlap.toFixed(2)})`,
          );
        }
      }

      const demoShellReport = await page.evaluate(() => {
        const shell = document.querySelector('.demo-shell');
        if (!shell) return { ok: false };
        const style = getComputedStyle(shell);
        return {
          ok: true,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          scrollbarWidth: style.scrollbarWidth || '',
        };
      });
      if (!demoShellReport.ok) {
        errors.push(`${route}: hero demo shell missing on ${viewport.name}/${theme}`);
      } else if (demoShellReport.scrollbarWidth !== 'none' || demoShellReport.overflowY !== 'hidden') {
        errors.push(
          `${route}: hero demo shell scrollbar can become visible on ${viewport.name}/${theme}: ${JSON.stringify(demoShellReport)}`,
        );
      }
    } catch (error) {
      errors.push(`${route}: hero 3D canvas check failed on ${viewport.name}/${theme}: ${error.message}`);
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
        return button
          ? {
              mode: button.dataset.theme || '',
              resolved: button.dataset.resolvedTheme || '',
              label: button.getAttribute('aria-label') || '',
              title: button.getAttribute('title') || '',
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

async function imageMeanDifference(leftPath, rightPath) {
  const left = await sharp(leftPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const right = await sharp(rightPath)
    .resize(left.info.width, left.info.height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  let diff = 0;
  for (let index = 0; index < left.data.length; index += 4) {
    diff += Math.abs(left.data[index] - right[index]);
    diff += Math.abs(left.data[index + 1] - right[index + 1]);
    diff += Math.abs(left.data[index + 2] - right[index + 2]);
  }
  return diff / (left.info.width * left.info.height * 3);
}

async function auditPointerGlow(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    hasTouch: false,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  try {
    await page.addInitScript(() => {
      window.localStorage.setItem('fillpro-theme', 'dark');
    });
    await page.goto(`${origin}/fillpro/`, { waitUntil: 'networkidle' });

    const downloads = page.locator('.launch-downloads');
    await downloads.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await page.mouse.move(260, 520);
    await page.waitForTimeout(240);

    const glowReport = await page.evaluate(() => {
      const root = document.documentElement;
      const glowElement = document.querySelector('.site-pointer-glow');
      const glow = glowElement ? getComputedStyle(glowElement) : null;
      const localSelectors = [
        '.launch-downloads',
        '.launch-section',
        '.review-rail-stage',
        '.trust-page .section',
      ];
      return {
        active: root.classList.contains('pointer-glow-active'),
        hasGlowElement: Boolean(glowElement),
        x: root.style.getPropertyValue('--pointer-x'),
        y: root.style.getPropertyValue('--pointer-y'),
        position: glow ? glow.position : '',
        inset: glow ? [glow.top, glow.right, glow.bottom, glow.left] : [],
        opacity: glow ? Number.parseFloat(glow.opacity) : 0,
        localPointerDecorations: localSelectors.filter((selector) => {
          const element = document.querySelector(selector);
          if (!element) return false;
          const style = getComputedStyle(element, '::before');
          return `${style.backgroundImage} ${style.maskImage}`.includes('--pointer-');
        }),
      };
    });

    if (!glowReport.active) errors.push('/fillpro/: pointer glow did not activate for a fine pointer');
    if (!glowReport.hasGlowElement) errors.push('/fillpro/: pointer glow element was not installed');
    if (glowReport.position !== 'fixed' || glowReport.inset.some((value) => value !== '0px')) {
      errors.push(`/fillpro/: pointer glow is not viewport-wide (${JSON.stringify(glowReport)})`);
    }
    if (!/^260px$/.test(glowReport.x) || !/^520px$/.test(glowReport.y)) {
      errors.push(`/fillpro/: pointer glow did not track viewport pixels (${glowReport.x}, ${glowReport.y})`);
    }
    if (glowReport.opacity < 0.99) errors.push('/fillpro/: pointer glow remained visually inactive');
    if (glowReport.localPointerDecorations.length) {
      errors.push(`/fillpro/: section-local pointer glow returned: ${glowReport.localPointerDecorations.join(', ')}`);
    }

    const downloadsLeft = path.join(OUT_DIR, 'pointer-glow-downloads-dark-left.png');
    const downloadsRight = path.join(OUT_DIR, 'pointer-glow-downloads-dark-right.png');
    await page.screenshot({ path: downloadsLeft });
    await page.mouse.move(1180, 520);
    await page.waitForTimeout(240);
    await page.screenshot({ path: downloadsRight });
    const pointerDiff = await imageMeanDifference(downloadsLeft, downloadsRight);
    if (pointerDiff < 0.02) {
      errors.push(`/fillpro/: pointer glow did not visibly follow the cursor (${pointerDiff.toFixed(3)})`);
    }

    const reviewRail = page.locator('.launch-review-rail');
    await reviewRail.scrollIntoViewIfNeeded();
    await page.waitForTimeout(650);
    await page.mouse.move(980, 500);
    await page.waitForTimeout(240);
    await page.screenshot({ path: path.join(OUT_DIR, 'pointer-glow-review-dark.png') });
  } catch (error) {
    errors.push(`/fillpro/: pointer glow audit failed: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

async function auditHeroSceneMotion(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`/fillpro/: console error during hero 3D motion audit: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      errors.push(`/fillpro/: page error during hero 3D motion audit: ${error.message}`);
    });
    await page.goto(`${origin}/fillpro/`, { waitUntil: 'networkidle' });
    await page.mouse.move(1120, 160);
    await page.waitForFunction(
      () => document.documentElement.classList.contains('hero-3d-ready'),
      null,
      { timeout: 8000 },
    );
    const canvas = page.locator('.hero-3d-canvas');
    const before = path.join(OUT_DIR, 'hero-3d-motion-before.png');
    const after = path.join(OUT_DIR, 'hero-3d-motion-after.png');
    await canvas.screenshot({ path: before });
    await page.mouse.move(1180, 190);
    await page.waitForTimeout(450);
    await canvas.screenshot({ path: after });
    const meanDiff = await imageMeanDifference(before, after);
    if (meanDiff < 0.18) {
      errors.push(`/fillpro/: hero 3D scene did not show enough motion/interaction difference (${meanDiff.toFixed(3)})`);
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
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
      if (!document.documentElement.classList.contains('reveal-ready')) return false;
      return rail.classList.contains('is-visible') || Number.parseFloat(getComputedStyle(rail).opacity) > 0.98;
    });
    await page.waitForTimeout(700);
    const reviewPath = path.join(OUT_DIR, 'review-rail-motion-light.png');
    await reviewRail.screenshot({ path: reviewPath });
    const reviewStats = await sharp(reviewPath).stats();
    const reviewColorDeviation = reviewStats.channels
      .slice(0, 3)
      .reduce((sum, channel) => sum + channel.stdev, 0);
    if (reviewColorDeviation < 18) {
      errors.push(`/fillpro/: review-before-submit reveal capture appears blank (${reviewColorDeviation.toFixed(2)})`);
    }
  } catch (error) {
    errors.push(`/fillpro/: hero 3D motion audit failed: ${error.message}`);
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

    await page.goto(`${origin}/contact/?topic=product&product=FillPro`, {
      waitUntil: 'networkidle',
    });

    const sendButton = page.getByRole('button', { name: 'Send message' });
    if (!(await sendButton.isDisabled())) {
      errors.push('/contact/: direct-send button should be disabled before required fields are complete');
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
        topic: 'FillPro',
        reason: 'Question about FillPro',
        _replyto: 'release-test@example.com',
        _captcha: 'false',
        _subject: 'Product: Question about FillPro | FillPro',
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
      `${origin}/contact/?topic=product&reason=uninstall&product=FillPro`,
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
      uninstallState.reasonLabel !== 'I removed FillPro'
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
        capturedPayload?.reason !== 'I removed FillPro' ||
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

    await page.goto(`${origin}/contact/?topic=product&product=FillPro`, {
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
    if (!decodeURIComponent(fallbackHref).includes('| FillPro')) {
      errors.push('/contact/: email-app fallback subject is missing the FillPro suffix');
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
    free: 'Install FillPro',
    monthly: 'Install, then choose monthly',
    yearly: 'Install, then choose yearly',
    lifetime: 'Install, then choose lifetime',
  };

  try {
    for (const [plan, action] of Object.entries(expected)) {
      await page.goto(`${origin}/fillpro/checkout/?plan=${plan}`, {
        waitUntil: 'networkidle',
      });
      const state = await page.evaluate(() => ({
        selected: document.querySelector('[data-checkout-plan][aria-current="true"]')?.getAttribute('data-checkout-plan') || '',
        action: document.querySelector('[data-checkout-action]')?.textContent?.trim() || '',
      }));
      if (state.selected !== plan || state.action !== action) {
        errors.push(`/fillpro/checkout/: ${plan} selection regressed: ${JSON.stringify(state)}`);
      }
    }

    await page.goto(`${origin}/fillpro/checkout/?plan=unknown`, {
      waitUntil: 'networkidle',
    });
    const fallback = await page
      .locator('[data-checkout-plan][aria-current="true"]')
      .getAttribute('data-checkout-plan');
    if (fallback !== 'yearly') {
      errors.push('/fillpro/checkout/: invalid plan query did not fall back to yearly');
    }
  } catch (error) {
    errors.push(`/fillpro/checkout/: plan interaction audit failed: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
  }
}

async function auditDemoPlayback(browser, origin, errors) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  try {
    await page.goto(`${origin}/fillpro/`, { waitUntil: 'networkidle' });
    const button = page.getByRole('button', { name: 'Play the two-second FillPro demo' });
    await button.click();
    await page.locator('.demo-shell video').waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const video = document.querySelector('.demo-shell video');
      return Boolean(video && !video.paused && video.currentTime > 0);
    });
    if (await button.count()) {
      errors.push('/fillpro/: demo play button remained after playback started');
    }
    await page.locator('.launch-demo-card').screenshot({
      path: path.join(OUT_DIR, 'hero-demo-playing.png'),
    });
  } catch (error) {
    errors.push(`/fillpro/: hero demo playback failed: ${error.message}`);
  } finally {
    await page.close();
    await context.close();
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
    await auditPointerGlow(browser, server.origin, errors);
    await auditHeroSceneMotion(browser, server.origin, errors);
    await auditDemoPlayback(browser, server.origin, errors);
    await auditContactSubmission(browser, server.origin, errors);
    await auditCheckoutPlanSelection(browser, server.origin, errors);
    checks += 5;
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
