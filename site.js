(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointerQuery = window.matchMedia('(pointer: fine)');

  function setRootVar(name, value) {
    root.style.setProperty(name, value);
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

      var scrollHeight = Math.max(document.documentElement.scrollHeight, body.scrollHeight);
      var visibleHeight = window.innerHeight;
      var scrollable = Math.max(scrollHeight - visibleHeight, 0);
      var progress = scrollable === 0 ? 0 : Math.min(window.scrollY / scrollable, 1);

      setRootVar('--scroll-progress', progress.toFixed(4));
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

  function setupReveal() {
    var selectors = [
      '.page-hero > *',
      '.section-shell > .section-heading',
      '.section-shell > .info-grid > *',
      '.section-shell > .feature-grid > *',
      '.section-shell > .plan-grid > *',
      '.section-shell > .boundary-card',
      '.split-layout > *',
      '.support-grid > *',
      '.contact-card',
      '.page > .boundary-card'
    ];
    var seen = new Set();
    var targets = [];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (seen.has(element)) {
          return;
        }

        seen.add(element);
        targets.push(element);
      });
    });

    targets.forEach(function (element, index) {
      element.setAttribute('data-reveal', '');
      element.style.setProperty('--reveal-delay', String(Math.min((index % 7) * 55, 330)) + 'ms');
    });

    if (reduceMotionQuery.matches || !('IntersectionObserver' in window)) {
      targets.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px'
    });

    targets.forEach(function (element) {
      observer.observe(element);
    });
  }

  function setupAmbientGlow() {
    if (reduceMotionQuery.matches || !finePointerQuery.matches) {
      return;
    }

    var frame = 0;
    var glowX = 50;
    var glowY = 18;

    function render() {
      frame = 0;
      setRootVar('--page-glow-x', glowX.toFixed(2) + '%');
      setRootVar('--page-glow-y', glowY.toFixed(2) + '%');
    }

    window.addEventListener('pointermove', function (event) {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }

      glowX = (event.clientX / window.innerWidth) * 100;
      glowY = Math.max(10, (event.clientY / window.innerHeight) * 100);

      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(render);
    }, { passive: true });
  }

  function setupCardSpots() {
    if (reduceMotionQuery.matches || !finePointerQuery.matches) {
      return;
    }

    var cards = document.querySelectorAll('.surface, .boundary-card, .contact-card, .feature-card, .info-card, .support-card, .policy-card, .release-card, .mini-card');

    cards.forEach(function (card) {
      var frame = 0;
      var spotX = 50;
      var spotY = 50;

      function render() {
        frame = 0;
        card.style.setProperty('--spot-x', spotX.toFixed(2) + '%');
        card.style.setProperty('--spot-y', spotY.toFixed(2) + '%');
      }

      function queueRender(nextX, nextY) {
        spotX = nextX;
        spotY = nextY;

        if (frame) {
          return;
        }

        frame = window.requestAnimationFrame(render);
      }

      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var nextX = ((event.clientX - rect.left) / rect.width) * 100;
        var nextY = ((event.clientY - rect.top) / rect.height) * 100;

        queueRender(nextX, nextY);
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        queueRender(50, 50);
      });
    });
  }

  function setupQuickLinkState() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.quick-links a[href^="#"]'));

    if (links.length === 0) {
      return;
    }

    var items = links
      .map(function (link) {
        var target = document.querySelector(link.getAttribute('href'));
        return target ? { link: link, target: target } : null;
      })
      .filter(Boolean);

    if (items.length === 0) {
      return;
    }

    function markActive(activeTarget) {
      items.forEach(function (item) {
        var isActive = item.target === activeTarget;
        item.link.classList.toggle('is-active', isActive);

        if (isActive) {
          item.link.setAttribute('aria-current', 'true');
        } else {
          item.link.removeAttribute('aria-current');
        }
      });
    }

    if (!('IntersectionObserver' in window)) {
      markActive(items[0].target);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (left, right) { return right.intersectionRatio - left.intersectionRatio; });

      if (visible.length > 0) {
        markActive(visible[0].target);
      }
    }, {
      threshold: [0.2, 0.45, 0.7],
      rootMargin: '-18% 0px -52% 0px'
    });

    items.forEach(function (item) {
      observer.observe(item.target);
    });

    markActive(items[0].target);
  }

  installProgressBar();
  setupScrollProgress();
  setupReveal();
  setupAmbientGlow();
  setupCardSpots();
  setupQuickLinkState();
}());