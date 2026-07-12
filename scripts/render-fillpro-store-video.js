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
const POSTER_FRAME_SECONDS = 5.2;
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
    position: relative;
    isolation: isolate;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    background:
      linear-gradient(90deg, rgba(15, 118, 110, 0.05) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.045) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(135deg, #fbfdfb 0%, #edf7f3 62%, #f6f1e5 100%);
  }
  .stage::before {
    content: "";
    position: absolute;
    inset: 22px;
    z-index: -1;
    border: 1px solid rgba(15, 118, 110, 0.11);
    border-radius: 8px;
    background:
      linear-gradient(128deg, transparent 0 48%, rgba(15, 118, 110, 0.09) 48% 48.7%, transparent 48.7%),
      linear-gradient(128deg, transparent 0 64%, rgba(213, 157, 55, 0.12) 64% 64.8%, transparent 64.8%);
  }
  .stage.is-dark {
    color: #f6fffc;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(180deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px) 0 0 / 72px 72px,
      linear-gradient(135deg, #081b18 0%, #0d2b26 62%, #12382f 100%);
  }
  .stage.is-dark::before { border-color: rgba(94, 234, 221, 0.14); }
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
  }
  .brand img {
    width: 52px;
    height: 52px;
    filter: drop-shadow(0 12px 18px rgba(15, 118, 110, 0.22));
  }
  .stage.is-dark .brand { color: #f6fffc; }
  .top-note {
    position: absolute;
    right: 52px;
    top: 42px;
    z-index: 8;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    padding: 7px 13px;
    border: 1px solid rgba(16, 35, 31, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.84);
    color: #43544e;
    font-size: 13px;
    font-weight: 820;
  }
  .stage.is-dark .top-note {
    border-color: rgba(94, 234, 221, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(246, 255, 252, 0.86);
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
    color: #0f766e;
    font-size: 12px;
    font-weight: 930;
    text-transform: uppercase;
  }
  .stage.is-dark .eyebrow { color: #5eeadd; }
  h1 {
    margin: 0;
    max-width: 9.5ch;
    font: 930 58px/0.96 "Aptos Display", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
    letter-spacing: 0;
    white-space: pre-line;
  }
  .sub {
    max-width: 410px;
    margin: 18px 0 0;
    color: #43544e;
    font-size: 19px;
    line-height: 1.4;
    font-weight: 620;
  }
  .stage.is-dark .sub { color: rgba(246, 255, 252, 0.76); }
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
    border: 1px solid rgba(15, 118, 110, 0.16);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.76);
    color: #38524b;
    font-size: 12px;
    font-weight: 820;
  }
  .stage.is-dark .proof span {
    border-color: rgba(94, 234, 221, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(246, 255, 252, 0.9);
  }
  .browser {
    position: absolute;
    right: 42px;
    top: 112px;
    z-index: 4;
    width: 744px;
    height: 540px;
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.14);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 42px 90px rgba(16, 35, 31, 0.18);
    transform: translate3d(var(--browser-x, 0px), var(--browser-y, 0px), 0) scale(var(--browser-scale, 1));
    transform-origin: 76% 54%;
  }
  .stage.is-dark .browser {
    border-color: rgba(94, 234, 221, 0.18);
    box-shadow: 0 46px 100px rgba(0, 0, 0, 0.34);
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
    border: 1px solid rgba(15, 118, 110, 0.2);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.94);
    color: #38524b;
    box-shadow: 0 20px 44px rgba(16, 35, 31, 0.12);
    opacity: var(--note-opacity, 0);
    transform: translateY(var(--note-y, 8px));
  }
  .floating-note strong { color: #10231f; font-size: 14px; }
  .floating-note span { font-size: 12px; line-height: 1.35; }
  .stage.is-dark .floating-note { border-color: rgba(94, 234, 221, 0.22); background: rgba(13, 35, 30, 0.96); color: rgba(246, 255, 252, 0.72); }
  .stage.is-dark .floating-note strong { color: #f6fffc; }
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
    color: #64766f;
    font-size: 11px;
    font-weight: 760;
  }
  .stage.is-dark .footer-line { color: rgba(246, 255, 252, 0.58); }
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
  <div class="brand"><img src="${logoDataUrl}" alt=""><span>FillPro</span></div>
  <div class="top-note" id="topNote">Private autofill</div>
  <section class="copy" id="copy">
    <p class="eyebrow" id="eyebrow">Ready when you are</p>
    <h1 id="headline">A blank form.\nOne profile.</h1>
    <p class="sub" id="subline">Choose Fill Page and watch the details you reuse fall into place.</p>
    <div class="proof" id="proof"><span>3 profiles free</span><span>No account</span></div>
  </section>
  <section class="browser" id="browser" aria-hidden="true">
    <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url" id="url">careers.example.com/apply</span></div>
    <div class="page">
      <h2 class="form-title" id="formTitle">Job application</h2>
      <div id="fields"></div>
      <div class="result" id="result"><strong id="resultCount">4</strong><span id="resultText">fields and the resume are ready to review</span></div>
      <aside class="extension-panel" id="panel">
        <div class="panel-head"><img src="${logoDataUrl}" alt=""><span>FillPro</span></div>
        <div class="profile"><strong id="profileName">Work profile</strong><span id="profileMeta">9 saved fields · 2 rules · 1 file</span></div>
        <div class="fill-button" id="fillButton">Fill Page</div>
        <div class="undo-button" id="undoButton">Undo last fill</div>
      </aside>
    </div>
  </section>
  <aside class="floating-note" id="floatingNote"><strong id="noteTitle">Ready to review</strong><span id="noteText">You decide when the form is submitted.</span></aside>
  <div class="cursor" id="cursor"></div>
  <div class="footer-line"><span>Chrome · Edge · Firefox</span><span>stealthyapps.com/fillpro</span></div>
  <div class="progress"><span id="progress"></span></div>
</main>
<script>
  const applicationFields = [
    ['Full name', 'Alex Morgan', 'text'],
    ['Work email', 'alex@example.com', 'text'],
    ['Company', 'Stealthy Apps', 'text'],
    ['Resume upload', 'alex-morgan-resume.pdf', 'file'],
    ['Account password', '', 'boundary'],
  ];
  const modernFields = [
    ['Team', 'Product operations', 'select'],
    ['Preferred contact', 'Email', 'select'],
    ['Remote-friendly', 'Checked', 'check'],
    ['Start window', 'Available in two weeks', 'text'],
    ['Late field', 'Filled after it appeared', 'late'],
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

  function copyFor(t) {
    if (t < 2.2) return ['Ready when you are', 'A blank form.\\nOne profile.', 'Choose Fill Page and watch the details you reuse fall into place.', ['3 profiles free', 'No account']];
    if (t < 7.7) return ['Filling now', 'Watch the repeat work disappear.', 'Name, email, company, and resume fill one by one.', ['One click', 'Upload matching']];
    if (t < 12) return ['Ready to review', 'Check it. Undo it. Submit when ready.', 'FillPro changes the page. The final decision stays with you.', ['Undo ready', 'No auto-submit']];
    if (t < 17) return ['Modern forms', 'Dropdowns and late fields included.', 'Fill the controls basic autofill usually leaves behind.', ['Dropdowns', 'Checkboxes', 'Late fields']];
    return ['Start free', 'Three profiles are included.', 'No cloud profile account. Upgrade only when you need more profiles or backups.', ['3 profiles free', 'No account', 'Review first']];
  }

  function formFor(t) {
    if (t >= 12 && t < 17) {
      return { title: 'Team intake', url: 'forms.example.com/team-intake', fields: modernFields };
    }
    return { title: 'Job application', url: 'careers.example.com/apply', fields: applicationFields };
  }

  function filledCount(t) {
    if (t < 2.05) return 0;
    if (t < 2.8) return 1;
    if (t < 3.55) return 2;
    if (t < 4.3) return 3;
    if (t < 5.05) return 4;
    if (t >= 12 && t < 12.8) return 0;
    if (t >= 12.8 && t < 13.35) return 1;
    if (t >= 13.35 && t < 13.9) return 2;
    if (t >= 13.9 && t < 14.45) return 3;
    if (t >= 14.45 && t < 15) return 4;
    if (t >= 15 && t < 17) return 5;
    return 4;
  }

  function activeField(t) {
    if (t >= 2.05 && t < 5.05) return Math.min(3, Math.floor((t - 2.05) / 0.75));
    if (t >= 12.8 && t < 15.55) return Math.min(4, Math.floor((t - 12.8) / 0.55));
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
    if (t < 0.8) return [1090, 430, 0];
    if (t < 1.55) {
      const p = smooth((t - 0.8) / 0.75);
      return [mix(1090, 1082, p), mix(430, 372, p), 1];
    }
    if (t < 2.25) return [1082, 372, 1];
    if (t < 9.8) return [mix(1082, 1050, smooth((t - 2.25) / 7.55)), mix(372, 470, smooth((t - 2.25) / 7.55)), 0.76];
    if (t < 11.4) {
      const p = smooth((t - 9.8) / 1.6);
      return [mix(1050, 1080, p), mix(470, 425, p), 1];
    }
    if (t < 12.2) return [1080, 425, 0.7];
    return [1040, 460, 0];
  }

  window.renderFillProFrame = function renderFillProFrame(t) {
    const stage = document.getElementById('stage');
    stage.classList.toggle('is-dark', t >= 7.7 && t < 17);

    const copy = copyFor(t);
    document.getElementById('eyebrow').textContent = copy[0];
    document.getElementById('headline').textContent = copy[1];
    document.getElementById('subline').textContent = copy[2];
    document.getElementById('proof').innerHTML = copy[3].map((item) => '<span>' + item + '</span>').join('');

    const phaseStarts = [0, 2.2, 7.7, 12, 17];
    const phaseStart = phaseStarts.slice().reverse().find((start) => t >= start) || 0;
    const phaseIntro = phaseStart === 0 ? 1 : smooth((t - phaseStart) / 0.42);
    const copyNode = document.getElementById('copy');
    copyNode.style.setProperty('--copy-opacity', phaseIntro.toFixed(3));
    copyNode.style.setProperty('--copy-y', ((1 - phaseIntro) * 12).toFixed(2) + 'px');

    const form = formFor(t);
    document.getElementById('formTitle').textContent = form.title;
    document.getElementById('url').textContent = form.url;
    document.getElementById('fields').innerHTML = renderFields(t);

    const panelIntro = smooth((t - 0.85) / 0.6);
    const panel = document.getElementById('panel');
    panel.style.setProperty('--panel-opacity', panelIntro.toFixed(3));
    panel.style.setProperty('--panel-y', ((1 - panelIntro) * 12).toFixed(2) + 'px');
    panel.style.setProperty('--panel-scale', (0.985 + panelIntro * 0.015).toFixed(3));
    document.getElementById('profileName').textContent = t >= 12 && t < 17 ? 'Team profile' : 'Work profile';
    document.getElementById('profileMeta').textContent = t >= 12 && t < 17 ? 'Choices · preferences · custom fields' : '9 saved fields · 2 rules · 1 file';
    document.getElementById('fillButton').textContent = t >= 12 && t < 17 ? 'Fill team form' : 'Fill Page';

    const buttonShine = t >= 1.2 && t < 2.15 ? mix(-130, 520, smooth((t - 1.2) / 0.95)) : -130;
    document.getElementById('fillButton').style.setProperty('--button-shine', buttonShine.toFixed(1) + '%');

    const firstResult = windowOpacity(t, 5.05, 11.8, 0.5);
    const modernResult = windowOpacity(t, 15.25, 16.95, 0.35);
    const resultOpacity = Math.max(firstResult, modernResult, t >= 17 ? 1 : 0);
    const result = document.getElementById('result');
    result.style.setProperty('--result-opacity', resultOpacity.toFixed(3));
    result.style.setProperty('--result-y', ((1 - resultOpacity) * 7).toFixed(2) + 'px');
    document.getElementById('resultCount').textContent = t >= 12 && t < 17 ? '5' : '4';
    document.getElementById('resultText').textContent = t >= 12 && t < 17 ? 'modern form controls are ready to review' : 'fields and the resume are ready to review';

    const reviewNote = windowOpacity(t, 8.05, 11.75, 0.45);
    const modernNote = windowOpacity(t, 15.2, 16.9, 0.35);
    const finalNote = t >= 17 ? smooth((t - 17) / 0.55) : 0;
    const noteOpacity = Math.max(reviewNote, modernNote, finalNote);
    const note = document.getElementById('floatingNote');
    note.style.setProperty('--note-opacity', noteOpacity.toFixed(3));
    note.style.setProperty('--note-y', ((1 - noteOpacity) * 8).toFixed(2) + 'px');
    if (t >= 17) {
      document.getElementById('noteTitle').textContent = 'Three profiles free';
      document.getElementById('noteText').textContent = 'Upgrade only when your workflow needs more.';
    } else if (t >= 12) {
      document.getElementById('noteTitle').textContent = 'Late field caught';
      document.getElementById('noteText').textContent = 'FillPro checks again when the page changes.';
    } else {
      document.getElementById('noteTitle').textContent = 'Ready to review';
      document.getElementById('noteText').textContent = 'You decide when the form is submitted.';
    }

    document.getElementById('topNote').textContent = t >= 17 ? '3 profiles free' : t >= 12 ? 'Modern form support' : t >= 7.7 ? 'Review and undo' : 'Private autofill';

    const browser = document.getElementById('browser');
    const finalMove = t >= 17 ? smooth((t - 17) / 0.7) : 0;
    browser.style.setProperty('--browser-x', (finalMove * 12).toFixed(2) + 'px');
    browser.style.setProperty('--browser-y', (-finalMove * 5).toFixed(2) + 'px');
    browser.style.setProperty('--browser-scale', (1 - finalMove * 0.035).toFixed(3));

    const cursorState = cursorFor(t);
    const cursor = document.getElementById('cursor');
    cursor.style.setProperty('--cursor-x', cursorState[0].toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-y', cursorState[1].toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-opacity', cursorState[2].toFixed(3));
    const click = t >= 1.48 && t <= 1.9 ? smooth((t - 1.48) / 0.42) : t > 1.9 && t < 2.15 ? 1 - smooth((t - 1.9) / 0.25) : 0;
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
