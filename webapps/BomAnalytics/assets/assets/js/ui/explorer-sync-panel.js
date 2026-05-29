/**
 * @file ui/explorer-sync-panel.js
 * Sincroniza com Product Explorer (aba EXPLORE) via postMessage ou ID manual.
 */
var ExplorerSyncPanel = (function () {
  'use strict';

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
    var input = document.getElementById('explorerObjectId');
    if (!input) return null;
    var id = input.value.trim();
    if (!id || id.length < 10) return null;
    var nameInput = document.getElementById('explorerObjectName');
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
    var btnSync = document.getElementById('btnSyncExplorer');
    var btnLoadId = document.getElementById('btnLoadObjectId');
    var btnCopyHelp = document.getElementById('btnCopyHelp');

    if (btnSync) {
      btnSync.addEventListener('click', function () {
        requestSyncFromDashboard();
        if (options.onStatus) {
          options.onStatus(
            'Pedido enviado ao 3DDashboard. Se nada mudar em 5s, use o ID manual (aba EXPLORE).',
            'warn'
          );
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
        var el = document.getElementById('syncHelpText');
        if (el) el.classList.toggle('open');
      });
    }

    ProductExplorerBridge.subscribe(function (sel) {
      saveSelection(sel);
      if (document.getElementById('explorerObjectId')) {
        document.getElementById('explorerObjectId').value = sel.physicalid || '';
      }
      if (document.getElementById('explorerObjectName')) {
        document.getElementById('explorerObjectName').value = sel.displayName || sel.name || '';
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
