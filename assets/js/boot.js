/**
 * @file boot.js
 * Entrada UWA (Additional App) — monta UI em widget.body e carrega módulos em ordem.
 * Deve ser invocado apenas de script inline (widget.addEvent onLoad), conforme CAA DS.
 */
var BomBoot = (function (global) {
  'use strict';

  var REPO = 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';
  var VER = 'uwa20260621e';

  var SCRIPTS = [
    'assets/js/config.js',
    'assets/js/platform/widget-runtime.js',
    'assets/js/platform/platform-bridge.js',
    'assets/js/platform/context.js',
    'assets/js/platform/compass.js',
    'assets/js/platform/waf-bootstrap.js',
    'assets/js/platform/waf-client.js',
    'assets/js/integration/3dx-content-parser.js',
    'assets/js/integration/enovia-api.js',
    'assets/js/integration/product-explorer-bridge.js',
    'assets/js/integration/explorer-context.js',
    'assets/js/integration/product-explorer-sync-provider.js',
    'assets/js/services/attribute-service.js',
    'assets/js/services/physical-product-service.js',
    'assets/js/services/file-import-service.js',
    'assets/js/services/bom-snapshot.js',
    'assets/js/services/explorer-scanner.js',
    'assets/js/services/bom-service.js',
    'assets/js/processing/bom-normalizer.js',
    'assets/js/processing/metrics-engine.js',
    'assets/js/processing/anomaly-detector.js',
    'assets/js/ui/kpi-cards.js',
    'assets/js/ui/charts-manager.js',
    'assets/js/ui/filters.js',
    'assets/js/ui/data-table.js',
    'assets/js/ui/explorer-sync-panel.js',
    'assets/js/ui/snapshot-panel.js',
    'assets/js/app.js',
    'assets/js/bom-waf-session-controller-bom20260621e.js'
  ];

  function scriptUrl(path) {
    var host = (global.location && global.location.hostname) || '';
    var local = host === 'localhost' || host === '127.0.0.1';
    var github = host.indexOf('github.io') >= 0;
    if (local || github) return path + '?v=' + VER;
    return REPO + path + '?v=' + VER;
  }

  function loadCss() {
    var host = (global.location && global.location.hostname) || '';
    var local = host === 'localhost' || host === '127.0.0.1';
    var github = host.indexOf('github.io') >= 0;
    var href = (local || github ? '' : REPO) + 'assets/css/dashboard.css?v=' + VER;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  function mountBody(target) {
    var tpl = document.getElementById('bom-app-template');
    if (!tpl || !target) return false;
    target.innerHTML = tpl.innerHTML;
    target.className = 'ui-explorer-only';
    return true;
  }

  function loadScript(i, done, errors) {
    errors = errors || [];
    if (i >= SCRIPTS.length) {
      done(errors);
      return;
    }
    var s = document.createElement('script');
    s.src = scriptUrl(SCRIPTS[i]);
    s.async = false;
    s.onload = function () { loadScript(i + 1, done, errors); };
    s.onerror = function () {
      errors.push(SCRIPTS[i]);
      loadScript(i + 1, done, errors);
    };
    document.head.appendChild(s);
  }

  function setBootStatus(msg) {
    var bar = document.getElementById('statusBar');
    if (bar) bar.textContent = msg;
  }

  function run(mountTarget) {
    global.__3DX_TRUSTED_WIDGET__ = true;
    global.__3DX_BOOT_DEFER__ = true;
    global.APP_CONFIG = global.APP_CONFIG || {};
    if (global.APP_CONFIG) {
      global.APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
      global.APP_CONFIG.WIDGET_MODE = 'additional_app';
    }

    loadCss();
    var target = mountTarget || document.body;
    if (!mountBody(target)) {
      setBootStatus('Erro: template BOM não encontrado.');
      return;
    }

    setBootStatus('Carregando módulos… v' + VER);

    loadScript(0, function (errors) {
      try {
        if (typeof WidgetRuntime !== 'undefined') WidgetRuntime.markTrusted();
      } catch (e1) { /* */ }

      if (errors.length) {
        console.warn('[BomBoot] scripts com falha:', errors);
      }

      if (!global.__bomWafSessionController || !global.__bomWafSessionController.boot) {
        var miss = [];
        if (typeof APP_CONFIG === 'undefined') miss.push('config.js');
        if (typeof EnoviaApi === 'undefined') miss.push('enovia-api.js');
        miss.push('bom-waf-session-controller-bom20260621e.js');
        setBootStatus(
          'Scripts bloqueados (' + miss.join(', ') + '). Use widget-uwa.html com tags estáticas ou DEPLOY-3DSPACE.md.'
        );
        return;
      }

      global.__bomWafSessionController.boot();
    });
  }

  return {
    run: run,
    VER: VER,
    REPO: REPO
  };
})(typeof window !== 'undefined' ? window : this);
