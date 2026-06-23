/* BOM Analytics bom20260623c-geometry
 * Operational bundle loader: controller-only path, WAFData session, no 3DPlay/iframe/mock success.
 * Adds PR3 Geometry Resolver probes and selected-row action.
 */
(function (global) {
  'use strict';

  var BUILD = 'bom20260623c';
  var FLAG = '__BOM_CLEAN_BUNDLE_' + BUILD + '__';
  if (global[FLAG]) return;
  global[FLAG] = true;
  global.__BOM_BUNDLE_ID__ = BUILD;
  global.__BOM_NO_3DPLAY_OPERATIONAL__ = true;

  var loaded = false;
  var loading = null;
  var realController = null;
  var bootRequested = false;

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

  function setStatus(message, kind) {
    try {
      var root = global.__3DX_UI_ROOT__ || document;
      var el = root.querySelector && root.querySelector('#statusBar');
      if (!el) return;
      el.textContent = message;
      el.className = 'bom-st' + (kind ? ' bom-st-' + kind : '');
    } catch (e) { /* noop */ }
  }

  function loadScript(url, optional) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.charset = 'UTF-8';
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(BUILD);
      s.onload = function () { resolve(); };
      s.onerror = function () {
        var msg = 'Falha ao carregar modulo: ' + url;
        if (optional) {
          if (global.console && console.warn) console.warn('[BOM geometry bundle]', msg);
          resolve();
        } else {
          reject(new Error(msg));
        }
      };
      document.getElementsByTagName('head')[0].appendChild(s);
    });
  }

  var modules = [
    'assets/js/embed-query.js',
    'assets/js/config.js',
    'assets/js/platform/widget-runtime.js',
    'assets/js/platform/platform-bridge.js',
    'assets/js/platform/context.js',
    'assets/js/platform/compass.js',
    'assets/js/platform/waf-bootstrap.js',
    'assets/js/platform/waf-client.js',
    'assets/js/integration/3dx-content-parser.js',
    'assets/js/integration/enovia-api.js',
    'assets/js/integration/search-api.js',
    'assets/js/integration/product-explorer-bridge.js',
    'assets/js/integration/explorer-context.js',
    'assets/js/bom-auto-context-detector-bom20260622b.js',
    'assets/js/services/attribute-service.js',
    'assets/js/processing/metrics-engine.js',
    'assets/js/ui/kpi-cards.js',
    'assets/js/ui/charts-manager.js',
    'assets/js/ui/data-table.js',
    'assets/js/ui/dashboard-theme.js',
    'assets/js/ui/layout-fit.js',
    'assets/js/bom-waf-session-controller-bom20260621e.js',
    'assets/js/geometry/bom-geometry-resolver-bom20260623c.js',
    'assets/js/geometry/bom-geometry-controller-patch-bom20260623c.js'
  ];

  function hardenConfig() {
    var cfg = global.APP_CONFIG || (global.APP_CONFIG = {});
    cfg.BUILD = BUILD;
    cfg.ACTIVE_ENTRYPOINT = 'widget-v3.html';
    cfg.SESSION_CONTROLLER_ONLY = true;
    cfg.DATA_SOURCE = 'wafdata-dseng-session-controller';
    cfg.PILOT_FALLBACK_SNAPSHOT = false;
    cfg.PILOT_BUILTIN_LAST = false;
    cfg.SNAPSHOT_DELIVERY_MODE = false;
    cfg.ALLOW_PASTE_FALLBACK = false;
    cfg.DOM_MIRROR_FALLBACK = false;
    cfg.USE_DOM_MIRROR_PRIMARY = false;
    cfg.THREE_DPLAY = {
      ENABLED: false,
      EMBED_PLAYER: false,
      ALLOW_EXTERNAL_WIDGET_FALLBACK: false,
      WIDGET_HINT: '3DPlay desativado: Geometry Resolver real obrigatorio.'
    };
    cfg.GEOMETRY_RESOLVER = {
      REQUIRED_FOR_3D_SUCCESS: true,
      ACCEPTED_FORMATS: ['GLB', 'glTF', 'OBJ', 'STL', 'STEP-converted'],
      SUCCESS_REQUIRES_REAL_GEOMETRY: true,
      PHASE: 'PR3'
    };
  }

  function ensureLoaded() {
    if (loaded) return Promise.resolve(realController || global.__bomWafSessionController);
    if (loading) return loading;
    setStatus('Carregando bundle operacional com Geometry Resolver...', 'info');
    var root = baseUrl();
    loading = modules.reduce(function (p, path) {
      return p.then(function () { return loadScript(root + path, false); });
    }, Promise.resolve())
      .then(function () {
        hardenConfig();
        realController = global.__bomWafSessionController;
        loaded = true;
        if (!realController || !realController.boot) {
          throw new Error('Controller oficial nao foi carregado pelo bundle geometry.');
        }
        setStatus('Bundle geometry carregado. 3D real exige Geometry Resolver.', 'success');
        return realController;
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : 'Erro no bundle geometry.', 'error');
        throw error;
      });
    return loading;
  }

  var proxy = {
    boot: function () {
      var args = arguments;
      bootRequested = true;
      return ensureLoaded().then(function (controller) {
        return controller.boot.apply(controller, args);
      });
    },
    sync: function () {
      var args = arguments;
      return ensureLoaded().then(function (controller) { return controller.sync.apply(controller, args); });
    },
    refresh: function () {
      var args = arguments;
      return ensureLoaded().then(function (controller) { return controller.refresh.apply(controller, args); });
    },
    loadManualInput: function () {
      var args = arguments;
      return ensureLoaded().then(function (controller) { return controller.loadManualInput.apply(controller, args); });
    },
    getState: function () {
      if (realController && realController.getState) return realController.getState();
      return {
        controller: 'bom-geometry-bundle-loader',
        activeBuild: BUILD,
        geometryBundleLoaded: loaded,
        bootRequested: bootRequested,
        no3DPlayOperational: true,
        geometryResolverRequired: true
      };
    },
    exportDiagnostics: function () {
      if (realController && realController.exportDiagnostics) return realController.exportDiagnostics();
      return JSON.stringify(proxy.getState(), null, 2);
    }
  };

  global.__bomWafSessionController = proxy;
})(window);
