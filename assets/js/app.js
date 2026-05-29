/**
 * @file app.js
 * Orquestração — bootstrap, seleção Product Explorer, refresh.
 */
var App = (function () {
  'use strict';

  var currentMetrics = null;
  var currentAnomalies = null;
  var loading = false;

  function setStatus(msg, type) {
    var el = document.getElementById('statusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-bar status-' + (type || 'info');
  }

  function setLoading(on) {
    loading = on;
    var overlay = document.getElementById('loadingOverlay');
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
    ChartsManager.destroyAll();
    ChartsManager.render(currentMetrics);
    BomTree.refresh(index, rootId);
    DataTable.setData(filtered);
    renderIssues(currentAnomalies.issues);

    var mode = APP_CONFIG.IMPORT_MODE ? ' | IMPORTADO' : (APP_CONFIG.DEMO_MODE ? ' | DEMO' : '');
    setStatus('Estrutura: ' + BomService.getNodeCount() + ' itens | Exibindo: ' + filtered.length + mode, 'ok');
  }

  function renderIssues(issues) {
    var el = document.getElementById('issuesList');
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
      setStatus(
        'Objeto do Explorer vinculado. Estrutura filha completa exige HTML no 3DSpace (mesmo domínio).',
        'warn'
      );
    });
  }

  function loadBom(physicalId) {
    if (!physicalId || loading) return Promise.resolve();
    setLoading(true);
    setStatus('Carregando E-BOM...', 'info');

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET && !APP_CONFIG.DEMO_MODE) {
      return loadBomFromSelectionOnly(physicalId);
    }

    return BomService.loadRoot(physicalId)
      .then(function (index) {
        return PhysicalProductService.enrichNodes(index, { batchSize: 25 });
      })
      .then(function () {
        refreshUI();
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Erro ao carregar BOM: ' + (err.message || err), 'error');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function onSelection(sel) {
    document.getElementById('selectionLabel').textContent =
      sel.displayName + ' (' + sel.physicalid + ')';
    loadBom(sel.physicalid);
  }

  function loadPhysicalProduct(sel) {
    if (!sel || !sel.physicalid) return Promise.resolve();
    setLoading(true);
    if (typeof ProductExplorerBridge.setSelection === 'function') {
      ProductExplorerBridge.setSelection(sel, { silent: true });
    }
    document.getElementById('selectionLabel').textContent =
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
    BomTree.init('#bomTree', function (id) {
      return BomService.expandNode(id);
    });
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

    document.getElementById('btnRefresh').addEventListener('click', function () {
      var sel = ProductExplorerBridge.getSelection();
      if (sel) loadBom(sel.physicalid);
      else setStatus('Selecione um objeto no Product Explorer.', 'warn');
    });

    document.getElementById('btnExport').addEventListener('click', function () {
      DataTable.exportExcel();
    });

    document.getElementById('btnExpandAll').addEventListener('click', function () {
      setStatus('Expansão total desabilitada por performance. Expanda por nível na árvore.', 'warn');
    });

    var btnDrone = document.getElementById('btnLoadDrone');
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

  function initAppCore(spaceUrl) {
    if (spaceUrl && spaceUrl !== 'demo') {
      EnoviaApi.init(spaceUrl);
      SearchApi.init(spaceUrl);
    }
    ProductExplorerBridge.init();
    ProductExplorerBridge.subscribe(onSelection);
    initUI();
    ProductSearchPanel.init({ onSelect: onSelection });
    ExplorerSyncPanel.init({
      onSelect: onSelection,
      onStatus: setStatusPublic
    });
    DropZone.init({
      onImported: function (count, fileName) {
        APP_CONFIG.IMPORT_MODE = true;
        APP_CONFIG.DEMO_MODE = false;
        refreshUI();
        setStatus('Importado: ' + fileName + ' — ' + count + ' itens na estrutura.', 'ok');
      },
      on3DXProduct: function (sel) {
        loadPhysicalProduct(sel);
      },
      onError: function (msg) {
        setStatus('Importação: ' + msg, 'error');
      }
    });
    toggleCrossOriginUI();
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
          hasUwa = typeof widget !== 'undefined' && widget;
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
    setLoading(true);
    setStatus('Inicializando...', 'info');

    return waitForTrustedWidget(2500).then(function () {
      return bootstrapCore();
    });
  }

  function bootstrapCore() {
    setLoading(true);

    if (APP_CONFIG.CROSS_ORIGIN_WIDGET) {
      try {
        var banner = document.getElementById('externalBanner');
        if (banner) banner.classList.remove('hidden');
        initAppCore(null);
        runHealthCheck();
        setStatus(
          'Web Page Reader: sem API ENOVIA. Admin: crie Additional App (GUIA-ADMIN-ADDITIONAL-APP.md). Enquanto isso: Physical ID ou Carregar Drone.',
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
        initAppCore(spaceUrl);
        var modeLabel = APP_CONFIG.WIDGET_MODE || 'plataforma';
        setStatus('Modo ' + modeLabel + ' — APIs 3DEXPERIENCE ativas.', 'ok');
        var sel = ProductExplorerBridge.getSelection();
        if (sel && !APP_CONFIG.CROSS_ORIGIN_WIDGET) return loadBom(sel.physicalid);
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

  return {
    loadBom: loadBom,
    loadPhysicalProduct: loadPhysicalProduct,
    refreshUI: refreshUI,
    setStatus: setStatusPublic
  };
})();
