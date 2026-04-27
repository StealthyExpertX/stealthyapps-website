(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointerQuery = window.matchMedia('(pointer: fine)');
  var coarsePointerQuery = window.matchMedia('(pointer: coarse)');

  function syncPointerClass() {
    root.classList.toggle(
      'coarse-pointer',
      coarsePointerQuery.matches && !finePointerQuery.matches,
    );
  }

  syncPointerClass();

  if (typeof coarsePointerQuery.addEventListener === 'function') {
    coarsePointerQuery.addEventListener('change', syncPointerClass);
  } else if (typeof coarsePointerQuery.addListener === 'function') {
    coarsePointerQuery.addListener(syncPointerClass);
  }

  if (typeof finePointerQuery.addEventListener === 'function') {
    finePointerQuery.addEventListener('change', syncPointerClass);
  } else if (typeof finePointerQuery.addListener === 'function') {
    finePointerQuery.addListener(syncPointerClass);
  }

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

      var scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        body.scrollHeight,
      );
      var visibleHeight = window.innerHeight;
      var scrollable = Math.max(scrollHeight - visibleHeight, 0);
      var progress =
        scrollable === 0 ? 0 : Math.min(window.scrollY / scrollable, 1);

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
      '.page > .boundary-card',
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
      element.style.setProperty(
        '--reveal-delay',
        String(Math.min((index % 7) * 55, 330)) + 'ms',
      );
    });

    if (reduceMotionQuery.matches || !('IntersectionObserver' in window)) {
      targets.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

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
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    targets.forEach(function (element) {
      observer.observe(element);
    });
  }

  function setupCardSpots() {
    if (reduceMotionQuery.matches) {
      return;
    }

    var cardSelector =
      '.surface, .boundary-card, .contact-card, .feature-card, .info-card, .support-card, .policy-card, .release-card, .mini-card';
    var cards = document.querySelectorAll(cardSelector);

    function setupCoarseCardSpots() {
      var driftFrame = 0;

      function queueDrift() {
        if (driftFrame) {
          return;
        }

        driftFrame = window.requestAnimationFrame(function () {
          driftFrame = 0;

          cards.forEach(function (card, index) {
            if (card.classList.contains('is-touch-active')) {
              return;
            }

            var rect = card.getBoundingClientRect();

            if (rect.bottom < 0 || rect.top > window.innerHeight) {
              return;
            }

            var center = rect.top + rect.height * 0.5;
            var ratio = Math.max(0, Math.min(center / window.innerHeight, 1));
            var driftX = 24 + (index % 3) * 22 + (1 - ratio) * 8;
            var driftY = 16 + ratio * 48;

            card.style.setProperty('--spot-x', driftX.toFixed(2) + '%');
            card.style.setProperty('--spot-y', driftY.toFixed(2) + '%');
          });
        });
      }

      cards.forEach(function (card, index) {
        var resetTimer = 0;
        var baseAlpha =
          card.matches('.page-hero-copy, .hero-copy') ? '0.12' : '0.072';

        card.style.setProperty('--spot-alpha', baseAlpha);
        card.style.setProperty('--spot-x', String(26 + (index % 3) * 20) + '%');
        card.style.setProperty('--spot-y', String(18 + (index % 4) * 10) + '%');

        function setTouchSpot(clientX, clientY, alpha) {
          var rect = card.getBoundingClientRect();
          var nextX = ((clientX - rect.left) / rect.width) * 100;
          var nextY = ((clientY - rect.top) / rect.height) * 100;
          var clampedX = Math.max(8, Math.min(nextX, 92));
          var clampedY = Math.max(8, Math.min(nextY, 92));

          card.style.setProperty('--spot-alpha', alpha);
          card.style.setProperty('--spot-x', clampedX.toFixed(2) + '%');
          card.style.setProperty('--spot-y', clampedY.toFixed(2) + '%');
        }

        function restoreBaseGlow(delay) {
          window.clearTimeout(resetTimer);

          resetTimer = window.setTimeout(function () {
            card.classList.remove('is-touch-active');
            card.style.setProperty('--spot-alpha', baseAlpha);
            queueDrift();
          }, delay);
        }

        function handlePointerDown(event) {
          if (
            event.pointerType &&
            event.pointerType !== 'touch' &&
            event.pointerType !== 'pen'
          ) {
            return;
          }

          card.classList.add('is-touch-active');
          setTouchSpot(event.clientX, event.clientY, '0.18');
          restoreBaseGlow(320);
        }

        function handlePointerMove(event) {
          if (
            event.pointerType &&
            event.pointerType !== 'touch' &&
            event.pointerType !== 'pen'
          ) {
            return;
          }

          if (!card.classList.contains('is-touch-active')) {
            return;
          }

          setTouchSpot(event.clientX, event.clientY, '0.16');
        }

        function handlePointerEnd() {
          restoreBaseGlow(220);
        }

        function handleTouchStart(event) {
          if (window.PointerEvent) {
            return;
          }

          var touch = event.touches && event.touches[0];

          if (!touch) {
            return;
          }

          card.classList.add('is-touch-active');
          setTouchSpot(touch.clientX, touch.clientY, '0.18');
          restoreBaseGlow(320);
        }

        function handleTouchMove(event) {
          if (window.PointerEvent || !card.classList.contains('is-touch-active')) {
            return;
          }

          var touch = event.touches && event.touches[0];

          if (!touch) {
            return;
          }

          setTouchSpot(touch.clientX, touch.clientY, '0.16');
        }

        card.addEventListener('pointerdown', handlePointerDown, {
          passive: true,
        });
        card.addEventListener('pointermove', handlePointerMove, {
          passive: true,
        });
        card.addEventListener('pointerup', handlePointerEnd, {
          passive: true,
        });
        card.addEventListener('pointercancel', handlePointerEnd, {
          passive: true,
        });

        card.addEventListener('touchstart', handleTouchStart, {
          passive: true,
        });
        card.addEventListener('touchmove', handleTouchMove, {
          passive: true,
        });
        card.addEventListener('touchend', handlePointerEnd, {
          passive: true,
        });
        card.addEventListener('touchcancel', handlePointerEnd, {
          passive: true,
        });
      });

      queueDrift();
      window.addEventListener('scroll', queueDrift, { passive: true });
      window.addEventListener('resize', queueDrift);
    }

    if (!finePointerQuery.matches) {
      if (coarsePointerQuery.matches) {
        setupCoarseCardSpots();
      }

      return;
    }

    var activeCard = null;
    var globalFrame = 0;
    var globalEvent = null;

    function setCardSpot(card, event) {
      var rect = card.getBoundingClientRect();
      var nextX = ((event.clientX - rect.left) / rect.width) * 100;
      var nextY = ((event.clientY - rect.top) / rect.height) * 100;

      card.style.setProperty('--spot-alpha', '0.16');
      card.style.setProperty('--spot-x', nextX.toFixed(2) + '%');
      card.style.setProperty('--spot-y', nextY.toFixed(2) + '%');
    }

    function resetCardSpot(card) {
      card.style.setProperty('--spot-alpha', '0.035');
      card.style.setProperty('--spot-x', '50%');
      card.style.setProperty('--spot-y', '50%');
    }

    function renderGlobalSpot() {
      var event = globalEvent;
      var target =
        event && event.target && event.target.closest
          ? event.target.closest(cardSelector)
          : null;

      globalFrame = 0;

      if (!target) {
        if (activeCard) {
          resetCardSpot(activeCard);
          activeCard = null;
        }

        return;
      }

      if (activeCard && activeCard !== target) {
        resetCardSpot(activeCard);
      }

      activeCard = target;
      setCardSpot(target, event);
    }

    function queueGlobalSpot(event) {
      globalEvent = event;

      if (globalFrame) {
        return;
      }

      globalFrame = window.requestAnimationFrame(renderGlobalSpot);
    }

    document.addEventListener('pointermove', queueGlobalSpot, {
      passive: true,
    });
    document.addEventListener('mousemove', queueGlobalSpot, { passive: true });
    document.addEventListener('mouseleave', function () {
      if (activeCard) {
        resetCardSpot(activeCard);
        activeCard = null;
      }
    });

    document
      .querySelectorAll('.page-hero-copy, .hero-copy')
      .forEach(function (heroCard) {
        heroCard.addEventListener(
          'mousemove',
          function (event) {
            setCardSpot(heroCard, event);
          },
          { passive: true },
        );

        heroCard.addEventListener(
          'pointermove',
          function (event) {
            setCardSpot(heroCard, event);
          },
          { passive: true },
        );

        heroCard.addEventListener('mouseenter', function () {
          heroCard.style.setProperty('--spot-alpha', '0.16');
        });

        heroCard.addEventListener('pointerenter', function () {
          heroCard.style.setProperty('--spot-alpha', '0.16');
        });

        heroCard.addEventListener('mouseleave', function () {
          resetCardSpot(heroCard);
        });

        heroCard.addEventListener('pointerleave', function () {
          resetCardSpot(heroCard);
        });
      });

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

      function handleEnter() {
        card.style.setProperty('--spot-alpha', '0.16');
      }

      function handleMove(event) {
        var rect = card.getBoundingClientRect();
        var nextX = ((event.clientX - rect.left) / rect.width) * 100;
        var nextY = ((event.clientY - rect.top) / rect.height) * 100;

        queueRender(nextX, nextY);
      }

      function handleLeave() {
        card.style.setProperty('--spot-alpha', '0.035');
        queueRender(50, 50);
      }

      card.addEventListener('pointerenter', handleEnter);
      card.addEventListener('mouseenter', handleEnter);

      card.addEventListener('pointermove', handleMove, { passive: true });

      card.addEventListener('mousemove', handleMove, { passive: true });

      card.addEventListener('pointerleave', handleLeave);
      card.addEventListener('mouseleave', handleLeave);
    });
  }

  function setupQuickLinkState() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.quick-links a[href^="#"]'),
    );

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

    var observer = new IntersectionObserver(
      function (entries) {
        var visible = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (left, right) {
            return right.intersectionRatio - left.intersectionRatio;
          });

        if (visible.length > 0) {
          markActive(visible[0].target);
        }
      },
      {
        threshold: [0.2, 0.45, 0.7],
        rootMargin: '-18% 0px -52% 0px',
      },
    );

    items.forEach(function (item) {
      observer.observe(item.target);
    });

    markActive(items[0].target);
  }

  installProgressBar();
  setupScrollProgress();
  setupReveal();
  setupCardSpots();
  setupQuickLinkState();
})();
