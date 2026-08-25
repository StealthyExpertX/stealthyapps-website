const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const siteRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(siteRoot, 'assets');
const marketplaceDir = path.join(assetsDir, 'marketplace');
const logoSvgPath = path.join(assetsDir, 'skip-retyping-logo.svg');
const outputMp4 = path.join(marketplaceDir, 'skip-retyping-store-demo-22s.mp4');
const outputThumb = path.join(marketplaceDir, 'skip-retyping-store-demo-22s-thumb.png');
const logoDataUrl = `data:image/svg+xml;base64,${fs
  .readFileSync(logoSvgPath)
  .toString('base64')}`;

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const DURATION = 22;
const FRAMES = FPS * DURATION;
const FIRST_FILL_BEFORE_SECONDS = 1.25;
const POSTER_FRAME_SECONDS = 3.75;
// Mute-safe captions: every important claim is visible without voiceover.

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body {
    margin: 0;
    overflow: hidden;
    color: #10231f;
    background: #f4f8f5;
    font-family: "Aptos", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  }
  .stage {
    --stage-text: rgba(16, 35, 31, 1);
    --stage-grid-x: rgba(15, 118, 110, 0.05);
    --stage-grid-y: rgba(15, 118, 110, 0.045);
    --stage-bg-a: rgba(251, 253, 251, 1);
    --stage-bg-b: rgba(237, 247, 243, 1);
    --stage-bg-c: rgba(246, 241, 229, 1);
    --stage-frame-border: rgba(15, 118, 110, 0.11);
    --top-border: rgba(16, 35, 31, 0.14);
    --top-bg: rgba(255, 255, 255, 0.84);
    --top-text: rgba(67, 84, 78, 1);
    --eyebrow-text: rgba(15, 118, 110, 1);
    --sub-text: rgba(67, 84, 78, 1);
    --proof-border: rgba(15, 118, 110, 0.16);
    --proof-bg: rgba(255, 255, 255, 0.76);
    --proof-text: rgba(56, 82, 75, 1);
    --browser-border: rgba(16, 35, 31, 0.14);
    --browser-shadow: 0 42px 90px rgba(16, 35, 31, 0.18);
    --note-border: rgba(15, 118, 110, 0.2);
    --note-bg: rgba(255, 255, 255, 0.94);
    --note-text: rgba(56, 82, 75, 1);
    --note-strong: rgba(16, 35, 31, 1);
    --footer-text: rgba(100, 118, 111, 1);
    position: relative;
    isolation: isolate;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    color: var(--stage-text);
    background:
      linear-gradient(90deg, var(--stage-grid-x) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(180deg, var(--stage-grid-y) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(135deg, var(--stage-bg-a) 0%, var(--stage-bg-b) 62%, var(--stage-bg-c) 100%);
  }
  .stage::before {
    content: "";
    position: absolute;
    inset: 22px;
    z-index: -1;
    border: 1px solid var(--stage-frame-border);
    border-radius: 8px;
    background:
      linear-gradient(128deg, transparent 0 48%, rgba(15, 118, 110, 0.09) 48% 48.7%, transparent 48.7%),
      linear-gradient(128deg, transparent 0 64%, rgba(213, 157, 55, 0.12) 64% 64.8%, transparent 64.8%);
  }
  .brand {
    position: absolute;
    left: 52px;
    top: 32px;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 25px;
    font-weight: 920;
    color: var(--stage-text);
  }
  .brand img {
    width: 52px;
    height: 52px;
    filter: drop-shadow(0 12px 18px rgba(15, 118, 110, 0.22));
  }
  .top-note {
    position: absolute;
    right: 52px;
    top: 42px;
    z-index: 8;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    padding: 7px 13px;
    border: 1px solid var(--top-border);
    border-radius: 999px;
    background: var(--top-bg);
    color: var(--top-text);
    font-size: 13px;
    font-weight: 820;
    opacity: var(--top-opacity, 1);
    transform: translateY(var(--top-y, 0px));
  }
  .copy {
    position: absolute;
    left: 52px;
    top: 142px;
    z-index: 6;
    width: 430px;
    opacity: var(--copy-opacity, 1);
    transform: translate3d(0, var(--copy-y, 0px), 0);
  }
  .eyebrow {
    margin: 0 0 12px;
    color: var(--eyebrow-text);
    font-size: 12px;
    font-weight: 930;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    max-width: 12ch;
    font: 930 58px/0.96 "Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
    letter-spacing: 0;
    white-space: pre-line;
  }
  .sub {
    max-width: 410px;
    margin: 18px 0 0;
    color: var(--sub-text);
    font-size: 19px;
    line-height: 1.4;
    font-weight: 620;
  }
  .proof {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 22px;
  }
  .proof span {
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    padding: 6px 11px;
    border: 1px solid var(--proof-border);
    border-radius: 999px;
    background: var(--proof-bg);
    color: var(--proof-text);
    font-size: 12px;
    font-weight: 820;
  }
  .browser {
    position: absolute;
    right: 42px;
    top: 112px;
    z-index: 4;
    width: 744px;
    height: 540px;
    overflow: hidden;
    border: 1px solid var(--browser-border);
    border-radius: 8px;
    background: #fff;
    box-shadow: var(--browser-shadow);
    transform: translate3d(var(--browser-x, 0px), var(--browser-y, 0px), 0) scale(var(--browser-scale, 1));
    transform-origin: 76% 54%;
  }
  .chrome {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    background: #10231f;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255, 255, 255, 0.36); }
  .url {
    min-width: 0;
    flex: 1;
    height: 27px;
    display: flex;
    align-items: center;
    margin-left: 9px;
    padding: 0 12px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.74);
    font-size: 12px;
    font-weight: 760;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .page {
    position: relative;
    height: calc(100% - 44px);
    padding: 24px 282px 22px 24px;
    background:
      linear-gradient(90deg, rgba(15, 118, 110, 0.035) 1px, transparent 1px) 0 0 / 44px 44px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.03) 1px, transparent 1px) 0 0 / 44px 44px,
      linear-gradient(180deg, #fff, #f7faf8);
    color: #10231f;
  }
  .form-title {
    margin: 0 0 15px;
    color: #10231f;
    font-size: 25px;
    line-height: 1;
    font-weight: 900;
  }
  .field {
    position: relative;
    display: grid;
    gap: 5px;
    margin-bottom: 9px;
    color: #50615b;
    font-size: 11px;
    font-weight: 820;
  }
  .box {
    position: relative;
    height: 38px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    overflow: hidden;
    border: 1px solid #cfdcd6;
    border-radius: 7px;
    background: #fff;
    color: #10231f;
    font-size: 14px;
    font-weight: 820;
    white-space: nowrap;
  }
  .box.is-filled {
    border-color: rgba(15, 118, 110, 0.38);
    background: #eaf7f2;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.07);
  }
  .field.is-active .box::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(94, 234, 221, 0.46), transparent);
    transform: translateX(var(--field-shine, -120%));
  }
  .box.is-boundary {
    color: #7b8b85;
    background: #fafcfb;
  }
  .extension-panel {
    position: absolute;
    right: 22px;
    top: 24px;
    width: 238px;
    display: grid;
    gap: 9px;
    padding: 14px;
    border: 1px solid #d3dfda;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 22px 54px rgba(16, 35, 31, 0.18);
    opacity: var(--panel-opacity, 1);
    transform: translate3d(0, var(--panel-y, 0px), 0) scale(var(--panel-scale, 1));
  }
  .panel-head { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 900; }
  .panel-head img { width: 30px; height: 30px; }
  .profile {
    display: grid;
    gap: 2px;
    padding: 10px;
    border: 1px solid #d7e2dd;
    border-radius: 7px;
    background: #f7faf8;
  }
  .profile strong { color: #10231f; font-size: 13px; }
  .profile span { color: #667971; font-size: 10.5px; }
  .fill-button,
  .undo-button {
    position: relative;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 900;
  }
  .fill-button {
    background: #0f766e;
    color: #fff;
    box-shadow: 0 12px 24px rgba(15, 118, 110, 0.18);
  }
  .fill-button::after {
    content: "";
    position: absolute;
    inset: -100% auto -100% -35%;
    width: 32%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent);
    transform: translateX(var(--button-shine, -130%)) rotate(17deg);
  }
  .undo-button {
    border: 1px solid #d7e2dd;
    background: #f1f6f3;
    color: #203a33;
  }
  .result {
    position: absolute;
    left: 24px;
    right: 282px;
    bottom: 18px;
    min-height: 48px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
    padding: 8px 11px;
    border: 1px solid rgba(15, 118, 110, 0.24);
    border-radius: 7px;
    background: rgba(234, 247, 242, 0.96);
    color: #315048;
    opacity: var(--result-opacity, 0);
    transform: translateY(var(--result-y, 6px));
  }
  .result strong { color: #0f766e; font-size: 20px; }
  .result span { font-size: 11px; font-weight: 760; line-height: 1.3; }
  .floating-note {
    position: absolute;
    z-index: 7;
    left: 518px;
    bottom: 64px;
    width: 300px;
    display: grid;
    gap: 4px;
    padding: 13px 15px;
    border: 1px solid var(--note-border);
    border-radius: 8px;
    background: var(--note-bg);
    color: var(--note-text);
    box-shadow: 0 20px 44px rgba(16, 35, 31, 0.12);
    opacity: var(--note-opacity, 0);
    transform: translateY(var(--note-y, 8px));
  }
  .floating-note strong { color: var(--note-strong); font-size: 14px; }
  .floating-note span { font-size: 12px; line-height: 1.35; }
  .cursor {
    position: absolute;
    z-index: 12;
    left: 0;
    top: 0;
    width: 18px;
    height: 24px;
    opacity: var(--cursor-opacity, 1);
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.24));
    transform: translate3d(var(--cursor-x, 980px), var(--cursor-y, 430px), 0);
  }
  .cursor::before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;
    border-top: 18px solid #10231f;
    border-right: 11px solid transparent;
    transform: rotate(-18deg);
  }
  .cursor::after {
    content: "";
    position: absolute;
    left: -10px;
    top: -10px;
    width: 34px;
    height: 34px;
    border: 2px solid rgba(15, 118, 110, 0.52);
    border-radius: 50%;
    opacity: var(--click-opacity, 0);
    transform: scale(var(--click-scale, 0.4));
  }
  .footer-line {
    position: absolute;
    left: 52px;
    right: 52px;
    bottom: 24px;
    z-index: 8;
    display: flex;
    justify-content: space-between;
    color: var(--footer-text);
    font-size: 11px;
    font-weight: 760;
  }
  .progress {
    position: absolute;
    left: 52px;
    right: 52px;
    bottom: 14px;
    z-index: 8;
    height: 3px;
    overflow: hidden;
    background: rgba(15, 118, 110, 0.12);
  }
  .progress span { display: block; width: var(--progress, 0%); height: 100%; background: linear-gradient(90deg, #14b8a6, #d59d37); }
</style>
</head>
<body>
<main class="stage" id="stage">
  <div class="brand"><img src="${logoDataUrl}" alt=""><span>Skip Retyping</span></div>
  <div class="top-note" id="topNote">Job application autofill</div>
  <section class="copy" id="copy">
    <p class="eyebrow" id="eyebrow">Job application</p>
    <h1 id="headline">Another job\napplication?</h1>
    <p class="sub" id="subline">Fill the details you already saved.</p>
    <div class="proof" id="proof"><span>3 profiles free</span><span>Stored in your browser</span></div>
  </section>
  <section class="browser" id="browser" aria-hidden="true">
    <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url" id="url">careers.example.com/apply</span></div>
    <div class="page">
      <h2 class="form-title" id="formTitle">Job application</h2>
      <div id="fields"></div>
      <div class="result" id="result"><strong id="resultCount">4</strong><span id="resultText">fields and the resume are ready to review</span></div>
      <aside class="extension-panel" id="panel">
        <div class="panel-head"><img src="${logoDataUrl}" alt=""><span>Skip Retyping</span></div>
        <div class="profile"><strong id="profileName">Job search profile</strong><span id="profileMeta">12 saved fields · 2 rules · 1 file</span></div>
        <div class="fill-button" id="fillButton">Fill Page</div>
        <div class="undo-button" id="undoButton">Undo last fill</div>
      </aside>
    </div>
  </section>
  <aside class="floating-note" id="floatingNote"><strong id="noteTitle">Ready to review</strong><span id="noteText">You decide when the form is submitted.</span></aside>
  <div class="cursor" id="cursor"></div>
  <div class="footer-line"><span>Chrome · Edge · Firefox</span><span>stealthyapps.com/skip-retyping</span></div>
  <div class="progress"><span id="progress"></span></div>
</main>
<script>
  const applicationFields = [
    ['Full name', 'Alex Morgan', 'text'],
    ['Email', 'alex@example.com', 'text'],
    ['Phone', '(207) 555-0148', 'text'],
    ['Resume upload', 'alex-morgan-resume.pdf', 'file'],
    ['Account password', '', 'boundary'],
  ];
  const modernFields = [
    ['Preferred location', 'Portland, Maine', 'select'],
    ['Open to remote work', 'Checked', 'check'],
    ['Available to start', 'In two weeks', 'text'],
    ['Portfolio', 'stealthyapps.com', 'text'],
    ['Additional question', 'Filled when it appeared', 'late'],
  ];

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function smooth(value) { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); }
  function mix(a, b, amount) { return a + (b - a) * amount; }
  function windowOpacity(t, start, end, fade = 0.45) {
    if (t < start || t > end) return 0;
    if (t < start + fade) return smooth((t - start) / fade);
    if (t > end - fade) return 1 - smooth((t - (end - fade)) / fade);
    return 1;
  }

  const themeTokens = [
    ['--stage-text', [16, 35, 31, 1], [246, 255, 252, 1]],
    ['--stage-grid-x', [15, 118, 110, 0.05], [255, 255, 255, 0.055]],
    ['--stage-grid-y', [15, 118, 110, 0.045], [255, 255, 255, 0.045]],
    ['--stage-bg-a', [251, 253, 251, 1], [8, 27, 24, 1]],
    ['--stage-bg-b', [237, 247, 243, 1], [13, 43, 38, 1]],
    ['--stage-bg-c', [246, 241, 229, 1], [18, 56, 47, 1]],
    ['--stage-frame-border', [15, 118, 110, 0.11], [94, 234, 221, 0.14]],
    ['--top-border', [16, 35, 31, 0.14], [94, 234, 221, 0.2]],
    ['--top-bg', [255, 255, 255, 0.84], [255, 255, 255, 0.08]],
    ['--top-text', [67, 84, 78, 1], [246, 255, 252, 0.86]],
    ['--eyebrow-text', [15, 118, 110, 1], [94, 234, 221, 1]],
    ['--sub-text', [67, 84, 78, 1], [246, 255, 252, 0.76]],
    ['--proof-border', [15, 118, 110, 0.16], [94, 234, 221, 0.2]],
    ['--proof-bg', [255, 255, 255, 0.76], [255, 255, 255, 0.08]],
    ['--proof-text', [56, 82, 75, 1], [246, 255, 252, 0.9]],
    ['--browser-border', [16, 35, 31, 0.14], [94, 234, 221, 0.18]],
    ['--note-border', [15, 118, 110, 0.2], [94, 234, 221, 0.22]],
    ['--note-bg', [255, 255, 255, 0.94], [13, 35, 30, 0.96]],
    ['--note-text', [56, 82, 75, 1], [246, 255, 252, 0.72]],
    ['--note-strong', [16, 35, 31, 1], [246, 255, 252, 1]],
    ['--footer-text', [100, 118, 111, 1], [246, 255, 252, 0.58]],
  ];

  function colorBetween(light, dark, amount) {
    return 'rgba(' +
      Math.round(mix(light[0], dark[0], amount)) + ', ' +
      Math.round(mix(light[1], dark[1], amount)) + ', ' +
      Math.round(mix(light[2], dark[2], amount)) + ', ' +
      mix(light[3], dark[3], amount).toFixed(3) + ')';
  }

  function themeFor(t) {
    const darkIn = smooth((t - 7.45) / 1.1);
    const darkOut = 1 - smooth((t - 16.65) / 1.1);
    return darkIn * darkOut;
  }

  function formSwapOpacity(t, center) {
    if (t < center - 0.45 || t >= center + 0.45) return 1;
    if (t < center) return 1 - smooth((t - (center - 0.45)) / 0.45);
    return smooth((t - center) / 0.45);
  }

  function applyTheme(stage, amount) {
    themeTokens.forEach((token) => {
      stage.style.setProperty(token[0], colorBetween(token[1], token[2], amount));
    });
    const shadowY = mix(42, 46, amount).toFixed(1);
    const shadowBlur = mix(90, 100, amount).toFixed(1);
    const shadowColor = colorBetween([16, 35, 31, 0.18], [0, 0, 0, 0.34], amount);
    stage.style.setProperty('--browser-shadow', '0 ' + shadowY + 'px ' + shadowBlur + 'px ' + shadowColor);
  }

  function copyFor(t) {
    if (t < 3.2) return ['Job application', 'Another job\\napplication?', 'Fill the details you already saved.', ['3 profiles free', 'Stored in your browser']];
    if (t < 8) return ['Filled in seconds', 'One click.\\nDetails filled.', 'Your name, email, phone, and saved resume are ready to check.', ['One click', 'Upload matching']];
    if (t < 12.6) return ['You stay in control', 'Review first.\\nSubmit yourself.', 'See what changed, undo the fill, and leave passwords to your password manager.', ['Undo ready', 'No auto-submit']];
    if (t < 17.2) return ['Application step two', 'It keeps up\\nwith the form.', 'Dropdowns, checkboxes, and fields that appear after the page loads.', ['Dropdowns', 'Checkboxes', 'Late fields']];
    return ['Choose what fits', 'Start free.\\nLifetime Pro: $39.99.', 'Every Pro plan adds up to 500 profiles, duplication, and backup imports.', ['One payment', 'Monthly + yearly available']];
  }

  function formFor(t) {
    if (t >= 12.6 && t < 17.2) {
      return { title: 'Application details', url: 'careers.example.com/apply/step-2', fields: modernFields };
    }
    return { title: 'Job application', url: 'careers.example.com/apply', fields: applicationFields };
  }

  function filledCount(t) {
    if (t < 0.75) return 0;
    if (t < 1.2) return 1;
    if (t < 1.65) return 2;
    if (t < 2.1) return 3;
    if (t < 2.55) return 4;
    if (t >= 12.6 && t < 13.05) return 0;
    if (t >= 13.05 && t < 13.55) return 1;
    if (t >= 13.55 && t < 14.05) return 2;
    if (t >= 14.05 && t < 14.55) return 3;
    if (t >= 14.55 && t < 15.05) return 4;
    if (t >= 15.05 && t < 17.2) return 5;
    return 4;
  }

  function activeField(t) {
    if (t >= 0.75 && t < 2.55) return Math.min(3, Math.floor((t - 0.75) / 0.45));
    if (t >= 13.05 && t < 15.55) return Math.min(4, Math.floor((t - 13.05) / 0.5));
    return -1;
  }

  function renderFields(t) {
    const form = formFor(t);
    const filled = filledCount(t);
    const active = activeField(t);
    return form.fields.map((field, index) => {
      const label = field[0];
      const value = field[1];
      const type = field[2];
      const boundary = type === 'boundary';
      const hasValue = !boundary && index < filled;
      const classes = ['box', hasValue ? 'is-filled' : '', boundary ? 'is-boundary' : ''].filter(Boolean).join(' ');
      const rowClasses = ['field', index === active ? 'is-active' : ''].filter(Boolean).join(' ');
      const text = boundary && t >= 7.7 ? 'Use your password manager' : (hasValue ? value : '');
      const shine = index === active ? ((t * 480) % 360 - 120).toFixed(1) + '%' : '-120%';
      return '<div class="' + rowClasses + '" style="--field-shine:' + shine + '"><span>' + label + '</span><div class="' + classes + '">' + text + '</div></div>';
    }).join('');
  }

  function cursorFor(t) {
    if (t < 0.12) return [1110, 430, 0];
    if (t < 0.62) {
      const p = smooth((t - 0.12) / 0.5);
      return [mix(1110, 1082, p), mix(430, 372, p), 1];
    }
    if (t < 1.05) return [1082, 372, 1];
    if (t < 9.6) return [mix(1082, 1050, smooth((t - 1.05) / 8.55)), mix(372, 470, smooth((t - 1.05) / 8.55)), 0.76];
    if (t < 11.2) {
      const p = smooth((t - 9.6) / 1.6);
      return [mix(1050, 1080, p), mix(470, 425, p), 1];
    }
    if (t < 12.5) return [1080, 425, 0.7];
    return [1040, 460, 0];
  }

  window.renderFillProFrame = function renderFillProFrame(t) {
    const stage = document.getElementById('stage');
    applyTheme(stage, themeFor(t));

    const copy = copyFor(t);
    document.getElementById('eyebrow').textContent = copy[0];
    document.getElementById('headline').textContent = copy[1];
    document.getElementById('subline').textContent = copy[2];
    document.getElementById('proof').innerHTML = copy[3].map((item) => '<span>' + item + '</span>').join('');

    const phaseStarts = [0, 3.2, 8, 12.6, 17.2];
    const phaseStart = phaseStarts.slice().reverse().find((start) => t >= start) || 0;
    const phaseEnd = phaseStarts.find((start) => start > t) || ${DURATION};
    const phaseIntro = phaseStart === 0 ? 1 : smooth((t - phaseStart) / 0.42);
    const phaseOutro = phaseEnd < ${DURATION} ? 1 - smooth((t - (phaseEnd - 0.38)) / 0.38) : 1;
    const phaseOpacity = phaseIntro * phaseOutro;
    const copyNode = document.getElementById('copy');
    copyNode.style.setProperty('--copy-opacity', phaseOpacity.toFixed(3));
    copyNode.style.setProperty('--copy-y', ((1 - phaseIntro) * 12).toFixed(2) + 'px');
    const topNote = document.getElementById('topNote');
    topNote.style.setProperty('--top-opacity', phaseOpacity.toFixed(3));
    topNote.style.setProperty('--top-y', ((1 - phaseIntro) * 5).toFixed(2) + 'px');

    const form = formFor(t);
    document.getElementById('formTitle').textContent = form.title;
    document.getElementById('url').textContent = form.url;
    document.getElementById('fields').innerHTML = renderFields(t);
    const formOpacity = Math.min(formSwapOpacity(t, 12.6), formSwapOpacity(t, 17.2));
    document.querySelector('.page').style.opacity = (0.18 + formOpacity * 0.82).toFixed(3);

    const panelIntro = smooth((t - 0.08) / 0.35);
    const panel = document.getElementById('panel');
    panel.style.setProperty('--panel-opacity', panelIntro.toFixed(3));
    panel.style.setProperty('--panel-y', ((1 - panelIntro) * 12).toFixed(2) + 'px');
    panel.style.setProperty('--panel-scale', (0.985 + panelIntro * 0.015).toFixed(3));
    document.getElementById('profileName').textContent = 'Job search profile';
    document.getElementById('profileMeta').textContent = t >= 12.6 && t < 17.2 ? 'Choices · links · custom fields' : '12 saved fields · 2 rules · 1 file';
    document.getElementById('fillButton').textContent = t >= 12.6 && t < 17.2 ? 'Fill application details' : 'Fill Page';

    const buttonShine = t >= 0.18 && t < 0.98 ? mix(-130, 520, smooth((t - 0.18) / 0.8)) : -130;
    document.getElementById('fillButton').style.setProperty('--button-shine', buttonShine.toFixed(1) + '%');

    const firstResult = windowOpacity(t, 2.55, 12.35, 0.45);
    const modernResult = windowOpacity(t, 15.25, 17.1, 0.35);
    const resultOpacity = Math.max(firstResult, modernResult, t >= 17.2 ? 1 : 0);
    const result = document.getElementById('result');
    result.style.setProperty('--result-opacity', resultOpacity.toFixed(3));
    result.style.setProperty('--result-y', ((1 - resultOpacity) * 7).toFixed(2) + 'px');
    document.getElementById('resultCount').textContent = t >= 12.6 && t < 17.2 ? '5' : '4';
    document.getElementById('resultText').textContent = t >= 12.6 && t < 17.2 ? 'application details are ready to review' : 'fields and your resume are ready to review';

    const reviewNote = windowOpacity(t, 8.35, 12.35, 0.45);
    const modernNote = windowOpacity(t, 15.2, 17.1, 0.35);
    const finalNote = t >= 17.2 ? smooth((t - 17.2) / 0.55) : 0;
    const noteOpacity = Math.max(reviewNote, modernNote, finalNote);
    const note = document.getElementById('floatingNote');
    note.style.setProperty('--note-opacity', noteOpacity.toFixed(3));
    note.style.setProperty('--note-y', ((1 - noteOpacity) * 8).toFixed(2) + 'px');
    if (t >= 17.2) {
      document.getElementById('noteTitle').textContent = '$39.99 lifetime';
      document.getElementById('noteText').textContent = 'One payment. No renewal.';
    } else if (t >= 12.6) {
      document.getElementById('noteTitle').textContent = 'Application step complete';
      document.getElementById('noteText').textContent = 'Late fields are included when the page changes.';
    } else {
      document.getElementById('noteTitle').textContent = 'Ready to review';
      document.getElementById('noteText').textContent = 'You decide when the form is submitted.';
    }

    topNote.textContent = t >= 17.2 ? 'Lifetime Pro' : t >= 12.6 ? 'Application step two' : t >= 8 ? 'Review and undo' : 'Job application autofill';

    const browser = document.getElementById('browser');
    const finalMove = t >= 17.2 ? smooth((t - 17.2) / 0.7) : 0;
    browser.style.setProperty('--browser-x', (finalMove * 12).toFixed(2) + 'px');
    browser.style.setProperty('--browser-y', (-finalMove * 5).toFixed(2) + 'px');
    browser.style.setProperty('--browser-scale', (1 - finalMove * 0.035).toFixed(3));

    const cursorState = cursorFor(t);
    const cursor = document.getElementById('cursor');
    cursor.style.setProperty('--cursor-x', cursorState[0].toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-y', cursorState[1].toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-opacity', cursorState[2].toFixed(3));
    const click = t >= 0.56 && t <= 0.78 ? smooth((t - 0.56) / 0.22) : t > 0.78 && t < 1.02 ? 1 - smooth((t - 0.78) / 0.24) : 0;
    cursor.style.setProperty('--click-opacity', click.toFixed(3));
    cursor.style.setProperty('--click-scale', (0.42 + click * 0.7).toFixed(3));

    document.getElementById('progress').style.setProperty('--progress', ((t / ${DURATION}) * 100).toFixed(2) + '%');
  };
</script>
</body>
</html>`;

async function validateFrame(page, time) {
  const report = await page.evaluate(() => {
    const selectors = ['.brand', '.top-note', '.copy', '.browser', '.floating-note', '.footer-line'];
    const clipped = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((node) => getComputedStyle(node).opacity !== '0')
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { selector: node.className, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      })
      .filter((rect) => rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1);
    const textOverflow = Array.from(document.querySelectorAll('h1, .sub, .top-note, .profile span'))
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      .map((node) => node.className || node.tagName);
    return { clipped, textOverflow };
  });
  if (report.clipped.length || report.textOverflow.length) {
    throw new Error(`Video frame ${time.toFixed(2)}s failed layout QA: ${JSON.stringify(report)}`);
  }
}

async function renderFrames() {
  fs.mkdirSync(marketplaceDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fillpro-store-video-'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

  try {
    await page.setContent(html, { waitUntil: 'load' });
    for (let frame = 0; frame < FRAMES; frame += 1) {
      const time = frame / FPS;
      await page.evaluate((seconds) => window.renderFillProFrame(seconds), time);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      if (frame % FPS === 0 || frame === FRAMES - 1) await validateFrame(page, time);
      await page.screenshot({
        path: path.join(tmp, `frame-${String(frame).padStart(4, '0')}.png`),
        type: 'png',
      });
    }

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate', String(FPS),
        '-i', path.join(tmp, 'frame-%04d.png'),
        '-vf', 'format=yuv420p',
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '18',
        '-movflags', '+faststart',
        outputMp4,
      ],
      { stdio: 'inherit' },
    );

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-ss', String(POSTER_FRAME_SECONDS),
        '-i', outputMp4,
        '-frames:v', '1',
        '-update', '1',
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
