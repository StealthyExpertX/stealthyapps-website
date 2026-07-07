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
const logoDataUrl = `data:image/svg+xml;base64,${fs
  .readFileSync(logoSvgPath)
  .toString('base64')}`;

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const DURATION = 22;
const FRAMES = FPS * DURATION;
const FIRST_FILL_BEFORE_SECONDS = 3;
const POSTER_FRAME_SECONDS = 2.4;
// Mute-safe captions: every important claim must be visible without voiceover.

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
    isolation: isolate;
    --scene-shift: 0px;
    --mark-a-x: 0px;
    --mark-a-y: 0px;
    --mark-b-x: 0px;
    --mark-b-y: 0px;
    background:
      radial-gradient(circle at var(--x, 72%) var(--y, 16%), rgba(20, 184, 166, 0.2), transparent 310px),
      linear-gradient(90deg, rgba(15, 118, 110, 0.052) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.048) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(135deg, #fbfdfb, #eef8f4 58%, #f8f4e9);
  }
  .frame.scene-review,
  .frame.scene-private,
  .frame.scene-control {
    color: #f8fffc;
    background:
      radial-gradient(circle at var(--x, 70%) var(--y, 16%), rgba(94, 234, 221, 0.2), transparent 330px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.058) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(180deg, rgba(255, 255, 255, 0.052) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(135deg, #081b18 0%, #0d2c27 52%, #113a33 100%);
  }
  .frame.scene-start {
    background:
      radial-gradient(circle at 78% 18%, rgba(94, 234, 221, 0.26), transparent 330px),
      radial-gradient(circle at 8% 78%, rgba(242, 193, 78, 0.18), transparent 310px),
      linear-gradient(90deg, rgba(15, 118, 110, 0.052) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.048) 1px, transparent 1px) 0 0 / 74px 74px,
      linear-gradient(135deg, #fbfdfb, #e5f6f1 56%, #f7efd9);
  }
  .frame::before,
  .frame::after {
    content: "";
    position: absolute;
    z-index: 0;
    pointer-events: none;
  }
  .frame::before {
    inset: 0;
    background:
      linear-gradient(122deg, transparent 0 48%, rgba(15, 118, 110, 0.09) 48% 48.8%, transparent 48.8%),
      linear-gradient(122deg, transparent 0 62%, rgba(242, 193, 78, 0.13) 62% 63.1%, transparent 63.1%);
    opacity: 0.72;
  }
  .frame::after {
    right: -160px;
    top: 74px;
    width: 420px;
    height: 520px;
    border: 1px solid rgba(15, 118, 110, 0.12);
    border-radius: 32px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.1));
    box-shadow: 0 42px 120px rgba(16, 35, 31, 0.1);
    transform: rotate(-7deg) translateY(var(--plate-y, 0px));
  }
  .kinetic-layer {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.84;
  }
  .kinetic-layer span {
    position: absolute;
    display: block;
    border: 1px solid rgba(15, 118, 110, 0.13);
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 30px 80px rgba(16, 35, 31, 0.08);
  }
  .kinetic-layer span:nth-child(1) {
    right: 228px;
    top: 74px;
    width: 198px;
    height: 82px;
    border-radius: 18px;
    transform: translate3d(var(--mark-a-x), var(--mark-a-y), 0) rotate(-7deg);
  }
  .kinetic-layer span:nth-child(2) {
    left: 430px;
    bottom: 76px;
    width: 260px;
    height: 92px;
    border-radius: 22px;
    transform: translate3d(var(--mark-b-x), var(--mark-b-y), 0) rotate(8deg);
  }
  .scene-review .kinetic-layer span,
  .scene-private .kinetic-layer span,
  .scene-control .kinetic-layer span {
    border-color: rgba(94, 234, 221, 0.14);
    background: rgba(94, 234, 221, 0.06);
    box-shadow: 0 40px 110px rgba(0, 0, 0, 0.24);
  }
  .scene-ribbon {
    position: absolute;
    left: 58px;
    top: 96px;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 12px;
    border: 1px solid rgba(15, 118, 110, 0.17);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #0f766e;
    font-size: 12px;
    font-weight: 950;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .scene-review .scene-ribbon,
  .scene-private .scene-ribbon,
  .scene-control .scene-ribbon {
    border-color: rgba(94, 234, 221, 0.2);
    background: rgba(94, 234, 221, 0.1);
    color: #5eeadd;
  }
  .brand {
    position: absolute;
    z-index: 4;
    left: 58px;
    top: 34px;
    display: flex;
    align-items: center;
    gap: 13px;
    font-weight: 900;
    font-size: 27px;
  }
  .scene-review .brand,
  .scene-private .brand,
  .scene-control .brand {
    color: #f8fffc;
  }
  .brand img {
    width: 62px;
    height: 62px;
    filter: drop-shadow(0 16px 22px rgba(15, 118, 110, 0.24));
  }
  .version {
    position: absolute;
    z-index: 4;
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
  .scene-review .version,
  .scene-private .version,
  .scene-control .version {
    border-color: rgba(94, 234, 221, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(248, 255, 252, 0.86);
  }
  .copy {
    position: absolute;
    left: 58px;
    top: 126px;
    width: 505px;
    z-index: 4;
    opacity: var(--copy-opacity, 1);
    transform: translate3d(0, var(--copy-y, 0px), 0);
  }
  .eyebrow {
    margin: 0 0 14px;
    color: #0f766e;
    font-size: 13px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .scene-review .eyebrow,
  .scene-private .eyebrow,
  .scene-control .eyebrow {
    color: #5eeadd;
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
  .scene-review .sub,
  .scene-private .sub,
  .scene-control .sub {
    color: rgba(248, 255, 252, 0.78);
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
  .scene-review .proof span,
  .scene-private .proof span,
  .scene-control .proof span {
    border-color: rgba(94, 234, 221, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(248, 255, 252, 0.9);
  }
  .browser {
    position: absolute;
    right: 38px;
    top: 112px;
    z-index: 3;
    width: 668px;
    height: 534px;
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.13);
    border-radius: 10px;
    background: #ffffff;
    box-shadow:
      0 48px 100px rgba(16, 35, 31, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.72) inset;
    transform:
      translate3d(var(--browser-x, 0px), var(--browser-y, 0px), 0)
      scale(var(--browser-scale, 1));
    transform-origin: 72% 50%;
  }
  .scene-review .browser,
  .scene-private .browser,
  .scene-control .browser {
    border-color: rgba(94, 234, 221, 0.16);
    box-shadow:
      0 54px 120px rgba(0, 0, 0, 0.34),
      0 0 0 1px rgba(255, 255, 255, 0.08) inset;
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
    color: #10231f;
  }
  .form-title {
    margin: 0 0 18px;
    color: #10231f;
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
    background: linear-gradient(135deg, rgba(237, 248, 244, 0.98), rgba(255, 255, 255, 0.98));
    color: #334741;
    font-size: 13px;
    font-weight: 850;
    line-height: 1.28;
    opacity: var(--review-opacity, 0);
  }
  .payoff-card {
    position: absolute;
    left: 58px;
    bottom: 92px;
    z-index: 5;
    width: 465px;
    display: grid;
    gap: 12px;
    padding: 18px 20px;
    border: 1px solid rgba(15, 118, 110, 0.15);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow:
      0 28px 70px rgba(16, 35, 31, 0.14),
      0 0 0 1px rgba(255, 255, 255, 0.78) inset;
    opacity: var(--payoff-opacity, 1);
    transform: translate3d(0, var(--payoff-y, 0px), 0) scale(var(--payoff-scale, 1));
  }
  .payoff-title {
    margin: 0;
    color: #10231f;
    font-size: 24px;
    font-weight: 950;
    line-height: 1.02;
  }
  .payoff-detail {
    margin: 0;
    color: #43544e;
    font-size: 15px;
    font-weight: 720;
    line-height: 1.32;
  }
  .payoff-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .payoff-stats span {
    min-height: 58px;
    display: grid;
    align-content: center;
    gap: 2px;
    padding: 10px;
    border-radius: 10px;
    background: #edf8f4;
    color: #10231f;
    font-size: 12px;
    font-weight: 820;
  }
  .payoff-stats strong {
    color: #0f766e;
    font-size: 19px;
    line-height: 1;
  }
  .motion-rail {
    position: absolute;
    left: 58px;
    right: 58px;
    bottom: 14px;
    z-index: 7;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(16, 35, 31, 0.1);
  }
  .motion-rail span {
    display: block;
    width: var(--progress, 0%);
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #5eeadd, #0f766e, #f2c14e);
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
    z-index: 4;
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
    background: rgba(255, 255, 255, 0.96);
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
    z-index: 6;
    display: flex;
    justify-content: space-between;
    color: #60726b;
    font-size: 12px;
    font-weight: 800;
    opacity: 0.86;
  }
  .scene-review .footer-line,
  .scene-private .footer-line,
  .scene-control .footer-line {
    color: rgba(248, 255, 252, 0.66);
  }
  .fade {
    transition: none;
  }
</style>
</head>
<body>
<main class="frame">
  <div class="kinetic-layer" aria-hidden="true"><span></span><span></span></div>
  <div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div>
  <div class="version">v1.0.0</div>
  <div class="scene-ribbon" id="sceneRibbon">Private autofill</div>
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
  <section class="payoff-card" id="payoff" aria-hidden="true">
    <p class="payoff-title" id="payoffTitle">Blank form. Review-ready.</p>
    <p class="payoff-detail" id="payoffDetail">Watch repeated details and uploads fill while sign-in fields stay alone.</p>
    <div class="payoff-stats" id="payoffStats">
      <span><strong>4</strong>fields</span>
      <span><strong>1</strong>upload</span>
      <span><strong>0</strong>passwords</span>
    </div>
  </section>
  <div class="cursor" id="cursor"></div>
  <div class="footer-line"><span>Chrome / Edge / Firefox</span><span>stealthyapps.com/fillpro</span></div>
  <div class="motion-rail" aria-hidden="true"><span id="progressRail"></span></div>
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
    if (t < 0.4) return [1040, 462, 1];
    if (t < 1.1) {
      const p = smooth((t - 0.4) / 0.7);
      return [mix(1040, 1008, p), mix(462, 356, p), 1];
    }
    if (t < 1.8) {
      const p = smooth((t - 1.1) / 0.7);
      return [mix(1008, 928, p), mix(356, 418, p), 1];
    }
    if (t < 13.6) {
      const p = smooth((t - 4.2) / 9.4);
      return [mix(928, 906, p), mix(418, 508, p), 0.78];
    }
    if (t < 16.5) {
      const p = smooth((t - 13.6) / 2.9);
      return [mix(906, 1038, p), mix(508, 500, p), 0.82];
    }
    return [1040, 500, 0];
  }

  function copyFor(t) {
    if (t < 1.8) return ['One click fill', 'Fill a long form in one click.', 'Choose a saved profile, fill the repeat fields, then review before you submit.'];
    if (t < 4.8) return ['One click', 'Fields fill while you watch.', 'Name, email, company, and upload match from the selected profile.'];
    if (t < 7.6) return ['Review', 'Review before submit.', 'Sign-ins stay with your password manager.'];
    if (t < 10.2) return ['Applications', 'Applications with uploads.', 'Name, email, company, and resume upload match from one profile.'];
    if (t < 13.2) return ['Modern forms', 'Fills what autofill misses.', 'Dropdowns, checkboxes, uploads, and late fields can still match.'];
    if (t < 16) return ['Private by default', 'No cloud profile account.', 'Saved profiles, rules, and upload references stay in your browser unless you export them.'];
    if (t < 18.8) return ['You stay in control', 'Review or undo before submit.', 'FillPro helps with repeat fields. You decide when to submit.'];
    return ['Free starter', 'Start free with three profiles.', 'Fill a long form, review every field, and upgrade only if you need more profiles.'];
  }

  function proofFor(t) {
    if (t < 4.8) return ['4 fields filled', 'Upload matched', 'Sign-in untouched'];
    if (t < 10.2) return ['Review first', 'Sign-in untouched', 'Undo ready'];
    if (t < 13.2) return ['Dropdowns', 'Checkboxes', 'Late fields'];
    if (t < 16) return ['No cloud profile', 'Current page', 'Export when needed'];
    if (t < 18.8) return ['Review first', 'Undo ready', 'Sign-in untouched'];
    return ['3 profiles free', 'Review first', 'No cloud profile'];
  }

  function sceneFor(t) {
    if (t < 4.8) return 'scene-fill';
    if (t < 7.6) return 'scene-review';
    if (t < 10.2) return 'scene-upload';
    if (t < 13.2) return 'scene-modern';
    if (t < 16) return 'scene-private';
    if (t < 18.8) return 'scene-control';
    return 'scene-start';
  }

  function ribbonFor(t) {
    if (t < 4.8) return 'One click fill';
    if (t < 7.6) return 'Review first';
    if (t < 10.2) return 'Resume upload';
    if (t < 13.2) return 'Modern controls';
    if (t < 16) return 'Saved here';
    if (t < 18.8) return 'Undo ready';
    return 'Free starter';
  }

  function formFor(t) {
    if (t >= 10.2 && t < 13.2) {
      return {
        title: 'Modern signup',
        url: 'app.example/trial',
        fields: modernFields,
      };
    }
    if (t >= 13.2) {
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
    if (t < 1.55) return -1;
    if (t < 2.05) return 0;
    if (t < 2.65) return 1;
    if (t < 3.35) return 2;
    if (t < 4.15) return 3;
    return -1;
  }

  function filledCount(t) {
    if (t >= 10.2 && t < 13.2) return 5;
    if (t < 1.55) return 0;
    if (t < 2.05) return 1;
    if (t < 2.65) return 2;
    if (t < 3.35) return 3;
    if (t < 4.15) return 4;
    return 4;
  }

  function payoffFor(t) {
    if (t < 1.8) {
      return [
        'Watch the repeat fields fill.',
        'Name, email, company, and upload match from one saved profile.',
        ['4', 'fields'],
        ['1', 'upload'],
        ['0', 'passwords'],
      ];
    }
    if (t < 7.6) {
      const count = filledCount(t);
      return [
        count < 4 ? 'Filling the repeat work.' : 'Ready to review.',
        count < 4 ? 'Name, email, company, and upload fields fill from the selected profile.' : 'Sign-ins stay with the browser or password manager.',
        [String(Math.min(count, 4)), 'fields'],
        [count >= 4 ? '1' : '0', 'upload'],
        ['0', 'passwords'],
      ];
    }
    if (t < 10.2) {
      return ['Applications with uploads.', 'Name, email, company, and resume upload match from one profile.', ['Name', 'filled'], ['Resume', 'matched'], ['Sign-in', 'skipped']];
    }
    if (t < 13.2) {
      return ['Fills what autofill misses.', 'Dropdowns, checkboxes, uploads, and late fields can still match.', ['Choice', 'fields'], ['Same', 'frames'], ['File', 'inputs']];
    }
    if (t < 16) {
      return ['No cloud profile account.', 'Saved profiles, rules, and upload references stay in your browser unless exported.', ['Local', 'profiles'], ['Click', 'to fill'], ['Export', 'when needed']];
    }
    if (t < 18.8) {
      return ['Review or undo before submit.', 'FillPro handles repeat fields; you decide when to submit.', ['Review', 'first'], ['Undo', 'ready'], ['Sign-in', 'untouched']];
    }
    return ['Start free. Keep control.', 'Three profiles are included. No cloud profile is needed to fill forms.', ['3', 'free'], ['No cloud', 'profile'], ['Review', 'first']];
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
    const frame = document.querySelector('.frame');
    frame.className = 'frame ' + sceneFor(t);
    document.getElementById('sceneRibbon').textContent = ribbonFor(t);

    const [eyebrow, headline, subline] = copyFor(t);
    document.getElementById('eyebrow').textContent = eyebrow;
    document.getElementById('headline').textContent = headline;
    document.getElementById('subline').textContent = subline;
    document.getElementById('proof').innerHTML = proofFor(t).map((item) => '<span>' + item + '</span>').join('');
    const [payoffTitle, payoffDetail, ...payoffStats] = payoffFor(t);
    document.getElementById('payoffTitle').textContent = payoffTitle;
    document.getElementById('payoffDetail').textContent = payoffDetail;
    document.getElementById('payoffStats').innerHTML = payoffStats
      .map(([strong, label]) => '<span><strong>' + strong + '</strong>' + label + '</span>')
      .join('');
    const form = formFor(t);
    document.getElementById('formTitle').textContent = form.title;
    document.getElementById('url').textContent = form.url;
    document.getElementById('fields').innerHTML = renderFields(t);

    const panel = document.getElementById('panel');
    const panelOpacity = t < 0.45 ? 0 : t < 1.2 ? smooth((t - 0.45) / 0.75) : 1;
    panel.style.setProperty('--panel-opacity', panelOpacity.toFixed(3));
    panel.style.setProperty('--panel-y', (12 - 12 * panelOpacity).toFixed(2) + 'px');
    panel.style.setProperty('--panel-scale', (0.98 + 0.02 * panelOpacity).toFixed(3));

    const fillButton = document.getElementById('fillButton');
    const shine = t > 0.9 && t < 1.8 ? mix(-120, 420, smooth((t - 0.9) / 0.9)) : -120;
    fillButton.style.setProperty('--shine', shine.toFixed(1) + '%');

    const review = document.getElementById('review');
    const reviewWindow = (t >= 8.2 && t < 13.2) || t >= 18.8;
    const reviewOpacity = !reviewWindow ? 0 : t < 9.2 ? smooth((t - 8.2) / 1) : 1;
    review.style.setProperty('--review-opacity', reviewOpacity.toFixed(3));

    const strip = document.getElementById('strip');
    const stripOpacity = t < 15.2 ? 0 : t < 16.4 ? smooth((t - 15.2) / 1.2) : 1;
    strip.style.setProperty('--strip-opacity', stripOpacity.toFixed(3));

    const payoff = document.getElementById('payoff');
    const payoffOpacity = t > 18.8 ? 1 - smooth((t - 18.8) / 0.45) : 1;
    payoff.style.setProperty('--payoff-opacity', payoffOpacity.toFixed(3));
    payoff.style.setProperty('--payoff-y', (Math.sin(t * 1.1) * 2).toFixed(2) + 'px');
    payoff.style.setProperty('--payoff-scale', (t < 1 ? (0.985 + smooth(t) * 0.015) : 1).toFixed(3));

    const cursor = document.getElementById('cursor');
    const [x, y, opacity] = cursorPath(t);
    cursor.style.setProperty('--cursor-x', x.toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-y', y.toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-opacity', opacity.toFixed(3));

    frame.style.setProperty('--x', (62 + Math.sin(t * 0.55) * 12).toFixed(1) + '%');
    frame.style.setProperty('--y', (16 + Math.cos(t * 0.45) * 8).toFixed(1) + '%');
    frame.style.setProperty('--plate-y', (Math.sin(t * 0.45) * 10).toFixed(1) + 'px');
    frame.style.setProperty('--mark-a-x', (Math.sin(t * 0.72) * 16).toFixed(1) + 'px');
    frame.style.setProperty('--mark-a-y', (Math.cos(t * 0.64) * 10).toFixed(1) + 'px');
    frame.style.setProperty('--mark-b-x', (Math.cos(t * 0.5) * 18).toFixed(1) + 'px');
    frame.style.setProperty('--mark-b-y', (Math.sin(t * 0.58) * 12).toFixed(1) + 'px');
    frame.style.setProperty('--browser-scale', (t < 1.1 ? 1.028 : t > 18.8 ? 1.01 : 1).toFixed(3));
    frame.style.setProperty('--browser-x', (t > 13.4 && t < 15.8 ? '-10px' : '0px'));
    frame.style.setProperty('--browser-y', (t > 18.8 ? '-6px' : '0px'));
    document.getElementById('progressRail').style.setProperty('--progress', ((t / ${DURATION}) * 100).toFixed(2) + '%');

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
        String(POSTER_FRAME_SECONDS),
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

    // Screenshots are rendered by render-fillpro-assets.js so each store image can
    // be composed for a distinct proof point instead of being a cropped video frame.
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

renderFrames().catch((error) => {
  console.error(error);
  process.exit(1);
});
