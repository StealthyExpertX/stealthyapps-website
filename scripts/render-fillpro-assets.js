const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const siteRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(siteRoot, '..');
const assetsDir = path.join(siteRoot, 'assets');
const marketplaceDir = path.join(assetsDir, 'marketplace');
const logoSvgPath = path.join(assetsDir, 'fillpro-logo.svg');

const logoDataUrl = `data:image/svg+xml;base64,${fs
  .readFileSync(logoSvgPath)
  .toString('base64')}`;

const css = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: #10231f;
    font-family: "Aptos", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    background:
      linear-gradient(90deg, rgba(15, 118, 110, 0.055) 1px, transparent 1px) 0 0 / 78px 78px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.055) 1px, transparent 1px) 0 0 / 78px 78px,
      linear-gradient(135deg, #fbfdfb, #edf7f3 54%, #f8f4e9);
  }
  .stage {
    width: 100%;
    height: 100%;
    padding: 54px 64px;
    display: grid;
    gap: 26px;
  }
  .topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
    font-weight: 900;
    font-size: 25px;
  }
  .brand img { width: 56px; height: 56px; }
  .pill {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border: 1px solid rgba(16, 35, 31, 0.13);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.84);
    color: #43544e;
    font-weight: 800;
    font-size: 15px;
  }
  h1 {
    margin: 0;
    max-width: 760px;
    font-family: "Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
    font-size: 56px;
    line-height: 0.98;
    letter-spacing: 0;
  }
  .sub {
    margin: 10px 0 0;
    max-width: 660px;
    color: #43544e;
    font-size: 22px;
    line-height: 1.35;
    font-weight: 650;
  }
  .browser {
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.12);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 30px 80px rgba(16, 35, 31, 0.16);
  }
  .chrome {
    height: 48px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 16px;
    background: #10231f;
    color: rgba(255, 255, 255, 0.76);
    font-size: 13px;
    font-weight: 750;
  }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: rgba(255, 255, 255, 0.36); }
  .url {
    min-width: 0;
    flex: 1;
    height: 28px;
    display: flex;
    align-items: center;
    margin-left: 10px;
    padding: 0 13px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.09);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .page {
    position: relative;
    min-height: 520px;
    padding: 30px;
    background: linear-gradient(180deg, #fff, #f8fbf8);
  }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
  .form {
    display: grid;
    gap: 14px;
    padding: 24px;
    border: 1px solid #d8e3de;
    border-radius: 8px;
    background: #fff;
  }
  .form h2, .panel h2 {
    margin: 0 0 6px;
    font-size: 24px;
    line-height: 1.1;
  }
  .field {
    display: grid;
    gap: 7px;
    color: #43544e;
    font-size: 13px;
    font-weight: 800;
  }
  .box {
    height: 46px;
    border: 1px solid #cfdcd6;
    border-radius: 8px;
    background: #fff;
  }
  .box.filled {
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-color: rgba(15, 118, 110, 0.32);
    background: #edf8f4;
    color: #10231f;
    font-size: 16px;
    font-weight: 800;
  }
  .button {
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 138px;
    padding: 0 22px;
    border-radius: 8px;
    background: linear-gradient(135deg, #0f766e, #0a5f59);
    color: #fff;
    font-weight: 900;
    box-shadow: 0 16px 32px rgba(15, 118, 110, 0.2);
  }
  .ghost { background: #eff6f3; color: #10231f; box-shadow: none; }
  .popup {
    position: absolute;
    right: 48px;
    top: 86px;
    width: 330px;
    display: grid;
    gap: 12px;
    padding: 18px;
    border: 1px solid rgba(16, 35, 31, 0.14);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 26px 70px rgba(16, 35, 31, 0.22);
  }
  .popup-head { display: flex; align-items: center; gap: 10px; font-weight: 900; }
  .popup-head img { width: 36px; height: 36px; }
  .profile {
    display: grid;
    gap: 3px;
    padding: 13px;
    border: 1px solid #d8e3de;
    border-radius: 8px;
    background: #f8fbf8;
  }
  .profile strong { font-size: 15px; }
  .profile span { color: #60726b; font-size: 13px; }
  .cardline {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #e0e8e4;
    color: #43544e;
    font-weight: 750;
  }
  .cardline:last-child { border-bottom: 0; }
  .check { color: #0f766e; font-weight: 950; }
  .panel {
    padding: 24px;
    border: 1px solid #d8e3de;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.88);
  }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .chip {
    padding: 9px 12px;
    border: 1px solid #d8e3de;
    border-radius: 999px;
    background: #fff;
    color: #43544e;
    font-weight: 850;
    font-size: 14px;
  }
  .privacy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .privacy-card {
    min-height: 150px;
    display: grid;
    align-content: end;
    gap: 10px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .dark {
    background:
      linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(135deg, #10231f, #0d1816);
    color: #fff;
  }
  .dark h1, .dark .sub { color: #fff; }
  .dark .sub { opacity: 0.74; }
  .small-stage { padding: 28px 32px; }
  .small-stage h1 { font-size: 36px; }
  .marquee { grid-template-columns: 0.86fr 1.14fr; align-items: center; }
  .demo-scene {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 22px;
    align-items: start;
    padding: 32px 34px 34px;
    background:
      radial-gradient(circle at 82% 18%, rgba(20, 184, 166, 0.16), transparent 260px),
      linear-gradient(90deg, rgba(15, 118, 110, 0.05) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.045) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(135deg, #fbfdfb, #eef8f4);
  }
  .demo-scene .form {
    gap: 9px;
    min-height: 0;
    padding: 20px 24px;
    box-shadow: 0 26px 70px rgba(16, 35, 31, 0.12);
  }
  .demo-scene .field {
    gap: 5px;
    font-size: 12px;
  }
  .demo-scene .box {
    height: 42px;
  }
  .demo-scene .popup {
    position: static;
    width: 100%;
    align-self: center;
  }
  .demo-note {
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(15, 118, 110, 0.18);
    border-radius: 8px;
    background: rgba(15, 118, 110, 0.08);
    color: #50655e;
    font-size: 14px;
    font-weight: 780;
    line-height: 1.25;
  }
`;

function chromeFrame(url, inner) {
  return `
    <div class="browser">
      <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">${url}</span></div>
      <div class="page">${inner}</div>
    </div>`;
}

function beforeAfter() {
  return `
    <div class="grid2">
      <div class="form">
        <h2>Vendor onboarding</h2>
        ${field('Full name')}
        ${field('Work email')}
        ${field('Company')}
        ${field('Resume upload')}
      </div>
      <div class="form">
        <h2>After FillPro</h2>
        ${field('Full name', 'Alex Morgan')}
        ${field('Work email', 'alex@example.com')}
        ${field('Company', 'Stealthy Apps')}
        ${field('Resume upload', 'alex-morgan-resume.pdf')}
      </div>
    </div>
    ${popup('Work profile', '12 fields, 1 upload, 2 smart rules')}`;
}

function field(label, value = '') {
  return `<div class="field"><span>${label}</span><div class="box${value ? ' filled' : ''}">${value}</div></div>`;
}

function popup(title, detail) {
  return `
    <div class="popup">
      <div class="popup-head"><img src="${logoDataUrl}" alt="">FillPro</div>
      <div class="profile"><strong>${title}</strong><span>${detail}</span></div>
      <div class="button">Fill Page</div>
      <div class="button ghost">Undo last fill</div>
    </div>`;
}

function demoScene(values, note = 'Safe fields fill. Sensitive fields stay alone.') {
  const fields = `
    ${field(values[0], values[1])}
    ${field(values[2], values[3])}
    ${field(values[4], values[5])}
    ${field(values[6], values[7])}
    ${field(values[8], values[9])}`;
  return `
    <main class="demo-scene">
      <div class="form">
        <h2>Partner intake</h2>
        ${fields}
        <div class="demo-note">${note}</div>
      </div>
      ${popup('Work profile', values[9] ? 'Ready for review' : 'Filling repeated fields')}
    </main>`;
}

async function renderHtml(browser, output, width, height, html) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
  await page.screenshot({ path: output, type: 'png' });
  await page.close();
}

async function renderStaticAssets(browser) {
  fs.mkdirSync(marketplaceDir, { recursive: true });

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-fill-page-1280x800.png'),
    1280,
    800,
    `<main class="stage">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">v1.0.0</span></div>
      <div><h1>Fill repeated forms in one click.</h1><p class="sub">Choose a saved profile, fill the page, then review before submit.</p></div>
      ${chromeFrame('Vendor onboarding', beforeAfter())}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-profiles-1280x800.png'),
    1280,
    800,
    `<main class="stage">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro profiles</div><span class="pill">Private by design</span></div>
      <div><h1>Separate profiles for real workflows.</h1><p class="sub">Work, personal admin, clients, vendors, and test profiles stay organized in the browser.</p></div>
      ${chromeFrame('Demo request', `
        <div class="grid2">
          <div class="panel">
            <h2>Saved profiles</h2>
            <div class="profile"><strong>Work profile</strong><span>Contact, company, links, resume</span></div>
            <div class="profile"><strong>Vendor profile</strong><span>Business details and service copy</span></div>
            <div class="profile"><strong>QA profile</strong><span>Repeat test data without random filler</span></div>
          </div>
          <div class="panel">
            <h2>Smart rules</h2>
            <div class="cardline"><span>Applicant handle</span><strong>@github</strong></div>
            <div class="cardline"><span>Primary inbox</span><strong>@email</strong></div>
            <div class="cardline"><span>Resume field</span><strong>resume.pdf</strong></div>
            <div class="button" style="margin-top:18px;">Fill with Work profile</div>
          </div>
        </div>`)}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-modern-forms-1280x800.png'),
    1280,
    800,
    `<main class="stage">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Modern form support</span></div>
      <div><h1>Handles more than basic inputs.</h1><p class="sub">Built for form builders, framework controls, modals, Shadow DOM, and same-origin frames.</p></div>
      ${chromeFrame('forms.example/team-intake', `
        <div class="grid2">
          <div class="form">
            <h2>Google Forms-style page</h2>
            ${field('Full name', 'Alex Morgan')}
            ${field('Work email', 'alex@example.com')}
            ${field('Preferred contact', 'Email')}
            ${field('Product updates', 'Checked')}
          </div>
          <div class="panel">
            <h2>Covered patterns</h2>
            <div class="chips">
              <span class="chip">ARIA radios</span>
              <span class="chip">ARIA checkboxes</span>
              <span class="chip">React inputs</span>
              <span class="chip">Vue fields</span>
              <span class="chip">Angular forms</span>
              <span class="chip">Shadow DOM</span>
              <span class="chip">Same-origin frames</span>
              <span class="chip">File uploads</span>
            </div>
          </div>
        </div>`)}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-privacy-1280x800.png'),
    1280,
    800,
    `<main class="stage dark">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Private by default</span></div>
      <div><h1>Profiles stay in FillPro.</h1><p class="sub">No account is needed for the core workflow. You choose when to export, upgrade, or contact support.</p></div>
      <div class="privacy-grid">
        <div class="privacy-card"><strong>Saved profiles</strong><span>Details and rules stay inside the extension.</span></div>
        <div class="privacy-card"><strong>User-triggered fills</strong><span>FillPro runs after your click, shortcut, picker, or context menu action.</span></div>
        <div class="privacy-card"><strong>Review before submit</strong><span>FillPro fills fields. You decide when the form leaves the page.</span></div>
      </div>
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-undo-1280x800.png'),
    1280,
    800,
    `<main class="stage">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Undo ready</span></div>
      <div><h1>Fast fill. Clean fallback.</h1><p class="sub">Undo the last fill before submitting, then fix odd labels with saved smart rules.</p></div>
      ${chromeFrame('careers.example/apply', `
        <div class="grid2">
          <div class="form">
            <h2>Application details</h2>
            ${field('First name', 'Alex')}
            ${field('Last name', 'Morgan')}
            ${field('Portfolio', 'https://stealthyapps.com')}
            ${field('Cover letter', 'cover-letter.pdf')}
          </div>
          <div class="panel">
            <h2>After a fill</h2>
            <div class="cardline"><span>Fields changed</span><strong>8</strong></div>
            <div class="cardline"><span>Upload matched</span><span class="check">Ready</span></div>
            <div class="cardline"><span>Undo snapshot</span><span class="check">Saved</span></div>
            <div class="button" style="margin-top:18px;">Undo last fill</div>
          </div>
        </div>`)}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-small-promo-440x280.png'),
    440,
    280,
    `<main class="stage small-stage">
      <div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div>
      <h1>Fill repeated forms faster.</h1>
      <p class="sub" style="font-size:17px;">Saved profiles. Smart rules. Undo before submit.</p>
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-marquee-1400x560.png'),
    1400,
    560,
    `<main class="stage marquee">
      <div>
        <div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div>
        <h1 style="margin-top:26px;">Private autofill for forms you repeat.</h1>
        <p class="sub">Profiles stay in FillPro. Fill when you ask. Review before submit.</p>
      </div>
      ${chromeFrame('app.example/intake', beforeAfter())}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(assetsDir, 'fillpro-og.png'),
    1200,
    630,
    `<main class="stage marquee">
      <div>
        <div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div>
        <h1 style="margin-top:28px;">Private autofill for repeated forms</h1>
        <p class="sub">Saved profiles. Smart rules. Upload matching. Review before submit.</p>
      </div>
      <div class="panel" style="padding:30px;">
        <div class="button" style="height:70px;font-size:26px;">Fill Page</div>
        <div style="height:22px;"></div>
        ${field('Work email', 'alex@example.com')}
        ${field('Company', 'Stealthy Apps')}
      </div>
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(assetsDir, 'fillpro-popup.png'),
    760,
    540,
    `<main class="stage small-stage" style="padding:42px;">
      ${popup('Work profile', '12 fields, 1 upload, 2 smart rules')}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(assetsDir, 'fillpro-demo-poster.png'),
    960,
    540,
    demoScene([
      'Full name',
      'Alex Morgan',
      'Work email',
      'alex@example.com',
      'Company',
      'Stealthy Apps',
      'Resume upload',
      'alex-morgan-resume.pdf',
      'Password',
      '',
    ], 'Review before submit. Passwords stay untouched.'),
  );
}

async function renderDemoGif(browser) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fillpro-demo-'));
  const framePaths = [];
  const frames = [
    ['Full name', '', 'Work email', '', 'Company', '', 'Resume upload', '', 'Password', ''],
    ['Full name', 'Alex Morgan', 'Work email', '', 'Company', '', 'Resume upload', '', 'Password', ''],
    ['Full name', 'Alex Morgan', 'Work email', 'alex@example.com', 'Company', '', 'Resume upload', '', 'Password', ''],
    ['Full name', 'Alex Morgan', 'Work email', 'alex@example.com', 'Company', 'Stealthy Apps', 'Resume upload', '', 'Password', ''],
    ['Full name', 'Alex Morgan', 'Work email', 'alex@example.com', 'Company', 'Stealthy Apps', 'Resume upload', 'alex-morgan-resume.pdf', 'Password', ''],
    ['Full name', 'Alex Morgan', 'Work email', 'alex@example.com', 'Company', 'Stealthy Apps', 'Resume upload', 'alex-morgan-resume.pdf', 'Password', ''],
  ];

  for (let index = 0; index < frames.length; index += 1) {
    const values = frames[index];
    const output = path.join(tmp, `frame-${String(index).padStart(2, '0')}.png`);
    framePaths.push(output);
    await renderHtml(
      browser,
      output,
      960,
      540,
      demoScene(
        values,
        index >= 4
          ? 'Upload matched. Review before submit.'
          : 'Pick a profile. Fill the repeated fields.',
      ),
    );
  }

  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        '3',
        '-i',
        path.join(tmp, 'frame-%02d.png'),
        '-vf',
        'split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer',
        path.join(assetsDir, 'fillpro-demo.gif'),
      ],
      { stdio: 'ignore' },
    );
  } finally {
    for (const frame of framePaths) {
      fs.rmSync(frame, { force: true });
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function renderIcons() {
  const extensionSvg = path.join(projectRoot, 'fillpro', 'icons', 'icon-source.svg');
  for (const size of [16, 32, 48, 128, 256, 512]) {
    await sharp(extensionSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(projectRoot, 'fillpro', 'icons', `icon${size}.png`));
  }
  await sharp(extensionSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(projectRoot, 'fillpro', 'icons', 'icon_master_1024.png'));
  await sharp(logoSvgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'fillpro-logo.png'));
}

(async () => {
  await renderIcons();
  const browser = await chromium.launch({ headless: true });
  try {
    await renderStaticAssets(browser);
    await renderDemoGif(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
