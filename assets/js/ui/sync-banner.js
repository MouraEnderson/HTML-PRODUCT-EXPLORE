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
    if (ProductExplorerBridge.getExplorerSelectionCount) {
      var n = ProductExplorerBridge.getExplorerSelectionCount();
      if (n > 0) return n;
    }
    var text =
      ProductExplorerBridge.harvestAllExplorerText
        ? ProductExplorerBridge.harvestAllExplorerText()
        : '';
    var m = String(text).match(/(\d+)\s*(?:de|of)\s*(\d+)\s*(?:selecionado|selected)/i);
    if (m) return parseInt(m[2], 10) || parseInt(m[1], 10);
    if (ProductExplorerBridge.scrapeExplorerGrid) {
      var hint =
        ProductExplorerBridge.getStructureNameHint &&
        ProductExplorerBridge.getStructureNameHint();
      var payload = ProductExplorerBridge.scrapeExplorerGrid(hint);
      if (payload && payload.items && payload.items.length) return payload.items.length;
    }
    return null;
  }

  function update(dashboardCount) {
    var el = byId('syncBanner');
    if (!el) return;
    var explorer = parseExplorerCount();
    var dash = dashboardCount || 0;

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
    if (diff <= 1) {
      el.className = 'bom-sync-banner bom-sync-ok';
      el.innerHTML =
        'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
        '</strong> — sincronizado';
      return;
    }

    el.className = 'bom-sync-banner bom-sync-warn';
    el.innerHTML =
      'Explorer: <strong>' + explorer + '</strong> · Dashboard: <strong>' + dash +
      '</strong> — diferença de <strong>' + diff +
      '</strong>. Expanda todos os níveis no Explorer e clique <strong>Atualizar estrutura</strong>.';
  }

  return { update: update, parseExplorerCount: parseExplorerCount };
})();
