/**
 * @file ui/sync-banner.js
 * Sprint 2.5 — banner honesto: modo (API/TSV/Cola) + contagem Explorer vs Dashboard.
 */
var SyncBanner = (function () {
  'use strict';

  var lastLoad = {
    loaderMode: '',
    refreshSource: '',
    partial: false,
    truncated: false,
    domFallback: false,
    expected: 0
  };

  function byId(id) {
    if (typeof byId3dx === 'function') return byId3dx(id);
    var root = window.__3DX_UI_ROOT__;
    if (root) {
      var el = root.querySelector('#' + id);
      if (el) return el;
    }
    return document.getElementById(id);
  }

  function clearLoad() {
    lastLoad.loaderMode = '';
    lastLoad.refreshSource = '';
    lastLoad.partial = false;
    lastLoad.truncated = false;
    lastLoad.domFallback = false;
    lastLoad.expected = 0;
  }

  function setLoadResult(res) {
    if (!res) return;
    lastLoad.loaderMode = res.loaderMode || res.mode || lastLoad.loaderMode;
    lastLoad.refreshSource = res.refreshSource || lastLoad.refreshSource;
    lastLoad.partial = !!res.partial;
    lastLoad.truncated = !!(res.meta && res.meta.truncated);
    lastLoad.domFallback =
      !!res.domFallback ||
      lastLoad.loaderMode === 'dom-fallback' ||
      String(res.mode || '').indexOf('mirror') >= 0 ||
      String(res.mode || '').indexOf('grid') >= 0;
    if (res.context && res.context.expectedCount > 0) {
      lastLoad.expected = res.context.expectedCount;
    }
  }

  function parseExplorerCount() {
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
      var ctx = ExplorerContext.refresh(true);
      if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    }
    if (typeof ProductExplorerBridge === 'undefined') return null;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.getExplorerObjectCount) {
      var objN = ProductExplorerBridge.getExplorerObjectCount();
      if (objN > 0) return objN;
    }
    if (ProductExplorerBridge.getExplorerSelectionCount) {
      var n = ProductExplorerBridge.getExplorerSelectionCount();
      if (n > 0) return n;
    }
    return null;
  }

  function modeLabel(mode) {
    mode = String(mode || '').toLowerCase();
    if (mode === 'api') return 'API';
    if (mode === 'tsv' || mode.indexOf('explorer') >= 0 || mode === 'text') return 'TSV';
    if (mode === 'paste' || mode === 'cola' || mode.indexOf('clipboard') >= 0 || mode.indexOf('ctrl') >= 0) {
      return 'Cola';
    }
    if (mode === 'dom-fallback' || mode.indexOf('mirror') >= 0 || mode.indexOf('grid') >= 0) {
      return 'DOM';
    }
    if (mode === 'builtin-last' || mode === 'snapshot-file') return 'Snapshot';
    return mode ? mode.toUpperCase() : '';
  }

  function dashboardQuality() {
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.assessMirrorQuality) {
      return { ok: true, badRows: 0 };
    }
    if (typeof BomService === 'undefined' || !BomService.getFlatItems) {
      return { ok: true, badRows: 0 };
    }
    return ProductExplorerBridge.assessMirrorQuality(BomService.getFlatItems());
  }

  function countLine(mode, dash, explorer) {
    var line = mode || 'Import';
    line += ' ' + dash;
    if (explorer > 0) line += '/' + explorer;
    return line;
  }

  function update(dashboardCount) {
    var el = byId('syncBanner');
    if (!el) return;

    var explorer = parseExplorerCount();
    if (!explorer && lastLoad.expected > 0) explorer = lastLoad.expected;
    if (!explorer && typeof FileImportService !== 'undefined' && FileImportService.getImportReport) {
      var rep = FileImportService.getImportReport();
      if (rep && rep.explorerExpected > 0) explorer = rep.explorerExpected;
    }

    var dash = dashboardCount || 0;
    if (typeof BomService !== 'undefined' && BomService.getNodeCount && BomService.getNodeCount() > 0) {
      dash = BomService.getNodeCount();
    }

    var mode = modeLabel(lastLoad.loaderMode);

    if (!explorer && dash < 1) {
      el.className = 'bom-sync-banner bom-sync-info';
      el.innerHTML =
        'Nenhuma estrutura carregada. Abra o Product Structure Explorer ao lado e clique ' +
        '<strong>Atualizar estrutura</strong>.';
      return;
    }

    if (!explorer && dash > 0) {
      el.className = 'bom-sync-banner bom-sync-ok';
      el.innerHTML =
        (mode ? '<strong>' + mode + '</strong> ' : '') +
        'Dashboard: <strong>' + dash + '</strong> peças.';
      return;
    }

    var quality = dashboardQuality();
    var diff = explorer > 0 ? Math.abs(explorer - dash) : 0;
    var partial = lastLoad.partial || (explorer > 0 && dash < explorer - 1);

    if (lastLoad.domFallback) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>DOM espelho (fallback)</strong> ' + countLine(mode || 'DOM', dash, explorer) +
        ' — dados podem estar incompletos; prefira <strong>API</strong> ou <strong>TSV</strong>.';
      return;
    }

    if (lastLoad.truncated) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>' + countLine(mode || 'API', dash, explorer) + '</strong>' +
        ' — estrutura truncada (limite BOM_MAX_NODES). Filtre ou aumente o limite.';
      return;
    }

    if (partial) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>Parcial ' + dash + '/' + explorer + '</strong>' +
        (mode ? ' (' + mode + ')' : '') +
        ' — expanda todos os níveis no Explorer ou use <strong>API</strong>. ' +
        'Clique <strong>Atualizar estrutura</strong>.';
      return;
    }

    if (!quality.ok && quality.badRows > 0) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        '<strong>' + countLine(mode, dash, explorer) + '</strong>' +
        ' — contagem ' + (diff === 0 ? 'OK' : 'difere') +
        ', mas <strong>' + quality.badRows + '</strong> linha(s) com colunas erradas.';
      return;
    }

    if (explorer > 0 && diff <= 1) {
      el.className = 'bom-sync-banner bom-sync-ok';
      var autoTag =
        lastLoad.refreshSource === 'auto' ? ' · <span class="bom-sync-auto">sync auto</span>' : '';
      el.innerHTML =
        '<strong>' + countLine(mode || 'TSV', dash, explorer) + '</strong> — sincronizado' + autoTag;
      return;
    }

    el.className = 'bom-sync-banner bom-sync-warn';
    el.innerHTML =
      'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
      '</strong>' +
      (mode ? ' · modo <strong>' + mode + '</strong>' : '') +
      ' — diferença de <strong>' + diff +
      '</strong>. Clique <strong>Atualizar estrutura</strong>.';
  }

  return {
    update: update,
    setLoadResult: setLoadResult,
    clearLoad: clearLoad,
    parseExplorerCount: parseExplorerCount
  };
})();
