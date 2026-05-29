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

    setStatus(
      'Estrutura: ' + BomService.getNodeCount() + ' itens | Exibindo: ' + filtered.length +
      (APP_CONFIG.DEMO_MODE ? ' | MODO DEMO' : ''),
      'ok'
    );
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

  function loadBom(physicalId) {
    if (!physicalId || loading) return Promise.resolve();
    setLoading(true);
    setStatus('Carregando E-BOM...', 'info');

    return BomService.loadRoot(physicalId)
      .then(function (index) {
        return PhysicalProductService.enrichNodes(index, { batchSize: 25 });
      })
      .then(function () {
        refreshUI();
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Erro: ' + (err.message || err), 'error');
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
  }

  function bootstrap() {
    setLoading(true);
    setStatus('Inicializando plataforma...', 'info');

    return PlatformContext.init()
      .then(function () {
        if (APP_CONFIG.DEMO_MODE) {
          setStatus('Modo demonstração — dados simulados.', 'warn');
          return 'demo';
        }
        return CompassServices.get3DSpaceUrl(PlatformContext.getState().platformId);
      })
      .then(function (spaceUrl) {
        if (spaceUrl !== 'demo') {
          EnoviaApi.init(spaceUrl);
          SearchApi.init(spaceUrl);
        }
        ProductExplorerBridge.init();
        ProductExplorerBridge.subscribe(onSelection);
        initUI();
        ProductSearchPanel.init({ onSelect: onSelection });

        var sel = ProductExplorerBridge.getSelection();
        if (sel) return loadBom(sel.physicalid);
        if (APP_CONFIG.DEMO_MODE) {
          return loadBom('DEMO_ROOT_001');
        }
        setStatus('Busque um Physical Product acima ou selecione no Product Explorer.', 'info');
      })
      .catch(function (err) {
        console.error(err);
        if (APP_CONFIG.DEMO_MODE) {
          EnoviaApi.init('demo');
          ProductExplorerBridge.init();
          initUI();
          return loadBom('DEMO_ROOT_001');
        }
        setStatus('Falha na inicialização: ' + err.message, 'error');
      })
      .finally(function () {
        setLoading(false);
      });
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

  return { loadBom: loadBom, refreshUI: refreshUI };
})();
