const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..');

const failures = [];
const checked = {
  images: 0,
  videos: 0,
  renderer: 0,
  icons: 0,
  captions: 0,
  transitions: 0,
};

function fail(message) {
  failures.push(message);
}

function filePath(relativePath) {
  return path.join(ROOT, relativePath);
}

function assertFile(relativePath, minBytes = 1024, maxBytes = 25 * 1024 * 1024) {
  const target = filePath(relativePath);
  if (!fs.existsSync(target)) {
    fail(`${relativePath}: missing`);
    return null;
  }
  const stat = fs.statSync(target);
  if (stat.size < minBytes) fail(`${relativePath}: suspiciously small (${stat.size} bytes)`);
  if (stat.size > maxBytes) fail(`${relativePath}: too large for a store asset (${stat.size} bytes)`);
  return target;
}

function checkLocalizedCaptions() {
  const root = filePath('assets/marketplace/localized');
  const manifestPath = path.join(root, 'caption-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail('localized captions: manifest missing');
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.durationSeconds !== 22 || manifest.locales.length !== 25) {
    fail(`localized captions: expected 25 locales for a 22-second video, got ${JSON.stringify(manifest)}`);
    return;
  }
  for (const locale of manifest.locales) {
    const target = path.join(root, locale, 'skip-retyping-store-demo-22s.vtt');
    if (!fs.existsSync(target)) {
      fail(`localized captions: missing ${locale}`);
      continue;
    }
    const text = fs.readFileSync(target, 'utf8');
    const cueCount = (text.match(/-->/g) || []).length;
    if (!text.startsWith('WEBVTT\n') || cueCount !== 5 || !text.includes('00:00:22.000')) {
      fail(`localized captions: ${locale} has an invalid timeline`);
    }
    if (text.includes('\ufffd')) fail(`localized captions: ${locale} contains a replacement character`);
    checked.captions += 1;
  }
}

function checkLocalizedScreenshotCopy() {
  const sourcePath = filePath('scripts/fillpro-localized-marketplace-copy.json');
  if (!fs.existsSync(sourcePath)) {
    fail('localized screenshots: copy source missing');
    return;
  }
  const copy = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const locales = ['de', 'es', 'fr', 'pt_BR', 'ja', 'ko', 'ru', 'zh_CN'];
  const topLevelKeys = [
    'badge',
    'headline',
    'intro',
    'profilesHeadline',
    'captureHeadline',
    'modernHeadline',
    'privacyHeadline',
    'undoHeadline',
  ];
  const uiKeys = [
    'beforeTitle',
    'afterTitle',
    'workProfile',
    'profileDetail',
    'fillPage',
    'filledPage',
    'saveFilledPage',
    'newProfile',
    'reviewAndSave',
    'undoLastFill',
    'fullName',
    'workEmail',
    'company',
    'phone',
    'resume',
    'savedProfiles',
    'profileContents',
    'applicantProfile',
    'applicantContents',
    'smartRules',
    'intakeForm',
    'preferredContact',
    'email',
    'modernControls',
    'dropdowns',
    'checkboxes',
    'lateFields',
    'matchedFromProfile',
    'readyForReview',
    'profileStorage',
    'savedByExtension',
    'pageAccess',
    'runsOnChosenPage',
    'finalSay',
    'youReviewSubmit',
    'clearControl',
    'fillAction',
    'yourClick',
    'formSubmission',
    'yourDecision',
    'reviewBeforeSubmit',
    'portfolio',
    'fieldsChanged',
    'undoAvailable',
    'rollbackWithoutReload',
  ];
  const untranslatedDefaults = new Set([
    'Client onboarding',
    'After Skip Retyping',
    'Work profile',
    '12 fields, 1 upload, 2 smart rules',
    'Fill Page',
    'Undo last fill',
    'Full name',
    'Work email',
    'Company',
    'Phone',
    'Resume upload',
    'Saved profiles',
    'Applicant profile',
    'Smart rules',
    'Job application',
    'Preferred contact',
    'Modern controls',
    'Dropdowns',
    'Checkboxes',
    'Late fields',
    'Matched from the profile.',
    'Ready for review',
    'Profile storage',
    'Stored by Skip Retyping in your browser.',
    'Page access',
    'Runs on the page you choose.',
    'Final say',
    'You review and submit.',
    'Clear control',
    'Fill action',
    'Your click',
    'Form submission',
    'Your decision',
    'Review before submit',
    '8 fields changed',
    'Undo snapshot saved',
    'Roll back without reloading.',
  ]);

  if (Object.keys(copy).sort().join(',') !== locales.slice().sort().join(',')) {
    fail(`localized screenshots: expected copy for ${locales.join(', ')}`);
  }
  for (const locale of locales) {
    const entry = copy[locale];
    if (!entry || typeof entry !== 'object') continue;
    for (const key of topLevelKeys) {
      if (!String(entry[key] || '').trim()) fail(`localized screenshots: ${locale} missing ${key}`);
    }
    for (const key of uiKeys) {
      const value = String(entry.ui?.[key] || '').trim();
      if (!value) fail(`localized screenshots: ${locale} missing ui.${key}`);
      if (untranslatedDefaults.has(value)) {
        fail(`localized screenshots: ${locale} left ui.${key} in English`);
      }
    }
    if (JSON.stringify(entry).includes('\ufffd')) {
      fail(`localized screenshots: ${locale} contains a replacement character`);
    }
  }
}

