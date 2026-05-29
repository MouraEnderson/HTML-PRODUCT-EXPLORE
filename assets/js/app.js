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
    if (APP_CONFIG.SHOW_CHARTS !== false) {
      ChartsManager.destroyAll();
      ChartsManager.render(currentMetrics);
    }
    if (APP_CONFIG.SHOW_TREE !== false && document.getElementById('bomTree')) {
      BomTree.refresh(index, rootId);
    }
    DataTable.setData(filtered);
    var tableLbl = document.getElementById('tableProductLabel');
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
    if (!sel || !sel.physicalid) return;
    var label = document.getElementById('selectionLabel');
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
    var treeEl = document.getElementById('bomTree');
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

    document.getElementById('btnRefresh').addEventListener('click', function () {
      var sel = ProductExplorerBridge.getSelection();
      if (sel) loadBom(sel.physicalid);
      else setStatus('Selecione um objeto no Product Explorer.', 'warn');
    });

    var btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        DataTable.exportExcel();
      });
    }

    var btnExpand = document.getElementById('btnExpandAll');
    if (btnExpand) {
      btnExpand.addEventListener('click', function () {
        setStatus('Expanda níveis na árvore.', 'info');
      });
    }

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
    if (!APP_CONFIG.UI_CLEAN && document.getElementById('dropZone')) {
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
      scheduleExplorerSync();
      startExplorerPoll();
    }
  }

  function pullExplorerSelection() {
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
    var btn = document.getElementById('btnSyncExplorer');
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
    setLoading(true);
    setStatus('Inicializando...', 'info');

    return waitForTrustedWidget(4000).then(function () {
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

  return {
    loadBom: loadBom,
    loadPhysicalProduct: loadPhysicalProduct,
    refreshUI: refreshUI,
    setStatus: setStatusPublic
  };
})();
