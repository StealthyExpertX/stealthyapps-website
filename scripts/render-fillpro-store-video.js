const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const siteRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(siteRoot, 'assets');
const marketplaceDir = path.join(assetsDir, 'marketplace');
const logoSvgPath = path.join(assetsDir, 'fillpro-logo.svg');
const outputMp4 = path.join(marketplaceDir, 'fillpro-store-demo-22s.mp4');
const outputThumb = path.join(marketplaceDir, 'fillpro-store-demo-22s-thumb.png');
const storeScreenshots = [
  ['00:00:11.5', 'fillpro-screenshot-fill-page-1280x800.png'],
  ['00:00:14.2', 'fillpro-screenshot-modern-forms-1280x800.png'],
  ['00:00:12.2', 'fillpro-screenshot-profiles-1280x800.png'],
  ['00:00:17.0', 'fillpro-screenshot-privacy-1280x800.png'],
  ['00:00:20.2', 'fillpro-screenshot-undo-1280x800.png'],
];
const logoDataUrl = `data:image/svg+xml;base64,${fs
  .readFileSync(logoSvgPath)
  .toString('base64')}`;

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const DURATION = 22;
const FRAMES = FPS * DURATION;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #f7faf7;
    color: #10231f;
    font-family: "Aptos", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  }
  .frame {
    position: relative;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    background:
      radial-gradient(circle at var(--x, 72%) var(--y, 16%), rgba(20, 184, 166, 0.2), transparent 310px),
      linear-gradient(90deg, rgba(15, 118, 110, 0.052) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.048) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(135deg, #fbfdfb, #eef8f4 58%, #f8f4e9);
  }
  .brand {
    position: absolute;
    left: 58px;
    top: 34px;
    display: flex;
    align-items: center;
    gap: 13px;
    font-weight: 900;
    font-size: 27px;
  }
  .brand img {
    width: 62px;
    height: 62px;
    filter: drop-shadow(0 16px 22px rgba(15, 118, 110, 0.24));
  }
  .version {
    position: absolute;
    top: 54px;
    right: 58px;
    padding: 9px 15px;
    border: 1px solid rgba(16, 35, 31, 0.13);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    color: #43544e;
    font-size: 14px;
    font-weight: 850;
  }
  .copy {
    position: absolute;
    left: 58px;
    top: 126px;
    width: 505px;
    z-index: 4;
  }
  .eyebrow {
    margin: 0 0 14px;
    color: #0f766e;
    font-size: 13px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font: 950 70px/0.9 "Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
    letter-spacing: 0;
  }
  .sub {
    margin: 18px 0 0;
    color: #43544e;
    font-size: 22px;
    line-height: 1.28;
    font-weight: 650;
  }
  .proof {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 24px;
  }
  .proof span {
    padding: 10px 14px;
    border: 1px solid rgba(15, 118, 110, 0.16);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.76);
    color: #38524b;
    font-size: 15px;
    font-weight: 850;
  }
  .browser {
    position: absolute;
    right: 38px;
    top: 112px;
    width: 668px;
    height: 534px;
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.13);
    border-radius: 10px;
    background: #ffffff;
    box-shadow:
      0 48px 100px rgba(16, 35, 31, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.72) inset;
  }
  .chrome {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 15px;
    background: #10231f;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255, 255, 255, 0.36); }
  .url {
    flex: 1;
    height: 27px;
    display: flex;
    align-items: center;
    margin-left: 10px;
    padding: 0 13px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.76);
    font-size: 12px;
    font-weight: 800;
  }
  .page {
    position: relative;
    height: calc(100% - 44px);
    padding: 28px;
    background: linear-gradient(180deg, #ffffff, #f8fbf8);
  }
  .form-title {
    margin: 0 0 18px;
    font-size: 28px;
    line-height: 1;
    font-weight: 930;
  }
  .field {
    position: relative;
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
    color: #43544e;
    font-size: 12px;
    font-weight: 880;
  }
  .box {
    height: 42px;
    display: flex;
    align-items: center;
    padding: 0 13px;
    overflow: hidden;
    border: 1px solid #cfdcd6;
    border-radius: 8px;
    background: #ffffff;
    color: #10231f;
    font-size: 16px;
    font-weight: 850;
  }
  .box.filled {
    border-color: rgba(15, 118, 110, 0.32);
    background: #edf8f4;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.07);
  }
  .box.skip {
    color: #8a9b95;
    background: #fbfcfb;
  }
  .flash {
    position: absolute;
    inset: 20px 0 0;
    border-radius: 8px;
    background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.22), transparent);
    opacity: 0;
    transform: translateX(-55%);
  }
  .field.active .flash {
    opacity: 1;
    transform: translateX(55%);
  }
  .side-panel {
    position: absolute;
    right: 24px;
    top: 88px;
    width: 302px;
    display: grid;
    gap: 12px;
    padding: 18px;
    border: 1px solid rgba(16, 35, 31, 0.13);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 28px 70px rgba(16, 35, 31, 0.22);
    opacity: var(--panel-opacity, 0);
    transform: translateY(var(--panel-y, 12px)) scale(var(--panel-scale, 0.98));
  }
  .panel-head {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 950;
  }
  .panel-head img { width: 36px; height: 36px; }
  .profile {
    padding: 13px;
    border: 1px solid #d8e3de;
    border-radius: 8px;
    background: #f8fbf8;
  }
  .profile strong {
    display: block;
    font-size: 15px;
  }
  .profile span {
    display: block;
    margin-top: 3px;
    color: #60726b;
    font-size: 12px;
    font-weight: 650;
  }
  .button {
    position: relative;
    height: 49px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
    background: linear-gradient(135deg, #0f766e, #0a5f59);
    color: white;
    font-size: 15px;
    font-weight: 950;
    box-shadow: 0 16px 32px rgba(15, 118, 110, 0.22);
  }
  .button::after {
    content: "";
    position: absolute;
    inset: -80% auto -80% -46%;
    width: 48%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.48), transparent);
    transform: translateX(var(--shine, -120%)) rotate(18deg);
  }
  .ghost {
    background: #eff6f3;
    color: #10231f;
    box-shadow: none;
  }
  .review {
    position: absolute;
    right: 24px;
    top: 386px;
    width: 302px;
    padding: 13px 15px;
    border: 1px solid rgba(15, 118, 110, 0.18);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(15, 118, 110, 0.11), rgba(255, 255, 255, 0.86));
    color: #334741;
    font-size: 13px;
    font-weight: 850;
    line-height: 1.28;
    opacity: var(--review-opacity, 0);
  }
  .cursor {
    position: absolute;
    left: var(--cursor-x, 850px);
    top: var(--cursor-y, 410px);
    width: 28px;
    height: 28px;
    z-index: 9;
    opacity: var(--cursor-opacity, 1);
    filter: drop-shadow(0 8px 10px rgba(16, 35, 31, 0.2));
  }
  .cursor::before {
    content: "";
    position: absolute;
    inset: 0;
    clip-path: polygon(0 0, 0 100%, 26% 76%, 43% 100%, 57% 93%, 40% 69%, 74% 69%);
    background: #10231f;
  }
  .privacy-strip {
    position: absolute;
    left: 58px;
    bottom: 56px;
    display: grid;
    grid-template-columns: repeat(3, 154px);
    gap: 12px;
    opacity: var(--strip-opacity, 0);
  }
  .privacy-strip div {
    min-height: 86px;
    padding: 13px;
    border: 1px solid rgba(16, 35, 31, 0.11);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 18px 38px rgba(16, 35, 31, 0.08);
  }
  .privacy-strip strong {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    font-weight: 950;
  }
  .privacy-strip span {
    color: #4f625c;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.25;
  }
  .footer-line {
    position: absolute;
    left: 58px;
    right: 58px;
    bottom: 30px;
    display: flex;
    justify-content: space-between;
    color: #60726b;
    font-size: 12px;
    font-weight: 800;
    opacity: 0.86;
  }
  .fade {
    transition: none;
  }
