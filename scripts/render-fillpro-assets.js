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
      linear-gradient(135deg, #fbfdfb, #edf7f3 58%, #f6f2e8);
  }
  .stage {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100%;
    padding: 54px 64px;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 26px;
  }
  .stage::before {
    content: "";
    position: absolute;
    inset: 34px 42px;
    z-index: -1;
    pointer-events: none;
    border: 1px solid rgba(15, 118, 110, 0.1);
    border-radius: 8px;
    background:
      linear-gradient(132deg, transparent 0 42%, rgba(15, 118, 110, 0.08) 42% 42.6%, transparent 42.6%),
      linear-gradient(132deg, transparent 0 58%, rgba(242, 193, 78, 0.12) 58% 58.7%, transparent 58.7%);
    opacity: 0.9;
  }
  .shot-outcome::before {
    background:
      linear-gradient(132deg, transparent 0 41%, rgba(15, 118, 110, 0.08) 41% 41.6%, transparent 41.6%),
      linear-gradient(132deg, transparent 0 58%, rgba(242, 193, 78, 0.12) 58% 58.7%, transparent 58.7%);
  }
  .shot-modern {
    background:
      linear-gradient(90deg, rgba(15, 118, 110, 0.05) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(180deg, rgba(15, 118, 110, 0.045) 1px, transparent 1px) 0 0 / 70px 70px,
      linear-gradient(135deg, #fbfffd, #edf9f5 48%, #f7fbf8);
  }
  .shot-modern::before {
    inset: 44px 58px;
    border-color: rgba(15, 118, 110, 0.11);
    background:
      linear-gradient(90deg, transparent 0 70%, rgba(15, 118, 110, 0.07) 70% 70.5%, transparent 70.5%),
      linear-gradient(0deg, transparent 0 64%, rgba(94, 234, 221, 0.1) 64% 64.5%, transparent 64.5%);
    opacity: 0.85;
  }
  .shot-profiles::before {
    inset: 38px 44px;
    background:
      linear-gradient(132deg, transparent 0 47%, rgba(94, 234, 221, 0.1) 47% 47.6%, transparent 47.6%),
      linear-gradient(132deg, transparent 0 70%, rgba(242, 193, 78, 0.1) 70% 70.6%, transparent 70.6%);
  }
  .shot-privacy::before {
    background:
      linear-gradient(90deg, transparent 0 50%, rgba(94, 234, 221, 0.08) 50% 50.5%, transparent 50.5%),
      linear-gradient(0deg, transparent 0 72%, rgba(242, 193, 78, 0.12) 72% 72.7%, transparent 72.7%);
  }
  .shot-undo::before {
    background:
      linear-gradient(132deg, transparent 0 64%, rgba(94, 234, 221, 0.08) 64% 64.7%, transparent 64.7%),
      linear-gradient(90deg, transparent 0 28%, rgba(242, 193, 78, 0.1) 28% 28.7%, transparent 28.7%);
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
  .first-shot {
    padding: 34px 64px 34px;
    gap: 18px;
  }
  .first-shot h1 {
    max-width: 820px;
    font-size: 52px;
  }
  .first-shot .sub {
    max-width: 620px;
    font-size: 21px;
  }
  .first-shot .page {
    min-height: 410px;
    padding: 24px;
  }
  .first-shot .form {
    gap: 11px;
    padding: 20px;
  }
  .first-shot .box {
    height: 42px;
  }
  .first-shot .popup {
    top: 104px;
    right: 48px;
  }
  .shot-undo {
    padding: 34px 64px;
    gap: 18px;
  }
  .shot-undo h1 {
    font-size: 50px;
  }
  .shot-undo .sub {
    font-size: 20px;
  }
  .browser {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(16, 35, 31, 0.12);
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 30px 80px rgba(16, 35, 31, 0.16);
  }
  .stage > .browser {
    min-height: 0;
    height: 100%;
  }
  .stage > .browser .page {
    min-height: 0;
    height: calc(100% - 48px);
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
    color: #10231f;
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
  .profile strong { color: #10231f; font-size: 15px; }
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
  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }
  .field-tile {
    min-height: 74px;
    display: grid;
    align-content: center;
    gap: 5px;
    padding: 13px 14px;
    border: 1px solid #d8e3de;
    border-radius: 8px;
    background:
      linear-gradient(135deg, rgba(94, 234, 221, 0.08), transparent 56%),
      #ffffff;
  }
  .field-tile strong {
    color: #10231f;
    font-size: 15px;
    line-height: 1.1;
  }
  .field-tile span {
    color: #60726b;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.25;
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
    border-radius: 8px;
    background:
      linear-gradient(135deg, rgba(94, 234, 221, 0.1), transparent 48%),
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
    border-radius: 8px;
    background:
      linear-gradient(135deg, rgba(94, 234, 221, 0.09), transparent 52%),
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
    border-radius: 8px;
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
      linear-gradient(135deg, rgba(20, 184, 166, 0.08), transparent 52%),
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
  .marquee { grid-template-columns: 0.86fr 1.14fr; grid-template-rows: 1fr; align-items: center; }
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
    grid-template-rows: 1fr;
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
    border-radius: 8px;
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
    border-radius: 8px;
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
    border-radius: 8px;
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
        <div class="promo-proof"><span>3 profiles free</span><span>No account</span><span>Review before submit</span></div>
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
  const clipped = await page.evaluate(() => {
    const selector = [
      '.browser',
      '.button',
      '.panel',
      '.profile',
      '.privacy-card',
      '.privacy-ledger',
      '.review-form',
      '.review-stack',
      '.review-card',
      '.promo-product',
      '.promo-row',
      '.promo-cta',
    ].join(',');
    return Array.from(document.querySelectorAll(selector))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          name: node.className,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        };
      })
      .filter((rect) =>
        rect.left < -1 ||
        rect.top < -1 ||
        rect.right > window.innerWidth + 1 ||
        rect.bottom > window.innerHeight + 1
      );
  });
  if (clipped.length) {
    throw new Error(`Marketing render contains clipped UI in ${path.basename(output)}: ${JSON.stringify(clipped.slice(0, 5))}`);
  }
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
    `<main class="stage first-shot shot-outcome">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">No account needed</span></div>
      <div><h1>Fill the fields you keep retyping.</h1><p class="sub">Choose a saved profile, fill the page, then review before you submit.</p></div>
      ${chromeFrame('apply.example.com/onboarding', beforeAfter())}
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-profiles-1280x800.png'),
    1280,
    800,
    `<main class="stage dark shot-profiles">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Up to 500 with Pro</span></div>
      <div><h1>Keep each workflow in its own profile.</h1><p class="sub">Switch between work, applicant, client, and QA details without mixing them together.</p></div>
      ${chromeFrame('forms.example.com/demo-request', `
        <div class="grid2">
          <div class="panel">
            <h2>Saved profiles</h2>
            <div class="profile"><strong>Work profile</strong><span>Contact, company, links, resume</span></div>
            <div class="profile"><strong>Vendor profile</strong><span>Business details and service copy</span></div>
            <div class="profile"><strong>QA profile</strong><span>Known test values for repeat checks</span></div>
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
    `<main class="stage shot-modern">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Modern form support</span></div>
      <div><h1>Fill the controls basic autofill skips.</h1><p class="sub">Dropdowns, checkboxes, uploads, and fields that appear after the page loads.</p></div>
      ${chromeFrame('forms.example.com/team-intake', `
        <div class="grid2">
          <div class="form">
            <h2>Team intake form</h2>
            ${field('Full name', 'Alex Morgan')}
            ${field('Preferred contact', 'Email')}
            ${field('Resume upload', 'alex-morgan.pdf')}
          </div>
          <div class="panel">
            <h2>Built for the hard parts</h2>
            <div class="field-grid">
              <div class="field-tile"><strong>Dropdowns</strong><span>Match choices from the active profile.</span></div>
              <div class="field-tile"><strong>Checkboxes</strong><span>Handle clear yes, no, and preference fields.</span></div>
              <div class="field-tile"><strong>Upload fields</strong><span>Match resumes, PDFs, CSVs, and spreadsheets.</span></div>
              <div class="field-tile"><strong>Late fields</strong><span>Catch fields that appear after the first pass.</span></div>
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
    `<main class="stage dark shot-privacy">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">No account required</span></div>
      <div><h1>Your profile stays with the extension.</h1><p class="sub">Fill the page you choose without creating a cloud profile account.</p></div>
      <div class="privacy-proof">
        <div class="privacy-grid">
          <div class="privacy-card"><strong>Profile storage</strong><span>Saved by the extension in your browser.</span></div>
          <div class="privacy-card"><strong>Page access</strong><span>Runs on the page you choose.</span></div>
          <div class="privacy-card"><strong>Final say</strong><span>You review and submit.</span></div>
        </div>
        <div class="privacy-ledger">
          <h2>Clear control at every step</h2>
          <div class="privacy-row"><span>Fill action</span><strong>Your click</strong></div>
          <div class="privacy-row"><span>Saved values</span><strong>Your profiles</strong></div>
          <div class="privacy-row"><span>Form submission</span><strong>Your decision</strong></div>
          <div class="privacy-row"><span>Support report</span><strong>Your choice</strong></div>
        </div>
      </div>
    </main>`,
  );

  await renderHtml(
    browser,
    path.join(marketplaceDir, 'fillpro-screenshot-undo-1280x800.png'),
    1280,
    800,
    `<main class="stage dark shot-undo">
      <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">Undo ready</span></div>
      <div><h1>Review the fill. Undo it if needed.</h1><p class="sub">Roll the last FillPro changes back without reloading the page.</p></div>
      ${chromeFrame('careers.example.com/apply', `
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

const localizedFirstScreenshotCopy = {
  de: ['Kein Konto nötig', 'Füllen Sie wiederkehrende Felder aus.', 'Profil auswählen, Seite ausfüllen und das Ergebnis vor dem Absenden prüfen.', 'Ein eigenes Profil für jeden Ablauf.', 'Auch für Felder, die einfaches Autofill übersieht.', 'Ihre Profile bleiben in der Erweiterung.', 'Ausfüllung prüfen und bei Bedarf rückgängig machen.'],
  es: ['Sin cuenta', 'Completa los campos que siempre repites.', 'Elige un perfil, completa la página y revisa el resultado antes de enviarlo.', 'Un perfil para cada tipo de formulario.', 'Completa los controles que el autocompletado básico omite.', 'Tus perfiles permanecen en la extensión.', 'Revisa el llenado y deshazlo si hace falta.'],
  fr: ['Aucun compte requis', 'Remplissez les champs que vous retapez sans cesse.', 'Choisissez un profil, remplissez la page, puis vérifiez avant de l’envoyer.', 'Un profil pour chaque type de formulaire.', 'Remplissez ce que la saisie automatique ignore.', 'Vos profils restent dans l’extension.', 'Vérifiez le remplissage et annulez si nécessaire.'],
  pt_BR: ['Sem precisar de conta', 'Preencha os campos que você sempre repete.', 'Escolha um perfil, preencha a página e revise antes de enviar.', 'Um perfil para cada tipo de formulário.', 'Preencha os controles que o preenchimento básico ignora.', 'Seus perfis ficam na extensão.', 'Revise o preenchimento e desfaça se precisar.'],
  ja: ['アカウント不要', '繰り返し入力する項目をまとめて入力。', 'プロフィールを選び、ページを入力して、送信前に確認できます。', '用途ごとにプロフィールを分けて保存。', '基本の自動入力が見逃す項目にも対応。', 'プロフィールは拡張機能内に保存。', '入力結果を確認し、必要なら元に戻せます。'],
  ko: ['계정 필요 없음', '반복해서 입력하는 필드를 한 번에 채우세요.', '프로필을 선택하고 페이지를 채운 다음 제출 전에 확인하세요.', '작업마다 프로필을 따로 저장하세요.', '기본 자동완성이 놓치는 항목도 채웁니다.', '프로필은 확장 프로그램 안에 보관됩니다.', '채운 내용을 확인하고 필요하면 실행 취소하세요.'],
  ru: ['Аккаунт не нужен', 'Заполняйте поля, которые постоянно приходится вводить заново.', 'Выберите профиль, заполните страницу и проверьте результат перед отправкой.', 'Отдельный профиль для каждого сценария.', 'Заполняет элементы, которые пропускает обычное автозаполнение.', 'Ваши профили остаются в расширении.', 'Проверьте заполнение и при необходимости отмените его.'],
  zh_CN: ['无需账户', '一次填写反复输入的字段。', '选择已保存的资料，填写页面，并在提交前检查结果。', '为每种流程单独保存资料。', '填写基础自动填充会漏掉的控件。', '您的资料保存在扩展程序中。', '检查填写结果，需要时可撤销。'],
};

async function renderLocalizedFirstScreenshots(browser) {
  for (const [locale, copy] of Object.entries(localizedFirstScreenshotCopy)) {
    const localeDir = path.join(marketplaceDir, 'localized', locale);
    fs.mkdirSync(localeDir, { recursive: true });
    await renderHtml(
      browser,
      path.join(localeDir, 'fillpro-screenshot-fill-page-1280x800.png'),
      1280,
      800,
      `<main class="stage first-shot shot-outcome">
        <div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">${copy[0]}</span></div>
        <div><h1>${copy[1]}</h1><p class="sub">${copy[2]}</p></div>
        ${chromeFrame('apply.example.com/onboarding', beforeAfter())}
      </main>`,
    );

    const localizedScenes = [
      ['profiles', copy[3], `<div class="grid2"><div class="panel"><h2>Saved profiles</h2><div class="profile"><strong>Work profile</strong><span>Contact, company, links, resume</span></div><div class="profile"><strong>Applicant profile</strong><span>Job details and portfolio</span></div></div><div class="panel"><h2>Smart rules</h2><div class="cardline"><span>Work email</span><strong>@email</strong></div><div class="cardline"><span>Resume field</span><strong>resume.pdf</strong></div></div></div>`],
      ['modern-forms', copy[4], `<div class="grid2"><div class="form"><h2>Team intake form</h2>${field('Full name', 'Alex Morgan')}${field('Preferred contact', 'Email')}${field('Resume upload', 'alex-morgan.pdf')}</div><div class="panel"><h2>Modern controls</h2><div class="field-grid"><div class="field-tile"><strong>Dropdowns</strong><span>Matched from the profile.</span></div><div class="field-tile"><strong>Checkboxes</strong><span>Clear choices filled.</span></div><div class="field-tile"><strong>Late fields</strong><span>Checked after page changes.</span></div></div></div></div>`],
      ['privacy', copy[5], `<div class="privacy-proof"><div class="privacy-grid"><div class="privacy-card"><strong>Profile storage</strong><span>Saved by the extension.</span></div><div class="privacy-card"><strong>Page access</strong><span>Runs on the page you choose.</span></div><div class="privacy-card"><strong>Final say</strong><span>You review and submit.</span></div></div><div class="privacy-ledger"><h2>Clear control</h2><div class="privacy-row"><span>Fill action</span><strong>Your click</strong></div><div class="privacy-row"><span>Form submission</span><strong>Your decision</strong></div></div></div>`],
      ['undo', copy[6], `<div class="review-proof review-proof-light"><div class="review-form"><h2>Review before submit</h2><div class="review-row"><span>First name</span><strong>Alex</strong></div><div class="review-row"><span>Portfolio</span><strong>stealthyapps.com</strong></div><div class="review-row"><span>Resume</span><strong>alex-morgan.pdf</strong></div></div><div class="review-stack"><div class="review-card accent"><strong>8 fields changed</strong><span>Ready for review.</span></div><div class="review-card"><strong>Undo snapshot saved</strong><span>Roll back without reloading.</span></div><div class="button" style="width:100%;">Undo last fill</div></div></div>`],
    ];
    for (const [slug, title, scene] of localizedScenes) {
      const proof = slug === 'privacy' ? scene : chromeFrame('forms.example.com/fill', scene);
      await renderHtml(
        browser,
        path.join(localeDir, `fillpro-screenshot-${slug}-1280x800.png`),
        1280,
        800,
        `<main class="stage ${slug === 'profiles' || slug === 'privacy' || slug === 'undo' ? 'dark' : ''}"><div class="topline"><div class="brand"><img src="${logoDataUrl}" alt="">FillPro</div><span class="pill">FillPro</span></div><div><h1>${title}</h1></div>${proof}</main>`,
      );
    }
  }
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
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        '3',
        '-i',
        path.join(tmp, 'frame-%02d.png'),
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        path.join(assetsDir, 'fillpro-demo.mp4'),
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
    if (size <= 48) {
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
        <stop offset="0" stop-color="#38ead6"/>
        <stop offset="0.5" stop-color="#0f8d80"/>
        <stop offset="1" stop-color="#06443f"/>
      </linearGradient>
    </defs>
    <path d="M3 1H13V2H14V3H15V13H14V14H13V15H3V14H2V13H1V3H2V2H3V1Z" fill="url(#bg)"/>
    <path d="M4 4H13V7H7V9H12V12H7V13H4V4Z" fill="#fbfffd"/>
  </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="geometricPrecision">
    <defs>
      <linearGradient id="bg" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#2fe4d0"/>
        <stop offset="0.54" stop-color="#0f8d80"/>
        <stop offset="1" stop-color="#084b45"/>
      </linearGradient>
    </defs>
    <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="url(#bg)"/>
    <rect x="3.55" y="3.55" width="24.9" height="24.9" rx="7" fill="none" stroke="#ffffff" stroke-width="1.15" opacity="0.18"/>
    <path d="M5.6 5.2h12.2C10.4 7 6.7 11.2 6 18.3C5.2 14 5.1 9.2 5.6 5.2Z" fill="#ffffff" opacity="0.15"/>
    <rect x="8.5" y="7" width="6" height="18" rx="2" fill="#fbfffd"/>
    <rect x="8.5" y="7" width="16.2" height="6" rx="2" fill="#fbfffd"/>
    <rect x="8.5" y="14.6" width="13.1" height="5.2" rx="1.8" fill="#fbfffd"/>
  </svg>`;
}

(async () => {
  await renderIcons();
  const browser = await chromium.launch({ headless: true });
  try {
    await renderStaticAssets(browser);
    await renderLocalizedFirstScreenshots(browser);
    await renderDemoGif(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
