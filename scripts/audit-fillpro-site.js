const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const CACHE_TOKEN = 'fillpro-launch-v32';
const INDEXNOW_KEY = '6a8bacc93dd54d8d2e9d685deb98159a40be6fa6023b7f5d';
const PUBLIC_NAV = ['Product', 'Pricing', 'Privacy', 'Support', 'Contact'];
const FOOTER_LINKS = ['Product', 'Pricing', 'Privacy', 'Support', 'Contact', 'Sitemap'];
const STALE_COPY = [
  'Local profiles',
  'Local-first',
  'local-first',
  'local profiles',
  'local data',
  'profile data on your device',
  'Chrome extension storage',
  'app.vendorportal.example',
  'vendorportal.example',
  'Questions people ask',
  'Plain answers',
  '/apps/fillpro/',
  '/apps/fillpro/privacy',
];

const failures = [];
const checked = {
  html: 0,
  jsonLd: 0,
  images: 0,
  footers: 0,
  navs: 0,
  accessibility: 0,
  metadata: 0,
};

function fail(message) {
  failures.push(message);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function attr(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function metaContent(html, name) {
  const match = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
  );
  return match ? match[1] : '';
}

function hasMetaRefresh(html) {
  return /<meta[^>]+http-equiv=["']refresh["']/i.test(html);
}

function checkJsonLd(file, html) {
  const csp = html.match(
    /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']+)/i,
  );
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    if (!/type=["']application\/ld\+json["']/i.test(script[1])) continue;
    checked.jsonLd += 1;
    try {
      JSON.parse(script[2]);
    } catch (error) {
      fail(`${rel(file)}: invalid JSON-LD (${error.message})`);
    }
    if (csp && /script-src/.test(csp[1]) && !/script-src[^;]*'unsafe-inline'/.test(csp[1])) {
      const hash = crypto.createHash('sha256').update(script[2]).digest('base64');
      if (!csp[1].includes(`'sha256-${hash}'`)) {
        fail(`${rel(file)}: CSP missing JSON-LD hash ${hash}`);
      }
    }
  }
}

function checkImages(file, html) {
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (!src.startsWith('/')) continue;
    checked.images += 1;
    if (!fs.existsSync(path.join(ROOT, src))) {
      fail(`${rel(file)}: missing image ${src}`);
    }
  }
}

function checkFooter(file, html) {
  if (!/<footer\b/i.test(html)) return;
  checked.footers += 1;
  if (!/class=["'][^"']*footer-copy/.test(html)) fail(`${rel(file)}: footer missing footer-copy`);
  if (!/class=["'][^"']*footer-links/.test(html)) fail(`${rel(file)}: footer missing footer-links`);
  for (const label of FOOTER_LINKS) {
    if (!new RegExp(`>${label}<`).test(html)) fail(`${rel(file)}: footer missing ${label}`);
  }
  if (/\|\s*<a\b|<\/a>\s*\|/i.test(html)) fail(`${rel(file)}: footer still uses pipe-separated links`);
}

function checkNav(file, html) {
  if (!/<nav\b/i.test(html)) return;
  checked.navs += 1;
  const fileRel = rel(file);
  const isPublicUtilityPage =
    fileRel.startsWith('contact/') ||
    fileRel.startsWith('support/') ||
    fileRel.startsWith('fillpro/privacy/') ||
    fileRel.includes('/job-application-autofill/') ||
    fileRel.includes('/resume-upload-autofill/') ||
    fileRel.includes('/local-form-autofill/') ||
    fileRel.includes('/browser-autofill-vs-fillpro/') ||
    fileRel === '404.html' ||
    fileRel === 'sitemap.html';
  if (!isPublicUtilityPage) return;
  for (const label of PUBLIC_NAV) {
    if (!new RegExp(`>${label}<`).test(html)) fail(`${fileRel}: nav missing ${label}`);
  }
}

function checkMetadata(file, html) {
  checked.metadata += 1;
  const fileRel = rel(file);
  if (!/^<!doctype html>/i.test(html.trim())) fail(`${fileRel}: missing doctype`);
  if (!/<html[^>]+lang=["'][a-z-]+["']/i.test(html)) fail(`${fileRel}: missing html lang`);
  const viewport = metaContent(html, 'viewport');
  if (!viewport) fail(`${fileRel}: missing viewport`);
  if (/user-scalable\s*=\s*no/i.test(viewport)) fail(`${fileRel}: disables zoom`);
  if (hasMetaRefresh(html)) return;
  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
  const description = metaContent(html, 'description');
  if (title.trim().length < 10) fail(`${fileRel}: title too short`);
  if (description.trim().length < 50 || description.trim().length > 180) {
    fail(`${fileRel}: meta description length should be 50-180 chars`);
  }
  if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/stealthyapps\.com\//i.test(html)) {
    fail(`${fileRel}: missing canonical stealthyapps URL`);
  }
  if (/<main\b/i.test(html) && !/<a[^>]+class=["'][^"']*skip-link/.test(html)) {
    fail(`${fileRel}: main page missing skip link`);
  }
  if (/<main\b/i.test(html) && !/<h1\b/i.test(html)) fail(`${fileRel}: main page missing h1`);
}

function checkStyles() {
  const cssPath = path.join(ROOT, 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  checked.accessibility += 1;
  const required = [
    [':focus-visible', 'focus-visible styles'],
    ['prefers-reduced-motion', 'reduced-motion support'],
    ['min-height: 46px', 'standard button tap target'],
    ['min-height: 52px', 'landing button tap target'],
    ['min-height: 34px', 'footer link tap target'],
    ['clip-path: inset(50%)', 'non-overflow honeypot hiding'],
    ['.launch-footer', 'landing footer rules'],
    ['width: 100%', 'full-width landing footer'],
    ['max(24px, calc((100vw - 1220px) / 2))', 'responsive landing footer padding'],
  ];
  for (const [needle, label] of required) {
    if (!css.includes(needle)) fail(`styles.css: missing ${label}`);
  }
}

function checkCacheToken(files) {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  if (!sw.includes(CACHE_TOKEN)) fail('sw.js: missing current cache token');
  for (const file of files.filter((item) => item.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    if ((/styles\.css\?v=/.test(html) || /site\.js\?v=/.test(html)) && !html.includes(CACHE_TOKEN)) {
      fail(`${rel(file)}: stale cache token`);
    }
  }
}

function checkIndexNowKey() {
  const keyFile = path.join(ROOT, `${INDEXNOW_KEY}.txt`);
  if (!/^[A-Za-z0-9-]{8,128}$/.test(INDEXNOW_KEY)) fail('IndexNow key has invalid format');
  if (!fs.existsSync(keyFile)) fail('IndexNow key file missing at site root');
  else if (fs.readFileSync(keyFile, 'utf8').trim() !== INDEXNOW_KEY) {
    fail('IndexNow key file content does not match file name');
  }
}

function checkStaleCopy(file, text) {
  for (const phrase of STALE_COPY) {
    if (text.includes(phrase)) fail(`${rel(file)}: stale phrase "${phrase}"`);
  }
}

const files = walk(ROOT);
for (const file of files) {
  const fileRel = rel(file);
  if (/\.(html|md|txt|xml|json|webmanifest|js|css)$/.test(fileRel)) {
    if (fileRel !== 'scripts/audit-fillpro-site.js') {
      checkStaleCopy(file, fs.readFileSync(file, 'utf8'));
    }
  }
  if (!file.endsWith('.html')) continue;
  checked.html += 1;
  const html = fs.readFileSync(file, 'utf8');
  checkMetadata(file, html);
  checkJsonLd(file, html);
  checkImages(file, html);
  checkFooter(file, html);
  checkNav(file, html);
}
checkStyles();
checkCacheToken(files);
checkIndexNowKey();

if (failures.length) {
  console.error(`FillPro site audit failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `FillPro site audit passed: ${checked.html} HTML, ${checked.jsonLd} JSON-LD, ${checked.images} images, ${checked.footers} footers, ${checked.navs} navs, ${checked.metadata} metadata groups, ${checked.accessibility} CSS/accessibility suite.`,
);
