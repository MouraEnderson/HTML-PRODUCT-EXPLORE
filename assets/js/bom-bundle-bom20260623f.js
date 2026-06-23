/* BOM Analytics bom20260623f-attribute-enrichment
 * Operational bundle loader: Product Structure Explorer -> Atualizar estrutura -> WAFData E-BOM.
 * Fixes E-BOM attribute extraction: owner, maturity, revision, description.
 * No visible manual root flow. No Geometry Resolver before E-BOM. No 3DPlay/iframe/mock success.
 */
(function (global) {
  'use strict';

  var BUILD = 'bom20260623f';
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
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(BUILD + '-' + Date.now());
      s.onload = function () { resolve(); };
      s.onerror = function () {
        var msg = 'Falha ao carregar modulo: ' + url;
        if (optional) {
          if (global.console && console.warn) console.warn('[BOM bundle]', msg);
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
    'assets/js/integration/product-explorer-sync-provider.js',
    'assets/js/bom-auto-context-detector-bom20260622b.js',
    'assets/js/services/attribute-service.js',
    'assets/js/processing/metrics-engine.js',
    'assets/js/ui/kpi-cards.js',
    'assets/js/ui/charts-manager.js',
    'assets/js/ui/data-table.js',
    'assets/js/services/attribute-enrichment-bom20260623f.js',
    'assets/js/ui/dashboard-theme.js',
    'assets/js/ui/layout-fit.js',
    'assets/js/bom-waf-session-controller-bom20260621e.js'
  ];

  function hardenConfig() {
    var cfg = global.APP_CONFIG || (global.APP_CONFIG = {});
    cfg.BUILD = BUILD;
    cfg.ACTIVE_ENTRYPOINT = 'widget-v3.html';
    cfg.CONTROLLER_ONLY_FLOW = true;
    cfg.SESSION_CONTROLLER_ONLY = false;
    cfg.DATA_SOURCE = 'wafdata-dseng-session-controller';
    cfg.PILOT_FALLBACK_SNAPSHOT = false;
    cfg.PILOT_BUILTIN_LAST = false;
    cfg.SNAPSHOT_DELIVERY_MODE = false;
    cfg.ALLOW_PASTE_FALLBACK = false;
    cfg.DOM_MIRROR_FALLBACK = false;
    cfg.USE_DOM_MIRROR_PRIMARY = false;
    cfg.ROOT_INPUT = {
      OPERATIONAL: false,
      VISIBLE: false,
      NOTE: 'Pilot flow is Product Structure Explorer context via Atualizar estrutura.'
    };
    cfg.THREE_DPLAY = {
      ENABLED: false,
      EMBED_PLAYER: false,
      ALLOW_EXTERNAL_WIDGET_FALLBACK: false,
      WIDGET_HINT: '3DPlay desativado: 3D real depende de E-BOM carregada e Geometry Resolver posterior.'
    };
    cfg.GEOMETRY_RESOLVER = {
      REQUIRED_FOR_3D_SUCCESS: true,
      ENABLED_ONLY_WITH_SELECTED_EBOM_ROW: true,
      OPERATIONAL_IN_THIS_BUILD: false,
      PHASE: 'blocked-until-ebom-real'
    };
    cfg.ATTRIBUTE_ENRICHMENT = {
      ENABLED: true,
      SOURCE: 'referencedObject + EngItem reread when needed',
      FIELDS: ['revision', 'owner', 'maturity', 'description']
    };
  }

  function refreshAutoContextStatus() {
    try {
      if (!global.ProductExplorerSyncProvider || !global.ProductExplorerSyncProvider.getContext) return;
      var ctx = global.ProductExplorerSyncProvider.getContext() || {};
      var badge = (global.__3DX_UI_ROOT__ || document).querySelector('#autoContextBadge');
      var label = (global.__3DX_UI_ROOT__ || document).querySelector('#autoContextLabel');
      var hasContext = !!(ctx.selectedId || ctx.rootId || ctx.title || ctx.name);
      if (badge) {
        badge.textContent = hasContext ? 'Contexto detectado' : 'Sem contexto oficial';
        badge.className = 'bom-build-pill bom-auto-context-badge ' + (hasContext ? 'bom-auto-context-ok' : 'bom-auto-context-warn');
      }
      if (label) label.textContent = hasContext ? (ctx.title || ctx.name || ctx.selectedId || ctx.rootId) : 'Product Explorer não expôs seleção';
    } catch (e) { /* noop */ }
  }

  function ensureLoaded() {
    if (loaded) return Promise.resolve(realController || global.__bomWafSessionController);
    if (loading) return loading;
    setStatus('Carregando bundle operacional Explorer → E-BOM...', 'info');
    var root = baseUrl();
    loading = modules.reduce(function (p, path) {
      return p.then(function () { return loadScript(root + path, false); });
    }, Promise.resolve())
      .then(function () {
        hardenConfig();
        if (global.BomAttributeEnrichment && global.BomAttributeEnrichment.install) {
          global.BomAttributeEnrichment.install();
        }
        if (global.ProductExplorerSyncProvider && global.ProductExplorerSyncProvider.install) {
          return Promise.resolve(global.ProductExplorerSyncProvider.install({ autoSync: false })).catch(function () { return null; });
        }
        return null;
      })
      .then(function () {
        realController = global.__bomWafSessionController;
        loaded = true;
        if (!realController || !realController.boot) {
          throw new Error('Controller oficial nao foi carregado pelo bundle Explorer -> E-BOM.');
        }
        refreshAutoContextStatus();
        setStatus('Bundle carregado. Abra a estrutura no Product Explorer e clique Atualizar estrutura.', 'success');
        return realController;
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : 'Erro no bundle Explorer -> E-BOM.', 'error');
        throw error;
      });
    return loading;
  }

  var proxy = {
    boot: function () {
      var args = arguments;
      bootRequested = true;
      return ensureLoaded().then(function (controller) {
        return controller.boot.apply(controller, args).then(function (result) {
          refreshAutoContextStatus();
          return result;
        });
      });
    },
    sync: function () {
      var args = arguments;
      return ensureLoaded().then(function (controller) {
        refreshAutoContextStatus();
        return controller.sync.apply(controller, args).finally(refreshAutoContextStatus);
      });
    },
    refresh: function () {
      var args = arguments;
      return ensureLoaded().then(function (controller) {
        refreshAutoContextStatus();
        return controller.refresh.apply(controller, args).finally(refreshAutoContextStatus);
      });
    },
    getState: function () {
      if (realController && realController.getState) return realController.getState();
      return {
        controller: 'bom-explorer-ebom-bundle-loader',
        activeBuild: BUILD,
        loaded: loaded,
        bootRequested: bootRequested,
        no3DPlayOperational: true,
        manualRootInputOperational: false,
        attributeEnrichment: true
      };
    },
    exportDiagnostics: function () {
      if (realController && realController.exportDiagnostics) return realController.exportDiagnostics();
      return JSON.stringify(this.getState(), null, 2);
    }
  };

  global.__bomWafSessionController = proxy;
  global.__BOM_BUNDLE_LOADED__ = true;
})(window);
