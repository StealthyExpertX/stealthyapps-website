(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

  var THEME_KEY = 'skip-retyping-theme';
  var THEMES = ['system', 'light', 'dark'];
  // Add the approved marketplace URLs here once each listing is public.
  // Every data-skip-retyping-store link on the site will switch automatically.
  var SKIP_RETYPING_STORE_LINKS = {
    chrome: '',
    edge: '',
    firefox: '',
  };
  // Add approved Chrome and Edge store IDs here after marketplace approval.
  var SKIP_RETYPING_STORE_EXTENSION_IDS = [];
  var SKIP_RETYPING_TEST_EXTENSION_IDS = Array.isArray(window.__SKIP_RETYPING_TEST_EXTENSION_IDS__)
    ? window.__SKIP_RETYPING_TEST_EXTENSION_IDS__.filter(function (id) {
        return /^[a-p]{32}$/.test(String(id || ''));
      })
    : [];
  var SKIP_RETYPING_EXTENSION_IDS = SKIP_RETYPING_STORE_EXTENSION_IDS.concat(
    SKIP_RETYPING_TEST_EXTENSION_IDS,
  );
  var mediaDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  var themeButton = null;
  var THEME_COPY = {
    en: { aria: 'Current theme: {current}. Switch to {next} theme.', title: 'Theme: {current}. Next: {next}.', system: 'system', light: 'light', dark: 'dark' },
    de: { aria: 'Aktuelles Design: {current}. Wechseln zu: {next}.', title: 'Design: {current}. Als Nächstes: {next}.', system: 'System', light: 'hell', dark: 'dunkel' },
    es: { aria: 'Tema actual: {current}. Cambiar a: {next}.', title: 'Tema: {current}. Siguiente: {next}.', system: 'sistema', light: 'claro', dark: 'oscuro' },
    fr: { aria: 'Thème actuel : {current}. Passer au thème {next}.', title: 'Thème : {current}. Suivant : {next}.', system: 'système', light: 'clair', dark: 'sombre' },
    'pt-br': { aria: 'Tema atual: {current}. Mudar para: {next}.', title: 'Tema: {current}. Próximo: {next}.', system: 'sistema', light: 'claro', dark: 'escuro' },
    ja: { aria: '現在のテーマ: {current}。{next}テーマに切り替えます。', title: 'テーマ: {current}。次: {next}。', system: 'システム', light: 'ライト', dark: 'ダーク' },
    ko: { aria: '현재 테마: {current}. {next} 테마로 전환합니다.', title: '테마: {current}. 다음: {next}.', system: '시스템', light: '라이트', dark: '다크' },
    'zh-cn': { aria: '当前主题：{current}。切换到{next}主题。', title: '主题：{current}。下一个：{next}。', system: '跟随系统', light: '浅色', dark: '深色' },
    ru: { aria: 'Текущая тема: {current}. Переключить на тему «{next}».', title: 'Тема: {current}. Следующая: {next}.', system: 'системная', light: 'светлая', dark: 'тёмная' },
  };
  var INSTALLED_COPY = {
    en: {
      open: 'Open Skip Retyping',
      monthly: 'Choose monthly in Skip Retyping',
      yearly: 'Choose yearly in Skip Retyping',
      lifetime: 'Choose lifetime in Skip Retyping',
      installedTitle: 'Skip Retyping is installed in this browser.',
      checkoutTitle: 'Skip Retyping is already installed.',
      checkoutLead: 'Keep using the free plan or choose Monthly, Yearly, or Lifetime Pro.',
      checkoutNote: 'Open Skip Retyping from the toolbar to fill a page, create a profile, or manage billing.',
    },
    de: { open: 'Skip Retyping öffnen', monthly: 'Monatsplan in Skip Retyping wählen', yearly: 'Jahresplan in Skip Retyping wählen', lifetime: 'Dauerlizenz in Skip Retyping wählen', installedTitle: 'Skip Retyping ist in diesem Browser installiert.', checkoutTitle: 'Skip Retyping ist bereits installiert.', checkoutLead: 'Nutze die kostenlose Version weiter oder wähle Pro.', checkoutNote: 'Öffne Skip Retyping über die Symbolleiste, um eine Seite auszufüllen, ein Profil anzulegen oder die Abrechnung zu verwalten.' },
    es: { open: 'Abrir Skip Retyping', monthly: 'Elegir el plan mensual en Skip Retyping', yearly: 'Elegir el plan anual en Skip Retyping', lifetime: 'Elegir acceso de por vida en Skip Retyping', installedTitle: 'Skip Retyping está instalado en este navegador.', checkoutTitle: 'Skip Retyping ya está instalado.', checkoutLead: 'Sigue con el plan gratis o elige Pro.', checkoutNote: 'Abre Skip Retyping desde la barra de herramientas para rellenar una página, crear un perfil o gestionar la facturación.' },
    fr: { open: 'Ouvrir Skip Retyping', monthly: 'Choisir l’offre mensuelle dans Skip Retyping', yearly: 'Choisir l’offre annuelle dans Skip Retyping', lifetime: 'Choisir l’accès à vie dans Skip Retyping', installedTitle: 'Skip Retyping est installé dans ce navigateur.', checkoutTitle: 'Skip Retyping est déjà installé.', checkoutLead: 'Continuez avec l’offre gratuite ou choisissez Pro.', checkoutNote: 'Ouvrez Skip Retyping depuis la barre d’outils pour remplir une page, créer un profil ou gérer la facturation.' },
    'pt-br': { open: 'Abrir o Skip Retyping', monthly: 'Escolher o plano mensal no Skip Retyping', yearly: 'Escolher o plano anual no Skip Retyping', lifetime: 'Escolher acesso vitalício no Skip Retyping', installedTitle: 'O Skip Retyping está instalado neste navegador.', checkoutTitle: 'O Skip Retyping já está instalado.', checkoutLead: 'Continue no plano grátis ou escolha o Pro.', checkoutNote: 'Abra o Skip Retyping pela barra de ferramentas para preencher uma página, criar um perfil ou gerenciar a cobrança.' },
    ja: { open: 'Skip Retyping を開く', monthly: 'Skip Retyping で月額プランを選ぶ', yearly: 'Skip Retyping で年額プランを選ぶ', lifetime: 'Skip Retyping で買い切りプランを選ぶ', installedTitle: 'Skip Retyping はこのブラウザーにインストールされています。', checkoutTitle: 'Skip Retyping はすでにインストールされています。', checkoutLead: '無料プランを使い続けるか、Pro を選べます。', checkoutNote: 'ツールバーから Skip Retyping を開き、ページの入力、プロフィール作成、請求管理を行えます。' },
    ko: { open: 'Skip Retyping 열기', monthly: 'Skip Retyping에서 월간 요금제 선택', yearly: 'Skip Retyping에서 연간 요금제 선택', lifetime: 'Skip Retyping에서 평생 이용권 선택', installedTitle: '이 브라우저에 Skip Retyping이 설치되어 있습니다.', checkoutTitle: 'Skip Retyping이 이미 설치되어 있습니다.', checkoutLead: '무료 요금제를 계속 사용하거나 Pro를 선택하세요.', checkoutNote: '도구 모음에서 Skip Retyping을 열어 페이지를 채우고, 프로필을 만들거나 결제를 관리하세요.' },
    'zh-cn': { open: '打开 Skip Retyping', monthly: '在 Skip Retyping 中选择月付方案', yearly: '在 Skip Retyping 中选择年付方案', lifetime: '在 Skip Retyping 中选择终身版', installedTitle: '此浏览器已安装 Skip Retyping。', checkoutTitle: 'Skip Retyping 已安装。', checkoutLead: '继续使用免费方案，或选择 Pro。', checkoutNote: '从工具栏打开 Skip Retyping，即可填写页面、创建资料或管理账单。' },
    ru: { open: 'Открыть Skip Retyping', monthly: 'Выбрать месячный план в Skip Retyping', yearly: 'Выбрать годовой план в Skip Retyping', lifetime: 'Выбрать пожизненный доступ в Skip Retyping', installedTitle: 'Skip Retyping установлен в этом браузере.', checkoutTitle: 'Skip Retyping уже установлен.', checkoutLead: 'Оставайтесь на бесплатном плане или выберите Pro.', checkoutNote: 'Откройте Skip Retyping на панели инструментов, чтобы заполнить страницу, создать профиль или управлять оплатой.' },
  };

  function currentThemeCopy() {
    var language = (root.getAttribute('lang') || 'en').toLowerCase();
    if (THEME_COPY[language]) {
      return THEME_COPY[language];
    }
    var base = language.split('-')[0];
    return THEME_COPY[base] || THEME_COPY.en;
  }

  function currentInstalledCopy() {
    var language = (root.getAttribute('lang') || 'en').toLowerCase();
    var base = language.split('-')[0];
    return Object.assign(
      {},
      INSTALLED_COPY.en,
      INSTALLED_COPY[language] || INSTALLED_COPY[base] || {},
    );
  }

  function formatThemeCopy(template, current, next) {
    return template.replace('{current}', current).replace('{next}', next);
  }

  function getStoredTheme() {
    try {
      var stored = window.localStorage.getItem(THEME_KEY);
      return THEMES.indexOf(stored) >= 0 ? stored : 'system';
    } catch (error) {
      return 'system';
    }
  }

  function resolvedTheme(theme) {
    if (theme === 'system') {
      return mediaDark && mediaDark.matches ? 'dark' : 'light';
    }
    return theme;
  }

  function setTheme(theme) {
    var next = THEMES.indexOf(theme) >= 0 ? theme : 'system';
    var resolved = resolvedTheme(next);

    if (next === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', next);
    }

    root.setAttribute('data-theme-mode', next);
    root.setAttribute('data-theme-resolved', resolved);

    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'dark' ? '#0e1715' : '#0f766e');
    }

    if (!themeButton) {
      return;
    }

    var copy = currentThemeCopy();
    var currentLabel =
      next === 'system' ? copy.system + ' (' + copy[resolved] + ')' : copy[next];
    var nextTheme = next === 'system' ? 'dark' : next === 'dark' ? 'light' : 'system';
    themeButton.setAttribute('aria-label', formatThemeCopy(copy.aria, currentLabel, copy[nextTheme]));
    themeButton.setAttribute('title', formatThemeCopy(copy.title, currentLabel, copy[nextTheme]));
    themeButton.dataset.theme = next;
    themeButton.dataset.resolvedTheme = resolved;
  }

  function persistTheme(theme) {
    try {
      if (theme === 'system') {
        window.localStorage.removeItem(THEME_KEY);
      } else {
        window.localStorage.setItem(THEME_KEY, theme);
      }
    } catch (error) {}
    setTheme(theme);
  }

  function installThemeToggle() {
    var nav = document.querySelector('.launch-links, .nav-links');
    if (!nav || nav.querySelector('.theme-toggle')) {
      return;
    }

    themeButton = document.createElement('button');
    themeButton.type = 'button';
    themeButton.className = 'theme-toggle';
    themeButton.addEventListener('click', function () {
      var current = getStoredTheme();
      var next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
      persistTheme(next);
    });
    nav.appendChild(themeButton);
    setTheme(getStoredTheme());
  }

  function configureStoreLinks() {
    document.querySelectorAll('[data-skip-retyping-store]').forEach(function (link) {
      var store = (link.getAttribute('data-skip-retyping-store') || '').toLowerCase();
      var url = SKIP_RETYPING_STORE_LINKS[store];
      if (!url) {
        link.dataset.storeState = 'pending';
        link.hidden = true;
        link.removeAttribute('href');
        return;
      }

      link.hidden = false;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.storeState = 'live';
      var liveLabel = link.getAttribute('data-live-label');
      if (liveLabel) link.textContent = liveLabel;
    });

    document.querySelectorAll('[data-store-live-copy]').forEach(function (node) {
      var store = (node.getAttribute('data-store-live-copy') || '').toLowerCase();
      if (!SKIP_RETYPING_STORE_LINKS[store]) return;
      var liveText = node.getAttribute('data-live-text');
      if (liveText) node.textContent = liveText;
    });
  }

  function sendInstalledExtensionAction(extensionId, link, message) {
    if (!extensionId || !window.chrome || !chrome.runtime?.sendMessage) return;
    var finished = false;
    var fallback = link.href || '/skip-retyping/docs/getting-started/';
    link.setAttribute('aria-busy', 'true');

    var fallbackTimer = window.setTimeout(function () {
      if (!finished) window.location.assign(fallback);
    }, 1800);

    try {
      chrome.runtime.sendMessage(extensionId, message, function (response) {
        finished = true;
        window.clearTimeout(fallbackTimer);
        link.removeAttribute('aria-busy');
        var runtimeError = chrome.runtime.lastError;
        if (!runtimeError && response?.ok) return;
        window.location.assign(fallback);
      });
    } catch (error) {
      finished = true;
      window.clearTimeout(fallbackTimer);
      link.removeAttribute('aria-busy');
      window.location.assign(fallback);
    }
  }

  function applyInstalledExtensionState(extensionId) {
    var copy = currentInstalledCopy();
    root.dataset.skipRetypingInstalled = 'true';
    document.querySelectorAll('main a[href="/skip-retyping/download/"]').forEach(function (link) {
      var card = link.closest('[data-checkout-plan]');
      var checkout = link.closest('[data-skip-retyping-checkout]');
      var selectedPlan = checkout?.dataset.selectedPlan || 'free';
      var paidPlan = card
        ? card.getAttribute('data-checkout-plan') !== 'free'
        : link.hasAttribute('data-checkout-action') && selectedPlan !== 'free';
      var plan = card
        ? card.getAttribute('data-checkout-plan')
        : paidPlan
          ? selectedPlan
          : 'free';
      link.textContent = paidPlan ? copy[plan] || copy.lifetime : copy.open;
      link.href = '/skip-retyping/docs/getting-started/';
      link.dataset.installedAction = paidPlan ? 'upgrade' : 'installed';
      link.dataset.installedPlan = plan;
      link.title = copy.installedTitle;
      link.addEventListener('click', function (event) {
        event.preventDefault();
        sendInstalledExtensionAction(
          extensionId,
          link,
          paidPlan
            ? { action: 'openPublicPlan', plan: plan }
            : { action: 'openPublicSurface' },
        );
      });
    });
    var checkout = document.querySelector('[data-skip-retyping-checkout]');
    if (checkout && !checkout.querySelector('[data-installed-note]')) {
      var checkoutTitle = checkout.querySelector('#checkout-title');
      var checkoutLead = checkout.querySelector('.launch-lead');
      if (checkoutTitle) checkoutTitle.textContent = copy.checkoutTitle;
      if (checkoutLead) checkoutLead.textContent = copy.checkoutLead;
      var note = document.createElement('p');
      note.className = 'installed-extension-note';
      note.dataset.installedNote = 'true';
      note.setAttribute('role', 'status');
      note.textContent = copy.checkoutNote;
      var grid = checkout.querySelector('.checkout-grid');
      if (grid) grid.insertAdjacentElement('beforebegin', note);
    }
  }

  function detectInstalledExtension() {
    if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') return;
    var index = 0;
    function tryNext() {
      if (index >= SKIP_RETYPING_EXTENSION_IDS.length) return;
      var extensionId = SKIP_RETYPING_EXTENSION_IDS[index++];
      try {
        chrome.runtime.sendMessage(
          extensionId,
          { action: 'getPublicInstallState' },
          function (response) {
            if (response && response.installed === true) {
              applyInstalledExtensionState(extensionId);
              return;
            }
            tryNext();
          },
        );
      } catch (error) {
        tryNext();
      }
    }
    tryNext();
  }

  function setupCheckoutPlanState() {
    var checkout = document.querySelector('[data-skip-retyping-checkout]');
    if (!checkout) return;

    var allowedPlans = ['free', 'monthly', 'yearly', 'lifetime'];
    var selectedPlan = 'lifetime';
    try {
      var params = new URLSearchParams(window.location.search);
      var requested = (params.get('plan') || '').toLowerCase();
      if (allowedPlans.indexOf(requested) >= 0) selectedPlan = requested;
    } catch (error) {}

    checkout.dataset.selectedPlan = selectedPlan;
    var checkoutAction = checkout.querySelector('[data-checkout-action]');
    if (checkoutAction) {
      var actionLabels = SKIP_RETYPING_STORE_LINKS.chrome
        ? {
            free: 'Add to Chrome - free',
            monthly: 'Install, then choose Monthly',
            yearly: 'Install, then choose Yearly',
            lifetime: 'Install, then choose Lifetime',
          }
        : {
            free: 'Check Chrome availability',
            monthly: 'Check Chrome availability',
            yearly: 'Check Chrome availability',
            lifetime: 'Check Chrome availability',
          };
      checkoutAction.textContent = actionLabels[selectedPlan] || actionLabels.lifetime;
    }
    document.querySelectorAll('[data-checkout-plan]').forEach(function (card) {
      var matches =
        (card.getAttribute('data-checkout-plan') || '').toLowerCase() === selectedPlan;
      if (matches) {
        card.setAttribute('aria-current', 'true');
      } else {
        card.removeAttribute('aria-current');
      }
    });
  }

  function setupDemoPlayback() {
    var button = document.querySelector('.demo-play-button');
    var poster = document.querySelector('[data-skip-retyping-demo-poster]');
    if (!button || !poster) return;

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var video = document.createElement('video');
    video.width = 960;
    video.height = 540;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = false;
    video.preload = reduceMotion ? 'none' : 'metadata';
    video.poster = '/assets/skip-retyping-demo-poster.webp';
    var captions = document.createElement('track');
    captions.kind = 'captions';
    captions.srclang = 'en';
    captions.label = 'English';
    captions.src = '/assets/marketplace/localized/en/skip-retyping-store-demo-22s.vtt';
    video.appendChild(captions);
    video.setAttribute(
      'aria-label',
      'Skip Retyping filling a job application from a saved work profile',
    );
    var userChangedPlayback = false;

    function ensureVideoSource() {
      if (!video.getAttribute('src')) {
        video.src = '/assets/skip-retyping-demo.mp4';
      }
    }

    function setPlaybackState(isPlaying) {
      button.dataset.state = isPlaying ? 'playing' : 'paused';
      button.setAttribute(
        'aria-label',
        isPlaying ? 'Pause the Skip Retyping demo' : 'Play the Skip Retyping demo',
      );
      button.setAttribute(
        'title',
        isPlaying ? 'Pause the Skip Retyping demo' : 'Play the Skip Retyping demo',
      );
    }

    function playVideo() {
      ensureVideoSource();
      setPlaybackState(true);
      var playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(function () {
          setPlaybackState(false);
        });
      }
    }

    function togglePlayback(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      userChangedPlayback = true;
      if (video.paused) playVideo();
      else video.pause();
    }

    video.addEventListener('playing', function () {
      setPlaybackState(true);
    });
    video.addEventListener('pause', function () {
      setPlaybackState(false);
    });
    video.addEventListener(
      'error',
      function () {
        if (video.isConnected) video.replaceWith(poster);
        button.hidden = true;
      },
      { once: true },
    );
    video.addEventListener('click', togglePlayback);
    button.addEventListener('click', togglePlayback);
    poster.replaceWith(video);

    if (reduceMotion) {
      setPlaybackState(false);
    } else {
      setPlaybackState(true);
      var startAutoplayAfterLoad = function () {
        if (userChangedPlayback) return;
        window.requestAnimationFrame(playVideo);
      };
      if (document.readyState === 'complete') {
        startAutoplayAfterLoad();
      } else {
        window.addEventListener('load', startAutoplayAfterLoad, { once: true });
      }
    }
  }

  setTheme(getStoredTheme());
  if (mediaDark && mediaDark.addEventListener) {
    mediaDark.addEventListener('change', function () {
      if (getStoredTheme() === 'system') {
        setTheme('system');
      }
    });
  }

  function installProgressBar() {
    if (document.querySelector('.site-progress')) {
      return;
    }

    var progressBar = document.createElement('div');
    progressBar.className = 'site-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    body.appendChild(progressBar);
  }

  function setupScrollProgress() {
    var frame = 0;

    function update() {
      frame = 0;

      var scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        body.scrollHeight,
      );
      var scrollable = Math.max(scrollHeight - window.innerHeight, 0);
      var progress =
        scrollable === 0 ? 0 : Math.min(window.scrollY / scrollable, 1);

      root.style.setProperty('--scroll-progress', progress.toFixed(4));
    }

    function queueUpdate() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
  }

  function setupCopyCode() {
    document.querySelectorAll('pre.copyable').forEach(function (pre) {
      if (pre.querySelector('.copy-code')) {
        return;
      }

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      pre.appendChild(button);

      button.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = code ? code.textContent : pre.textContent;

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          return;
        }

        navigator.clipboard.writeText(text).then(function () {
          button.textContent = 'Copied';
          window.setTimeout(function () {
            button.textContent = 'Copy';
          }, 1500);
        });
      });
    });
  }

  function setupSmartRuleLab() {
    var lab = document.querySelector('[data-smart-rule-lab]');
    if (!lab) return;

    var labelInput = lab.querySelector('#ruleLabLabel');
    var matchInput = lab.querySelector('#ruleLabMatch');
    var result = lab.querySelector('[data-rule-result]');
    var examples = {
      email: ['Work email address', 'work email', 'the email saved in this profile'],
      company: ['Current employer', 'current employer', 'the company saved in this profile'],
      portfolio: ['Portfolio or personal website', 'portfolio', 'the portfolio URL saved in this profile'],
    };
    var valueDescription = examples.email[2];

    function evaluateRule() {
      var label = labelInput.value.trim();
      var match = matchInput.value.trim();
      var matched = false;

      if (match.charAt(0) === '/' && match.lastIndexOf('/') > 0) {
        var lastSlash = match.lastIndexOf('/');
        try {
          var expression = match.slice(1, lastSlash);
          var flags = match.slice(lastSlash + 1).replace(/[^dgimsuvy]/g, '');
          matched = expression.length <= 120 && new RegExp(expression, flags).test(label);
        } catch (error) {
          result.textContent = 'That regex is not valid yet. Plain text is easier for most rules.';
          result.classList.remove('is-match');
          return;
        }
      } else {
        matched = Boolean(match) && label.toLocaleLowerCase().indexOf(match.toLocaleLowerCase()) !== -1;
      }

      result.textContent = matched
        ? 'Match found. Skip Retyping would use ' + valueDescription + '.'
        : 'No match. Try a shorter, distinctive phrase from the form label.';
      result.classList.toggle('is-match', matched);
    }

    lab.querySelectorAll('[data-rule-example]').forEach(function (button) {
      button.addEventListener('click', function () {
        var example = examples[button.getAttribute('data-rule-example')];
        if (!example) return;
        labelInput.value = example[0];
        matchInput.value = example[1];
        valueDescription = example[2];
        evaluateRule();
        labelInput.focus();
      });
    });
    labelInput.addEventListener('input', evaluateRule);
    matchInput.addEventListener('input', evaluateRule);
  }

  function setupCurrentHashLink() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.quick-links a[href^="#"]'),
    );

    if (!links.length || !('IntersectionObserver' in window)) {
      return;
    }

    var items = links
      .map(function (link) {
        var target = document.querySelector(link.getAttribute('href'));
        return target ? { link: link, target: target } : null;
      })
      .filter(Boolean);

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (left, right) {
            return right.intersectionRatio - left.intersectionRatio;
          });

        if (!visible.length) {
          return;
        }

        items.forEach(function (item) {
          var active = item.target === visible[0].target;
          item.link.classList.toggle('is-active', active);
          if (active) {
            item.link.setAttribute('aria-current', 'true');
          } else {
            item.link.removeAttribute('aria-current');
          }
        });
      },
      {
        threshold: [0.22, 0.5, 0.75],
        rootMargin: '-16% 0px -54% 0px',
      },
    );

    items.forEach(function (item) {
      observer.observe(item.target);
    });
  }

  var lastHashScrollToken = '';

  function scrollToInitialHash(force) {
    if (!window.location.hash || window.location.hash.length < 2) {
      return;
    }

    var expectedHash = window.location.hash;

    if (!force && lastHashScrollToken === expectedHash) {
      return;
    }

    lastHashScrollToken = expectedHash;
    var id = window.location.hash.slice(1);

    try {
      id = decodeURIComponent(id);
    } catch (error) {
      return;
    }

    var target = document.getElementById(id);

    if (!target) {
      return;
    }

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    function getTargetTop() {
      var header = document.querySelector('.site-header, .launch-header');
      var headerOffset = header ? header.getBoundingClientRect().height + 20 : 92;
      return {
        offset: headerOffset,
        top: target.getBoundingClientRect().top + window.scrollY - headerOffset,
      };
    }

    function scroll() {
      if (window.location.hash !== expectedHash) {
        return;
      }

      var position = getTargetTop();
      var top = Math.max(position.top, 0);
      var previousBehavior = root.style.scrollBehavior;

      root.style.scrollBehavior = 'auto';
      document.documentElement.scrollTop = top;
      body.scrollTop = top;
      window.scrollTo(0, top);

      window.setTimeout(function () {
        root.style.scrollBehavior = previousBehavior;
      }, 0);
    }

    var attempts = 0;

    function settleScroll() {
      if (window.location.hash !== expectedHash) {
        return;
      }

      scroll();
      attempts += 1;

      var position = getTargetTop();
      var targetDistance = Math.abs(target.getBoundingClientRect().top - position.offset);

      if (attempts < 16 && targetDistance > 8) {
        window.setTimeout(settleScroll, 250);
      }
    }

    window.requestAnimationFrame(scroll);
    window.setTimeout(scroll, 100);
    window.setTimeout(scroll, 350);
    window.setTimeout(scroll, 900);
    window.setTimeout(scroll, 1800);
    window.setTimeout(settleScroll, 2200);
  }

  function ready(callback) {
    if (document.readyState === 'complete') {
      window.setTimeout(callback, 0);
      return;
    }
    window.addEventListener('load', callback, { once: true });
  }

  installProgressBar();
  setupScrollProgress();
  installThemeToggle();
  ready(function () {
    configureStoreLinks();
    setupCheckoutPlanState();
    detectInstalledExtension();
    setupDemoPlayback();
    setupCopyCode();
    setupSmartRuleLab();
    setupCurrentHashLink();
    scrollToInitialHash();
  });
  window.setTimeout(scrollToInitialHash, 0);
  window.setTimeout(scrollToInitialHash, 500);
  window.addEventListener('load', scrollToInitialHash, { once: true });
  window.addEventListener('hashchange', function () {
    scrollToInitialHash(true);
  });

  var hashPolls = 0;
  var hashPoller = window.setInterval(function () {
    hashPolls += 1;
    scrollToInitialHash();

    if (hashPolls >= 24 || lastHashScrollToken) {
      window.clearInterval(hashPoller);
    }
  }, 250);
})();
