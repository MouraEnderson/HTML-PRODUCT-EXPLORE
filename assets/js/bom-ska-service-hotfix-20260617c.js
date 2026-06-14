/* PR #22 — Stabilize 3DX widget runtime (ES5, no async/await) */
(function () {
  'use strict';

  var w = window;
  var BUILD = 'bom20260617c';
  var SKA_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure';
  var DATA_SOURCE = 'ska-bom-service';
  var DEFAULT_ROOT = '63FC553465A62400699E0792000086AB';
  var DEFAULT_DEPTH = 1;
  var SESSION_KEY = '3dx_bom_snapshot_v1';
  var guardLock = false;
  var lastSyncRootId = '';
  var lastSyncDepth = DEFAULT_DEPTH;
  var lastSyncTitle = '';

  w.__BOM_EXPECTED_BUILD__ = BUILD;
  w.__BOM_RUNTIME_BUILD__ = BUILD;
  w.__BOM_BUILD_ID__ = BUILD;
  w.BOM_BUILD_ID = BUILD;
  w.__BOM_DATA_SOURCE__ = DATA_SOURCE;
  w.__BOM_LOADER_MODE__ = DATA_SOURCE;
  w.__BOM_HOTFIX_MODE__ = DATA_SOURCE;

  function s(v) {
    return v == null ? '' : String(v).trim();
  }

  var lastContextMeta = null;

  function isValidDsengPhysicalId(id) {
    id = s(id);
    if (!id || id.length < 16) return false;
    if (/\s/.test(id)) return false;
    if (/^prd-/i.test(id)) return false;
    if (/^[0-9A-F]{24,32}$/i.test(id)) return true;
    return false;
  }

  function normalizeCandidateRootId(ctx, manualRootId) {
    ctx = ctx || {};
    var candidate = s(manualRootId);
    var source = 'MISSING';
    var title = s(ctx.title || ctx.productName || ctx.rootName);
    if (!candidate) candidate = s(ctx.rootId || ctx.selectedId);
    if (candidate && !manualRootId) {
      if (ctx.source === 'PRODUCT_EXPLORER_CONTEXT' || ctx.path === 'B') source = 'PlatformAPI';
      else if (ctx.source === 'EXPLORER_CONTEXT') source = 'ExplorerContext';
      else source = s(ctx.source) || 'PRODUCT_EXPLORER_CONTEXT';
    }
    if (manualRootId) {
      source = 'ADVANCED_MANUAL';
      candidate = s(manualRootId);
    }
    if (!candidate) {
      return {
        ok: false,
        rootId: '',
        reason: 'MISSING',
        source: source,
        validationStatus: 'MISSING',
        title: title,
        candidateRootId: '',
        rawType: 'none'
      };
    }
    if (!isValidDsengPhysicalId(candidate)) {
      return {
        ok: false,
        rootId: '',
        reason: 'INVALID_FORMAT',
        source: source,
        validationStatus: 'INVALID',
        title: title,
        candidateRootId: candidate,
        rawType: 'non-physical-id'
      };
    }
    return {
      ok: true,
      rootId: candidate,
      reason: 'VALID',
      source: source,
      validationStatus: 'VALID',
      title: title,
      candidateRootId: candidate,
      rawType: 'physical-id'
    };
  }

  function renderEmptyKpiPlaceholders() {
    var grid = byId('kpiGrid');
    if (!grid) return;
    var markers = [
      { tone: 'green', label: 'Total linhas', value: '0' },
      { tone: 'blue', label: 'Maturidade', value: '—' },
      { tone: 'purple', label: 'Proprietários', value: '—' },
      { tone: 'blue', label: 'Fonte', value: 'SKA' }
    ];
    grid.innerHTML = markers
      .map(function (m) {
        return (
          '<div class="stat-marker stat-marker-' +
          m.tone +
          '"><span class="stat-marker-label">' +
          escapeHtml(String(m.label)) +
          '</span><span class="stat-marker-value">' +
          escapeHtml(String(m.value)) +
          '</span></div>'
        );
      })
      .join('');
  }

  function renderEmptyChartsState() {
    if (w.ChartsManager && w.ChartsManager.destroyAll) w.ChartsManager.destroyAll();
    var chartsSection = byId('chartsSection');
    if (chartsSection) chartsSection.classList.add('bom-charts-empty-state');
    var matLeg = byId('maturityLegendScroll');
    var ownLeg = byId('ownersLegendScroll');
    if (matLeg) matLeg.innerHTML = '<div class="bom-chart-empty">Sem dados sincronizados</div>';
    if (ownLeg) ownLeg.innerHTML = '<div class="bom-chart-empty">Sem dados sincronizados</div>';
    ['chartMaturity', 'chartOwners', 'chartType', 'chartRevision', 'chartApproval'].forEach(function (id) {
      var c = byId(id);
      if (c && c.getContext) {
        try {
          var ctx2 = c.getContext('2d');
          if (ctx2) ctx2.clearRect(0, 0, c.width, c.height);
        } catch (e) {}
      }
    });
  }

  function renderEmptyTableMessage(msg) {
    var tbody = byId('bomTable') && byId('bomTable').querySelector('tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr class="bom-empty-row"><td colspan="12">' + escapeHtml(msg || 'Sem dados sincronizados.') + '</td></tr>';
    }
    updateTablePager(0);
    var tableLbl = byId('tableProductLabel');
    if (tableLbl) tableLbl.textContent = '-';
    var preview = byId('partPreviewMeta');
    if (preview) preview.innerHTML = '';
  }

  function renderContextDiagnostics(meta, reason) {
    meta = meta || lastContextMeta || {};
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var summary = reason === 'CONTEXT_INVALID'
      ? 'Contexto indisponível'
      : reason === 'ROOT_NOT_FOUND'
      ? 'SKA ERRO · 0 itens'
      : reason === 'INITIAL'
      ? 'Aguardando sincronização'
      : 'SKA ERRO · 0 itens';
    panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
    panel.classList.add('bom-ska-diagnostics');
    panel.innerHTML =
      '<div class="bom-ska-diag-head">' +
      '<span class="bom-ska-diag-summary">' +
      escapeHtml(summary) +
      '</span> ' +
      '<button type="button" class="bom-btn bom-btn-compact bom-ska-diag-toggle">Detalhes</button></div>' +
      '<div class="bom-ska-diag-details">' +
      'contextSource: ' +
      escapeHtml(meta.source || '—') +
      '<br/>selectedTitle: ' +
      escapeHtml(meta.title || '—') +
      '<br/>candidateRootId: ' +
      escapeHtml(meta.candidateRootId || '—') +
      '<br/>rootIdUsed: ' +
      escapeHtml(meta.rootIdUsed || meta.rootId || '—') +
      '<br/>validationStatus: ' +
      escapeHtml(meta.validationStatus || reason || '—') +
      (meta.reason ? '<br/>reason: ' + escapeHtml(meta.reason) : '') +
      '</div>';
    var toggle = panel.querySelector('.bom-ska-diag-toggle');
    if (toggle) {
      toggle.addEventListener('click', function (ev) {
        if (ev) ev.preventDefault();
        panel.classList.toggle('bom-ska-diag-expanded');
      });
    }
  }

  function renderEmptySkaState(reason, details) {
    details = details || {};
    w.__bomSkaLastPayload = null;
    w.__BOM_SKA_EMPTY_STATE__ = true;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    if (w.BomService && w.BomService.reset) w.BomService.reset();
    renderEmptyChartsState();
    renderEmptyKpiPlaceholders();
    renderEmptyTableMessage(
      details.tableMessage ||
        'Selecione uma estrutura no Product Explorer e clique Sincronizar, ou use Avançado.'
    );
    var lbl = byId('selectionLabel');
    if (lbl && details.title) lbl.textContent = details.title;
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML = escapeHtml(details.bannerMessage || 'Sem dados sincronizados via SKA BOM Service.');
    }
    renderContextDiagnostics(details.contextMeta || lastContextMeta, reason);
    if (details.errorCode === 'ROOT_NOT_FOUND') {
      renderSkaDiagnostics(
        {
          source: 'RENDER_BOM_SERVICE',
          mode: 'dseng-official',
          counts: { totalRows: 0 },
          rows: [],
          diagnostics: {
            status: 'ERROR',
            errors: [
              'RootId não encontrado ou não acessível. Verifique se o item selecionado é um Engineering Item/Physical Product válido para dseng ou use Avançado.'
            ],
            warnings: [],
            endpointsUsed: [],
            durationMs: 0
          },
          __skaSyncMeta: details.contextMeta || {}
        },
        false
      );
    }
    setStatus(details.statusMessage || 'Sem dados sincronizados.', details.statusKind || 'info');
  }

  function renderInitialEmptyState() {
    lastContextMeta = { validationStatus: 'MISSING', source: 'NONE' };
    renderEmptySkaState('INITIAL', {
      tableMessage: 'Selecione uma estrutura no Product Explorer e clique Sincronizar.',
      bannerMessage: 'Camada analítica do Product Structure Explorer. Fonte: SKA BOM Service / dseng.',
      statusMessage: 'Aguardando Product Explorer — selecione estrutura e clique Sincronizar.',
      statusKind: 'info',
      contextMeta: lastContextMeta
    });
  }


  function uiRoot() {
    return w.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = uiRoot();
    return root.querySelector ? root.querySelector('#' + id) : document.getElementById(id);
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatBuildPillLabel(b) {
    var m = String(b || '').match(/^bom(\d{8})([a-z])$/i);
    return m ? m[1].slice(-2) + m[2] : String(b || '');
  }

  function syncBuild() {
    try {
      w.__BOM_RUNTIME_BUILD__ = BUILD;
      w.__BOM_BUILD_ID__ = BUILD;
      w.BOM_BUILD_ID = BUILD;
      if (typeof w.APP_CONFIG !== 'undefined') {
        w.APP_CONFIG.BUILD = BUILD;
        w.APP_CONFIG.IMPORT_BUTTON_LABEL = 'Sincronizar com Product Explorer';
        w.APP_CONFIG.DATA_SOURCE = DATA_SOURCE;
      }
      var pills = uiRoot().querySelectorAll ? uiRoot().querySelectorAll('.bom-build-pill') : [];
      var manifest = w.__BOM_RELEASE_MANIFEST__;
      var pillTitle = BUILD;
      if (manifest) {
        pillTitle = 'Build ' + BUILD + '\nCommit ' + (manifest.commit || '?') + '\nHotfix ' + (manifest.hotfix || '?');
      }
      for (var i = 0; i < pills.length; i++) {
        pills[i].textContent = formatBuildPillLabel(BUILD);
        pills[i].title = pillTitle;
        pills[i].setAttribute('aria-label', 'Build ' + BUILD);
      }
      var tag = byId('buildTag');
      if (tag) tag.textContent = BUILD;
    } catch (e) {}
  }

  function setStatus(msg, kind) {
    if (!w.__BOM_DEBUG__) {
      if (/KpiCards\.render protegido|DEC-015 preservado|vers[aã]o divergente|bom20260614|bom20260615|bom20260616/i.test(String(msg || ''))) {
        return;
      }
      if (/Atualizar estrutura|clique Atualizar estrutura/i.test(String(msg || ''))) {
        msg = 'Build ' + BUILD + ' | SKA BOM Service — use Sincronizar com Product Explorer ou Avançado.';
        kind = kind === 'error' ? 'error' : 'ok';
      }
    }
    if (w.App && w.App.setStatus) w.App.setStatus(msg, kind);
    else {
      var el = byId('statusBar');
      if (el) {
        el.textContent = msg;
        el.className = 'bom-st' + (kind === 'ok' ? ' bom-st-ok' : kind === 'error' ? ' bom-st-err' : '');
      }
    }
  }

  function getSkaExpectedTotal(payload) {
    return Number(
      payload && payload.counts && payload.counts.totalRows != null
        ? payload.counts.totalRows
        : payload && payload.rows
        ? payload.rows.length
        : 0
    );
  }

  function mapErrorMessage(code, fallback) {
    var map = {
      UPSTREAM_NOT_CONFIGURED: 'SKA BOM Service não está configurado para dseng real no Render.',
      UPSTREAM_AUTH_FAILED: 'Falha de autenticação no 3DEXPERIENCE. Validar credenciais no Render.',
      UPSTREAM_AUTH_NOT_IMPLEMENTED: 'Modo de autenticação 3DEXPERIENCE não configurado explicitamente.',
      ROOT_NOT_FOUND: 'RootId não encontrado ou não acessível. Verifique se o item selecionado é um Engineering Item/Physical Product válido para dseng ou use Avançado.',
      UPSTREAM_DSENG_ERROR: 'Falha na chamada dseng. Ver detalhes técnicos abaixo.',
      INTERNAL_ERROR: 'Erro interno no SKA BOM Service.',
      ROOT_ID_REQUIRED: 'Informe o Root Physical ID.',
      INVALID_DEPTH: 'Profundidade inválida.',
      DEPTH_LIMIT_EXCEEDED: 'Profundidade acima do limite dseng v1.'
    };
    if (code === 'HTTP_0' || code === 'TypeError' || code === 'Failed to fetch') {
      return 'Falha de rede ou CORS ao chamar o SKA BOM Service.';
    }
    return map[code] || fallback || 'Falha ao carregar BOM via SKA BOM Service.';
  }

  function normalizeSkaError(err) {
    if (!err) {
      return { code: 'UNKNOWN_ERROR', message: 'Falha ao carregar BOM via SKA BOM Service.', payload: null };
    }
    var rawMessage = String(err.message || '');
    var rawName = String(err.name || '');
    var code = err.code || '';
    if (
      code === 'HTTP_0' ||
      rawName === 'TypeError' ||
      rawMessage.indexOf('Failed to fetch') >= 0 ||
      rawMessage.indexOf('NetworkError') >= 0
    ) {
      return {
        code: 'HTTP_0',
        message: 'Falha de rede ou CORS ao chamar o SKA BOM Service.',
        payload: err.payload || null
      };
    }
    return {
      code: code || 'UNKNOWN_ERROR',
      message: mapErrorMessage(code, rawMessage || 'Falha ao carregar BOM via SKA BOM Service.'),
      payload: err.payload || null
    };
  }

  function fetchBomStructureFromSkaService(opts) {
    opts = opts || {};
    return fetch(SKA_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rootId: opts.rootId,
        depth: opts.depth == null ? DEFAULT_DEPTH : opts.depth,
        includeRoot: opts.includeRoot !== false,
        mode: 'dseng-official'
      })
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch (e) {
          payload = null;
        }
        if (!response.ok || !payload || payload.ok === false) {
          var code =
            payload && payload.error && payload.error.code ? payload.error.code : 'HTTP_' + response.status;
          var message =
            payload && payload.error && payload.error.message
              ? payload.error.message
              : mapErrorMessage(code, 'Falha ao carregar BOM via SKA BOM Service.');
          var err = new Error(mapErrorMessage(code, message));
          err.code = code;
          err.status = response.status;
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    });
  }

  function mapSkaRowsToImportItems(rows) {
    return (rows || []).map(function (row, idx) {
      return {
        level: Number(row.level || 0),
        physicalid: row.physicalId || row.instanceId || row.rowKey || 'ska_' + idx,
        name: row.instanceName || row.name || row.title || 'Item ' + idx,
        title: row.title || row.name || row.instanceName || 'Item ' + idx,
        type: row.format || row.type || 'VPMReference',
        displayType: row.format || row.type || 'VPMReference',
        revision: row.revision || '',
        state: row.maturity || '',
        maturity: row.maturity || '',
        owner: row.owner || '',
        approval: 'Unknown',
        quantity: row.quantity || 1,
        sourcePhysicalId: row.physicalId || '',
        parentId: row.parentId || '',
        instanceName: row.instanceName || '',
        referenceId: row.physicalId || '',
        description: row.description || '',
        rowKey: row.rowKey || ''
      };
    });
  }

  function prepareSkaRowsForSnapshot(payload) {
    var items = mapSkaRowsToImportItems(payload && payload.rows ? payload.rows : []);
    items.forEach(function (it) {
      if (Number(it.level) === 0 && it.title) {
        it.name = it.title;
      }
    });
    return items;
  }

  function buildSkaSnapshotDirect(payload, items) {
    var rootName = (payload.root && payload.root.title) || (payload.root && payload.root.id) || 'E-BOM';
    return {
      version: 1,
      productName: rootName,
      exportedAt: new Date().toISOString(),
      rootPhysicalId: (payload.root && payload.root.id) || (items[0] && items[0].physicalid) || null,
      items: items,
      scrapeSource: DATA_SOURCE
    };
  }

  function clearStateBeforeSkaApply() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    if (w.ChartsManager && w.ChartsManager.destroyAll) w.ChartsManager.destroyAll();
    if (w.BomService && w.BomService.reset) w.BomService.reset();
    var clearBtn = byId('btnClearFilters');
    if (clearBtn) clearBtn.click();
    var tbody = byId('bomTable') && byId('bomTable').querySelector('tbody');
    if (tbody) tbody.innerHTML = '';
    var matLeg = byId('maturityLegendScroll');
    if (matLeg) matLeg.innerHTML = '';
    var ownLeg = byId('ownersLegendScroll');
    if (ownLeg) ownLeg.innerHTML = '';
    updateTablePager(0);
  }

  function updateTablePager(total) {
    var pager = byId('tablePager');
    if (pager) pager.textContent = total + ' peças';
  }

  function sumChartLegendValues(legendId) {
    var el = byId(legendId);
    if (!el) return null;
    var nums = [];
    el.querySelectorAll('[data-count]').forEach(function (node) {
      nums.push(Number(node.getAttribute('data-count') || 0));
    });
    if (nums.length) return nums.reduce(function (a, b) { return a + b; }, 0);
    var text = el.textContent || '';
    var matches = text.match(/\((\d+)\)/g);
    if (!matches) return null;
    return matches.reduce(function (sum, m) {
      return sum + Number(m.replace(/\D/g, '') || 0);
    }, 0);
  }

  function assertSkaCountIntegrity(payload) {
    var expected = getSkaExpectedTotal(payload);
    var issues = [];
    var tableCount = document.querySelectorAll('#bomTable tbody tr').length;
    if (tableCount !== expected) issues.push('Tabela=' + tableCount + ' esperado=' + expected);

    if (w.BomService && w.BomService.getNodeCount) {
      var nodes = w.BomService.getNodeCount();
      if (nodes !== expected) issues.push('BomService=' + nodes + ' esperado=' + expected);
    }

    var kpiText = byId('kpiGrid') ? byId('kpiGrid').textContent || '' : '';
    if (kpiText.indexOf('Total linhas') >= 0 && kpiText.indexOf(String(expected)) < 0) {
      issues.push('KPI Total linhas != ' + expected);
    }

    var matSum = sumChartLegendValues('maturityLegendScroll');
    if (matSum != null && matSum !== expected) issues.push('Gráfico maturidade=' + matSum + ' esperado=' + expected);
    var ownSum = sumChartLegendValues('ownersLegendScroll');
    if (ownSum != null && ownSum !== expected) issues.push('Gráfico proprietários=' + ownSum + ' esperado=' + expected);

    if (issues.length) {
      renderSkaDiagnostics({
        source: 'RENDER_BOM_SERVICE',
        mode: 'dseng-official',
        diagnostics: { status: 'COUNT_MISMATCH', warnings: issues, errors: [], durationMs: 0, endpointsUsed: [] }
      });
      setStatus('Inconsistência de contagem SKA BOM Service: ' + issues.join(' · '), 'error');
      return false;
    }
    return true;
  }

  function renderSkaDiagnostics(payload, expanded) {
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var diag = (payload && payload.diagnostics) || {};
    var status = diag.status || 'OK';
    var durationMs = diag.durationMs != null ? diag.durationMs : 0;
    var expected = getSkaExpectedTotal(payload);
    var endpoints = (diag.endpointsUsed || [])
      .map(function (ep) {
        return (ep.method || 'GET') + ' ' + (ep.endpoint || '?') + ' (' + (ep.status || '?') + ')';
      })
      .join('; ');
    var warnings = (diag.warnings || []).join(' · ');
    var errors = (diag.errors || []).join(' · ');
    var syncMeta = payload.__skaSyncMeta || {};
    var bridgeDiag =
      w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getBridgeDiagnosticStatus
        ? w.ProductExplorerSyncProvider.getBridgeDiagnosticStatus()
        : '';
    var summary =
      status === 'OK'
        ? 'SKA OK · ' + expected + ' itens' + (durationMs ? ' · ' + durationMs + ' ms' : '')
        : 'SKA ERRO · ' + expected + ' itens';

    panel.classList.remove('bom-hidden');
    panel.classList.add('bom-ska-diagnostics');
    panel.classList.toggle('bom-ska-diag-expanded', !!expanded);
    panel.innerHTML =
      '<div class="bom-ska-diag-head">' +
      '<span class="bom-ska-diag-summary">' +
      escapeHtml(summary) +
      '</span> ' +
      '<button type="button" class="bom-btn bom-btn-compact bom-ska-diag-toggle">' +
      (expanded ? 'Ocultar' : 'Detalhes') +
      '</button></div>' +
      '<div class="bom-ska-diag-details">' +
      'source: ' +
      escapeHtml(payload.source || syncMeta.source || 'RENDER_BOM_SERVICE') +
      ' · mode: ' +
      escapeHtml(payload.mode || 'dseng-official') +
      (syncMeta.eventType ? '<br/>eventType: ' + escapeHtml(syncMeta.eventType) : '') +
      (syncMeta.rootId ? '<br/>rootId: ' + escapeHtml(syncMeta.rootId) : '') +
      (syncMeta.lastSyncAt ? '<br/>lastSyncAt: ' + escapeHtml(syncMeta.lastSyncAt) : '') +
      '<br/>service: SKA_BOM_SERVICE' +
      '<br/>endpointsUsed: ' +
      escapeHtml(endpoints || '(none)') +
      (warnings ? '<br/>warnings: ' + escapeHtml(warnings) : '') +
      (errors ? '<br/>errors: ' + escapeHtml(errors) : '') +
      (bridgeDiag ? '<br/>bridge: ' + escapeHtml(bridgeDiag) : '') +
      '</div>';

    var toggle = panel.querySelector('.bom-ska-diag-toggle');
    if (toggle) {
      toggle.addEventListener('click', function (ev) {
        if (ev) ev.preventDefault();
        renderSkaDiagnostics(payload, !panel.classList.contains('bom-ska-diag-expanded'));
      });
    }
  }

  function renderSkaKpiSummary(payload) {
    var grid = byId('kpiGrid');
    if (!grid || !payload) return;
    var counts = payload.counts || {};
    var expected = getSkaExpectedTotal(payload);
    var level1 = (counts.levelCounts && counts.levelCounts['1']) || 0;
    var markers = [
      { tone: 'blue', label: 'Root', value: (payload.root && payload.root.title) || (payload.root && payload.root.id) || '-' },
      { tone: 'green', label: 'Total linhas', value: expected },
      { tone: 'purple', label: 'Profundidade', value: counts.depth != null ? counts.depth : DEFAULT_DEPTH },
      { tone: 'red', label: 'Nível 1', value: level1 },
      { tone: 'blue', label: 'Status', value: (payload.diagnostics && payload.diagnostics.status) || 'OK' },
      { tone: 'green', label: 'Fonte', value: 'SKA BOM' }
    ];
    grid.innerHTML = markers
      .map(function (m) {
        return (
          '<div class="stat-marker stat-marker-' +
          m.tone +
          '"><span class="stat-marker-label">' +
          escapeHtml(String(m.label)) +
          '</span><span class="stat-marker-value">' +
          escapeHtml(String(m.value)) +
          '</span></div>'
        );
      })
      .join('');
  }

  function updateSyncBanner(payload) {
    var banner = byId('syncBanner');
    if (!banner) return;
    var expected = getSkaExpectedTotal(payload);
    banner.classList.remove('bom-hidden');
    banner.innerHTML =
      'Fonte: <strong>SKA BOM Service</strong> / dseng · Root: <strong>' +
      escapeHtml((payload.root && payload.root.title) || '') +
      '</strong> · linhas: <strong>' +
      escapeHtml(String(expected)) +
      '</strong>.';
  }

  function finalizeSkaUi(payload) {
    var rootName = (payload.root && payload.root.title) || (payload.root && payload.root.id) || 'E-BOM';
    var expected = getSkaExpectedTotal(payload);
    var chartsSection = byId('chartsSection');
    if (chartsSection) chartsSection.classList.remove('bom-charts-empty-state');
    var lbl = byId('selectionLabel');
    if (lbl) lbl.textContent = rootName;
    var tableLbl = byId('tableProductLabel');
    if (tableLbl) tableLbl.textContent = rootName;
    updateTablePager(expected);
    renderSkaKpiSummary(payload);
    renderSkaDiagnostics(payload, false);
    updateSyncBanner(payload);
    syncBuild();
    patchUiLabels();
    if (!assertSkaCountIntegrity(payload)) return false;
    var syncNote =
      payload.__skaSyncMeta && payload.__skaSyncMeta.source === 'PRODUCT_EXPLORER_CONTEXT'
        ? 'Sincronizado com Product Explorer'
        : 'SKA BOM Service validado';
    setStatus(
      syncNote + ': ' + expected + ' linhas · ' + rootName + ' · diagnostics OK',
      'ok'
    );
    return true;
  }

  function applySkaPayloadToUI(payload) {
    var items = prepareSkaRowsForSnapshot(payload);
    var expected = getSkaExpectedTotal(payload);
    if (!items.length) {
      return Promise.reject(new Error('SKA BOM Service retornou 0 linhas.'));
    }
    if (items.length !== expected) {
      return Promise.reject(
        new Error('SKA rows (' + items.length + ') != counts.totalRows (' + expected + ').')
      );
    }

    if (typeof w.APP_CONFIG !== 'undefined') {
      w.APP_CONFIG.IMPORT_MODE = true;
      w.APP_CONFIG.DEMO_MODE = false;
      w.APP_CONFIG.DATA_SOURCE = DATA_SOURCE;
      w.APP_CONFIG.BUILD = BUILD;
    }

    clearStateBeforeSkaApply();
    w.__BOM_SKA_EMPTY_STATE__ = false;
    w.__bomSkaLastPayload = payload;

    if (!(w.BomSnapshot && w.BomSnapshot.applyPayload)) {
      return Promise.reject(new Error('Pipeline de importação indisponível (BomSnapshot).'));
    }

    var snap = buildSkaSnapshotDirect(payload, items);
    return w.BomSnapshot.applyPayload(snap).then(function () {
      if (w.App && w.App.refreshUI) w.App.refreshUI();
      if (!finalizeSkaUi(payload)) {
        return Promise.reject(new Error('COUNT_MISMATCH'));
      }
      return payload;
    });
  }

  function updateExplorerContextStatus(ctx) {
    var el = byId('explorerContextStatus');
    if (!el) return;
    ctx = ctx || (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext()) || {};
    if (ctx.rootId && ctx.title && isValidDsengPhysicalId(ctx.rootId)) {
      el.textContent = 'Contexto detectado';
      el.title = ctx.title;
      el.className = 'bom-explorer-context-status bom-explorer-context-ok';
    } else if (ctx.rootId || ctx.title) {
      el.textContent = 'Contexto sem rootId dseng válido';
      el.title = ctx.title || ctx.rootId || '';
      el.className = 'bom-explorer-context-status bom-explorer-context-warn';
    } else if (ctx.path === 'C') {
      el.textContent = 'Contexto indisponível';
      el.title = ctx.message || 'Contexto Product Explorer indisponível — modo avançado';
      el.className = 'bom-explorer-context-status bom-explorer-context-warn';
    } else {
      el.textContent = 'Aguardando Product Explorer';
      el.className = 'bom-explorer-context-status';
    }
    var adv = byId('explorerObjectId');
    if (adv && ctx.rootId && !s(adv.value)) adv.value = ctx.rootId;
  }

  function getDepthFromInput() {
    var el = byId('skaDepthInput');
    var d = el ? Number(el.value) : DEFAULT_DEPTH;
    return isFinite(d) && d > 0 ? d : DEFAULT_DEPTH;
  }

  function resolveSyncParams(opts) {
    opts = opts || {};
    var ctx =
      (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext && w.ProductExplorerSyncProvider.getContext()) ||
      {};
    var manual = opts.forceManual ? s(byId('explorerObjectId') && byId('explorerObjectId').value) : '';
    if (!manual && opts.advancedOnly) manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
    var norm = normalizeCandidateRootId(ctx, manual);
    if (!norm.ok && !manual && lastSyncRootId && isValidDsengPhysicalId(lastSyncRootId)) {
      norm = normalizeCandidateRootId({}, lastSyncRootId);
      norm.source = 'LAST_SYNC';
    }
    lastContextMeta = {
      source: norm.source,
      title: norm.title,
      candidateRootId: norm.candidateRootId,
      rootIdUsed: norm.rootId,
      validationStatus: norm.validationStatus,
      reason: norm.reason
    };
    return {
      rootId: norm.ok ? norm.rootId : '',
      depth: getDepthFromInput(),
      title: norm.title || lastSyncTitle,
      source: norm.source,
      validation: norm
    };
  }

  function loadBomViaSkaService(opts) {
    opts = opts || {};
    var params = resolveSyncParams(opts);
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    if (!params.rootId || !params.validation || !params.validation.ok) {
      var invMsg =
        params.validation && params.validation.validationStatus === 'INVALID'
          ? 'Contexto detectado, mas sem Root Physical ID dseng válido. Use Avançado ou selecione um Engineering Item.'
          : 'Contexto Product Explorer indisponível. Informe Root Physical ID em Avançado.';
      renderEmptySkaState('CONTEXT_INVALID', {
        contextMeta: lastContextMeta,
        title: params.title,
        statusMessage: invMsg,
        statusKind: 'error',
        tableMessage: invMsg
      });
      if (syncBtn) syncBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
      return Promise.reject(new Error('CONTEXT_INVALID'));
    }

    clearStateBeforeSkaApply();
    w.__BOM_SKA_EMPTY_STATE__ = false;

    if (!opts.silent) {
      setStatus('Sincronizando via SKA BOM Service…', 'info');
    }
    updateExplorerContextStatus(w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext());

    return fetchBomStructureFromSkaService({
      rootId: params.rootId,
      depth: params.depth,
      includeRoot: true
    })
      .then(function (payload) {
        lastSyncRootId = params.rootId;
        lastSyncDepth = params.depth;
        lastSyncTitle = (payload.root && payload.root.title) || params.title || '';
        payload.__skaSyncMeta = {
          source: params.source,
          eventType:
            (w.ProductExplorerSyncProvider &&
              w.ProductExplorerSyncProvider.getContext() &&
              w.ProductExplorerSyncProvider.getContext().eventType) ||
            'manual-sync',
          rootId: params.rootId,
          depth: params.depth,
          lastSyncAt: new Date().toISOString(),
          validationStatus: 'VALID'
        };
        lastContextMeta = {
          source: params.source,
          title: lastSyncTitle,
          candidateRootId: params.rootId,
          rootIdUsed: params.rootId,
          validationStatus: 'VALID'
        };
        return applySkaPayloadToUI(payload);
      })
      .catch(function (err) {
        var normalized = normalizeSkaError(err);
        var code = normalized.code || '';
        renderEmptySkaState(code === 'ROOT_NOT_FOUND' ? 'ROOT_NOT_FOUND' : 'ERROR', {
          contextMeta: lastContextMeta,
          errorCode: code,
          statusMessage: normalized.message,
          statusKind: 'error',
          tableMessage: normalized.message
        });
        return Promise.reject(err);
      })
      .then(function (result) {
        if (syncBtn) syncBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
        return result;
      }, function (err) {
        if (syncBtn) syncBtn.disabled = false;
        if (refreshBtn) refreshBtn.disabled = false;
        throw err;
      });
  }

  function syncWithProductExplorer(opts) {
    opts = opts || {};
    if (!w.ProductExplorerSyncProvider || !w.ProductExplorerSyncProvider.refresh) {
      return loadBomViaSkaService(opts);
    }
    return w.ProductExplorerSyncProvider.refresh('manual-sync').then(function (ctx) {
      updateExplorerContextStatus(ctx);
      var manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
      var norm = normalizeCandidateRootId(ctx, manual);
      lastContextMeta = {
        source: norm.source,
        title: norm.title,
        candidateRootId: norm.candidateRootId,
        rootIdUsed: norm.rootId,
        validationStatus: norm.validationStatus,
        reason: norm.reason
      };
      if (!norm.ok && !manual) {
        renderEmptySkaState('CONTEXT_INVALID', {
          contextMeta: lastContextMeta,
          title: norm.title,
          statusMessage:
            norm.validationStatus === 'INVALID'
              ? 'Contexto detectado, mas sem Root Physical ID dseng válido. Use Avançado.'
              : 'Contexto Product Explorer indisponível. Use Avançado ou selecione item no Explorer.',
          statusKind: 'error'
        });
        return Promise.reject(new Error('EXPLORER_CONTEXT_UNAVAILABLE'));
      }
      return loadBomViaSkaService(opts);
    });
  }

  function refreshBom() {
    if (!lastSyncRootId) {
      return syncWithProductExplorer();
    }
    var adv = byId('explorerObjectId');
    if (adv && !s(adv.value)) adv.value = lastSyncRootId;
    return loadBomViaSkaService();
  }

  w.loadViaExplorerSync = syncWithProductExplorer;
  w.refreshBomFromSka = refreshBom;
  w.loadViaSkaService = syncWithProductExplorer;


  function applyTopbarCompactLabels() {
    var root = uiRoot();
    var compact = root && root.clientWidth ? root.clientWidth < 980 : false;
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    var badge = byId('explorerSourceBadge');
    if (syncBtn) {
      syncBtn.textContent = compact ? 'Sincronizar' : 'Sincronizar com Product Explorer';
      syncBtn.title = 'Sincronizar com Product Explorer';
      syncBtn.setAttribute('aria-label', 'Sincronizar com Product Explorer');
    }
    if (refreshBtn) {
      refreshBtn.textContent = compact ? 'Atualizar' : 'Atualizar BOM';
      refreshBtn.title = 'Atualizar BOM';
    }
    if (badge) {
      badge.textContent = compact ? 'SKA/dseng' : 'Fonte: SKA BOM Service / dseng';
    }
  }

  function bindTestRootButton() {
    var btn = byId('btnTestRootId');
    if (!btn || btn.__BOM_TEST_ROOT_BOUND__) return;
    btn.__BOM_TEST_ROOT_BOUND__ = true;
    btn.addEventListener('click', function (ev) {
      if (ev) ev.preventDefault();
      loadBomViaSkaService({ forceManual: true, advancedOnly: true }).catch(function () {});
    });
  }

  function ensureSyncExplorerButton() {
    var syncBtn = byId('btnSyncExplorer');
    if (syncBtn) {
      syncBtn.classList.remove('bom-hidden');
      return syncBtn;
    }
    var refreshBtn = byId('btnRefreshBom');
    if (!refreshBtn || !refreshBtn.parentNode) return null;
    syncBtn = document.createElement('button');
    syncBtn.type = 'button';
    syncBtn.id = 'btnSyncExplorer';
    syncBtn.className = 'bom-btn bom-btn-primary';
    syncBtn.textContent = 'Sincronizar com Product Explorer';
    refreshBtn.parentNode.insertBefore(syncBtn, refreshBtn);
    return syncBtn;
  }

  function patchUiLabels() {
    ensureSyncExplorerButton();
    var syncBtn = byId('btnSyncExplorer');
    if (syncBtn && syncBtn.textContent.indexOf('Sincronizar') < 0) {
      syncBtn.textContent = 'Sincronizar com Product Explorer';
    }
    var refreshBtn = byId('btnRefreshBom');
    if (refreshBtn) refreshBtn.textContent = 'Atualizar BOM';
    var badge = byId('explorerSourceBadge');
    if (badge) badge.textContent = 'Fonte: SKA BOM Service / dseng';
    var idEl = byId('explorerObjectId');
    if (idEl) {
      idEl.placeholder = 'Root Physical ID (Avançado)';
      idEl.setAttribute('aria-label', 'Root Physical ID');
      idEl.setAttribute('title', 'Root Physical ID — fallback Avançado');
    }
    var depthEl = byId('skaDepthInput');
    if (depthEl && !s(depthEl.value)) depthEl.value = String(DEFAULT_DEPTH);
    var banner = byId('syncBanner');
    if (banner && !w.__bomSkaLastPayload) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML =
        'Camada analítica do <strong>Product Structure Explorer</strong>. Fonte de dados: <strong>SKA BOM Service</strong> / dseng.';
    }
    updateExplorerContextStatus(
      w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext && w.ProductExplorerSyncProvider.getContext()
    );
    applyTopbarCompactLabels();
    bindTestRootButton();
  }

  function bindSyncButtons() {
    var syncBtn = byId('btnSyncExplorer');
    if (syncBtn && !syncBtn.__BOM_SKA_SYNC_BOUND__) {
      syncBtn.__BOM_SKA_SYNC_BOUND__ = true;
      syncBtn.addEventListener(
        'click',
        function (ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          }
          syncWithProductExplorer().catch(function () {});
        },
        true
      );
    }
    var refreshBtn = byId('btnRefreshBom');
    if (refreshBtn && !refreshBtn.__BOM_SKA_REFRESH_BOUND__) {
      refreshBtn.__BOM_SKA_REFRESH_BOUND__ = true;
      refreshBtn.addEventListener(
        'click',
        function (ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          }
          refreshBom().catch(function () {});
        },
        true
      );
    }
  }

  function patchOrchestrator() {
    if (!w.BomOrchestrator || !w.BomOrchestrator.refreshStructure) return;
    w.BomOrchestrator.refreshStructure = function () {
      return syncWithProductExplorer();
    };
  }

  function patchScanner() {
    if (!w.ExplorerScanner || !w.ExplorerScanner.scan) return;
    w.ExplorerScanner.scan = function () {
      return syncWithProductExplorer();
    };
  }

  function patchAppHooks() {
    if (w.App && w.App.setStatus && !w.App.__BOM_SKA_STATUS_PATCHED__) {
      var origStatus = w.App.setStatus;
      w.App.setStatus = function (msg, kind) {
        if (!w.__BOM_DEBUG__ && /KpiCards\.render protegido|DEC-015|vers[aã]o divergente|bom20260614|bom20260615|bom20260616/i.test(String(msg || ''))) {
          return;
        }
        if (!w.__BOM_DEBUG__ && /Atualizar estrutura|clique Atualizar estrutura/i.test(String(msg || ''))) {
          msg = 'Build ' + BUILD + ' | SKA BOM Service — use Sincronizar com Product Explorer ou Avançado.';
          kind = kind === 'error' ? 'error' : 'ok';
        }
        return origStatus.call(this, msg, kind);
      };
      w.App.__BOM_SKA_STATUS_PATCHED__ = true;
    }

    if (w.App && w.App.refreshUI && !w.App.__BOM_SKA_REFRESH_PATCHED__) {
      var origRefresh = w.App.refreshUI;
      w.App.refreshUI = function () {
        if (w.__BOM_SKA_REFRESH_UI_LOCK__) {
          return origRefresh.apply(this, arguments);
        }
        w.__BOM_SKA_REFRESH_UI_LOCK__ = true;
        try {
          var out = origRefresh.apply(this, arguments);
          if (w.__BOM_SKA_EMPTY_STATE__ || !w.__bomSkaLastPayload) {
            renderEmptyKpiPlaceholders();
            renderEmptyChartsState();
            patchUiLabels();
          } else if (w.__bomSkaLastPayload && w.__BOM_DATA_SOURCE__ === DATA_SOURCE) {
            finalizeSkaUi(w.__bomSkaLastPayload);
          } else {
            syncBuild();
            patchUiLabels();
          }
          return out;
        } finally {
          w.__BOM_SKA_REFRESH_UI_LOCK__ = false;
        }
      };
      w.App.__BOM_SKA_REFRESH_PATCHED__ = true;
    }

    if (w.KpiCards && w.KpiCards.render && !w.KpiCards.__SKA_PATCHED__) {
      var origKpi = w.KpiCards.render;
      w.KpiCards.render = function () {
        if (w.__BOM_SKA_EMPTY_STATE__ || !w.__bomSkaLastPayload) {
          renderEmptyKpiPlaceholders();
          return;
        }
        if (w.__bomSkaLastPayload && w.__BOM_DATA_SOURCE__ === DATA_SOURCE) {
          renderSkaKpiSummary(w.__bomSkaLastPayload);
          return;
        }
        return origKpi.apply(this, arguments);
      };
      w.KpiCards.__SKA_PATCHED__ = true;
    }

    if (w.ChartsManager && w.ChartsManager.render && !w.ChartsManager.__SKA_PATCHED__) {
      var origCharts = w.ChartsManager.render;
      w.ChartsManager.render = function () {
        if (w.__BOM_SKA_EMPTY_STATE__ || !w.__bomSkaLastPayload) {
          renderEmptyChartsState();
          return;
        }
        if (w.__bomSkaLastPayload && w.__BOM_DATA_SOURCE__ === DATA_SOURCE) {
          var chartsSection = byId('chartsSection');
          if (chartsSection) chartsSection.classList.remove('bom-charts-empty-state');
          return origCharts.apply(this, arguments);
        }
        return origCharts.apply(this, arguments);
      };
      w.ChartsManager.__SKA_PATCHED__ = true;
    }

    if (w.App) {
      w.App.rebindImportButton = function () {
        bindSyncButtons();
        patchUiLabels();
      };
    }
  }

  function disableLegacyOperationalBlockers() {
    try {
      if (typeof w.APP_CONFIG !== 'undefined') {
        w.APP_CONFIG.ALLOW_PASTE_FALLBACK = false;
        w.APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = false;
        w.APP_CONFIG.PASTE_TRAP_ENABLED = false;
        w.APP_CONFIG.DATA_SOURCE = DATA_SOURCE;
        w.APP_CONFIG.PRIMARY_LOADER = DATA_SOURCE;
        w.APP_CONFIG.BUILD = BUILD;
        w.APP_CONFIG.IMPORT_BUTTON_LABEL = 'Sincronizar com Product Explorer';
      }
      w.__BOM_MIRROR_EXPLORER_MODE__ = false;
      w.__BOM_CLIPBOARD_RUNTIME_DISABLED__ = true;
      var expandPanel = byId('expandItemValidationPanel');
      if (expandPanel) {
        expandPanel.classList.add('bom-hidden');
        expandPanel.innerHTML = '';
      }
    } catch (e) {}
  }

  function installLabelGuard() {
    var root = uiRoot();
    if (!root || root.__BOM_SKA_MO__ || typeof MutationObserver === 'undefined') return;
    var debounceTimer = null;
    var obs = new MutationObserver(function () {
      if (guardLock) return;
      if (debounceTimer) return;
      debounceTimer = setTimeout(function () {
        debounceTimer = null;
        if (guardLock) return;
        guardLock = true;
        try {
          patchUiLabels();
          bindSyncButtons();
          var legacy = byId('btnImportPaste');
          if (legacy && legacy.textContent.indexOf('Atualizar estrutura') >= 0) {
            legacy.classList.add('bom-hidden');
          }
          var pill = root.querySelector ? root.querySelector('.bom-build-pill') : null;
          if (pill && pill.textContent !== formatBuildPillLabel(BUILD)) {
            syncBuild();
          }
        } finally {
          guardLock = false;
        }
      }, 120);
    });
    obs.observe(root, { subtree: true, childList: true });
    root.__BOM_SKA_MO__ = obs;
  }

  function installResponsiveMode() {
    var root = uiRoot();
    if (!root || !w.ResizeObserver) return;
    if (root.__BOM_SKA_RO__) return;
    var ro = new w.ResizeObserver(function (entries) {
      var rect = entries[0].contentRect;
      root.classList.toggle('bom-compact', rect.width < 1150);
      root.classList.toggle('bom-ultra-compact', rect.width < 900);
      root.classList.toggle('bom-short', rect.height < 650);
      applyTopbarCompactLabels();
    });
    ro.observe(root);
    root.__BOM_SKA_RO__ = ro;
  }

  function installExplorerSync() {
    if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.install) {
      w.ProductExplorerSyncProvider.subscribe(function (ctx) {
        updateExplorerContextStatus(ctx);
      });
      w.ProductExplorerSyncProvider.install({ autoSync: w.__BOM_EXPLORER_AUTO_SYNC__ === true });
    }
  }

  function install() {
    syncBuild();
    disableLegacyOperationalBlockers();
    patchAppHooks();
    installExplorerSync();
    patchUiLabels();
    bindSyncButtons();
    patchOrchestrator();
    patchScanner();
    installResponsiveMode();
    installLabelGuard();
    setTimeout(bindSyncButtons, 400);
    setTimeout(function () {
      syncBuild();
      bindSyncButtons();
      patchUiLabels();
      if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.refresh) {
        w.ProductExplorerSyncProvider.refresh('post-boot');
      }
    }, 1500);
    renderInitialEmptyState();
    applyTopbarCompactLabels();
    bindTestRootButton();
    setStatus('Build ' + BUILD + ' | SKA BOM Service', 'ok');
  }

  w.__bomSkaServiceInstall = install;
  w.fetchBomStructureFromSkaService = fetchBomStructureFromSkaService;
  w.mapSkaRowsToImportItems = mapSkaRowsToImportItems;
  w.prepareSkaRowsForSnapshot = prepareSkaRowsForSnapshot;
  w.getSkaExpectedTotal = getSkaExpectedTotal;
  w.loadViaSkaService = syncWithProductExplorer;
  w.syncWithProductExplorer = syncWithProductExplorer;
  w.refreshBomFromSka = refreshBom;
  w.assertSkaCountIntegrity = assertSkaCountIntegrity;
  w.normalizeCandidateRootId = normalizeCandidateRootId;
  w.renderEmptySkaState = renderEmptySkaState;

  /* install deferred — runtime calls __bomSkaServiceInstall */
})();
