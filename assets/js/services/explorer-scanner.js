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

  function isPrdCloudId(id) {
    return /^prd-R\d{10,}-/i.test(normalizeId(id));
  }

  function isHexLegacyId(id) {
    return /^[0-9A-Fa-f]{16,}$/.test(normalizeId(id));
  }

  function resolveCloudRoot(term, sel) {
    if (term) {
      var regHit = resolveFromStructureRegistry(term);
      if (regHit) return regHit;
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.resolveFromExplorerCatalog) {
        var catHit = ProductExplorerBridge.resolveFromExplorerCatalog(term);
        if (catHit) return catHit;
      }
    }
    if (sel && isPrdCloudId(sel.physicalid)) return sel;
    if (APP_CONFIG.CLOUD_PHYSICAL_ONLY && sel && isHexLegacyId(sel.physicalid)) return null;
    return sel && isValidId(sel.physicalid) ? sel : null;
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
        var term = getExplorerRootSearchTerm();
        if (term) {
          var regHit = resolveFromStructureRegistry(term);
          if (regHit) return resolve(regHit);
        }
        var sel = getSelection();
        if (sel) return resolve(sel);
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
    var matchedKey = key;
    if (!id || !isValidId(id)) {
      var keys = Object.keys(reg);
      var tLow = key.toLowerCase();
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var kLow = k.toLowerCase();
        if (tLow.indexOf(kLow) >= 0 || kLow.indexOf(tLow) >= 0) {
          id = normalizeId(reg[k]);
          matchedKey = k;
          break;
        }
      }
    }
    if (!id || !isValidId(id)) return null;
    if (/^prd-/i.test(matchedKey)) id = matchedKey;
    return {
      physicalid: id,
      type: 'VPMReference',
      name: matchedKey,
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
        null;
      if (!space && typeof CompassServices !== 'undefined') {
        if (CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
          space = CompassServices.ifweSpaceUrl();
        } else if (CompassServices.getVerifiedSpaceUrl) {
          space = CompassServices.getVerifiedSpaceUrl();
        }
      }
      if (!space && APP_CONFIG.TENANT_DEFAULTS) {
        var host =
          typeof CompassServices !== 'undefined' &&
          CompassServices.isDashboardOnIfwe &&
          CompassServices.isDashboardOnIfwe()
            ? APP_CONFIG.TENANT_DEFAULTS.platformHost
            : APP_CONFIG.TENANT_DEFAULTS.spaceHost;
        if (host) space = 'https://' + host + '/enovia';
      }
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
  function resolveSelectionFast() {
    clearBadSelection();
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      ProductExplorerBridge.pollStructureHint();
      ProductExplorerBridge.pollSelection();
    }
    var term = getExplorerRootSearchTerm();
    var cloudHit = resolveCloudRoot(term, getSelection());
    if (cloudHit) {
      if (typeof ProductExplorerBridge !== 'undefined') {
        ProductExplorerBridge.setSelection(cloudHit, { silent: true });
      }
      return Promise.resolve(cloudHit);
    }
    return waitForSelection(4, 250);
  }

  function resolveSelection() {
    clearBadSelection();
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestDashboardSelection) {
      PlatformBridge.requestDashboardSelection();
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.requestExplorerStructure) {
      PlatformBridge.requestExplorerStructure();
    }

    return waitForSelection(12, 400).then(function (sel) {
      var termFirst = getExplorerRootSearchTerm();
      if (termFirst) {
        var regFirst = resolveFromStructureRegistry(termFirst);
        if (regFirst) return regFirst;
      }
      if (sel) {
        var termAlign = getExplorerRootSearchTerm();
        if (termAlign) {
          var regAlign = resolveFromStructureRegistry(termAlign);
          if (regAlign) return regAlign;
        }
        return sel;
      }

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

  function promiseTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error(label || 'Timeout na conexão API'));
        }, ms || 12000);
      })
    ]);
  }

  function ensureSpaceApi() {
    var chain = PlatformContext.init();
    if (typeof CompassServices !== 'undefined' && CompassServices.fastConnectIfwe) {
      var fast = CompassServices.fastConnectIfwe();
      if (fast && APP_CONFIG.SKIP_SPACE_PROBE) {
        chain = chain.then(function () {
          try {
            EnoviaApi.init(fast);
            if (typeof SearchApi !== 'undefined') SearchApi.init(fast);
          } catch (eFast) { /* */ }
          return fast;
        });
        return chain;
      }
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.ensureWorkingSpaceUrl) {
      chain = chain.then(function () {
        return promiseTimeout(
          CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId),
          APP_CONFIG.SCAN_CONNECT_TIMEOUT_MS || 12000,
          'Conexão API demorou — tente Varrer de novo.'
        );
      });
    } else {
      var space =
        (typeof PlatformBridge !== 'undefined' && PlatformBridge.getSpaceUrl && PlatformBridge.getSpaceUrl()) ||
        (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost
          ? 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia'
          : null);
      if (!space) return Promise.reject(new Error('URL 3DSpace não configurada'));
      chain = chain.then(function () { return space; });
    }
    return chain.then(function (space) {
      if (!space && typeof CompassServices !== 'undefined' && CompassServices.tenantSpaceUrl) {
        space = CompassServices.tenantSpaceUrl();
      }
      if (!space && typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
        space = CompassServices.ifweSpaceUrl();
      }
      if (!space) return Promise.reject(new Error('URL 3DSpace não configurada'));
      try {
        EnoviaApi.init(space);
        if (typeof SearchApi !== 'undefined') SearchApi.init(space);
      } catch (e) { /* */ }
      if (typeof CompassServices !== 'undefined' && CompassServices.fetchCsrfToken) {
        return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
      }
      return null;
    });
  }

  function saveRootName(name) {
    try {
      if (name) sessionStorage.setItem(SESSION_ROOT_NAME, name);
    } catch (e) { /* */ }
  }

  function scanViaApi(sel) {
    var term = getExplorerRootSearchTerm();
    if (term) {
      var regSel = resolveFromStructureRegistry(term);
      if (regSel) sel = regSel;
    }
    var boot =
      typeof WafBootstrap !== 'undefined' && WafBootstrap.ensure
        ? WafBootstrap.ensure()
        : Promise.resolve();
    return boot.then(function () {
      if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
      if (
        APP_CONFIG.SKIP_SPACE_PROBE &&
        typeof CompassServices !== 'undefined' &&
        CompassServices.getVerifiedSpaceUrl &&
        CompassServices.getVerifiedSpaceUrl()
      ) {
        return null;
      }
      return ensureSpaceApi();
    }).then(function () {
      var load = BomService.loadRoot(sel.physicalid);
      return promiseTimeout(load, 28000, 'Timeout ao carregar BOM via API');
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
    var pick = APP_CONFIG.SKIP_SPACE_PROBE ? resolveSelectionFast : resolveSelection;
    return pick().then(function (sel) {
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

  function pasteImportEnabled() {
    return APP_CONFIG.ALLOW_PASTE_FALLBACK === true;
  }

  function pasteFallbackEnabled() {
    if (isTrustedDashboard()) return pasteImportEnabled();
    return APP_CONFIG.ALLOW_PASTE_FALLBACK !== false;
  }

  var lastPasteText = '';

  function setPasteBuffer(text) {
    lastPasteText = String(text || '').trim();
  }

  function getPasteBuffer() {
    return lastPasteText;
  }

  function readFromPasteArea() {
    var area = document.getElementById('pasteArea');
    return area && area.value ? String(area.value).trim() : '';
  }

  function readClipboardText() {
    if (lastPasteText) return Promise.resolve(lastPasteText);
    var areaText = readFromPasteArea();
    if (areaText) return Promise.resolve(areaText);
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve('');
    }
    return navigator.clipboard.readText().catch(function () {
      return '';
    });
  }

  function resolveImportText(clip) {
    var text = String(clip || '').trim();
    if (!text) text = lastPasteText;
    if (!text) text = readFromPasteArea();
    return text;
  }

  function scanViaClipboardOrPaste() {
    if (!pasteImportEnabled()) {
      return Promise.reject(new Error('Importação por cola desativada.'));
    }
    return readClipboardText().then(function (clip) {
      var text = resolveImportText(clip);
      if (!text) {
        throw new Error(
          'Clipboard bloqueado no iframe. No Explorer: Ctrl+A → Ctrl+C → clique no widget e Ctrl+V → Importar Ctrl+C.'
        );
      }
      return scanViaText(text, 'Ctrl+C Explorer');
    });
  }

  /** Usa a fonte com MAIS linhas: Ctrl+C ou grade visível do Explorer (evita 13 de 79). */
  function scanViaImportBestEffort() {
    if (!pasteImportEnabled()) {
      return Promise.reject(new Error('Importação por cola desativada.'));
    }

    function tryPasteBundle() {
      return readClipboardText().then(function (clip) {
        var text = resolveImportText(clip);
        if (!text) return { count: 0, text: '', items: null };
        return FileImportService.parseTextAsync(text).then(function (items) {
          return { count: items ? items.length : 0, text: text, items: items };
        });
      }).catch(function () {
        return { count: 0, text: '', items: null };
      });
    }

    function tryGridBundle() {
      if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.scrapeExplorerGrid) {
        return Promise.resolve({ count: 0, payload: null });
      }
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
      var term = getExplorerRootSearchTerm();
      var payload = ProductExplorerBridge.scrapeExplorerGrid(term);
      if (!payload || !payload.items || payload.items.length < 1) {
        return Promise.resolve({ count: 0, payload: null });
      }
      return Promise.resolve({ count: payload.items.length, payload: payload, term: term });
    }

    return Promise.all([tryPasteBundle(), tryGridBundle()]).then(function (parts) {
      var paste = parts[0];
      var grid = parts[1];
      var explorerSel = 0;
      if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerSelectionCount) {
        explorerSel = ProductExplorerBridge.getExplorerSelectionCount() || 0;
      }
      var preferGrid = grid.count >= 2 && grid.payload && (
        grid.count > paste.count ||
        (explorerSel > paste.count && grid.count >= paste.count)
      );

      if (preferGrid) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        return BomSnapshot.applyPayload(grid.payload).then(function (meta) {
          var count = BomService.getNodeCount() || meta.itemCount || grid.count;
          saveRootName(meta.productName || grid.term);
          var hint = paste.count > 0 && paste.count < grid.count
            ? ' (Ctrl+C tinha ' + paste.count + ' — usamos grade Explorer com ' + grid.count + ')'
            : '';
          return {
            ok: true,
            mode: 'explorer-grid-import',
            meta: meta,
            message: 'Importação: ' + count + ' itens — ' + (meta.productName || grid.term || 'E-BOM') + hint
          };
        });
      }

      if (paste.count >= 1 && paste.text) {
        return scanViaText(paste.text, 'Ctrl+C Explorer');
      }

      if (grid.count >= 2 && grid.payload) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        return BomSnapshot.applyPayload(grid.payload).then(function (meta) {
          var count = BomService.getNodeCount() || meta.itemCount || grid.count;
          saveRootName(meta.productName || grid.term);
          return {
            ok: true,
            mode: 'explorer-grid-import',
            meta: meta,
            message: 'Importação (grade Explorer): ' + count + ' itens — ' + (meta.productName || grid.term || 'E-BOM')
          };
        });
      }

      throw new Error(
        'Nenhum dado. No Explorer: expanda todos os níveis → Ctrl+A na grade → Ctrl+C → Importar (ou Ctrl+V no widget).'
      );
    });
  }

  function scanViaExplorerGrid() {
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.scrapeExplorerGrid) {
      return Promise.reject(new Error('Iframe do Explorer inacessível — abra a árvore ao lado do widget.'));
    }
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    var term = getExplorerRootSearchTerm();
    var payload = ProductExplorerBridge.scrapeExplorerGrid(term);
    function applyGrid(pl, sourceLabel) {
      if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
        return Promise.reject(new Error('Módulo snapshot indisponível'));
      }
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      return BomSnapshot.applyPayload(pl).then(function (meta) {
        var count = BomService.getNodeCount();
        if (count < 1) count = meta.itemCount || (pl.items && pl.items.length) || 0;
        saveRootName(meta.productName || term);
        return {
          ok: true,
          mode: 'explorer-grid',
          meta: meta,
          message:
            'Varredura (' +
            (sourceLabel || 'árvore Explorer') +
            '): ' +
            count +
            ' itens — ' +
            (meta.productName || term || 'E-BOM')
        };
      });
    }
    if (payload && payload.items && payload.items.length >= 2) {
      return applyGrid(payload, 'árvore Explorer');
    }
    return Promise.reject(
      new Error(
        'Não li a árvore no Explorer (iframe). Expanda os níveis, Ctrl+A na grade → Ctrl+C → Importar Ctrl+C.'
      )
    );
  }

  function scanViaBuiltinLast() {
    if (APP_CONFIG.PILOT_BUILTIN_LAST === false) {
      return Promise.reject(new Error('Sem dados embutidos para esta estrutura.'));
    }
    var term = getExplorerRootSearchTerm();
    var builtin =
      typeof BomSnapshot !== 'undefined' && BomSnapshot.getPilotPayloadForTerm
        ? BomSnapshot.getPilotPayloadForTerm(term)
        : null;
    if (builtin && builtin.items && builtin.items.length >= 2) {
      return BomSnapshot.applyPayload(builtin).then(function (meta) {
        var count = BomService.getNodeCount() || meta.itemCount || builtin.items.length;
        return {
          ok: true,
          mode: 'builtin-last',
          meta: meta,
          message: 'Demo embutido: ' + count + ' itens — ' + (meta.productName || term)
        };
      });
    }
    var fetchPilot =
      ProductExplorerBridge &&
      ProductExplorerBridge.fetchPilotStructurePayload &&
      ProductExplorerBridge.fetchPilotStructurePayload(term);
    return (fetchPilot || Promise.resolve(null)).then(function (pilot) {
      if (pilot && pilot.items && pilot.items.length >= 2) {
        return BomSnapshot.applyPayload(pilot).then(function (meta) {
          return {
            ok: true,
            mode: 'snapshot-file',
            meta: meta,
            message: 'Snapshot: ' + (meta.itemCount || pilot.items.length) + ' itens'
          };
        });
      }
      return Promise.reject(new Error('Nenhuma fonte de dados para "' + (term || 'estrutura') + '".'));
    });
  }

  /**
   * Qualquer projeto: cola/clipboard → grade visível → demo embutido (último).
   */
  function scanViaPilotGeneric() {
    return scanViaExplorerGrid().catch(function () {
      return scanViaClipboardOrPaste().catch(function () {
        return scanViaBuiltinLast();
      });
    });
  }

  function apiScanEnabled() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.api === '1' || q.api === 'true') return true;
    return APP_CONFIG.USE_API_SCAN_FIRST !== false;
  }

  /**
   * 3DDashboard piloto: grade/árvore Explorer primeiro; API só com ?api=1 ou USE_API_SCAN_FIRST.
   */
  function scan() {
    clearBadSelection();
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    }
    var timeout = APP_CONFIG.SCAN_TIMEOUT_MS || 90000;
    var apiChain = scanViaApiOrSelection();

    if (isTrustedDashboard() && APP_CONFIG.PILOT_GRID_FIRST) {
      return withScanTimeout(scanViaPilotGeneric(), timeout);
    }

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
    scanViaExplorerGrid: scanViaExplorerGrid,
    scanViaClipboardOrPaste: scanViaClipboardOrPaste,
    scanViaImportBestEffort: scanViaImportBestEffort,
    scanViaPilotGeneric: scanViaPilotGeneric,
    setPasteBuffer: setPasteBuffer,
    getPasteBuffer: getPasteBuffer,
    ensureSpaceApi: ensureSpaceApi,
    resolveSelection: resolveSelection,
    getSelection: getSelection,
    scanViaApi: scanViaApi
  };
})();
