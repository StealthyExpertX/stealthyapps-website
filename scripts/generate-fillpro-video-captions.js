const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'assets', 'marketplace', 'localized');
const CHECK_ONLY = process.argv.includes('--check');
const cues = {
  ar: ['نموذج فارغ. ملف شخصي محفوظ.', 'املأ بياناتك المتكررة وارفع سيرتك الذاتية بنقرة واحدة.', 'راجع النتيجة وتراجع عند الحاجة. أنت من يرسل النموذج.', 'يدعم القوائم ومربعات الاختيار والحقول التي تظهر لاحقًا.', 'ابدأ مجانًا مع 3 ملفات شخصية. لا يلزم حساب.'],
  cs: ['Prázdný formulář. Jeden uložený profil.', 'Vyplňte opakované údaje a nahrajte životopis jedním kliknutím.', 'Výsledek zkontrolujte. V případě potřeby změny vraťte. Formulář odesíláte vy.', 'Podporuje nabídky, zaškrtávací políčka i pole, která se objeví později.', 'Začněte zdarma se 3 profily. Bez účtu.'],
  de: ['Ein leeres Formular. Ein gespeichertes Profil.', 'Wiederkehrende Angaben und Lebenslauf-Uploads mit einem Klick ausfüllen.', 'Ergebnis prüfen und bei Bedarf rückgängig machen. Sie senden das Formular ab.', 'Auch für Dropdowns, Kontrollkästchen und später eingeblendete Felder.', 'Kostenlos mit 3 Profilen starten. Kein Konto nötig.'],
  el: ['Μια κενή φόρμα. Ένα αποθηκευμένο προφίλ.', 'Συμπληρώστε επαναλαμβανόμενα στοιχεία και ανεβάστε βιογραφικό με ένα κλικ.', 'Ελέγξτε το αποτέλεσμα και αναιρέστε αν χρειάζεται. Εσείς υποβάλλετε τη φόρμα.', 'Υποστηρίζει λίστες, πλαίσια ελέγχου και πεδία που εμφανίζονται αργότερα.', 'Ξεκινήστε δωρεάν με 3 προφίλ. Χωρίς λογαριασμό.'],
  en: ['A blank form. One saved profile.', 'Fill repeated details and attach your resume with one click.', 'Check the result. Undo any change. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', 'Start free with three profiles. No account required.'],
  en_GB: ['A blank form. One saved profile.', 'Fill repeated details and attach your CV with one click.', 'Check the result. Undo any change. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', 'Start free with three profiles. No account required.'],
  en_US: ['A blank form. One saved profile.', 'Fill repeated details and attach your resume with one click.', 'Check the result. Undo any change. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', 'Start free with three profiles. No account required.'],
  es: ['Un formulario vacío. Un perfil guardado.', 'Completa datos repetidos y carga tu currículum con un clic.', 'Revisa el resultado. Deshaz los cambios si hace falta. Tú envías el formulario.', 'Incluye listas, casillas y campos que aparecen más tarde.', 'Empieza gratis con 3 perfiles. Sin cuenta.'],
  es_419: ['Un formulario vacío. Un perfil guardado.', 'Completa datos repetidos y carga tu currículum con un clic.', 'Revisa el resultado. Deshaz los cambios si hace falta. Tú envías el formulario.', 'Incluye listas, casillas y campos que aparecen después.', 'Empieza gratis con 3 perfiles. No necesitas una cuenta.'],
  fr: ['Un formulaire vide. Un profil enregistré.', 'Remplissez les informations répétitives et ajoutez votre CV en un clic.', 'Vérifiez le résultat. Annulez si nécessaire. Vous envoyez le formulaire.', 'Listes, cases à cocher et champs tardifs sont pris en charge.', 'Commencez gratuitement avec 3 profils. Aucun compte requis.'],
  hi: ['एक खाली फ़ॉर्म। एक सेव की गई प्रोफ़ाइल।', 'दोहराई जाने वाली जानकारी और रिज़्यूमे अपलोड एक क्लिक में भरें।', 'नतीजा जाँचें। ज़रूरत हो तो बदलाव वापस लें। फ़ॉर्म आप सबमिट करते हैं।', 'ड्रॉपडाउन, चेकबॉक्स और बाद में दिखने वाले फ़ील्ड भी शामिल हैं।', '3 प्रोफ़ाइल के साथ मुफ़्त शुरू करें। खाते की ज़रूरत नहीं।'],
  id: ['Formulir kosong. Satu profil tersimpan.', 'Isi detail berulang dan unggah CV dalam satu klik.', 'Periksa hasilnya. Batalkan jika perlu. Anda yang mengirim formulir.', 'Mendukung menu pilihan, kotak centang, dan kolom yang muncul belakangan.', 'Mulai gratis dengan 3 profil. Tanpa akun.'],
  it: ['Un modulo vuoto. Un profilo salvato.', 'Compila i dati ricorrenti e carica il CV con un clic.', 'Controlla il risultato. Annulla se serve. Sei tu a inviare il modulo.', 'Supporta menu, caselle di controllo e campi che compaiono dopo.', 'Inizia gratis con 3 profili. Nessun account richiesto.'],
  ja: ['空のフォームに、保存済みプロフィールをひとつ。', '繰り返し入力する情報や履歴書をワンクリックで入力できます。', '結果を確認し、必要なら元に戻せます。送信するのはあなたです。', 'プルダウン、チェックボックス、後から表示される項目にも対応。', '3プロフィールまで無料。アカウントは不要です。'],
  ko: ['빈 양식과 저장된 프로필 하나.', '반복 정보와 이력서 업로드를 한 번에 채우세요.', '결과를 확인하고 필요하면 실행 취소하세요. 제출은 사용자가 합니다.', '드롭다운, 체크박스, 나중에 나타나는 필드도 지원합니다.', '프로필 3개로 무료 시작. 계정이 필요 없습니다.'],
  nl: ['Een leeg formulier. Eén opgeslagen profiel.', 'Vul terugkerende gegevens en cv-uploads met één klik in.', 'Controleer het resultaat. Maak zo nodig ongedaan. U verstuurt het formulier.', 'Ook voor keuzelijsten, selectievakjes en velden die later verschijnen.', 'Start gratis met 3 profielen. Geen account nodig.'],
  pl: ['Pusty formularz. Jeden zapisany profil.', 'Uzupełnij powtarzające się dane i prześlij CV jednym kliknięciem.', 'Sprawdź wynik. W razie potrzeby cofnij zmiany. To Ty wysyłasz formularz.', 'Obsługuje listy, pola wyboru i pola pojawiające się później.', 'Zacznij bezpłatnie z 3 profilami. Bez konta.'],
  pt_BR: ['Um formulário vazio. Um perfil salvo.', 'Preencha dados repetidos e envie o currículo com um clique.', 'Revise o resultado. Desfaça se precisar. Você envia o formulário.', 'Inclui listas, caixas de seleção e campos que aparecem depois.', 'Comece grátis com 3 perfis. Sem precisar de conta.'],
  ru: ['Пустая форма. Один сохранённый профиль.', 'Заполняйте повторяющиеся данные и загружайте резюме одним нажатием.', 'Проверьте результат и при необходимости отмените изменения. Форму отправляете вы.', 'Поддерживаются списки, флажки и поля, которые появляются позже.', 'Начните бесплатно с 3 профилями. Аккаунт не нужен.'],
  sv: ['Ett tomt formulär. En sparad profil.', 'Fyll i återkommande uppgifter och ladda upp CV med ett klick.', 'Granska resultatet. Ångra vid behov. Du skickar formuläret.', 'Stöd för menyer, kryssrutor och fält som visas senare.', 'Börja gratis med 3 profiler. Inget konto krävs.'],
  th: ['ฟอร์มว่างหนึ่งหน้า โปรไฟล์ที่บันทึกไว้หนึ่งโปรไฟล์', 'กรอกข้อมูลที่ใช้ซ้ำและอัปโหลดเรซูเม่ได้ในคลิกเดียว', 'ตรวจสอบผลลัพธ์และเลิกทำได้หากต้องการ คุณเป็นผู้ส่งฟอร์มเอง', 'รองรับเมนู ตัวเลือก และช่องที่แสดงขึ้นภายหลัง', 'เริ่มใช้ฟรีด้วย 3 โปรไฟล์ ไม่ต้องมีบัญชี'],
  tr: ['Boş bir form. Kayıtlı tek bir profil.', 'Tekrarlanan bilgileri ve CV yüklemelerini tek tıkla doldurun.', 'Sonucu kontrol edin. Gerekirse geri alın. Formu siz gönderirsiniz.', 'Açılır listeler, onay kutuları ve sonradan açılan alanlar desteklenir.', '3 profille ücretsiz başlayın. Hesap gerekmez.'],
  uk: ['Порожня форма. Один збережений профіль.', 'Заповнюйте повторювані дані та завантажуйте резюме одним натисканням.', 'Перевірте результат і за потреби скасуйте зміни. Форму надсилаєте ви.', 'Підтримуються списки, прапорці та поля, що з’являються пізніше.', 'Почніть безкоштовно з 3 профілями. Обліковий запис не потрібен.'],
  vi: ['Một biểu mẫu trống. Một hồ sơ đã lưu.', 'Điền thông tin lặp lại và tải CV lên chỉ với một lần nhấp.', 'Kiểm tra kết quả. Hoàn tác nếu cần. Bạn là người gửi biểu mẫu.', 'Hỗ trợ danh sách, ô chọn và các trường xuất hiện sau.', 'Bắt đầu miễn phí với 3 hồ sơ. Không cần tài khoản.'],
  zh_CN: ['一张空白表单，一个已保存的资料。', '一键填写重复信息并上传简历。', '检查填写结果，需要时可撤销。表单由您提交。', '支持下拉菜单、复选框和稍后出现的字段。', '免费使用 3 个资料，无需账户。'],
};

