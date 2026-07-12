const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const INDEXNOW_KEY = '6a8bacc93dd54d8d2e9d685deb98159a40be6fa6023b7f5d';
const PUBLIC_NAV = ['Product', 'Pricing', 'Privacy', 'Support', 'Contact'];
const FOOTER_LINKS = ['Product', 'Pricing', 'Privacy', 'Support', 'Contact'];
const LOCALIZED_PAGES = {
  'fillpro/de/index.html': { lang: 'de', hreflang: 'de', phrase: 'Formulare automatisch ausfüllen' },
  'fillpro/es/index.html': { lang: 'es', hreflang: 'es', phrase: 'Autocompletar formularios' },
  'fillpro/fr/index.html': { lang: 'fr', hreflang: 'fr', phrase: 'Remplissage automatique de formulaires' },
  'fillpro/pt-br/index.html': { lang: 'pt-BR', hreflang: 'pt-BR', phrase: 'Preencher formulários automaticamente' },
  'fillpro/ja/index.html': { lang: 'ja', hreflang: 'ja', phrase: 'フォーム自動入力' },
  'fillpro/ko/index.html': { lang: 'ko', hreflang: 'ko', phrase: '양식 자동완성' },
  'fillpro/zh-cn/index.html': { lang: 'zh-CN', hreflang: 'zh-CN', phrase: '表单自动填写' },
  'fillpro/ru/index.html': { lang: 'ru', hreflang: 'ru', phrase: 'Автозаполнение форм' },
};
const HREFLANG_URLS = {
  en: 'https://stealthyapps.com/fillpro/',
  de: 'https://stealthyapps.com/fillpro/de/',
  es: 'https://stealthyapps.com/fillpro/es/',
  fr: 'https://stealthyapps.com/fillpro/fr/',
  'pt-BR': 'https://stealthyapps.com/fillpro/pt-br/',
  ja: 'https://stealthyapps.com/fillpro/ja/',
  ko: 'https://stealthyapps.com/fillpro/ko/',
  'zh-CN': 'https://stealthyapps.com/fillpro/zh-cn/',
  ru: 'https://stealthyapps.com/fillpro/ru/',
  'x-default': 'https://stealthyapps.com/fillpro/',
};
const STALE_COPY = [
  'Local profiles',
  'Local-first',
  'local-first',
  'local profiles',
  'local data',
  'profile data on your device',
  'saved inside the browser extension',
  'Chrome extension storage',
  'app.vendorportal.example',
  'vendorportal.example',
  'Questions people ask',
  'Plain answers',
  'Direct answers before install',
  '>Demo<',
  'See it fill a form',
  'profiles stay in FillPro',
  'Profiles stay in FillPro',
  'No surprise submit',
  'Advanced repeat-use workflows',
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
  const cspMatch = html.match(
    /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=(["'])([\s\S]*?)\1/i,
  );
  const csp = cspMatch ? cspMatch[2] : '';
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    if (!/type=["']application\/ld\+json["']/i.test(script[1])) continue;
    checked.jsonLd += 1;
    try {
      JSON.parse(script[2]);
    } catch (error) {
      fail(`${rel(file)}: invalid JSON-LD (${error.message})`);
    }
    if (csp && /script-src/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp)) {
      const hash = crypto.createHash('sha256').update(script[2]).digest('base64');
      if (!csp.includes(`'sha256-${hash}'`)) {
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
  const fileRel = rel(file);
  if (LOCALIZED_PAGES[fileRel]) {
    for (const key of ['product', 'pricing', 'privacy', 'support', 'contact']) {
      if (!new RegExp(`data-nav-key=["']${key}["']`).test(html)) fail(`${fileRel}: localized footer missing ${key}`);
    }
  } else {
    for (const label of FOOTER_LINKS) {
      if (!new RegExp(`>${label}<`).test(html)) fail(`${fileRel}: footer missing ${label}`);
    }
  }
  if (/href=["']\/sitemap\.html["'][^>]*>Sitemap</i.test(html)) {
    fail(`${rel(file)}: footer should not expose sitemap link`);
  }
  if (/\|\s*<a\b|<\/a>\s*\|/i.test(html)) fail(`${rel(file)}: footer still uses pipe-separated links`);
}

function checkNav(file, html) {
  if (!/<nav\b/i.test(html)) return;
  checked.navs += 1;
  const fileRel = rel(file);
  const isLocalizedPage = Boolean(LOCALIZED_PAGES[fileRel]);
  const isPublicUtilityPage =
    isLocalizedPage ||
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
  if (isLocalizedPage) {
    for (const key of ['product', 'download', 'pricing', 'privacy', 'support', 'contact']) {
      if (!new RegExp(`data-nav-key=["']${key}["']`).test(html)) fail(`${fileRel}: localized nav missing ${key}`);
    }
    return;
  }
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
    ['data-theme="dark"', 'manual dark theme selectors'],
    ['--pointer-x', 'interactive background variables'],
    ['.theme-toggle', 'manual theme toggle styles'],
    ['.theme-toggle[data-theme="system"]', 'system theme monitor icon'],
    ['.theme-toggle[data-theme="light"]', 'light theme sun icon'],
    ['.theme-toggle[data-theme="dark"]', 'dark theme moon icon'],
    [':root[data-theme="dark"] .step-list li::before', 'dark step-list badge override'],
    ['launchCtaShine 7.2s', 'premium CTA shine timing'],
    ['.demo-signal', 'hero product-signal overlay'],
    ['demoSignalSweep 7.2s', 'hero signal motion timing'],
    ['min-height: 46px', 'standard button tap target'],
    ['min-height: 52px', 'landing button tap target'],
    ['min-height: 34px', 'footer link tap target'],
    ['clip-path: inset(50%)', 'non-overflow honeypot hiding'],
    ['.launch-footer', 'landing footer rules'],
    ['.language-picker', 'localized language picker styles'],
    ['.locale-price-grid', 'localized pricing layout'],
    ['width: 100%', 'full-width landing footer'],
    ['max(24px, calc((100vw - 1220px) / 2))', 'responsive landing footer padding'],
    ['.browser-mark-chrome', 'Chrome browser badge styles'],
    ['.browser-mark-edge', 'Edge browser badge styles'],
    ['.browser-mark-firefox', 'Firefox browser badge styles'],
    ['--browser-surface', 'matched browser badge surface token'],
    ['--launch-icon-bg', 'launch feature icon surface token'],
    ['body.fillpro-launch .browser-mark-chrome', 'dark launch browser badge override'],
    ['body.fillpro-launch .launch-card-icon', 'dark launch card icon override'],
    ['.launch-review-rail', 'review-before-submit product proof section'],
    ['.review-frame-actions button', 'review rail action affordances'],
    ['scroll-padding-top: 104px', 'desktop sticky-header anchor offset'],
    ['scroll-padding-top: 146px', 'mobile sticky-header anchor offset'],
  ];
  for (const [needle, label] of required) {
    if (!css.includes(needle)) fail(`styles.css: missing ${label}`);
  }
  const pointerUses = [...css.matchAll(/var\(--pointer-(?:x|y)\)/g)];
  if (pointerUses.length !== 6) {
    fail(`styles.css: pointer coordinates must be limited to the three page-wide glow gradients (found ${pointerUses.length} uses)`);
  }
  if (!/body::after\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?var\(--pointer-x\)[\s\S]*?var\(--pointer-y\)/.test(css)) {
    fail('styles.css: page-wide pointer glow must stay fixed to the viewport');
  }
  if (css.includes('reviewCardSweep')) {
    fail('styles.css: review-card sweep must stay removed so it cannot bleed across adjacent fields');
  }
}

function checkSiteScript() {
  const js = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  checked.accessibility += 1;
  const required = [
    ['fillpro-theme', 'theme localStorage key'],
    ['data-theme-resolved', 'resolved theme marker'],
    ['dataset.resolvedTheme', 'resolved theme toggle marker'],
    ['installThemeToggle', 'theme toggle installer'],
    ['Current theme:', 'explicit theme toggle accessible label'],
    ['Switch to', 'theme toggle next action label'],
    ['setupInteractiveBackdrop', 'interactive background setup'],
    ['prefers-reduced-motion: reduce', 'reduced-motion guard in JS'],
    ['.browser-download-card', 'browser card reveal coverage'],
    ['.privacy-snapshot', 'privacy snapshot reveal coverage'],
    ['.preview-card', 'shared preview reveal coverage'],
  ];
  for (const [needle, label] of required) {
    if (!js.includes(needle)) fail(`site.js: missing ${label}`);
  }
}

function checkHeroScene() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (!packageJson.dependencies || !packageJson.dependencies.three) {
    fail('package.json: missing pinned self-hosted three dependency');
  }

  const vendorPath = path.join(ROOT, 'vendor', 'three.module.min.js');
  const vendorCorePath = path.join(ROOT, 'vendor', 'three.core.min.js');
  const licensePath = path.join(ROOT, 'vendor', 'three-LICENSE.txt');
  if (!fs.existsSync(vendorPath)) fail('vendor/three.module.min.js: missing self-hosted Three.js module');
  else if (fs.statSync(vendorPath).size < 300 * 1024) fail('vendor/three.module.min.js: suspiciously small');
  if (!fs.existsSync(vendorCorePath)) fail('vendor/three.core.min.js: missing self-hosted Three.js core module');
  else if (fs.statSync(vendorCorePath).size < 300 * 1024) fail('vendor/three.core.min.js: suspiciously small');
  if (!fs.existsSync(licensePath)) fail('vendor/three-LICENSE.txt: missing Three.js license');

  const heroScript = fs.readFileSync(path.join(ROOT, 'fillpro-hero-scene.js'), 'utf8');
  const heroLoader = fs.readFileSync(path.join(ROOT, 'fillpro-hero-loader.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'fillpro', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const required = [
    [heroScript, "import * as THREE from './vendor/three.module.min.js';", 'hero script should use self-hosted Three.js'],
    [heroScript, 'WebGLRenderer', 'hero script should create a WebGLRenderer'],
    [heroScript, 'prefers-reduced-motion: reduce', 'hero script should respect reduced motion'],
    [heroScript, 'ResizeObserver', 'hero script should handle responsive canvas sizing'],
    [heroScript, 'glassStage', 'hero scene should use one restrained glass stage'],
    [heroScript, 'studioPlate', 'hero scene should use one calm studio plate'],
    [heroScript, 'formDepthStack', 'hero scene should use product-relevant form depth'],
    [heroScript, 'fieldChips', 'hero scene should keep its depth cues tied to real form fields'],
    [heroScript, 'fillCursor', 'hero scene should use one compact fill-progress accent'],
    [heroScript, 'guidedFillPath', 'hero scene should include one readable fill path'],
    [heroScript, 'guidedFillCurve.getPoint(progress, cursorPoint)', 'hero fill cursor should travel along one fill path without per-frame allocations'],
    [heroScript, 'safeSkipRail', 'hero scene should imply sensitive-field review without scary copy'],
    [heroScript, 'warmGlint', 'hero scene should include one small warm accent'],
    [heroScript, 'MutationObserver', 'hero scene should react to theme changes without a reload'],
    [heroScript, 'trackedGeometries.forEach', 'hero scene should dispose WebGL geometries'],
    [heroScript, 'trackedMaterials.forEach', 'hero scene should dispose WebGL materials'],
    [heroScript, 'renderer.dispose()', 'hero scene should clean up WebGL resources on pagehide'],
    [heroLoader, "import('./fillpro-hero-scene.js')", 'hero loader should import the scene on demand'],
    [heroLoader, 'requestIdleCallback', 'hero loader should wait for idle time'],
    [heroLoader, "'pointermove'", 'hero loader should react to real user intent'],
    [heroLoader, '12000', 'hero loader should retain a late static-reader fallback'],
    [html, 'class="hero-3d-canvas"', 'FillPro page should include hero canvas'],
    [html, 'type="module" src="/fillpro-hero-loader.js', 'FillPro page should load the progressive hero loader'],
    [css, '.hero-3d-canvas', 'styles should define hero 3D canvas'],
    [css, '.hero-3d-ready .hero-3d-canvas', 'styles should reveal hero 3D only after ready'],
    [css, 'mask-image: linear-gradient(90deg, transparent 0 68%', 'styles should mask hero 3D to the product edge instead of covering copy'],
    [css, 'mix-blend-mode: multiply', 'light theme should blend the hero render into the product edge'],
    [css, 'mix-blend-mode: screen', 'dark theme should blend the hero render into the product edge'],
    [sw, '/fillpro-hero-loader.js', 'service worker should cache the progressive hero loader'],
  ];
  for (const [source, needle, label] of required) {
    if (!source.includes(needle)) fail(label);
  }
  for (const eagerAsset of ["'/fillpro-hero-scene.js'", "'/vendor/three.module.min.js'", "'/vendor/three.core.min.js'"]) {
    if (sw.includes(eagerAsset)) fail(`service worker should not eagerly cache ${eagerAsset}`);
  }
  [
    ['heroCardStack', 'old stacked card scene'],
    ['uploadBadge', 'old upload badge clutter'],
    ['reviewBadge', 'old review badge clutter'],
    ['quietParticles', 'old particle-heavy scene'],
    ['profileSignal', 'old profile-card clutter'],
    ['fieldRails', 'old form-rail clutter'],
    ['ambientNodes', 'old floating-node clutter'],
    ['nodeOffsets', 'old floating-node animation'],
    ['productWindow', 'old duplicate browser-window hero object'],
    ['productFace', 'old duplicate browser-window face'],
    ['chromeBar', 'old duplicate browser chrome'],
    ['fillRows', 'old duplicate form-row stack'],
    ['profileDock', 'duplicate floating brand token'],
  ].forEach(([needle, label]) => {
    if (heroScript.includes(needle)) fail(`fillpro-hero-scene.js: remove ${label}`);
  });
}

function checkPackageScripts() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts || {};
  if (!scripts.test || !scripts.test.includes('audit-fillpro-release-experience.js')) {
    fail('package.json: npm test must include the rendered release experience audit');
  }
  if (!scripts['test:experience'] || !scripts['test:experience'].includes('audit-fillpro-release-experience.js')) {
    fail('package.json: missing test:experience script for release experience audit');
  }
  if (!scripts['generate:locales'] || !scripts['generate:locales'].includes('generate-fillpro-locales.js')) {
    fail('package.json: missing localized page generator');
  }
  if (!scripts['submit:indexnow'] || !scripts['submit:indexnow'].includes('submit-indexnow.js')) {
    fail('package.json: missing IndexNow submission command');
  }
}

function checkDemoGenerator() {
  const renderer = fs.readFileSync(path.join(ROOT, 'scripts', 'render-fillpro-assets.js'), 'utf8');
  if (/fillpro-demo-(poster|gif)[\s\S]+chromeFrame\(/.test(renderer)) {
    fail('render-fillpro-assets.js: demo asset should not render a nested browser frame');
  }
  if (!renderer.includes('Password') || !renderer.includes('Review before submit')) {
    fail('render-fillpro-assets.js: demo should show safe fill boundary and review moment');
  }
  for (const marker of ['fillpro-demo.mp4', 'libx264', '+faststart']) {
    if (!renderer.includes(marker)) {
      fail(`render-fillpro-assets.js: hero demo renderer missing ${marker}`);
    }
  }
}

function checkLaunchPage() {
  const html = fs.readFileSync(path.join(ROOT, 'fillpro', 'index.html'), 'utf8');
  const siteScript = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  const required = [
    ['demo-signal', 'hero product-signal overlay'],
    ['Work profile filled', 'hero profile signal copy'],
    ['ready to review', 'hero review signal copy'],
    ['Stop retyping the same form details.', 'human first-view headline'],
    ['Start free', 'low-friction primary CTA'],
    ['No account required', 'clean privacy proof wording'],
    ['See exactly what changes.', 'specific hero demo caption'],
    ['data-fillpro-demo-poster', 'stable hero demo poster'],
    ['demo-play-button', 'explicit hero demo play control'],
    ['Check the fill before you send.', 'review-before-submit proof section'],
    ['Undo snapshot saved', 'review/undo product proof copy'],
    ['What to know before you install.', 'plain FAQ heading'],
  ];
  for (const [needle, label] of required) {
    if (!html.includes(needle)) fail(`fillpro/index.html: missing ${label}`);
  }
  if (/<video\b[^>]*\bautoplay\b/i.test(html)) {
    fail('fillpro/index.html: hero demo should not autoplay before user input');
  }
  if (/rel="preload"[^>]+fillpro-demo\.gif/i.test(html)) {
    fail('fillpro/index.html: click-to-play demo should not preload the GIF');
  }
  if (!siteScript.includes("video.src = '/assets/fillpro-demo.mp4'")) {
    fail('site.js: hero demo play control is not wired to the MP4');
  }
  const proList = (html.match(/<article class="price-card price-card-featured">([\s\S]*?)<\/article>/) || [])[1] || '';
  if (!proList.includes('Import and export backups')) {
    fail('fillpro/index.html: Pro pricing should use concrete import/export backup copy');
  }
  if (/Import and export<\/li>[\s\S]*Import, export/i.test(proList)) {
    fail('fillpro/index.html: Pro pricing repeats import/export copy');
  }
}

function checkAssetVersioning(files) {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  if (!sw.includes("const CACHE_NAME = 'fillpro-static-live';")) {
    fail('sw.js: missing stable, non-numbered cache name');
  }
  if (/fillpro-launch-v\d+|[?&]v=fillpro-/i.test(sw)) {
    fail('sw.js: public preview/build numbering returned');
  }
  for (const file of files.filter((item) => item.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    if (/fillpro-launch-v\d+|(?:styles\.css|site\.js|contact\.js|fillpro-hero-(?:loader|scene)\.js)\?v=/i.test(html)) {
      fail(`${rel(file)}: public preview/build numbering returned`);
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

function checkLocalization() {
  const pages = {
    'fillpro/index.html': { lang: 'en', hreflang: 'en', phrase: 'Autofill Forms' },
    ...LOCALIZED_PAGES,
  };
  for (const [fileRel, config] of Object.entries(pages)) {
    const html = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
    const canonical = HREFLANG_URLS[config.hreflang];
    if (!html.includes(`<html lang="${config.lang}">`)) fail(`${fileRel}: html lang should be ${config.lang}`);
    if (!html.includes(`<link rel="canonical" href="${canonical}">`)) fail(`${fileRel}: localized canonical mismatch`);
    if (!html.includes(config.phrase)) fail(`${fileRel}: missing regional query phrase ${config.phrase}`);
    for (const [hreflang, url] of Object.entries(HREFLANG_URLS)) {
      if (!html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${url}">`)) {
        fail(`${fileRel}: missing reciprocal hreflang ${hreflang}`);
      }
    }
    if (!html.includes('class="language-picker"')) fail(`${fileRel}: missing visible language picker`);
    for (const url of Object.values(HREFLANG_URLS)) {
      const pathOnly = new URL(url).pathname;
      if (!html.includes(`href="${pathOnly}"`)) fail(`${fileRel}: language picker missing ${pathOnly}`);
    }
    if (fileRel !== 'fillpro/index.html' && !html.includes(`"inLanguage":"${config.lang}"`)) {
      fail(`${fileRel}: JSON-LD inLanguage mismatch`);
    }
  }

  const localeSitemap = fs.readFileSync(path.join(ROOT, 'sitemap-locales.xml'), 'utf8');
  for (const [hreflang, url] of Object.entries(HREFLANG_URLS)) {
    if (!localeSitemap.includes(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}"/>`)) {
      fail(`sitemap-locales.xml: missing ${hreflang} alternate`);
    }
  }
  for (const url of new Set(Object.values(HREFLANG_URLS))) {
    if (!localeSitemap.includes(`<loc>${url}</loc>`)) fail(`sitemap-locales.xml: missing URL ${url}`);
  }

  const main = fs.readFileSync(path.join(ROOT, 'fillpro', 'index.html'), 'utf8');
  for (const type of ['WebSite', 'WebPage', 'SoftwareApplication', 'FAQPage']) {
    if (!main.includes(`"@type": "${type}"`)) fail(`fillpro/index.html: entity graph missing ${type}`);
  }
}

function checkStaleCopy(file, text) {
  for (const phrase of STALE_COPY) {
    if (text.includes(phrase)) fail(`${rel(file)}: stale phrase "${phrase}"`);
  }
  const visibleBody = text
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  if (rel(file) === 'sitemap.html' && /XML sitemap|sitemap\.xml/i.test(visibleBody)) {
    fail('sitemap.html: XML sitemap should not be user-facing');
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
checkSiteScript();
checkHeroScene();
checkPackageScripts();
checkDemoGenerator();
checkLaunchPage();
checkAssetVersioning(files);
checkIndexNowKey();
checkLocalization();

if (failures.length) {
  console.error(`FillPro site audit failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `FillPro site audit passed: ${checked.html} HTML, ${checked.jsonLd} JSON-LD, ${checked.images} images, ${checked.footers} footers, ${checked.navs} navs, ${checked.metadata} metadata groups, ${checked.accessibility} CSS/accessibility suite.`,
);
