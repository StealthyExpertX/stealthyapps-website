const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'assets', 'marketplace', 'fillpro-visual-baselines.json');
const WRITE_MODE = process.argv.includes('--write');

const ASSETS = [
  'assets/fillpro-logo.png',
  'assets/fillpro-og.png',
  'assets/fillpro-demo-poster.png',
  'assets/marketplace/fillpro-small-promo-440x280.png',
  'assets/marketplace/fillpro-marquee-1400x560.png',
  'assets/marketplace/fillpro-screenshot-fill-page-1280x800.png',
  'assets/marketplace/fillpro-screenshot-modern-forms-1280x800.png',
  'assets/marketplace/fillpro-screenshot-profiles-1280x800.png',
  'assets/marketplace/fillpro-screenshot-privacy-1280x800.png',
  'assets/marketplace/fillpro-screenshot-undo-1280x800.png',
  'assets/marketplace/fillpro-store-demo-22s-thumb.png',
  'assets/marketplace/fillpro-store-demo-22s.mp4',
  '../fillpro/icons/icon16.png',
  '../fillpro/icons/icon32.png',
  '../fillpro/icons/icon48.png',
  '../fillpro/icons/icon128.png',
  '../fillpro/icons/icon256.png',
  '../fillpro/icons/icon512.png',
  '../fillpro/icons/icon_master_1024.png',
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function imageStats(file, buffer) {
  const metadata = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer)
    .resize(72, 72, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lumaTotal = 0;
  let spreadTotal = 0;
  const pixels = info.width * info.height;

  for (let index = 0; index < data.length; index += 3) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    lumaTotal += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    spreadTotal += Math.max(red, green, blue) - Math.min(red, green, blue);
  }

  return {
    file,
    bytes: buffer.length,
    sha256: sha256(buffer),
    width: metadata.width,
    height: metadata.height,
    meanLuma: Number((lumaTotal / pixels).toFixed(2)),
    meanColorSpread: Number((spreadTotal / pixels).toFixed(2)),
  };
}

async function fileStats(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${relativePath}: missing`);
  const buffer = fs.readFileSync(absolutePath);
  if (/\.png$/i.test(relativePath)) return imageStats(relativePath, buffer);
  return {
    file: relativePath,
    bytes: buffer.length,
    sha256: sha256(buffer),
  };
}

async function collect() {
  return Promise.all(ASSETS.map(fileStats));
}

function compare(current, baseline) {
  const errors = [];
  const currentByFile = new Map(current.map((asset) => [asset.file, asset]));
  const baselineByFile = new Map(baseline.assets.map((asset) => [asset.file, asset]));

  for (const asset of ASSETS) {
    if (!baselineByFile.has(asset)) errors.push(`${asset}: missing from visual baseline`);
    if (!currentByFile.has(asset)) errors.push(`${asset}: missing from current asset set`);
  }

  for (const [file, expected] of baselineByFile.entries()) {
    const actual = currentByFile.get(file);
    if (!actual) continue;
    if (actual.sha256 !== expected.sha256) {
      errors.push(`${file}: visual hash changed; rerender review sheets and update baseline only after review`);
    }
    for (const key of ['width', 'height']) {
      if (expected[key] != null && actual[key] !== expected[key]) {
        errors.push(`${file}: ${key} changed from ${expected[key]} to ${actual[key]}`);
      }
    }
    for (const key of ['meanLuma', 'meanColorSpread']) {
      if (expected[key] == null || actual[key] == null) continue;
      if (Math.abs(actual[key] - expected[key]) > 0.75) {
        errors.push(`${file}: ${key} changed from ${expected[key]} to ${actual[key]}`);
      }
    }
  }

  return errors;
}

(async () => {
  const assets = await collect();

  if (WRITE_MODE) {
    const baseline = {
      updated: new Date().toISOString().slice(0, 10),
      note: 'Update this file only after rerendering assets, running npm run review:marketing, and visually approving the contact sheets.',
      assets,
    };
    fs.writeFileSync(`${BASELINE_PATH}.tmp`, `${JSON.stringify(baseline, null, 2)}\n`);
    fs.renameSync(`${BASELINE_PATH}.tmp`, BASELINE_PATH);
    console.log(`FillPro visual baseline written: ${BASELINE_PATH}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Missing visual baseline. Run: node scripts/audit-fillpro-visual-baselines.js --write`);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const errors = compare(assets, baseline);
  if (errors.length) {
    console.error(`FillPro visual baseline audit failed with ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`FillPro visual baseline audit passed: ${assets.length} assets locked.`);
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
