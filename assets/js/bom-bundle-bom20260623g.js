/* BOM Analytics bom20260623g-depth-guard wrapper */
(function (global) {
  'use strict';
  var BUILD = 'bom20260623g';
  var BASE_BUILD = 'bom20260623f';
  var MIN_DEPTH = 3;

  function baseUrl() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i] && scripts[i].src;
      if (src && src.indexOf('/assets/js/bom-bundle-' + BUILD + '.js') >= 0) {
        return src.split('/assets/js/bom-bundle-' + BUILD + '.js')[0] + '/';
      }
    }
    return 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';
  }

  function applyDepth() {
    try {
      var r = global.__3DX_UI_ROOT__ || document;
      var input = r && r.querySelector ? r.querySelector('#skaDepthInput') : null;
      if (!input) return;
      var current = parseInt(String(input.value || '').trim(), 10);
      if (isNaN(current) || current < MIN_DEPTH) input.value = String(MIN_DEPTH);
      input.min = String(MIN_DEPTH);
      if (!input.max || parseInt(input.max, 10) < MIN_DEPTH) input.max = '20';
    } catch (e) {}
  }

  function loadBase() {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.charset = 'UTF-8';
      s.src = baseUrl() + 'assets/js/bom-bundle-' + BASE_BUILD + '.js?v=' + encodeURIComponent(BUILD + '-' + Date.now());
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Falha ao carregar bundle base ' + BASE_BUILD)); };
      document.getElementsByTagName('head')[0].appendChild(s);
    });
  }

  function wrapController() {
    var ctl = global.__bomWafSessionController;
    if (!ctl || ctl.__depthGuardWrapped) return;
    ['boot', 'sync', 'refresh'].forEach(function (name) {
      if (typeof ctl[name] !== 'function') return;
      var original = ctl[name];
      ctl[name] = function () {
        applyDepth();
        var result = original.apply(ctl, arguments);
        if (result && typeof result.finally === 'function') {
          return result.finally(applyDepth);
        }
        applyDepth();
        return result;
      };
    });
    ctl.__depthGuardWrapped = true;
  }

  global.__BOM_BUNDLE_ID__ = BUILD;
  global.__BOM_BUNDLE_LOADED__ = true;
  loadBase().then(function () {
    applyDepth();
    wrapController();
    setTimeout(applyDepth, 100);
    setTimeout(applyDepth, 500);
  }).catch(function (error) {
    var root = global.__3DX_UI_ROOT__ || document;
    var bar = root.querySelector && root.querySelector('#statusBar');
    if (bar) bar.textContent = error.message || String(error);
  });
})(window);
