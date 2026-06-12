/**
 * @file integration/explorer-mirror-provider.js
 * DEC-016 — Explorer Mirror (fonte principal tabela/KPI).
 * Apenas fontes oficiais: postMessage, contexto widget, AMD 3DEXPERIENCE.
 * Proibido: DOM scraping, clipboard, TSV, slice, Expand Item como fonte principal.
 */
(function (global) {
  'use strict';

  var w = global;
  var BUILD = 'bom20260614k';
  var LOG = '[ExplorerMirror]';
  var SOURCE_MODE = 'explorer-mirror';
  var HONEST_FAILURE_MSG =
    'Não foi encontrada fonte oficial para espelhar exatamente a grade atual do Product Structure Explorer. ' +
    'Expand Item está disponível, mas retorna uma expansão diferente da visualização do Explorer.';

  var OFFICIAL_MESSAGE_HINTS = [
    '3DX_STRUCTURE',
    '3DX_STRUCTURE_RESPONSE',
    'structureRoot',
    'getStructureRoot',
    'ENOPSTR_selection',
    'ENOPSTR_structure',
    'productexplorer.structure',
    'structureLoaded',
    'loadedNodes',
    'visibleStructure'
  ];

  function s(v) {
    return String(v || '').trim();
  }

  function n(v) {
    var x = Number(v);
    return isFinite(x) ? x : 0;
  }

  function log() {
    try {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(LOG);
      console.log.apply(console, args);
    } catch (e) {}
  }

  function labelText(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object') {
      return s(v.label || v.displayName || v.name || v.title || v.value);
    }
    return s(v);
  }

  function getExplorerCount() {
    try {
      if (typeof w.ProductExplorerBridge !== 'undefined') {
        if (w.ProductExplorerBridge.pollDashboardExplorerChrome) {
          w.ProductExplorerBridge.pollDashboardExplorerChrome();
        }
        if (w.ProductExplorerBridge.getExplorerObjectCount) {
          var c = n(w.ProductExplorerBridge.getExplorerObjectCount());
          if (c > 0) return c;
        }
      }
      if (typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        if (ctx && n(ctx.expectedCount) > 0) return n(ctx.expectedCount);
      }
    } catch (e) {}
    return 0;
  }

  function getRootName() {
    var name = '';
    try {
      if (w.ProductExplorerBridge && w.ProductExplorerBridge.getStructureNameHint) {
        name = s(w.ProductExplorerBridge.getStructureNameHint());
      }
      if (!name && typeof w.ExplorerContext !== 'undefined' && w.ExplorerContext.refresh) {
        var ctx = w.ExplorerContext.refresh(true);
        name = s(ctx && ctx.rootName);
      }
    } catch (e) {}
    return name;
  }

  function isForbiddenSource(data) {
    if (!data) return true;
    var blob = JSON.stringify(data).toLowerCase();
    if (/scrape|dom-mirror|clipboard|tsv|ctrl\+c|paste-trap|explorer-mirror-dom/i.test(blob)) {
      return true;
    }
    if (data.scrapeSource && /mirror|dom|tsv|clipboard|paste/i.test(String(data.scrapeSource))) {
      return true;
    }
    return false;
  }

  function isStructureRowLike(row) {
    row = row || {};
    if (!row || typeof row !== 'object') return false;
    var title = labelText(row.title || row.name || row.displayName || row.label);
    return title.length > 0;
  }

  function pickItemArray(data) {
    if (!data || typeof data !== 'object') return null;
    var candidates = [
      data.structureItems,
      data.loadedItems,
      data.loadedNodes,
      data.visibleRows,
      data.visibleItems,
      data.gridRows,
      data.rows,
      data.members,
      data.items,
      data.data && data.data.structureItems,
      data.data && data.data.loadedNodes,
      data.data && data.data.loadedItems,
      data.data && data.data.items,
      data.structure && data.structure.items,
      data.structure && data.structure.rows,
      data.tree && data.tree.nodes,
      data.payload && data.payload.items
    ];
    var i;
    for (i = 0; i < candidates.length; i++) {
      var arr = candidates[i];
      if (!Array.isArray(arr) || arr.length < 1) continue;
      if (arr.every(isStructureRowLike)) return arr;
      if (arr.filter(isStructureRowLike).length >= Math.max(1, Math.floor(arr.length * 0.6))) {
        return arr.filter(isStructureRowLike);
      }
    }
    return null;
  }

  function isOfficialStructureMessage(data) {
    if (!data || typeof data !== 'object' || isForbiddenSource(data)) return false;
    var type = s(data.type || data.event || data.name || data.messageName || data.action);
    var protocol = s(data.protocol);
    var i;
    for (i = 0; i < OFFICIAL_MESSAGE_HINTS.length; i++) {
      if (type.indexOf(OFFICIAL_MESSAGE_HINTS[i]) >= 0) return true;
    }
    if (/structure|ENOPSTR|loadedNodes|treeLoaded|visibleStructure/i.test(type + ' ' + protocol)) {
      return true;
    }
    return !!pickItemArray(data);
  }

  function mapOfficialRowToItem(row, idx, rootName) {
    row = row || {};
    var title = labelText(row.title || row.name || row.displayName || row.label);
    var description = labelText(row.description || row.desc || row.subtitle);
    if (!description && row.title && row.name && s(row.title) !== s(row.name)) {
      description = labelText(row.title);
    }
    var revision = labelText(row.revision || row.rev || row.version);
    var owner = labelText(row.owner || row.proprietario || row['dseno:owner']);
    var maturity = labelText(
      row.maturity || row.state || row.maturityState || row['dseno:current']
    );
    var format = labelText(
      row.format || row.displayType || row.type || row.objectType || row['dseno:type']
    );
    var physicalid = s(
      row.physicalid ||
        row.physicalId ||
        row.objectId ||
        row.id ||
        row.resourceid ||
        row.referenceId
    );
    if (!physicalid) physicalid = 'mirror_' + idx;
  return {
      level: n(row.level != null ? row.level : row.depth),
      physicalid: physicalid,
      name: title || ('Item ' + idx),
      title: description || '—',
      description: description || '—',
      type: format || 'VPMReference',
      displayType: format || '—',
      revision: revision || '—',
      state: maturity || '—',
      maturity: maturity || '—',
      owner: owner || '—',
      approval: labelText(row.approval) || 'Unknown',
      quantity: n(row.quantity) || 1,
      sourcePhysicalId: physicalid,
      scrapeSource: 'official-explorer-mirror',
      root: idx === 0 && !!row.root
    };
  }

  function normalizeOfficialItems(rawItems, rootName) {
    rawItems = Array.isArray(rawItems) ? rawItems : [];
    return rawItems.map(function (row, idx) {
      return mapOfficialRowToItem(row, idx, rootName);
    });
  }

  function buildReport(base) {
    base = base || {};
    base.build = BUILD;
    base.sourceMode = SOURCE_MODE;
    base.timestamp = new Date().toISOString();
    base.explorerCount = n(base.explorerCount);
    base.dashboardRows = n(base.dashboardRows);
    base.divergence =
      base.divergence != null
        ? !!base.divergence
        : base.explorerCount > 0 && base.dashboardRows !== base.explorerCount;
    base.isExplorerMirror =
      !!base.ok && !!base.isExplorerMirror && !base.divergence && base.dashboardRows > 0;
    if (base.expandItemRows == null) base.expandItemRows = null;
    w.__bomTechnicalReport = base;
    return base;
  }

  function divergenceMessage(explorerCount, dashboardRows) {
    return (
      'Divergência: Product Explorer mostra ' +
      explorerCount +
      ' objetos, mas a fonte do dashboard retornou ' +
      dashboardRows +
      ' linhas. A tabela principal não será considerada mirror do Explorer.'
    );
  }

  function requestOfficialStructureAndWait(timeoutMs) {
    timeoutMs = n(timeoutMs) || 4000;
    return new Promise(function (resolve) {
      var best = null;
      var bestSource = '';

      function consider(data, sourceLabel) {
        if (!data || isForbiddenSource(data)) return;
        var arr = pickItemArray(data);
        if (!arr || !arr.length) return;
        if (!best || arr.length > best.length) {
          best = { raw: data, items: arr, sourceUsed: sourceLabel };
          bestSource = sourceLabel;
        }
      }

      function onMessage(event) {
        if (!event || !event.data) return;
        var origin = event.origin || '';
        if (
          origin &&
          origin !== location.origin &&
          origin.indexOf('3dexperience.3ds.com') < 0 &&
          origin.indexOf('3ds.com') < 0
        ) {
          return;
        }
        var data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            return;
          }
        }
        if (!isOfficialStructureMessage(data)) return;
        var type = s(data.type || data.event || data.protocol || 'postMessage');
        consider(data, 'postMessage:' + type);
      }

      window.addEventListener('message', onMessage);

      try {
        if (w.__BOM_OFFICIAL_STRUCTURE_CACHE__) {
          consider(w.__BOM_OFFICIAL_STRUCTURE_CACHE__, 'widget-cache');
        }
      } catch (eCache) {}

      try {
        if (typeof w.PlatformBridge !== 'undefined') {
          if (w.PlatformBridge.requestExplorerStructure) w.PlatformBridge.requestExplorerStructure();
          if (w.PlatformBridge.requestDashboardSelection) w.PlatformBridge.requestDashboardSelection();
        }
      } catch (eReq) {}

      setTimeout(function () {
        window.removeEventListener('message', onMessage);
        if (best) {
          resolve({
            items: best.items,
            sourceUsed: bestSource,
            raw: best.raw
          });
        } else {
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  function tryAmdOfficialStructure(rootName) {
    return new Promise(function (resolve) {
      var req = typeof require !== 'undefined' ? require : null;
      if (!req) {
        resolve(null);
        return;
      }
      var modules = [
        'DS/ENOPSTR_AP/ENOPSTR_AP',
        'DS/ENOSCEN_AP/ENOSCEN_AP',
        'DS/PlatformAPI/PlatformAPI'
      ];
      var idx = 0;

      function next() {
        if (idx >= modules.length) {
          resolve(null);
          return;
        }
        var modName = modules[idx++];
        try {
          req([modName], function (Mod) {
            try {
              if (Mod && Mod.getLoadedStructure && typeof Mod.getLoadedStructure === 'function') {
                var payload = Mod.getLoadedStructure();
                var arr = pickItemArray(payload) || pickItemArray({ items: payload });
                if (arr && arr.length) {
                  resolve({
                    items: arr,
                    sourceUsed: 'amd:' + modName + '.getLoadedStructure'
                  });
                  return;
                }
              }
              if (Mod && Mod.getVisibleNodes && typeof Mod.getVisibleNodes === 'function') {
                var nodes = Mod.getVisibleNodes();
                if (Array.isArray(nodes) && nodes.length) {
                  resolve({
                    items: nodes,
                    sourceUsed: 'amd:' + modName + '.getVisibleNodes'
                  });
                  return;
                }
              }
            } catch (eMod) {}
            next();
          }, function () {
            next();
          });
        } catch (eReq) {
          next();
        }
      }

      next();
    });
  }

  function fetchExplorerMirror(options) {
    options = options || {};
    var explorerCount = n(options.explorerCount) || getExplorerCount();
    var rootName = s(options.rootName) || getRootName();
    log('fetch', { explorerCount: explorerCount, rootName: rootName });

    return requestOfficialStructureAndWait(options.timeoutMs)
      .then(function (payload) {
        if (payload && payload.items && payload.items.length) {
          return payload;
        }
        return tryAmdOfficialStructure(rootName);
      })
      .then(function (payload) {
        var sourceUsed = (payload && payload.sourceUsed) || 'none';
        var rawItems = (payload && payload.items) || [];
        var items = normalizeOfficialItems(rawItems, rootName);
        var dashboardRows = items.length;

        if (!dashboardRows) {
          return buildReport({
            ok: false,
            sourceUsed: 'none',
            explorerCount: explorerCount,
            dashboardRows: 0,
            divergence: false,
            isExplorerMirror: false,
            rootName: rootName,
            items: [],
            message: HONEST_FAILURE_MSG
          });
        }

        if (explorerCount > 0 && dashboardRows !== explorerCount) {
          return buildReport({
            ok: false,
            sourceUsed: sourceUsed,
            explorerCount: explorerCount,
            dashboardRows: dashboardRows,
            divergence: true,
            isExplorerMirror: false,
            rootName: rootName,
            items: items,
            message: divergenceMessage(explorerCount, dashboardRows)
          });
        }

        return buildReport({
          ok: true,
          sourceUsed: sourceUsed,
          explorerCount: explorerCount || dashboardRows,
          dashboardRows: dashboardRows,
          divergence: false,
          isExplorerMirror: true,
          rootName: rootName,
          items: items,
          message: 'Explorer Mirror: ' + dashboardRows + ' linhas'
        });
      });
  }

  function attachExpandItemDiagnostic(expandItemRows) {
    var rep = w.__bomTechnicalReport || {};
    rep.expandItemRows = n(expandItemRows);
    w.__bomTechnicalReport = rep;
    return rep;
  }

  w.ExplorerMirrorProvider = {
    BUILD: BUILD,
    SOURCE_MODE: SOURCE_MODE,
    HONEST_FAILURE_MSG: HONEST_FAILURE_MSG,
    fetch: fetchExplorerMirror,
    getExplorerCount: getExplorerCount,
    buildReport: buildReport,
    attachExpandItemDiagnostic: attachExpandItemDiagnostic,
    divergenceMessage: divergenceMessage
  };
})(typeof window !== 'undefined' ? window : global);
