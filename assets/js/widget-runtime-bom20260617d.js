/* PR #23 — BOM Widget runtime ES5 (3DDashboard / Rhino compatible) */
(function (w) {
  'use strict';

  var GH = typeof w.__BOM_GH_BASE__ === 'string' ? w.__BOM_GH_BASE__ : 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';
  var BOM_BUILD = w.__BOM_WIDGET_BUILD__ || 'bom20260617d';
  var BASE_BUILD = w.__BOM_BASE_BUILD__ || 'bom20260607a';
  var RELEASE_COMMIT = w.__BOM_RELEASE_COMMIT__ || 'promote20260630a';

  w.__BOM_DATA_SOURCE__ = w.__BOM_DATA_SOURCE__ || 'wafdata-session';
  w.__BOM_LOADER_MODE__ = w.__BOM_LOADER_MODE__ || 'wafdata-session';

  w.__BOM_EXPECTED_BUILD__ = BOM_BUILD;
  w.__BOM_RUNTIME_BUILD__ = BOM_BUILD;
  w.__BOM_BUILD_ID__ = BOM_BUILD;
  w.__BOM_SCRIPT_LOAD_STATUS__ = w.__BOM_SCRIPT_LOAD_STATUS__ || {};
  w.__BOM_WIDGET_BOOT_STATE__ = { started: false, completed: false, build: null, startedAt: 0 };
  w.__BOM_LOADED_SCRIPT_URLS__ = w.__BOM_LOADED_SCRIPT_URLS__ || {};

  w.__BOM_RELEASE_MANIFEST__ = {
    build: BOM_BUILD,
    commit: RELEASE_COMMIT,
    widget: 'widget-v3-08i.html',
    runtime: 'widget-runtime-bom20260617d.js',
    bundle: 'bom-bundle-' + BASE_BUILD + '.js',
    provider: 'product-explorer-sync-provider.js',
    hotfix: 'bom-ska-service-hotfix-20260617d.js',
    wafClient: 'waf3dx-client-bom20260617d.js',
    wafProbe: 'wafdata-probe-bom20260617d.js',
    dataSource: 'wafdata-session'
  };
  w.__BOM_RELEASE_PROBE__ = function () {
    return w.__BOM_RELEASE_MANIFEST__;
  };

  function assetVersionQuery() {
    return '?v=' + encodeURIComponent(BOM_BUILD) + '&c=' + encodeURIComponent(RELEASE_COMMIT);
  }

  function mountTarget() {
    return typeof w.widget !== 'undefined' && w.widget && w.widget.body ? w.widget.body : document.body;
  }

  function uiRoot() {
    return w.__3DX_UI_ROOT__ || mountTarget();
  }

  function setBar(msg, kind) {
    var el = uiRoot() && uiRoot().querySelector ? uiRoot().querySelector('#statusBar') : null;
    if (!el) return;
    el.textContent = msg;
    el.className = 'bom-st';
    if (kind === 'ok') el.className += ' bom-st-ok';
    if (kind === 'error') el.className += ' bom-st-err';
  }

  function formatBuildPillLabel(b) {
    var m = String(b || '').match(/^bom(\d{8})([a-z])$/i);
    return m ? m[1].slice(-2) + m[2] : String(b || '');
  }

  function buildPillTitle() {
    var mf = w.__BOM_RELEASE_MANIFEST__;
    return (
      'Build ' +
      BOM_BUILD +
      '\nCache ' +
      (mf && mf.commit ? mf.commit : RELEASE_COMMIT) +
      '\nDataSource wafdata-session\nHotfix bom-ska-service-hotfix-20260617d.js'
    );
  }

  function updateBuildLabel() {
    try {
      var id = w.__BOM_BUILD_ID__ || BOM_BUILD;
      var p = uiRoot().querySelector ? uiRoot().querySelector('.bom-build-pill') : null;
      if (p) {
        p.textContent = formatBuildPillLabel(id);
        p.title = buildPillTitle();
        p.setAttribute('aria-label', 'Build ' + id);
      }
      var t = uiRoot().querySelector ? uiRoot().querySelector('#buildTag') : null;
      if (t) t.textContent = id;
    } catch (e) {}
  }

  var PAINT_HTML = '<div class="bom-root bom-dashboard bom-theme-gray ui-clean bom-layout-page bom-3dx-product-dashboard"><header class="bom-zone-1 bom-topbar"><div class="bom-topbar-left"><span class="bom-topbar-brand">BOM Analytics</span><span id="explorerContextStatus" class="bom-explorer-context-status">Aguardando Product Explorer</span></div><div class="bom-topbar-center"><span class="bom-topbar-product" id="selectionLabel" title="-">-</span></div><div class="bom-topbar-actions"><button type="button" id="btnSyncExplorer" class="bom-btn bom-btn-primary">Sincronizar com Product Explorer</button><button type="button" id="btnRefreshBom" class="bom-btn bom-btn-secondary">Atualizar BOM</button><span id="explorerSourceBadge" class="bom-source-badge">Fonte: SKA BOM Service / dseng</span><span class="bom-topbar-clock"><span id="lastUpdateClock" class="bom-clock-time">--:--:--</span></span><button type="button" id="btnThemeToggle" class="bom-btn bom-btn-secondary bom-btn-compact">Tema</button><button type="button" id="btnWaf3dxDiagToggle" class="bom-btn bom-btn-secondary bom-btn-compact bom-waf3dx-topbar-trigger" title="Diagnóstico 3DX WAFData">Diagnóstico</button><span class="bom-build-pill" title="\'+BOM_BUILD+\'">\'+formatBuildPillLabel(BOM_BUILD)+\'</span><details class="bom-topbar-more"><summary>Avançado</summary><div id="bomRulesPanel"></div><label class="bom-filter-item"><span>Root Physical ID</span><input type="text" id="explorerObjectId" class="bom-input" placeholder="63FC553465A62400699E0792000086AB" title="Root Physical ID — fallback"/></label><label class="bom-filter-item"><span>Profundidade</span><input type="number" id="skaDepthInput" class="bom-input" min="1" max="2" value="1" title="Profundidade dseng"/></label><button type="button" id="btnTestRootId" class="bom-btn bom-btn-secondary">Testar Root ID</button><button type="button" id="btnCopyContextDiag" class="bom-btn bom-btn-secondary">Copiar diagnóstico de contexto</button><button type="button" id="btnLoadPhysicalId" class="bom-btn bom-btn-secondary">Varrer por ID</button><button type="button" id="btnApiDiagnostic" class="bom-btn bom-btn-secondary">Diagnosticar API</button><textarea id="apiDiagReport" class="bom-input bom-hidden" rows="6" readonly="readonly"></textarea><textarea id="pasteArea" class="bom-paste bom-hidden"></textarea></details></div></header><section class="bom-quad bom-zone-2"><div class="bom-zone-2-scroll"><div id="syncBanner" class="bom-sync-banner bom-sync-banner-compact">Camada analítica do <strong>Product Structure Explorer</strong>. Fonte: <strong>SKA BOM Service</strong> / dseng.</div><div id="skaBomDiagnostics" class="bom-ska-diagnostics bom-hidden"></div><div id="expandItemValidationPanel" class="bom-hidden"></div><div class="bom-filter-bar bom-filter-bar-quad"><label class="bom-filter-item"><span>Maturidade</span><select id="filterMaturity"><option value="all">Todas</option><option value="released">Bom (Aprovado)</option><option value="in_work">Moderado</option><option value="obsolete">Ruim</option><option value="other">Outros</option></select></label><label class="bom-filter-item"><span>Tipo</span><select id="filterType"><option value="all">Todos</option></select></label><label class="bom-filter-item"><span>Aprovação</span><select id="filterApproval"><option value="all">Todas</option><option value="approved">Aprovado</option><option value="pending">Pendente</option></select></label><label class="bom-filter-item"><span>Buscar</span><input type="search" id="searchInput" placeholder="Nome, descrição, proprietário…"/></label><button type="button" id="btnClearFilters" class="bom-btn">Limpar</button></div><section id="kpiGrid" class="stat-markers-row"></section></div><div id="statusBar" class="bom-st">Carregando…</div></section><section class="bom-quad bom-zone-3" id="chartsSection"><div class="bom-charts-unified-scroll"><section class="bom-charts-row bom-charts-row-quad"><div class="bom-chart-panel"><h3 class="bom-chart-heading">Saúde da Maturidade</h3><div class="bom-chart-canvas-box"><canvas id="chartMaturity"></canvas></div><div id="maturityLegendScroll" class="bom-chart-legend-list"></div></div><div class="bom-chart-panel bom-chart-owners"><h3 class="bom-chart-heading">Proprietários</h3><div class="bom-chart-canvas-box"><canvas id="chartOwners"></canvas></div><div id="ownersLegendScroll" class="bom-chart-legend-list"></div></div></section></div></section><section class="bom-quad bom-zone-4"><section class="bom-ebom-block"><div class="bom-ebom-head"><h2>E-BOM — <span id="tableProductLabel">-</span></h2><p id="ebomMeta" class="bom-ebom-meta bom-hidden">Clique numa linha para ver preview 3D à direita.</p></div><div class="bom-ebom-list"><div class="bom-table-wrap table-scroll"><table id="bomTable" class="bom-table"><thead><tr></tr></thead><tbody></tbody></table></div><footer id="tablePager" class="bom-table-pager">0 peças</footer></div></section></section><section class="bom-quad bom-zone-5"><div class="bom-part-preview bom-preview-quad" id="partPreviewPanel"><div class="bom-preview-body"><p class="bom-preview-hint">Clique numa linha da E-BOM</p><div id="partPreviewImage" class="bom-preview-image"><span class="bom-preview-placeholder">Clique numa linha da E-BOM para visualização 3D</span></div><div id="partPreviewMeta" class="bom-preview-meta"></div></div></div></section><button type="button" id="btnScanExplorer" class="bom-hidden">Varrer</button><div id="loadingOverlay" class="bom-loading bom-hidden">Processando…</div><span class="bom-build-tag bom-hidden" id="buildTag">\'+BOM_BUILD+\'</span><div class="bom-hidden" id="hiddenFields"><canvas id="chartType"></canvas><canvas id="chartRevision"></canvas><canvas id="chartApproval"></canvas><input type="text" id="explorerObjectName"/><select id="filterPP"><option value="all">all</option></select></div></div>';

  function getPaintHtml() {
    var pill = '<span class="bom-build-pill" title="' + BOM_BUILD + '">' + formatBuildPillLabel(BOM_BUILD) + '</span>';
    var tag = '<span class="bom-build-tag bom-hidden" id="buildTag">' + BOM_BUILD + '</span>';
    return PAINT_HTML
      .replace('<span class="bom-build-pill" title="\'+BOM_BUILD+\'">\'+formatBuildPillLabel(BOM_BUILD)+\'</span>', pill)
      .replace('<span class="bom-build-tag bom-hidden" id="buildTag">\'+BOM_BUILD+\'</span>', tag);
  }


  function paint() {
    var b = mountTarget();
    if (!b) return;
    b.innerHTML = getPaintHtml();
    b.className = 'bom-widget-body';
    b.style.minHeight = '100%';
    b.style.height = '100%';
    w.__3DX_UI_ROOT__ = b;
    updateBuildLabel();
    wireDiagnosticToggle();
  }

  function getRequire() {
    if (typeof w.widget !== 'undefined' && w.widget && w.widget.requirejs) return w.widget.requirejs;
    if (typeof w.require !== 'undefined') return w.require;
    return null;
  }

  function loadScript(url, optional, next) {
    if (w.__BOM_LOADED_SCRIPT_URLS__[url]) {
      if (next) next(null);
      return;
    }
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.charset = 'UTF-8';
    s.src = url;
    s.onload = function () {
      w.__BOM_LOADED_SCRIPT_URLS__[url] = true;
      if (next) next(null);
    };
    s.onerror = function () {
      if (optional) {
        w.__BOM_LOADED_SCRIPT_URLS__[url] = true;
        if (next) next(null);
      } else if (next) {
        next('erro ' + url);
      }
    };
    document.getElementsByTagName('head')[0].appendChild(s);
  }

  function loadWaf(next) {
    if (typeof w.WAFData !== 'undefined' && w.WAFData.authenticatedRequest) {
      next(null);
      return;
    }
    var req = getRequire();
    if (!req) {
      next(null);
      return;
    }
    req(
      ['DS/WAFData/WAFData', 'DS/i3DXCompassServices/i3DXCompassServices', 'DS/PlatformAPI/PlatformAPI'],
      function (WAF, Compass, PAPI) {
        w.WAFData = WAF;
        w.__3DX_COMPASS__ = Compass;
        w.__3DX_PLATFORM_API__ = PAPI;
        next(null);
      },
      function () {
        next(null);
      }
    );
  }

  function loadDebugLegacyScripts(next) {
    if (w.__BOM_DEBUG__ !== true) {
      if (next) next();
      return;
    }
    var q = assetVersionQuery();
    var urls = [
      GH + 'assets/js/integration/product-explorer-bridge.js' + q,
      GH + 'assets/js/integration/explorer-mirror-provider.js' + q,
      GH + 'assets/js/integration/product-explorer-mirror-contract-probe.js' + q,
      GH + 'assets/js/integration/expand-item-provider.js' + q,
      GH + 'assets/js/integration/expand-item-validator.js' + q
    ];
    function step(i) {
      if (i >= urls.length) {
        if (next) next();
        return;
      }
      loadScript(urls[i], true, function () {
        step(i + 1);
      });
    }
    step(0);
  }

  function wireDiagnosticToggle() {
    if (w.__waf3dxClient && w.__waf3dxClient.installExecutorUi) {
      w.__waf3dxClient.installExecutorUi();
    }
    if (w.__waf3dxClient && w.__waf3dxClient.installDiagnosticUi) {
      w.__waf3dxClient.installDiagnosticUi();
    }
  }

  function scheduleDiagnosticUiInstall() {
    wireDiagnosticToggle();
    function tryInstall(attempt) {
      if (w.__waf3dxClient && (w.__waf3dxClient.installExecutorUi || w.__waf3dxClient.installDiagnosticUi)) {
        wireDiagnosticToggle();
        return;
      }
      if (attempt >= 12) return;
      setTimeout(function () {
        tryInstall(attempt + 1);
      }, 250);
    }
    tryInstall(0);
  }

  function finishBoot() {
    try {
      updateBuildLabel();
      if (typeof w.__bomSkaServiceInstall === 'function') w.__bomSkaServiceInstall();
      scheduleDiagnosticUiInstall();
      if (typeof w.App !== 'undefined' && w.App.run) {
        w.App.run();
        if (typeof w.__bomSkaServiceInstall === 'function') w.__bomSkaServiceInstall();
        scheduleDiagnosticUiInstall();
        if (w.App.rebindScanButton) w.App.rebindScanButton();
        if (w.App.rebindImportButton) w.App.rebindImportButton();
        updateBuildLabel();
        setBar('Build ' + (w.__BOM_BUILD_ID__ || BOM_BUILD) + ' | WAFData session / dseng', 'ok');
        w.__BOM_WIDGET_BOOT_STATE__.completed = true;
      } else {
        setBar('App nao iniciou.', 'error');
      }
    } catch (ex) {
      setBar('Erro: ' + (ex.message || ex), 'error');
    }
  }

  function startBundle() {
    var q = assetVersionQuery();
    loadScript(GH + 'assets/js/bom-bundle-' + BASE_BUILD + '.js' + q, false, function (err) {
      if (err) {
        setBar('Erro ao carregar bundle base.', 'error');
        return;
      }
      loadScript(GH + 'assets/js/integration/explorer-context.js' + q, true, function () {
        loadScript(GH + 'assets/js/integration/product-explorer-sync-provider.js' + q, false, function (errSync) {
        if (errSync) {
          setBar('Erro ao carregar Product Explorer sync provider.', 'error');
          return;
        }
        loadScript(GH + 'assets/js/integration/expand-item-provider.js' + q, true, function () {
          loadScript(GH + 'assets/js/bom-ska-service-hotfix-20260617d.js' + q, false, function (err3) {
            if (err3) {
              setBar('Erro ao carregar BOM hotfix.', 'error');
              return;
            }
            loadScript(GH + 'assets/js/waf3dx-client-bom20260617d.js' + q, false, function (errWaf) {
              if (errWaf) {
                setBar('Erro ao carregar WAF3DX client.', 'error');
                return;
              }
              loadScript(GH + 'assets/js/wafdata-probe-bom20260617d.js' + q, true, function () {
                loadDebugLegacyScripts(finishBoot);
              });
            });
          });
        });
      });
      });
    });
  }

  function loadCss(next) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = GH + 'assets/css/dashboard.css' + assetVersionQuery();
    l.onload = function () {
      if (next) next();
    };
    l.onerror = function () {
      if (next) next();
    };
    document.getElementsByTagName('head')[0].appendChild(l);
  }

  function executeInit(mode) {
    var st = w.__BOM_WIDGET_BOOT_STATE__;
    mode = mode || 'init';
    if (mode === 'init' && st.started && st.build === BOM_BUILD && st.completed) {
      updateBuildLabel();
      return;
    }
    if (mode === 'init' && st.started && st.build === BOM_BUILD && !st.completed) {
      if (Date.now() - (st.startedAt || 0) < 30000) return;
      st.started = false; /* timeout: resetar e tentar de novo */
    }
    if (mode === 'refresh') {
      st.completed = false;
    }
    st.started = true;
    st.build = BOM_BUILD;
    st.startedAt = Date.now();
    paint();
    setBar('Carregando ' + BOM_BUILD + ' (WAFData session)...', 'info');
    if (st.completed) {
      updateBuildLabel();
      if (typeof w.__bomSkaServiceInstall === 'function') w.__bomSkaServiceInstall();
      return;
    }
    loadCss(function () {
      loadWaf(function () {
        startBundle();
      });
    });
  }

  function bootWidget() {
    if (typeof w.widget !== 'undefined' && w.widget) {
      if (w.widget.addEvent) {
        w.widget.addEvent('onLoad', function () {
          /* Netvibes onLoad: garantir que widget.body existe antes de inicializar */
          if (w.widget.body) {
            executeInit('init');
          } else {
            setTimeout(function () { executeInit('init'); }, 200);
          }
        });
        w.widget.addEvent('onRefresh', function () { executeInit('refresh'); });
      }
      /* Se widget.body ja existe neste momento, inicializar diretamente */
      if (w.widget.body) {
        executeInit('init');
      } else {
        setTimeout(bootWidget, 200);
      }
    } else {
      setTimeout(bootWidget, 200);
    }
  }

  w.BomWidgetRuntime = {
    boot: bootWidget,
    init: executeInit,
    refresh: function () { executeInit('refresh'); },
    probe: w.__BOM_RELEASE_PROBE__,
    build: BOM_BUILD,
    commit: RELEASE_COMMIT
  };

  /* bootWidget() removido — ciclo de vida UWA via widget.addEvent no HTML */
})(window);
