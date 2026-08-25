const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UPDATED_ISO = '2026-08-24';
const CHECK_ONLY = process.argv.includes('--check');

const locales = [
  {
    slug: 'de', lang: 'de', hreflang: 'de', ogLocale: 'de_DE', languageName: 'Deutsch',
    title: 'Formulare automatisch ausfüllen mit Skip Retyping',
    description: 'Skip Retyping füllt Bewerbungen und wiederkehrende Webformulare aus gespeicherten Profilen aus. 3 Profile gratis, kein Konto, offline nutzbar.',
    nav: ['Produkt', 'Download', 'Preise', 'Datenschutz', 'Support', 'Kontakt'],
    legal: ['Bedingungen', 'Rückerstattungen'],
    kicker: 'Formulare automatisch ausfüllen',
    h1: 'Dieselben Formulardaten nicht immer wieder tippen.',
    lead: 'Skip Retyping speichert wiederverwendbare Profile im Browser. Wähle ein Profil, fülle die Seite aus und prüfe alles, bevor du das Formular absendest.',
    ctas: ['Kostenlos starten', 'Preise ansehen'],
    quickTitle: 'In wenigen Schritten',
    quickItems: ['Profil einmal speichern', 'Formular mit einem Klick ausfüllen', 'Änderungen prüfen oder rückgängig machen'],
    features: [
      ['Mehr als Name und Adresse', 'Skip Retyping füllt Bewerbungsfragen, Geschäftsangaben, Dropdowns, Kontrollkästchen, längere Antworten und erreichbare Datei-Uploads aus.'],
      ['Profile bleiben im Browser', 'Für den normalen Ablauf ist kein Cloud-Konto nötig. Gespeicherte Profile werden nur exportiert oder für den Support verwendet, wenn du das selbst auswählst.'],
      ['Vor dem Absenden prüfen', 'Skip Retyping füllt die Seite aus, sendet sie aber nicht ab. Du kannst ungewöhnliche Felder korrigieren oder die letzte Ausfüllung rückgängig machen.'],
    ],
    pricingTitle: 'Drei Profile kostenlos. Mehr nur bei Bedarf.',
    freeTitle: 'Kostenlos', freeBody: '3 gespeicherte Profile, Smart Rules, benutzerdefinierte Felder, Upload-Zuordnung und Rückgängig-Funktion.',
    proTitle: 'Pro', proBody: '3,99 US-Dollar pro Monat oder 29,99 US-Dollar pro Jahr.', billingNames: ['monatlich', 'jährlich'],
    faqTitle: 'Häufige Fragen',
    faqs: [
      ['Welche Formulare kann Skip Retyping ausfüllen?', 'Bewerbungen, Registrierungen, Onboarding-, Lieferanten-, Support- und andere wiederkehrende Webformulare mit erreichbaren Formularfeldern.'],
      ['Funktioniert Skip Retyping offline?', 'Ja. Der normale Ablauf mit gespeicherten Profilen funktioniert offline. Für Pro-Lizenzprüfungen, Support und Downloads ist eine Verbindung erforderlich.'],
      ['Ersetzt Skip Retyping einen Passwortmanager?', 'Nein. Anmeldedaten, Karten und Einmalcodes bleiben bei den dafür vorgesehenen Browser- und Passwortmanager-Funktionen.'],
    ],
    finalTitle: 'Das nächste lange Formular schneller erledigen.', finalCta: 'Skip Retyping herunterladen', languageLabel: 'Sprache', skip: 'Zum Inhalt springen', updated: 'Aktualisiert', dateLabel: '24. August 2026',
  },
  {
    slug: 'es', lang: 'es', hreflang: 'es', ogLocale: 'es_ES', languageName: 'Español',
    title: 'Autocompletar formularios con Skip Retyping',
    description: 'Skip Retyping autocompleta solicitudes de empleo y formularios repetitivos con perfiles guardados. 3 perfiles gratis, sin cuenta y sin conexión.',
    nav: ['Producto', 'Descargar', 'Precios', 'Privacidad', 'Ayuda', 'Contacto'],
    legal: ['Condiciones', 'Reembolsos'],
    kicker: 'Autocompletar formularios',
    h1: 'Deja de escribir los mismos datos en cada formulario.',
    lead: 'Skip Retyping guarda perfiles reutilizables en el navegador. Elige un perfil, rellena la página y revisa el resultado antes de enviar el formulario.',
    ctas: ['Empezar gratis', 'Ver precios'],
    quickTitle: 'Un proceso corto',
    quickItems: ['Guarda un perfil una vez', 'Rellena el formulario con un clic', 'Revisa los cambios o deshaz el rellenado'],
    features: [
      ['Más que nombre y dirección', 'Skip Retyping rellena preguntas de empleo, datos de empresa, menús, casillas, respuestas largas y campos de carga de archivos accesibles.'],
      ['Los perfiles quedan en el navegador', 'El uso normal no necesita una cuenta en la nube. Los perfiles solo salen al exportarlos o al enviarlos voluntariamente a soporte.'],
      ['Revisa antes de enviar', 'Skip Retyping rellena la página, pero no la envía. Puedes corregir un campo poco habitual o deshacer el último rellenado.'],
    ],
    pricingTitle: 'Tres perfiles gratis. Amplía solo cuando los necesites.',
    freeTitle: 'Gratis', freeBody: '3 perfiles guardados, reglas inteligentes, campos personalizados, coincidencia de archivos y función de deshacer.',
    proTitle: 'Pro', proBody: '3,99 USD al mes o 29,99 USD al año.', billingNames: ['mensual', 'anual'],
    faqTitle: 'Preguntas frecuentes',
    faqs: [
      ['¿Qué formularios puede rellenar Skip Retyping?', 'Solicitudes de empleo, registros, incorporación, proveedores, soporte y otros formularios web repetitivos con campos accesibles.'],
      ['¿Skip Retyping funciona sin conexión?', 'Sí. El flujo normal con perfiles guardados funciona sin conexión. La licencia Pro, el soporte y las descargas necesitan conexión.'],
      ['¿Sustituye a un gestor de contraseñas?', 'No. Los inicios de sesión, las tarjetas y los códigos de un solo uso siguen en las herramientas creadas para ellos.'],
    ],
    finalTitle: 'Termina antes el próximo formulario largo.', finalCta: 'Descargar Skip Retyping', languageLabel: 'Idioma', skip: 'Saltar al contenido', updated: 'Actualizado', dateLabel: '24 de agosto de 2026',
  },
  {
    slug: 'fr', lang: 'fr', hreflang: 'fr', ogLocale: 'fr_FR', languageName: 'Français',
    title: 'Remplissage automatique de formulaires avec Skip Retyping',
    description: 'Skip Retyping remplit candidatures et formulaires répétitifs depuis des profils enregistrés. 3 profils gratuits, sans compte et hors ligne.',
    nav: ['Produit', 'Télécharger', 'Tarifs', 'Confidentialité', 'Assistance', 'Contact'],
    legal: ['Conditions', 'Remboursements'],
    kicker: 'Remplissage automatique de formulaires',
    h1: 'Ne saisissez plus les mêmes informations dans chaque formulaire.',
    lead: 'Skip Retyping enregistre des profils réutilisables dans le navigateur. Choisissez un profil, remplissez la page, puis vérifiez le résultat avant l’envoi.',
    ctas: ['Commencer gratuitement', 'Voir les tarifs'],
    quickTitle: 'Un parcours plus court',
    quickItems: ['Enregistrez un profil une fois', 'Remplissez le formulaire en un clic', 'Vérifiez les changements ou annulez le remplissage'],
    features: [
      ['Au-delà du nom et de l’adresse', 'Skip Retyping remplit les questions de candidature, données d’entreprise, listes, cases, réponses longues et champs de téléversement accessibles.'],
      ['Les profils restent dans le navigateur', 'Le fonctionnement normal ne demande aucun compte cloud. Les profils ne quittent l’extension que si vous les exportez ou les envoyez volontairement au support.'],
      ['Vérifiez avant d’envoyer', 'Skip Retyping remplit la page sans l’envoyer. Corrigez un champ inhabituel ou annulez le dernier remplissage si nécessaire.'],
    ],
    pricingTitle: 'Trois profils gratuits. Passez à Pro seulement si nécessaire.',
    freeTitle: 'Gratuit', freeBody: '3 profils enregistrés, règles intelligentes, champs personnalisés, association des fichiers et annulation.',
    proTitle: 'Pro', proBody: '3,99 USD par mois ou 29,99 USD par an.', billingNames: ['mensuel', 'annuel'],
    faqTitle: 'Questions fréquentes',
    faqs: [
      ['Quels formulaires Skip Retyping peut-il remplir ?', 'Candidatures, inscriptions, intégration, fournisseurs, support et autres formulaires web répétitifs dont les champs sont accessibles.'],
      ['Skip Retyping fonctionne-t-il hors ligne ?', 'Oui. Le parcours normal avec les profils enregistrés fonctionne hors ligne. La licence Pro, le support et les téléchargements nécessitent une connexion.'],
      ['Skip Retyping remplace-t-il un gestionnaire de mots de passe ?', 'Non. Les identifiants, cartes et codes à usage unique restent dans les outils conçus pour ces données.'],
    ],
    finalTitle: 'Terminez plus vite votre prochain formulaire.', finalCta: 'Télécharger Skip Retyping', languageLabel: 'Langue', skip: 'Aller au contenu', updated: 'Mis à jour', dateLabel: '24 août 2026',
  },
  {
    slug: 'pt-br', lang: 'pt-BR', hreflang: 'pt-BR', ogLocale: 'pt_BR', languageName: 'Português (Brasil)',
    title: 'Preencher formulários automaticamente com Skip Retyping',
    description: 'Skip Retyping preenche candidaturas a vagas e formulários repetitivos com perfis salvos. 3 perfis grátis, sem conta e funciona offline.',
    nav: ['Produto', 'Baixar', 'Preços', 'Privacidade', 'Suporte', 'Contato'],
    legal: ['Termos', 'Reembolsos'],
    kicker: 'Preencher formulários automaticamente',
    h1: 'Pare de digitar os mesmos dados em cada formulário.',
    lead: 'Skip Retyping salva perfis reutilizáveis no navegador. Escolha um perfil, preencha a página e confira o resultado antes de enviar.',
    ctas: ['Começar grátis', 'Ver preços'],
    quickTitle: 'Um caminho mais curto',
    quickItems: ['Salve um perfil uma vez', 'Preencha o formulário com um clique', 'Revise as mudanças ou desfaça o preenchimento'],
    features: [
      ['Mais que nome e endereço', 'Skip Retyping preenche perguntas de processos seletivos, dados da empresa, listas, caixas, respostas longas e campos de upload acessíveis.'],
      ['Os perfis ficam no navegador', 'O uso normal não exige conta na nuvem. Os perfis só saem da extensão quando você exporta ou envia algo voluntariamente ao suporte.'],
      ['Revise antes de enviar', 'Skip Retyping preenche a página, mas não envia o formulário. Corrija um campo incomum ou desfaça o último preenchimento.'],
    ],
    pricingTitle: 'Três perfis grátis. Mude para Pro só quando precisar.',
    freeTitle: 'Grátis', freeBody: '3 perfis salvos, regras inteligentes, campos personalizados, correspondência de arquivos e desfazer.',
    proTitle: 'Pro', proBody: 'US$ 3,99 por mês ou US$ 29,99 por ano.', billingNames: ['mensal', 'anual'],
    faqTitle: 'Perguntas frequentes',
    faqs: [
      ['Quais formulários o Skip Retyping preenche?', 'Candidaturas a vagas, cadastros, integração, fornecedores, suporte e outros formulários web repetitivos com campos acessíveis.'],
      ['O Skip Retyping funciona offline?', 'Sim. O fluxo normal com perfis salvos funciona offline. Licença Pro, suporte e downloads precisam de conexão.'],
      ['O Skip Retyping substitui um gerenciador de senhas?', 'Não. Logins, cartões e códigos de uso único continuam nas ferramentas criadas para esses dados.'],
    ],
    finalTitle: 'Termine o próximo formulário longo mais rápido.', finalCta: 'Baixar Skip Retyping', languageLabel: 'Idioma', skip: 'Pular para o conteúdo', updated: 'Atualizado', dateLabel: '24 de agosto de 2026',
  },
  {
    slug: 'ja', lang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP', languageName: '日本語',
    title: 'フォーム自動入力なら Skip Retyping',
    description: '保存済みプロフィールから求人応募や繰り返し使うフォームを自動入力。3プロフィール無料、アカウント不要、オフライン対応。',
    nav: ['製品', 'ダウンロード', '料金', 'プライバシー', 'サポート', 'お問い合わせ'],
    legal: ['利用規約', '返金'],
    kicker: 'フォーム自動入力',
    h1: '同じ情報をフォームごとに入力する手間を減らします。',
    lead: 'Skip Retyping は再利用できるプロフィールをブラウザに保存します。プロフィールを選んでページ上のフォームに入力し、送信前に結果を確認できます。',
    ctas: ['無料で始める', '料金を見る'],
    quickTitle: '使い方はシンプル',
    quickItems: ['プロフィールを一度保存', 'ワンクリックでフォームを入力', '変更を確認、または元に戻す'],
    features: [
      ['氏名と住所だけではありません', '求人応募の質問、会社情報、選択欄、チェックボックス、長文回答、アクセス可能なファイルアップロード欄に対応します。'],
      ['プロフィールはブラウザ内に保存', '通常の利用にクラウドアカウントは不要です。プロフィールは、書き出しやサポートへの送信を自分で選んだ場合にだけ外部へ移動します。'],
      ['送信前に確認', 'Skip Retyping はページを入力しますが、フォームを送信しません。必要なら項目を直したり、最後の入力を元に戻したりできます。'],
    ],
    pricingTitle: '3プロフィールまで無料。必要になったら Pro へ。',
    freeTitle: '無料', freeBody: '保存プロフィール3件、スマートルール、カスタム項目、ファイル照合、元に戻す機能。',
    proTitle: 'Pro', proBody: '月額3.99米ドルまたは年額29.99米ドル。', billingNames: ['月額', '年額'],
    faqTitle: 'よくある質問',
    faqs: [
      ['どのフォームに使えますか？', '求人応募、登録、オンボーディング、取引先、サポートなど、アクセス可能な入力欄を持つ繰り返し使うWebフォームに対応します。'],
      ['オフラインでも使えますか？', 'はい。保存プロフィールを使う通常の入力はオフラインで動作します。Proライセンス確認、サポート、ダウンロードには接続が必要です。'],
      ['パスワード管理ツールの代わりになりますか？', 'いいえ。ログイン情報、カード、ワンタイムコードは、それらを扱うためのブラウザ機能やパスワード管理ツールに任せます。'],
    ],
    finalTitle: '次の長いフォームを、もっと短時間で。', finalCta: 'Skip Retyping をダウンロード', languageLabel: '言語', skip: '本文へ移動', updated: '更新日', dateLabel: '2026年8月24日',
  },
  {
    slug: 'ko', lang: 'ko', hreflang: 'ko', ogLocale: 'ko_KR', languageName: '한국어',
    title: 'Skip Retyping으로 양식 자동완성',
    description: '저장된 프로필로 입사 지원서와 반복 양식을 자동 입력하세요. 프로필 3개 무료, 계정 불필요, 오프라인 지원.',
    nav: ['제품', '다운로드', '요금', '개인정보 보호', '지원', '문의'],
    legal: ['이용 약관', '환불'],
    kicker: '양식 자동완성',
    h1: '양식마다 같은 정보를 다시 입력하지 마세요.',
    lead: 'Skip Retyping은 다시 사용할 프로필을 브라우저에 저장합니다. 프로필을 고르고 페이지를 채운 뒤 제출 전에 결과를 확인하세요.',
    ctas: ['무료로 시작', '요금 보기'],
    quickTitle: '간단한 사용 흐름',
    quickItems: ['프로필을 한 번 저장', '한 번의 클릭으로 양식 입력', '변경 내용을 확인하거나 되돌리기'],
    features: [
      ['이름과 주소 그 이상', '입사 지원 질문, 회사 정보, 드롭다운, 체크박스, 긴 답변, 접근 가능한 파일 업로드 필드를 채웁니다.'],
      ['프로필은 브라우저에 저장', '일반 사용에는 클라우드 계정이 필요 없습니다. 직접 내보내거나 지원팀에 보내기로 선택한 경우에만 프로필이 외부로 이동합니다.'],
      ['제출 전에 확인', 'Skip Retyping은 페이지를 채우지만 제출하지 않습니다. 낯선 필드를 고치거나 마지막 입력을 되돌릴 수 있습니다.'],
    ],
    pricingTitle: '프로필 3개는 무료. 더 필요할 때만 Pro로.',
    freeTitle: '무료', freeBody: '저장 프로필 3개, 스마트 규칙, 사용자 지정 필드, 파일 매칭, 되돌리기 기능.',
    proTitle: 'Pro', proBody: '월 US$3.99 또는 연 US$29.99.', billingNames: ['월간', '연간'],
    faqTitle: '자주 묻는 질문',
    faqs: [
      ['어떤 양식을 채울 수 있나요?', '입사 지원, 가입, 온보딩, 공급업체, 고객 지원 등 접근 가능한 입력 필드가 있는 반복 웹 양식에 사용할 수 있습니다.'],
      ['오프라인에서도 작동하나요?', '예. 저장 프로필을 이용한 일반 입력은 오프라인에서 작동합니다. Pro 라이선스 확인, 지원, 다운로드에는 연결이 필요합니다.'],
      ['비밀번호 관리자를 대신하나요?', '아니요. 로그인, 카드, 일회용 코드는 해당 데이터를 위해 만든 브라우저 기능과 비밀번호 관리자에서 계속 처리합니다.'],
    ],
    finalTitle: '다음 긴 양식을 더 빨리 끝내세요.', finalCta: 'Skip Retyping 다운로드', languageLabel: '언어', skip: '본문으로 건너뛰기', updated: '업데이트', dateLabel: '2026년 8월 24일',
  },
  {
    slug: 'zh-cn', lang: 'zh-CN', hreflang: 'zh-CN', ogLocale: 'zh_CN', languageName: '简体中文',
    title: '用 Skip Retyping 自动填充表单',
    description: 'Skip Retyping 使用已保存的个人资料填写求职申请、注册和常用网页表单。可免费保存 3 个资料，无需注册，也可离线使用，提交前可检查或撤销。',
    nav: ['产品', '下载', '价格', '隐私', '支持', '联系'],
    legal: ['条款', '退款'],
    kicker: '表单自动填充，资料保存在扩展程序中',
    h1: '不必在每个表单中重复输入相同资料。',
    lead: 'Skip Retyping 将可重复使用的个人资料保存在浏览器扩展中。选择资料、填写页面，然后在提交前检查结果。',
    ctas: ['免费开始', '查看价格'],
    quickTitle: '更短的操作流程',
    quickItems: ['只需保存一次资料', '一键填写表单', '检查更改或撤销填写'],
    features: [
      ['不只是姓名和地址', '可填写求职问题、公司资料、下拉菜单、复选框、长文本回答以及可访问的文件上传字段。'],
      ['资料保存在浏览器中', '日常使用无需云端账户。只有当你主动导出资料或发送给支持团队时，资料才会离开扩展程序。'],
      ['提交前先检查', 'Skip Retyping 负责填写页面，但不会提交表单。你可以修正特殊字段，也可以撤销上一次填写。'],
    ],
    pricingTitle: '免费使用 3 个资料。需要更多时再升级。',
    freeTitle: '免费', freeBody: '3 个已保存资料、智能规则、自定义字段、文件匹配和撤销功能。',
    proTitle: 'Pro', proBody: '每月 3.99 美元或每年 29.99 美元。', billingNames: ['月付', '年付'],
    faqTitle: '常见问题',
    faqs: [
      ['Skip Retyping 可以填写哪些表单？', '可用于求职申请、注册、入职、供应商、支持等带有可访问字段的重复网页表单。'],
      ['Skip Retyping 可以离线使用吗？', '可以。使用已保存资料的日常填写可离线运行。Pro 许可证检查、支持和下载需要联网。'],
      ['Skip Retyping 会替代密码管理器吗？', '不会。登录信息、银行卡和一次性验证码仍由专门处理这些数据的浏览器功能或密码管理器负责。'],
    ],
    finalTitle: '更快完成下一个长表单。', finalCta: '下载 Skip Retyping', languageLabel: '语言', skip: '跳到主要内容', updated: '更新日期', dateLabel: '2026年8月24日',
  },
  {
    slug: 'ru', lang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU', languageName: 'Русский',
    title: 'Автозаполнение форм с Skip Retyping',
    description: 'Skip Retyping заполняет заявки и повторяющиеся веб-формы из сохранённых профилей. 3 профиля бесплатно, без аккаунта и офлайн.',
    nav: ['Продукт', 'Скачать', 'Цены', 'Конфиденциальность', 'Поддержка', 'Контакты'],
    legal: ['Условия', 'Возврат средств'],
    kicker: 'Автозаполнение форм',
    h1: 'Не вводите одни и те же данные в каждой форме.',
    lead: 'Skip Retyping сохраняет многоразовые профили в браузере. Выберите профиль, заполните страницу и проверьте результат перед отправкой.',
    ctas: ['Начать бесплатно', 'Посмотреть цены'],
    quickTitle: 'Короткий путь',
    quickItems: ['Сохраните профиль один раз', 'Заполните форму одним кликом', 'Проверьте изменения или отмените заполнение'],
    features: [
      ['Не только имя и адрес', 'Skip Retyping заполняет вопросы в заявках, данные компании, списки, флажки, длинные ответы и доступные поля загрузки файлов.'],
      ['Профили остаются в браузере', 'Для обычной работы не нужна облачная учётная запись. Профили покидают расширение только при выбранном вами экспорте или обращении в поддержку.'],
      ['Проверка перед отправкой', 'Skip Retyping заполняет страницу, но не отправляет форму. Можно исправить необычное поле или отменить последнее заполнение.'],
    ],
    pricingTitle: 'Три профиля бесплатно. Pro — только когда нужно больше.',
    freeTitle: 'Бесплатно', freeBody: '3 сохранённых профиля, умные правила, пользовательские поля, сопоставление файлов и отмена.',
    proTitle: 'Pro', proBody: '3,99 доллара в месяц или 29,99 доллара в год.', billingNames: ['ежемесячно', 'ежегодно'],
    faqTitle: 'Частые вопросы',
    faqs: [
      ['Какие формы заполняет Skip Retyping?', 'Заявки на работу, регистрации, онбординг, формы поставщиков, поддержки и другие повторяющиеся веб-формы с доступными полями.'],
      ['Skip Retyping работает офлайн?', 'Да. Обычное заполнение из сохранённых профилей работает офлайн. Для проверки Pro, поддержки и загрузок требуется подключение.'],
      ['Skip Retyping заменяет менеджер паролей?', 'Нет. Логины, карты и одноразовые коды остаются в браузере и менеджере паролей, созданных для этих данных.'],
    ],
    finalTitle: 'Закончите следующую длинную форму быстрее.', finalCta: 'Скачать Skip Retyping', languageLabel: 'Язык', skip: 'Перейти к содержимому', updated: 'Обновлено', dateLabel: '24 августа 2026 г.',
  },
];

