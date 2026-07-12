(function () {
  var started = false;
  var queued = false;
  var fallbackTimer = 0;
  var eventOptions = { passive: true };
  var intentEvents = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown', 'focusin'];

  function removeIntentListeners() {
    intentEvents.forEach(function (eventName) {
      window.removeEventListener(eventName, queueScene, eventOptions);
    });
  }

  function startScene() {
    if (started) return;
    started = true;
    window.clearTimeout(fallbackTimer);
    import('./fillpro-hero-scene.js').catch(function () {
      document.documentElement.classList.add('hero-3d-failed');
    });
  }

  function queueScene() {
    if (queued || started) return;
    queued = true;
    removeIntentListeners();
    window.setTimeout(function () {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(startScene, { timeout: 1800 });
      } else {
        window.setTimeout(startScene, 120);
      }
    }, 700);
  }

  intentEvents.forEach(function (eventName) {
    window.addEventListener(eventName, queueScene, eventOptions);
  });

  // Static readers still get the scene eventually without delaying initial work.
  fallbackTimer = window.setTimeout(queueScene, 12000);

  window.addEventListener(
    'pagehide',
    function () {
      window.clearTimeout(fallbackTimer);
      removeIntentListeners();
    },
    { once: true },
  );
})();
