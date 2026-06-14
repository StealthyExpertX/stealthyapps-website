(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

  var THEME_KEY = 'fillpro-theme';
  var THEMES = ['system', 'light', 'dark'];
  var mediaDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  var themeButton = null;

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

    var label =
      next === 'system'
        ? 'Theme: system'
        : next === 'dark'
          ? 'Theme: dark'
          : 'Theme: light';
    themeButton.setAttribute('aria-label', label + '. Switch theme.');
    themeButton.setAttribute('title', label);
    themeButton.dataset.theme = next;
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

  function setupInteractiveBackdrop() {
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      return;
    }

    var frame = 0;
    var nextX = 50;
    var nextY = 18;

    function updatePointer() {
      frame = 0;
      root.style.setProperty('--pointer-x', nextX.toFixed(1) + '%');
      root.style.setProperty('--pointer-y', nextY.toFixed(1) + '%');
    }

    window.addEventListener(
      'pointermove',
      function (event) {
        nextX = Math.max(0, Math.min(100, (event.clientX / window.innerWidth) * 100));
        nextY = Math.max(0, Math.min(100, (event.clientY / window.innerHeight) * 100));
        if (!frame) {
          frame = window.requestAnimationFrame(updatePointer);
        }
      },
      { passive: true },
    );
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
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      return;
    }

    var revealSelectors = [
      '.launch-strip',
      '.launch-demo-card',
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
    installThemeToggle();
    setupInteractiveBackdrop();
    setupCopyCode();
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