</style>
</head>
<body>
<main class="frame">
  <div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div>
  <div class="version">v1.0.0</div>
  <section class="copy">
    <p class="eyebrow" id="eyebrow">Private autofill</p>
    <h1 id="headline">Save the profile once.</h1>
    <p class="sub" id="subline">Fill the next long form without retyping the same details.</p>
    <div class="proof" id="proof">
      <span>Saved profiles</span>
      <span>Smart rules</span>
      <span>Undo before submit</span>
    </div>
  </section>
  <section class="browser" aria-hidden="true">
    <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url" id="url">partner.example/intake</span></div>
    <div class="page">
      <h2 class="form-title" id="formTitle">Partner intake</h2>
      <div id="fields"></div>
      <div class="review" id="review">Review before submit. Sign-in and payment fields stay untouched.</div>
      <aside class="side-panel" id="panel">
        <div class="panel-head"><img src="${logoDataUrl}" alt="">FillPro</div>
        <div class="profile"><strong id="profileName">Work profile</strong><span id="profileMeta">12 fields, 1 upload, 2 smart rules</span></div>
        <div class="button" id="fillButton">Fill Page</div>
        <div class="button ghost" id="undoButton">Undo last fill</div>
      </aside>
    </div>
  </section>
  <div class="privacy-strip" id="strip">
    <div><strong>Profiles stay here</strong><span>Saved details stay inside FillPro unless exported.</span></div>
    <div><strong>Click to fill</strong><span>Runs when you ask on the page.</span></div>
    <div><strong>Undo ready</strong><span>Back out before submitting.</span></div>
  </div>
  <div class="cursor" id="cursor"></div>
  <div class="footer-line"><span>Chrome / Edge / Firefox</span><span>stealthyapps.com/fillpro</span></div>