async function checkLocalizedScreenshots() {
  checkLocalizedScreenshotCopy();
  const locales = ['de', 'es', 'fr', 'pt_BR', 'ja', 'ko', 'ru', 'zh_CN'];
  const names = ['fill-page', 'profiles', 'modern-forms', 'privacy', 'undo'];
  for (const locale of locales) {
    for (const name of names) {
      await checkImage(
        `assets/marketplace/localized/${locale}/skip-retyping-screenshot-${name}-1280x800.png`,
        1280,
        800,
        { requireOpaque: true },
      );
    }
  }
}

async function checkImage(relativePath, width, height, options = {}) {
  checked.images += 1;
  const target = assertFile(relativePath, options.minBytes || 8 * 1024, options.maxBytes || 2 * 1024 * 1024);
  if (!target) return;
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    fail(`${relativePath}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  }
  if (metadata.format !== 'png') fail(`${relativePath}: expected PNG, got ${metadata.format}`);
  if (options.requireOpaque && metadata.hasAlpha) {
    fail(`${relativePath}: store screenshots must be fully opaque`);
  }
  if (options.maxMeanLuma || options.minColorSpread) await checkImageEnergy(relativePath, target, options);
}

async function checkAbsolutePng(label, absolutePath, width, height, options = {}) {
  checked.icons += 1;
  if (!fs.existsSync(absolutePath)) {
    fail(`${label}: missing`);
    return;
  }
  const metadata = await sharp(absolutePath).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    fail(`${label}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  }
  if (metadata.format !== 'png') fail(`${label}: expected PNG, got ${metadata.format}`);
  if (options.minBytes) {
    const stat = fs.statSync(absolutePath);
    if (stat.size < options.minBytes) fail(`${label}: suspiciously small (${stat.size} bytes)`);
  }
  if (options.optics) {
    await checkIconOptics(label, absolutePath, options.optics);
  }
}

async function checkIconOptics(label, absolutePath, options = {}) {
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let alphaPixels = 0;
  let opaquePixels = 0;
  let lumaTotal = 0;
  let colorSpreadTotal = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      if (alpha > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        alphaPixels += 1;
      }
      if (alpha > 180) {
        opaquePixels += 1;
        lumaTotal += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        colorSpreadTotal += Math.max(red, green, blue) - Math.min(red, green, blue);
      }
    }
  }

  if (!alphaPixels || maxX < minX || maxY < minY) {
    fail(`${label}: icon has no visible pixels`);
    return;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const coverage = (width * height) / (info.width * info.height);
  const minEdge = Math.min(minX, minY, info.width - 1 - maxX, info.height - 1 - maxY);
  const meanLuma = opaquePixels ? lumaTotal / opaquePixels : 0;
  const meanColorSpread = opaquePixels ? colorSpreadTotal / opaquePixels : 0;
  const minCoverage = options.minCoverage ?? 0.52;
  const maxCoverage = options.maxCoverage ?? 0.9;
  const minEdgePadding = options.minEdgePadding ?? 1;
  const minColorSpread = options.minColorSpread ?? 45;
  const minMeanLuma = options.minMeanLuma ?? 90;
  const maxMeanLuma = options.maxMeanLuma ?? 210;

  if (coverage < minCoverage || coverage > maxCoverage) {
    fail(`${label}: visible bounds coverage ${coverage.toFixed(2)} outside ${minCoverage}-${maxCoverage}`);
  }
  if (minEdge < minEdgePadding) {
    fail(`${label}: needs at least ${minEdgePadding}px transparent edge padding, got ${minEdge}px`);
  }
  if (meanColorSpread < minColorSpread) {
    fail(`${label}: color spread too low for toolbar/store browse visibility (${meanColorSpread.toFixed(1)})`);
  }
  if (meanLuma < minMeanLuma || meanLuma > maxMeanLuma) {
    fail(`${label}: mean luma ${meanLuma.toFixed(1)} outside ${minMeanLuma}-${maxMeanLuma}`);
  }
}

