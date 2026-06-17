/* PR #23 — Product Explorer selection resolver via backend (ES5) */
(function () {
  'use strict';

  var w = window;
  var BUILD = 'bom20260617d';
  var SKA_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure';
  var RESOLVE_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection';
  var DATA_SOURCE = 'ska-bom-service';
  var DEFAULT_DEPTH = 1;
  var SESSION_KEY = '3dx_bom_snapshot_v1';
  var guardLock = false;
  var lastSyncRootId = '';
  var lastSyncDepth = DEFAULT_DEPTH;
  var lastSyncTitle = '';
  var dynamicState = {
    lastResolvedRootId: '',
    lastSelection: null,
    lastResolution: null,
    lastEndpoint: '',
    lastDepth: DEFAULT_DEPTH,
    lastRows: [],
    lastCounts: null,
    expandedNodeIds: {},
    loadedNodeIds: {},
    loadingNodeIds: {},
    loadMode: 'initial',
    partial: true,
    maxLoadedLevel: 0,
    lastError: ''
  };
  var RIGHT_PANEL_KEY = 'bomAnalyticsRightPanel';
  var rightPanelPreference = null;

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

  function safeStorageGet(key) {
    try {
      return w.localStorage ? w.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (w.localStorage) w.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function normalizeLoadMode(mode) {
    mode = s(mode || '').toLowerCase();
    if (!mode || mode === 'initial' || mode === 'fallback' || mode.indexOf('depth-') === 0) return 'root';
    if (mode === 'incremental') return 'dashboard-row';
    if (mode === 'next-level-global') return 'global';
    if (mode === 'manual-root' || mode === 'advanced') return 'root';
    return mode;
  }

  function shortSelectionSource(source) {
    source = s(source);
    if (!source) return 'fallback';
    if (/DS\/Selection/i.test(source)) return 'DS/Selection';
    if (/PlatformAPI/i.test(source)) return 'PlatformAPI';
    if (/ExplorerContext|EXPLORER_CONTEXT/i.test(source)) return 'ExplorerContext';
    if (/ADVANCED_MANUAL/i.test(source)) return 'Avancado';
    if (/PRODUCT_EXPLORER_CONTEXT/i.test(source)) return 'ProductExplorer';
    return source;
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
    grid.innerHTML = '';
    grid.style.display = 'none';
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

  function renderContextDiagnostics(meta, reason) {
    meta = meta || lastContextMeta || {};
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var summary = reason === 'INITIAL'
      ? 'Aguardando sincronização'
      : reason === 'CONTEXT_INVALID'
      ? 'Contexto indisponível'
      : reason === 'ROOT_NOT_FOUND'
      ? 'SKA ERRO · 0 itens'
      : 'SKA ERRO · 0 itens';
    var detail =
      'contextSource=' +
      (meta.source || '-') +
      ' | selectedTitle=' +
      (meta.title || '-') +
      ' | candidateRootId=' +
      (meta.candidateRootId || '-') +
      ' | rootIdUsed=' +
      (meta.rootIdUsed || meta.rootId || '-') +
      ' | validationStatus=' +
      (meta.validationStatus || reason || '-');
    panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.title = detail;
    panel.innerHTML =
      '<span class="bom-ska-diag-summary">' +
      escapeHtml(summary + ' · ' + (meta.validationStatus || reason || '')) +
      '</span>';
  }

  function renderContextDiagnostics(meta, reason) {
    meta = meta || lastContextMeta || {};
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.add('bom-hidden');
      banner.innerHTML = '';
    }
    var mode = normalizeLoadMode(meta.payloadMode || dynamicState.loadMode || 'root');
    var source = shortSelectionSource(meta.selectionSource || meta.source || '');
    var item = meta.title || meta.selectedItemLabel || '-';
    var status = meta.validationStatus || reason || 'MISSING';
    var summary =
      reason === 'INITIAL'
        ? 'Fonte: dseng · modo: ' + mode + ' · source: ' + source + ' · item: ' + item + ' · linhas: 0 · aguardando sincronizacao'
        : 'Fonte: dseng · modo: ' + mode + ' · source: ' + source + ' · item: ' + item + ' · linhas: 0 · ' + status;
    if ((reason === 'CONTEXT_INVALID' || status === 'MISSING' || status === 'INVALID') && source !== 'DS/Selection' && source !== 'PlatformAPI') {
      summary += ' · selecao PSE nao disponivel por API oficial';
    }
    panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.title =
      'contextSource=' +
      (meta.source || '-') +
      ' | payloadMode=' +
      mode +
      ' | selectionSource=' +
      (meta.selectionSource || '-') +
      ' | selectedTitle=' +
      (meta.title || '-') +
      ' | candidateRootId=' +
      (meta.candidateRootId || '-') +
      ' | rootIdUsed=' +
      (meta.rootIdUsed || meta.rootId || '-') +
      ' | validationStatus=' +
      status;
    panel.innerHTML = '<span class="bom-ska-diag-summary">' + escapeHtml(summary) + '</span>';
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
        'Selecione uma estrutura no Product Explorer e clique Sincronizar.'
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

  function cloneRow(row) {
    var out = {};
    row = row || {};
    Object.keys(row).forEach(function (key) {
      out[key] = row[key];
    });
    return out;
  }

  function rowNodeId(row) {
    return s(row && (row.physicalId || row.referenceId || row.sourcePhysicalId || row.rowKey || row.instanceId));
  }

  function rowUniqueKey(row) {
    row = row || {};
    return s(row.rowKey) || [row.parentId || '', row.instanceId || '', row.physicalId || row.referenceId || ''].join('|');
  }

  function rebuildDynamicCounts(rows, includeRoot, depth) {
    var levelCounts = {};
    (rows || []).forEach(function (row) {
      var level = Number(row.level || 0);
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    return {
      totalRows: (rows || []).length,
      rootIncluded: includeRoot !== false,
      depth: depth,
      levelCounts: levelCounts,
      partial: true
    };
  }

  function maxLoadedLevel(rows) {
    var max = 0;
    (rows || []).forEach(function (row) {
      var level = Number(row.level || 0);
      if (level > max) max = level;
    });
    return max;
  }

  function decorateDynamicRows(rows) {
    return (rows || []).map(function (row, idx) {
      var out = cloneRow(row);
      var id = rowNodeId(out);
      var loaded = !!dynamicState.loadedNodeIds[id];
      out.__loadedChildren = loaded;
      out.__expanded = !!dynamicState.expandedNodeIds[id];
      out.__loadMode = dynamicState.loadMode;
      out.rowKey = out.rowKey || 'ska-dyn:' + idx + ':' + (out.parentId || 'root') + ':' + (out.instanceId || '') + ':' + (out.physicalId || '');
      return out;
    });
  }

  function replaceDynamicPayload(payload, rows, mode) {
    payload = payload || {};
    rows = decorateDynamicRows(rows || []);
    payload.rows = rows;
    payload.counts = rebuildDynamicCounts(rows, true, maxLoadedLevel(rows));
    payload.__skaDynamicState = {
      loadMode: mode || dynamicState.loadMode || 'incremental',
      partial: true,
      strategy: payload.strategy || (payload.__skaDynamicState && payload.__skaDynamicState.strategy) || 'expand-item',
      expandedCount: Object.keys(dynamicState.expandedNodeIds).length,
      loadedCount: Object.keys(dynamicState.loadedNodeIds).length,
      maxLoadedLevel: payload.counts.depth
    };
    dynamicState.lastRows = rows.map(cloneRow);
    dynamicState.lastCounts = payload.counts;
    dynamicState.maxLoadedLevel = payload.counts.depth;
    dynamicState.loadMode = payload.__skaDynamicState.loadMode;
    return payload;
  }

  function resetDynamicState(payload, mode, selection) {
    var rows = (payload && payload.rows) || [];
    var depth = Number(payload && payload.counts && payload.counts.depth != null ? payload.counts.depth : DEFAULT_DEPTH);
    dynamicState.lastResolvedRootId = s((payload && payload.root && payload.root.id) || '');
    dynamicState.lastSelection = selection || dynamicState.lastSelection || null;
    dynamicState.lastResolution = (payload && payload.resolution) || dynamicState.lastResolution || null;
    dynamicState.lastEndpoint = payload && payload.resolution ? '/resolve-selection' : '/structure';
    dynamicState.lastDepth = depth;
    dynamicState.lastRows = rows.map(cloneRow);
    dynamicState.lastCounts = payload && payload.counts ? payload.counts : null;
    dynamicState.expandedNodeIds = {};
    dynamicState.loadedNodeIds = {};
    dynamicState.loadingNodeIds = {};
    dynamicState.loadMode = mode || 'initial';
    dynamicState.partial = true;
    dynamicState.maxLoadedLevel = maxLoadedLevel(rows);
    dynamicState.lastError = '';
    rows.forEach(function (row) {
      var id = rowNodeId(row);
      var level = Number(row.level || 0);
      if (!id) return;
      if (level < depth) {
        dynamicState.loadedNodeIds[id] = true;
        dynamicState.expandedNodeIds[id] = true;
      }
    });
    if (dynamicState.lastResolvedRootId && depth >= 1) {
      dynamicState.loadedNodeIds[dynamicState.lastResolvedRootId] = true;
      dynamicState.expandedNodeIds[dynamicState.lastResolvedRootId] = true;
    }
    return replaceDynamicPayload(payload, rows, mode || 'initial');
  }

  function findDynamicRowById(id) {
    id = s(id);
    var rows = dynamicState.lastRows || [];
    for (var i = 0; i < rows.length; i++) {
      if (rowNodeId(rows[i]) === id || s(rows[i].physicalId) === id || s(rows[i].rowKey) === id) return rows[i];
    }
    return null;
  }

  function findInsertIndex(rows, parentIndex, parentLevel) {
    var idx = parentIndex + 1;
    while (idx < rows.length && Number(rows[idx].level || 0) > parentLevel) idx++;
    return idx;
  }

  function mergeChildRows(parentRow, childPayload) {
    var rows = (dynamicState.lastRows || []).map(cloneRow);
    var parentId = rowNodeId(parentRow);
    var parentIndex = -1;
    var parentLevel = Number(parentRow && parentRow.level || 0);
    var seen = {};
    rows.forEach(function (row) {
      seen[rowUniqueKey(row)] = true;
    });
    for (var i = 0; i < rows.length; i++) {
      if (rowNodeId(rows[i]) === parentId || s(rows[i].rowKey) === parentId) {
        parentIndex = i;
        break;
      }
    }
    if (parentIndex < 0) return rows;
    var insertAt = findInsertIndex(rows, parentIndex, parentLevel);
    var additions = [];
    ((childPayload && childPayload.rows) || []).forEach(function (row) {
      var child = cloneRow(row);
      child.level = parentLevel + Number(row.level || 1);
      child.parentId = parentId;
      child.rowKey =
        'dyn:' +
        parentId +
        ':' +
        (child.instanceId || '') +
        ':' +
        (child.physicalId || child.referenceId || '') +
        ':' +
        child.level;
      if (!seen[rowUniqueKey(child)]) {
        seen[rowUniqueKey(child)] = true;
        additions.push(child);
      }
    });
    return rows.slice(0, insertAt).concat(additions, rows.slice(insertAt));
  }

  function updatePayloadRowsIncremental(rows, mode) {
    var payload = w.__bomSkaLastPayload || {};
    replaceDynamicPayload(payload, rows, mode || 'incremental');
    return applySkaPayloadToUI(payload);
  }

  function normalizeDynamicBomServiceNodes() {
    if (!w.BomService || !w.BomService.getIndex) return;
    var index = w.BomService.getIndex() || {};
    Object.keys(index).forEach(function (key) {
      var node = index[key];
      if (!node) return;
      var ref = s(node.bomChildrenId || node.referenceId || node.referencePhysicalId || node.sourcePhysicalId || node.physicalid);
      if (!ref || !isValidDsengPhysicalId(ref)) return;
      if (dynamicState.loadedNodeIds[ref]) {
        node.loaded = true;
        node.expanded = true;
      } else {
        node.loaded = false;
        node.expanded = false;
        node.isAssembly = true;
      }
    });
  }

  function loadChildrenForDynamicNode(nodeId) {
    nodeId = s(nodeId);
    var parentRow = findDynamicRowById(nodeId);
    var parentRef = rowNodeId(parentRow) || nodeId;
    if (!parentRow || !isValidDsengPhysicalId(parentRef)) {
      setStatus('Nó sem EngItem dseng válido para carregar filhos.', 'error');
      return Promise.reject(new Error('INVALID_DYNAMIC_NODE'));
    }
    if (dynamicState.loadedNodeIds[parentRef]) {
      dynamicState.expandedNodeIds[parentRef] = true;
      return updatePayloadRowsIncremental(dynamicState.lastRows, 'incremental');
    }
    if (dynamicState.loadingNodeIds[parentRef]) return Promise.resolve(w.__bomSkaLastPayload);
    dynamicState.loadingNodeIds[parentRef] = true;
    setStatus('Carregando filhos via dseng: ' + (parentRow.title || parentRef), 'info');
    return fetchBomStructureFromSkaService({
      rootId: parentRef,
      depth: 1,
      expandDepth: 1,
      includeRoot: false,
      expandStrategy: 'expand-item'
    })
      .then(function (payload) {
        var rows = mergeChildRows(parentRow, payload);
        var current = w.__bomSkaLastPayload || {};
        current.diagnostics = current.diagnostics || {};
        current.diagnostics.endpointsUsed = (current.diagnostics.endpointsUsed || []).concat(
          (payload.diagnostics && payload.diagnostics.endpointsUsed) || []
        );
        current.diagnostics.warnings = (current.diagnostics.warnings || []).concat(
          'Estrutura parcial: ramo carregado sob demanda via ExpandItem para ' + parentRef
        );
        dynamicState.loadedNodeIds[parentRef] = true;
        dynamicState.expandedNodeIds[parentRef] = true;
        dynamicState.lastEndpoint = '/structure';
        dynamicState.loadMode = 'incremental';
        return updatePayloadRowsIncremental(rows, 'incremental');
      })
      .catch(function (err) {
        var normalized = normalizeSkaError(err);
        dynamicState.lastError = normalized.message;
        setStatus(normalized.message, 'error');
        return Promise.reject(err);
      })
      .then(
        function (result) {
          delete dynamicState.loadingNodeIds[parentRef];
          return result;
        },
        function (err) {
          delete dynamicState.loadingNodeIds[parentRef];
          throw err;
        }
      );
  }

  function loadNextDynamicLevel() {
    var rows = dynamicState.lastRows || [];
    if (!rows.length) return syncWithProductExplorer();
    var level = dynamicState.maxLoadedLevel || maxLoadedLevel(rows);
    var frontier = rows.filter(function (row) {
      var id = rowNodeId(row);
      return Number(row.level || 0) === level && id && !dynamicState.loadedNodeIds[id];
    });
    if (!frontier.length) {
      setStatus('Nenhum nó pendente no nível carregado atual.', 'info');
      return Promise.resolve(w.__bomSkaLastPayload);
    }
    dynamicState.loadMode = 'next-level-global';
    var chain = Promise.resolve();
    frontier.forEach(function (row) {
      chain = chain.then(function () {
        return loadChildrenForDynamicNode(rowNodeId(row)).catch(function () {
          return null;
        });
      });
    });
    return chain.then(function () {
      setStatus('Próximo nível global carregado: ' + getSkaExpectedTotal(w.__bomSkaLastPayload) + ' linhas carregadas.', 'ok');
      return w.__bomSkaLastPayload;
    });
  }

  function mapErrorMessage(code, fallback) {
    var map = {
      UPSTREAM_NOT_CONFIGURED: 'SKA BOM Service não está configurado para dseng real no Render.',
      UPSTREAM_AUTH_FAILED: 'Falha de autenticação no 3DEXPERIENCE. Validar credenciais no Render.',
      UPSTREAM_AUTH_NOT_IMPLEMENTED: 'Modo de autenticação 3DEXPERIENCE não configurado explicitamente.',
      ROOT_NOT_FOUND: 'RootId não encontrado ou não acessível. Verifique se o item selecionado é um Engineering Item/Physical Product válido para dseng ou use Avançado.',
      SELECTION_NOT_RESOLVED:
        'Não foi possível resolver a seleção do Product Explorer para um EngItem dseng válido. Use Avançado ou copie o diagnóstico de contexto.',
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

  function parseSkaHttpResponse(response, text) {
    var payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (e) {
      payload = null;
    }
    if (!response.ok || !payload || payload.ok === false) {
      var code = payload && payload.error && payload.error.code ? payload.error.code : 'HTTP_' + response.status;
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
        expandDepth: opts.expandDepth == null ? opts.depth == null ? DEFAULT_DEPTH : opts.depth : opts.expandDepth,
        includeRoot: opts.includeRoot !== false,
        mode: 'dseng-official',
        expandStrategy: opts.expandStrategy || 'expand-item'
      })
    }).then(function (response) {
      return response.text().then(function (text) {
        return parseSkaHttpResponse(response, text);
      });
    });
  }

  function fetchResolveSelectionFromSkaService(opts) {
    opts = opts || {};
    return fetch(RESOLVE_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selection: opts.selection || {},
        depth: opts.depth == null ? DEFAULT_DEPTH : opts.depth,
        expandDepth: opts.expandDepth == null ? opts.depth == null ? DEFAULT_DEPTH : opts.depth : opts.expandDepth,
        includeRoot: opts.includeRoot !== false,
        mode: 'dseng-official',
        expandStrategy: opts.expandStrategy || 'expand-item',
        manualRootId: opts.manualRootId || undefined,
        payloadMode: opts.payloadMode || undefined
      })
    }).then(function (response) {
      return response.text().then(function (text) {
        return parseSkaHttpResponse(response, text);
      });
    });
  }

  function mapSkaRowsToImportItems(rows) {
    return (rows || []).map(function (row, idx) {
      var refId = row.physicalId || row.referenceId || '';
      var loaded = !!(row.__loadedChildren || dynamicState.loadedNodeIds[refId]);
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
        referenceId: refId,
        referencePhysicalId: refId,
        bomChildrenId: refId,
        description: row.description || '',
        rowKey: row.rowKey || '',
        isAssembly: !loaded,
        loaded: loaded,
        expanded: !!row.__expanded
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
    var dyn = payload.__skaDynamicState || {};
    var resolution = payload.resolution || {};
    var selectedCandidatesText = (syncMeta.selectedCandidates || [])
      .slice(0, 5)
      .map(function (c) {
        return [c.source || '?', c.id || c.physicalId || c.name || '?', c.title || c.label || '']
          .filter(Boolean)
          .join(' | ');
      })
      .join(' ; ');
    var bridgeDiag =
      w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getBridgeDiagnosticStatus
        ? w.ProductExplorerSyncProvider.getBridgeDiagnosticStatus()
        : '';
    var summary =
      resolution.status === 'RESOLVED'
        ? 'Product Explorer → SKA OK · ' + expected + ' itens carregados'
      : status === 'OK'
        ? 'SKA OK · ' + expected + ' itens carregados' + (durationMs ? ' · ' + durationMs + ' ms' : '')
        : 'SKA ERRO · ' + expected + ' itens carregados';

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
      '<br/>strategy: ' +
      escapeHtml(payload.strategy || dyn.strategy || 'expand-item') +
      (syncMeta.payloadEndpoint ? '<br/>payloadEndpoint: ' + escapeHtml(syncMeta.payloadEndpoint) : '') +
      (syncMeta.payloadMode ? '<br/>payloadMode: ' + escapeHtml(syncMeta.payloadMode) : '') +
      (syncMeta.selectionSource ? '<br/>selectionSource: ' + escapeHtml(syncMeta.selectionSource) : '') +
      (syncMeta.selectedItemLabel ? '<br/>selectedItem: ' + escapeHtml(syncMeta.selectedItemLabel) : '') +
      (syncMeta.eventType ? '<br/>eventType: ' + escapeHtml(syncMeta.eventType) : '') +
      (syncMeta.rootId ? '<br/>rootId: ' + escapeHtml(syncMeta.rootId) : '') +
      (resolution.strategy ? '<br/>resolution.strategy: ' + escapeHtml(resolution.strategy) : '') +
      (resolution.rootId ? '<br/>resolution.rootId: ' + escapeHtml(resolution.rootId) : '') +
      (resolution.rootTitle ? '<br/>resolution.rootTitle: ' + escapeHtml(resolution.rootTitle) : '') +
      (resolution.status ? '<br/>resolution.status: ' + escapeHtml(resolution.status) : '') +
      (syncMeta.lastSyncAt ? '<br/>lastSyncAt: ' + escapeHtml(syncMeta.lastSyncAt) : '') +
      '<br/>loadMode: ' +
      escapeHtml(dyn.loadMode || dynamicState.loadMode || 'initial') +
      '<br/>estrutura: ' +
      escapeHtml(dyn.partial === false ? 'completa no recorte solicitado' : 'parcial / incremental') +
      '<br/>itensCarregados: ' +
      escapeHtml(String(expected)) +
      (payload.counts && payload.counts.referenceCount != null
        ? '<br/>referenciasUnicas: ' + escapeHtml(String(payload.counts.referenceCount))
        : '') +
      (payload.counts && payload.counts.occurrenceCount != null
        ? '<br/>ocorrencias: ' + escapeHtml(String(payload.counts.occurrenceCount))
        : '') +
      (payload.counts && payload.counts.pathCount != null
        ? '<br/>pathsProcessados: ' + escapeHtml(String(payload.counts.pathCount))
        : '') +
      '<br/>maxLoadedLevel: ' +
      escapeHtml(String(dyn.maxLoadedLevel != null ? dyn.maxLoadedLevel : dynamicState.maxLoadedLevel || 0)) +
      '<br/>expandedNodeIds: ' +
      escapeHtml(String(dyn.expandedCount != null ? dyn.expandedCount : Object.keys(dynamicState.expandedNodeIds).length)) +
      '<br/>loadedNodeIds: ' +
      escapeHtml(String(dyn.loadedCount != null ? dyn.loadedCount : Object.keys(dynamicState.loadedNodeIds).length)) +
      (selectedCandidatesText ? '<br/>selectedCandidates: ' + escapeHtml(selectedCandidatesText) : '') +
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

  function renderSkaDiagnostics(payload) {
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var diag = (payload && payload.diagnostics) || {};
    var expected = getSkaExpectedTotal(payload);
    var endpoints = (diag.endpointsUsed || [])
      .map(function (ep) {
        return (ep.method || 'GET') + ' ' + (ep.endpoint || '?') + ' (' + (ep.status || '?') + ')';
      })
      .join('; ');
    var syncMeta = payload.__skaSyncMeta || {};
    var dyn = payload.__skaDynamicState || {};
    var resolution = payload.resolution || {};
    var selectedCandidatesText = (syncMeta.selectedCandidates || [])
      .slice(0, 5)
      .map(function (c) {
        return [c.source || '?', c.id || c.physicalId || c.name || '?', c.title || c.label || '']
          .filter(Boolean)
          .join(' | ');
      })
      .join(' ; ');
    var itemLabel =
      syncMeta.selectedItemLabel ||
      (payload.root && (payload.root.title || payload.root.id)) ||
      resolution.rootTitle ||
      resolution.rootId ||
      '-';
    var payloadMode = syncMeta.payloadMode || dyn.loadMode || dynamicState.loadMode || 'root';
    var strategy = payload.strategy || dyn.strategy || 'expand-item';
    var summary =
      'Fonte: SKA BOM Service / dseng · modo: ' +
      payloadMode +
      ' · item: ' +
      itemLabel +
      ' · strategy: ' +
      strategy +
      ' · ' +
      expected +
      ' linhas · ' +
      (dyn.partial === false ? 'recorte completo' : 'parcial');
    var detail =
      'payloadEndpoint=' +
      (syncMeta.payloadEndpoint || '') +
      ' | payloadMode=' +
      payloadMode +
      ' | selectionSource=' +
      (syncMeta.selectionSource || '') +
      ' | selectedItem=' +
      itemLabel +
      ' | selectedCandidates=' +
      selectedCandidatesText +
      ' | rootId=' +
      (syncMeta.rootId || resolution.rootId || '') +
      ' | resolution.status=' +
      (resolution.status || '') +
      ' | endpointsUsed=' +
      (endpoints || '(none)');

    panel.classList.remove('bom-hidden');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.classList.remove('bom-ska-diag-expanded');
    panel.title = detail;
    panel.innerHTML =
      '<span class="bom-ska-diag-summary">' +
      escapeHtml(summary) +
      '</span>' +
      (syncMeta.selectionSource ? '<span class="bom-ska-diag-chip">' + escapeHtml(syncMeta.selectionSource) + '</span>' : '');
  }

  function renderSkaKpiSummary(payload) {
    var grid = byId('kpiGrid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = 'none';
  }

  function updateSyncBanner(payload) {
    var banner = byId('syncBanner');
    if (!banner) return;
    var expected = getSkaExpectedTotal(payload);
    banner.classList.remove('bom-hidden');
    banner.innerHTML =
      'Fonte: <strong>SKA BOM Service</strong> / dseng · Root: <strong>' +
      escapeHtml((payload.root && payload.root.title) || '') +
      '</strong> · linhas carregadas: <strong>' +
      escapeHtml(String(expected)) +
      '</strong> · estrutura parcial/incremental.';
  }

  function tablePagerModePhrase(mode) {
    mode = normalizeLoadMode(mode || 'root');
    if (mode === 'selected-branch') return 'ramo selecionado';
    if (mode === 'dashboard-row') return 'expansao por linha';
    if (mode === 'global') return 'expansao global';
    return 'modo root';
  }

  function updateTablePager(total) {
    var pager = byId('tablePager');
    if (!pager) return;
    if (!w.__bomSkaLastPayload) {
      pager.textContent = total + ' pecas';
      return;
    }
    var syncMeta = w.__bomSkaLastPayload.__skaSyncMeta || {};
    var dyn = w.__bomSkaLastPayload.__skaDynamicState || {};
    var mode = normalizeLoadMode(syncMeta.payloadMode || dyn.loadMode || dynamicState.loadMode || 'root');
    var phrase = tablePagerModePhrase(mode);
    var extra =
      mode === 'root' &&
      syncMeta.selectionSource !== 'DS/Selection/Selection.getSelection' &&
      syncMeta.selectionSource !== 'PlatformAPI.getSelection' &&
      syncMeta.source !== 'ADVANCED_MANUAL'
        ? ' · Explorer pode mostrar mais itens visuais'
        : '';
    pager.textContent = total + ' pecas carregadas · ' + phrase + ' · estrutura parcial' + extra;
  }

  function renderSkaKpiSummary(payload) {
    var grid = byId('kpiGrid');
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = 'none';
  }

  function updateSyncBanner(payload) {
    var banner = byId('syncBanner');
    if (!banner) return;
    banner.classList.add('bom-hidden');
    banner.innerHTML = '';
  }

  function renderSkaDiagnostics(payload) {
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    payload = payload || {};
    var diag = payload.diagnostics || {};
    var expected = getSkaExpectedTotal(payload);
    var endpoints = (diag.endpointsUsed || [])
      .map(function (ep) {
        return (ep.method || 'GET') + ' ' + (ep.endpoint || '?') + ' (' + (ep.status || '?') + ')';
      })
      .join('; ');
    var syncMeta = payload.__skaSyncMeta || {};
    var dyn = payload.__skaDynamicState || {};
    var resolution = payload.resolution || {};
    var candidates = syncMeta.selectedCandidates || [];
    var selectedCandidatesText = candidates
      .slice(0, 6)
      .map(function (c) {
        return [c.source || '?', c.id || c.physicalId || c.name || '?', c.title || c.label || '']
          .filter(Boolean)
          .join(' | ');
      })
      .join(' ; ');
    var itemLabel =
      syncMeta.selectedItemLabel ||
      (payload.root && (payload.root.title || payload.root.id)) ||
      resolution.rootTitle ||
      resolution.rootId ||
      '-';
    var payloadMode = normalizeLoadMode(syncMeta.payloadMode || dyn.loadMode || dynamicState.loadMode || 'root');
    var sourceLabel = shortSelectionSource(syncMeta.selectionSource || syncMeta.source || '');
    var strategy = payload.strategy || dyn.strategy || 'expand-item';
    var selectionNote = '';
    if (payloadMode === 'root' && sourceLabel !== 'DS/Selection' && sourceLabel !== 'PlatformAPI' && sourceLabel !== 'Avancado') {
      selectionNote =
        ' · selecao PSE nao disponivel por API oficial; usando root atual · Dashboard exibindo root carregado; selecao especifica do Product Explorer nao detectada via API oficial';
    } else if (payloadMode === 'selected-branch') {
      selectionNote = ' · ramo selecionado via API oficial';
    } else if (payloadMode === 'dashboard-row') {
      selectionNote = ' · expansao incremental por linha na dashboard';
    } else if (payloadMode === 'global') {
      selectionNote = ' · expansao global de todos os ramos carregados';
    }
    var summary =
      'Fonte: dseng · modo: ' +
      payloadMode +
      ' · source: ' +
      sourceLabel +
      ' · item: ' +
      itemLabel +
      ' · strategy: ' +
      strategy +
      ' · linhas: ' +
      expected +
      ' · ' +
      (dyn.partial === false ? 'recorte completo' : 'estrutura parcial') +
      selectionNote;
    var detail =
      'payloadEndpoint=' +
      (syncMeta.payloadEndpoint || '') +
      ' | payloadMode=' +
      payloadMode +
      ' | selectionSource=' +
      (syncMeta.selectionSource || '') +
      ' | selectedItem=' +
      itemLabel +
      ' | selectedCandidates=' +
      selectedCandidatesText +
      ' | rootId=' +
      (syncMeta.rootId || resolution.rootId || '') +
      ' | resolution.status=' +
      (resolution.status || '') +
      ' | endpointsUsed=' +
      (endpoints || '(none)');

    panel.classList.remove('bom-hidden');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.classList.remove('bom-ska-diag-expanded');
    panel.title = detail;
    panel.innerHTML =
      '<span class="bom-ska-diag-summary">' +
      escapeHtml(summary) +
      '</span><span class="bom-ska-diag-chip">candidatos: ' +
      escapeHtml(String(candidates.length)) +
      '</span>';
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
      normalizeDynamicBomServiceNodes();
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

  function renderSelectionNotResolved(errPayload, ctxMeta) {
    var resolution = (errPayload && errPayload.resolution) || {};
    var attempts = resolution.attempts || [];
    var panel = byId('skaBomDiagnostics');
    if (panel) {
      panel.classList.remove('bom-hidden');
      panel.classList.add('bom-ska-diagnostics');
      panel.innerHTML =
        '<div class="bom-ska-diag-head">' +
        '<span class="bom-ska-diag-summary">Contexto não resolvido</span> ' +
        '<button type="button" class="bom-btn bom-btn-compact bom-ska-diag-toggle">Detalhes</button></div>' +
        '<div class="bom-ska-diag-details">' +
        'contextSource: ' +
        escapeHtml((ctxMeta && ctxMeta.source) || '—') +
        '<br/>resolution.status: NOT_RESOLVED' +
        (attempts.length
          ? '<br/>attempts: ' +
            escapeHtml(
              attempts
                .slice(0, 8)
                .map(function (a) {
                  return (a.strategy || '?') + ' · ' + (a.candidate || '?') + ' · ' + (a.status || '?');
                })
                .join(' | ')
            )
          : '') +
        '</div>';
      var toggle = panel.querySelector('.bom-ska-diag-toggle');
      if (toggle) {
        toggle.addEventListener('click', function (ev) {
          if (ev) ev.preventDefault();
          panel.classList.toggle('bom-ska-diag-expanded');
        });
      }
    }
  }

  function renderSelectionNotResolved(errPayload, ctxMeta) {
    var resolution = (errPayload && errPayload.resolution) || {};
    var attempts = resolution.attempts || [];
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.title =
      'contextSource=' +
      ((ctxMeta && ctxMeta.source) || '-') +
      ' | resolution.status=NOT_RESOLVED' +
      (attempts.length
        ? ' | attempts=' +
          attempts
            .slice(0, 8)
            .map(function (a) {
              return (a.strategy || '?') + ' / ' + (a.candidate || '?') + ' / ' + (a.status || '?');
            })
            .join(' ; ')
        : '');
    panel.innerHTML =
      '<span class="bom-ska-diag-summary">Seleção específica do Product Explorer não disponível pelo contexto oficial · usando root atual ou expansão por linha</span>';
  }

  function renderSelectionNotResolved(errPayload, ctxMeta) {
    var resolution = (errPayload && errPayload.resolution) || {};
    var attempts = resolution.attempts || [];
    var panel = byId('skaBomDiagnostics');
    if (!panel) return;
    var source = shortSelectionSource((ctxMeta && (ctxMeta.selectionSource || ctxMeta.source)) || 'fallback');
    var item = (ctxMeta && ctxMeta.title) || '-';
    panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
    panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
    panel.title =
      'contextSource=' +
      ((ctxMeta && ctxMeta.source) || '-') +
      ' | resolution.status=NOT_RESOLVED' +
      (attempts.length
        ? ' | attempts=' +
          attempts
            .slice(0, 8)
            .map(function (a) {
              return (a.strategy || '?') + ' / ' + (a.candidate || '?') + ' / ' + (a.status || '?');
            })
            .join(' ; ')
        : '');
    panel.innerHTML =
      '<span class="bom-ska-diag-summary">Fonte: dseng · modo: root · source: ' +
      escapeHtml(source) +
      ' · item: ' +
      escapeHtml(item) +
      ' · linhas: 0 · selecao PSE nao disponivel por API oficial; usando root atual ou expansao por linha</span>';
  }

  function buildExplorerSelectionPayload(manualRootId) {
    var provider = w.ProductExplorerSyncProvider;
    var rawCtx =
      provider && provider.getRawSelectionContext
        ? provider.getRawSelectionContext()
        : {
            source: 'NONE',
            selected: {},
            normalized: provider && provider.getContext ? provider.getContext() : {},
            timestamp: new Date().toISOString(),
            page: '3DEXPERIENCE Web Page Reader'
    };
    var normalized = provider && provider.getContext ? provider.getContext() : rawCtx.normalized || {};
    var payloadMode = normalized.selectionMode || (normalized.selectedId ? 'selected-branch' : 'fallback');
    var manualForPayload = payloadMode === 'selected-branch' ? '' : manualRootId;
    return {
      selection: {
        raw: rawCtx.selected || {},
        normalized: normalized,
        source: rawCtx.source || normalized.source || 'PlatformAPI/ExplorerContext',
        manualRootId: manualForPayload || undefined,
        payloadMode: payloadMode
      },
      normalized: normalized,
      rawContext: rawCtx,
      selectedCandidates: rawCtx.selectedCandidates || normalized.selectedCandidates || [],
      payloadEndpoint: '/api/3dx/bom/resolve-selection',
      payloadMode: payloadMode
    };
  }

  function loadBomViaSkaStructure(opts) {
    opts = opts || {};
    var params = resolveSyncParams({ forceManual: true, advancedOnly: true });
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    if (!params.rootId || !params.validation || !params.validation.ok) {
      var invMsg = 'Informe um Root Physical ID dseng válido em Avançado.';
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
    if (!opts.silent) setStatus('Carregando via SKA BOM Service (/structure)…', 'info');

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
          source: 'ADVANCED_MANUAL',
          eventType: 'advanced-structure',
          rootId: params.rootId,
          depth: params.depth,
          lastSyncAt: new Date().toISOString(),
          validationStatus: 'VALID'
        };
        lastContextMeta = {
          source: 'ADVANCED_MANUAL',
          title: lastSyncTitle,
          candidateRootId: params.rootId,
          rootIdUsed: params.rootId,
          validationStatus: 'VALID'
        };
        resetDynamicState(payload, params.depth > 1 ? 'depth-' + params.depth : 'initial', {
          manualRootId: params.rootId
        });
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
      .then(
        function (result) {
          if (syncBtn) syncBtn.disabled = false;
          if (refreshBtn) refreshBtn.disabled = false;
          return result;
        },
        function (err) {
          if (syncBtn) syncBtn.disabled = false;
          if (refreshBtn) refreshBtn.disabled = false;
          throw err;
        }
      );
  }

  function loadBomViaResolveSelection(opts) {
    opts = opts || {};
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    var manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
    var selectionPayload = buildExplorerSelectionPayload(manual);
    var depth = getDepthFromInput();
    lastContextMeta = {
      source: selectionPayload.rawContext.source,
      title: s(selectionPayload.normalized.title),
      candidateRootId: s(selectionPayload.normalized.selectedId || selectionPayload.normalized.rootId),
      rootIdUsed: '',
      payloadEndpoint: selectionPayload.payloadEndpoint,
      payloadMode: selectionPayload.payloadMode,
      selectionSource: selectionPayload.normalized.selectionSource || selectionPayload.rawContext.source,
      selectedCandidates: selectionPayload.selectedCandidates || [],
      validationStatus: 'RESOLVE_PENDING',
      reason: 'POST /resolve-selection'
    };

    clearStateBeforeSkaApply();
    w.__BOM_SKA_EMPTY_STATE__ = false;
    if (!opts.silent) setStatus('Resolvendo seleção do Product Explorer via SKA…', 'info');
    updateExplorerContextStatus(selectionPayload.normalized);

    return fetchResolveSelectionFromSkaService({
      selection: selectionPayload.selection,
      depth: depth,
      includeRoot: true,
      manualRootId: selectionPayload.payloadMode === 'selected-branch' ? undefined : manual || undefined,
      payloadMode: selectionPayload.payloadMode
    })
      .then(function (payload) {
        var resolvedRoot =
          (payload.resolution && payload.resolution.rootId) ||
          (payload.root && payload.root.id) ||
          '';
        lastSyncRootId = resolvedRoot;
        lastSyncDepth = depth;
        lastSyncTitle =
          (payload.resolution && payload.resolution.rootTitle) ||
          (payload.root && payload.root.title) ||
          selectionPayload.normalized.title ||
          '';
        payload.__skaSyncMeta = {
          source: selectionPayload.rawContext.source,
          eventType: selectionPayload.normalized.eventType || 'resolve-selection',
          payloadEndpoint: selectionPayload.payloadEndpoint,
          payloadMode: selectionPayload.payloadMode,
          selectionSource: selectionPayload.normalized.selectionSource || selectionPayload.rawContext.source,
          selectedCandidates: selectionPayload.selectedCandidates || [],
          selectedItemLabel:
            selectionPayload.normalized.title ||
            selectionPayload.normalized.name ||
            selectionPayload.normalized.label ||
            selectionPayload.normalized.selectedId ||
            '',
          rootId: resolvedRoot,
          depth: depth,
          lastSyncAt: new Date().toISOString(),
          validationStatus: 'RESOLVED',
          resolutionStrategy: payload.resolution && payload.resolution.strategy
        };
        resetDynamicState(payload, selectionPayload.payloadMode || (depth > 1 ? 'depth-' + depth : 'initial'), selectionPayload.selection);
        lastContextMeta = {
          source: selectionPayload.rawContext.source,
          title: lastSyncTitle,
          candidateRootId: selectionPayload.normalized.selectedId || selectionPayload.normalized.rootId,
          rootIdUsed: resolvedRoot,
          payloadEndpoint: selectionPayload.payloadEndpoint,
          payloadMode: selectionPayload.payloadMode,
          selectionSource: selectionPayload.normalized.selectionSource || selectionPayload.rawContext.source,
          selectedCandidates: selectionPayload.selectedCandidates || [],
          validationStatus: 'RESOLVED',
          resolutionStrategy: payload.resolution && payload.resolution.strategy
        };
        return applySkaPayloadToUI(payload);
      })
      .catch(function (err) {
        var normalized = normalizeSkaError(err);
        var code = normalized.code || '';
        var errPayload = err && err.payload ? err.payload : null;
        renderEmptySkaState(code === 'SELECTION_NOT_RESOLVED' ? 'SELECTION_NOT_RESOLVED' : 'ERROR', {
          contextMeta: lastContextMeta,
          errorCode: code,
          statusMessage: normalized.message,
          statusKind: 'error',
          tableMessage: normalized.message
        });
        if (code === 'SELECTION_NOT_RESOLVED') {
          renderSelectionNotResolved(errPayload, lastContextMeta);
        }
        return Promise.reject(err);
      })
      .then(
        function (result) {
          if (syncBtn) syncBtn.disabled = false;
          if (refreshBtn) refreshBtn.disabled = false;
          return result;
        },
        function (err) {
          if (syncBtn) syncBtn.disabled = false;
          if (refreshBtn) refreshBtn.disabled = false;
          throw err;
        }
      );
  }

  function loadBomViaSkaService(opts) {
    opts = opts || {};
    if (opts.forceManual || opts.advancedOnly) {
      return loadBomViaSkaStructure(opts);
    }
    return loadBomViaResolveSelection(opts);
  }

  function syncWithProductExplorer(opts) {
    opts = opts || {};
    if (!w.ProductExplorerSyncProvider || !w.ProductExplorerSyncProvider.refresh) {
      return loadBomViaResolveSelection(opts);
    }
    return w.ProductExplorerSyncProvider.refresh('manual-sync').then(function (ctx) {
      updateExplorerContextStatus(ctx);
      lastContextMeta = {
        source: ctx.source || 'PRODUCT_EXPLORER_CONTEXT',
        title: ctx.title,
        candidateRootId: ctx.selectedId || ctx.rootId,
        rootIdUsed: '',
        validationStatus: 'RESOLVE_PENDING'
      };
      return loadBomViaResolveSelection(opts);
    });
  }

  function refreshBom() {
    var manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
    if (manual && isValidDsengPhysicalId(manual)) {
      return loadBomViaSkaStructure({ forceManual: true, advancedOnly: true });
    }
    if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.refresh) {
      return w.ProductExplorerSyncProvider.refresh('manual-refresh').then(function (ctx) {
        updateExplorerContextStatus(ctx);
        if (ctx && ctx.selectionMode === 'selected-branch') {
          return loadBomViaResolveSelection({ payloadMode: 'selected-branch' });
        }
        if (lastSyncRootId && isValidDsengPhysicalId(lastSyncRootId)) {
          var adv = byId('explorerObjectId');
          if (adv && !s(adv.value)) adv.value = lastSyncRootId;
          var depthEl = byId('skaDepthInput');
          var desiredDepth = Math.max(Number(lastSyncDepth || DEFAULT_DEPTH), Number(dynamicState.maxLoadedLevel || 0), DEFAULT_DEPTH);
          if (depthEl && desiredDepth > Number(depthEl.value || 0)) depthEl.value = String(Math.min(desiredDepth, 3));
          setStatus('Nenhuma seleção oficial resolvível detectada; atualizando root atual.', 'info');
          return loadBomViaSkaStructure({ forceManual: true, advancedOnly: true });
        }
        return loadBomViaResolveSelection({ payloadMode: ctx && ctx.selectionMode ? ctx.selectionMode : 'fallback' });
      });
    }
    if (lastSyncRootId && isValidDsengPhysicalId(lastSyncRootId)) {
      var advFallback = byId('explorerObjectId');
      if (advFallback && !s(advFallback.value)) advFallback.value = lastSyncRootId;
      return loadBomViaSkaStructure({ forceManual: true, advancedOnly: true });
    }
    return syncWithProductExplorer();
  }

  w.loadViaExplorerSync = syncWithProductExplorer;
  w.refreshBomFromSka = refreshBom;
  w.loadViaSkaService = syncWithProductExplorer;

  function shouldAutoCollapseRightPanel() {
    return false;
  }

  function isRightPanelCollapsed() {
    return false;
  }

  function applyRightPanelState() {
    var root = uiRoot();
    if (root) root.classList.remove('bom-side-collapsed');
    if (document && document.body) document.body.classList.remove('bom-side-collapsed');
    try {
      if (w.localStorage) w.localStorage.removeItem(RIGHT_PANEL_KEY);
    } catch (e) {}
    if (w.LayoutFit && w.LayoutFit.apply) {
      try {
        w.LayoutFit.apply();
      } catch (e2) {}
    }
    apply3dxProductDashboardLayout();
  }

  function ensureRightPanelToggle() {
    var btn = byId('btnToggleRightPanel');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    applyRightPanelState();
  }

  function hideEndUserChrome() {
    var advanced = uiRoot().querySelector && uiRoot().querySelector('.bom-topbar-more');
    if (advanced) {
      advanced.classList.add('bom-hidden');
      advanced.setAttribute('hidden', 'hidden');
      advanced.style.display = 'none';
    }
    var nextBtn = byId('btnLoadNextLevel');
    if (nextBtn) {
      nextBtn.classList.add('bom-hidden');
      nextBtn.style.display = 'none';
    }
  }

  function apply3dxProductDashboardLayout() {
    var page = uiRoot().querySelector && uiRoot().querySelector('.bom-layout-page.bom-3dx-product-dashboard');
    if (!page) return;
    page.style.gridTemplateAreas =
      '"header header" "tools charts" "table preview"';
    page.style.gridTemplateRows = 'auto auto minmax(0, 1fr)';
    page.style.gridTemplateColumns = 'minmax(0, 1fr) clamp(150px, 16vw, 210px)';
    page.style.height = '100%';
    page.style.maxHeight = '100%';
    var zones = {
      '.bom-zone-1': 'header',
      '.bom-zone-2': 'tools',
      '.bom-zone-3': 'charts',
      '.bom-zone-4': 'table',
      '.bom-zone-5': 'preview'
    };
    Object.keys(zones).forEach(function (sel) {
      var el = page.querySelector(sel);
      if (el) el.style.gridArea = zones[sel];
    });
    var zone2 = page.querySelector('.bom-zone-2');
    var zone4 = page.querySelector('.bom-zone-4');
    if (zone2) {
      zone2.style.height = '';
      zone2.style.maxHeight = '';
      zone2.style.alignSelf = 'start';
    }
    if (zone4) {
      zone4.style.minHeight = '0';
      zone4.style.height = '100%';
      zone4.style.maxHeight = '100%';
    }
    var list = page.querySelector('.bom-zone-4 .bom-ebom-list');
    var tableWrap = page.querySelector('.bom-zone-4 .bom-table-wrap');
    if (list && tableWrap && zone4) {
      var head = page.querySelector('.bom-zone-4 .bom-ebom-head');
      var pager = page.querySelector('.bom-zone-4 .bom-table-pager');
      var zone4Box = zone4.getBoundingClientRect();
      var headH = head ? head.offsetHeight : 0;
      var pagerH = pager ? pager.offsetHeight : 22;
      var listH = Math.max(120, Math.floor(zone4Box.height - headH - 4));
      list.style.height = listH + 'px';
      list.style.maxHeight = listH + 'px';
      tableWrap.style.height = Math.max(80, listH - pagerH) + 'px';
      tableWrap.style.maxHeight = tableWrap.style.height;
    }
  }

  function applyTopbarCompactLabels() {
    var root = uiRoot();
    var compact = root && root.clientWidth ? root.clientWidth < 980 : false;
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    var nextBtn = byId('btnLoadNextLevel');
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
    if (nextBtn) {
      nextBtn.textContent = compact ? '+ global' : '+ nível global';
      nextBtn.title = 'Carrega filhos de todos os ramos carregados; use o + da linha para analisar só um subconjunto.';
    }
    if (badge) {
      badge.textContent = compact ? 'SKA/dseng' : 'Fonte: SKA BOM Service / dseng';
    }
    applyRightPanelState();
    apply3dxProductDashboardLayout();
  }

  function bindTestRootButton() {
    var btn = byId('btnTestRootId');
    if (!btn || btn.__BOM_TEST_ROOT_BOUND__) return;
    btn.__BOM_TEST_ROOT_BOUND__ = true;
    btn.addEventListener('click', function (ev) {
      if (ev) ev.preventDefault();
      loadBomViaSkaStructure({ forceManual: true, advancedOnly: true }).catch(function () {});
    });
  }

  function bindCopyContextDiagnosticsButton() {
    var btn = byId('btnCopyContextDiag');
    if (!btn || btn.__BOM_COPY_CTX_BOUND__) return;
    btn.__BOM_COPY_CTX_BOUND__ = true;
    btn.addEventListener('click', function (ev) {
      if (ev) ev.preventDefault();
      var raw =
        w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getRawSelectionContext
          ? w.ProductExplorerSyncProvider.getRawSelectionContext()
          : { source: 'NONE', selected: {}, normalized: {}, timestamp: new Date().toISOString() };
      var text = JSON.stringify(raw, null, 2);
      var area = byId('apiDiagReport');
      if (area) {
        area.classList.remove('bom-hidden');
        area.value = text;
      }
      setStatus('Diagnóstico de contexto copiado para área técnica oculta.', 'ok');
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

  function ensureDynamicControls() {
    var refreshBtn = byId('btnRefreshBom');
    if (!refreshBtn || !refreshBtn.parentNode) return;
    var advanced = document.querySelector('.bom-topbar-more');
    var nextBtn = byId('btnLoadNextLevel');
    if (!nextBtn) {
      nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.id = 'btnLoadNextLevel';
      nextBtn.className = 'bom-btn bom-btn-secondary';
      nextBtn.textContent = '+ nível global';
      nextBtn.title = 'Carrega filhos de todos os ramos carregados; use o + da linha para analisar só um subconjunto.';
      if (advanced) {
        advanced.appendChild(nextBtn);
      } else {
        refreshBtn.parentNode.insertBefore(nextBtn, refreshBtn.nextSibling);
      }
    } else if (advanced && nextBtn.parentNode !== advanced) {
      advanced.appendChild(nextBtn);
    }
    if (!nextBtn.__BOM_NEXT_LEVEL_BOUND__) {
      nextBtn.__BOM_NEXT_LEVEL_BOUND__ = true;
      nextBtn.addEventListener(
        'click',
        function (ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          }
          nextBtn.disabled = true;
          loadNextDynamicLevel()
            .catch(function () {})
            .then(function () {
              nextBtn.disabled = false;
            });
        },
        true
      );
    }
  }

  function bindDynamicTableExpansion() {
    if (!w.DataTable || typeof w.DataTable.onRowExpand !== 'function') return;
    w.DataTable.onRowExpand(function (nodeId) {
      return loadChildrenForDynamicNode(nodeId);
    });
  }

  function patchUiLabels() {
    ensureSyncExplorerButton();
    ensureDynamicControls();
    ensureRightPanelToggle();
    hideEndUserChrome();
    bindDynamicTableExpansion();
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
    if (depthEl) {
      depthEl.max = '3';
      if (!s(depthEl.value)) depthEl.value = String(DEFAULT_DEPTH);
    }
    var banner = byId('syncBanner');
    if (banner && !w.__bomSkaLastPayload) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML =
        'Camada analítica do <strong>Product Structure Explorer</strong>. Fonte de dados: <strong>SKA BOM Service</strong> / dseng.';
    }
    if (banner) {
      banner.classList.add('bom-hidden');
      banner.innerHTML = '';
    }
    updateExplorerContextStatus(
      w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext && w.ProductExplorerSyncProvider.getContext()
    );
    applyTopbarCompactLabels();
    apply3dxProductDashboardLayout();
    bindTestRootButton();
    bindCopyContextDiagnosticsButton();
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
      apply3dxProductDashboardLayout();
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
    bindCopyContextDiagnosticsButton();
    setStatus('Build ' + BUILD + ' | SKA BOM Service + resolve-selection', 'ok');
  }

  w.__bomSkaServiceInstall = install;
  w.fetchBomStructureFromSkaService = fetchBomStructureFromSkaService;
  w.fetchResolveSelectionFromSkaService = fetchResolveSelectionFromSkaService;
  w.mapSkaRowsToImportItems = mapSkaRowsToImportItems;
  w.prepareSkaRowsForSnapshot = prepareSkaRowsForSnapshot;
  w.getSkaExpectedTotal = getSkaExpectedTotal;
  w.loadViaSkaService = syncWithProductExplorer;
  w.syncWithProductExplorer = syncWithProductExplorer;
  w.refreshBomFromSka = refreshBom;
  w.assertSkaCountIntegrity = assertSkaCountIntegrity;
  w.normalizeCandidateRootId = normalizeCandidateRootId;
  w.renderEmptySkaState = renderEmptySkaState;
  w.loadNextBomLevelFromSka = loadNextDynamicLevel;
  w.loadBomChildrenFromSka = loadChildrenForDynamicNode;
  w.getBomDynamicState = function () {
    return {
      lastResolvedRootId: dynamicState.lastResolvedRootId,
      lastDepth: dynamicState.lastDepth,
      loadMode: dynamicState.loadMode,
      loadedRows: dynamicState.lastRows.length,
      maxLoadedLevel: dynamicState.maxLoadedLevel,
      expandedNodeIds: Object.keys(dynamicState.expandedNodeIds),
      loadedNodeIds: Object.keys(dynamicState.loadedNodeIds),
      partial: dynamicState.partial,
      lastError: dynamicState.lastError
    };
  };

  /* install deferred — runtime calls __bomSkaServiceInstall */
})();
