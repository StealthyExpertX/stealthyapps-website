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
  { start: 8, state: 'filled', title: 'Your next move is yours.', detail: 'Check what filled. Make your edits. Submit when you are ready.' },
  { start: 12.6, state: 'undo', title: 'Want to start again?', detail: 'Undo restores the original fields, including the upload.' },
  { start: 17.2, state: 'filled', title: 'Less retyping. More getting on with it.', detail: '3 profiles free. Pro lifetime: $39.99. Monthly and yearly plans available.' },
];

function html(scene, mobile = false) {
  const focus = scene.start === 8;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#102d26;color:#f4fbf7;font-family:Arial,sans-serif}
body{background:linear-gradient(125deg,#173d32,#0b201c)}
body:before{content:"";position:absolute;width:680px;height:680px;border:1px solid #345749;border-radius:50%;right:-200px;top:-320px;box-shadow:0 0 0 90px #18362d,0 0 0 91px #2a473b;opacity:.45}
header{position:relative;padding:36px 46px 0;height:156px;z-index:2}
h1{font-size:42px;line-height:1.12;margin:0;letter-spacing:-1.3px;max-width:930px}header p{font-size:19px;color:#c5ddd0;margin:12px 0 0;max-width:1040px}
.brand{position:absolute;right:46px;top:40px;width:36px;height:36px;border-radius:10px;background:#d5f891;color:#16392d;display:grid;place-items:center;font-size:22px;font-weight:bold}
main{position:absolute;inset:165px 46px 76px;display:flex;align-items:center;gap:24px}
.form{width:${focus ? 710 : 820}px;flex-shrink:0;transform:translateY(0);border-radius:14px;overflow:hidden;background:white;box-shadow:0 20px 50px #04161180;border:1px solid #93b9a66b}
.form img{width:100%;display:block}
.popup{position:absolute;right:0;width:${focus ? 410 : 350}px;z-index:2;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px #00140fc0;border:1px solid #a2cdbb88;transform:translateY(${focus ? -3 : 22}px)}
.popup img{width:100%;display:block}
footer{position:absolute;bottom:26px;left:46px;right:46px;display:flex;gap:10px;align-items:center;color:#c0d5c8;font-size:14px}
footer b{color:#e5f8d3;font-weight:500;letter-spacing:.04em}footer span{margin-left:auto}
.step{height:3px;position:absolute;bottom:0;left:0;width:${Math.max(6,Math.round((scene.start+3)/22*100))}%;background:#d4f78f}
${mobile ? 'html,body{width:720px;height:900px}header{padding:36px;height:180px}h1{font-size:38px;max-width:590px}header p{font-size:23px;line-height:1.35;max-width:600px}.brand{display:none}main{inset:200px 36px 90px}.form{display:none}.popup{width:580px;right:34px;transform:none}footer{left:36px;right:36px;font-size:18px}' : ''}
</style><header><h1>${escape(scene.title)}</h1><div class="brand">S</div><p>${escape(scene.detail)}</p></header>
<main><div class="form"><img alt="Demonstration application" src="${png(scene.state+'-form.png')}"></div><div class="popup"><img alt="Actual extension" src="${png(scene.state+'-popup.png')}"></div></main>
<footer><b>SKIP RETYPING</b><span>Edited product demo · 22s</span></footer><div class="step"></div></html>`;
}

async function render() {
  const provenance = JSON.parse(fs.readFileSync(path.join(captures, 'provenance.json')));
  for (const [file, hash] of Object.entries(provenance.artifacts)) assert.equal(digest(path.join(captures, file)), hash, `Capture changed: ${file}`);
  for (const [file, hash] of Object.entries(provenance.extensionHashes)) assert.equal(digest(path.resolve(root, '../fillpro', file)), hash, `Recapture current source: ${file}`);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'skip-retyping-video-'));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1.5 });
    const frames = [];
    const mobileFrames = [];
    for (const [index, scene] of scenes.entries()) {
      await page.setContent(html(scene));
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode())); });
      const defects = await page.evaluate(() => [...document.querySelectorAll('h1,header p,.brand,footer span')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().bottom > 720).map((el) => el.textContent));
      assert.deepEqual(defects, [], `Video scene ${index} clips text`);
      const file = path.join(temp, `scene-${index}.png`);
      await page.screenshot({ path: file });
      fs.writeFileSync(file, await sharp(file).removeAlpha().png().toBuffer());
      frames.push(file);
      await page.setViewportSize({width:720,height:900});
      await page.setContent(html(scene, true));
      await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode())); });
      const mobileFile = path.join(temp, `mobile-scene-${index}.png`);
      await page.screenshot({path:mobileFile});
      fs.writeFileSync(mobileFile, await sharp(mobileFile).removeAlpha().png().toBuffer());
      mobileFrames.push(mobileFile);
      await page.setViewportSize({width:WIDTH,height:HEIGHT});
    }
    await browser.close();
    browser = null;
    for (let frame = 0; frame < DURATION * FPS; frame++) {
      const time = frame / FPS;
      const index = scenes.findLastIndex((scene) => scene.start <= time);
      const elapsed = time - scenes[index].start;
      for (const [prefix, sourceFrames] of [['frame',frames],['mobile-frame',mobileFrames]]) {
      const target = path.join(temp, `${prefix}-${String(frame).padStart(4, '0')}.png`);
      if (index && elapsed < 0.3) {
        const progress = elapsed / 0.3;
        const alpha = progress * progress * (3 - 2 * progress);
        const overlay = await sharp(sourceFrames[index]).removeAlpha().ensureAlpha(alpha).toBuffer();
        await sharp(sourceFrames[index - 1]).composite([{ input: overlay }]).removeAlpha().png().toFile(target);
      } else fs.copyFileSync(sourceFrames[index], target);
      }
    }
    const run = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true });
    const video = path.join(assets, 'skip-retyping-demo.mp4');
    run(['-framerate', String(FPS), '-i', path.join(temp, 'frame-%04d.png'), '-vf', "zoompan=z='1+0.012*sin(on/528*PI)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=24", '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
    run(['-framerate', String(FPS), '-i', path.join(temp, 'mobile-frame-%04d.png'), '-vf', 'scale=720:900', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(assets,'skip-retyping-demo-mobile.mp4')]);
    await sharp(mobileFrames[2]).resize(720,900).webp({quality:86}).toFile(path.join(assets,'skip-retyping-demo-mobile-poster.webp'));
    run(['-ss', String(POSTER_FRAME_SECONDS), '-i', video, '-vf', 'scale=1280:720', '-frames:v', '1', path.join(marketplace, 'skip-retyping-store-demo-22s-thumb.png')]);
    run(['-i', video, '-vf', 'scale=1280:720', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(marketplace, 'skip-retyping-store-demo-22s.mp4')]);
    await sharp(frames[2]).resize(1920, 1080).png().toFile(path.join(assets, 'skip-retyping-demo-poster.png'));
    await sharp(frames[2]).resize(1920, 1080).webp({ quality: 86 }).toFile(path.join(assets, 'skip-retyping-demo-poster.webp'));
    run(['-i', video, '-t', '8', '-vf', 'fps=8,scale=640:360,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', path.join(assets, 'skip-retyping-demo.gif')]);
    const artifacts = ['skip-retyping-store-demo-22s.mp4', 'skip-retyping-store-demo-22s-thumb.png'].map((file) => `marketplace/${file}`).concat(['skip-retyping-demo.mp4', 'skip-retyping-demo.gif', 'skip-retyping-demo-poster.png', 'skip-retyping-demo-poster.webp', 'skip-retyping-demo-mobile.mp4', 'skip-retyping-demo-mobile-poster.webp']);
    fs.writeFileSync(path.join(marketplace, 'video-provenance.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), captureReceiptHash: digest(path.join(captures, 'provenance.json')), rendererHash: digest(__filename), durationSeconds: DURATION, fps: FPS, transitions: scenes.slice(1).map((scene) => ({ at: scene.start, seconds: 0.3, type: 'same-background crossfade' })), artifacts: Object.fromEntries(artifacts.map((file) => [file, digest(path.join(assets, file))])) }, null, 2)}\n`);
    console.log('Rendered real-source 22-second store and website videos, posters and GIF. Native 1080p website master and 720p store derivative.');
  } finally {
    await browser?.close();
    assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
render().catch((error) => { console.error(error); process.exitCode = 1; });