async function imageBuffer(relativePath) {
  const target = filePath(relativePath);
  return sharp(target)
    .resize(96, 60, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
}

async function imageMeanDifference(a, b) {
  const [left, right] = await Promise.all([imageBuffer(a), imageBuffer(b)]);
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs(left[index] - right[index]);
  }
  return total / left.length;
}

async function checkScreenshotDistinctness(paths) {
  for (let index = 0; index < paths.length; index += 1) {
    for (let other = index + 1; other < paths.length; other += 1) {
      const difference = await imageMeanDifference(paths[index], paths[other]);
      if (difference < 8) {
        fail(`${paths[index]} and ${paths[other]} look too similar (${difference.toFixed(2)} mean pixel delta)`);
      }
    }
  }
}

async function checkImageEnergy(relativePath, target, options) {
  const { data, info } = await sharp(target)
    .resize(64, 64, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let lumaTotal = 0;
  let colorSpreadTotal = 0;
  const pixels = info.width * info.height;
  for (let index = 0; index < data.length; index += 3) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    lumaTotal += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    colorSpreadTotal += Math.max(red, green, blue) - Math.min(red, green, blue);
  }
  const meanLuma = lumaTotal / pixels;
  const meanColorSpread = colorSpreadTotal / pixels;
  if (options.maxMeanLuma && meanLuma > options.maxMeanLuma) {
    fail(`${relativePath}: promo art is too pale for store browse surfaces (${meanLuma.toFixed(1)} mean luma)`);
  }
  if (options.minColorSpread && meanColorSpread < options.minColorSpread) {
    fail(`${relativePath}: promo art is not saturated enough (${meanColorSpread.toFixed(1)} mean color spread)`);
  }
}

function parseRate(rate) {
  const [num, den] = String(rate || '').split('/').map(Number);
  if (!num || !den) return 0;
  return num / den;
}

function checkTransitionContinuity(relativePath, target) {
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const centers = [3.2, 8, 12.6, 17.2];
  for (const center of centers) {
    let output;
    try {
      output = execFileSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel', 'error',
          '-ss', String(center - 0.8),
          '-i', target,
          '-t', '1.6',
          '-vf', 'tblend=all_mode=difference,signalstats,metadata=print:file=-',
          '-an',
          '-f', 'null',
          nullDevice,
        ],
        { encoding: 'utf8', windowsHide: true },
      );
    } catch (error) {
      fail(`${relativePath}: transition probe failed near ${center}s (${error.message})`);
      continue;
    }
    const deltas = Array.from(output.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g), (match) => Number(match[1]));
    if (!deltas.length) {
      fail(`${relativePath}: transition probe returned no frame deltas near ${center}s`);
      continue;
    }
    const maxDelta = Math.max(...deltas);
    if (maxDelta > 12) {
      fail(`${relativePath}: hard visual cut near ${center}s (${maxDelta.toFixed(2)} adjacent-frame luma delta)`);
    }
    checked.transitions += 1;
  }
}

