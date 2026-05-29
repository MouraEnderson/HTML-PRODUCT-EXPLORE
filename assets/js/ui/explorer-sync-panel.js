/**
 * @file ui/explorer-sync-panel.js
 * Sincroniza com Product Explorer (aba EXPLORE) via postMessage ou ID manual.
 */
var ExplorerSyncPanel = (function () {
  'use strict';

  function el(id) {
    return typeof byId3dx === 'function' ? byId3dx(id) : document.getElementById(id);
  }

  var STORAGE_KEY = '3dx_pe_last_selection';

  function saveSelection(sel) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
    } catch (e) { /* */ }
  }

  function loadStoredSelection() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function requestSyncFromDashboard() {
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
    return true;
  }

  function applyManualId() {
    var input = el('explorerObjectId');
    if (!input) return null;
    var id = input.value.trim();
    if (!id || id.length < 10) return null;
    var nameInput = el('explorerObjectName');
    var sel = {
      physicalid: id,
      type: 'VPMReference',
      name: nameInput ? nameInput.value.trim() : id,
      displayName: nameInput ? nameInput.value.trim() : id,
      source: 'manual'
    };
    ProductExplorerBridge.setSelection(sel);
    saveSelection(sel);
    return sel;
  }

  function init(options) {
    options = options || {};
    var btnSync = el('btnSyncExplorer');
    var btnLoadId = el('btnLoadObjectId');
    var btnCopyHelp = el('btnCopyHelp');

    if (btnSync) {
      btnSync.addEventListener('click', function () {
        requestSyncFromDashboard();
        var current = ProductExplorerBridge.getSelection();
        if (current && options.onSelect) {
          options.onSelect(current);
          if (options.onStatus) {
            options.onStatus('Explorer: ' + (current.displayName || current.physicalid), 'ok');
          }
          return;
        }
        var stored = loadStoredSelection();
        if (stored && options.onSelect) {
          options.onSelect(stored);
          if (options.onStatus) {
            options.onStatus('Explorer: ' + (stored.displayName || stored.physicalid), 'ok');
          }
          return;
        }
        if (options.onStatus) {
          options.onStatus('Abra o produto no Product Structure Explorer (EXPLORE).', 'info');
        }
      });
    }

    if (btnLoadId) {
      btnLoadId.addEventListener('click', function () {
        var sel = applyManualId();
        if (!sel) {
          if (options.onStatus) options.onStatus('Cole o Physical ID do Product Explorer.', 'warn');
          return;
        }
        if (options.onSelect) options.onSelect(sel);
        if (options.onStatus) {
          options.onStatus('Objeto vinculado: ' + sel.displayName, 'ok');
        }
      });
    }

    if (btnCopyHelp) {
      btnCopyHelp.addEventListener('click', function () {
        var el = el('syncHelpText');
        if (el) el.classList.toggle('open');
      });
    }

    ProductExplorerBridge.subscribe(function (sel) {
      saveSelection(sel);
      if (el('explorerObjectId')) {
        el('explorerObjectId').value = sel.physicalid || '';
      }
      if (el('explorerObjectName')) {
        el('explorerObjectName').value = sel.displayName || sel.name || '';
      }
    });

    var stored = loadStoredSelection();
    if (stored && stored.physicalid) {
      ProductExplorerBridge.setSelection(stored);
      if (options.onSelect && APP_CONFIG.CROSS_ORIGIN_WIDGET) {
        options.onSelect(stored);
      }
    }

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      setInterval(requestSyncFromDashboard, 8000);
    }
  }

  return {
    init: init,
    applyManualId: applyManualId,
    requestSyncFromDashboard: requestSyncFromDashboard
  };
})();
