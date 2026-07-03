const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..');
const OUT_DIR = path.join(ROOT, '.tmp', 'marketing-review');
const FRAME_DIR = path.join(OUT_DIR, 'video-frames-current');

const marketplace = (file) => path.join(ROOT, 'assets', 'marketplace', file);
const asset = (file) => path.join(ROOT, 'assets', file);
const extensionIcon = (file) => path.join(WORKSPACE, 'fillpro', 'icons', file);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelSvg(width, height, title, subtitle = '') {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#eef6f2"/>
      <text x="20" y="34" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800" fill="#10231f">${escapeXml(title)}</text>
      ${
        subtitle
          ? `<text x="20" y="62" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="650" fill="#60726b">${escapeXml(subtitle)}</text>`
          : ''
      }
    </svg>
  `);
}

async function tileFromImage({ file, title, subtitle, width, height }) {
  const image = await sharp(file)
    .resize(width, height - 82, { fit: 'contain', background: '#f8fbf8' })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: '#f8fbf8',
    })
    .png()
    .toBuffer();
  const label = labelSvg(width, 82, title, subtitle);
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#f8fbf8',
    },
  })
    .composite([
      { input: label, left: 0, top: 0 },
      { input: image, left: 0, top: 82 },
    ])
    .png()
    .toBuffer();
}

async function contactSheet(items, output, options = {}) {
  const columns = options.columns || 2;
  const tileWidth = options.tileWidth || 560;
  const tileHeight = options.tileHeight || 440;
  const gap = options.gap || 26;
  const padding = options.padding || 28;
  const rows = Math.ceil(items.length / columns);
  const width = padding * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = padding * 2 + rows * tileHeight + (rows - 1) * gap;

  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const input = await tileFromImage({
      ...items[index],
      width: tileWidth,
      height: tileHeight,
    });
    composites.push({
      input,
      left: padding + column * (tileWidth + gap),
      top: padding + row * (tileHeight + gap),
    });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#eef6f2',
    },
  })
    .composite(composites)
    .png()
    .toFile(output);
}

async function renderMarketingSheet() {
  const items = [
    ['Screenshot 1', 'Main promise', marketplace('fillpro-screenshot-fill-page-1280x800.png')],
    ['Screenshot 2', 'Modern controls', marketplace('fillpro-screenshot-modern-forms-1280x800.png')],
    ['Screenshot 3', 'Profiles and rules', marketplace('fillpro-screenshot-profiles-1280x800.png')],
    ['Screenshot 4', 'Privacy proof', marketplace('fillpro-screenshot-privacy-1280x800.png')],
    ['Screenshot 5', 'Undo and recovery', marketplace('fillpro-screenshot-undo-1280x800.png')],
    ['Small promo', 'Chrome compact tile', marketplace('fillpro-small-promo-440x280.png')],
    ['Marquee', 'Large feature tile', marketplace('fillpro-marquee-1400x560.png')],
    ['Video thumbnail', 'Poster frame', marketplace('fillpro-store-demo-22s-thumb.png')],
  ].map(([title, subtitle, file]) => ({ title, subtitle, file }));

  await contactSheet(items, path.join(OUT_DIR, 'marketing-contact-sheet-current.png'));
}

async function renderIconSheet() {
  const items = [
    ['16px', 'Toolbar optical mark', extensionIcon('icon16.png')],
    ['32px', 'Toolbar optical mark', extensionIcon('icon32.png')],
    ['48px', 'Extension manager', extensionIcon('icon48.png')],
    ['128px', 'Store icon', extensionIcon('icon128.png')],
    ['512px', 'Master preview', asset('fillpro-logo.png')],
  ].map(([title, subtitle, file]) => ({ title, subtitle, file }));

  await contactSheet(items, path.join(OUT_DIR, 'icon-scale-sheet-current.png'), {
    columns: 5,
    tileWidth: 210,
    tileHeight: 250,
    gap: 18,
  });
}

async function extractVideoFrames() {
  fs.rmSync(FRAME_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAME_DIR, { recursive: true });
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      marketplace('fillpro-store-demo-22s.mp4'),
      '-vf',
      'fps=1/2.75,scale=640:-1',
      path.join(FRAME_DIR, 'frame-%02d.png'),
    ],
    { stdio: 'ignore' },
  );
}

async function renderVideoSheet() {
  await extractVideoFrames();
  const files = fs
    .readdirSync(FRAME_DIR)
    .filter((file) => file.endsWith('.png'))
    .sort()
    .map((file, index) => ({
      title: `Frame ${index + 1}`,
      subtitle: `${(index * 2.75).toFixed(2)}s`,
      file: path.join(FRAME_DIR, file),
    }));

  await contactSheet(files, path.join(OUT_DIR, 'video-contact-sheet-current.png'), {
    columns: 2,
    tileWidth: 560,
    tileHeight: 400,
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await renderMarketingSheet();
  await renderIconSheet();
  await renderVideoSheet();
  console.log(`FillPro review sheets written to ${OUT_DIR}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
