/**
 * Product Explorer Sync Provider — CAMINHO B (hardened PR #20 + PR #23 raw context)
 * Fonte operacional de contexto: PlatformAPI.getSelection + ExplorerContext (sem bridge/postMessage).
 */
(function (w) {
  'use strict';

  var DEBOUNCE_MS = 500;
  var POLL_MS = 3000;
  var ALLOWED_EXPLORER_CONTEXT_SOURCES = ['query-id', 'query-name', 'config-id', 'registry'];
  var listeners = [];
  var lastContext = null;
  var lastRawPlatformItem = null;
  var lastRawExplorerContext = null;
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

  function isSensitiveKey(key) {
    return /cookie|token|authorization|password|secret|bearer|csrf/i.test(String(key || ''));
  }

  function sanitizeValue(value, depth) {
    depth = depth || 0;
    if (depth > 4) return '[max-depth]';
    if (value == null) return value;
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'string') {
      return value.length > 500 ? value.slice(0, 500) + '…' : value;
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.slice(0, 20).map(function (item) {
        return sanitizeValue(item, depth + 1);
      });
    }
    var out = {};
    var keys = Object.keys(value).slice(0, 40);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (isSensitiveKey(key)) continue;
      try {
        out[key] = sanitizeValue(value[key], depth + 1);
      } catch (e) {
        out[key] = '[unreadable]';
      }
    }
    return out;
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

  function fetchPlatformSelectionRaw() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve({ normalized: null, raw: null });
        return;
      }
      req(
        ['DS/PlatformAPI/PlatformAPI'],
        function (PlatformAPI) {
          if (!PlatformAPI || !PlatformAPI.getSelection) {
            resolve({ normalized: null, raw: null });
            return;
          }
          PlatformAPI.getSelection()
            .then(function (items) {
              if (!items || !items.length) {
                resolve({ normalized: null, raw: null });
                return;
              }
              var rawItem = items[0];
              lastRawPlatformItem = rawItem;
              resolve({ normalized: normalizePlatformItem(rawItem), raw: rawItem });
            })
            .catch(function () {
              resolve({ normalized: null, raw: null });
            });
        },
        function () {
          resolve({ normalized: null, raw: null });
        }
      );
    });
  }

  function fetchPlatformSelection() {
    return fetchPlatformSelectionRaw().then(function (result) {
      return result.normalized;
    });
  }

  function readExplorerContextOfficialRaw() {
    if (typeof w.ExplorerContext === 'undefined' || !w.ExplorerContext.refresh) {
      return { normalized: null, raw: null };
    }
    w.ExplorerContext.refresh(false);
    var ctx = w.ExplorerContext.get();
    lastRawExplorerContext = ctx || null;
    if (!ctx || !ctx.hasValidPhysicalId) return { normalized: null, raw: ctx || null };
    var src = s(ctx.source);
    if (ALLOWED_EXPLORER_CONTEXT_SOURCES.indexOf(src) < 0) {
      return { normalized: null, raw: ctx || null };
    }
    return {
      normalized: {
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
      },
      raw: ctx
    };
  }

  function readExplorerContextOfficial() {
    return readExplorerContextOfficialRaw().normalized;
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
    if (ctxOfficial && ctxOfficial.title) return ctxOfficial;
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
    return fetchPlatformSelectionRaw()
      .then(function (platformResult) {
        var explorerResult = readExplorerContextOfficialRaw();
        var ctx = mergeContext(platformResult.normalized, explorerResult.normalized);
        if (!ctx.title && platformResult.raw) {
          ctx.title = s(
            platformResult.raw.displayName ||
              platformResult.raw.title ||
              platformResult.raw.name ||
              (platformResult.raw.data && platformResult.raw.data.displayName)
          );
        }
        if (!ctx.selectedId && platformResult.raw) {
          ctx.selectedId = s(
            platformResult.raw.physicalId ||
              platformResult.raw.id ||
              platformResult.raw.objectId ||
              platformResult.raw.displayName
          );
        }
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

  function getRawSelectionContext() {
    var normalized = lastContext || emptyContext();
    var source = 'PlatformAPI/ExplorerContext';
    if (normalized.source === 'EXPLORER_CONTEXT') source = 'ExplorerContext';
    else if (normalized.source === 'PRODUCT_EXPLORER_CONTEXT') source = 'PlatformAPI';
    else if (normalized.source === 'NONE') source = 'NONE';

    return {
      source: source,
      selected: sanitizeValue({
        platformItem: lastRawPlatformItem,
        explorerContext: lastRawExplorerContext
      }),
      normalized: sanitizeValue(normalized),
      timestamp: new Date().toISOString(),
      page: '3DEXPERIENCE Web Page Reader'
    };
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
        if (ctx.path !== 'B') return;
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
    getRawSelectionContext: getRawSelectionContext,
    getBridgeDiagnosticStatus: getBridgeDiagnosticStatus,
    isValidPhysicalId: isValidPhysicalId,
    DEBOUNCE_MS: DEBOUNCE_MS
  };
})(window);