</main>
<script>
  const applicationFields = [
    ['Full name', 'Alex Morgan'],
    ['Work email', 'alex@example.com'],
    ['Company', 'Stealthy Apps'],
    ['Resume upload', 'alex-morgan-resume.pdf'],
    ['Account password', ''],
  ];
  const modernFields = [
    ['Custom dropdown', 'Product operations'],
    ['Contact choice', 'Email'],
    ['Checkbox', 'Remote-friendly'],
    ['Long answer', 'Available after two weeks.'],
    ['Late field', 'Filled after it appeared'],
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mix(a, b, p) {
    return a + (b - a) * p;
  }

  function smooth(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function cursorPath(t) {
    if (t < 2.4) return [1040, 462, 1];
    if (t < 4.2) {
      const p = smooth((t - 2.4) / 1.8);
      return [mix(1040, 1008, p), mix(462, 356, p), 1];
    }
    if (t < 6.2) {
      const p = smooth((t - 4.2) / 2);
      return [mix(1008, 928, p), mix(356, 418, p), 1];
    }
    if (t < 13.6) {
      const p = smooth((t - 6.2) / 7.4);
      return [mix(928, 906, p), mix(418, 508, p), 0.78];
    }
    if (t < 16.5) {
      const p = smooth((t - 13.6) / 2.9);
      return [mix(906, 1038, p), mix(508, 500, p), 0.82];
    }
    return [1040, 500, 0];
  }

  function copyFor(t) {
    if (t < 11.8) return ['Private autofill', 'Save it once. Fill the next form.', 'Profiles, uploads, and repeated details fill when you ask.'];
    if (t < 13.4) return ['Applications', 'Less retyping on applications.', 'Name, email, company, and resume upload match from one profile.'];
    if (t < 15.8) return ['Modern forms', 'Built for messy forms.', 'Dropdowns, choices, long answers, and late fields get a cleaner pass.'];
    if (t < 18.8) return ['Private by default', 'Profiles stay in FillPro.', 'Saved profiles, rules, and upload references stay in the extension unless you export them.'];
    return ['Review and recover', 'Undo before you submit.', 'See what changed, back it out, or send a short report when a page needs a better rule.'];
  }

  function proofFor(t) {
    if (t < 13.4) return ['Saved profiles', 'Upload matching', 'Review stays yours'];
    if (t < 15.8) return ['Dropdowns', 'Checkboxes', 'Late fields'];
    if (t < 18.8) return ['No account needed', 'Current-page access', 'Export when needed'];
    return ['Review first', 'Undo ready', 'Send a quick report'];
  }

  function formFor(t) {
    if (t >= 13.4 && t < 15.8) {
      return {
        title: 'Modern signup',
        url: 'app.example/trial',
        fields: modernFields,
      };
    }
    if (t >= 15.8) {
      return {
        title: 'Private fill review',
        url: 'partner.example/review',
        fields: applicationFields,
      };
    }
    return {
      title: 'Job application',
      url: 'careers.example/apply',
      fields: applicationFields,
    };
  }

  function activeField(t) {
    if (t < 5.6) return -1;
    if (t < 6.7) return 0;
    if (t < 7.8) return 1;
    if (t < 8.9) return 2;
    if (t < 10.2) return 3;
    return -1;
  }

  function filledCount(t) {
    if (t >= 13.4 && t < 15.8) return 5;
    if (t < 5.6) return 0;
    if (t < 6.7) return 1;
    if (t < 7.8) return 2;
    if (t < 8.9) return 3;
    if (t < 10.2) return 4;
    return 4;
  }

  function renderFields(t) {
    const form = formFor(t);
    const filled = filledCount(t);
    const active = activeField(t);
    return form.fields.map((field, index) => {
      const [label, value] = field;
      const isPassword = label === 'Account password';
      const hasValue = index < filled && !isPassword;
      const className = [
        'field',
        active === index ? 'active' : '',
      ].join(' ');
      const boxClass = [
        'box',
        hasValue ? 'filled' : '',
        isPassword ? 'skip' : '',
      ].join(' ');
      const text = isPassword ? (t > 10.4 ? 'Use your password manager' : '') : (hasValue ? value : '');
      return '<div class="' + className + '"><span>' + label + '</span><div class="' + boxClass + '">' + text + '</div><div class="flash"></div></div>';
    }).join('');
  }

  window.renderFillProFrame = function renderFillProFrame(t) {
    const [eyebrow, headline, subline] = copyFor(t);
    document.getElementById('eyebrow').textContent = eyebrow;
    document.getElementById('headline').textContent = headline;
    document.getElementById('subline').textContent = subline;
    document.getElementById('proof').innerHTML = proofFor(t).map((item) => '<span>' + item + '</span>').join('');
    const form = formFor(t);
    document.getElementById('formTitle').textContent = form.title;
    document.getElementById('url').textContent = form.url;
    document.getElementById('fields').innerHTML = renderFields(t);

    const panel = document.getElementById('panel');
    const panelOpacity = t < 2.1 ? 0 : t < 3.2 ? smooth((t - 2.1) / 1.1) : 1;
    panel.style.setProperty('--panel-opacity', panelOpacity.toFixed(3));
    panel.style.setProperty('--panel-y', (12 - 12 * panelOpacity).toFixed(2) + 'px');
    panel.style.setProperty('--panel-scale', (0.98 + 0.02 * panelOpacity).toFixed(3));

    const fillButton = document.getElementById('fillButton');
    const shine = t > 4.4 && t < 5.8 ? mix(-120, 420, smooth((t - 4.4) / 1.4)) : -120;
    fillButton.style.setProperty('--shine', shine.toFixed(1) + '%');

    const review = document.getElementById('review');
    const reviewWindow = (t >= 10.4 && t < 13.2) || t >= 18.8;
    const reviewOpacity = !reviewWindow ? 0 : t < 11.6 ? smooth((t - 10.4) / 1.2) : 1;
    review.style.setProperty('--review-opacity', reviewOpacity.toFixed(3));

    const strip = document.getElementById('strip');
    const stripOpacity = t < 15.2 ? 0 : t < 16.4 ? smooth((t - 15.2) / 1.2) : 1;
    strip.style.setProperty('--strip-opacity', stripOpacity.toFixed(3));

    const cursor = document.getElementById('cursor');
    const [x, y, opacity] = cursorPath(t);
    cursor.style.setProperty('--cursor-x', x.toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-y', y.toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-opacity', opacity.toFixed(3));

    document.querySelector('.frame').style.setProperty('--x', (62 + Math.sin(t * 0.55) * 12).toFixed(1) + '%');
    document.querySelector('.frame').style.setProperty('--y', (16 + Math.cos(t * 0.45) * 8).toFixed(1) + '%');

    if (t > 18.8) {
      document.getElementById('profileName').textContent = 'Free starter';
      document.getElementById('profileMeta').textContent = '3 profiles included';
      document.getElementById('fillButton').textContent = 'Start free';
      document.getElementById('undoButton').textContent = 'Review first';
    } else if (t >= 13.4 && t < 15.8) {
      document.getElementById('profileName').textContent = 'Trial profile';
      document.getElementById('profileMeta').textContent = 'Dropdowns, choices, long answers';
      document.getElementById('fillButton').textContent = 'Fill modern form';
      document.getElementById('undoButton').textContent = 'Undo fill';
    } else {
      document.getElementById('profileName').textContent = 'Work profile';
      document.getElementById('profileMeta').textContent = '12 fields, 1 upload, 2 smart rules';
      document.getElementById('fillButton').textContent = 'Fill Page';
      document.getElementById('undoButton').textContent = 'Undo last fill';
    }
  };
</script>
</body>
</html>`;

async function renderFrames() {
  fs.mkdirSync(marketplaceDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fillpro-store-video-'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(html, { waitUntil: 'load' });
    for (let frame = 0; frame < FRAMES; frame += 1) {
      const t = frame / FPS;
      await page.evaluate((time) => window.renderFillProFrame(time), t);
      await page.screenshot({
        path: path.join(tmp, `frame-${String(frame).padStart(4, '0')}.png`),
        type: 'png',
      });
    }

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        String(FPS),
        '-i',
        path.join(tmp, 'frame-%04d.png'),
        '-vf',
        'format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '18',
        '-movflags',
        '+faststart',
        outputMp4,
      ],
      { stdio: 'inherit' },
    );

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss',
        '00:00:06',
        '-i',
        outputMp4,
        '-frames:v',
        '1',
        '-update',
        '1',
        outputThumb,
      ],
      { stdio: 'inherit' },
    );

    for (const [timestamp, fileName] of storeScreenshots) {
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-ss',
          timestamp,
          '-i',
          outputMp4,
          '-filter_complex',
          '[0:v]scale=1280:800:force_original_aspect_ratio=increase,crop=1280:800,boxblur=18:1,eq=brightness=0.06:saturation=0.86[bg];[0:v]scale=1280:720[fg];[bg][fg]overlay=0:40',
          '-frames:v',
          '1',
          '-update',
          '1',
          path.join(marketplaceDir, fileName),
        ],
        { stdio: 'inherit' },
      );
    }
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

renderFrames().catch((error) => {
  console.error(error);
  process.exit(1);
});
