/**
 * @file app.js
 * Orquestração — bootstrap, seleção Product Explorer, refresh.
 */
var App = (function () {
  'use strict';

  function byId(id) {
    var el = byId(id);
    if (el) return el;
    try {
      if (typeof widget !== 'undefined' && widget && widget.body) {
        return widget.body.querySelector('#' + id);
      }
    } catch (e) { /* UWA */ }
    return null;
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

  function refreshUI() {
    var index = BomService.getIndex();
    var rootId = BomService.getRootId();
    var flat = BomNormalizer.toFlatList(index, rootId);
    Filters.populateTypeOptions(flat);
    var filtered = Filters.apply(flat);

    currentMetrics = MetricsEngine.compute(index);
    currentAnomalies = AnomalyDetector.detect(index);

    KpiCards.render(currentMetrics, currentAnomalies);
    if (APP_CONFIG.SHOW_CHARTS !== false) {
      ChartsManager.destroyAll();
      ChartsManager.render(currentMetrics);
    }
    if (APP_CONFIG.SHOW_TREE !== false && byId('bomTree')) {
      BomTree.refresh(index, rootId);
    }
    DataTable.setData(filtered);
    var tableLbl = byId('tableProductLabel');
    var sel = ProductExplorerBridge.getSelection();
    if (tableLbl && sel) {
      tableLbl.textContent = sel.displayName || sel.name || sel.physicalid;
    }
    renderIssues(currentAnomalies.issues);

    var mode = APP_CONFIG.IMPORT_MODE ? ' | IMPORTADO' : (APP_CONFIG.DEMO_MODE ? ' | DEMO' : '');
    setStatus('Estrutura: ' + BomService.getNodeCount() + ' itens | Exibindo: ' + filtered.length + mode, 'ok');
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

  function loadBom(physicalId) {
    if (!physicalId || loading) return Promise.resolve();
    if (physicalId === lastLoadedId && BomService.getNodeCount() > 1) {
      return Promise.resolve();
    }
    setLoading(true);
    setStatus('Carregando E-BOM…', 'info');

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.DEMO_MODE) {
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
        var sel = ProductExplorerBridge.getSelection();
        if (sel) {
          return BomService.loadRootFromSelection(sel).then(function () {
            refreshUI();
            setStatus('Exibindo raiz do Explorer (' + (sel.displayName || sel.physicalid) + ').', 'warn');
          });
        }
        setStatus('Erro: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function onSelection(sel) {
    if (!sel || !sel.physicalid) return;
    var label = byId('selectionLabel');
    if (label) {
      label.textContent = (sel.displayName || sel.name || sel.physicalid);
    }
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

  function initUI() {
    KpiCards.init('#kpiGrid');
    ChartsManager.init();
    DataTable.init('#bomTable');
    var treeEl = byId('bomTree');
    if (treeEl && APP_CONFIG.SHOW_TREE !== false) {
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

    var btnRef = byId('btnRefresh');
    if (btnRef) {
      btnRef.addEventListener('click', function () {
        var sel = ProductExplorerBridge.getSelection();
        if (sel) loadBom(sel.physicalid);
        else setStatus('Abra um produto no Product Structure Explorer.', 'warn');
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
      '.platform-search.panel',
      '.paste-panel',
      '.drop-zone',
      '.split-panel',
      '.issues-panel',
      '.header-actions .search-group'
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
    if (spaceUrl && spaceUrl !== 'demo') {
      EnoviaApi.init(spaceUrl);
      SearchApi.init(spaceUrl);
    }
    ProductExplorerBridge.init();
    ProductExplorerBridge.subscribe(onSelection);
    initUI();
    if (!APP_CONFIG.EXPLORER_ONLY && APP_CONFIG.SHOW_PLATFORM_SEARCH !== false) {
      ProductSearchPanel.init({ onSelect: onSelection });
    }
    ExplorerSyncPanel.init({
      onSelect: onSelection,
      onStatus: setStatusPublic
    });
    if (!APP_CONFIG.UI_CLEAN && byId('dropZone')) {
      DropZone.init({
        onImported: function (count, fileName) {
          APP_CONFIG.IMPORT_MODE = true;
          APP_CONFIG.DEMO_MODE = false;
          refreshUI();
          setStatus('Importado: ' + fileName + ' — ' + count + ' itens.', 'ok');
        },
        on3DXProduct: function (sel) {
          loadPhysicalProduct(sel);
        },
        onError: function (msg) {
          setStatus('Importação: ' + msg, 'error');
        }
      });
    }
    toggleCrossOriginUI();
    if (APP_CONFIG.EXPLORER_ONLY || APP_CONFIG.UI_CLEAN) {
      window.setTimeout(function () {
        scheduleExplorerSync();
        startExplorerPoll();
      }, 2000);
    }
  }

  function pullExplorerSelection() {
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
    var btn = byId('btnSyncExplorer');
    if (btn) btn.click();
  }

  function scheduleExplorerSync() {
    setTimeout(pullExplorerSelection, 800);
    setTimeout(pullExplorerSelection, 2500);
  }

  function startExplorerPoll() {
    var ms = APP_CONFIG.AUTO_SYNC_EXPLORER_MS || 0;
    if (ms < 2000) return;
    setInterval(pullExplorerSelection, ms);
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
    setStatus('Inicializando…', 'info');
    var wait = (global.__3DX_TRUSTED_WIDGET__) ? Promise.resolve(true) : waitForTrustedWidget(3000);
    return wait.then(function () {
      return bootstrapCore();
    });
  }

  function bootstrapCore() {

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      try {
        var banner = byId('externalBanner');
        if (banner) banner.classList.remove('hidden');
        initAppCore(null);
        runHealthCheck();
        setStatus(
          'Web Page Reader: sem API ENOVIA. Admin: Additional App — leia PASSO-UNICO-ADMIN.md. Enquanto isso: Physical ID ou Carregar Drone.',
          'warn'
        );
      } catch (err) {
        console.error(err);
        setStatus('Erro: ' + (err.message || err), 'error');
      }
      setLoading(false);
      return Promise.resolve();
    }

    return PlatformContext.init()
      .then(function () {
        if (APP_CONFIG.DEMO_MODE) {
          setStatus('Modo demonstração — dados simulados.', 'warn');
          return 'demo';
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        return CompassServices.fetchCsrfToken(spaceUrl).then(function () {
          return spaceUrl;
        });
      })
      .then(function (spaceUrl) {
        initAppCore(spaceUrl);
        var modeLabel = APP_CONFIG.WIDGET_MODE || 'plataforma';
        setStatus('Modo ' + modeLabel + ' — APIs 3DEXPERIENCE ativas.', 'ok');
        var sel = ProductExplorerBridge.getSelection();
        if (sel && !APP_CONFIG.CROSS_ORIGIN_WIDGET) return loadBom(sel.physicalid);

        var defaultDrone = (APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.defaultPhysicalId) ||
          '132FB3CE26D70E006A18D1870000316D';
        if (APP_QUERY.physicalid) defaultDrone = APP_QUERY.physicalid;

        if (!APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.DEMO_MODE && APP_CONFIG.AUTO_LOAD_DEMO_DRONE) {
          return loadPhysicalProduct({
            physicalid: defaultDrone,
            displayName: '01_SKA_Drone Assembly_130520206',
            name: '01_SKA_Drone Assembly_130520206',
            type: 'VPMReference',
            displayType: 'Physical Product'
          });
        }

        if (APP_CONFIG.EXPLORER_ONLY && !APP_CONFIG.CROSS_ORIGIN_WIDGET) {
          setStatus('Abra o produto no Product Structure Explorer (aba EXPLORE).', 'info');
          pullExplorerSelection();
          return Promise.resolve();
        }

        if (APP_CONFIG.DEMO_MODE) {
          var root = APP_CONFIG.DEMO_ROOT_ID || 'DEMO_ROOT_001';
          return loadBom(root);
        }
        setStatus('Busque um Physical Product ou selecione no Product Explorer.', 'info');
      })
      .catch(function (err) {
        console.error(err);
        if (APP_CONFIG.DEMO_MODE) {
          initAppCore('demo');
          return loadBom('DEMO_ROOT_001');
        }
        try {
          initAppCore(null);
          setStatus('Modo limitado (sem require). Use Buscar + Product Explorer + Atualizar.', 'warn');
        } catch (e2) {
          setStatus('Falha na inicialização: ' + err.message, 'error');
        }
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function setStatusPublic(msg, type) {
    setStatus(msg, type);
  }

  function start() {
    stripLegacyUI();
    bootstrap().catch(function (err) {
      console.error('[App] bootstrap failed', err);
      setStatus('Erro no bootstrap: ' + (err.message || err), 'error');
      setLoading(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /** Fallback: garante carga demo se o bootstrap terminar antes dos scripts CDN */
  window.addEventListener('load', function () {
    if (APP_CONFIG.DEMO_MODE && BomService.getNodeCount() === 0) {
      loadBom('DEMO_ROOT_001');
    }
  });

  function forceStopLoading() {
    setLoading(false);
    var ov = byId('loadingOverlay');
    if (ov) ov.classList.add('hidden');
  }

  return {
    loadBom: loadBom,
    loadPhysicalProduct: loadPhysicalProduct,
    refreshUI: refreshUI,
    setStatus: setStatusPublic,
    forceStopLoading: forceStopLoading
  };
})();
