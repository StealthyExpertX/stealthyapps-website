const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const market = path.join(assets, 'marketplace');
const capture = path.join(market, 'captures');
const digest = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const img = (file, cls = '') => `<img class="${cls}" src="data:image/png;base64,${fs.readFileSync(path.join(capture, file)).toString('base64')}" alt="">`;
const copy = { en: { headline: 'Fill the details you keep retyping.', intro: 'Choose a saved profile. Fill the page. Check the result.', privacyHeadline: 'Your saved profiles stay in your browser.', undoHeadline: 'Check the result. Undo if needed.', ui: { savedProfiles: 'Saved profiles', resume: 'Your saved resume', newProfile: 'Profile editor', profileContents: 'Contact details and files in one profile', reviewBeforeSubmit: 'Review before you submit', undoAvailable: 'Undo available', readyForReview: 'Ready to review', filledPage: 'Filled form', savedByExtension: 'Saved in your browser by Skip Retyping', fullName: 'Full name' } }, ...require('./fillpro-localized-marketplace-copy.json') };
const notes = {
  en: ['Actual extension UI. Local test form. Some advanced UI remains in English.', 'Filling makes values and files available to the website, even before submission.'],
  de: ['Echte Erweiterungsoberfläche. Lokales Testformular. Einige erweiterte Ansichten sind auf Englisch.', 'Ausgefüllte Werte und Dateien sind für die Website schon vor dem Absenden zugänglich.'],
  es: ['Interfaz real. Formulario de prueba local. Algunas vistas avanzadas siguen en inglés.', 'Al rellenar, el sitio puede acceder a los datos y archivos antes de enviarlos.'],
  fr: ['Interface réelle. Formulaire de test local. Certains écrans avancés restent en anglais.', 'Le site peut lire les valeurs et fichiers remplis avant même l’envoi.'],
  pt_BR: ['Interface real. Formulário de teste local. Algumas telas avançadas continuam em inglês.', 'Ao preencher, o site pode acessar os dados e arquivos antes do envio.'],
  ja: ['実際の拡張機能の画面とローカルのテストフォームです。一部の詳細画面は英語です。', '入力した値やファイルは、送信前でも入力先のサイトから読み取れます。'],
  ko: ['실제 확장 프로그램 화면과 로컬 테스트 양식입니다. 일부 고급 화면은 영어로 표시됩니다.', '입력된 값과 파일은 제출 전에도 해당 웹사이트에서 읽을 수 있습니다.'],
  ru: ['Реальный интерфейс и локальная тестовая форма. Часть расширенных настроек остаётся на английском.', 'Сайт может прочитать заполненные данные и файлы ещё до отправки формы.'],
  zh_CN: ['实际扩展程序界面与本地测试表单。部分高级界面仍为英文。', '填写后，网站可以在提交前读取填入的数据和文件。'],
};

function document(locale, story) {
  const c = copy[locale];
  const localeNotes = locale === 'en' ? notes.en : [c.actualUiNote, c.destinationPrivacyNote];
  assert(localeNotes.every((note) => typeof note === 'string' && note.trim()), `${locale}: missing disclosure`);
  const ui = c.ui;
  const titles = { 'fill-page': c.headline, profiles: ui.savedProfiles, 'modern-forms': ui.resume, privacy: c.privacyHeadline, undo: c.undoHeadline };
  const subtitle = story === 'privacy' ? localeNotes[1] : story === 'profiles' ? ui.profileContents : story === 'modern-forms' ? ui.matchedFromProfile || 'Matched from your saved profile' : c.intro;
  const form = img(`${locale}-filled-form.png`, 'form');
  const popup = img(`${locale}-filled-popup.png`, 'popup');
  let content = form + popup;
  if (story === 'profiles') content = `<div class="statement"><h2>${escape(ui.applicantProfile || 'Job search profile')}</h2><p>${escape(ui.profileContents)}</p>${popup}</div>${img(`${locale}-editor.png`, 'editor')}`;
  if (story === 'modern-forms') content = `<div class="file-proof"><h2>${escape(ui.resume)}</h2>${img(`${locale}-files.png`, 'file')}</div>${form}`;
  if (story === 'privacy') content = `<div class="statement"><h2>${escape(ui.savedByExtension)}</h2><p>${escape(localeNotes[1])}</p><strong><bdi>3</bdi> ${escape(ui.savedProfiles.toLowerCase())} · <bdi>$0</bdi></strong></div>${popup}`;
  if (story === 'undo') content = `${popup}<div class="statement"><h2>${escape(ui.reviewBeforeSubmit)}</h2><p>${escape(ui.undoAvailable)}</p>${form}</div>`;
  return `<!doctype html><html lang="${locale.replace('_', '-')}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1280px;height:800px;font-family:system-ui;letter-spacing:0;background:#f4f7f5;color:#152d26}
header{height:180px;padding:28px 42px 12px;display:grid;gap:10px;align-content:start}header b{font-size:19px;color:#0a7b68}h1{font-size:38px;line-height:1.14;margin:0;max-width:1160px}header p{font-size:18px;line-height:1.4;margin:0}
main{height:556px;display:flex;justify-content:space-between;align-items:flex-start;gap:28px;padding:0 42px}img{display:block;object-fit:contain;object-position:top;max-width:100%}.form{width:790px;height:auto}.popup{width:360px;height:auto}.editor{width:380px;height:556px}.file{width:460px;height:auto}
.statement{flex:1;min-width:0;display:grid;gap:18px;align-content:start}h2{font-size:28px;line-height:1.25;margin:0}p{font-size:22px;line-height:1.45;margin:0}.statement .form{width:100%;max-height:450px}.statement .popup{width:300px;max-height:395px;object-position:left top}
.file-proof{width:440px;flex-shrink:0;padding-top:45px;display:grid;gap:26px}.file-proof+.form{width:730px;margin-top:25px}.privacy{background:#142b25;color:#f4fbf8}.privacy header b{color:#7ae2c7}.privacy main{align-items:center;gap:70px}.privacy .statement{max-width:620px}.profiles{background:#ecf2f5}.undo{background:#edf5f1}.undo main{gap:70px}.undo .popup{width:390px}
.modern-forms{background:#24282e;color:#f4f7f5}.modern-forms header b{color:#7ae2c7}
footer{padding:15px 42px;height:64px;font-size:14px;line-height:1.4}
</style><body class="${story}"><header><b dir="ltr">Skip Retyping</b><h1>${escape(titles[story])}</h1><p>${escape(subtitle)}</p></header><main>${content}</main><footer>${escape(localeNotes[0])}</footer></body></html>`;
}

