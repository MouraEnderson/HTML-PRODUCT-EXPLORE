/**
 * Product Explorer Sync Provider — CAMINHO B (hardened PR #20)
 * Fonte operacional de contexto: PlatformAPI.getSelection + ExplorerContext (sem bridge/postMessage).
 */
(function (w) {
  'use strict';

  var DEBOUNCE_MS = 500;
  var POLL_MS = 3000;
  var ALLOWED_EXPLORER_CONTEXT_SOURCES = ['query-id', 'query-name', 'config-id', 'registry'];
  var listeners = [];
  var lastContext = null;
  var debounceTimer = null;
  var pollTimer = null;
  var installed = false;

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  function isValidPhysicalId(id) {
    id = s(id);
    if (!id || id.length < 16) return false;
    if (/^prd-/i.test(id)) return false;
    if (typeof w.ThreeDXContentParser !== 'undefined' && w.ThreeDXContentParser.isValidPhysicalId) {
      return w.ThreeDXContentParser.isValidPhysicalId(id);
    }
    return /^[0-9A-F]{24,32}$/i.test(id);
  }

  function normalizePlatformItem(item) {
    if (!item) return null;
    var pid = s(
      item.physicalId ||
        item.physicalid ||
        item.id ||
        item.objectId ||
        (item.data && (item.data.physicalId || item.data.id))
    );
    var title = s(item.displayName || item.title || item.name || (item.data && item.data.displayName));
    if (!isValidPhysicalId(pid)) return null;
    return {
      physicalId: pid,
      title: title,
      source: 'platform-api'
    };
  }

  function emptyContext(message) {
    return {
      rootId: '',
      selectedId: '',
      title: '',
      source: 'NONE',
      eventType: 'none',
      path: 'C',
      expansionAvailable: false,
      autoSyncAvailable: false,
      message: message || 'Contexto Product Explorer indisponível — modo avançado',
      lastSyncAt: null,
      bridgeDiagnostic: getBridgeDiagnosticStatus()
    };
  }

  function getBridgeDiagnosticStatus() {
    var available = typeof w.ProductExplorerBridge !== 'undefined';
    return available
      ? 'bridge disponível, mas não usado como fonte operacional'
      : 'bridge indisponível neste runtime';
  }

  function getRequire() {
    if (typeof w.require !== 'undefined') return w.require;
    if (typeof w.widget !== 'undefined' && w.widget && w.widget.requirejs) return w.widget.requirejs;
    return null;
  }

  function fetchPlatformSelection() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve(null);
        return;
      }
      req(
        ['DS/PlatformAPI/PlatformAPI'],
        function (PlatformAPI) {
          if (!PlatformAPI || !PlatformAPI.getSelection) {
            resolve(null);
            return;
          }
          PlatformAPI.getSelection()
            .then(function (items) {
              if (!items || !items.length) {
                resolve(null);
                return;
              }
              resolve(normalizePlatformItem(items[0]));
            })
            .catch(function () {
              resolve(null);
            });
        },
        function () {
          resolve(null);
        }
      );
    });
  }

  function readExplorerContextOfficial() {
    if (typeof w.ExplorerContext === 'undefined' || !w.ExplorerContext.refresh) {
      return null;
    }
    w.ExplorerContext.refresh(false);
    var ctx = w.ExplorerContext.get();
    if (!ctx || !ctx.hasValidPhysicalId) return null;
    var src = s(ctx.source);
    if (ALLOWED_EXPLORER_CONTEXT_SOURCES.indexOf(src) < 0) return null;
    return {
      rootId: s(ctx.physicalId),
      selectedId: s(ctx.physicalId),
      title: s(ctx.productName || ctx.rootName || ctx.displayName),
      source: 'EXPLORER_CONTEXT',
      eventType: 'context',
      path: 'B',
      expansionAvailable: false,
      autoSyncAvailable: true,
      message: 'Contexto Product Explorer detectado',
      lastSyncAt: null,
      bridgeDiagnostic: getBridgeDiagnosticStatus()
    };
  }

  function mergeContext(platformSel, ctxOfficial) {
    if (platformSel && isValidPhysicalId(platformSel.physicalId)) {
      return {
        rootId: platformSel.physicalId,
        selectedId: platformSel.physicalId,
        title: platformSel.title,
        source: 'PRODUCT_EXPLORER_CONTEXT',
        eventType: 'platform-selection',
        path: 'B',
        expansionAvailable: false,
        autoSyncAvailable: true,
        message: 'Contexto Product Explorer detectado',
        lastSyncAt: null,
        bridgeDiagnostic: getBridgeDiagnosticStatus()
      };
    }
    if (ctxOfficial && ctxOfficial.rootId) return ctxOfficial;
    return emptyContext();
  }

  function emit(ctx) {
    lastContext = ctx;
    listeners.forEach(function (fn) {
      try {
        fn(ctx);
      } catch (e) {}
    });
  }

  function refresh(eventType) {
    return fetchPlatformSelection()
      .then(function (platformSel) {
        var ctx = mergeContext(platformSel, readExplorerContextOfficial());
        if (eventType) ctx.eventType = eventType;
        emit(ctx);
        return ctx;
      })
      .catch(function () {
        var ctx = emptyContext();
        emit(ctx);
        return ctx;
      });
  }

  function debouncedRefresh(eventType) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      refresh(eventType || 'debounced');
    }, DEBOUNCE_MS);
  }

  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    if (lastContext) fn(lastContext);
  }

  function install(opts) {
    opts = opts || {};
    if (installed) return refresh();
    installed = true;

    refresh('install');

    pollTimer = setInterval(function () {
      fetchPlatformSelection().then(function (sel) {
        if (!sel || !isValidPhysicalId(sel.physicalId)) return;
        if (lastContext && lastContext.selectedId === sel.physicalId) return;
        debouncedRefresh('poll-selection');
      });
    }, POLL_MS);

    if (opts.autoSync === true) {
      subscribe(function (ctx) {
        if (ctx.path !== 'B' || !ctx.rootId) return;
        if (typeof w.loadViaExplorerSync === 'function') {
          w.loadViaExplorerSync({ silent: true }).catch(function () {});
        }
      });
    }

    return Promise.resolve(lastContext);
  }

  w.ProductExplorerSyncProvider = {
    install: install,
    refresh: refresh,
    subscribe: subscribe,
    getContext: function () {
      return lastContext || emptyContext();
    },
    getBridgeDiagnosticStatus: getBridgeDiagnosticStatus,
    isValidPhysicalId: isValidPhysicalId,
    DEBOUNCE_MS: DEBOUNCE_MS
  };
})(window);
