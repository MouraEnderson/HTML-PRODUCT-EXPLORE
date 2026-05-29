/**
 * @file services/explorer-scanner.js
 * Varredura E-BOM via API ENOVIA (raiz dinâmica, pai/filho). Cola = fallback opcional.
 */
var ExplorerScanner = (function () {
  'use strict';

  var SESSION_ROOT_NAME = 'bom_last_root_name';

  function canUseWafApi() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return true;
    if (APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API) return true;
    return false;
  }

  function isTrustedDashboard() {
    try {
      if (window.__3DX_TRUSTED_WIDGET__) return true;
      if (typeof widget !== 'undefined' && widget) return true;
    } catch (e) { /* */ }
    return APP_CONFIG && APP_CONFIG.CAN_USE_ENOVIA_API;
  }

  function normalizeId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      return ThreeDXContentParser.normalizePhysicalId(id);
    }
    return String(id || '').trim();
  }

  function isValidId(id) {
    id = normalizeId(id);
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 8;
  }

  function clearBadSelection() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    var sel = ProductExplorerBridge.getSelection();
    if (ProductExplorerBridge.isBadDashboardSelection && ProductExplorerBridge.isBadDashboardSelection(sel)) {
      ProductExplorerBridge.clearSelection();
    }
  }

  function getSelection() {
    if (typeof ProductExplorerBridge === 'undefined') return null;
    ProductExplorerBridge.pollSelection();
    var sel = ProductExplorerBridge.getSelection();
    if (sel && ProductExplorerBridge.isBadDashboardSelection && ProductExplorerBridge.isBadDashboardSelection(sel)) {
      ProductExplorerBridge.clearSelection();
      sel = null;
    }
    if (sel && isValidId(sel.physicalid)) return sel;
    var fromHash = ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
    if (fromHash && isValidId(fromHash.physicalid)) return fromHash;
    return null;
  }

  function resolveFromUrlQuery() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var id = normalizeId(q.physicalid || APP_CONFIG.URL_PHYSICAL_ID || '');
    if (!id || !isValidId(id)) return null;
    var name = q.displayName || q.name || q.structure || q.rootName || getLabelStructureName() || id;
    return {
      physicalid: id,
      type: q.type || 'VPMReference',
      name: name,
      displayName: name,
      displayType: 'Physical Product',
      source: 'url-query'
    };
  }

  function readManualPhysicalId() {
    var el = document.getElementById('explorerObjectId');
    var id = normalizeId(el && el.value ? el.value : '');
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

  function getLabelStructureName() {
    var el = document.getElementById('selectionLabel');
    var t = el && el.textContent ? String(el.textContent).trim() : '';
    if (!t || t === '-') return null;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.isBadDashboardSelection) {
      if (ProductExplorerBridge.isBadDashboardSelection({ name: t, displayName: t })) return null;
    }
    return t;
  }

  function getExplorerRootSearchTerm() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.structure) return String(q.structure).trim();
    if (q.rootName) return String(q.rootName).trim();
    if (q.name && !isValidId(q.name)) return String(q.name).trim();
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      var hint = ProductExplorerBridge.getStructureNameHint();
      if (hint) return hint;
    }
    var fromLabel = getLabelStructureName();
    if (fromLabel) return fromLabel;
    var nameEl = document.getElementById('explorerObjectName');
    if (nameEl && nameEl.value && String(nameEl.value).trim()) {
      return String(nameEl.value).trim();
    }
    try {
      var last = sessionStorage.getItem(SESSION_ROOT_NAME);
      if (last) return last;
    } catch (e) { /* */ }
    return null;
  }

  function waitForSelection(maxAttempts, intervalMs) {
    maxAttempts = maxAttempts || 20;
    intervalMs = intervalMs || 400;
    return new Promise(function (resolve) {
      var n = 0;
      function tick() {
        if (typeof ProductExplorerBridge !== 'undefined') {
          if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
          if (ProductExplorerBridge.pollSelection) ProductExplorerBridge.pollSelection();
        }
        if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
          PlatformBridge.requestExplorerStructure();
        }
        var sel = getSelection();
        if (sel) return resolve(sel);
        var term = getExplorerRootSearchTerm();
        if (term) {
          var regHit = resolveFromStructureRegistry(term);
          if (regHit) return resolve(regHit);
        }
        n++;
        if (n >= maxAttempts) return resolve(null);
        window.setTimeout(tick, intervalMs);
      }
      tick();
    });
  }

  function resolveSingleRegistryStructure() {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var keys = Object.keys(reg).filter(function (k) {
      return reg[k] && String(reg[k]).trim();
    });
    if (keys.length !== 1) return null;
    return resolveFromStructureRegistry(keys[0]);
  }

  function resolveFromStructureRegistry(term) {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key = String(term || '').trim();
    if (!key) return null;
    var id = normalizeId(reg[key] || reg[key.toLowerCase()] || reg[key.toUpperCase()]);
    if (!id || !isValidId(id)) return null;
    return {
      physicalid: id,
      type: 'VPMReference',
      name: key,
      displayName: key,
      displayType: 'Physical Product',
      source: 'structure-registry'
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
    if (!term || !canUseWafApi()) return Promise.resolve(null);
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
      var tries = [term];
      if (term.indexOf('*') < 0) tries.push('*' + term + '*');
      function tryTerm(idx) {
        if (idx >= tries.length) return Promise.resolve([]);
        return ProductSearchService.search(tries[idx], { top: 40 }).then(function (hits) {
          if (hits && hits.length) return hits;
          return tryTerm(idx + 1);
        });
      }
      return tryTerm(0).then(function (hits) {
        var hit = pickSearchHit(term, hits);
        if (!hit || !isValidId(hit.physicalid)) return null;
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection(hit, { silent: true });
        }
        return hit;
      });
    }).catch(function (err) {
      console.warn('[ExplorerScanner] busca 3DSpace:', err && err.message ? err.message : err);
      return null;
    });
  }

  /**
   * Raiz dinâmica: seleção/hash → ID manual → busca por nome (query/sessão/campo).
   * Mont10 só entra se vier do Explorer/query — não hardcode.
   */
  function resolveSelection() {
    clearBadSelection();
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestDashboardSelection) {
      PlatformBridge.requestDashboardSelection();
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
      PlatformBridge.requestExplorerStructure();
    }

    return waitForSelection(12, 400).then(function (sel) {
      if (sel) return sel;

      var manual = readManualPhysicalId();
      if (manual) return manual;

      var fromUrl = resolveFromUrlQuery();
      if (fromUrl) {
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection(fromUrl, { silent: true });
        }
        return fromUrl;
      }

      var term = getExplorerRootSearchTerm();
      if (term) {
        var regHit = resolveFromStructureRegistry(term);
        if (regHit) return regHit;
        return resolveSelectionBySearch(term).then(function (found) {
          if (found) return found;
          return Promise.reject(new Error(
            'Não encontrei "' + term + '" no 3DSpace. ' +
            'Cole o ID físico em Modo avançado ou use ?physicalid=prd-... na URL do Additional App.'
          ));
        });
      }

      if (canUseWafApi()) {
        var singleReg = resolveSingleRegistryStructure();
        if (singleReg) return singleReg;
      }

      return Promise.reject(new Error(
        'Sem seleção do Explorer. Clique na raiz Mont10 (1ª linha) → Varrer, ou URL: ?physicalid=prd-R1132100929518-00511496'
      ));
    });
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

  function saveRootName(name) {
    try {
      if (name) sessionStorage.setItem(SESSION_ROOT_NAME, name);
    } catch (e) { /* */ }
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
      var rootNode = BomService.getIndex()[rootId];
      var productName =
        (rootNode && (rootNode.title || rootNode.name)) ||
        sel.displayName ||
        sel.name ||
        'E-BOM';
      saveRootName(productName);
      var count = BomService.getNodeCount();
      var max = APP_CONFIG.BOM_MAX_NODES || 50000;
      var msg = 'Varredura concluída: ' + count + ' itens — ' + productName;
      if (count >= max * 0.95) {
        msg += ' (limite de memória; expanda nós na tabela se necessário)';
      }
      return {
        ok: true,
        mode: 'api',
        meta: {
          productName: productName,
          rootPhysicalId: rootId,
          itemCount: count
        },
        message: msg
      };
    });
  }

  function scanViaApiOrSelection() {
    return resolveSelection().then(function (sel) {
      if (!canUseWafApi()) {
        return Promise.reject(new Error('WAFData indisponível — abra no 3DDashboard (Additional App).'));
      }
      if (!sel || !isValidId(sel.physicalid)) {
        return Promise.reject(new Error('Nenhuma raiz/seleção com physicalId válido.'));
      }
      return scanViaApi(sel);
    });
  }

  function scanViaText(text, sourceLabel) {
    if (!text || !String(text).trim()) {
      return Promise.reject(new Error('Nenhum dado para varrer'));
    }
    return FileImportService.parseTextAsync(text).then(function (items) {
      if (!items || !items.length) {
        throw new Error('Nenhuma linha reconhecida');
      }
      var name = items[0].title || items[0].name || 'E-BOM';
      items.forEach(function (it) {
        if (it.level === 0) name = it.title || it.name || name;
      });
      var payload = BomSnapshot.buildFromImported(items, name);
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        return {
          ok: true,
          mode: sourceLabel || 'text',
          meta: meta,
          message: 'Varredura (cola): ' + meta.itemCount + ' itens — ' + meta.productName
        };
      });
    });
  }

  function scanViaPasteArea() {
    var area = document.getElementById('pasteArea');
    var text = area && area.value ? area.value.trim() : '';
    if (!text) return Promise.reject(new Error('Caixa de cola vazia'));
    return scanViaText(text, 'cola');
  }

  function withScanTimeout(promise, ms) {
    ms = ms || (APP_CONFIG.SCAN_TIMEOUT_MS || 90000);
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('Varredura demorou mais de ' + Math.round(ms / 1000) + 's (BOM grande?). Tente de novo.'));
        }, ms);
      })
    ]);
  }

  function pasteFallbackEnabled() {
    return APP_CONFIG.ALLOW_PASTE_FALLBACK !== false && !isTrustedDashboard();
  }

  /**
   * 3DDashboard: API primeiro. Cola só se ALLOW_PASTE_FALLBACK e API falhar.
   */
  function scan() {
    clearBadSelection();
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
    var timeout = APP_CONFIG.SCAN_TIMEOUT_MS || 90000;
    var apiChain = scanViaApiOrSelection();

    if (isTrustedDashboard() && APP_CONFIG.USE_API_SCAN_FIRST !== false) {
      return withScanTimeout(apiChain, timeout).catch(function (apiErr) {
        if (!pasteFallbackEnabled()) throw apiErr;
        return scanViaPasteArea().catch(function () {
          throw apiErr;
        });
      });
    }

    return withScanTimeout(
      apiChain.catch(function () {
        return scanViaPasteArea();
      }),
      timeout
    );
  }

  return {
    scan: scan,
    resolveSelection: resolveSelection,
    getSelection: getSelection,
    scanViaApi: scanViaApi
  };
})();
