/**
 * Bootstrap de assets — Additional App / 3DDashboard (domínio 3DEXPERIENCE).
 * HTML injetado no iframe confiável; arquivos ficam no GitHub Pages.
 */
(function (global) {
  'use strict';

  var REPO = 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';
  var host = (global.location && global.location.hostname)
    ? global.location.hostname.toLowerCase()
    : '';
  var onGithub = host.indexOf('github.io') >= 0;
  var onLocal = host === 'localhost' || host === '127.0.0.1';
  var on3dx = host.indexOf('3dexperience.3ds.com') >= 0;

  global.__3DX_REPO_BASE__ = REPO;
  global.__3DX_USE_LOCAL_ASSETS__ = onGithub || onLocal;

  if (!onGithub && !onLocal) {
    var base = document.createElement('base');
    base.href = REPO;
    document.head.appendChild(base);
    global.__3DX_ASSET_ROOT__ = REPO + 'assets/';
  } else {
    global.__3DX_ASSET_ROOT__ = 'assets/';
  }

  global.__3DX_ON_3DX_HOST__ = on3dx;

  function loadScript(src) {
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    document.head.appendChild(s);
  }

  var prefix = global.__3DX_USE_LOCAL_ASSETS__ ? '' : REPO;
  loadScript(prefix + 'assets/vendor/chart.umd.min.js');
  loadScript(prefix + 'assets/vendor/xlsx.full.min.js');
})(typeof window !== 'undefined' ? window : this);