const times = [
  ['00:00:00.000', '00:00:02.200'],
  ['00:00:02.200', '00:00:07.700'],
  ['00:00:07.700', '00:00:12.000'],
  ['00:00:12.000', '00:00:17.000'],
  ['00:00:17.000', '00:00:22.000'],
];

const staleFiles = [];
if (!CHECK_ONLY) fs.mkdirSync(OUTPUT, { recursive: true });
for (const [locale, lines] of Object.entries(cues)) {
  if (lines.length !== times.length || lines.some((line) => !line.trim())) {
    throw new Error(`${locale}: expected ${times.length} non-empty captions`);
  }
  const body = lines.map((line, index) => `${times[index][0]} --> ${times[index][1]}\n${line}`).join('\n\n');
  const localeDir = path.join(OUTPUT, locale);
  const outputPath = path.join(localeDir, 'fillpro-store-demo-22s.vtt');
  const expected = `WEBVTT\n\n${body}\n`;
  if (CHECK_ONLY) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== expected) {
      staleFiles.push(path.relative(ROOT, outputPath));
    }
  } else {
    fs.mkdirSync(localeDir, { recursive: true });
    fs.writeFileSync(outputPath, expected, 'utf8');
  }
}

const manifestPath = path.join(OUTPUT, 'caption-manifest.json');
const expectedManifest = `${JSON.stringify({ durationSeconds: 22, locales: Object.keys(cues) }, null, 2)}\n`;
if (CHECK_ONLY) {
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== expectedManifest) {
    staleFiles.push(path.relative(ROOT, manifestPath));
  }
  if (staleFiles.length) {
    throw new Error(`Localized video captions are stale:\n- ${staleFiles.join('\n- ')}\nRun npm run generate:captions.`);
  }
  console.log(`Verified ${Object.keys(cues).length} localized FillPro caption tracks.`);
} else {
  fs.writeFileSync(manifestPath, expectedManifest, 'utf8');
  console.log(`Generated ${Object.keys(cues).length} localized FillPro caption tracks.`);
}
