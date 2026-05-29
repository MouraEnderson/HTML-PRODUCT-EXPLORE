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
    if (typeof WAFData === 'undefined' || typeof EnoviaApi === 'undefined') return false;
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
    var chain = Promise.resolve();
    if (typeof CompassServices !== 'undefined' && CompassServices.fetchCsrfToken) {
      chain = CompassServices.fetchCsrfToken(space).catch(function () { return null; });
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
          message: 'Varredura concluída (API): ' + meta.itemCount + ' itens — ' + meta.productName
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
      var name = items[0].title || items[0].name || 'E-BOM';
      var payload = BomSnapshot.buildFromImported(items, name);
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        return {
          ok: true,
          mode: sourceLabel || 'text',
          meta: meta,
          message: 'Varredura concluída (' + (sourceLabel || 'cola') + '): ' + meta.itemCount + ' itens'
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

  /**
   * Ordem: seleção+API → clipboard → caixa de cola.
   */
  function scan() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestDashboardSelection) {
      PlatformBridge.requestDashboardSelection();
    }
    return wait(700).then(function () {
      var sel = getSelection();
      if (canUseWafApi() && sel) {
        return scanViaApi(sel).catch(function (apiErr) {
          return scanViaClipboard()
            .catch(function () { return scanViaPasteArea(); })
            .catch(function () {
              throw new Error(
                (apiErr && apiErr.message ? apiErr.message + '. ' : '') +
                  'Copie a grade do Explorer (Ctrl+C) e clique Varrer novamente.'
              );
            });
        });
      }
      return scanViaClipboard()
        .catch(function () { return scanViaPasteArea(); })
        .catch(function () {
          var hint =
            'Varredura falhou: abra Mont10, selecione linhas na grade, Ctrl+C, depois Varrer (ou cole na caixa).';
          if (sel && !canUseWafApi()) {
            hint =
              'Varredura falhou: API bloqueada no GitHub. Ctrl+C na grade → Varrer (lê clipboard) ou cole → Varrer.';
          }
          throw new Error(hint);
        });
    });
  }

  return {
    scan: scan,
    indexToSnapshot: indexToSnapshot,
    getSelection: getSelection
  };
})();
