(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

  var THEME_KEY = 'fillpro-theme';
  var THEMES = ['system', 'light', 'dark'];
  // Add the approved marketplace URLs here once each listing is public.
  // Every data-fillpro-store link on the site will switch automatically.
  var FILLPRO_STORE_LINKS = {
    chrome: '',
    edge: '',
    firefox: '',
  };
  // Add the final Chrome and Edge store IDs here after marketplace approval.
  var FILLPRO_EXTENSION_IDS = [
    'hklppjjdpnndpdahnfpjpamhefgcolai',
    'fjgpmpnjfpmjdckmachaolobhjekencl',
    'gdnljemokcmlnglhlblafbolkhhcipld',
  ];
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
      open: 'Open FillPro',
      monthly: 'Choose monthly in FillPro',
      yearly: 'Choose yearly in FillPro',
      lifetime: 'Choose lifetime in FillPro',
      installedTitle: 'FillPro is installed in this browser.',
      checkoutTitle: 'FillPro is installed. Choose free or Pro.',
      checkoutLead: 'Keep the free plan, or add Pro for up to 500 profiles, backups, and profile duplication.',
      checkoutNote: 'Use the FillPro toolbar button to create a profile, fill a page, or manage Pro.',
    },
    de: { open: 'FillPro öffnen', installedTitle: 'FillPro ist in diesem Browser installiert.' },
    es: { open: 'Abrir FillPro', installedTitle: 'FillPro está instalado en este navegador.' },
    fr: { open: 'Ouvrir FillPro', installedTitle: 'FillPro est installé dans ce navigateur.' },
    'pt-br': { open: 'Abrir o FillPro', installedTitle: 'O FillPro está instalado neste navegador.' },
    ja: { open: 'FillPro を開く', installedTitle: 'FillPro はこのブラウザーにインストールされています。' },
    ko: { open: 'FillPro 열기', installedTitle: '이 브라우저에 FillPro가 설치되어 있습니다.' },
    'zh-cn': { open: '打开 FillPro', installedTitle: '此浏览器已安装 FillPro。' },
    ru: { open: 'Открыть FillPro', installedTitle: 'FillPro установлен в этом браузере.' },
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
    document.querySelectorAll('[data-fillpro-store]').forEach(function (link) {
      var store = (link.getAttribute('data-fillpro-store') || '').toLowerCase();
      var url = FILLPRO_STORE_LINKS[store];
      if (!url) {
        link.dataset.storeState = 'pending';
        return;
      }

      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.dataset.storeState = 'live';
      var liveLabel = link.getAttribute('data-live-label');
      if (liveLabel) link.textContent = liveLabel;
    });

    document.querySelectorAll('[data-store-live-copy]').forEach(function (node) {
      var store = (node.getAttribute('data-store-live-copy') || '').toLowerCase();
      if (!FILLPRO_STORE_LINKS[store]) return;
      var liveText = node.getAttribute('data-live-text');
      if (liveText) node.textContent = liveText;
    });
  }

  function sendInstalledExtensionAction(extensionId, link, message) {
    if (!extensionId || !window.chrome || !chrome.runtime?.sendMessage) return;
    var finished = false;
    var fallback = link.href || '/fillpro/docs/getting-started/';
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
    root.dataset.fillproInstalled = 'true';
    document.querySelectorAll('main a[href="/fillpro/download/"]').forEach(function (link) {
      var card = link.closest('[data-checkout-plan]');
      var checkout = link.closest('[data-fillpro-checkout]');
      var selectedPlan = checkout?.dataset.selectedPlan || 'free';
      var paidPlan = card
        ? card.getAttribute('data-checkout-plan') !== 'free'
        : link.hasAttribute('data-checkout-action') && selectedPlan !== 'free';
      var plan = card
        ? card.getAttribute('data-checkout-plan')
        : paidPlan
          ? selectedPlan
          : 'free';
      link.textContent = paidPlan ? copy[plan] || copy.yearly : copy.open;
      link.href = '/fillpro/docs/getting-started/';
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
    var checkout = document.querySelector('[data-fillpro-checkout]');
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
      if (index >= FILLPRO_EXTENSION_IDS.length) return;
      var extensionId = FILLPRO_EXTENSION_IDS[index++];
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
    var checkout = document.querySelector('[data-fillpro-checkout]');
    if (!checkout) return;

    var allowedPlans = ['free', 'monthly', 'yearly', 'lifetime'];
    var selectedPlan = 'yearly';
    try {
      var params = new URLSearchParams(window.location.search);
      var requested = (params.get('plan') || '').toLowerCase();
      if (allowedPlans.indexOf(requested) >= 0) selectedPlan = requested;
    } catch (error) {}

    checkout.dataset.selectedPlan = selectedPlan;
    var checkoutAction = checkout.querySelector('[data-checkout-action]');
    if (checkoutAction) {
      var actionLabels = {
        free: 'Install FillPro',
        monthly: 'Install, then choose monthly',
        yearly: 'Install, then choose yearly',
        lifetime: 'Install, then choose lifetime',
      };
      checkoutAction.textContent = actionLabels[selectedPlan] || actionLabels.yearly;
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
    var poster = document.querySelector('[data-fillpro-demo-poster]');
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
    video.autoplay = !reduceMotion;
    video.preload = 'auto';
    video.poster = '/assets/fillpro-demo-poster.png';
    video.src = '/assets/fillpro-demo.mp4';
    video.setAttribute(
      'aria-label',
      'FillPro filling a vendor onboarding form from a saved work profile',
    );

    function setPlaybackState(isPlaying) {
      button.dataset.state = isPlaying ? 'playing' : 'paused';
      button.setAttribute(
        'aria-label',
        isPlaying ? 'Pause the FillPro demo' : 'Play the FillPro demo',
      );
      button.setAttribute(
        'title',
        isPlaying ? 'Pause the FillPro demo' : 'Play the FillPro demo',
      );
    }

    function playVideo() {
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
      playVideo();
    }
  }

  function setupInteractiveBackdrop() {
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer =
      !window.matchMedia ||
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduceMotion || !finePointer) {
      root.classList.remove('pointer-glow-active');
      return;
    }

    var glow = document.querySelector('.site-pointer-glow');
    if (!glow) {
      glow = document.createElement('div');
      glow.className = 'site-pointer-glow';
      glow.setAttribute('aria-hidden', 'true');
      body.appendChild(glow);
    }

    var frame = 0;
    var nextX = window.innerWidth * 0.5;
    var nextY = window.innerHeight * 0.18;

    function updatePointer() {
      frame = 0;
      root.style.setProperty('--pointer-x', Math.round(nextX) + 'px');
      root.style.setProperty('--pointer-y', Math.round(nextY) + 'px');
      root.classList.add('pointer-glow-active');
    }

    function hidePointer() {
      root.classList.remove('pointer-glow-active');
    }

    window.addEventListener(
      'pointermove',
      function (event) {
        nextX = Math.max(0, Math.min(window.innerWidth, event.clientX));
        nextY = Math.max(0, Math.min(window.innerHeight, event.clientY));
        if (!frame) {
          frame = window.requestAnimationFrame(updatePointer);
        }
      },
      { passive: true },
    );
    document.documentElement.addEventListener('pointerleave', hidePointer, { passive: true });
    window.addEventListener('blur', hidePointer);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hidePointer();
    });
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

    update();
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
        ? 'Match found. FillPro would use ' + valueDescription + '.'
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

  function setupScrollReveals() {
    if (!body.classList.contains('fillpro-launch')) {
      return;
    }
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      return;
    }

    var revealSelectors = [
      '.launch-strip',
      '.launch-section',
      '.launch-band',
      '.launch-final',
      '.browser-download-card',
      '.launch-use-grid article',
      '.workflow-list article',
      '.support-columns article',
      '.compare-lanes article',
      '.price-card',
      '.launch-faq-list details',
      '.privacy-snapshot',
      '.privacy-card',
      '.privacy-lane-grid article',
      '.privacy-plain',
      '.card',
      '.surface',
      '.contact-card',
      '.feature-card',
      '.support-card',
      '.info-card',
      '.policy-card',
      '.boundary-card',
      '.mini-card',
      '.preview-card',
    ].join(',');
    var items = Array.prototype.slice.call(
      document.querySelectorAll(revealSelectors),
    );
    if (!items.length) {
      return;
    }

    root.classList.add('reveal-ready');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    items.forEach(function (item, index) {
      item.classList.add('reveal-item');
      item.style.setProperty('--reveal-delay', (index % 4) * 45 + 'ms');
      observer.observe(item);
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
      var header = document.querySelector('.site-header, .premium-header, .launch-header');
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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
      return;
    }

    callback();
  }

  installProgressBar();
  setupScrollProgress();
  ready(function () {
    configureStoreLinks();
    setupCheckoutPlanState();
    detectInstalledExtension();
    setupDemoPlayback();
    installThemeToggle();
    setupInteractiveBackdrop();
    setupCopyCode();
    setupSmartRuleLab();
    setupCurrentHashLink();
    setupScrollReveals();
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
