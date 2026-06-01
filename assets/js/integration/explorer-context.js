/**
 * @file integration/explorer-context.js
 * Contexto único da raiz aberta no Product Structure Explorer.
 * Sprint 2.5 — item 1: physicalId, nome, expectedCount, syncKey.
 */
var ExplorerContext = (function () {
  'use strict';

  var cached = null;

  function emptyContext() {
    return {
      physicalId: '',
      productName: '',
      displayName: '',
      rootName: '',
      expectedCount: 0,
      selectionCount: 0,
      source: 'none',
      syncKey: '',
      hasValidPhysicalId: false,
      canUseApi: false,
      updatedAt: 0
    };
  }

  function isValidId(id) {
    id = String(id || '').trim();
    if (!id) return false;
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id.length >= 8;
  }

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function labelFromSelection(sel) {
    if (!sel) return '';
    return String(sel.displayName || sel.name || sel.title || '').trim();
  }

  function badSelection(sel) {
    if (!sel) return true;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.isBadDashboardSelection) {
      return ProductExplorerBridge.isBadDashboardSelection(sel);
    }
    return false;
  }

  function pollBridge() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) {
      ProductExplorerBridge.pollStructureHint();
    }
    if (ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
  }

  function readQueryContext() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var out = { physicalId: '', productName: '', source: 'none' };
    if (q.physicalid && isValidId(q.physicalid)) {
      out.physicalId = normalizeId(q.physicalid);
      out.productName = String(q.displayName || q.name || q.structure || q.rootName || '').trim();
      out.source = 'query-id';
    }
    if (!out.productName && (q.structure || q.rootName)) {
      out.productName = String(q.structure || q.rootName).trim();
      if (out.source === 'none') out.source = 'query-name';
    }
    if (!out.physicalId && APP_CONFIG && APP_CONFIG.URL_PHYSICAL_ID && isValidId(APP_CONFIG.URL_PHYSICAL_ID)) {
      out.physicalId = normalizeId(APP_CONFIG.URL_PHYSICAL_ID);
      if (out.source === 'none') out.source = 'config-id';
    }
    return out;
  }

  function readSelectionContext() {
    if (typeof ProductExplorerBridge === 'undefined') return { physicalId: '', productName: '', source: 'none' };
    var sel = ProductExplorerBridge.getSelection && ProductExplorerBridge.getSelection();
    if (sel && !badSelection(sel)) {
      var pid = normalizeId(sel.physicalid || sel.physicalId || '');
      var name = labelFromSelection(sel);
      if (isValidId(pid) || name) {
        return {
          physicalId: isValidId(pid) ? pid : '',
          productName: name,
          source: sel.source || 'selection'
        };
      }
    }
    var hashSel =
      ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
    if (hashSel && !badSelection(hashSel)) {
      var hpid = normalizeId(hashSel.physicalid || hashSel.physicalId || '');
      var hname = labelFromSelection(hashSel);
      if (isValidId(hpid) || hname) {
        return {
          physicalId: isValidId(hpid) ? hpid : '',
          productName: hname,
          source: 'hash'
        };
      }
    }
    return { physicalId: '', productName: '', source: 'none' };
  }

  function readStructureName() {
    if (typeof ProductExplorerBridge === 'undefined') return '';
    var hint =
      ProductExplorerBridge.getStructureNameHint && ProductExplorerBridge.getStructureNameHint();
    if (hint) return String(hint).trim();
    var text =
      ProductExplorerBridge.harvestExplorerTextOnly &&
      ProductExplorerBridge.harvestExplorerTextOnly();
    if (text && ProductExplorerBridge.extractStructureNameFromText) {
      var fromText = ProductExplorerBridge.extractStructureNameFromText(text);
      if (fromText) return fromText;
    }
    if (ProductExplorerBridge.extractStructureNameFromText) {
      var fromTitle = ProductExplorerBridge.extractStructureNameFromText(document.title || '');
      if (fromTitle) return fromTitle;
    }
    return '';
  }

  function resolvePhysicalIdFromName(name) {
    if (!name || typeof ProductExplorerBridge === 'undefined') return '';
    var cat =
      ProductExplorerBridge.resolveFromExplorerCatalog &&
      ProductExplorerBridge.resolveFromExplorerCatalog(name);
    if (cat && isValidId(cat.physicalid)) return normalizeId(cat.physicalid);
    var reg = APP_CONFIG && APP_CONFIG.STRUCTURE_IDS ? APP_CONFIG.STRUCTURE_IDS : {};
    var key = String(name).trim();
    var rid = reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()];
    if (rid && isValidId(rid)) return normalizeId(rid);
    if (ProductExplorerBridge.lookupPrdByPartName) {
      var prd = ProductExplorerBridge.lookupPrdByPartName(name);
      if (prd && isValidId(prd)) return normalizeId(prd);
    }
    return '';
  }

  function readCounts() {
    var expected = 0;
    var selected = 0;
    if (typeof ProductExplorerBridge === 'undefined') {
      return { expectedCount: 0, selectionCount: 0 };
    }
    if (ProductExplorerBridge.getExplorerObjectCount) {
      expected = ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    if (ProductExplorerBridge.getExplorerSelectionCount) {
      selected = ProductExplorerBridge.getExplorerSelectionCount() || 0;
    }
    if (selected > 0 && expected > 0 && selected > expected) {
      var swap = expected;
      expected = selected;
      selected = swap;
    }
    if (expected < 1 && selected > 0) expected = selected;
    return { expectedCount: expected, selectionCount: selected };
  }

  function buildSyncKey(ctx) {
    return [
      ctx.physicalId || ctx.rootName || 'explorer',
      ctx.expectedCount || 0,
      ctx.selectionCount || 0
    ].join('|');
  }

  function canUseApiFlag() {
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    if (typeof WidgetRuntime !== 'undefined' && WidgetRuntime.isTrusted && WidgetRuntime.isTrusted()) {
      return true;
    }
    try {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    } catch (e0) { /* */ }
    return false;
  }

  /**
   * Atualiza contexto a partir do Explorer / dashboard (síncrono).
   * @param {boolean} [doPoll] — se true, força poll do bridge antes de ler
   */
  function refresh(doPoll) {
    if (doPoll !== false) pollBridge();

    var ctx = emptyContext();
    var q = readQueryContext();
    var sel = readSelectionContext();
    var structureName = readStructureName();
    var counts = readCounts();

    ctx.expectedCount = counts.expectedCount;
    ctx.selectionCount = counts.selectionCount;

    if (q.physicalId) {
      ctx.physicalId = q.physicalId;
      ctx.source = q.source;
    } else if (sel.physicalId) {
      ctx.physicalId = sel.physicalId;
      ctx.source = sel.source;
    }

    ctx.productName =
      q.productName ||
      sel.productName ||
      structureName ||
      '';
    ctx.displayName = ctx.productName;
    ctx.rootName = ctx.productName || structureName || '';

    if (!ctx.physicalId && ctx.rootName) {
      var resolved = resolvePhysicalIdFromName(ctx.rootName);
      if (resolved) {
        ctx.physicalId = resolved;
        if (ctx.source === 'none') ctx.source = 'registry';
      }
    }

    if (!ctx.rootName && ctx.physicalId) {
      ctx.rootName = ctx.physicalId;
    }

    ctx.hasValidPhysicalId = isValidId(ctx.physicalId);
    ctx.canUseApi = canUseApiFlag();
    ctx.updatedAt = Date.now();
    ctx.syncKey = buildSyncKey(ctx);
    cached = ctx;
    return ctx;
  }

  function get() {
    if (!cached) return refresh(true);
    return cached;
  }

  function getSyncKey() {
    return get().syncKey;
  }

  function getExpectedCount() {
    return get().expectedCount || 0;
  }

  function getPhysicalId() {
    return get().physicalId || '';
  }

  function getRootName() {
    return get().rootName || get().productName || '';
  }

  /**
   * Sugere loader para Sprint 2.5 (item 3+).
   * auto | api | tsv | paste
   */
  function suggestLoaderMode() {
    var ctx = get();
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var apiAbove = (APP_CONFIG && APP_CONFIG.API_PREFER_ABOVE) || 20;
    var primary = (APP_CONFIG && APP_CONFIG.PRIMARY_LOADER) || 'auto';
    if (primary === 'api' && ctx.canUseApi) return 'api';
    if (primary === 'tsv') return 'tsv';
    if (primary === 'paste') return 'paste';
    if (ctx.canUseApi) {
      if (ctx.hasValidPhysicalId) return 'api';
      if (ctx.expectedCount >= apiAbove) return 'api';
    }
    if (ctx.expectedCount > 0 && ctx.expectedCount <= maxTsv) return 'tsv';
    if (ctx.expectedCount > maxTsv) return 'paste';
    return 'tsv';
  }

  return {
    refresh: refresh,
    get: get,
    getSyncKey: getSyncKey,
    getExpectedCount: getExpectedCount,
    getPhysicalId: getPhysicalId,
    getRootName: getRootName,
    suggestLoaderMode: suggestLoaderMode,
    buildSyncKey: buildSyncKey
  };
})();