function checkVideo(relativePath) {
  checked.videos += 1;
  const target = assertFile(relativePath, 250 * 1024, 20 * 1024 * 1024);
  if (!target) return;
  let data;
  try {
    data = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', target],
        { encoding: 'utf8' },
      ),
    );
  } catch (error) {
    fail(`${relativePath}: ffprobe failed (${error.message})`);
    return;
  }
  const video = (data.streams || []).find((stream) => stream.codec_type === 'video');
  const audio = (data.streams || []).find((stream) => stream.codec_type === 'audio');
  if (!video) {
    fail(`${relativePath}: no video stream`);
    return;
  }
  if (audio) fail(`${relativePath}: should not rely on audio; the store demo must work muted`);
  const duration = Number(data.format?.duration || video.duration || 0);
  const fps = parseRate(video.avg_frame_rate);
  if (video.codec_name !== 'h264') fail(`${relativePath}: expected H.264, got ${video.codec_name}`);
  if (video.width !== 1280 || video.height !== 720) {
    fail(`${relativePath}: expected 1280x720, got ${video.width}x${video.height}`);
  }
  if (duration < 20 || duration > 35) fail(`${relativePath}: expected 20-35 seconds, got ${duration.toFixed(2)}s`);
  if (fps < 23.5 || fps > 30.5) fail(`${relativePath}: expected 24-30fps, got ${fps.toFixed(2)}fps`);
  checkTransitionContinuity(relativePath, target);
}

function checkHeroVideo(relativePath) {
  checked.videos += 1;
  const target = assertFile(relativePath, 30 * 1024, 500 * 1024);
  if (!target) return;
  let data;
  try {
    data = JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', target],
        { encoding: 'utf8' },
      ),
    );
  } catch (error) {
    fail(`${relativePath}: ffprobe failed (${error.message})`);
    return;
  }
  const video = (data.streams || []).find((stream) => stream.codec_type === 'video');
  const audio = (data.streams || []).find((stream) => stream.codec_type === 'audio');
  if (!video) {
    fail(`${relativePath}: no video stream`);
    return;
  }
  const duration = Number(data.format?.duration || video.duration || 0);
  const fps = parseRate(video.avg_frame_rate);
  if (audio) fail(`${relativePath}: hero demo should be mute-safe`);
  if (video.codec_name !== 'h264') fail(`${relativePath}: expected H.264, got ${video.codec_name}`);
  if (video.width !== 960 || video.height !== 540) {
    fail(`${relativePath}: expected 960x540, got ${video.width}x${video.height}`);
  }
  if (duration < 1.5 || duration > 3) fail(`${relativePath}: expected 1.5-3 seconds, got ${duration.toFixed(2)}s`);
  if (fps < 2.5 || fps > 4) fail(`${relativePath}: expected about 3fps, got ${fps.toFixed(2)}fps`);
}