const english = { slug: '', hreflang: 'en', languageName: 'English' };
const allLanguages = [english, ...locales];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function localeUrl(locale) {
  return locale.slug ? `https://stealthyapps.com/skip-retyping/${locale.slug}/` : 'https://stealthyapps.com/skip-retyping/';
}

function localePath(locale) {
  return locale.slug ? `/skip-retyping/${locale.slug}/` : '/skip-retyping/';
}

function alternateLinks() {
  return [
    ...allLanguages.map((locale) => `  <link rel="alternate" hreflang="${locale.hreflang}" href="${localeUrl(locale)}">`),
    '  <link rel="alternate" hreflang="x-default" href="https://stealthyapps.com/skip-retyping/">',
  ].join('\n');
}

function languagePicker(current, label) {
  return `<details class="language-picker">
        <summary>${escapeHtml(label)}</summary>
        <div class="language-menu">
          ${allLanguages.map((locale) => `<a href="${localePath(locale)}" lang="${locale.hreflang}"${locale.hreflang === current.hreflang ? ' aria-current="page"' : ''}>${escapeHtml(locale.languageName)}</a>`).join('\n          ')}
        </div>
      </details>`;
}

function makeJsonLd(locale, canonical) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: locale.title,
        description: locale.description,
        inLanguage: locale.lang,
        isPartOf: { '@id': 'https://stealthyapps.com/#website' },
        about: { '@id': 'https://stealthyapps.com/skip-retyping/#software' },
        dateModified: UPDATED_ISO,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://stealthyapps.com/skip-retyping/#software',
        name: 'Skip Retyping',
        url: 'https://stealthyapps.com/skip-retyping/',
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Google Chrome',
        softwareVersion: '1.0.0',
        description: locale.description,
        inLanguage: locale.lang,
        publisher: { '@id': 'https://stealthyapps.com/#organization' },
        offers: [
          { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: locale.freeTitle },
          { '@type': 'Offer', price: '3.99', priceCurrency: 'USD', name: `${locale.proTitle} ${locale.billingNames[0]}` },
          { '@type': 'Offer', price: '29.99', priceCurrency: 'USD', name: `${locale.proTitle} ${locale.billingNames[1]}` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: locale.faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  });
}

