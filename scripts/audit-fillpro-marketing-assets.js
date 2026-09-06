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

function getRuntimeMarketingLocales() {
  const sourcePath = path.join(
    WORKSPACE,
    'fillpro',
    'release-tools',
    'runtime-ui-locales.json',
  );
  if (!fs.existsSync(sourcePath)) {
    fail('localized screenshots: runtime UI locale source missing');
    return [];
  }
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const locales = (source.supportedLocales || []).filter(
    (locale) => locale !== 'en',
  );
  if (!locales.length) {
    fail('localized screenshots: runtime UI locale source has no translated languages');
  }
  return locales;
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
  const locales = getRuntimeMarketingLocales();
  const topLevelKeys = [
    'badge',
    'headline',
    'intro',
    'profilesHeadline',
    'captureHeadline',
    'modernHeadline',
    'privacyHeadline',
    'undoHeadline',
    'actualUiNote',
    'destinationPrivacyNote',
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
    'password',
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
      if (!/^en_/.test(locale) && untranslatedDefaults.has(value)) {
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
  const locales = getRuntimeMarketingLocales();
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
        { encoding: 'utf8', windowsHide: true },
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
        { encoding: 'utf8', windowsHide: true },
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
  if (Math.abs(duration - 22) > 0.1) fail(`${relativePath}: expected the same 22-second story as the store demo, got ${duration.toFixed(2)}s`);
  if (fps < 23.5 || fps > 24.5) fail(`${relativePath}: expected 24fps, got ${fps.toFixed(2)}fps`);
  checkTransitionContinuity(relativePath, target);
}

function checkRenderer() {
  checked.renderer += 1;
  const hash = (target) => require('crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  const receiptPath = filePath('assets/marketplace/captures/provenance.json');
  const videoReceiptPath = filePath('assets/marketplace/video-provenance.json');
  if (!fs.existsSync(receiptPath) || !fs.existsSync(videoReceiptPath)) {
    fail('Real-source media provenance is missing');
    return;
  }
  const capture = JSON.parse(fs.readFileSync(receiptPath));
  const video = JSON.parse(fs.readFileSync(videoReceiptPath));
  const checkHashes = (entries, root) => Object.entries(entries).every(([file, expected]) => {
    const target = path.resolve(root, file);
    return target.startsWith(path.resolve(root) + path.sep) && fs.existsSync(target) && hash(target) === expected;
  });
  if (Object.keys(capture.extensionHashes || {}).length < 9 || !checkHashes(capture.extensionHashes, path.join(WORKSPACE, 'fillpro'))) fail('Recapture the current extension: source hashes changed');
  if (Object.keys(capture.artifacts || {}).length < 6 || !checkHashes(capture.artifacts, filePath('assets/marketplace/captures'))) fail('Captured product pixels changed');
  if (capture.captureScriptHash !== hash(filePath('scripts/capture-fillpro-demo.js'))) fail('Capture script changed after verification');
  if (video.captureReceiptHash !== hash(receiptPath) || video.rendererHash !== hash(filePath('scripts/render-fillpro-store-video.js'))) fail('Video provenance does not match its capture or renderer');
  if (Object.keys(video.artifacts || {}).length !== 6 || !checkHashes(video.artifacts, filePath('assets'))) fail('Video output bytes changed');
  if (capture.filled?.name !== 'Alex Morgan' || capture.filled?.password !== '' || capture.filled?.resume !== 'alex-resume.pdf') fail('Real capture did not demonstrate the claimed name/upload/safety result');
  if (capture.assertions?.length < 3 || video.durationSeconds !== 22 || video.fps !== 24) fail('Real task assertions or video format missing');
  if (checkHashes({ 'filled-form.png': 'deliberately-invalid-hash' }, filePath('assets/marketplace/captures'))) fail('Negative control: capture hash verification accepted altered evidence');
  const renderer = fs.readFileSync(filePath('scripts/render-fillpro-store-video.js'), 'utf8');
  if (!renderer.includes('not a speed benchmark') || !renderer.includes('Actual extension UI. Local test form. Edited for readability.')) fail('Edited demonstration must disclose its scope');
  if (/themeFor|renderFields|fillButton.*textContent/.test(renderer)) fail('Synthetic UI or cosmetic theme switching returned to the real capture renderer');
}

function checkStillRenderer() {
  checked.renderer += 1;
  const receiptPath = filePath('assets/marketplace/stills-provenance.json');
  if (!fs.existsSync(receiptPath)) { fail('Real still-asset provenance missing'); return; }
  const receipt = JSON.parse(fs.readFileSync(receiptPath));
  const hash = (file) => require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (receipt.captureReceiptHash !== hash(filePath('assets/marketplace/captures/provenance.json'))) fail('Still assets use stale captures');
  if (receipt.rendererHash !== hash(filePath('scripts/render-fillpro-real-stills.js'))) fail('Still renderer changed after capture');
  if (receipt.localizedCopyHash !== hash(filePath('scripts/fillpro-localized-marketplace-copy.json'))) fail('Localized still copy changed');
  const expectedStills = (getRuntimeMarketingLocales().length + 1) * 5 + 4;
  if (Object.keys(receipt.artifacts || {}).length !== expectedStills) fail(`Expected ${expectedStills} stills covering every runtime locale and four promotional assets`);
  for (const [file, expected] of Object.entries(receipt.artifacts || {})) {
    const target = path.resolve(ROOT, 'assets', file);
    if (!target.startsWith(path.resolve(ROOT, 'assets') + path.sep) || !fs.existsSync(target) || hash(target) !== expected) fail('Still output changed: ' + file);
  }
  const source = fs.readFileSync(filePath('scripts/render-fillpro-real-stills.js'), 'utf8');
  if (!source.includes('marketing bounds') || !source.includes('Some advanced UI remains in English')) fail('Still layout checks or honest localization scope missing');
  const wrapper = fs.readFileSync(filePath('scripts/render-fillpro-assets.js'), 'utf8');
  for (const file of ['capture-fillpro-demo.js', 'render-fillpro-real-stills.js', 'render-fillpro-store-video.js']) if (!wrapper.includes(file)) fail('Asset pipeline must rebuild real captures, stills and video together: ' + file);
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
