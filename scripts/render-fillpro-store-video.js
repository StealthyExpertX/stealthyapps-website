const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const marketplace = path.join(assets, 'marketplace');
const captures = path.join(marketplace, 'captures');
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const DURATION = 22;
const POSTER_FRAME_SECONDS = 3.75;
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const png = (name) => `data:image/png;base64,${fs.readFileSync(path.join(captures, name)).toString('base64')}`;
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Mute-safe captions. Actual working-source UI captures, not recreated controls.
// Editing holds a verified state for reading; this is not a speed benchmark.
const scenes = [
  { start: 0, state: 'before', title: 'Another job application?', detail: 'Use the details you already saved.' },
  { start: 1, state: 'filled', title: 'Another job application?', detail: 'Use the details you already saved.' },
  { start: 3.2, state: 'filled', title: 'Your details. Ready to check.', detail: 'Name, email, phone and your saved resume.' },
  { start: 8, state: 'filled', title: 'Review first. Submit yourself.', detail: 'The password stays empty. Undo is available.' },
  { start: 12.6, state: 'undo', title: 'Undo brings the original values back.', detail: 'Here, the empty fields and file input are restored.' },
  { start: 17.2, state: 'filled', title: '3 profiles free. Lifetime Pro: $39.99.', detail: 'Up to 500 profiles and duplication. Monthly and yearly plans also available.' },
];

function html(scene) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#f5f7f6;color:#142c25;font-family:system-ui;letter-spacing:0}
header{height:126px;padding:20px 40px;display:grid;grid-template-columns:1fr auto;align-content:center;gap:8px 24px}
h1{font-size:32px;line-height:1.12;margin:0;font-weight:700}header p{margin:0;font-size:17px;grid-column:1/-1;line-height:1.35}
.brand{font-size:18px;font-weight:750;white-space:nowrap;align-self:center;color:#087664}
main{display:grid;grid-template-columns:820px 360px;gap:20px;padding:0 40px;height:540px}img{display:block;width:100%;height:540px;object-fit:contain;object-position:top}
footer{height:54px;padding:13px 40px;font-size:13px;color:#4a6359;display:flex;justify-content:space-between;gap:20px}
</style><header><h1>${escape(scene.title)}</h1><div class="brand">Skip Retyping</div><p>${escape(scene.detail)}</p></header>
<main><img alt="Local job application form" src="${png(`${scene.state}-form.png`)}"><img alt="Actual extension interface" src="${png(`${scene.state}-popup.png`)}"></main>
<footer><span>Actual extension UI. Local test form. Edited for readability.</span><span>stealthyapps.com/skip-retyping</span></footer></html>`;
}

async function render() {
  const provenance = JSON.parse(fs.readFileSync(path.join(captures, 'provenance.json')));
  for (const [file, hash] of Object.entries(provenance.artifacts)) assert.equal(digest(path.join(captures, file)), hash, `Capture changed: ${file}`);
  for (const [file, hash] of Object.entries(provenance.extensionHashes)) assert.equal(digest(path.resolve(root, '../fillpro', file)), hash, `Recapture current source: ${file}`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skip-retyping-video-'));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    const frames = [];
    for (const [index, scene] of scenes.entries()) {
      await page.setContent(html(scene));
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode())); });
      const defects = await page.evaluate(() => [...document.querySelectorAll('h1,header p,.brand,footer span')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().bottom > 720).map((el) => el.textContent));
      assert.deepEqual(defects, [], `Video scene ${index} clips text`);
      const file = path.join(temp, `scene-${index}.png`);
      await page.screenshot({ path: file });
      frames.push(file);
    }
    await browser.close();
    browser = null;
    for (let frame = 0; frame < DURATION * FPS; frame++) {
      const time = frame / FPS;
      const index = scenes.findLastIndex((scene) => scene.start <= time);
      const elapsed = time - scenes[index].start;
      const target = path.join(temp, `frame-${String(frame).padStart(4, '0')}.png`);
      if (index && elapsed < 0.3) {
        const progress = elapsed / 0.3;
        const alpha = progress * progress * (3 - 2 * progress);
        const overlay = await sharp(frames[index]).removeAlpha().ensureAlpha(alpha).toBuffer();
        await sharp(frames[index - 1]).composite([{ input: overlay }]).png().toFile(target);
      } else fs.copyFileSync(frames[index], target);
    }
    const run = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true });
    const video = path.join(marketplace, 'skip-retyping-store-demo-22s.mp4');
    run(['-framerate', String(FPS), '-i', path.join(temp, 'frame-%04d.png'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
    run(['-ss', String(POSTER_FRAME_SECONDS), '-i', video, '-frames:v', '1', path.join(marketplace, 'skip-retyping-store-demo-22s-thumb.png')]);
    run(['-i', video, '-vf', 'scale=960:540', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(assets, 'skip-retyping-demo.mp4')]);
    await sharp(frames[2]).resize(960, 540).png().toFile(path.join(assets, 'skip-retyping-demo-poster.png'));
    await sharp(frames[2]).resize(960, 540).webp({ quality: 86 }).toFile(path.join(assets, 'skip-retyping-demo-poster.webp'));
    run(['-i', video, '-t', '8', '-vf', 'fps=8,scale=640:360,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', path.join(assets, 'skip-retyping-demo.gif')]);
    const artifacts = ['skip-retyping-store-demo-22s.mp4', 'skip-retyping-store-demo-22s-thumb.png'].map((file) => `marketplace/${file}`).concat(['skip-retyping-demo.mp4', 'skip-retyping-demo.gif', 'skip-retyping-demo-poster.png', 'skip-retyping-demo-poster.webp']);
    fs.writeFileSync(path.join(marketplace, 'video-provenance.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), captureReceiptHash: digest(path.join(captures, 'provenance.json')), rendererHash: digest(__filename), durationSeconds: DURATION, fps: FPS, transitions: scenes.slice(1).map((scene) => ({ at: scene.start, seconds: 0.3, type: 'same-background crossfade' })), artifacts: Object.fromEntries(artifacts.map((file) => [file, digest(path.join(assets, file))])) }, null, 2)}\n`);
    console.log('Rendered real-source 22-second store and website videos, posters and GIF. No theme change.');
  } finally {
    await browser?.close();
    assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
render().catch((error) => { console.error(error); process.exitCode = 1; });
