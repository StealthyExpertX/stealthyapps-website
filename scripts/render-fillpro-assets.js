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
      radial-gradient(circle at 84% 10%, rgba(94, 234, 221, 0.2), transparent 240px),
      radial-gradient(circle at 12% 92%, rgba(242, 193, 78, 0.13), transparent 260px),
      linear-gradient(90deg, rgba(15, 118, 110, 0.055) 1px, transparent 1px) 0 0 / 78px 78px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.055) 1px, transparent 1px) 0 0 / 78px 78px,
      linear-gradient(135deg, #fbfdfb, #edf7f3 54%, #f8f4e9);
  }
  .stage {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100%;
    padding: 54px 64px;
    display: grid;
    gap: 26px;
  }
  .stage::before {
    content: "";
    position: absolute;
    inset: 34px 42px;
    z-index: -1;
    pointer-events: none;
    border: 1px solid rgba(15, 118, 110, 0.1);
    border-radius: 18px;
    background:
      linear-gradient(132deg, transparent 0 42%, rgba(15, 118, 110, 0.08) 42% 42.6%, transparent 42.6%),
      linear-gradient(132deg, transparent 0 58%, rgba(242, 193, 78, 0.12) 58% 58.7%, transparent 58.7%);
    opacity: 0.9;
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
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.12);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 30px 80px rgba(16, 35, 31, 0.16);
  }
  .browser::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(115deg, rgba(255, 255, 255, 0.28), transparent 26%, transparent 68%, rgba(94, 234, 221, 0.1));
    mix-blend-mode: screen;
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
  .privacy-proof {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 18px;
    min-height: 332px;
  }
  .privacy-proof .privacy-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .privacy-card {
    min-height: 136px;
    display: grid;
    align-content: end;
    gap: 10px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .privacy-proof .privacy-card {
    min-height: 86px;
    align-content: center;
  }
  .privacy-card strong { font-size: 18px; }
  .privacy-card span {
    color: rgba(255, 255, 255, 0.76);
    font-size: 14px;
    font-weight: 700;
    line-height: 1.32;
  }
  .privacy-ledger {
    display: grid;
    gap: 12px;
    padding: 22px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background:
      radial-gradient(circle at 92% 8%, rgba(94, 234, 221, 0.16), transparent 160px),
      rgba(255, 255, 255, 0.07);
  }
  .privacy-ledger h2 {
    margin: 0 0 2px;
    color: #fff;
    font-size: 25px;
  }
  .privacy-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 50px;
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.84);
    font-size: 15px;
    font-weight: 780;
  }
  .privacy-row strong {
    color: #5eeadd;
    white-space: nowrap;
  }
  .review-proof {
    display: grid;
    grid-template-columns: 1fr 0.86fr;
    gap: 18px;
    min-height: 332px;
  }
  .review-form {
    position: relative;
    overflow: hidden;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background:
      radial-gradient(circle at 82% 14%, rgba(94, 234, 221, 0.14), transparent 190px),
      rgba(255, 255, 255, 0.08);
  }
  .review-form h2,
  .review-stack h2 {
    margin: 0 0 14px;
    color: #fff;
    font-size: 24px;
    line-height: 1.08;
  }
  .review-row {
    display: grid;
    grid-template-columns: 112px 1fr;
    align-items: center;
    gap: 14px;
    min-height: 46px;
    margin-bottom: 10px;
    padding: 0 13px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
  }
  .review-row span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    font-weight: 820;
  }
  .review-row strong {
    color: #fff;
    font-size: 15px;
    font-weight: 900;
  }
  .review-stack {
    display: grid;
    align-content: stretch;
    gap: 9px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.07);
  }
  .review-card {
    min-height: 62px;
    display: grid;
    align-content: center;
    gap: 5px;
    padding: 13px 15px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
  }
  .review-card strong {
    color: #fff;
    font-size: 18px;
  }
  .review-card span {
    color: rgba(255, 255, 255, 0.72);
    font-weight: 740;
    line-height: 1.28;
  }
  .review-card.accent {
    border-color: rgba(94, 234, 221, 0.34);
    background: rgba(94, 234, 221, 0.11);
  }
  .review-proof-light .review-form,
  .review-proof-light .review-stack {
    border-color: #d8e3de;
    background:
      radial-gradient(circle at 84% 16%, rgba(20, 184, 166, 0.12), transparent 180px),
      #ffffff;
  }
  .review-proof-light .review-form h2,
  .review-proof-light .review-stack h2 {
    color: #10231f;
  }
  .review-proof-light .review-row,
  .review-proof-light .review-card {
    border-color: #d8e3de;
    background: #f8fbf8;
  }
  .review-proof-light .review-row span,
  .review-proof-light .review-card span {
    color: #60726b;
  }
  .review-proof-light .review-row strong,
  .review-proof-light .review-card strong {
    color: #10231f;
  }
  .review-proof-light .review-card.accent {
    border-color: rgba(15, 118, 110, 0.3);
    background: #edf8f4;
  }
  .dark {
    background:
      linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(135deg, #10231f, #0d1816);
    color: #fff;
  }
  .dark::before {
    border-color: rgba(94, 234, 221, 0.12);
    background:
      linear-gradient(132deg, transparent 0 42%, rgba(94, 234, 221, 0.11) 42% 42.7%, transparent 42.7%),
      linear-gradient(132deg, transparent 0 58%, rgba(242, 193, 78, 0.13) 58% 58.8%, transparent 58.8%);
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
  .brand-stage {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    color: #f8fffc;
    background:
      linear-gradient(115deg, rgba(94, 234, 221, 0.18), transparent 44%),
      linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px) 0 0 / 64px 64px,
      linear-gradient(180deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px) 0 0 / 64px 64px,
      linear-gradient(135deg, #08231f 0%, #0f766e 54%, #05312d 100%);
  }
  .brand-stage::before,
  .brand-stage::after {
    content: "";
    position: absolute;
    z-index: -1;
    pointer-events: none;
  }
  .brand-stage::before {
    inset: 0;
    background:
      linear-gradient(132deg, transparent 0 42%, rgba(255, 255, 255, 0.14) 42% 42.8%, transparent 42.8%),
      linear-gradient(132deg, transparent 0 57%, rgba(242, 193, 78, 0.18) 57% 58.2%, transparent 58.2%);
  }
  .brand-stage::after {
    right: -8%;
    bottom: -22%;
    width: 46%;
    height: 82%;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 28px;
    transform: rotate(-8deg);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04));
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.22);
  }
  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 18px;
    font-weight: 950;
    letter-spacing: 0;
  }
  .brand-lockup img {
    width: 86px;
    height: 86px;
    filter: drop-shadow(0 20px 28px rgba(0, 0, 0, 0.28));
  }
  .brand-lockup span {
    font-size: 44px;
  }
  .brand-panel {
    display: grid;
    gap: 26px;
    align-content: center;
  }
  .promo-copy {
    display: grid;
    gap: 18px;
    max-width: 610px;
  }
  .promo-kicker {
    color: #5eeadd;
    font-size: 16px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .promo-head {
    margin: 0;
    color: #f8fffc;
    font-size: 46px;
    line-height: 1.04;
    font-weight: 950;
  }
  .promo-proof {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .promo-proof span {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.11);
    color: rgba(248, 255, 252, 0.9);
    font-size: 15px;
    font-weight: 850;
  }
  .promo-product {
    position: absolute;
    right: 42px;
    bottom: 34px;
    width: 278px;
    display: grid;
    gap: 10px;
    padding: 18px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 12px;
    background: rgba(248, 255, 252, 0.94);
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.24);
  }
  .promo-product strong {
    color: #10231f;
    font-size: 18px;
  }
  .promo-row {
    min-height: 34px;
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    border: 1px solid #d9e8e2;
    border-radius: 8px;
    background: #f8fbf8;
    color: #60726b;
    font-size: 12px;
    font-weight: 850;
  }
  .promo-row b {
    min-width: 0;
    overflow: hidden;
    color: #10231f;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .promo-cta {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: linear-gradient(135deg, #0f766e, #0a5f59);
    color: #fff;
    font-size: 14px;
    font-weight: 950;
    box-shadow: 0 16px 30px rgba(15, 118, 110, 0.22);
  }
  .promo-marquee .brand-lockup img { width: 104px; height: 104px; }
  .promo-marquee .brand-lockup span { font-size: 62px; }
  .promo-marquee .brand-panel { transform: translateY(-2px); }
  .promo-marquee .promo-product {
    right: 96px;
    bottom: 56px;
    width: 490px;
    gap: 14px;
    padding: 26px;
    border-radius: 14px;
  }
  .promo-marquee .promo-product strong { font-size: 28px; }
  .promo-marquee .promo-row {
    min-height: 48px;
    grid-template-columns: 92px minmax(0, 1fr);
    padding: 10px 13px;
    font-size: 16px;
  }
  .promo-marquee .promo-row b { font-size: 17px; }
  .promo-marquee .promo-cta { min-height: 54px; font-size: 19px; }
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
        <h2>Client onboarding</h2>
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

