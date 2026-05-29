/**
 * @file services/explorer-scanner.js
 * Botão "Varrer estrutura" — API (WAF), clipboard ou cola na caixa.
 */
var ExplorerScanner = (function () {
  'use strict';

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms || 400);
    });
  }

  function canUseWafApi() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    try {
      if (typeof widget !== 'undefined' && widget) return true;
      if (typeof require !== 'undefined') return true;
    } catch (e) { /* */ }
    return false;
  }

  function isValidId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 16;
  }

  function getSelection() {
    if (typeof ProductExplorerBridge === 'undefined') return null;
    ProductExplorerBridge.pollSelection();
    var sel = ProductExplorerBridge.getSelection();
    if (sel && isValidId(sel.physicalid)) return sel;
    var fromHash = ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
    if (fromHash && isValidId(fromHash.physicalid)) return fromHash;
    return null;
  }

  function readManualPhysicalId() {
    var el = document.getElementById('explorerObjectId');
    var id = el && el.value ? String(el.value).trim() : '';
    if (!isValidId(id)) return null;
    var nameEl = document.getElementById('explorerObjectName');
    var label = nameEl && nameEl.value ? String(nameEl.value).trim() : id;
    return {
      physicalid: id,
      type: 'VPMReference',
      name: label,
      displayName: label,
      displayType: 'Physical Product',
      source: 'manual-id'
    };
  }

  function pickSearchHit(term, hits) {
    if (!hits || !hits.length) return null;
    var t = String(term || '').toLowerCase();
    var exact = hits.filter(function (h) {
      var n = (h.name || h.displayName || '').toLowerCase();
      return n === t || n.indexOf(t) === 0;
    });
    return exact.length ? exact[0] : hits[0];
  }

  function resolveSelectionBySearch(term) {
    if (!canUseWafApi()) return Promise.resolve(null);
    if (typeof SearchApi === 'undefined' || typeof ProductSearchService === 'undefined') {
      return Promise.resolve(null);
    }
    return ensureSpaceApi().then(function () {
      var space =
        (typeof PlatformBridge !== 'undefined' && PlatformBridge.getSpaceUrl && PlatformBridge.getSpaceUrl()) ||
        (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost
          ? 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia'
          : null);
      if (!space) return null;
      SearchApi.init(space);
      return ProductSearchService.search(term).then(function (hits) {
        var hit = pickSearchHit(term, hits);
        if (!hit || !isValidId(hit.physicalid)) return null;
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection(hit, { silent: true });
        }
        return hit;
      });
    }).catch(function () {
      return null;
    });
  }

  /**
   * Seleção Explorer → campo manual → busca ENOVIA (ex.: Mont10).
   */
  function resolveSelection() {
    var sel = getSelection();
    if (sel) return Promise.resolve(sel);

    var manual = readManualPhysicalId();
    if (manual) return Promise.resolve(manual);

    var term =
      (APP_CONFIG.EXPLORER_DEFAULT_NAME || 'Mont10').trim() ||
      (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.defaultDisplayName) ||
      'Mont10';

    return resolveSelectionBySearch(term);
  }

  function indexToSnapshot(index, rootId, productName) {
    var flat = BomNormalizer.toFlatList(index, rootId);
    var items = flat.map(function (n) {
      return {
        level: n.level != null ? n.level : 0,
        physicalid: n.physicalid,
        name: n.name || n.title || n.physicalid,
        title: n.title || n.name || '',
        type: n.type || 'VPMReference',
        displayType: n.displayType || 'Physical Product',
        revision: n.revision || '—',
        state: n.state || n.maturity || '—',
        maturity: n.maturity || n.state || '—',
        owner: n.owner || '—',
        approval: n.approval || 'Unknown',
        quantity: n.quantity || 1
      };
    });
    return BomSnapshot.buildFromImported(items, productName || 'E-BOM');
  }

  function ensureSpaceApi() {
    var space =
      (typeof PlatformBridge !== 'undefined' && PlatformBridge.getSpaceUrl && PlatformBridge.getSpaceUrl()) ||
      (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost
        ? 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia'
        : null);
    if (!space) return Promise.reject(new Error('URL 3DSpace não configurada'));
    try {
      EnoviaApi.init(space);
    } catch (e) { /* */ }
    var chain = PlatformContext.init();
    if (typeof CompassServices !== 'undefined' && CompassServices.fetchCsrfToken) {
      chain = chain.then(function () {
        return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
      });
    }
    return chain;
  }

  function scanViaApi(sel) {
    var boot =
      typeof WafBootstrap !== 'undefined' && WafBootstrap.ensure
        ? WafBootstrap.ensure()
        : Promise.resolve();
    return boot.then(function () {
      if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
      return ensureSpaceApi();
    }).then(function () {
      return BomService.loadRoot(sel.physicalid);
    }).then(function () {
      var rootId = BomService.getRootId();
      var name = sel.displayName || sel.name || 'E-BOM';
      var payload = indexToSnapshot(BomService.getIndex(), rootId, name);
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        return {
          ok: true,
          mode: 'api',
          meta: meta,
          message: 'Varredura concluída: ' + meta.itemCount + ' itens — ' + meta.productName
        };
      });
    });
  }

  function scanViaText(text, sourceLabel) {
    if (!text || !String(text).trim()) {
      return Promise.reject(new Error('Nenhum dado para varrer'));
    }
    return FileImportService.parseTextAsync(text).then(function (items) {
      if (!items || !items.length) {
        throw new Error('Nenhuma linha reconhecida na cópia do Explorer');
      }
      var root = items[0];
      for (var i = 0; i < items.length; i++) {
        if (items[i].level === 0 || i === 0) {
          root = items[i];
          break;
        }
      }
      var name = root.title || root.name || 'E-BOM';
      var payload = BomSnapshot.buildFromImported(items, name);
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        return {
          ok: true,
          mode: sourceLabel || 'text',
          meta: meta,
          message: 'Varredura concluída: ' + meta.itemCount + ' itens'
        };
      });
    });
  }

  function scanViaClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.reject(new Error('Leitura da área de transferência bloqueada'));
    }
    return navigator.clipboard.readText().then(function (text) {
      return scanViaText(text, 'clipboard');
    });
  }

  function scanViaPasteArea() {
    var area = document.getElementById('pasteArea');
    var text = area && area.value ? area.value.trim() : '';
    if (!text) return Promise.reject(new Error('Caixa de cola vazia'));
    return scanViaText(text, 'cola');
  }

  function scanViaApiOrSelection() {
    return resolveSelection().then(function (sel) {
      if (canUseWafApi() && sel) {
        return scanViaApi(sel);
      }
      return Promise.reject(new Error('Sem seleção/API'));
    });
  }

  /**
   * Ordem: clipboard (Ctrl+C) → API/seleção → caixa de cola.
   */
  function scan() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestDashboardSelection) {
      PlatformBridge.requestDashboardSelection();
    }
    return wait(200).then(function () {
      return scanViaClipboard()
        .catch(function () {
          return scanViaApiOrSelection();
        })
        .catch(function () {
          return scanViaPasteArea();
        })
        .catch(function (apiErr) {
          var hint =
            'Varredura falhou: no Explorer selecione Mont10 + filhos (Ctrl+A na grade), Ctrl+C, depois Varrer.';
          if (apiErr && apiErr.message && apiErr.message.indexOf('Sem seleção') < 0) {
            hint = apiErr.message + ' ' + hint;
          }
          throw new Error(hint);
        });
    });
  }

  return {
    scan: scan,
    resolveSelection: resolveSelection,
    indexToSnapshot: indexToSnapshot,
    getSelection: getSelection
  };
})();
