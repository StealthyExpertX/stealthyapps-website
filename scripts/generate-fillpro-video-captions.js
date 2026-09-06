const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'assets', 'marketplace', 'localized');
const CHECK_ONLY = process.argv.includes('--check');
const cues = {
  ar: ['طلب توظيف آخر؟ املأ البيانات التي حفظتها من قبل.', 'بنقرة واحدة، املأ الاسم والبريد والهاتف وأضف السيرة الذاتية المحفوظة.', 'راجع كل تغيير. تراجع عند الحاجة. أنت من يقرر متى يرسل النموذج.', 'يدعم القوائم المنسدلة ومربعات الاختيار والحقول التي تظهر لاحقًا.', '3 ملفات شخصية مجانًا. Pro: حتى 500 ملف شخصي مع النسخ. مدى الحياة 39.99 USD؛ وخطط شهرية وسنوية.'],
  cs: ['Další žádost o práci? Vyplňte údaje, které už máte uložené.', 'Jedním kliknutím doplňte jméno, e-mail, telefon a přiřazený životopis.', 'Zkontrolujte každou změnu. V případě potřeby ji vraťte. Odeslání je na vás.', 'Funguje s nabídkami, zaškrtávacími políčky i poli, která se objeví později.', '3 profily zdarma. Pro: až 500 profilů + duplikování. Doživotně 39,99 USD; také měsíční a roční plány.'],
  de: ['Noch eine Bewerbung? Füllen Sie die Angaben aus, die Sie bereits gespeichert haben.', 'Ein Klick füllt Name, E-Mail, Telefonnummer und den passenden Lebenslauf aus.', 'Prüfen Sie jede Änderung. Machen Sie sie bei Bedarf rückgängig. Sie entscheiden, wann Sie absenden.', 'Funktioniert mit Dropdowns, Kontrollkästchen und später eingeblendeten Feldern.', '3 Profile gratis. Pro: bis zu 500 Profile + Duplizieren. Lebenslang 39,99 USD; auch Monats- und Jahrespläne.'],
  el: ['Άλλη μία αίτηση εργασίας; Συμπληρώστε τα στοιχεία που έχετε ήδη αποθηκεύσει.', 'Με ένα κλικ συμπληρώνονται όνομα, email, τηλέφωνο και το αντίστοιχο βιογραφικό.', 'Ελέγξτε κάθε αλλαγή. Αναιρέστε αν χρειάζεται. Εσείς αποφασίζετε πότε θα γίνει η υποβολή.', 'Λειτουργεί με αναπτυσσόμενες λίστες, πλαίσια ελέγχου και πεδία που εμφανίζονται αργότερα.', '3 προφίλ δωρεάν. Pro: έως 500 προφίλ + αντιγραφή. Εφ’ όρου ζωής: 39,99 USD. Και μηνιαία/ετήσια πακέτα.'],
  en: ['Another job application? Fill the details you already saved.', 'One click fills your name, email, and phone, then matches your resume.', 'Review every change. Undo if needed. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', '3 profiles free. Pro: up to 500 profiles + duplication. Lifetime US$39.99; monthly/yearly plans available.'],
  en_GB: ['Another job application? Fill the details you already saved.', 'One click fills your name, email, and phone, then matches your CV.', 'Review every change. Undo if needed. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', '3 profiles free. Pro: up to 500 profiles + duplication. Lifetime US$39.99; monthly/yearly plans available.'],
  en_US: ['Another job application? Fill the details you already saved.', 'One click fills your name, email, and phone, then matches your resume.', 'Review every change. Undo if needed. You decide when to submit.', 'Works with dropdowns, checkboxes, and fields that appear later.', '3 profiles free. Pro: up to 500 profiles + duplication. Lifetime US$39.99; monthly/yearly plans available.'],
  es: ['¿Otra solicitud de empleo? Completa los datos que ya guardaste.', 'Un clic completa tu nombre, correo y teléfono, y asigna tu currículum.', 'Revisa cada cambio. Deshaz lo que necesites. Tú decides cuándo enviar.', 'Funciona con listas desplegables, casillas y campos que aparecen después.', '3 perfiles gratis. Pro: hasta 500 perfiles + duplicación. De por vida: 39,99 USD; también planes mensuales y anuales.'],
  es_419: ['¿Otra solicitud de empleo? Completa los datos que ya guardaste.', 'Un clic completa tu nombre, correo y teléfono, y asigna tu currículum.', 'Revisa cada cambio. Deshaz lo que necesites. Tú decides cuándo enviar.', 'Funciona con listas desplegables, casillas y campos que aparecen después.', '3 perfiles gratis. Pro: hasta 500 perfiles + duplicación. De por vida: 39,99 USD; también planes mensuales y anuales.'],
  fr: ['Encore une candidature ? Remplissez les informations déjà enregistrées.', 'Un clic remplit votre nom, votre e-mail et votre téléphone, puis associe votre CV.', 'Vérifiez chaque modification. Annulez si nécessaire. Vous décidez quand envoyer.', 'Fonctionne avec les listes déroulantes, les cases à cocher et les champs qui apparaissent plus tard.', '3 profils gratuits. Pro : jusqu’à 500 profils + duplication. À vie : 39,99 USD ; aussi au mois ou à l’année.'],
  hi: ['एक और नौकरी आवेदन? पहले से सेव की गई जानकारी भरें।', 'एक क्लिक में नाम, ईमेल और फ़ोन भरें, फिर सेव किया हुआ रिज़्यूमे जोड़ें।', 'हर बदलाव जाँचें। ज़रूरत हो तो वापस लें। कब सबमिट करना है, यह आप तय करें।', 'ड्रॉपडाउन, चेकबॉक्स और बाद में दिखने वाले फ़ील्ड पर भी काम करता है।', '3 प्रोफ़ाइल मुफ़्त। Pro: 500 तक प्रोफ़ाइल और कॉपी करने की सुविधा। लाइफ़टाइम US$39.99; मासिक और वार्षिक प्लान भी।'],
  id: ['Melamar pekerjaan lagi? Isi data yang sudah Anda simpan.', 'Satu klik mengisi nama, email, dan telepon, lalu mencocokkan CV Anda.', 'Periksa setiap perubahan. Batalkan jika perlu. Anda menentukan kapan formulir dikirim.', 'Berfungsi untuk menu pilihan, kotak centang, dan kolom yang muncul belakangan.', '3 profil gratis. Pro: hingga 500 profil + duplikasi. Seumur hidup US$39,99; paket bulanan/tahunan juga ada.'],
  it: ['Un’altra candidatura? Compila i dati che hai già salvato.', 'Un clic inserisce nome, email e telefono, poi abbina il CV.', 'Controlla ogni modifica. Annulla se serve. Decidi tu quando inviare.', 'Funziona con menu a discesa, caselle di controllo e campi che compaiono dopo.', '3 profili gratis. Pro: fino a 500 profili + duplicazione. A vita 39,99 USD; anche piani mensili e annuali.'],
  ja: ['また求人に応募しますか？保存済みの情報をまとめて入力。', 'ワンクリックで氏名、メール、電話番号を入力し、保存した履歴書を割り当てます。', '変更内容を確認。必要なら元に戻せます。送信するタイミングは自分で決められます。', 'プルダウン、チェックボックス、後から表示される項目にも対応。', '3プロフィールまで無料。Proはプロフィール最大500件と複製機能。買い切り39.99米ドル。月額・年額プランも。'],
  ko: ['또 채용 지원서를 작성하시나요? 저장해 둔 정보를 바로 채우세요.', '한 번 클릭하면 이름, 이메일, 전화번호를 입력하고 저장한 이력서를 연결합니다.', '모든 변경 내용을 확인하고 필요하면 실행 취소하세요. 제출 시점은 직접 정합니다.', '드롭다운, 체크박스, 나중에 나타나는 필드도 지원합니다.', '프로필 3개 무료. Pro: 프로필 최대 500개와 복제 기능. 평생 이용 US$39.99. 월간·연간 요금제도 제공.'],
  nl: ['Weer een sollicitatie? Vul de gegevens in die u al hebt opgeslagen.', 'Eén klik vult naam, e-mail en telefoon in en koppelt uw opgeslagen cv.', 'Controleer elke wijziging. Maak zo nodig ongedaan. U bepaalt wanneer u verstuurt.', 'Werkt met keuzelijsten, selectievakjes en velden die later verschijnen.', '3 profielen gratis. Pro: tot 500 profielen + dupliceren. Levenslang US$39,99; ook maand- en jaarabonnementen.'],
  pl: ['Kolejne podanie o pracę? Uzupełnij zapisane wcześniej dane.', 'Jedno kliknięcie wpisuje imię i nazwisko, e-mail i telefon oraz dopasowuje zapisane CV.', 'Sprawdź każdą zmianę. W razie potrzeby ją cofnij. To Ty decydujesz, kiedy wysłać formularz.', 'Działa z listami, polami wyboru i polami pojawiającymi się później.', '3 profile gratis. Pro: do 500 profili + duplikowanie. Dożywotnio 39,99 USD; też plany miesięczne i roczne.'],
  pt_BR: ['Mais uma candidatura? Preencha os dados que você já salvou.', 'Um clique preenche nome, e-mail e telefone e associa o currículo salvo.', 'Revise cada mudança. Desfaça se precisar. Você decide quando enviar.', 'Funciona com listas, caixas de seleção e campos que aparecem depois.', '3 perfis grátis. Pro: até 500 perfis + duplicação. Vitalício US$39,99; também planos mensal e anual.'],
  ru: ['Снова заполняете анкету на вакансию? Подставьте уже сохранённые данные.', 'Одно нажатие заполняет имя, почту и телефон и подбирает сохранённое резюме.', 'Проверьте каждое изменение. При необходимости отмените его. Когда отправлять форму, решаете вы.', 'Работает со списками, флажками и полями, которые появляются позже.', '3 профиля бесплатно. Pro: до 500 профилей и дублирование. Пожизненно 39,99 USD; есть месячный и годовой планы.'],
  sv: ['Ännu en jobbansökan? Fyll i uppgifterna du redan har sparat.', 'Ett klick fyller i namn, e-post och telefon och kopplar ditt sparade CV.', 'Granska varje ändring. Ångra vid behov. Du bestämmer när formuläret skickas.', 'Fungerar med menyer, kryssrutor och fält som visas senare.', '3 profiler gratis. Pro: upp till 500 profiler + kopiering. Livstid 39,99 USD; även månads- och årsplaner.'],
  th: ['สมัครงานอีกครั้งใช่ไหม กรอกข้อมูลที่บันทึกไว้ได้ทันที', 'คลิกเดียวเพื่อกรอกชื่อ อีเมล โทรศัพท์ และจับคู่เรซูเม่ที่บันทึกไว้', 'ตรวจสอบทุกการเปลี่ยนแปลง เลิกทำได้หากต้องการ คุณเป็นคนตัดสินใจว่าจะส่งเมื่อไร', 'รองรับเมนูแบบเลื่อนลง ช่องทำเครื่องหมาย และช่องที่แสดงขึ้นภายหลัง', 'ฟรี 3 โปรไฟล์ Pro: สูงสุด 500 โปรไฟล์และทำสำเนา ตลอดชีพ US$39.99 มีแพ็กเกจรายเดือนและรายปีด้วย'],
  tr: ['Bir iş başvurusu daha mı? Önceden kaydettiğiniz bilgileri doldurun.', 'Tek tıkla ad, e-posta ve telefon bilgilerini doldurun; kayıtlı CV’nizi eşleştirin.', 'Her değişikliği kontrol edin. Gerekirse geri alın. Ne zaman göndereceğinize siz karar verin.', 'Açılır listeler, onay kutuları ve sonradan açılan alanlarla çalışır.', '3 profil ücretsiz. Pro: 500’e kadar profil ve çoğaltma. Ömür boyu 39,99 USD; aylık/yıllık planlar da var.'],
  uk: ['Ще одна заявка на вакансію? Заповніть уже збережені дані.', 'Одне натискання заповнює ім’я, електронну пошту й телефон та додає збережене резюме.', 'Перевірте кожну зміну. За потреби скасуйте її. Коли надсилати форму, вирішуєте ви.', 'Працює зі списками, прапорцями та полями, що з’являються пізніше.', '3 профілі безкоштовно. Pro: до 500 профілів і дублювання. Довічно 39,99 USD; є місячний і річний плани.'],
  vi: ['Lại điền hồ sơ xin việc? Dùng ngay thông tin bạn đã lưu.', 'Một lần nhấp sẽ điền tên, email, số điện thoại và ghép CV đã lưu.', 'Kiểm tra từng thay đổi. Hoàn tác nếu cần. Bạn quyết định khi nào gửi.', 'Hoạt động với danh sách, ô chọn và các trường xuất hiện sau.', 'Miễn phí 3 hồ sơ. Pro: tối đa 500 hồ sơ và nhân bản. Trọn đời 39,99 USD; có gói tháng/năm.'],
  zh_CN: ['又要填写求职申请？直接使用已经保存的信息。', '一次点击即可填写姓名、邮箱和电话，并匹配已保存的简历。', '逐项检查更改，需要时可以撤销。何时提交由您决定。', '支持下拉菜单、复选框和稍后出现的字段。', '3个资料免费。Pro支持最多500个资料及复制功能。终身版39.99美元，另有月付和年付方案。'],
};

