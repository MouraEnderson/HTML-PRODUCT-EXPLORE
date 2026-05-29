/**
 * @file services/bom-snapshot.js
 * Snapshot E-BOM (JSON) — coleta offline e leitura no widget GitHub.
 */
var BomSnapshot = (function () {
  'use strict';

  var FORMAT_VERSION = 1;
  var SESSION_KEY = '3dx_bom_snapshot_v1';
  var GITHUB_BASE = 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';

  /** Mont10 embutido — funciona se fetch ao GitHub falhar no iframe 3DDashboard */
  var BUILTIN_MONT10 = {
    version: 1,
    productName: 'Mont10',
    exportedAt: '2026-05-28T12:00:00.000Z',
    rootPhysicalId: 'mont10_root',
    items: [
      { level: 0, physicalid: 'mont10_root', name: 'Mont10', title: 'Mont10', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' },
      { level: 1, physicalid: 'mont10_m1', name: 'M1', title: 'M1', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' },
      { level: 1, physicalid: 'mont10_m2', name: 'M2', title: 'M2', type: 'Physical Product', displayType: 'Physical Product', revision: '1.1', state: 'Aprovado', maturity: 'Aprovado', owner: 'Enderson Moura', approval: 'Approved' }
    ]
  };

  function resolveUrl(pathOrUrl) {
    if (!pathOrUrl) return null;
    var p = String(pathOrUrl).trim();
    if (/^https?:\/\//i.test(p)) return p;
    var base = GITHUB_BASE;
    try {
      if (typeof location !== 'undefined' && location.hostname.indexOf('github.io') >= 0) {
        var dir = location.pathname.replace(/\/[^/]*$/, '/');
        base = location.origin + dir;
      }
    } catch (e) { /* */ }
    return base + p.replace(/^\//, '');
  }

  function getParamUrl() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var raw = q.snapshot || q.snap || q.data || '';
    return raw ? resolveUrl(raw) : null;
  }

  function normalizePayload(data) {
    if (!data) return null;
    if (Array.isArray(data)) {
      return { version: FORMAT_VERSION, productName: 'E-BOM', items: data };
    }
    if (data.items && Array.isArray(data.items)) {
      return {
        version: data.version || FORMAT_VERSION,
        productName: data.productName || data.name || data.title || 'E-BOM',
        rootPhysicalId: data.rootPhysicalId || null,
        exportedAt: data.exportAt || data.exportedAt || null,
        items: data.items
      };
    }
    return null;
  }

  function itemsFromPayload(payload) {
    var norm = normalizePayload(payload);
    if (!norm || !norm.items.length) return null;
    return norm.items.map(function (it, idx) {
      var level = it.level != null ? parseInt(it.level, 10) : 0;
      if (isNaN(level)) level = 0;
      return {
        level: level,
        physicalid: it.physicalid || it.physicalId || ('snap_' + idx),
        name: it.name || it.title || 'Item ' + idx,
        title: it.title || it.name || '',
        type: it.type || it.displayType || 'Physical Product',
        displayType: it.displayType || it.type || 'Physical Product',
        revision: it.revision || '—',
        state: it.state || it.maturity || '—',
        maturity: it.maturity || it.state || '—',
        owner: it.owner || '—',
        organization: it.organization || '',
        collabSpace: it.collabSpace || '',
        approval: it.approval || 'Unknown',
        quantity: it.quantity || 1
      };
    });
  }

  function metaFromPayload(payload, items) {
    var norm = normalizePayload(payload);
    var root = norm && norm.rootPhysicalId;
    if (!root && items.length) root = items[0].physicalid;
    return {
      productName: (norm && norm.productName) || (items[0] && (items[0].title || items[0].name)) || 'E-BOM',
      rootPhysicalId: root,
      itemCount: items.length,
      exportedAt: norm && norm.exportedAt
    };
  }

  function buildFromImported(items, productName) {
    return {
      version: FORMAT_VERSION,
      productName: productName || 'E-BOM',
      exportedAt: new Date().toISOString(),
      rootPhysicalId: items.length ? items[0].physicalid : null,
      items: items
    };
  }

  function saveSession(payload) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch (e) { /* */ }
  }

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Snapshot HTTP ' + r.status + ' — ' + url);
      return r.json();
    });
  }

  function applyPayload(payload) {
    var items = itemsFromPayload(payload);
    if (!items || !items.length) {
      return Promise.reject(new Error('Snapshot vazio ou formato inválido'));
    }
    var meta = metaFromPayload(payload, items);
    return BomService.loadFromImportedItems(items).then(function () {
      saveSession(normalizePayload(payload));
      return meta;
    });
  }

  function getBuiltinPayload() {
    try {
      if (typeof global !== 'undefined' && global.__3DX_BUILTIN_SNAPSHOT__) {
        return normalizePayload(global.__3DX_BUILTIN_SNAPSHOT__);
      }
    } catch (e) { /* */ }
    return BUILTIN_MONT10;
  }

  function applyBuiltinMont10() {
    return applyPayload(getBuiltinPayload());
  }

  function isMont10SnapshotUrl(url) {
    if (!url) return true;
    return /mont10/i.test(String(url));
  }

  function fetchAndApply(url) {
    return fetchJson(url).catch(function (err) {
      if (!isMont10SnapshotUrl(url)) throw err;
      return applyBuiltinMont10();
    });
  }

  function downloadJson(payload, filename) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'bom-snapshot.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return {
    FORMAT_VERSION: FORMAT_VERSION,
    GITHUB_BASE: GITHUB_BASE,
    resolveUrl: resolveUrl,
    getParamUrl: getParamUrl,
    normalizePayload: normalizePayload,
    itemsFromPayload: itemsFromPayload,
    buildFromImported: buildFromImported,
    saveSession: saveSession,
    loadSession: loadSession,
    fetchJson: fetchJson,
    applyPayload: applyPayload,
    fetchAndApply: fetchAndApply,
    applyBuiltinMont10: applyBuiltinMont10,
    BUILTIN_MONT10: BUILTIN_MONT10,
    downloadJson: downloadJson
  };
})();