function render(locale) {
  const canonical = localeUrl(locale);
  const jsonLd = makeJsonLd(locale, canonical);
  const jsonLdHash = crypto.createHash('sha256').update(jsonLd).digest('base64');
  const [product, download, pricing, privacy, support, contact] = locale.nav;
  const [terms, refunds] = locale.legal;
  return `<!doctype html>
<html lang="${locale.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(locale.title)} | Stealthy Apps</title>
  <meta name="description" content="${escapeHtml(locale.description)}">
  <meta name="author" content="Stealthy Apps">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'sha256-${jsonLdHash}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; form-action 'self'; upgrade-insecure-requests">
  <meta name="theme-color" content="#0f766e">
  <link rel="canonical" href="${canonical}">
${alternateLinks()}
  <link rel="icon" href="/assets/skip-retyping-logo.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/skip-retyping-logo.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <link rel="preload" href="/assets/fonts/AtkinsonHyperlegibleNext[wght].woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Stealthy Apps">
  <meta property="og:title" content="${escapeHtml(locale.title)}">
  <meta property="og:description" content="${escapeHtml(locale.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://stealthyapps.com/assets/skip-retyping-og.png">
  <meta property="og:locale" content="${locale.ogLocale}">
  <meta property="article:modified_time" content="${UPDATED_ISO}T00:00:00Z">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(locale.title)}">
  <meta name="twitter:description" content="${escapeHtml(locale.description)}">
  <meta name="twitter:image" content="https://stealthyapps.com/assets/skip-retyping-og.png">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body class="trust-page locale-page">
  <a class="skip-link" href="#content">${escapeHtml(locale.skip)}</a>
  <header class="site-header">
    <nav class="nav" aria-label="${escapeHtml(product)}">
      <a class="brand" href="${localePath(locale)}" aria-label="Skip Retyping by Stealthy Apps">
        <img class="brand-logo" src="/assets/skip-retyping-logo.svg" alt="" width="42" height="42" decoding="async">
        <span class="brand-lockup"><span class="brand-title">Skip Retyping</span><span class="brand-subtitle">by Stealthy Apps</span></span>
      </a>
      <div class="nav-links">
        <a data-nav-key="product" href="${localePath(locale)}" aria-current="page">${escapeHtml(product)}</a>
        <a data-nav-key="download" href="/skip-retyping/download/">${escapeHtml(download)}</a>
        <a data-nav-key="pricing" href="#pricing">${escapeHtml(pricing)}</a>
        <a data-nav-key="privacy" href="/skip-retyping/privacy/">${escapeHtml(privacy)}</a>
        <a data-nav-key="support" href="/support/">${escapeHtml(support)}</a>
        <a data-nav-key="contact" href="/contact/?topic=product&amp;product=Skip%20Retyping">${escapeHtml(contact)}</a>
      </div>
    </nav>
  </header>
  <main id="content" tabindex="-1" class="page">
    <section class="section two-col locale-hero">
      <div class="page-intro">
        <p class="eyebrow">${escapeHtml(locale.kicker)}</p>
        <h1>${escapeHtml(locale.h1)}</h1>
        <p class="lead">${escapeHtml(locale.lead)}</p>
        <div class="actions">
          <a class="button primary" href="/skip-retyping/download/">${escapeHtml(locale.ctas[0])}</a>
          <a class="button" href="#pricing">${escapeHtml(locale.ctas[1])}</a>
        </div>
      </div>
      <div class="card callout">
        <h2>${escapeHtml(locale.quickTitle)}</h2>
        <ol class="step-list">${locale.quickItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
      </div>
    </section>
    <section class="section">
      <div class="feature-grid">
        ${locale.features.map(([title, body]) => `<article class="feature-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`).join('\n        ')}
      </div>
    </section>
    <section class="section two-col" id="pricing">
      <div class="page-intro">
        <p class="eyebrow">${escapeHtml(pricing)}</p>
        <h2>${escapeHtml(locale.pricingTitle)}</h2>
      </div>
      <div class="locale-price-grid">
        <article class="card"><p class="eyebrow">${escapeHtml(locale.freeTitle)}</p><h3>$0</h3><p>${escapeHtml(locale.freeBody)}</p></article>
        <article class="card"><p class="eyebrow">${escapeHtml(locale.proTitle)}</p><h3>$3.99</h3><p>${escapeHtml(locale.proBody)}</p></article>
      </div>
    </section>
    <section class="section">
      <div class="section-heading"><p class="eyebrow">Skip Retyping</p><h2>${escapeHtml(locale.faqTitle)}</h2></div>
      <div class="faq-list">${locale.faqs.map(([question, answer], index) => `<details${index === 0 ? ' open' : ''}><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}</div>
    </section>
    <section class="section">
      <div class="card locale-final"><h2>${escapeHtml(locale.finalTitle)}</h2><a class="button primary" href="/skip-retyping/download/">${escapeHtml(locale.finalCta)}</a></div>
    </section>
  </main>
  <footer>
    <div class="footer-inner">
      <div class="footer-copy"><strong>Skip Retyping by Stealthy Apps</strong><span>${escapeHtml(locale.updated)} <time datetime="${UPDATED_ISO}">${escapeHtml(locale.dateLabel)}</time>.</span></div>
      <nav class="footer-links" aria-label="Footer">
        <a data-nav-key="product" href="${localePath(locale)}">${escapeHtml(product)}</a>
        <a data-nav-key="download" href="/skip-retyping/download/">${escapeHtml(download)}</a>
        <a data-nav-key="pricing" href="#pricing">${escapeHtml(pricing)}</a>
        <a data-nav-key="privacy" href="/skip-retyping/privacy/">${escapeHtml(privacy)}</a>
        <a data-nav-key="terms" href="/skip-retyping/terms/">${escapeHtml(terms)}</a>
        <a data-nav-key="refunds" href="/skip-retyping/refunds/">${escapeHtml(refunds)}</a>
        <a data-nav-key="support" href="/support/">${escapeHtml(support)}</a>
        <a data-nav-key="contact" href="/contact/">${escapeHtml(contact)}</a>
      </nav>
      ${languagePicker(locale, locale.languageLabel)}
    </div>
  </footer>
  <script src="/site.js" async></script>
</body>
</html>
`;
}

function renderLocaleSitemap() {
  const alternates = allLanguages
    .map((locale) => `    <xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="${localeUrl(locale)}"/>`)
    .concat('    <xhtml:link rel="alternate" hreflang="x-default" href="https://stealthyapps.com/skip-retyping/"/>')
    .join('\n');
  const urls = allLanguages.map((locale) => `  <url>
    <loc>${localeUrl(locale)}</loc>
    <lastmod>${UPDATED_ISO}</lastmod>
${alternates}
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

const failures = [];
for (const locale of locales) {
  const target = path.join(ROOT, 'skip-retyping', locale.slug, 'index.html');
  const expected = render(locale);
  if (CHECK_ONLY) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected) failures.push(locale.slug);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, expected, 'utf8');
  }
}

const sitemapTarget = path.join(ROOT, 'sitemap-locales.xml');
const sitemapExpected = renderLocaleSitemap();
if (CHECK_ONLY) {
  if (!fs.existsSync(sitemapTarget) || fs.readFileSync(sitemapTarget, 'utf8') !== sitemapExpected) failures.push('sitemap-locales.xml');
} else {
  fs.writeFileSync(sitemapTarget, sitemapExpected, 'utf8');
}

if (failures.length) {
  console.error(`Localized Skip Retyping pages are stale or missing: ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`${CHECK_ONLY ? 'Checked' : 'Generated'} ${locales.length} localized Skip Retyping pages and their sitemap.`);