function checkRenderer() {
  checked.renderer += 1;
  const relativePath = 'scripts/render-fillpro-store-video.js';
  const target = assertFile(relativePath, 8 * 1024, 80 * 1024);
  if (!target) return;
  const source = fs.readFileSync(target, 'utf8');
  const required = [
    'const WIDTH = 1280;',
    'const HEIGHT = 720;',
    'const FPS = 24;',
    'const DURATION = 22;',
    'const FIRST_FILL_BEFORE_SECONDS = 1.25;',
    'const POSTER_FRAME_SECONDS = 3.75;',
    'requestAnimationFrame(resolve)',
    'skip-retyping-store-demo-22s.mp4',
    'skip-retyping-store-demo-22s-thumb.png',
    'Mute-safe captions',
    'Another job\\\\napplication?',
    'Fill the details you already saved.',
    'One click.\\\\nDetails filled.',
    'Your name, email, phone, and saved resume are ready to check.',
    'Review first.\\\\nSubmit yourself.',
    'It keeps up\\\\nwith the form.',
    'Start free.\\\\nLifetime Pro: $39.99.',
    'Every Pro plan adds up to 500 profiles, duplication, and backup imports.',
    'One payment',
    'Monthly + yearly available',
    'careers.example.com/apply',
    'careers.example.com/apply/step-2',
    'fields and your resume are ready to review',
    'application details are ready to review',
    'Use your password manager',
    'No auto-submit',
    'windowOpacity',
    'const themeTokens = [',
    'function themeFor(t)',
    'function formSwapOpacity(t, center)',
    'function applyTheme(stage, amount)',
    '--stage-bg-a',
    'const phaseOutro =',
    'cursorFor',
    '--field-shine',
    '--button-shine',
    'validateFrame(page, time)',
    'Video frame ${time.toFixed(2)}s failed layout QA',
    'frame % FPS === 0',
  ];
  for (const needle of required) {
    if (!source.includes(needle)) fail(`${relativePath}: missing ${needle}`);
  }
  if (!/if \(t < 1\.2\) return 1;/.test(source)) {
    fail(`${relativePath}: the first field should fill during the opening hook`);
  }
  if (!/if \(t < 2\.55\) return 4;/.test(source)) {
    fail(`${relativePath}: the resume should be filled before the first proof scene`);
  }
  if (!/String\(POSTER_FRAME_SECONDS\)/.test(source)) {
    fail(`${relativePath}: poster thumbnail should render from the early value frame`);
  }
  if (/radial-gradient|payoff-card|kinetic-layer|sceneFor\(|class="version"|v1\.0\.0|Passwords skipped/i.test(source)) {
    fail(`${relativePath}: old slideshow, orb, version-badge, or repetitive-boundary treatment returned`);
  }
  if (/Client intake|Partner intake|Team intake|team-intake/i.test(source)) {
    fail(`${relativePath}: unrelated intake copy returned to the job-application story`);
  }
  if (/classList\.toggle\(['"]is-dark/.test(source)) {
    fail(`${relativePath}: hard theme cuts must not replace the timed color crossfade`);
  }
  if (!source.includes('Screenshots are rendered by render-fillpro-assets.js')) {
    fail(`${relativePath}: should leave still screenshots to the dedicated still renderer`);
  }
}

function checkStillRenderer() {
  checked.renderer += 1;
  const relativePath = 'scripts/render-fillpro-assets.js';
  const target = assertFile(relativePath, 8 * 1024, 100 * 1024);
  if (!target) return;
  const source = fs.readFileSync(target, 'utf8');
  const required = [
    'skip-retyping-screenshot-fill-page-1280x800.png',
    'skip-retyping-screenshot-modern-forms-1280x800.png',
    'skip-retyping-screenshot-profiles-1280x800.png',
    'skip-retyping-screenshot-privacy-1280x800.png',
    'skip-retyping-screenshot-undo-1280x800.png',
    'skip-retyping-small-promo-440x280.png',
    'skip-retyping-marquee-1400x560.png',
    'Fill the fields you keep retyping.',
    'Choose a saved profile, fill the page, then review before you submit.',
    'Turn a filled form into a reusable profile.',
    'Save this filled page',
    'Fill more than basic text boxes.',
    'Review the fill. Undo it if needed.',
    'Roll the last Skip Retyping changes back without reloading the page.',
    'Fill repeat forms from saved profiles.',
    'Stored in your browser',
    'Saved profiles stay in your browser.',
    'shot-outcome',
    'shot-modern',
    'shot-profiles',
    'shot-privacy',
    'shot-undo',
    'What Skip Retyping handles',
    'field-grid',
    'Catch fields that appear after the first pass.',
    'forms.example.com/demo-request',
    'careers.example.com/apply',
    "values[7] ? 'Ready for review' : 'Filling application fields'",
    'brandPromo',
    'promo-row',
    'alex-morgan.pdf',
    'smallIconSvg',
    'size <= 48',
  ];
  for (const needle of required) {
    if (!source.includes(needle)) fail(`${relativePath}: missing ${needle}`);
  }
  if (source.includes('radial-gradient')) {
    fail(`${relativePath}: marketing renderer should use structured geometry, not gradient orbs`);
  }
  if (!source.includes('.profile strong { color: #10231f;')) {
    fail(`${relativePath}: light profile cards need an explicit dark text color inside dark compositions`);
  }
  if (!source.includes('color: #10231f;\n    font-size: 24px;')) {
    fail(`${relativePath}: light form and panel headings need an explicit dark text color`);
  }
  if (!source.includes("const clipped = await page.evaluate")) {
    fail(`${relativePath}: renderer should reject clipped marketing UI before writing screenshots`);
  }
  if (/Keep submit in your hands/i.test(source)) {
    fail(`${relativePath}: first screenshot copy uses awkward submit phrasing`);
  }
  if (/Fill the repeated fields/i.test(source)) {
    fail(`${relativePath}: first screenshot copy should not use stiff repeated-fields phrasing`);
  }
  if (/Save once\. Fill the next long form\./i.test(source)) {
    fail(`${relativePath}: first screenshot headline should avoid the old repetitive launch line`);
  }
  if (/Save your details once\./i.test(source)) {
    fail(`${relativePath}: first screenshot should use the direct one-click outcome, not generic save-once copy`);
  }
  if (/Pick a profile, fill the page, then review before you submit\./i.test(source)) {
    fail(`${relativePath}: first screenshot should avoid generic pick-fill-review phrasing`);
  }
  if (/core filling|core fill|core use/i.test(source)) {
    fail(`${relativePath}: still screenshots should avoid stiff "core" account phrasing`);
  }
  if (/form leaves the page/i.test(source)) {
    fail(`${relativePath}: still screenshots should use plain submit language`);
  }
  if (/Review everything before submit/i.test(source)) {
    fail(`${relativePath}: first screenshot copy should use natural review phrasing`);
  }
  if (/Fill repeated forms faster\./.test(source)) {
    fail(`${relativePath}: small promo should be brand-forward, not a text-heavy mini ad`);
  }
  if (/real workflows|Clean fallback|Messy forms are part of the job/i.test(source)) {
    fail(`${relativePath}: marketing copy should use concrete outcomes instead of generic workflow/fallback phrasing`);
  }
  if (/forms browsers leave unfinished|No cloud profile account|repeat work|repeat fields|late fields included/i.test(source)) {
    fail(`${relativePath}: still marketing contains stiff or synthetic phrasing`);
  }
  if (/Google Forms-style|ARIA radios|ARIA checkboxes|React inputs|Vue fields|Angular forms|Shadow DOM/i.test(source)) {
    fail(`${relativePath}: store screenshots should use buyer-facing field language, not framework jargon or third-party product phrasing`);
  }
  if (/Same-page sections|<span class="chip">Radios<\/span>|If a page labels a field oddly/i.test(source)) {
    fail(`${relativePath}: store screenshots should avoid technical or cramped fallback wording`);
  }
  if (/Client intake|Partner intake|Team intake|team-intake/i.test(source)) {
    fail(`${relativePath}: unrelated intake copy returned to the marketing assets`);
  }
  if (/Tricky fields|Fields browser autofill often misses|<div class="chips">[\s\S]*Choice buttons|Grouped sections/i.test(source)) {
    fail(`${relativePath}: modern-form screenshot should use a product-proof field grid, not pill-heavy template copy`);
  }
  if (/stroke="#ffffff" stroke-width="1" opacity="0\.16"|<rect x="1" y="1" width="14" height="14" rx="3"/i.test(source)) {
    fail(`${relativePath}: 16px toolbar icon should use the pixel-cut optical mark, not the old stroked rounded rect`);
  }
  if (/chromeFrame\('Demo request'/i.test(source)) {
    fail(`${relativePath}: profile screenshot should use a realistic URL-like browser label`);
  }
  if (/promo-line/i.test(source)) {
    fail(`${relativePath}: promo tiles should use concrete product rows, not generic bars`);
  }
}

function checkReviewRenderer() {
  const relativePath = 'scripts/render-fillpro-review-sheets.js';
  const target = assertFile(relativePath, 1024);
  if (!target) return;
  const source = fs.readFileSync(target, 'utf8');
  for (const needle of [
    'skip-retyping-small-promo-440x280.png',
    'skip-retyping-marquee-1400x560.png',
    'marketing-contact-sheet-current-review.jpg',
    'localized-contact-sheet-current-review.jpg',
    'video-contact-sheet-current-review.jpg',
    'writeReviewCopy',
  ]) {
    if (!source.includes(needle)) fail(relativePath + ': missing ' + needle);
  }
}

async function checkIconSystem() {
  const siteSvg = fs.readFileSync(filePath('assets/skip-retyping-logo.svg'), 'utf8').trim();
  const extensionSvgPath = path.join(WORKSPACE, 'fillpro', 'icons', 'icon-source.svg');
  if (!fs.existsSync(extensionSvgPath)) {
    fail('fillpro/icons/icon-source.svg: missing');
    return;
  }
  const extensionSvg = fs.readFileSync(extensionSvgPath, 'utf8').trim();
  if (siteSvg !== extensionSvg) {
    fail('Skip Retyping logo mismatch: website SVG and extension source SVG must stay identical');
  }
  for (const [label, source] of [
    ['assets/skip-retyping-logo.svg', siteSvg],
    ['fillpro/icons/icon-source.svg', extensionSvg],
  ]) {
    if (/<text|<image|<foreignObject|href=|data:image/i.test(source)) {
      fail(`${label}: logo source should stay self-owned vector paths, not text, raster embeds, or remote assets`);
    }
    if (!/aria-label="Skip Retyping icon"/.test(source)) {
      fail(`${label}: missing Skip Retyping icon aria label`);
    }
  }
  const manifestPath = path.join(WORKSPACE, 'fillpro', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.icons?.['32'] !== 'icons/icon32.png') {
    fail('fillpro/manifest.json: root icons should declare icon32.png for high-DPI/Windows surfaces');
  }
  if (manifest.action?.default_icon?.['32'] !== 'icons/icon32.png') {
    fail('fillpro/manifest.json: action.default_icon should declare icon32.png so toolbar surfaces do not resample another size');
  }
  for (const size of [16, 32, 48, 128, 256, 512]) {
    const isCompactIcon = size <= 48;
    const optics = isCompactIcon
      ? {
          minCoverage: size === 48 ? 0.72 : 0.68,
          maxCoverage: size === 48 ? 0.84 : 0.9,
          minEdgePadding: size === 16 ? 1 : 2,
          minColorSpread: 55,
        }
      : {
          minCoverage: 0.58,
          maxCoverage: 0.78,
          minEdgePadding: Math.max(3, Math.floor(size * 0.06)),
          minColorSpread: 50,
        };
    await checkAbsolutePng(
      `fillpro/icons/icon${size}.png`,
      path.join(WORKSPACE, 'fillpro', 'icons', `icon${size}.png`),
      size,
      size,
      { minBytes: size <= 16 ? 200 : 500, optics },
    );
  }
  await checkAbsolutePng(
    'fillpro/icons/icon_master_1024.png',
    path.join(WORKSPACE, 'fillpro', 'icons', 'icon_master_1024.png'),
    1024,
    1024,
    {
      minBytes: 8 * 1024,
      optics: {
        minCoverage: 0.58,
        maxCoverage: 0.78,
        minEdgePadding: 60,
        minColorSpread: 50,
      },
    },
  );
}

async function main() {
  await checkImage('assets/skip-retyping-logo.png', 512, 512, { maxBytes: 1024 * 1024 });
  await checkImage('assets/skip-retyping-og.png', 1200, 630, { maxBytes: 2 * 1024 * 1024 });
  await checkImage('assets/skip-retyping-demo-poster.png', 960, 540, { maxBytes: 2 * 1024 * 1024 });
  checkHeroVideo('assets/skip-retyping-demo.mp4');
  await checkImage('assets/marketplace/skip-retyping-small-promo-440x280.png', 440, 280, {
    maxBytes: 1024 * 1024,
    maxMeanLuma: 190,
    minColorSpread: 35,
  });
  await checkImage('assets/marketplace/skip-retyping-marquee-1400x560.png', 1400, 560, {
    maxBytes: 2 * 1024 * 1024,
    maxMeanLuma: 190,
    minColorSpread: 35,
  });
  const screenshots = [
    'assets/marketplace/skip-retyping-screenshot-fill-page-1280x800.png',
    'assets/marketplace/skip-retyping-screenshot-modern-forms-1280x800.png',
    'assets/marketplace/skip-retyping-screenshot-profiles-1280x800.png',
    'assets/marketplace/skip-retyping-screenshot-privacy-1280x800.png',
    'assets/marketplace/skip-retyping-screenshot-undo-1280x800.png',
  ];
  for (const screenshot of screenshots) {
    await checkImage(screenshot, 1280, 800, { requireOpaque: true });
  }
  await checkLocalizedScreenshots();
  await checkScreenshotDistinctness(screenshots);
  await checkImage('assets/marketplace/skip-retyping-store-demo-22s-thumb.png', 1280, 720);
  checkVideo('assets/marketplace/skip-retyping-store-demo-22s.mp4');
  checkLocalizedCaptions();
  checkRenderer();
  checkStillRenderer();
  checkReviewRenderer();
  await checkIconSystem();

  if (failures.length) {
    console.error(`Skip Retyping marketing asset audit failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Skip Retyping marketing asset audit passed: ${checked.images} images, ${checked.videos} video, ${checked.captions} caption tracks, ${checked.renderer} renderer, ${checked.icons} icon checks, ${checked.transitions} transition checks.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