async function main() {
  const receiptPath = path.join(capture, 'provenance.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath));
  for (const [file, hash] of Object.entries(receipt.artifacts)) assert.equal(digest(path.join(capture, file)), hash, `Altered real capture: ${file}`);
  const browser = await chromium.launch({ headless: true });
  const results = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    for (const locale of Object.keys(copy)) {
      const out = locale === 'en' ? market : path.join(market, 'localized', locale);
      fs.mkdirSync(out, { recursive: true });
      for (const story of ['fill-page', 'profiles', 'modern-forms', 'privacy', 'undo']) {
        await page.setContent(document(locale, story));
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
        const violations = await page.evaluate(() => [...document.querySelectorAll('h1,h2,p,b,strong,footer,img')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < -1 || r.right > 1281 || r.top < -1 || r.bottom > 801 || el.scrollWidth > el.clientWidth + 1;
        }).map((el) => el.textContent || el.tagName));
        assert.deepEqual(violations, [], `${locale}/${story}: marketing bounds`);
        const file = path.join(out, `skip-retyping-screenshot-${story}-1280x800.png`);
        await page.screenshot({ path: file });
        results[path.relative(assets, file).replaceAll(path.sep, '/')] = digest(file);
      }
    }
    for (const [file, width, height] of [['skip-retyping-small-promo-440x280.png', 440, 280], ['skip-retyping-marquee-1400x560.png', 1400, 560], ['../skip-retyping-og.png', 1200, 630], ['../skip-retyping-popup.png', 760, 540]]) {
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><style>*{box-sizing:border-box}body{margin:0;width:${width}px;height:${height}px;font-family:system-ui;background:#075b4d;color:white;display:flex;gap:24px;align-items:center;padding:${width < 500 ? 20 : 42}px;overflow:hidden}.copy{flex:1;min-width:0}h1{font-size:${width < 500 ? 26 : 54}px;line-height:1.08;margin:0 0 20px}p{font-size:${width < 500 ? 16 : 25}px;line-height:1.35;margin:0}img{width:${Math.round(width * 0.38)}px;max-height:92%;object-fit:contain}small{display:block;font-size:${width < 500 ? 11 : 16}px;margin-top:18px}</style><div class="copy"><h1>Skip Retyping</h1><p>Saved profiles.<br>Less to type.</p><small>3 profiles free</small></div>${img('en-filled-popup.png')}`);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((image) => image.decode())); });
      const target = path.resolve(market, file);
      await page.screenshot({ path: target });
      results[path.relative(assets, target).replaceAll(path.sep, '/')] = digest(target);
    }
    fs.writeFileSync(path.join(market, 'stills-provenance.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), source: 'Real working-source captures; not final-package certification', captureReceiptHash: digest(receiptPath), rendererHash: digest(__filename), localizedCopyHash: digest(path.join(__dirname, 'fillpro-localized-marketplace-copy.json')), artifacts: results }, null, 2)}\n`);
    console.log(`Rendered ${Object.keys(results).length} real-source still assets across ${Object.keys(copy).length} languages.`);
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
