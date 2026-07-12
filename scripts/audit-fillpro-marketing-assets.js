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

async function checkImage(relativePath, width, height, options = {}) {
  checked.images += 1;
  const target = assertFile(relativePath, options.minBytes || 8 * 1024, options.maxBytes || 2 * 1024 * 1024);
  if (!target) return;
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    fail(`${relativePath}: expected ${width}x${height}, got ${metadata.width}x${metadata.height}`);
  }
  if (metadata.format !== 'png') fail(`${relativePath}: expected PNG, got ${metadata.format}`);
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
    'const FIRST_FILL_BEFORE_SECONDS = 3;',
    'const POSTER_FRAME_SECONDS = 5.2;',
    'requestAnimationFrame(resolve)',
    'fillpro-store-demo-22s.mp4',
    'fillpro-store-demo-22s-thumb.png',
    'Mute-safe captions',
    'A blank form.\\nOne profile.',
    'Watch the repeat work disappear.',
    'Check it. Undo it. Submit when ready.',
    'Dropdowns and late fields included.',
    'Three profiles are included.',
    'No cloud profile account.',
    'No account',
    'careers.example.com/apply',
    'forms.example.com/team-intake',
    'fields and the resume are ready to review',
    'modern form controls are ready to review',
    'Use your password manager',
    'No auto-submit',
    'windowOpacity',
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
  if (!/if \(t < 2\.8\) return 1;/.test(source)) {
    fail(`${relativePath}: the first field should fill before the 3-second mark`);
  }
  if (!/if \(t < 5\.05\) return 4;/.test(source)) {
    fail(`${relativePath}: the resume should be filled by the poster frame`);
  }
  if (!/String\(POSTER_FRAME_SECONDS\)/.test(source)) {
    fail(`${relativePath}: poster thumbnail should render from the early value frame`);
  }
  if (/radial-gradient|payoff-card|kinetic-layer|sceneFor\(|class="version"|v1\.0\.0|Passwords skipped/i.test(source)) {
    fail(`${relativePath}: old slideshow, orb, version-badge, or repetitive-boundary treatment returned`);
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
    'fillpro-screenshot-fill-page-1280x800.png',
    'fillpro-screenshot-modern-forms-1280x800.png',
    'fillpro-screenshot-profiles-1280x800.png',
    'fillpro-screenshot-privacy-1280x800.png',
    'fillpro-screenshot-undo-1280x800.png',
    'fillpro-small-promo-440x280.png',
    'fillpro-marquee-1400x560.png',
    'Fill the fields you keep retyping.',
    'Choose a saved profile, fill the page, then review before you submit.',
    'Keep each workflow in its own profile.',
    'Fill the controls basic autofill skips.',
    'Review the fill. Undo it if needed.',
    'Roll the last FillPro changes back without reloading the page.',
    'Fill repeat forms without handing over your data.',
    'Your profile stays with the extension.',
    'shot-outcome',
    'shot-modern',
    'shot-profiles',
    'shot-privacy',
    'shot-undo',
    'Built for the hard parts',
    'field-grid',
    'Catch fields that appear after the first pass.',
    'forms.example.com/demo-request',
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
  if (/forms browsers leave unfinished|No cloud profile account|repeat work|repeat fields/i.test(source)) {
    fail(`${relativePath}: still marketing contains stiff or synthetic phrasing`);
  }
  if (/Google Forms-style|ARIA radios|ARIA checkboxes|React inputs|Vue fields|Angular forms|Shadow DOM/i.test(source)) {
    fail(`${relativePath}: store screenshots should use buyer-facing field language, not framework jargon or third-party product phrasing`);
  }
  if (/Same-page sections|<span class="chip">Radios<\/span>|If a page labels a field oddly/i.test(source)) {
    fail(`${relativePath}: store screenshots should avoid technical or cramped fallback wording`);
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

async function checkIconSystem() {
  const siteSvg = fs.readFileSync(filePath('assets/fillpro-logo.svg'), 'utf8').trim();
  const extensionSvgPath = path.join(WORKSPACE, 'fillpro', 'icons', 'icon-source.svg');
  if (!fs.existsSync(extensionSvgPath)) {
    fail('fillpro/icons/icon-source.svg: missing');
    return;
  }
  const extensionSvg = fs.readFileSync(extensionSvgPath, 'utf8').trim();
  if (siteSvg !== extensionSvg) {
    fail('FillPro logo mismatch: website SVG and extension source SVG must stay identical');
  }
  for (const [label, source] of [
    ['assets/fillpro-logo.svg', siteSvg],
    ['fillpro/icons/icon-source.svg', extensionSvg],
  ]) {
    if (/<text|<image|<foreignObject|href=|data:image/i.test(source)) {
      fail(`${label}: logo source should stay self-owned vector paths, not text, raster embeds, or remote assets`);
    }
    if (!/aria-label="FillPro icon"/.test(source)) {
      fail(`${label}: missing FillPro icon aria label`);
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
  await checkImage('assets/fillpro-logo.png', 512, 512, { maxBytes: 1024 * 1024 });
  await checkImage('assets/fillpro-og.png', 1200, 630, { maxBytes: 2 * 1024 * 1024 });
  await checkImage('assets/fillpro-demo-poster.png', 960, 540, { maxBytes: 2 * 1024 * 1024 });
  checkHeroVideo('assets/fillpro-demo.mp4');
  await checkImage('assets/marketplace/fillpro-small-promo-440x280.png', 440, 280, {
    maxBytes: 1024 * 1024,
    maxMeanLuma: 190,
    minColorSpread: 35,
  });
  await checkImage('assets/marketplace/fillpro-marquee-1400x560.png', 1400, 560, {
    maxBytes: 2 * 1024 * 1024,
    maxMeanLuma: 190,
    minColorSpread: 35,
  });
  const screenshots = [
    'assets/marketplace/fillpro-screenshot-fill-page-1280x800.png',
    'assets/marketplace/fillpro-screenshot-modern-forms-1280x800.png',
    'assets/marketplace/fillpro-screenshot-profiles-1280x800.png',
    'assets/marketplace/fillpro-screenshot-privacy-1280x800.png',
    'assets/marketplace/fillpro-screenshot-undo-1280x800.png',
  ];
  for (const screenshot of screenshots) await checkImage(screenshot, 1280, 800);
  await checkScreenshotDistinctness(screenshots);
  await checkImage('assets/marketplace/fillpro-store-demo-22s-thumb.png', 1280, 720);
  checkVideo('assets/marketplace/fillpro-store-demo-22s.mp4');
  checkRenderer();
  checkStillRenderer();
  await checkIconSystem();

  if (failures.length) {
    console.error(`FillPro marketing asset audit failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `FillPro marketing asset audit passed: ${checked.images} images, ${checked.videos} video, ${checked.renderer} renderer, ${checked.icons} icon checks.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
