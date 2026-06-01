/**
 * @file ui/sync-banner.js
 * Comparador Explorer vs Dashboard (contagem e alerta de divergência).
 */
var SyncBanner = (function () {
  'use strict';

  function byId(id) {
    if (typeof byId3dx === 'function') return byId3dx(id);
    var root = window.__3DX_UI_ROOT__;
    if (root) {
      var el = root.querySelector('#' + id);
      if (el) return el;
    }
    return document.getElementById(id);
  }

  function parseExplorerCount() {
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

  function update(dashboardCount) {
    var el = byId('syncBanner');
    if (!el) return;
    var explorer = parseExplorerCount();
    var dash = dashboardCount || 0;
    if (typeof BomService !== 'undefined' && BomService.getNodeCount && BomService.getNodeCount() > 0) {
      dash = BomService.getNodeCount();
    }
    if (!explorer && typeof FileImportService !== 'undefined' && FileImportService.getImportReport) {
      var rep = FileImportService.getImportReport();
      if (rep && rep.explorerExpected > 0) explorer = rep.explorerExpected;
    }

    if (!explorer && dash < 1) {
      el.className = 'bom-sync-banner bom-sync-info';
      el.innerHTML =
        'Nenhuma estrutura importada. No Explorer: expanda a árvore → Ctrl+A → Ctrl+C → ' +
        '<strong>Atualizar estrutura</strong>.';
      return;
    }

    if (!explorer && dash > 0) {
      el.className = 'bom-sync-banner bom-sync-ok';
      el.innerHTML = 'Dashboard: <strong>' + dash + '</strong> peças carregadas.';
      return;
    }

    var diff = Math.abs(explorer - dash);
    if (diff === 0) {
      el.className = 'bom-sync-banner bom-sync-ok';
      el.innerHTML =
        'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
        '</strong> — sincronizado';
      return;
    }

    var skipHint = '';
    if (typeof FileImportService !== 'undefined' && FileImportService.getImportReport) {
      var rep = FileImportService.getImportReport();
      if (rep && rep.skippedCount > 0) {
        skipHint = ' · ' + rep.skippedCount + ' linha(s) ignorada(s) no import';
      }
    }

    if (diff === 1) {
      el.className = 'bom-sync-banner bom-sync-warn';
      el.innerHTML =
        'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
        '</strong> — falta <strong>1</strong> peça. Expanda tudo → Ctrl+A → Ctrl+C → ' +
        '<strong>Atualizar estrutura</strong>.' + skipHint;
      return;
    }

    el.className = 'bom-sync-banner bom-sync-warn';
    el.innerHTML =
      'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
      '</strong> — diferença de <strong>' + diff +
      '</strong>. Expanda todos os níveis no Explorer e clique <strong>Atualizar estrutura</strong>.' +
      skipHint;
  }

  return { update: update, parseExplorerCount: parseExplorerCount };
})();
