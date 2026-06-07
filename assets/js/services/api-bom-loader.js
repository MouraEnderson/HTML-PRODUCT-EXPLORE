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

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function isValidId(id) {
    id = String(id || '').trim();
    if (!id) return false;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id.length >= 8;
  }

  function resolvePhysicalIdSync(ctx, sel) {
    if (sel && sel.physicalid) return normalizeId(sel.physicalid);
    if (ctx && ctx.physicalId) return normalizeId(ctx.physicalId);
    var name = (ctx && (ctx.rootName || ctx.productName)) || (sel && (sel.displayName || sel.name)) || '';
    if (!name || typeof ProductExplorerBridge === 'undefined') return null;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    var cat =
      ProductExplorerBridge.resolveFromExplorerCatalog &&
      ProductExplorerBridge.resolveFromExplorerCatalog(name);
    if (cat && isValidId(cat.physicalid)) return normalizeId(cat.physicalid);
    var prd =
      ProductExplorerBridge.lookupPrdByPartName &&
      ProductExplorerBridge.lookupPrdByPartName(name);
    if (isValidId(prd)) return normalizeId(prd);
    return null;
  }

  function resolvePhysicalId(ctx, sel) {
    var id = resolvePhysicalIdSync(ctx, sel);
    if (id) return Promise.resolve(id);
    var term = (ctx && (ctx.rootName || ctx.productName)) || (sel && (sel.displayName || sel.name)) || '';
    term = String(term || '').trim();
    if (!term || typeof ProductSearchService === 'undefined' || !ProductSearchService.search) {
      return Promise.resolve(null);
    }
    return ProductSearchService.search(term, { top: 8 }).then(function (hits) {
      if (!hits || !hits.length) return null;
      var exact = hits.filter(function (h) {
        var n = String(h.name || h.displayName || '').toLowerCase();
        var t = term.toLowerCase();
        return n === t || n.indexOf(t) >= 0 || t.indexOf(n) >= 0;
      });
      var pick = (exact.length ? exact : hits)[0];
      return pick && isValidId(pick.physicalid) ? normalizeId(pick.physicalid) : null;
    }).catch(function () {
      return null;
    });
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
    var scope = meta && meta.scopeMode;
    var msg =
      scope === 'initial-scope'
        ? 'API escopo inicial ' + count
        : scope === 'lazy-full'
          ? 'API lazy ' + count
          : 'API ' + count;
    if (expected > 0) msg += '/' + expected;
    msg += ' — ' + name;
    if (scope === 'initial-scope') {
      msg += ' (raiz + filhos diretos; expanda o subconjunto na tabela)';
    } else if (expected > 0 && count < expected - 1) {
      msg += ' (E-BOM unica; Explorer pode contar ocorrencias/selecionados)';
    }
    if (meta.truncated) {
      msg += ' (estrutura truncada — limite BOM_MAX_NODES)';
    }
    return msg;
  }

  function defaultProgress(p) {
    if (!p) return;
    var msg;
    if (p.phase === 'connect') msg = 'Conectando API ENOVIA…';
    else if (p.phase === 'root') msg = 'Raiz carregada — carregando filhos diretos…';
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
    if (typeof BomService === 'undefined' || !BomService.loadLazyFull) {
      return Promise.reject(new Error('BomService.loadLazyFull indisponível.'));
    }

    var expected = (ctx && ctx.expectedCount) || options.expectedCount || 0;
    var onProgress = options.onProgress || defaultProgress;
    var resolvedPhysicalId = '';
    var titleHint =
      (ctx && (ctx.rootName || ctx.productName)) ||
      (sel && (sel.displayName || sel.name)) ||
      '';

    return ensureReady()
      .then(function () {
        onProgress({ phase: 'connect', loaded: 0, expected: expected });
        return resolvePhysicalId(ctx, sel);
      })
      .then(function (physicalId) {
        if (!physicalId) {
          return Promise.reject(
            new Error(
              'Raiz sem physicalId para API - selecione a raiz no Explorer e clique Atualizar estrutura.'
            )
          );
        }
        resolvedPhysicalId = physicalId;
        var useLazyFull =
          APP_CONFIG.API_USE_LAZY_FULL !== false ||
          expected > (APP_CONFIG.API_PREFER_ABOVE || 20) ||
          expected > 5;
        var loadFn =
          !useLazyFull && BomService.loadInitialScope
            ? BomService.loadInitialScope
            : BomService.loadLazyFull;
        return loadFn(physicalId, {
          expectedCount: expected,
          titleHint: titleHint,
          productName: titleHint,
          onProgress: onProgress
        });
      })
      .then(function (meta) {
        var count = meta && meta.itemCount ? meta.itemCount : 0;
        var partial = expected > 0 && count < expected - 1;
        var diag = (meta && meta.apiDiagnostics) || {};
        return {
          ok: true,
          mode: 'api',
          loaderMode: 'api',
          scopeMode: (meta && meta.scopeMode) || 'lazy-full',
          meta: meta,
          partial: partial,
          diagnostic: {
            rootPhysicalId: diag.rootPhysicalId || resolvedPhysicalId,
            expectedCount: expected,
            itemCount: count,
            resolvedReferences: diag.resolvedReferences || 0,
            unresolvedInstances: diag.unresolvedInstances || 0,
            parentRequests: diag.parentRequests || 0,
            lastParentId: diag.lastParentId || '',
            lastApiParentId: diag.lastApiParentId || '',
            lastChildTotal: diag.lastChildTotal || 0,
            duplicateRowsPreserved: diag.duplicateRowsPreserved || 0,
            lastError: diag.lastError || ''
          },
          message: formatMessage(meta, expected)
        };
      });
  }

  return {
    load: load,
    canUse: canUse
  };
})();
