(function () {
  'use strict';

  var target = document.documentElement.getAttribute('data-redirect-target');
  if (!target || target.charAt(0) !== '/') return;

  window.location.replace(target + window.location.search + window.location.hash);
})();