function promoProduct(label = 'Fill Page') {
  return `
    <div class="promo-product">
      <strong>${label}</strong>
      <div class="promo-row"><span>Name</span><b>Alex Morgan</b></div>
      <div class="promo-row"><span>Email</span><b>alex@example.com</b></div>
      <div class="promo-row"><span>Resume</span><b>alex-morgan.pdf</b></div>
      <div class="promo-cta">Fill Page</div>
    </div>`;
}

function brandPromo(stageClass, label = 'FillPro', productLabel = 'Saved profile') {
  const marqueeCopy = stageClass.includes('promo-marquee')
    ? `<div class="promo-copy">
        <div class="promo-kicker">Private autofill</div>
        <h1 class="promo-head">Fill repeat forms without handing over your data.</h1>
        <div class="promo-proof"><span>3 profiles free</span><span>No cloud profile</span><span>Review before submit</span></div>
      </div>`
    : '';
  return `
    <main class="stage brand-stage ${stageClass}">
      <div class="brand-panel">
        <div class="brand-lockup"><img src="${logoDataUrl}" alt=""><span>${label}</span></div>
        ${marqueeCopy}
      </div>
      ${promoProduct(productLabel)}
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
      <div><h1>Save your details once.</h1><p class="sub">Pick a profile, fill the page, then review before you submit.</p></div>
      ${chromeFrame('client.example/onboarding', beforeAfter())}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-profiles-1280x800.png'),
    1280,
    800,
    `<main class="stage dark">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro profiles</div><span class="pill">Private by design</span></div>
      <div><h1>Keep each repeat job separate.</h1><p class="sub">Work, client, vendor, and QA profiles stay easy to pick before each fill.</p></div>
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
      <div><h1>Fills what autofill misses.</h1><p class="sub">Dropdowns, checkboxes, uploads, and fields that appear late can still match from one profile.</p></div>
      ${chromeFrame('forms.example/team-intake', `
        <div class="grid2">
          <div class="form">
            <h2>Team intake form</h2>
            ${field('Full name', 'Alex Morgan')}
            ${field('Preferred contact', 'Email')}
            ${field('Resume upload', 'alex-morgan.pdf')}
          </div>
          <div class="panel">
            <h2>Tricky fields</h2>
            <div class="chips">
              <span class="chip">Dropdowns</span>
              <span class="chip">Checkboxes</span>
              <span class="chip">Choice buttons</span>
              <span class="chip">Text areas</span>
              <span class="chip">File uploads</span>
              <span class="chip">Late fields</span>
              <span class="chip">Nearby labels</span>
              <span class="chip">Grouped sections</span>
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
      <div><h1>No cloud profile account.</h1><p class="sub">Saved profiles, rules, and upload references stay in your browser unless you export them.</p></div>
      <div class="privacy-proof">
        <div class="privacy-grid">
          <div class="privacy-card"><strong>Saved profiles</strong><span>Details and rules stay local.</span></div>
          <div class="privacy-card"><strong>Current-page action</strong><span>FillPro runs when you ask on the page you chose.</span></div>
          <div class="privacy-card"><strong>Review before submit</strong><span>You decide when to submit.</span></div>
        </div>
        <div class="privacy-ledger">
          <h2>What FillPro leaves alone</h2>
          <div class="privacy-row"><span>Passwords</span><strong>Use your manager</strong></div>
          <div class="privacy-row"><span>Cards and checkout fields</span><strong>Use the site wallet</strong></div>
          <div class="privacy-row"><span>Submit button</span><strong>Always yours</strong></div>
          <div class="privacy-row"><span>Support reports</span><strong>Only what you send</strong></div>
        </div>
      </div>
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-undo-1280x800.png'),
    1280,
    800,
    `<main class="stage dark">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Undo ready</span></div>
      <div><h1>Undo before you submit.</h1><p class="sub">Review changes. Roll back in one click.</p></div>
      ${chromeFrame('careers.example/apply', `
        <div class="review-proof review-proof-light">
          <div class="review-form">
            <h2>Review before submit</h2>
            <div class="review-row"><span>First name</span><strong>Alex</strong></div>
            <div class="review-row"><span>Last name</span><strong>Morgan</strong></div>
            <div class="review-row"><span>Portfolio</span><strong>https://stealthyapps.com</strong></div>
            <div class="review-row"><span>Resume</span><strong>alex-morgan.pdf</strong></div>
          </div>
          <div class="review-stack">
            <h2>After FillPro runs</h2>
            <div class="review-card accent"><strong>8 fields changed</strong><span>Repeat details filled from the selected profile.</span></div>
            <div class="review-card"><strong>Upload matched</strong><span>Resume field is ready for review.</span></div>
            <div class="review-card"><strong>Undo snapshot saved</strong><span>Roll back the fill without reloading the page.</span></div>
            <div class="button" style="margin-top:6px; width:100%;">Undo last fill</div>
          </div>
        </div>`)}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-small-promo-440x280.png'),
    440,
    280,
    brandPromo('small-stage promo-small', 'FillPro', 'Fill Page'),
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-marquee-1400x560.png'),
    1400,
    560,
    brandPromo('marquee promo-marquee', 'FillPro', 'Work profile ready'),
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
          : 'Pick a profile. Check the filled fields.',
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
    if (size <= 32) {
      await sharp(Buffer.from(smallIconSvg(size))).png().toFile(path.join(projectRoot, 'fillpro', 'icons', `icon${size}.png`));
    } else {
      await sharp(extensionSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(projectRoot, 'fillpro', 'icons', `icon${size}.png`));
    }
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

function smallIconSvg(size) {
  const isTiny = size <= 16;
  if (isTiny) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <defs>
      <linearGradient id="bg" x1="1" y1="1" x2="15" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#32e6d2"/>
        <stop offset="0.62" stop-color="#0f8d80"/>
        <stop offset="1" stop-color="#0a5f57"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="14" height="14" rx="3" fill="url(#bg)"/>
    <path d="M2 2h6C5 3 3 5 2 9Z" fill="#ffffff" opacity="0.16"/>
    <rect x="4" y="3" width="3" height="10" rx="1" fill="#fbfffd"/>
    <rect x="4" y="3" width="9" height="3" rx="1" fill="#fbfffd"/>
    <rect x="4" y="7" width="7" height="3" rx="1" fill="#fbfffd"/>
  </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="geometricPrecision">
    <defs>
      <linearGradient id="bg" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#2fe4d0"/>
        <stop offset="0.58" stop-color="#0f8d80"/>
        <stop offset="1" stop-color="#0a5f57"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="28" height="28" rx="7.2" fill="url(#bg)"/>
    <path d="M5 4h11.5C9.4 5.7 5.9 10.1 5.1 17.1c-0.7-3.9-0.62-8.7-0.1-13.1Z" fill="#ffffff" opacity="0.15"/>
    <rect x="7" y="6" width="7" height="20" rx="2" fill="#fbfffd"/>
    <rect x="7" y="6" width="18.2" height="6.8" rx="2.2" fill="#fbfffd"/>
    <rect x="7" y="14.3" width="14.8" height="5.8" rx="1.9" fill="#fbfffd"/>
  </svg>`;
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
