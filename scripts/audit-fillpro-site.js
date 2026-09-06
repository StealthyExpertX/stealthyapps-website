const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const INDEXNOW_KEY = '6a8bacc93dd54d8d2e9d685deb98159a40be6fa6023b7f5d';
const PUBLIC_NAV = ['Product', 'Download', 'Pricing', 'Privacy', 'Support', 'Contact'];
const FOOTER_LINKS = ['Product', 'Download', 'Pricing', 'Privacy', 'Support', 'Contact'];
const LOCALIZED_PAGES = {
  'skip-retyping/de/index.html': { lang: 'de', hreflang: 'de', phrase: 'Formulare automatisch ausfüllen' },
  'skip-retyping/es/index.html': { lang: 'es', hreflang: 'es', phrase: 'Autocompletar formularios' },
  'skip-retyping/fr/index.html': { lang: 'fr', hreflang: 'fr', phrase: 'Remplissage automatique de formulaires' },
  'skip-retyping/pt-br/index.html': { lang: 'pt-BR', hreflang: 'pt-BR', phrase: 'Preencher formulários automaticamente' },
  'skip-retyping/ja/index.html': { lang: 'ja', hreflang: 'ja', phrase: 'フォーム自動入力' },
  'skip-retyping/ko/index.html': { lang: 'ko', hreflang: 'ko', phrase: '양식 자동완성' },
  'skip-retyping/zh-cn/index.html': { lang: 'zh-CN', hreflang: 'zh-CN', phrase: '表单自动填充' },
  'skip-retyping/ru/index.html': { lang: 'ru', hreflang: 'ru', phrase: 'Автозаполнение форм' },
};
const HREFLANG_URLS = {
  en: 'https://stealthyapps.com/skip-retyping/',
  de: 'https://stealthyapps.com/skip-retyping/de/',
  es: 'https://stealthyapps.com/skip-retyping/es/',
  fr: 'https://stealthyapps.com/skip-retyping/fr/',
  'pt-BR': 'https://stealthyapps.com/skip-retyping/pt-br/',
  ja: 'https://stealthyapps.com/skip-retyping/ja/',
  ko: 'https://stealthyapps.com/skip-retyping/ko/',
  'zh-CN': 'https://stealthyapps.com/skip-retyping/zh-cn/',
  ru: 'https://stealthyapps.com/skip-retyping/ru/',
  'x-default': 'https://stealthyapps.com/skip-retyping/',
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
  'profiles stay in Skip Retyping',
  'Profiles stay in Skip Retyping',
  'No surprise submit',
  'Advanced repeat-use workflows',
  'Skip Retyping is installed. Choose Pro when you need it.',
  'Powerful, but fussy.',
  'Smart Rules, without the guesswork.',
  '/apps/skip-retyping/',
  '/apps/skip-retyping/privacy',
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
  const footer = (html.match(/<footer\b[\s\S]*?<\/footer>/i) || [])[0] || '';
  if (!footer) return;
  checked.footers += 1;
  if (!/class=["'][^"']*footer-copy/.test(footer)) fail(`${rel(file)}: footer missing footer-copy`);
  if (!/class=["'][^"']*footer-links/.test(footer)) fail(`${rel(file)}: footer missing footer-links`);
  const fileRel = rel(file);
  if (LOCALIZED_PAGES[fileRel]) {
    for (const key of ['product', 'download', 'pricing', 'privacy', 'terms', 'refunds', 'support', 'contact']) {
      if (!new RegExp(`data-nav-key=["']${key}["']`).test(footer)) fail(`${fileRel}: localized footer missing ${key}`);
    }
  } else {
    for (const label of FOOTER_LINKS) {
      if (!new RegExp(`>${label}<`).test(footer)) fail(`${fileRel}: footer missing ${label}`);
    }
  }
  const needsCommerceLinks =
    fileRel.startsWith('skip-retyping/') ||
    fileRel.startsWith('support/') ||
    fileRel.startsWith('contact/') ||
    fileRel === '404.html' ||
    fileRel === 'sitemap.html';
  if (needsCommerceLinks) {
    if (!/href=["']\/skip-retyping\/terms\/["']/.test(footer)) fail(`${fileRel}: footer missing Terms`);
    if (!/href=["']\/skip-retyping\/refunds\/["']/.test(footer)) fail(`${fileRel}: footer missing Refunds`);
  }
  if (/href=["']\/sitemap\.html["'][^>]*>Sitemap</i.test(footer)) {
    fail(`${rel(file)}: footer should not expose sitemap link`);
  }
  if (/\|\s*<a\b|<\/a>\s*\|/i.test(footer)) fail(`${rel(file)}: footer still uses pipe-separated links`);
}

function checkNav(file, html) {
  const nav = (html.match(/<header\b[\s\S]*?<\/header>/i) || [])[0] || '';
  if (!nav) return;
  checked.navs += 1;
  const fileRel = rel(file);
  const isLocalizedPage = Boolean(LOCALIZED_PAGES[fileRel]);
  const isPublicUtilityPage =
    isLocalizedPage ||
    fileRel.startsWith('contact/') ||
    fileRel.startsWith('support/') ||
    fileRel.startsWith('skip-retyping/privacy/') ||
    fileRel.startsWith('skip-retyping/terms/') ||
    fileRel.startsWith('skip-retyping/refunds/') ||
    fileRel.includes('/job-application-autofill/') ||
    fileRel.includes('/resume-upload-autofill/') ||
    fileRel.includes('/local-form-autofill/') ||
    fileRel.includes('/browser-autofill-vs-skip-retyping/') ||
    fileRel === '404.html' ||
    fileRel === 'sitemap.html';
  if (!isPublicUtilityPage) return;
  if (isLocalizedPage) {
    for (const key of ['product', 'download', 'pricing', 'privacy', 'support', 'contact']) {
      if (!new RegExp(`data-nav-key=["']${key}["']`).test(nav)) fail(`${fileRel}: localized nav missing ${key}`);
    }
    return;
  }
  for (const label of PUBLIC_NAV) {
    if (!new RegExp(`>${label}<`).test(nav)) fail(`${fileRel}: nav missing ${label}`);
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
    ['.theme-toggle', 'manual theme toggle styles'],
    ['.theme-toggle[data-theme="system"]', 'system theme monitor icon'],
    ['.theme-toggle[data-theme="light"]', 'light theme sun icon'],
    ['.theme-toggle[data-theme="dark"]', 'dark theme moon icon'],
    [':root[data-theme="dark"] .step-list li::before', 'dark step-list badge override'],
    ['.demo-transcript', 'readable alternative to demo playback'],
    ['min-height: 46px', 'standard button tap target'],
    ['min-height: 52px', 'landing button tap target'],
    ['min-height: 34px', 'footer link tap target'],
    ['clip-path: inset(50%)', 'non-overflow honeypot hiding'],
    ['.launch-footer', 'landing footer rules'],
    ['.launch-links a[href^="/contact/"]', 'compact mobile navigation contact rule'],
    ['.launch-links .theme-toggle', 'mobile theme toggle placement'],
    ['.checkout-grid', 'checkout plan grid'],
    ['.language-picker', 'localized language picker styles'],
    ['.locale-price-grid', 'localized pricing layout'],
    ['.locale-action-note', 'localized free-plan reassurance'],
    ['.locale-price-card', 'localized plan-card layout'],
    ['width: 100%', 'full-width landing footer'],
    ['max(24px, calc((100vw - 1220px) / 2))', 'responsive landing footer padding'],
    ['.browser-mark-chrome', 'Chrome browser badge styles'],
    ['.browser-mark-edge', 'Edge browser badge styles'],
    ['.browser-mark-firefox', 'Firefox browser badge styles'],
    ['--browser-surface', 'matched browser badge surface token'],
    ['--launch-icon-bg', 'launch feature icon surface token'],
    ['body.skip-retyping-launch .browser-mark-chrome', 'dark launch browser badge override'],
    ['body.skip-retyping-launch .launch-card-icon', 'dark launch card icon override'],
    ['.launch-review-rail', 'review-before-submit product proof section'],
    ['.actual-result', 'real result screenshot presentation'],
    ['scroll-padding-top: 104px', 'desktop sticky-header anchor offset'],
    ['scroll-padding-top: 146px', 'mobile sticky-header anchor offset'],
  ];
  for (const [needle, label] of required) {
    if (!css.includes(needle)) fail(`styles.css: missing ${label}`);
  }
  for (const forbidden of ['.site-pointer-glow', '--pointer-x', '--pointer-y', 'pointer-glow-active', '.reveal-ready', '.reveal-item', 'launchCtaShine', 'demoSignalSweep', 'demoSignalLift', 'radial-gradient(']) {
    if (css.includes(forbidden)) fail(`styles.css: obsolete motion effect returned: ${forbidden}`);
  }
  if (!/\.demo-shell\s*\{[\s\S]*?scrollbar-width:\s*none;/.test(css) || !css.includes('.demo-shell::-webkit-scrollbar')) {
    fail('styles.css: hero demo shell must hide its internal scrollbar without hiding page scroll');
  }
  if (css.includes('reviewCardSweep')) {
    fail('styles.css: review-card sweep must stay removed so it cannot bleed across adjacent fields');
  }
}

function checkSiteScript() {
  const js = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  const contactJs = fs.readFileSync(path.join(ROOT, 'contact.js'), 'utf8');
  checked.accessibility += 1;
  const required = [
    ['skip-retyping-theme', 'theme localStorage key'],
    ['data-theme-resolved', 'resolved theme marker'],
    ['dataset.resolvedTheme', 'resolved theme toggle marker'],
    ['installThemeToggle', 'theme toggle installer'],
    ['Current theme:', 'explicit theme toggle accessible label'],
    ['Switch to', 'theme toggle next action label'],
    ['setupCheckoutPlanState', 'checkout plan query support'],
    ['prefers-reduced-motion: reduce', 'reduced-motion guard in JS'],
    ['link.hidden = true', 'pending store cards stay non-actionable'],
    ['link.hidden = false', 'approved store cards become available'],
  ];
  for (const [needle, label] of required) {
    if (!js.includes(needle)) fail(`site.js: missing ${label}`);
  }
  const forbiddenRuntimeSinks = [
    [/\.innerHTML\s*=/, 'innerHTML assignment'],
    [/insertAdjacentHTML\s*\(/, 'insertAdjacentHTML call'],
    [/document\.write\s*\(/, 'document.write call'],
    [/\beval\s*\(/, 'eval call'],
    [/\bnew\s+Function\s*\(/, 'Function constructor'],
    [/\bset(?:Timeout|Interval)\s*\(\s*["'`]/, 'string timer'],
  ];
  for (const [source, label] of [[js, 'site.js'], [contactJs, 'contact.js']]) {
    for (const [pattern, sink] of forbiddenRuntimeSinks) {
      if (pattern.test(source)) fail(`${label}: public runtime must not use ${sink}`);
    }
  }
  for (const forbidden of ['setupInteractiveBackdrop', 'site-pointer-glow', 'pointer-glow-active', 'setupScrollReveals', 'reveal-ready', 'reveal-item']) {
    if (js.includes(forbidden)) fail(`site.js: obsolete motion effect returned: ${forbidden}`);
  }
  if (!contactJs.includes('`${subjectLabel}: ${reasonLabel} | ${subjectPrefix}`')) {
    fail('contact.js: Skip Retyping/product email subject suffix is missing');
  }

  const home = fs.readFileSync(path.join(ROOT, 'skip-retyping', 'index.html'), 'utf8');
  const checkout = fs.readFileSync(
    path.join(ROOT, 'skip-retyping', 'checkout', 'index.html'),
    'utf8',
  );
  const download = fs.readFileSync(
    path.join(ROOT, 'skip-retyping', 'download', 'index.html'),
    'utf8',
  );
  const chrome = fs.readFileSync(
    path.join(ROOT, 'skip-retyping', 'download', 'chrome', 'index.html'),
    'utf8',
  );
  const edge = fs.readFileSync(
    path.join(ROOT, 'skip-retyping', 'download', 'edge', 'index.html'),
    'utf8',
  );
  const firefox = fs.readFileSync(
    path.join(ROOT, 'skip-retyping', 'download', 'firefox', 'index.html'),
    'utf8',
  );
  for (const [source, label, note] of [
    [home, 'skip-retyping/index.html', 'Edge and Firefox coming soon.'],
    [checkout, 'skip-retyping/checkout/index.html', 'Edge and Firefox coming soon.'],
    [download, 'skip-retyping/download/index.html', 'Chrome, Edge, and Firefox coming soon.'],
  ]) {
    if (!source.includes(note)) {
      fail(`${label}: unreleased browsers need one concise availability note`);
    }
    if (!/data-skip-retyping-store="chrome" hidden/.test(source)) {
      fail(label + ': pending Chrome card must stay hidden until a real store URL exists');
    }
    if (/href="\/skip-retyping\/download\/(?:edge|firefox)\//i.test(source)) {
      fail(`${label}: unreleased browser status must not look actionable`);
    }
  }
  for (const [source, label, browser] of [
    [chrome, 'skip-retyping/download/chrome/index.html', 'Chrome'],
    [edge, 'skip-retyping/download/edge/index.html', 'Microsoft Edge'],
    [firefox, 'skip-retyping/download/firefox/index.html', 'Firefox'],
  ]) {
    if (!/<meta name="robots" content="noindex, follow">/.test(source)) {
      fail(`${label}: unreleased ${browser} page must stay out of search indexes`);
    }
    const comingSoonCount = (source.match(/class="launch-lead">Coming soon\.<\/p>/g) || []).length;
    if (comingSoonCount !== 1) {
      fail(`${label}: unreleased ${browser} page must show exactly one visible Coming soon message`);
    }
    if (/reason=(?:chrome|edge|firefox)_store_link|data-skip-retyping-store=|class="launch-button/i.test(source)) {
      fail(`${label}: unreleased ${browser} page must not present a fake store action`);
    }
  }

  const sitemapXml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  if (/skip-retyping\/download\/(?:edge|firefox)\//.test(sitemapXml)) {
    fail('sitemap.xml: unreleased Edge and Firefox holding pages must not be indexed');
  }
}

function checkProductHero() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (packageJson.dependencies?.three) {
    fail('package.json: decorative Three.js must not ship on the product landing page');
  }

  const html = fs.readFileSync(path.join(ROOT, 'skip-retyping', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const siteScript = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  const required = [
    [html, 'class="launch-demo-card"', 'Skip Retyping page should show the real product demo'],
    [html, 'data-skip-retyping-demo-poster', 'Skip Retyping page should load the stable demo poster'],
    [html, 'class="demo-play-button"', 'Skip Retyping demo should have a clear pause/play control'],
    [siteScript, "video.src = '/assets/skip-retyping-demo.mp4'", 'demo should upgrade to the compact local MP4'],
    [siteScript, "'Skip Retyping filling a job application from a saved work profile'", 'playing demo should keep the job-application accessibility label'],
    [css, 'scrollbar-width: none', 'demo shell should hide internal browser chrome scrollbars'],
    [css, 'prefers-reduced-motion: reduce', 'motion should respect reduced-motion preferences'],
    [html, '/assets/skip-retyping-demo-poster.webp', 'landing page should deliver the compact WebP demo poster'],
    [siteScript, "video.poster = '/assets/skip-retyping-demo-poster.webp'", 'playing demo should retain the compact WebP poster'],
    [css, 'content: url("/assets/skip-retyping-demo-poster.webp")', 'reduced motion should retain the compact WebP poster'],
    [sw, '/assets/skip-retyping-demo-poster.webp', 'service worker should cache the compact demo poster'],
  ];
  for (const [source, needle, label] of required) {
    if (!source.includes(needle)) fail(label);
  }
  if (!/\.demo-shell\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?scrollbar-width:\s*none;/.test(css)) {
    fail('hero demo must not become an internal scroll container');
  }
  for (const [source, label] of [
    [html, 'landing page'],
    [sw, 'service worker'],
  ]) {
    for (const forbidden of ['hero-3d-canvas', 'fillpro-hero-loader.js', 'three.module.min.js']) {
      if (source.includes(forbidden)) fail(label + ': remove decorative ' + forbidden);
    }
  }
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
  if (!scripts.test || !scripts.test.includes('audit-fillpro-performance.js')) {
    fail('package.json: full site test must enforce throttled performance budgets');
  }
  if (!scripts['test:performance'] || !scripts['test:performance'].includes('audit-fillpro-performance.js')) {
    fail('package.json: missing direct performance test command');
  }
  if (!scripts['generate:locales'] || !scripts['generate:locales'].includes('generate-fillpro-locales.js')) {
    fail('package.json: missing localized page generator');
  }
  if (!scripts['submit:indexnow'] || !scripts['submit:indexnow'].includes('submit-indexnow.js')) {
    fail('package.json: missing IndexNow submission command');
  }
}

function checkDemoGenerator() {
  const renderer = fs.readFileSync(path.join(ROOT, 'scripts', 'render-fillpro-store-video.js'), 'utf8');
  for (const marker of ['skip-retyping-demo.mp4', 'libx264', '+faststart', 'provenance.json', 'Recapture current source']) {
    if (!renderer.includes(marker)) fail('Real demo pipeline missing ' + marker);
  }
}

function checkLaunchPage() {
  const html = fs.readFileSync(path.join(ROOT, 'skip-retyping', 'index.html'), 'utf8');
  const checkoutHtml = fs.readFileSync(path.join(ROOT, 'skip-retyping', 'checkout', 'index.html'), 'utf8');
  const siteScript = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  const required = [
    ['demo-transcript', 'equivalent text for the product demo'],
    ['id="skip-retyping-title">Skip Retyping</h1>', 'prominent product name'],
    ['filled-popup.png', 'real captured result'],
    ['Autofill the details you keep retyping.', 'human first-view headline'],
    ['Add to Chrome - free', 'specific low-friction primary CTA'],
    ['href="/skip-retyping/checkout/"', 'pricing CTA should use checkout handoff'],
    ['No account to start', 'clean privacy proof wording'],
    ['Watch the actual extension fill a test application.', 'honest hero demo scope'],
    ['data-skip-retyping-demo-poster', 'stable hero demo poster'],
    ['demo-play-button', 'explicit hero demo play control'],
    ['See what changed before you submit.', 'review-before-submit proof section'],
    ['cannot retract data a website already received', 'destination-site data boundary'],
    ['What people ask before installing.', 'plain FAQ heading'],
  ];
  for (const [needle, label] of required) {
    if (!html.includes(needle)) fail(`skip-retyping/index.html: missing ${label}`);
  }
  if (/class="review-frame-actions"/.test(html)) fail('Decorative review buttons must not look like working controls');
  if (/rel="preload"[^>]+skip-retyping-demo\.gif/i.test(html)) {
    fail('skip-retyping/index.html: hero demo should use the compact MP4, not preload the GIF');
  }
  if (!siteScript.includes("video.src = '/assets/skip-retyping-demo.mp4'")) {
    fail('site.js: hero demo is not wired to the MP4');
  }
  if (
    !siteScript.includes('video.autoplay = false') ||
    !siteScript.includes('startAutoplayAfterLoad') ||
    !siteScript.includes("video.preload = reduceMotion ? 'none' : 'metadata'") ||
    !siteScript.includes('togglePlayback') ||
    !siteScript.includes("isPlaying ? 'Pause the Skip Retyping demo' : 'Play the Skip Retyping demo'")
  ) {
    fail('site.js: hero demo must autoplay, pause/resume on click, and respect reduced motion');
  }
  const proList = (html.match(/<article class="price-card price-card-featured">([\s\S]*?)<\/article>/) || [])[1] || '';
  if (!proList.includes('Import backups; export stays available on every plan')) {
    fail('skip-retyping/index.html: pricing must say that export stays free');
  }
  if (/Three-day Pro trial|no card required/i.test(html)) {
    fail('skip-retyping/index.html: unverified trial claim returned');
  }
  if (!/\$39\.99[\s\S]{0,500}lifetime|lifetime[\s\S]{0,500}\$39\.99/i.test(html)) {
    fail('skip-retyping/index.html: lifetime pricing is missing or unclear');
  }
  for (const [needle, label] of [
    ['data-skip-retyping-checkout', 'checkout plan state hook'],
    ['data-checkout-plan="yearly"', 'yearly checkout highlight target'],
    ['data-checkout-plan="lifetime"', 'lifetime checkout target'],
    ['data-checkout-action', 'checkout plan-aware install handoff CTA'],
    ['Install first. Upgrade inside Skip Retyping.', 'checkout extension-driven payment boundary'],
    ['ExtensionPay', 'checkout billing provider disclosure'],
    ['Stripe handles card details', 'checkout Stripe handoff disclosure'],
  ]) {
    if (!checkoutHtml.includes(needle)) fail(`skip-retyping/checkout/index.html: missing ${label}`);
  }
  if (/price-card price-card-featured" data-checkout-plan/.test(checkoutHtml)) {
    fail('skip-retyping/checkout/index.html: checkout must use one dynamic selected-plan highlight');
  }
  if (/stripe\.com|extensionpay\.com\/extension/i.test(checkoutHtml)) {
    fail('skip-retyping/checkout/index.html: website must not contain raw Stripe or direct ExtensionPay checkout URLs');
  }
}

function checkRelatedGuides() {
  const guides = {
    'skip-retyping/job-application-autofill/index.html': '/skip-retyping/job-application-autofill/',
    'skip-retyping/resume-upload-autofill/index.html': '/skip-retyping/resume-upload-autofill/',
    'skip-retyping/local-form-autofill/index.html': '/skip-retyping/local-form-autofill/',
    'skip-retyping/browser-autofill-vs-skip-retyping/index.html': '/skip-retyping/browser-autofill-vs-skip-retyping/',
  };

  for (const [fileRel, selfHref] of Object.entries(guides)) {
    const html = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
    const block = (html.match(/<nav class="related-guides"[\s\S]*?<\/nav>/) || [])[0] || '';
    if (!block) {
      fail(`${fileRel}: missing contextual related guides`);
      continue;
    }
    const hrefs = Array.from(block.matchAll(/<a href="([^"]+)"/g), (match) => match[1]);
    if (hrefs.length !== 3) fail(`${fileRel}: related guides should contain exactly three links`);
    if (hrefs.includes(selfHref)) fail(`${fileRel}: related guides must not link to the current page`);
    if ((block.match(/<span>/g) || []).length !== 3) {
      fail(`${fileRel}: each related guide needs a useful description`);
    }
  }
}

function checkChangelog(files) {
  const changelogRel = 'skip-retyping/changelog/index.html';
  const changelog = fs.readFileSync(path.join(ROOT, changelogRel), 'utf8');
  const versions = Array.from(
    changelog.matchAll(/data-changelog-version="([^"]+)"/g),
    (match) => match[1],
  );
  if (versions.length !== 1 || versions[0] !== '1.0.0') {
    fail(`${changelogRel}: changelog must contain only the initial 1.0.0 release`);
  }
  if (!changelog.includes('Initial release')) {
    fail(`${changelogRel}: missing initial-release label`);
  }

  const linkedFrom = files
    .filter((file) => file.endsWith('.html') && rel(file) !== changelogRel)
    .filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return !hasMetaRefresh(source) && source.includes('href="/skip-retyping/changelog/"');
    })
    .map(rel);
  if (linkedFrom.length !== 1 || linkedFrom[0] !== 'support/index.html') {
    fail(
      `${changelogRel}: changelog should be linked only from support/index.html, found ${linkedFrom.join(', ') || 'none'}`,
    );
  }
}

function checkAssetVersioning(files) {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  if (!sw.includes("const CACHE_NAME = 'fillpro-static-live';")) {
    fail('sw.js: missing stable, non-numbered cache name');
  }
  if (/skip-retyping-launch-v\d+|[?&]v=fillpro-/i.test(sw)) {
    fail('sw.js: public preview/build numbering returned');
  }
  if (/caches\.match\(request\)[\s\S]{0,120}if \(cached\) return cached/.test(sw)) {
    fail('sw.js: cache-first static assets can leave released CSS and JavaScript stale');
  }
  for (const file of files.filter((item) => item.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    if (/skip-retyping-launch-v\d+|(?:styles\.css|site\.js|contact\.js|fillpro-hero-(?:loader|scene)\.js)\?v=/i.test(html)) {
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

function checkCrawlerSurfaces() {
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  for (const agent of [
    'Googlebot',
    'Bingbot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
  ]) {
    const block = new RegExp(`User-agent: ${agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\nAllow: /`);
    if (!block.test(robots)) fail(`robots.txt: ${agent} should be explicitly allowed`);
  }
  for (const sitemap of [
    'sitemap-index.xml',
    'sitemap.xml',
    'sitemap-images.xml',
    'sitemap-locales.xml',
  ]) {
    if (!robots.includes(`Sitemap: https://stealthyapps.com/${sitemap}`)) {
      fail(`robots.txt: missing ${sitemap}`);
    }
  }

  const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8');
  const llmsFull = fs.readFileSync(path.join(ROOT, 'llms-full.txt'), 'utf8');
  const requiredRoutes = [
    'https://stealthyapps.com/skip-retyping/',
    'https://stealthyapps.com/skip-retyping/privacy/',
    'https://stealthyapps.com/skip-retyping/terms/',
    'https://stealthyapps.com/skip-retyping/refunds/',
    'https://stealthyapps.com/support/',
    'https://stealthyapps.com/contact/',
  ];
  for (const route of requiredRoutes) {
    if (!llms.includes(route)) fail(`llms.txt: missing ${route}`);
    if (!llmsFull.includes(route)) fail(`llms-full.txt: missing ${route}`);
  }
  if (llms.trim().split(/\s+/).length > 1000) {
    fail('llms.txt: keep the primary product index below 1,000 words');
  }
  for (const [file, source] of [
    ['llms.txt', llms],
    ['llms-full.txt', llmsFull],
  ]) {
    for (const risky of [
      /rank(?:ed|ing)?\s*(?:#|number)?\s*1/i,
      /guaranteed?\s+(?:ranking|citation|traffic)/i,
      /unless .*choose(?:s)? Pro billing/i,
      /License status is handled by ExtensionPay and Stripe/i,
    ]) {
      if (risky.test(source)) fail(`${file}: contains an unsupported or ambiguous crawler claim`);
    }
    if (!source.includes('not saved profile values') && !source.includes('Neither service receives saved profile values')) {
      fail(`${file}: billing boundary should say saved profile values are not sent`);
    }
  }
}

function checkLocalization() {
  const pages = {
    'skip-retyping/index.html': { lang: 'en', hreflang: 'en', phrase: 'Autofill Forms' },
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
    if (fileRel !== 'skip-retyping/index.html' && !html.includes(`"inLanguage":"${config.lang}"`)) {
      fail(`${fileRel}: JSON-LD inLanguage mismatch`);
    }
    if (fileRel !== 'skip-retyping/index.html') {
      const planCards = (html.match(/class="card locale-price-card"/g) || []).length;
      if (planCards !== 3) fail(`${fileRel}: expected Free, Pro, and Lifetime plan cards`);
      if (!html.includes('$39.99') || !html.includes('/skip-retyping/checkout/?plan=lifetime')) {
        fail(`${fileRel}: localized lifetime price or checkout action is missing`);
      }
      if (!html.includes('"price":"39.99"')) {
        fail(`${fileRel}: localized lifetime offer is missing from structured data`);
      }
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

  const main = fs.readFileSync(path.join(ROOT, 'skip-retyping', 'index.html'), 'utf8');
  for (const type of ['WebSite', 'WebPage', 'SoftwareApplication', 'FAQPage']) {
    if (!main.includes(`"@type": "${type}"`)) fail(`skip-retyping/index.html: entity graph missing ${type}`);
  }
  if (!main.includes('"operatingSystem": "Google Chrome"')) {
    fail('skip-retyping/index.html: structured data must match the current Chrome-first release');
  }
  if (main.includes('"operatingSystem": "Chrome, Microsoft Edge, Firefox"')) {
    fail('skip-retyping/index.html: structured data must not present coming-soon browser stores as released');
  }
}


function checkCommercePolicies() {
  const routes = {
    terms: 'skip-retyping/terms/index.html',
    refunds: 'skip-retyping/refunds/index.html',
    privacy: 'skip-retyping/privacy/index.html',
    home: 'skip-retyping/index.html',
    checkout: 'skip-retyping/checkout/index.html',
  };
  const source = {};
  for (const [key, fileRel] of Object.entries(routes)) {
    const file = path.join(ROOT, fileRel);
    if (!fs.existsSync(file)) {
      fail(fileRel + ': required commerce page missing');
      source[key] = '';
    } else {
      source[key] = fs.readFileSync(file, 'utf8');
    }
  }

  for (const phrase of [
    '$3.99',
    '$29.99',
    'renews each month until canceled',
    'renews each year until canceled',
    'Google, Microsoft, and Mozilla are not the seller',
    '14-day refund window',
    'Consumer rights still apply.',
  ]) {
    if (!source.terms.includes(phrase)) fail(routes.terms + ': missing "' + phrase + '"');
  }

  for (const phrase of [
    'within 14 days',
    'Manage billing',
    'original payment method',
    '2 business days',
    'consumer law',
  ]) {
    if (!source.refunds.includes(phrase)) fail(routes.refunds + ': missing "' + phrase + '"');
  }

  const limitedUse =
    'The use of information received from Google APIs by Skip Retyping adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.';
  if (!source.privacy.includes(limitedUse)) {
    fail(routes.privacy + ': missing Chrome Web Store Limited Use disclosure');
  }

  for (const [key, fileRel] of [['home', routes.home], ['checkout', routes.checkout]]) {
    const html = source[key];
    if (!html.includes('href="/skip-retyping/terms/"')) fail(fileRel + ': pricing surface missing Terms link');
    if (!html.includes('href="/skip-retyping/refunds/"')) fail(fileRel + ': pricing surface missing Refunds link');
    if (!/renew(?:s|al)/i.test(html)) fail(fileRel + ': pricing surface must disclose renewal');
    if (!/14-day/i.test(html)) fail(fileRel + ': pricing surface must disclose refund window');
  }

  for (const fileRel of ['sitemap.xml', 'sitemap.html', 'llms.txt', 'llms-full.txt']) {
    const html = fs.readFileSync(path.join(ROOT, fileRel), 'utf8');
    for (const route of ['/skip-retyping/terms/', '/skip-retyping/refunds/']) {
      if (!html.includes(route)) fail(fileRel + ': missing ' + route);
    }
  }

  if (!source.terms.includes('reason=pro_access')) {
    fail(routes.terms + ': billing support link must use the supported pro_access reason');
  }
  if (!source.refunds.includes('reason=refund')) {
    fail(routes.refunds + ': refund support link must use the supported refund reason');
  }
  for (const unsupportedReason of ['reason=refund_request', 'reason=billing_question']) {
    for (const [key, fileRel] of Object.entries(routes)) {
      if (source[key].includes(unsupportedReason)) {
        fail(fileRel + ': unsupported contact route remains: ' + unsupportedReason);
      }
    }
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

function checkPublicIdentityAndRedirects(files) {
  for (const unsupportedPublicFile of [
    '.well-known/ai-plugin.json',
    '.well-known/mcp.json',
    '.well-known/openapi.yaml',
    'debug.log',
    'opensearch.xml',
  ]) {
    if (fs.existsSync(path.join(ROOT, unsupportedPublicFile))) {
      fail(unsupportedPublicFile + ': unsupported or nonfunctional public file must not ship');
    }
  }
  const publicIdentityFiles = files.filter((file) => {
    const fileRel = rel(file);
    return (
      fileRel.startsWith('skip-retyping/') ||
      fileRel.startsWith('support/') ||
      fileRel.startsWith('contact/') ||
      ['index.html', 'index.md', 'llms.txt', 'llms-full.txt', 'humans.txt', 'site.js', 'manifest.webmanifest', 'sitemap.xml', 'sitemap-index.xml', 'sitemap-images.xml', 'sitemap-locales.xml'].includes(fileRel)
    );
  });
  const slopPatterns = [
    /\b(?:delve|leverage|utilize|seamless|robust|elevate|streamline|ecosystem|synergy|empower|meticulously|tapestry|underscore|pivotal|groundbreaking)\b/i,
    /\b(?:game-changer|cutting-edge|next-gen)\b/i,
    /in today['’]s fast-paced world/i,
    /whether you['’]re (?:a|an) /i,
    /let['’]s (?:dive|unpack)/i,
    /what does this mean for you\?/i,
    /[🚀✨📊]/u,
  ];
  for (const file of publicIdentityFiles) {
    const source = fs.readFileSync(file, 'utf8');
    if (/(?:^|[^A-Za-z0-9_])FillPro(?:[^A-Za-z0-9_]|$)|Entryhand/i.test(source)) {
      fail(`${rel(file)}: public source contains a retired product name`);
    }
    if (/stealthyapps\.com\/fillpro\/|(?:href|content|url)=["']\/fillpro\//i.test(source)) {
      fail(`${rel(file)}: public source contains the retired product route`);
    }
    for (const pattern of slopPatterns) {
      if (pattern.test(source)) fail(`${rel(file)}: public copy matches banned AI-template pattern ${pattern}`);
    }
  }

  const siteScript = fs.readFileSync(path.join(ROOT, 'site.js'), 'utf8');
  for (const retiredIdentifier of ['FILLPRO_STORE_LINKS', 'FILLPRO_EXTENSION_IDS']) {
    if (siteScript.includes(retiredIdentifier)) fail(`site.js: retired site-only identifier remains: ${retiredIdentifier}`);
  }

  const redirectScript = fs.readFileSync(path.join(ROOT, 'legacy-product-redirect.js'), 'utf8');
  if (!redirectScript.includes('window.location.replace(target + window.location.search + window.location.hash)')) {
    fail('legacy-product-redirect.js: legacy redirects must preserve query strings and hashes');
  }

  const legacyPages = files.filter((file) => {
    const fileRel = rel(file);
    return file.endsWith('.html') && (
      fileRel === 'fillpro.html' ||
      fileRel.startsWith('fillpro/') ||
      fileRel.startsWith('fillpro.com/') ||
      fileRel.startsWith('apps/fillpro/') ||
      fileRel.startsWith('extensions/fillpro/')
    );
  });
  for (const file of legacyPages) {
    const source = fs.readFileSync(file, 'utf8');
    const target = (source.match(/data-redirect-target=["']([^"']+)["']/i) || [])[1] || '';
    if (!target || !/^\/(?:skip-retyping|support|contact)(?:\/|$)/.test(target)) {
      fail(`${rel(file)}: legacy page is missing a safe canonical redirect target`);
    }
    if (!/<meta name="robots" content="noindex, follow">/.test(source)) {
      fail(`${rel(file)}: legacy page must be noindex, follow`);
    }
    if (!source.includes('/legacy-product-redirect.js')) {
      fail(`${rel(file)}: legacy page must use the shared query/hash-preserving redirect`);
    }
    if (/\/fillpro\//i.test(target)) fail(`${rel(file)}: legacy page redirects back to the retired route`);
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
checkProductHero();
checkPackageScripts();
checkDemoGenerator();
checkLaunchPage();
checkRelatedGuides();
checkChangelog(files);
checkAssetVersioning(files);
checkIndexNowKey();
checkCrawlerSurfaces();
checkLocalization();
checkCommercePolicies();
checkPublicIdentityAndRedirects(files);

if (failures.length) {
  console.error(`Skip Retyping site audit failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Skip Retyping site audit passed: ${checked.html} HTML, ${checked.jsonLd} JSON-LD, ${checked.images} images, ${checked.footers} footers, ${checked.navs} navs, ${checked.metadata} metadata groups, ${checked.accessibility} CSS/accessibility suite.`,
);
