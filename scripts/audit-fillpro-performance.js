const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ROUTES = [
  '/fillahead/',
  '/fillahead/checkout/',
  '/fillahead/docs/getting-started/',
];
const SAMPLE_COUNT = 3;
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
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function resolveFile(rawUrl) {
  const url = new URL(rawUrl, 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!path.extname(pathname)) pathname += '.html';
  const target = path.resolve(ROOT, '.' + pathname);
  return target.startsWith(ROOT) ? target : null;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const target = resolveFile(request.url);
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', CONTENT_TYPES[path.extname(target)] || 'application/octet-stream');
      response.end(fs.readFileSync(target));
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({
        origin: 'http://127.0.0.1:' + server.address().port,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function measureRoute(browser, origin, route) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const firstPartyErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') firstPartyErrors.push(message.text());
  });
  page.on('pageerror', (error) => firstPartyErrors.push(error.message));

  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      connectionType: 'cellular4g',
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.addInitScript(() => {
      window.__fillaheadPerformance = { cls: 0, lcp: 0, layoutShifts: [], longTasks: [] };
      if (!window.PerformanceObserver) return;
      const supported = PerformanceObserver.supportedEntryTypes || [];
      if (supported.includes('largest-contentful-paint')) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latest = entries[entries.length - 1];
          if (latest) window.__fillaheadPerformance.lcp = latest.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }
      if (supported.includes('layout-shift')) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__fillaheadPerformance.cls += entry.value;
              window.__fillaheadPerformance.layoutShifts.push({
                value: entry.value,
                sources: Array.from(entry.sources || []).map((source) => {
                  const node = source.node;
                  return {
                    node: node
                      ? node.tagName.toLowerCase()
                        + (node.id ? '#' + node.id : '')
                        + (node.classList && node.classList.length
                          ? '.' + Array.from(node.classList).join('.')
                          : '')
                      : '',
                    previousRect: source.previousRect,
                    currentRect: source.currentRect,
                  };
                }),
              });
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      }
      if (supported.includes('longtask')) {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__fillaheadPerformance.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: Array.from(entry.attribution || []).map((item) => ({
                name: item.name || '',
                containerName: item.containerName || '',
                containerSrc: item.containerSrc || '',
              })),
            });
          }
        }).observe({ type: 'longtask', buffered: true });
      }
    });

    const response = await page.goto(origin + route, { waitUntil: 'load', timeout: 30000 });
    if (!response || !response.ok()) {
      throw new Error('load failed (' + (response ? response.status() : 'no response') + ')');
    }
    await page.waitForTimeout(1200);

    const metrics = await page.evaluate(() => {
      const state = window.__fillaheadPerformance || {
        cls: 0,
        lcp: 0,
        layoutShifts: [],
        longTasks: [],
      };
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const sum = (key) => resources.reduce((total, entry) => total + (entry[key] || 0), 0);
      return {
        cls: state.cls,
        layoutShifts: state.layoutShifts,
        lcpMs: state.lcp,
        maxLongTaskMs: state.longTasks.length
          ? Math.max(...state.longTasks.map((task) => task.duration))
          : 0,
        totalLongTaskMs: state.longTasks.reduce((total, task) => total + task.duration, 0),
        totalBlockingTimeMs: state.longTasks.reduce(
          (total, task) => total + Math.max(task.duration - 50, 0),
          0,
        ),
        longTasks: state.longTasks,
        domContentLoadedMs: navigation ? navigation.domContentLoadedEventEnd : 0,
        loadMs: navigation ? navigation.loadEventEnd : 0,
        resourceCount: resources.length,
        transferBytes: sum('transferSize'),
        decodedBytes: sum('decodedBodySize'),
      };
    });
    return { route, metrics, firstPartyErrors };
  } finally {
    await page.close();
    await context.close();
  }
}