const undoCaptions = {
  ar: 'يعيد التراجع القيم السابقة. هنا تعود الحقول وخانة الملف فارغة.',
  cs: 'Zpět obnoví původní hodnoty. Zde jsou pole i příloha opět prázdné.',
  de: 'Rückgängig stellt die ursprünglichen Werte wieder her. Hier sind Felder und Dateiauswahl wieder leer.',
  el: 'Η αναίρεση επαναφέρει τις αρχικές τιμές. Εδώ τα πεδία και η επιλογή αρχείου είναι ξανά κενά.',
  en: 'Undo restores the original values. Here, the fields and file input are empty again.',
  en_GB: 'Undo restores the original values. Here, the fields and file input are empty again.',
  en_US: 'Undo restores the original values. Here, the fields and file input are empty again.',
  es: 'Deshacer restaura los valores originales. Aquí, los campos y el archivo vuelven a quedar vacíos.',
  es_419: 'Deshacer restaura los valores originales. Aquí, los campos y el archivo vuelven a quedar vacíos.',
  fr: 'Annuler rétablit les valeurs initiales. Ici, les champs et le fichier sont à nouveau vides.',
  hi: 'पूर्ववत करने से पहले के मान लौट आते हैं। यहाँ फ़ील्ड और फ़ाइल इनपुट फिर से खाली हैं।',
  id: 'Urungkan mengembalikan nilai semula. Di sini, kolom dan pilihan berkas kembali kosong.',
  it: 'Annulla ripristina i valori originali. Qui i campi e la selezione del file tornano vuoti.',
  ja: '元に戻すと、入力前の値に戻ります。この例では、入力欄とファイル選択が再び空になります。',
  ko: '실행 취소하면 원래 값으로 돌아갑니다. 이 예에서는 입력란과 파일 선택이 다시 비워집니다.',
  nl: 'Ongedaan maken herstelt de oorspronkelijke waarden. Hier zijn de velden en de bestandskeuze weer leeg.',
  pl: 'Cofnięcie przywraca poprzednie wartości. Tutaj pola i wybór pliku znów są puste.',
  pt_BR: 'Desfazer restaura os valores originais. Aqui, os campos e a seleção de arquivo ficam vazios novamente.',
  ru: 'Отмена восстанавливает исходные значения. В этом примере поля и выбор файла снова пусты.',
  sv: 'Ångra återställer de ursprungliga värdena. Här är fälten och filvalet tomma igen.',
  th: 'เลิกทำจะคืนค่าเดิม ในตัวอย่างนี้ ช่องกรอกข้อมูลและช่องเลือกไฟล์กลับมาว่างอีกครั้ง',
  tr: 'Geri al, önceki değerleri geri yükler. Bu örnekte alanlar ve dosya seçimi yeniden boştur.',
  uk: 'Скасування відновлює початкові значення. У цьому прикладі поля та вибір файлу знову порожні.',
  vi: 'Hoàn tác khôi phục giá trị ban đầu. Trong ví dụ này, các trường và mục chọn tệp lại để trống.',
  zh_CN: '撤销会恢复原来的值。在这个示例中，输入框和文件选择重新变为空白。',
};
for (const locale of Object.keys(cues)) {
  if (!undoCaptions[locale]) throw new Error(`Missing updated Undo caption: ${locale}`);
  cues[locale][3] = undoCaptions[locale];
}

const times = [
  ['00:00:00.000', '00:00:03.200'],
  ['00:00:03.200', '00:00:08.000'],
  ['00:00:08.000', '00:00:12.600'],
  ['00:00:12.600', '00:00:17.200'],
  ['00:00:17.200', '00:00:22.000'],
];

const staleFiles = [];
if (!CHECK_ONLY) fs.mkdirSync(OUTPUT, { recursive: true });
for (const [locale, lines] of Object.entries(cues)) {
  if (lines.length !== times.length || lines.some((line) => !line.trim())) {
    throw new Error(`${locale}: expected ${times.length} non-empty captions`);
  }
  const body = lines.map((line, index) => `${times[index][0]} --> ${times[index][1]}\n${line}`).join('\n\n');
  const localeDir = path.join(OUTPUT, locale);
  const outputPath = path.join(localeDir, 'skip-retyping-store-demo-22s.vtt');
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
  console.log(`Verified ${Object.keys(cues).length} localized Skip Retyping caption tracks.`);
} else {
  fs.writeFileSync(manifestPath, expectedManifest, 'utf8');
  console.log(`Generated ${Object.keys(cues).length} localized Skip Retyping caption tracks.`);
}
