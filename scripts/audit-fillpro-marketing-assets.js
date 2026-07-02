const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');

const failures = [];
const checked = {
  images: 0,
  videos: 0,
  renderer: 0,
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
  if (!video) {
    fail(`${relativePath}: no video stream`);
    return;
  }
  const duration = Number(data.format?.duration || video.duration || 0);
  const fps = parseRate(video.avg_frame_rate);
  if (video.codec_name !== 'h264') fail(`${relativePath}: expected H.264, got ${video.codec_name}`);
  if (video.width !== 1280 || video.height !== 720) {
    fail(`${relativePath}: expected 1280x720, got ${video.width}x${video.height}`);
  }
  if (duration < 20 || duration > 35) fail(`${relativePath}: expected 20-35 seconds, got ${duration.toFixed(2)}s`);
  if (fps < 23.5 || fps > 30.5) fail(`${relativePath}: expected 24-30fps, got ${fps.toFixed(2)}fps`);
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
    'fillpro-store-demo-22s.mp4',
    'fillpro-store-demo-22s-thumb.png',
    'fillpro-screenshot-fill-page-1280x800.png',
    'fillpro-screenshot-modern-forms-1280x800.png',
    'fillpro-screenshot-profiles-1280x800.png',
    'fillpro-screenshot-privacy-1280x800.png',
    'fillpro-screenshot-undo-1280x800.png',
    'Save it once. Fill the next form.',
    'Less retyping on applications.',
    'Built for messy forms.',
    'No cloud profile account.',
    'Undo before you submit.',
    'careers.example/apply',
    'app.example/trial',
    'Upload matching',
    'Report bad fills',
  ];
  for (const needle of required) {
    if (!source.includes(needle)) fail(`${relativePath}: missing ${needle}`);
  }
  if (/slideshow|slide deck|stitched slides/i.test(source)) {
    fail(`${relativePath}: renderer should remain motion-first, not a stitched slideshow`);
  }
}

async function main() {
  await checkImage('assets/fillpro-logo.png', 512, 512, { maxBytes: 1024 * 1024 });
  await checkImage('assets/fillpro-og.png', 1200, 630, { maxBytes: 2 * 1024 * 1024 });
  await checkImage('assets/fillpro-demo-poster.png', 960, 540, { maxBytes: 2 * 1024 * 1024 });
  await checkImage('assets/marketplace/fillpro-small-promo-440x280.png', 440, 280, { maxBytes: 1024 * 1024 });
  await checkImage('assets/marketplace/fillpro-marquee-1400x560.png', 1400, 560, { maxBytes: 2 * 1024 * 1024 });
  await checkImage('assets/marketplace/fillpro-screenshot-fill-page-1280x800.png', 1280, 800);
  await checkImage('assets/marketplace/fillpro-screenshot-modern-forms-1280x800.png', 1280, 800);
  await checkImage('assets/marketplace/fillpro-screenshot-profiles-1280x800.png', 1280, 800);
  await checkImage('assets/marketplace/fillpro-screenshot-privacy-1280x800.png', 1280, 800);
  await checkImage('assets/marketplace/fillpro-screenshot-undo-1280x800.png', 1280, 800);
  await checkImage('assets/marketplace/fillpro-store-demo-22s-thumb.png', 1280, 720);
  checkVideo('assets/marketplace/fillpro-store-demo-22s.mp4');
  checkRenderer();

  if (failures.length) {
    console.error(`FillPro marketing asset audit failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `FillPro marketing asset audit passed: ${checked.images} images, ${checked.videos} video, ${checked.renderer} renderer.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
