/**
 * Product Explorer Sync Provider — CAMINHO B (hardened PR #20 + PR #23 raw context)
 * Fonte operacional de contexto: PlatformAPI.getSelection + DS/Selection + ExplorerContext.
 */
(function (w) {
  'use strict';

  var DEBOUNCE_MS = 500;
  var POLL_MS = 3000;
  var ALLOWED_EXPLORER_CONTEXT_SOURCES = ['query-id', 'query-name', 'config-id', 'registry'];
  var listeners = [];
  var lastContext = null;
  var lastRawPlatformItem = null;
  var lastRawDsSelectionItem = null;
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

  function valueFrom(item, keys) {
    if (!item) return '';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (item[key] != null) return s(item[key]);
      if (item.data && item.data[key] != null) return s(item.data[key]);
      if (item.object && item.object[key] != null) return s(item.object[key]);
    }
    return '';
  }

  function normalizeOfficialSelectionItem(item, source) {
    if (!item) return null;
    var id = valueFrom(item, ['id', 'objectId', 'physicalId', 'physicalid', 'identifier']);
    var pid = valueFrom(item, ['physicalId', 'physicalid', 'id', 'objectId', 'identifier']);
    var name = valueFrom(item, ['name', 'Name']);
    var title = valueFrom(item, ['displayName', 'title', 'label', 'name']);
    var label = valueFrom(item, ['label', 'displayName', 'title']);
    var type = valueFrom(item, ['type', 'objectType', 'displayType']);
    if (!id && !pid && !name && !title && !label) return null;
    return {
      id: id,
      physicalId: isValidPhysicalId(pid) ? pid : '',
      rawId: pid,
      name: name,
      title: title,
      label: label,
      type: type,
      source: source
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
              resolve({ normalized: normalizeOfficialSelectionItem(rawItem, 'PlatformAPI.getSelection'), raw: rawItem });
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

  function fetchDsSelectionRaw() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve({ normalized: null, raw: null });
        return;
      }
      req(
        ['DS/Selection/Selection'],
        function (Selection) {
          if (!Selection || !Selection.getSelection) {
            resolve({ normalized: null, raw: null });
            return;
          }
          Selection.getSelection()
            .then(function (items) {
              if (!items || !items.length) {
                resolve({ normalized: null, raw: null });
                return;
              }
              var rawItem = items[0];
              lastRawDsSelectionItem = rawItem;
              resolve({ normalized: normalizeOfficialSelectionItem(rawItem, 'DS/Selection/Selection.getSelection'), raw: rawItem });
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

  function readExplorerContextOfficialRaw() {
    if (typeof w.ExplorerContext === 'undefined' || !w.ExplorerContext.refresh) {
      return { normalized: null, raw: null };
    }
    w.ExplorerContext.refresh(false);
    var ctx = w.ExplorerContext.get();
    lastRawExplorerContext = ctx || null;
    if (!ctx) return { normalized: null, raw: null };
    var title = s(ctx.productName || ctx.rootName || ctx.displayName);
    var name = s(ctx.name || ctx.objectName || '');
    var physicalId = s(ctx.physicalId);
    var src = s(ctx.source);
    var base = {
      rootId: isValidPhysicalId(physicalId) ? physicalId : '',
      selectedId: isValidPhysicalId(physicalId) ? physicalId : s(ctx.selectedId || name || title),
      physicalId: isValidPhysicalId(physicalId) ? physicalId : '',
      name: name,
      title: title,
      source: 'EXPLORER_CONTEXT',
      eventType: 'context',
      path: 'B',
      expansionAvailable: false,
      autoSyncAvailable: true,
      message: ctx.hasValidPhysicalId
        ? 'Contexto Product Explorer detectado'
        : 'Contexto Product Explorer parcial (titulo sem rootId dseng)',
      lastSyncAt: null,
      bridgeDiagnostic: getBridgeDiagnosticStatus()
    };
    if (ctx.hasValidPhysicalId && ALLOWED_EXPLORER_CONTEXT_SOURCES.indexOf(src) >= 0) {
      return { normalized: base, raw: ctx };
    }
    if (title || name) {
      base.selectionMode = 'fallback';
      return { normalized: base, raw: ctx };
    }
    return { normalized: null, raw: ctx };
  }

  function readExplorerContextOfficial() {
    return readExplorerContextOfficialRaw().normalized;
  }

  function candidateKey(candidate) {
    if (!candidate) return '';
    return s(candidate.physicalId || candidate.id || candidate.rawId || candidate.name || candidate.title || candidate.label).toLowerCase();
  }

  function sameCandidate(a, b) {
    var ka = candidateKey(a);
    var kb = candidateKey(b);
    return !!ka && !!kb && ka === kb;
  }

  function compactCandidate(candidate) {
    if (!candidate) return null;
    return {
      id: s(candidate.id || candidate.rawId),
      physicalId: s(candidate.physicalId),
      name: s(candidate.name),
      title: s(candidate.title),
      label: s(candidate.label),
      type: s(candidate.type),
      source: s(candidate.source)
    };
  }

  function mergeContext(platformSel, dsSelectionSel, ctxOfficial) {
    var active = platformSel || dsSelectionSel || null;
    var selectedCandidates = [];
    if (platformSel) selectedCandidates.push(compactCandidate(platformSel));
    if (dsSelectionSel && !sameCandidate(dsSelectionSel, platformSel)) selectedCandidates.push(compactCandidate(dsSelectionSel));
    if (ctxOfficial && ctxOfficial.rootId) {
      selectedCandidates.push(compactCandidate({
        id: ctxOfficial.rootId,
        physicalId: ctxOfficial.rootId,
        title: ctxOfficial.title,
        label: ctxOfficial.title,
        source: ctxOfficial.source || 'ExplorerContext'
      }));
    }

    if (active) {
      var activeId = active.physicalId || active.id || active.rawId || '';
      var rootId = ctxOfficial && ctxOfficial.rootId ? ctxOfficial.rootId : active.physicalId || '';
      var mode = ctxOfficial && ctxOfficial.rootId && sameCandidate({ physicalId: ctxOfficial.rootId }, active)
        ? 'root'
        : 'selected-branch';
      return {
        rootId: rootId,
        selectedId: activeId,
        physicalId: active.physicalId || '',
        name: active.name || '',
        title: active.title || active.label || active.name || activeId,
        label: active.label || active.title || '',
        type: active.type || '',
        source: 'PRODUCT_EXPLORER_CONTEXT',
        selectionSource: active.source,
        eventType: mode === 'selected-branch' ? 'selected-branch' : 'root-selection',
        selectionMode: mode,
        selectedCandidates: selectedCandidates.filter(Boolean),
        path: 'B',
        expansionAvailable: false,
        autoSyncAvailable: true,
        message: mode === 'selected-branch'
          ? 'Seleção oficial de subconjunto detectada no Product Explorer'
          : 'Contexto Product Explorer detectado',
        lastSyncAt: null,
        bridgeDiagnostic: getBridgeDiagnosticStatus()
      };
    }
    if (ctxOfficial && ctxOfficial.rootId) {
      ctxOfficial.selectionMode = 'root';
      ctxOfficial.selectedCandidates = selectedCandidates.filter(Boolean);
      return ctxOfficial;
    }
    if (ctxOfficial && (ctxOfficial.title || ctxOfficial.name)) {
      ctxOfficial.selectionMode = ctxOfficial.selectionMode || 'fallback';
      ctxOfficial.selectedCandidates = selectedCandidates.filter(Boolean);
      if (!ctxOfficial.source) ctxOfficial.source = 'EXPLORER_CONTEXT';
      return ctxOfficial;
    }
    if (selectedCandidates.length) {
      var hint = selectedCandidates[0] || {};
      return {
        rootId: '',
        selectedId: s(hint.id || hint.physicalId || hint.name || hint.title),
        physicalId: s(hint.physicalId),
        name: s(hint.name),
        title: s(hint.title || hint.label || hint.name),
        label: s(hint.label || hint.title),
        type: s(hint.type),
        source: 'PRODUCT_EXPLORER_CONTEXT',
        selectionSource: s(hint.source),
        eventType: 'partial-context',
        selectionMode: 'fallback',
        selectedCandidates: selectedCandidates.filter(Boolean),
        path: 'B',
        expansionAvailable: false,
        autoSyncAvailable: true,
        message: 'Contexto parcial do Product Explorer (sem rootId dseng)',
        lastSyncAt: null,
        bridgeDiagnostic: getBridgeDiagnosticStatus()
      };
    }
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
    return Promise.all([fetchPlatformSelectionRaw(), fetchDsSelectionRaw()])
      .then(function (results) {
        var platformResult = results[0] || {};
        var dsSelectionResult = results[1] || {};
        var explorerResult = readExplorerContextOfficialRaw();
        var ctx = mergeContext(platformResult.normalized, dsSelectionResult.normalized, explorerResult.normalized);
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
        if (!ctx.selectedId && dsSelectionResult.raw) {
          ctx.selectedId = s(
            dsSelectionResult.raw.physicalId ||
              dsSelectionResult.raw.id ||
              dsSelectionResult.raw.objectId ||
              dsSelectionResult.raw.displayName
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
    if (normalized.selectionSource) source = normalized.selectionSource;
    else if (normalized.source === 'EXPLORER_CONTEXT') source = 'ExplorerContext';
    else if (normalized.source === 'PRODUCT_EXPLORER_CONTEXT') source = 'PlatformAPI';
    else if (normalized.source === 'NONE') source = 'NONE';

    return {
      source: source,
      selected: sanitizeValue({
        platformItem: lastRawPlatformItem,
        dsSelectionItem: lastRawDsSelectionItem,
        explorerContext: lastRawExplorerContext
      }),
      selectedCandidates: sanitizeValue(normalized.selectedCandidates || []),
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
      refresh('poll-selection');
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
