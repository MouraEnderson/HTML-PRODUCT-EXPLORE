/**
 * @file services/api-bom-loader.js
 * Sprint 2.5 — item 3: REST ENOVIA lazy + progresso.
 */
var ApiBomLoader = (function () {
  'use strict';

  function canUse() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    return false;
  }

  function resolvePhysicalId(ctx, sel) {
    if (sel && sel.physicalid) return sel.physicalid;
    if (ctx && ctx.physicalId) return ctx.physicalId;
    return null;
  }

  function ensureReady() {
    var boot =
      typeof WafBootstrap !== 'undefined' && WafBootstrap.ensure
        ? WafBootstrap.ensure()
        : Promise.resolve();
    return boot.then(function () {
      if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
      if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.ensureSpaceApi) {
        return ExplorerScanner.ensureSpaceApi();
      }
      return null;
    });
  }

  function formatMessage(meta, expected) {
    var count = meta.itemCount || 0;
    var name = meta.productName || 'E-BOM';
    var msg = 'API ' + count;
    if (expected > 0) msg += '/' + expected;
    msg += ' — ' + name;
    if (meta.truncated) {
      msg += ' (estrutura truncada — limite BOM_MAX_NODES)';
    }
    return msg;
  }

  function defaultProgress(p) {
    if (!p) return;
    var msg;
    if (p.phase === 'connect') msg = 'Conectando API ENOVIA…';
    else if (p.phase === 'root') msg = 'Raiz carregada — expandindo estrutura…';
    else {
      msg = 'API';
      if (p.expected > 0) msg += ' ' + p.loaded + '/' + p.expected;
      else msg += ' ' + p.loaded;
      msg += ' carregados…';
    }
    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus(msg, 'info');
    } else {
      var el = document.getElementById('statusBar');
      if (el) {
        el.textContent = msg;
        el.className = 'status-bar status-info';
      }
    }
  }

  /**
   * @param {object} [ctx] ExplorerContext snapshot
   * @param {object} [sel] selection { physicalid, name, displayName }
   * @param {{ expectedCount?: number, onProgress?: function }} [options]
   */
  function load(ctx, sel, options) {
    options = options || {};
    sel = sel || {};
    if (!canUse()) {
      return Promise.reject(
        new Error('WAFData indisponível — abra no 3DDashboard (Additional App).')
      );
    }
    var physicalId = resolvePhysicalId(ctx, sel);
    if (!physicalId) {
      return Promise.reject(new Error('Nenhuma raiz com physicalId válido para API.'));
    }
    if (typeof BomService === 'undefined' || !BomService.loadLazyFull) {
      return Promise.reject(new Error('BomService.loadLazyFull indisponível.'));
    }

    var expected = (ctx && ctx.expectedCount) || options.expectedCount || 0;
    var onProgress = options.onProgress || defaultProgress;

    return ensureReady()
      .then(function () {
        onProgress({ phase: 'connect', loaded: 0, expected: expected });
        return BomService.loadLazyFull(physicalId, {
          expectedCount: expected,
          onProgress: onProgress
        });
      })
      .then(function (meta) {
        return {
          ok: true,
          mode: 'api',
          loaderMode: 'api',
          meta: meta,
          message: formatMessage(meta, expected)
        };
      });
  }

  return {
    load: load,
    canUse: canUse
  };
})();