function median(values) {
  const ordered = values.slice().sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function medianReport(route, samples) {
  const metricNames = [
    'cls',
    'lcpMs',
    'maxLongTaskMs',
    'totalLongTaskMs',
    'totalBlockingTimeMs',
    'domContentLoadedMs',
    'loadMs',
    'resourceCount',
    'transferBytes',
    'decodedBytes',
  ];
  const metrics = {};
  metricNames.forEach((name) => {
    metrics[name] = median(samples.map((sample) => sample.metrics[name]));
  });
  metrics.maxCls = Math.max(...samples.map((sample) => sample.metrics.cls));
  const representative = samples
    .slice()
    .sort(
      (left, right) =>
        left.metrics.maxLongTaskMs - right.metrics.maxLongTaskMs,
    )[Math.floor(samples.length / 2)];
  metrics.longTasks = representative.metrics.longTasks;
  const worstShiftSample = samples
    .slice()
    .sort((left, right) => right.metrics.cls - left.metrics.cls)[0];
  metrics.layoutShifts = worstShiftSample.metrics.layoutShifts;
  metrics.samples = samples.map((sample) => ({
    lcpMs: sample.metrics.lcpMs,
    cls: sample.metrics.cls,
    maxLongTaskMs: sample.metrics.maxLongTaskMs,
    totalBlockingTimeMs: sample.metrics.totalBlockingTimeMs,
  }));
  return {
    route,
    metrics,
    firstPartyErrors: samples.flatMap((sample) => sample.firstPartyErrors),
  };
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const failures = [];
  const reports = [];
  try {
    for (const route of ROUTES) {
      const samples = [];
      for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
        samples.push(await measureRoute(browser, server.origin, route));
      }
      const report = medianReport(route, samples);
      reports.push(report);
      const metrics = report.metrics;
      if (report.firstPartyErrors.length) {
        failures.push(route + ': console/page errors ' + report.firstPartyErrors.join(' | '));
      }
      if (!metrics.lcpMs || metrics.lcpMs > 2500) {
        failures.push(route + ': LCP ' + Math.round(metrics.lcpMs) + 'ms exceeds 2500ms');
      }
      if (metrics.maxCls > 0.05) {
        failures.push(route + ': worst-sample CLS ' + metrics.maxCls.toFixed(3) + ' exceeds 0.05');
      }
      if (metrics.maxLongTaskMs > 450) {
        failures.push(route + ': median max long task ' + Math.round(metrics.maxLongTaskMs) + 'ms exceeds 450ms');
      }
      if (metrics.totalLongTaskMs > 650) {
        failures.push(route + ': median total long tasks ' + Math.round(metrics.totalLongTaskMs) + 'ms exceeds 650ms');
      }
      if (metrics.totalBlockingTimeMs > 500) {
        failures.push(route + ': median total blocking time ' + Math.round(metrics.totalBlockingTimeMs) + 'ms exceeds 500ms');
      }
      if (metrics.domContentLoadedMs > 2500) {
        failures.push(route + ': DOMContentLoaded ' + Math.round(metrics.domContentLoadedMs) + 'ms exceeds 2500ms');
      }
      if (metrics.loadMs > 4000) failures.push(route + ': load ' + Math.round(metrics.loadMs) + 'ms exceeds 4000ms');
      if (metrics.resourceCount > 24) failures.push(route + ': ' + metrics.resourceCount + ' resources exceeds 24');
      if (metrics.transferBytes > 750 * 1024) {
        failures.push(route + ': transfer ' + metrics.transferBytes + ' bytes exceeds 750 KiB');
      }
      if (metrics.decodedBytes > 1024 * 1024) {
        failures.push(route + ': decoded payload ' + metrics.decodedBytes + ' bytes exceeds 1 MiB');
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (failures.length) {
    console.error('FillAhead performance audit failed with ' + failures.length + ' issue(s):');
    failures.forEach((failure) => console.error('- ' + failure));
    console.error(JSON.stringify(reports, null, 2));
    process.exit(1);
  }
  const summary = reports.map((report) => Object.assign({ route: report.route }, report.metrics));
  console.log('FillAhead throttled performance audit passed: ' + JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
