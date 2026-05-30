/**
 * @file app.js
 * Orquestração — bootstrap, seleção Product Explorer, refresh.
 */
var App = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : this;

  function byId(id) {
    if (typeof byId3dx === 'function') return byId3dx(id);
    if (root.__3DX_UI_ROOT__) {
      var m = root.__3DX_UI_ROOT__.querySelector('#' + id);
      if (m) return m;
    }
    return document.getElementById(id);
  }

  var currentMetrics = null;
  var currentAnomalies = null;
  var loading = false;
  var lastLoadedId = null;

  function setStatus(msg, type) {
    var el = byId('statusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-bar status-' + (type || 'info');
  }

  function setLoading(on) {
    loading = on;
    var overlay = byId('loadingOverlay');
    if (overlay) overlay.classList.toggle('hidden', !on);
  }

  /** URL ou registro pede produto real (Mont10 etc.) — nunca substituir por demo Drone. */
  function userRequestedRealProduct() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.physicalid || q.structure || q.rootName || APP_CONFIG.URL_PHYSICAL_ID) return true;
    var idEl = byId('explorerObjectId');
    if (idEl && idEl.value && String(idEl.value).trim().length >= 8) return true;
    return false;
  }

  function isSnapshotDeliveryMode() {
    if (APP_CONFIG.SNAPSHOT_DELIVERY_MODE === true) return true;
    if (APP_CONFIG.CAN_USE_ENOVIA_API) return false;
    return !!(APP_CONFIG.SNAPSHOT_URL || APP_CONFIG.SNAPSHOT_FIRST);
  }

  var lastSyncedStructure = null;
  var structureSyncTimer = null;

  function allowApiLoad() {
    return !!(root.__3DX_ALLOW_API__ || root.__3DX_FORCE_API__);
  }

  function apiExplicit() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    return q.api === '1' || q.api === 'true' || !!root.__3DX_FORCE_API__;
  }

  function pilotGridOnlyMode() {
    return !!(APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API && !apiExplicit());
  }

  function pollExplorerStructureLabel() {
    if (typeof ProductExplorerBridge === 'undefined') return;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    var hint =
      ProductExplorerBridge.getStructureNameHint && ProductExplorerBridge.getStructureNameHint();
    if (hint) {
      var label = byId('selectionLabel');
      if (label) label.textContent = hint;
    }
  }

  function pilotAutoLoadFromExplorer() {
    if (!pilotGridOnlyMode()) return Promise.resolve(false);
    pollExplorerStructureLabel();
    var term =
      (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
        ? ProductExplorerBridge.getStructureNameHint()
        : null) ||
      (byId('selectionLabel') && byId('selectionLabel').textContent) ||
      '';
    if (!term || term === '-') return Promise.resolve(false);
    return pilotFallbackExplorerGrid(term);
  }

  function allowDemoOnApiFail() {
    if (APP_CONFIG.DEMO_ON_API_FAIL === false) return false;
    if (userRequestedRealProduct()) return false;
    if (APP_CONFIG.WAIT_FOR_USER_SCAN) return false;
    return true;
  }

  function structureLabelForId(id) {
    var reg = APP_CONFIG.STRUCTURE_IDS || {};
    var key;
    for (key in reg) {
      if (reg.hasOwnProperty(key) && reg[key] === id) return key;
    }
    return null;
  }

  function githubApiBlockedMessage(id, name) {
    var label = name || structureLabelForId(id) || id || 'E-BOM';
    return (
      label + ' (' + (id || '?') + ') — API ENOVIA só no 3DDashboard (Additional App). ' +
      'GitHub não tem WAFData; aqui não carrega BOM real.'
    );
  }

  function updateLastUpdateClock() {
    var el = byId('lastUpdateClock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('pt-BR');
  }

  function updateEbomPanel(filtered, flat, metrics) {
    var pname =
      (byId('selectionLabel') && byId('selectionLabel').textContent) ||
      (byId('tableProductLabel') && byId('tableProductLabel').textContent) ||
      'E-BOM';
    var tableLbl = byId('tableProductLabel');
    if (tableLbl && pname !== '-') tableLbl.textContent = pname;
    var meta = byId('ebomMeta');
    if (meta) {
      var total = metrics.totalItems || flat.length || 0;
      meta.textContent =
        total + ' peças no arquivo · ' +
        (filtered.length) + ' visíveis com filtro · ' +
        (metrics.totalAssemblies || 0) + ' assemblies';
    }
    var pager = byId('tablePager');
    if (pager) {
      pager.textContent =
        'Exibindo ' + filtered.length + ' de ' + flat.length + ' linhas (role para navegar)';
    }
  }

  var tableInitialized = false;

  function refreshUI() {
    if (typeof KpiCards !== 'undefined' && KpiCards.init && byId('kpiGrid')) {
      KpiCards.init('#kpiGrid');
    }
    if (!tableInitialized && typeof DataTable !== 'undefined' && DataTable.init && byId('bomTable')) {
      DataTable.init('#bomTable');
      tableInitialized = true;
    }
    var index = BomService.getIndex();
    var rootId = BomService.getRootId();
    var flat = BomNormalizer.toFlatList(index, rootId);
    Filters.populateTypeOptions(flat);
    var filtered = Filters.apply(flat);

    currentMetrics = MetricsEngine.computeFromFlat(filtered);
    currentAnomalies = AnomalyDetector.detect(index);

    KpiCards.render(currentMetrics, currentAnomalies);
    if (APP_CONFIG.SHOW_CHARTS !== false) {
      ChartsManager.destroyAll();
      ChartsManager.render(currentMetrics);
      if (ChartsManager.scheduleResize) {
        window.setTimeout(function () {
          ChartsManager.render(currentMetrics);
        }, 300);
      }
    }
    if (APP_CONFIG.SHOW_TREE !== false && byId('bomTree') && typeof BomTree !== 'undefined') {
      BomTree.refresh(index, rootId);
    }
    DataTable.setData(filtered);
    updateEbomPanel(filtered, flat, currentMetrics);
    if (BomService.getNodeCount() > 0) updateLastUpdateClock();
    renderIssues(currentAnomalies.issues);

    if (APP_CONFIG.IMPORT_MODE) {
      var pname = (byId('selectionLabel') && byId('selectionLabel').textContent) || 'E-BOM';
      var n = BomService.getNodeCount();
      if (pname && pname !== '-' && n > 0) {
        setStatus('Snapshot: ' + pname + ' — ' + n + ' itens', 'ok');
      }
    } else {
      var mode = APP_CONFIG.DEMO_MODE ? ' | DEMO' : '';
      setStatus('Estrutura: ' + BomService.getNodeCount() + ' itens | Exibindo: ' + filtered.length + mode, 'ok');
    }
  }

  function renderIssues(issues) {
    if (APP_CONFIG.SHOW_ISSUES_PANEL === false) return;
    var el = byId('issuesList');
    if (!el) return;
    var top = issues.slice(0, 50);
    if (!top.length) {
      el.innerHTML = '<li class="issue-ok">Nenhuma anomalia crítica detectada.</li>';
      return;
    }
    el.innerHTML = top.map(function (i) {
      return '<li class="issue-' + i.severity + '">[' + i.type + '] ' + escapeHtml(i.message) + '</li>';
    }).join('');
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function loadBomFromSelectionOnly(physicalId) {
    var sel = ProductExplorerBridge.getSelection() || {};
    return BomService.loadRootFromSelection({
      physicalid: physicalId,
      name: sel.name || sel.displayName || physicalId,
      title: sel.displayName || sel.name || physicalId,
      displayType: sel.displayType || 'Physical Product',
      type: sel.type || 'VPMReference',
      displayName: sel.displayName || sel.name || physicalId
    }).then(function () {
      refreshUI();
      setStatus('Modo limitado: 1 item (use Additional App widget-uwa sem iframe).', 'warn');
    });
  }

  function apiTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error(label || 'Tempo esgotado na API'));
        }, ms || 18000);
      })
    ]);
  }

  function pilotFallbackExplorerGrid(structureName) {
    if (!APP_CONFIG.PILOT_FALLBACK_SNAPSHOT || typeof ProductExplorerBridge === 'undefined') {
      return Promise.resolve(false);
    }
    if (!ProductExplorerBridge.scrapeExplorerGrid) return Promise.resolve(false);
    var payload = ProductExplorerBridge.scrapeExplorerGrid(structureName);
    function applyGrid(pl) {
      if (!pl || !pl.items || pl.items.length < 2) return Promise.resolve(false);
      return BomSnapshot.applyPayload(pl).then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        if (meta && meta.rootPhysicalId) lastLoadedId = meta.rootPhysicalId;
        refreshUI();
        var n = BomService.getNodeCount();
        if (n < 1) n = (meta && meta.itemCount) || (pl.items && pl.items.length) || 0;
        setStatus('Piloto: ' + (meta.productName || structureName) + ' — ' + n + ' itens (grade Explorer). API 406 em ajuste.', 'ok');
        return true;
      }).catch(function () {
        return false;
      });
    }
    if (builtin && builtin.items && builtin.items.length >= 2) return applyGrid(builtin);
    if (payload && payload.items.length >= 2) return applyGrid(payload);
    var fetchPilot =
      ProductExplorerBridge.fetchPilotStructurePayload &&
      ProductExplorerBridge.fetchPilotStructurePayload(structureName);
    return (fetchPilot || Promise.resolve(null)).then(function (pilot) {
      if (pilot) return applyGrid(pilot);
      return Promise.resolve(false);
    });
  }

  function pilotFallbackSnapshot(structureName) {
    if (!APP_CONFIG.PILOT_FALLBACK_SNAPSHOT || !APP_CONFIG.CAN_USE_ENOVIA_API) {
      return Promise.resolve(false);
    }
    var name = String(structureName || '').trim();
    if (!/mont10/i.test(name)) return Promise.resolve(false);
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyBuiltinMont10) {
      return Promise.resolve(false);
    }
    return BomSnapshot.applyBuiltinMont10().then(function (meta) {
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      if (meta && meta.rootPhysicalId) lastLoadedId = meta.rootPhysicalId;
      refreshUI();
      var n = (meta && meta.itemCount) || BomService.getNodeCount() || 0;
      setStatus('Piloto Mont10: ' + n + ' itens (E-BOM validado). API em ajuste.', 'ok');
      return true;
    }).catch(function () {
      return false;
    });
  }

  function runExplorerScan(btnEl) {
    if (typeof ExplorerScanner === 'undefined') {
      setStatus('Varredura falhou: módulo scanner não carregou.', 'error');
      return;
    }
    setStatus('Varrendo estrutura…', 'info');
    root.__3DX_BLOCK_AUTO_SYNC__ = true;
    root.__3DX_BLOCK_API_LOAD__ = true;
    if (structureSyncTimer) {
      window.clearTimeout(structureSyncTimer);
      structureSyncTimer = null;
    }
    loading = false;
    setLoading(false);
    var forceApiScan = btnEl && btnEl.id === 'btnLoadPhysicalId';
    if (forceApiScan) root.__3DX_FORCE_API__ = true;
    if (!pilotGridOnlyMode() || forceApiScan) root.__3DX_ALLOW_API__ = true;
    var hadSnapshot = BomService.getNodeCount() > 1 && APP_CONFIG.IMPORT_MODE;
    setLoading(true);
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Varrendo…';
    }
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
      if (ProductExplorerBridge.pollSelection) ProductExplorerBridge.pollSelection();
    }
    var gridFirst = APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API;
    setStatus(
      gridFirst
        ? 'Lendo Explorer ou Ctrl+C (qualquer projeto)…'
        : 'Conectando API (ifwe)…',
      'info'
    );
    var scanChain = ExplorerScanner.scan();
    if (!gridFirst && typeof ExplorerScanner.ensureSpaceApi === 'function') {
      scanChain = ExplorerScanner.ensureSpaceApi().then(function () {
        setStatus('Varrendo estrutura Explorer…', 'info');
        return ExplorerScanner.scan();
      });
    }
    apiTimeout(
      scanChain,
      APP_CONFIG.SCAN_CONNECT_TIMEOUT_MS || 40000,
      'Varredura cancelada (timeout). Abra Mont10 no Explorer e clique Varrer de novo.'
    )
      .then(function (res) {
        APP_CONFIG.DEMO_MODE = false;
        APP_CONFIG.IMPORT_MODE = res.mode !== 'api';
        if (
          res.mode === 'explorer-grid' ||
          res.mode === 'explorer-grid-pilot' ||
          res.mode === 'text' ||
          res.mode === 'cola' ||
          res.mode === 'builtin-last' ||
          res.mode === 'snapshot-file'
        ) {
          APP_CONFIG.IMPORT_MODE = true;
        }
        if (res.meta) {
          lastLoadedId = res.meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) {
            var pn = res.meta.productName;
            if (pn && typeof pn === 'object') pn = pn.label || pn.name || 'E-BOM';
            if (typeof pn === 'string' && pn.charAt(0) === '{') {
              try {
                var o = JSON.parse(pn);
                pn = o.label || o.name || 'E-BOM';
              } catch (e2) { pn = 'E-BOM'; }
            }
            lbl.textContent = pn || 'E-BOM';
          }
        }
        updateLastUpdateClock();
        refreshUI();
        setStatus(res.message || 'Varredura concluída.', 'ok');
      })
      .catch(function (err) {
        var msg = (err && err.message) ? err.message : String(err);
        if (msg.indexOf('Varredura falhou') < 0) {
          msg = 'Varredura falhou: ' + msg;
        }
        var term =
          (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
            ? ProductExplorerBridge.getStructureNameHint()
            : null) ||
          (byId('selectionLabel') && byId('selectionLabel').textContent) ||
          '';
        return pilotFallbackExplorerGrid(term).then(function (restored) {
          if (restored) return;
          return pilotFallbackSnapshot(term).then(function (restored2) {
          if (restored2) return;
          if (hadSnapshot || APP_CONFIG.SNAPSHOT_URL) {
            return restoreSnapshotAfterScanFail(msg).then(function (restored2) {
              if (!restored2) {
                setStatus(msg, 'error');
              }
            });
          }
          var short = msg;
          if (short.length > 220) short = short.slice(0, 220) + '…';
          setStatus(short, 'error');
        });
        });
      })
      .finally(function () {
        root.__3DX_ALLOW_API__ = false;
        root.__3DX_FORCE_API__ = false;
        root.__3DX_BLOCK_API_LOAD__ = false;
        root.__3DX_BLOCK_AUTO_SYNC__ = false;
        setLoading(false);
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Varrer estrutura Explorer';
        }
      });
  }

  function applySnapshotPayload(payload, sourceLabel) {
    setLoading(true);
    return BomSnapshot.applyPayload(payload)
      .then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        lastLoadedId = meta.rootPhysicalId;
        var lbl = byId('selectionLabel');
        if (lbl) lbl.textContent = meta.productName;
        var tableLbl = byId('tableProductLabel');
        if (tableLbl) tableLbl.textContent = meta.productName;
        refreshUI();
        setStatus(
          'Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens (' + (sourceLabel || 'JSON') + ')',
          'ok'
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function loadSnapshotFromUrl(url) {
    if (!url) return Promise.resolve();
    setLoading(true);
    setStatus('Carregando snapshot…', 'info');
    return BomSnapshot.fetchAndApply(url)
      .then(function (meta) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        lastLoadedId = meta.rootPhysicalId;
        var lbl = byId('selectionLabel');
        if (lbl) lbl.textContent = meta.productName;
        var tableLbl = byId('tableProductLabel');
        if (tableLbl) tableLbl.textContent = meta.productName;
        refreshUI();
        setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
      })
      .catch(function (err) {
        setStatus('Snapshot: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function tryLoadSnapshotFirst() {
    var url = typeof BomSnapshot !== 'undefined' && BomSnapshot.getParamUrl
      ? BomSnapshot.getParamUrl()
      : null;
    if (!url && APP_CONFIG.SNAPSHOT_URL) {
      url = BomSnapshot.resolveUrl(APP_CONFIG.SNAPSHOT_URL);
    }
    if (url) return loadSnapshotFromUrl(url);
    if (!APP_CONFIG.WAIT_FOR_USER_SCAN) {
      var cached = typeof BomSnapshot !== 'undefined' ? BomSnapshot.loadSession() : null;
      if (cached) return applySnapshotPayload(cached, 'sessão');
    }
    return Promise.resolve();
  }

  function loadBom(physicalId) {
    if (!physicalId || loading) return Promise.resolve();
    if (root.__3DX_BLOCK_API_LOAD__) return Promise.resolve();
    if (pilotGridOnlyMode() && !apiExplicit()) {
      return Promise.resolve();
    }
    if (pilotGridOnlyMode() && !allowApiLoad()) {
      return Promise.resolve();
    }
    if (isSnapshotDeliveryMode() && !allowApiLoad()) {
      return Promise.resolve();
    }
    if (physicalId === lastLoadedId && BomService.getNodeCount() > 1) {
      return Promise.resolve();
    }
    setLoading(true);
    setStatus('Carregando E-BOM…', 'info');

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.DEMO_MODE && !APP_CONFIG.IMPORT_MODE) {
      return loadBomFromSelectionOnly(physicalId).finally(function () {
        setLoading(false);
      });
    }

    return apiTimeout(BomService.loadRoot(physicalId), 18000, 'API E-BOM lenta ou indisponível')
      .then(function () {
        lastLoadedId = physicalId;
        refreshUI();
        setStatus(BomService.getNodeCount() + ' itens carregados.', 'ok');
        if (APP_CONFIG.SKIP_PP_ENRICH) return;
        return PhysicalProductService.enrichNodes(BomService.getIndex(), { batchSize: 40 })
          .then(function () { refreshUI(); });
      })
      .catch(function (err) {
        console.error(err);
        if (allowDemoOnApiFail()) {
          return loadDemoBom(
            'GitHub não acessa API ENOVIA. Demo com ~20 itens. Estrutura real: deploy 3DSpace.'
          );
        }
        if (isSnapshotDeliveryMode() || APP_CONFIG.IMPORT_MODE) {
          return restoreSnapshotAfterScanFail('Erro: ' + (err.message || err));
        }
        if (typeof BomService !== 'undefined' && BomService.reset) {
          BomService.reset();
          lastLoadedId = null;
          refreshUI();
        }
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API && userRequestedRealProduct()) {
          var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
          var pid = physicalId || q.physicalid || APP_CONFIG.URL_PHYSICAL_ID;
          setStatus(githubApiBlockedMessage(pid, q.structure || q.rootName), 'warn');
          return;
        }
        setStatus('Erro: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  var autoScanTimer = null;

  function syncOpenExplorerStructure(force) {
    if (root.__3DX_BLOCK_AUTO_SYNC__) return;
    if (!APP_CONFIG.CAN_USE_ENOVIA_API || typeof ExplorerScanner === 'undefined') return;
    if (!force && (APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0) < 1) return;
    if (typeof ProductExplorerBridge !== 'undefined') {
      if (ProductExplorerBridge.pollDashboardExplorerChrome) {
        ProductExplorerBridge.pollDashboardExplorerChrome();
      }
      ProductExplorerBridge.pollStructureHint();
      ProductExplorerBridge.pollSelection();
    }
    var hint = typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint
      ? ProductExplorerBridge.getStructureNameHint()
      : null;
    var sel = typeof ProductExplorerBridge !== 'undefined' ? ProductExplorerBridge.getSelection() : null;
    var key = hint || (sel && (sel.displayName || sel.name)) || '';
    if (!key) return;
    var label = byId('selectionLabel');
    if (label) label.textContent = key;
    if (!force && key === lastSyncedStructure && BomService.getNodeCount() > 1) return;
    if (loading && !force) return;
    if (structureSyncTimer) window.clearTimeout(structureSyncTimer);
    structureSyncTimer = window.setTimeout(function () {
      lastSyncedStructure = key;
      root.__3DX_ALLOW_API__ = true;
      setLoading(true);
      setStatus('Carregando estrutura aberta: ' + key + '…', 'info');
      apiTimeout(
        ExplorerScanner.scan(),
        APP_CONFIG.SCAN_TIMEOUT_MS || 90000,
        'Timeout ao carregar ' + key
      )
        .then(function (res) {
          APP_CONFIG.DEMO_MODE = false;
          APP_CONFIG.IMPORT_MODE = res.mode !== 'api';
          if (res.meta) lastLoadedId = res.meta.rootPhysicalId;
          refreshUI();
          setStatus(res.message || ('Carregado: ' + key + ' — ' + BomService.getNodeCount() + ' itens'), 'ok');
        })
        .catch(function (err) {
          var msg = (err && err.message) ? err.message : String(err);
          return pilotFallbackExplorerGrid(key).then(function (restored) {
            if (restored) return;
            var short = msg;
            if (short.length > 220) short = short.slice(0, 220) + '…';
            setStatus(short, 'error');
          });
        })
        .finally(function () {
          root.__3DX_ALLOW_API__ = false;
          setLoading(false);
        });
    }, APP_CONFIG.STRUCTURE_SYNC_DEBOUNCE_MS || 1800);
  }

  function onSelection(sel) {
    if (!sel || !sel.physicalid) return;
    var label = byId('selectionLabel');
    if (label) {
      label.textContent = (sel.displayName || sel.name || sel.physicalid);
    }
    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) {
      return;
    }
    if (APP_CONFIG.PILOT_GRID_FIRST && APP_CONFIG.CAN_USE_ENOVIA_API) {
      return;
    }
    if (
      APP_CONFIG.CAN_USE_ENOVIA_API &&
      !APP_CONFIG.PILOT_GRID_FIRST &&
      typeof ExplorerScanner !== 'undefined'
    ) {
      syncOpenExplorerStructure(false);
      return;
    }
    if (isSnapshotDeliveryMode() && !allowApiLoad()) return;
    loadBom(sel.physicalid);
  }

  function loadPhysicalProduct(sel) {
    if (!sel || !sel.physicalid) return Promise.resolve();
    setLoading(true);
    if (typeof ProductExplorerBridge.setSelection === 'function') {
      ProductExplorerBridge.setSelection(sel, { silent: true });
    }
    byId('selectionLabel').textContent =
      (sel.displayName || sel.name) + ' (' + sel.physicalid + ')';
    return BomService.loadFrom3DXProduct(sel)
      .then(function () {
        APP_CONFIG.IMPORT_MODE = false;
        refreshUI();
        var n = BomService.getNodeCount();
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
          setStatus(
            'Carregado: ' + (sel.displayName || sel.physicalid) + ' — ' + n +
            ' itens (preview). BOM real: HTML no 3DSpace.',
            'warn'
          );
        } else {
          setStatus('Carregado: ' + (sel.displayName || sel.physicalid) + ' — ' + n + ' itens.', 'ok');
        }
      })
      .catch(function (err) {
        setStatus('Erro: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function applyUrlParamsToUI() {
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    var id = String(q.physicalid || APP_CONFIG.URL_PHYSICAL_ID || '').trim();
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      id = ThreeDXContentParser.normalizePhysicalId(id);
    } else if (/^R\d{10,}-/i.test(id) && !/^prd-/i.test(id)) {
      id = 'prd-' + id;
    }
    if (!id) return;
    var idEl = byId('explorerObjectId');
    if (idEl) idEl.value = id;
    var lbl = byId('selectionLabel');
    var name =
      q.structure || q.rootName || structureLabelForId(id) ||
      q.displayName || q.name || id;
    if (lbl) lbl.textContent = name;
    if (typeof ProductExplorerBridge !== 'undefined' && isValidPhysicalId(id)) {
      ProductExplorerBridge.setSelection({
        physicalid: id,
        type: q.type || 'VPMReference',
        name: name,
        displayName: name,
        source: 'url-query'
      }, { silent: true });
    }
  }

  function rebindScanButton() {
    var btnScan = byId('btnScanExplorer');
    if (!btnScan || btnScan.__3DX_SCAN_BOUND__) return;
    btnScan.__3DX_SCAN_BOUND__ = true;
    btnScan.addEventListener('click', function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      runExplorerScan(btnScan);
    });
  }

  function runImportFromClipboard(btnEl) {
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaClipboardOrPaste) {
      setStatus('Importação indisponível.', 'error');
      return;
    }
    setStatus('Lendo Ctrl+C do Explorer…', 'info');
    root.__3DX_BLOCK_API_LOAD__ = true;
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Importando…';
    }
    ExplorerScanner.scanViaClipboardOrPaste()
      .then(function (res) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        if (res.meta) {
          lastLoadedId = res.meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = res.meta.productName || lbl.textContent;
        }
        updateLastUpdateClock();
        refreshUI();
        setStatus(res.message || 'Importação concluída.', 'ok');
      })
      .catch(function (err) {
        setStatus('Importação: ' + (err.message || err), 'error');
        var area = byId('pasteArea');
        var details = document.querySelector('.bom-sidebar-more');
        if (details && !details.open) details.open = true;
        if (area) {
          area.focus();
          area.placeholder = 'Cole aqui com Ctrl+V (Explorer → Ctrl+A → Ctrl+C) e clique Importar de novo';
        }
      })
      .finally(function () {
        root.__3DX_BLOCK_API_LOAD__ = false;
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Importar Ctrl+C';
        }
      });
  }

  function rebindImportButton() {
    var btn = byId('btnImportPaste');
    if (!btn || btn.__3DX_IMPORT_BOUND__) return;
    btn.__3DX_IMPORT_BOUND__ = true;
    btn.addEventListener('click', function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      runImportFromClipboard(btn);
    });
  }

  function bindPasteCapture() {
    var host = root.__3DX_UI_ROOT__ || document.body;
    if (!host || host.__3DX_PASTE_BOUND__) return;
    host.__3DX_PASTE_BOUND__ = true;
    host.addEventListener('paste', function (e) {
      var text = e.clipboardData ? e.clipboardData.getData('text/plain') || '' : '';
      if (!text || !String(text).trim()) return;
      if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.setPasteBuffer) {
        ExplorerScanner.setPasteBuffer(text);
      }
      var area = byId('pasteArea');
      if (area) area.value = text;
      setStatus('Dados colados — clique Importar Ctrl+C ou aguarde…', 'info');
      window.clearTimeout(host.__3DX_PASTE_AUTO__);
      host.__3DX_PASTE_AUTO__ = window.setTimeout(function () {
        if (String(text).indexOf('\t') >= 0 || String(text).split(/\r?\n/).length >= 2) {
          runImportFromClipboard(null);
        }
      }, 350);
    });
  }

  function initUI() {
    applyUrlParamsToUI();
    KpiCards.init('#kpiGrid');
    ChartsManager.init();
    if (typeof PartPreview !== 'undefined') PartPreview.init('#partPreviewPanel');
    DataTable.init('#bomTable');
    tableInitialized = true;
    DataTable.onRowSelect(function (node) {
      if (typeof PartPreview !== 'undefined') PartPreview.show(node);
    });
    var treeEl = byId('bomTree');
    if (treeEl && APP_CONFIG.SHOW_TREE !== false && typeof BomTree !== 'undefined') {
      BomTree.init('#bomTree', function (id) {
        return BomService.expandNode(id);
      });
    }
    Filters.init(
      {
        search: '#searchInput',
        maturity: '#filterMaturity',
        type: '#filterType',
        approval: '#filterApproval',
        hasPP: '#filterPP'
      },
      function () {
        refreshUI();
      }
    );

    rebindScanButton();
    rebindImportButton();
    bindPasteCapture();

    var btnClear = byId('btnClearFilters');
    if (btnClear && !btnClear.__3DX_CLEAR_BOUND__) {
      btnClear.__3DX_CLEAR_BOUND__ = true;
      btnClear.addEventListener('click', function () {
        if (typeof Filters !== 'undefined' && Filters.clearAll) Filters.clearAll();
      });
    }

    if (typeof DashboardTheme !== 'undefined') {
      DashboardTheme.init({
        onChange: function () {
          refreshUI();
        }
      });
    }
    var btnScanHide = byId('btnScanExplorer');
    if (btnScanHide && APP_CONFIG.HIDE_SCAN_BUTTON) {
      btnScanHide.classList.add('bom-hidden');
    }

    var btnLoadId = byId('btnLoadPhysicalId');
    if (btnLoadId) {
      btnLoadId.addEventListener('click', function () {
        var idEl = byId('explorerObjectId');
        var id = idEl && idEl.value ? String(idEl.value).trim() : '';
        if (!id || id.length < 16) {
          setStatus('Cole o ID físico (32 hex) da raiz no Explorer.', 'error');
          return;
        }
        if (typeof ProductExplorerBridge !== 'undefined') {
          ProductExplorerBridge.setSelection({
            physicalid: id,
            type: 'VPMReference',
            name: byId('selectionLabel') ? byId('selectionLabel').textContent : id,
            displayName: byId('selectionLabel') ? byId('selectionLabel').textContent : id,
            source: 'manual-id'
          }, { silent: true });
        }
        runExplorerScan(btnLoadId);
      });
    }

    var btnExample = byId('btnLoadExample');
    if (btnExample) {
      btnExample.addEventListener('click', function () {
        var url = BomSnapshot.resolveUrl('data/mont10-exemplo-snapshot.json');
        loadSnapshotFromUrl(url);
      });
    }

    var btnSync = byId('btnSyncExplorer');
    if (btnSync) {
      btnSync.addEventListener('click', function () {
        setStatus(
          'Sincronizar não lê a árvore no GitHub. Grade Explorer → Ctrl+C → cole abaixo → Importar.',
          'warn'
        );
        var area = byId('pasteArea');
        if (area) area.focus();
        pullExplorerSelection();
        var fromHash = ProductExplorerBridge.readHashSelection && ProductExplorerBridge.readHashSelection();
        var sel = fromHash || ProductExplorerBridge.getSelection();
        if (sel && isValidPhysicalId(sel.physicalid)) {
          lastLoadedId = null;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = sel.displayName || sel.physicalid;
          loadBom(sel.physicalid);
          setStatus('Explorer: ' + (sel.displayName || sel.physicalid), 'ok');
        } else {
          setStatus(
            'Clique na raiz do assembly no Explorer (01_SKA_Drone…), depois ↻ Sincronizar.',
            'warn'
          );
          loadDemoBom();
        }
      });
    }

    var btnRef = byId('btnRefresh');
    if (btnRef) {
      btnRef.addEventListener('click', function () {
        reloadFromExplorer();
      });
    }

    var btnExport = byId('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        DataTable.exportExcel();
      });
    }

    var btnExpand = byId('btnExpandAll');
    if (btnExpand) {
      btnExpand.addEventListener('click', function () {
        setStatus('Expanda níveis na árvore.', 'info');
      });
    }

    var btnDrone = byId('btnLoadDrone');
    if (btnDrone) {
      btnDrone.addEventListener('click', function () {
        loadPhysicalProduct({
          physicalid: '132FB3CE26D70E006A18D1870000316D',
          displayName: '01_SKA_Drone Assembly_130520206',
          name: '01_SKA_Drone Assembly_130520206',
          type: 'VPMReference',
          displayType: 'Physical Product'
        });
      });
    }
  }

  function stripLegacyUI() {
    var selectors = [
      '.external-banner',
      '.goal-panel',
      '.paste-panel',
      '.drop-zone',
      '.explorer-sync-panel',
      '.explorer-id-row',
      '.platform-search.panel',
      '.split-panel',
      '.issues-panel',
      '.header-actions .search-group',
      '#btnSyncExplorer'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    });
    var h1 = document.querySelector('.app-header h1');
    if (h1 && h1.textContent.indexOf('Dashboard') >= 0) {
      h1.textContent = 'BOM Analytics';
    }
    document.body.classList.add('ui-clean');
  }

  function initAppCore(spaceUrl) {
    stripLegacyUI();
    var base = spaceUrl && spaceUrl !== 'demo' ? spaceUrl : getTenantSpaceUrl();
    if (base) {
      try {
        EnoviaApi.init(base);
        if (typeof SearchApi !== 'undefined') SearchApi.init(base);
      } catch (e) { /* */ }
    }
    ProductExplorerBridge.init();
    ProductExplorerBridge.subscribe(onSelection);
    if (ProductExplorerBridge.subscribeStructure) {
      ProductExplorerBridge.subscribeStructure(function (name) {
        syncOpenExplorerStructure(false);
      });
    }
    initUI();
    if (typeof ExplorerSyncPanel !== 'undefined') {
      ExplorerSyncPanel.init({
        onSelect: onSelection,
        onStatus: setStatusPublic
      });
    }
    if (typeof SnapshotPanel !== 'undefined') {
      SnapshotPanel.init({
        onSnapshot: function (payload, label) {
          applySnapshotPayload(payload, label);
        },
        onError: function (msg) {
          setStatus(msg, 'error');
        }
      });
    }
    toggleCrossOriginUI();
    scheduleExplorerSync();
    startExplorerPoll();
  }

  function pullExplorerSelection() {
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
  }

  function scheduleExplorerSync() {
    setTimeout(pullExplorerSelection, 800);
    setTimeout(pullExplorerSelection, 2500);
  }

  function startExplorerPoll() {
    var ms = APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0;
    if (ms < 2000) return;
    setInterval(function () {
      pullExplorerSelection();
      syncOpenExplorerStructure(false);
    }, ms);
  }

  function toggleCrossOriginUI() {
    if (!APP_CONFIG.CROSS_ORIGIN_WIDGET) return;
    document.querySelectorAll('.hidden-cross-origin').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function runHealthCheck() {
    var problems = [];
    if (typeof Chart === 'undefined') problems.push('Chart.js não carregou (gráficos desativados)');
    if (problems.length) {
      setStatus('Atenção: ' + problems.join('; ') + '. Colar do Explorer (Ctrl+C) continua funcionando.', 'warn');
      return true;
    }
    return true;
  }

  /** Additional App injeta UWA/require — aguarda antes de assumir Web Page Reader. */
  function waitForTrustedWidget(ms) {
    ms = ms || 2500;
    return new Promise(function (resolve) {
      if (!APP_CONFIG.CROSS_ORIGIN_WIDGET) return resolve(true);
      var t0 = Date.now();
      function tick() {
        var hasUwa = false;
        try {
          hasUwa = (typeof WidgetRuntime !== 'undefined' && WidgetRuntime.isTrusted()) ||
            (typeof widget !== 'undefined' && widget);
        } catch (e) { /* */ }
        var hasRequire = typeof require !== 'undefined';
        var hasWaf = typeof WAFData !== 'undefined';
        if (hasUwa || hasRequire || hasWaf) {
          APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
          APP_CONFIG.WIDGET_MODE = hasUwa ? 'additional_app' : 'trusted_runtime';
          resolve(true);
          return;
        }
        if (Date.now() - t0 >= ms) {
          resolve(false);
          return;
        }
        setTimeout(tick, 150);
      }
      tick();
    });
  }

  function bootstrap() {
    setStatus('BOM Analytics v' + (APP_CONFIG.BUILD || APP_CONFIG.VERSION) + ' — iniciando…', 'info');
    var watchdog = window.setTimeout(function () {
        if (BomService.getNodeCount() <= 1) {
        if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
          pilotAutoLoadFromExplorer().then(function (ok) {
            if (!ok) {
              setStatus('Abra a montagem no Explorer → clique Varrer estrutura.', 'info');
            }
          });
        } else if (APP_CONFIG.CAN_USE_ENOVIA_API) {
          syncOpenExplorerStructure(true);
        } else if (isSnapshotDeliveryMode() && typeof BomSnapshot !== 'undefined' && BomSnapshot.applyBuiltinMont10) {
          BomSnapshot.applyBuiltinMont10().then(function (meta) {
            APP_CONFIG.IMPORT_MODE = true;
            var lbl = byId('selectionLabel');
            if (lbl) lbl.textContent = meta.productName;
            refreshUI();
            setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
          });
        } else {
          runFallback();
        }
      }
      forceStopLoading();
    }, 12000);
    var wait = isTrustedBoot() ? Promise.resolve(true) : waitForTrustedWidget(2500);
    return wait
      .then(function () { return bootstrapCore(); })
      .finally(function () {
        window.clearTimeout(watchdog);
        forceStopLoading();
      });
  }

  function runFallback() {
    if (BomService.getNodeCount() > 1) return;
    if (APP_CONFIG.AUTO_LOAD_DEMO_DRONE) {
      loadDefaultExplorerProduct();
      return;
    }
    setStatus(
      'Cole a estrutura do Explorer abaixo ou use collect.html → ?snapshot=data/arquivo.json',
      'warn'
    );
  }

  function reloadFromExplorer() {
    pullExplorerSelection();
    var sel = ProductExplorerBridge.getSelection();
    if (sel && sel.physicalid) {
      lastLoadedId = null;
      loadBom(sel.physicalid);
      return;
    }
    trySyncThenLoad();
  }

  function getApiEnoviaUrl() {
    if (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD && typeof CompassServices !== 'undefined' && CompassServices.ifweSpaceUrl) {
      return CompassServices.ifweSpaceUrl();
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      var verified = CompassServices.getVerifiedSpaceUrl();
      if (verified) return verified;
    }
    if (typeof CompassServices !== 'undefined' && CompassServices.isDashboardOnIfwe && CompassServices.isDashboardOnIfwe()) {
      return CompassServices.ifweSpaceUrl();
    }
    var h = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return h ? ('https://' + h + '/enovia') : null;
  }

  function getTenantSpaceUrl() {
    return getApiEnoviaUrl();
  }

  function isValidPhysicalId(id) {
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(id);
    }
    return id && String(id).length >= 16;
  }

  function loadDemoBom(statusMsg) {
    var d = APP_CONFIG.TENANT_DEFAULTS || {};
    if (!d.defaultPhysicalId) return Promise.resolve();
    APP_CONFIG.DEMO_MODE = true;
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    var sel = {
      physicalid: d.defaultPhysicalId,
      displayName: d.defaultDisplayName || d.defaultPhysicalId,
      name: d.defaultDisplayName || d.defaultPhysicalId,
      type: 'VPMReference',
      displayType: 'Physical Product'
    };
    ProductExplorerBridge.setSelection(sel, { silent: true });
    var lbl = byId('selectionLabel');
    if (lbl) lbl.textContent = sel.displayName;
    return BomService.loadRoot(d.defaultPhysicalId).then(function () {
      lastLoadedId = d.defaultPhysicalId;
      refreshUI();
      setStatus(
        statusMsg || ('Demonstração: ' + BomService.getNodeCount() + ' itens. BOM real = 3DSpace.'),
        'warn'
      );
    });
  }

  function loadDefaultExplorerProduct() {
    if (APP_CONFIG.CAN_USE_ENOVIA_API) {
      setStatus('Selecione a raiz no Explorer → Varrer estrutura.', 'info');
      return Promise.resolve();
    }
    if (userRequestedRealProduct()) {
      applyUrlParamsToUI();
      var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
      setStatus(githubApiBlockedMessage(q.physicalid, q.structure), 'warn');
      return Promise.resolve();
    }
    if (!allowDemoOnApiFail()) return Promise.resolve();
    return loadDemoBom('Carregando demonstração do Drone…');
  }

  function trySyncThenLoad() {
    if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
      pollExplorerStructureLabel();
      setStatus('Pronto — abra a montagem no Explorer e clique Varrer estrutura.', 'info');
      return;
    }
    if (APP_CONFIG.CAN_USE_ENOVIA_API) {
      syncOpenExplorerStructure(true);
      return;
    }
    if (isSnapshotDeliveryMode()) {
      if (BomService.getNodeCount() > 1) return;
      if (typeof BomSnapshot !== 'undefined' && BomSnapshot.applyBuiltinMont10) {
        return BomSnapshot.applyBuiltinMont10().then(function (meta) {
          APP_CONFIG.IMPORT_MODE = true;
          lastLoadedId = meta.rootPhysicalId;
          var lbl = byId('selectionLabel');
          if (lbl) lbl.textContent = meta.productName;
          refreshUI();
          setStatus('Snapshot: ' + meta.productName + ' — ' + meta.itemCount + ' itens', 'ok');
        });
      }
      return;
    }
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.pollSelection) {
      ProductExplorerBridge.pollSelection();
    }
    pullExplorerSelection();
    var fromHash = typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.readHashSelection
      ? ProductExplorerBridge.readHashSelection()
      : null;
    if (fromHash && isValidPhysicalId(fromHash.physicalid)) {
      ProductExplorerBridge.setSelection(fromHash, { silent: true });
      var lbl = byId('selectionLabel');
      if (lbl) lbl.textContent = fromHash.displayName || fromHash.physicalid;
      loadBom(fromHash.physicalid);
      return;
    }
    var sel = ProductExplorerBridge.getSelection();
    if (sel && isValidPhysicalId(sel.physicalid)) {
      if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) {
        var q2 = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
        setStatus(
          githubApiBlockedMessage(sel.physicalid, sel.displayName || q2.structure),
          'warn'
        );
        return;
      }
      loadBom(sel.physicalid);
      return;
    }
    if (userRequestedRealProduct()) {
      applyUrlParamsToUI();
      var q3 = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
      var pid3 = q3.physicalid || APP_CONFIG.URL_PHYSICAL_ID;
      setStatus(githubApiBlockedMessage(pid3, q3.structure || q3.rootName), 'warn');
      return;
    }
    setStatus(
      'Selecione a raiz no Product Explorer → clique Varrer estrutura (API ENOVIA).',
      'info'
    );
    if (APP_CONFIG.EXPLORER_FALLBACK_MS === 0) return;
    window.setTimeout(function () {
      if (APP_CONFIG.CAN_USE_ENOVIA_API && pilotGridOnlyMode()) {
        pilotAutoLoadFromExplorer();
        return;
      }
      if (APP_CONFIG.CAN_USE_ENOVIA_API) {
        syncOpenExplorerStructure(true);
        return;
      }
      pullExplorerSelection();
      var later = ProductExplorerBridge.getSelection();
      if (later && later.physicalid && later.physicalid !== lastLoadedId) {
        if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.CAN_USE_ENOVIA_API) return;
        loadBom(later.physicalid);
      }
    }, APP_CONFIG.EXPLORER_FALLBACK_MS || 800);
  }

  function isTrustedBoot() {
    if (root.__3DX_TRUSTED_WIDGET__) return true;
    try {
      if (typeof widget !== 'undefined' && widget) return true;
    } catch (e) { /* */ }
    if (APP_CONFIG.CROSS_ORIGIN_WIDGET === false) return true;
    return false;
  }

  function hasSnapshotConfigured() {
    if (APP_CONFIG.SNAPSHOT_URL) return true;
    return typeof BomSnapshot !== 'undefined' && BomSnapshot.getParamUrl && !!BomSnapshot.getParamUrl();
  }

  function bootstrapApisBackground() {
    var chain = PlatformContext.init();
    if (typeof WafBootstrap !== 'undefined') {
      chain = WafBootstrap.ensure().then(function () {
        return PlatformContext.init();
      });
    }
    return chain
      .then(function () {
        if (CompassServices.ensureWorkingSpaceUrl) {
          return CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId);
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        var space = spaceUrl || getTenantSpaceUrl();
        if (space) initAppCore(space);
        if (space) return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
        return null;
      })
      .catch(function (err) {
        console.warn('API background:', err);
      });
  }

  function bootstrapTrustedFast() {
    APP_CONFIG.CROSS_ORIGIN_WIDGET = false;
    APP_CONFIG.SNAPSHOT_DELIVERY_MODE = false;
    return bootstrapTrustedFastWithApis();
  }

  function bootstrapTrustedFastWithApis() {
    setStatus('Conectando APIs 3DEXPERIENCE… v' + (APP_CONFIG.BUILD || APP_CONFIG.VERSION), 'info');

    var chain = PlatformContext.init();
    if (typeof WafBootstrap !== 'undefined') {
      chain = WafBootstrap.ensure().then(function () {
        return PlatformContext.init();
      });
    }

    return chain
      .then(function () {
        if (CompassServices.ensureWorkingSpaceUrl) {
          return CompassServices.ensureWorkingSpaceUrl(PlatformContext.getState().platformId);
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        var space = spaceUrl || getTenantSpaceUrl();
        if (!space) {
          throw new Error('URL 3DSpace não encontrada');
        }
        initAppCore(space);
        return CompassServices.fetchCsrfToken(space).catch(function () { return null; });
      })
      .then(function () {
        if (APP_CONFIG.SNAPSHOT_URL) {
          return tryLoadSnapshotFirst().then(function () {
            if (BomService.getNodeCount() > 1) return;
            trySyncThenLoad();
          });
        }
        setStatus('Lendo estrutura aberta no Explorer…', 'info');
        trySyncThenLoad();
        return null;
      })
      .catch(function (err) {
        console.error(err);
        try {
          initAppCore(getTenantSpaceUrl());
        } catch (eInit) { /* */ }
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() <= 1) {
            setStatus('API indisponível — cole estrutura do Explorer ou use ?snapshot=', 'warn');
          }
        });
      });
  }

  function bootstrapCore() {
    if (isTrustedBoot() && APP_CONFIG.USE_FAST_BOOT !== false) {
      return bootstrapTrustedFast();
    }

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      try {
        initAppCore(null);
        runHealthCheck();
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() > 1) return;
          trySyncThenLoad();
        });
      } catch (err) {
        console.error(err);
        setStatus('Erro: ' + (err.message || err), 'error');
      }
      return Promise.resolve();
    }

    return PlatformContext.init()
      .then(function () {
        if (APP_CONFIG.DEMO_MODE) return 'demo';
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        return CompassServices.fetchCsrfToken(spaceUrl).then(function () { return spaceUrl; });
      })
      .then(function (spaceUrl) {
        initAppCore(spaceUrl);
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() > 1) return;
          trySyncThenLoad();
        });
      })
      .catch(function (err) {
        console.error(err);
        if (APP_CONFIG.DEMO_MODE) {
          initAppCore('demo');
          return loadBom('DEMO_ROOT_001');
        }
        initAppCore(getTenantSpaceUrl());
        return tryLoadSnapshotFirst().then(function () {
          if (BomService.getNodeCount() <= 1) runFallback();
          setStatus('API limitada: ' + (err.message || err), 'warn');
        });
      });
  }

  function setStatusPublic(msg, type) {
    setStatus(msg, type);
  }

  function run() {
    if (typeof WidgetRuntime !== 'undefined') WidgetRuntime.markTrusted();
    if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
    stripLegacyUI();
    var modeLabel =
      APP_CONFIG.WIDGET_MODE === 'additional_app'
        ? 'Additional App — API ENOVIA ativa'
        : APP_CONFIG.WIDGET_MODE === 'web_page_reader'
          ? 'Web Page Reader — só cola/Varrer (sem API)'
          : APP_CONFIG.WIDGET_MODE;
    setStatus('Modo: ' + modeLabel + ' | build ' + (APP_CONFIG.BUILD || ''), 'info');
    var fb = document.getElementById('bom-boot-fallback');
    if (fb && fb.parentNode) fb.parentNode.removeChild(fb);
    bootstrap().catch(function (err) {
      console.error('[App] bootstrap failed', err);
      setStatus('Erro: ' + (err.message || err), 'error');
      runFallback();
      forceStopLoading();
    });
  }

  function start() {
    run();
  }

  if (!root.__3DX_BOOT_DEFER__) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  function forceStopLoading() {
    setLoading(false);
    var ov = byId('loadingOverlay');
    if (ov) ov.classList.add('hidden');
  }

  return {
    run: run,
    start: start,
    runFallback: runFallback,
    runExplorerScan: runExplorerScan,
    runImportFromClipboard: runImportFromClipboard,
    rebindScanButton: rebindScanButton,
    rebindImportButton: rebindImportButton,
    reloadFromExplorer: reloadFromExplorer,
    loadBom: loadBom,
    loadSnapshotFromUrl: loadSnapshotFromUrl,
    applySnapshotPayload: applySnapshotPayload,
    loadPhysicalProduct: loadPhysicalProduct,
    refreshUI: refreshUI,
    setStatus: setStatusPublic,
    forceStopLoading: forceStopLoading
  };
})();
