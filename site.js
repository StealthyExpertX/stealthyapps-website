(function () {
  var root = document.documentElement;
  var body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add('js-enhanced');

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
    setupCopyCode();
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
