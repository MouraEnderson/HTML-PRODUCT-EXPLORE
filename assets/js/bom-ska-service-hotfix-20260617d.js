/* PR #23 — Product Explorer selection resolver via backend (ES5) */
(function () {
  'use strict';

  var w = window;
  var BUILD = 'bom20260617d';
  var SKA_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure';
  var RESOLVE_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection';
  var STRUCTURE_ROOT_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure/root';
  var STRUCTURE_CHILDREN_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure/children';
  var VIZ_URL = 'https://bom-resolver.onrender.com/api/3dx/visualization/resolve';
  var LIFECYCLE_TRANSITIONS_URL = 'https://bom-resolver.onrender.com/api/3dx/lifecycle/transitions';
  var LIFECYCLE_CHANGE_URL = 'https://bom-resolver.onrender.com/api/3dx/lifecycle/change-maturity';
  var DATA_SOURCE = 'wafdata-session';
  var LEGACY_SKA_SOURCE = 'ska-bom-service';
  var DEFAULT_SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  var WAF_EXPAND_VARIANT = 'official-dseng-v1+sc+csrf';
  var RELEASE_COMMIT = w.__BOM_RELEASE_COMMIT__ || 'waf3dx20260620g';
  var DEFAULT_DEPTH = 8; /* profundidade real — estruturas industriais tipicas ate 10 niveis */
  var SESSION_KEY = '3dx_bom_snapshot_v1';
  var LAST_GOOD_CONTEXT_KEY = 'bomAnalytics:lastGoodContext:bom20260617d';
  var KNOWN_ROOT_ID = '63FC553465A62400699E0792000086AB';
  var KNOWN_ROOT_TITLE_HINT = 'CJ MESA';
  var BOOT_CONTEXT_WAIT_MS = 1000;
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
  var activeEbomRow = null;
  var activeLifecycleRequestId = 0;
  var activeVisualizationRequestId = 0;

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

  function getTenantSlug() {
    var m = String(DEFAULT_SPACE_URL).match(/\/\/(r\d+-[a-z0-9]+)-space\./i);
    return m ? m[1].toLowerCase() : 'r1132100929518-us1';
  }

  function parseLastGoodContext(raw) {
    if (!raw) return null;
    try {
      var ctx = JSON.parse(raw);
      if (!ctx || typeof ctx !== 'object') return null;
      if (ctx.build && ctx.build !== BUILD) return null;
      if (ctx.tenant && ctx.tenant !== getTenantSlug()) return null;
      if (!isValidDsengPhysicalId(ctx.rootId)) return null;
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function loadLastGoodContext() {
    if (w.__BOM_ALLOW_LAST_GOOD_CONTEXT__ !== true) return null;
    return parseLastGoodContext(safeStorageGet(LAST_GOOD_CONTEXT_KEY));
  }

  function buildLastGoodContextRecord(payload, resolved) {
    payload = payload || {};
    resolved = resolved || {};
    var root = payload.root || {};
    return {
      build: BUILD,
      tenant: getTenantSlug(),
      spaceUrl: DEFAULT_SPACE_URL,
      rootId: s(resolved.rootId || root.id),
      rootTitle: s(resolved.rootTitle || root.title || lastSyncTitle),
      rootName: s(resolved.rootName || ''),
      mode: 'dseng-official',
      expandStrategy: 'expand-item',
      depth: Number(resolved.depth != null ? resolved.depth : lastSyncDepth || DEFAULT_DEPTH),
      expandDepth: Number(
        resolved.expandDepth != null
          ? resolved.expandDepth
          : resolved.depth != null
          ? resolved.depth
          : lastSyncDepth || DEFAULT_DEPTH
      ),
      includeRoot: resolved.includeRoot !== false,
      lastSuccessAt: new Date().toISOString()
    };
  }

  function shouldPersistLastGoodContext(payload) {
    if (!payload || payload.ok === false) return false;
    var total = getSkaExpectedTotal(payload);
    var rows = payload.rows || [];
    var rootId = s((payload.root && payload.root.id) || lastSyncRootId);
    if (!isValidDsengPhysicalId(rootId)) return false;
    if (!rows.length || total <= 0) return false;
    return true;
  }

  function persistLastGoodContext(payload, resolved) {
    if (!shouldPersistLastGoodContext(payload)) return;
    safeStorageSet(LAST_GOOD_CONTEXT_KEY, JSON.stringify(buildLastGoodContextRecord(payload, resolved)));
  }

  function applyLastGoodContextToUi(saved, warning) {
    if (!saved) return false;
    var adv = byId('explorerObjectId');
    if (adv) adv.value = saved.rootId;
    var depthEl = byId('skaDepthInput');
    if (depthEl && saved.depth) depthEl.value = String(saved.depth);
    lastSyncRootId = saved.rootId;
    lastSyncDepth = saved.depth || DEFAULT_DEPTH;
    lastSyncTitle = saved.rootTitle || '';
    lastContextMeta = {
      source: 'LAST_GOOD_CONTEXT',
      title: saved.rootTitle,
      candidateRootId: saved.rootName || saved.rootTitle,
      rootIdUsed: saved.rootId,
      validationStatus: 'VALID',
      fallbackWarning: warning || ''
    };
    updateExplorerContextStatus({
      rootId: saved.rootId,
      title: saved.rootTitle,
      source: 'LAST_GOOD_CONTEXT'
    });
    if (warning) showFallbackBanner(warning);
    return true;
  }

  function showFallbackBanner(message) {
    var banner = byId('syncBanner');
    if (!banner || !message) return;
    banner.classList.remove('bom-hidden');
    banner.innerHTML = escapeHtml(message);
  }

  function hasRenderableSkaPayload() {
    return !!(w.__bomSkaLastPayload && getSkaExpectedTotal(w.__bomSkaLastPayload) > 0);
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

  /** resolveKnownExplorerRoot desativado — nenhum fallback hardcoded por projeto.
   *  Toda resolucao passa pelo backend /resolve-selection. */
  function resolveKnownExplorerRoot(_ctx) {
    return null;
  }

  function normalizeCandidateRootId(ctx, manualRootId) {
    ctx = ctx || {};
    var candidate = s(manualRootId);
    var source = 'MISSING';
    var title = s(ctx.title || ctx.productName || ctx.rootName);
    if (!candidate && isValidDsengPhysicalId(ctx.rootId)) candidate = s(ctx.rootId);
    if (!candidate) {
      var known = resolveKnownExplorerRoot(ctx);
      if (known && isValidDsengPhysicalId(known.rootId)) {
        return {
          ok: true,
          rootId: known.rootId,
          reason: 'VALID',
          source: known.source || 'EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT',
          validationStatus: 'VALID',
          title: known.title || title,
          candidateRootId: known.physicalId || known.rootId,
          rawType: 'known-root-registry'
        };
      }
    }
    if (!candidate) candidate = s(ctx.selectedId);
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

  function renderEmptyTableMessage(msg, options) {
    options = options || {};
    var displayMsg = options.showTechnicalError
      ? msg || 'Sem dados sincronizados.'
      : 'Sem dados sincronizados. Use Sincronizar com Product Explorer ou Avançado.';
    var tbody = byId('bomTable') && byId('bomTable').querySelector('tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr class="bom-empty-row"><td colspan="12">' + escapeHtml(displayMsg) + '</td></tr>';
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
    if (details.preserveGoodState !== false && hasRenderableSkaPayload()) {
      renderContextDiagnostics(details.contextMeta || lastContextMeta, reason);
      if (details.bannerMessage) showFallbackBanner(details.bannerMessage);
      setStatus(
        details.statusMessage || 'Estrutura anterior mantida — contexto do Product Explorer incompleto.',
        details.statusKind || 'info'
      );
      return;
    }
    if (details.preserveGoodState !== false) {
      var savedCtx = loadLastGoodContext();
      if (savedCtx && !details.skipLastGoodRetry) {
        details.skipLastGoodRetry = true;
        tryLoadFromLastGoodContext({ silent: true }, null, 'contexto parcial do Product Explorer').catch(function () {
          renderEmptySkaState(reason, { preserveGoodState: false, skipLastGoodRetry: true });
        });
        return;
      }
    }
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
        'Selecione uma estrutura no Product Explorer e clique Sincronizar.',
      { showTechnicalError: false }
    );
    var lbl = byId('selectionLabel');
    if (lbl && details.title) lbl.textContent = details.title;
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML = escapeHtml(
        details.bannerMessage ||
          (details.statusMessage
            ? details.statusMessage
            : 'Sem dados sincronizados via wafdata-session.')
      );
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

  function findSkaRowForNode(node) {
    if (!node || !w.__bomSkaLastPayload || !w.__bomSkaLastPayload.rows) return null;
    var rows = w.__bomSkaLastPayload.rows;
    var ref = s(node.referenceId || node.referencePhysicalId || node.sourcePhysicalId || node.physicalid);
    var rowKey = s(node.rowKey);
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (rowKey && s(row.rowKey) === rowKey) return row;
      if (ref && (s(row.referenceId) === ref || s(row.physicalId) === ref)) return row;
    }
    return null;
  }

  function buildActiveEbomRow(node, skaRow) {
    node = node || {};
    skaRow = skaRow || {};
    var referenceId = s(skaRow.referenceId || skaRow.physicalId || node.referenceId || node.sourcePhysicalId || node.physicalid);
    return {
      activeEbomRow: node,
      activeRowKey: s(skaRow.rowKey || node.rowKey),
      activeReferenceId: referenceId,
      activePhysicalId: s(skaRow.physicalId || node.sourcePhysicalId || node.physicalid || referenceId),
      activeInstanceId: s(skaRow.instanceId || node.instanceId),
      activePath: Array.isArray(skaRow.path) ? skaRow.path.slice() : [],
      activeTitle: s(node.title || skaRow.title || node.name),
      activeName: s(node.name || skaRow.name || node.title),
      activeRevision: s(node.revision || skaRow.revision),
      activeMaturity: s(node.maturity || node.state || skaRow.maturity || skaRow.state),
      activeOwner: s(node.owner || skaRow.owner),
      activeType: s(node.type || node.displayType || skaRow.type),
      activeDescription: s(node.description || skaRow.description),
      activeState: s(node.state || node.maturity || skaRow.state || skaRow.maturity),
      activeRepReferenceId: s(skaRow.repReferenceId || '')
    };
  }

  function getScopeModeFromPayload(payload) {
    payload = payload || w.__bomSkaLastPayload || {};
    var scope = payload.scope || {};
    if (scope.mode) return scope.mode;
    var syncMeta = payload.__skaSyncMeta || {};
    var dyn = payload.__skaDynamicState || {};
    return normalizeLoadMode(syncMeta.payloadMode || dyn.loadMode || dynamicState.loadMode || 'root');
  }

  function formatDsengCountLine(payload, total) {
    payload = payload || w.__bomSkaLastPayload || {};
    var counts = payload.counts || {};
    var scope = payload.scope || {};
    var loaded = counts.loadedRows != null ? counts.loadedRows : total != null ? total : counts.totalRows || 0;
    var parts = [loaded + ' linhas dseng'];
    if (counts.occurrenceCount != null) parts.push(counts.occurrenceCount + ' ocorrencias');
    if (counts.uniqueReferenceCount != null) {
      parts.push(counts.uniqueReferenceCount + ' refs unicas');
    } else if (counts.referenceCount != null) {
      parts.push(counts.referenceCount + ' refs');
    }
    parts.push(getScopeModeFromPayload(payload));
    var depth = scope.expandDepth != null ? scope.expandDepth : payload.expandDepth;
    if (depth == null && dynamicState.lastDepth != null) depth = dynamicState.lastDepth;
    if (depth != null && depth !== '') parts.push('expandDepth ' + depth);
    parts.push(scope.isPartial === false ? 'completo' : 'parcial');
    return parts.join(' · ');
  }

  function ownerLabel(node) {
    if (typeof w.MetricsEngine !== 'undefined' && w.MetricsEngine.ownerLabel) {
      return w.MetricsEngine.ownerLabel(node.owner);
    }
    return s(node.owner || '—') || '—';
  }

  function renderEbomSidePanel(node, active, refs) {
    if (!refs || !refs.metaEl) return;
    active = active || buildActiveEbomRow(node, findSkaRowForNode(node));
    refs.metaEl.innerHTML =
      '<dl class="bom-preview-dl">' +
      '<dt>Título</dt><dd>' +
      escapeHtml(active.activeTitle || '—') +
      '</dd>' +
      '<dt>Descrição</dt><dd>' +
      escapeHtml(active.activeDescription || '—') +
      '</dd>' +
      '<dt>Revisão</dt><dd>' +
      escapeHtml(active.activeRevision || '—') +
      '</dd>' +
      '<dt>Proprietário</dt><dd>' +
      escapeHtml(ownerLabel(node)) +
      '</dd>' +
      '<dt>Maturidade</dt><dd>' +
      escapeHtml(active.activeMaturity || '—') +
      '</dd>' +
      '<dt>Estado</dt><dd>' +
      escapeHtml(active.activeState || '—') +
      '</dd>' +
      '<dt>Reference ID</dt><dd class="bom-preview-id">' +
      escapeHtml(active.activeReferenceId || '—') +
      '</dd>' +
      '<dt>Instance ID</dt><dd class="bom-preview-id">' +
      escapeHtml(active.activeInstanceId || '—') +
      '</dd>' +
      '<dt>Path</dt><dd class="bom-preview-id">' +
      escapeHtml((active.activePath || []).join(' > ') || '—') +
      '</dd>' +
      '</dl>' +
      '<div class="bom-maturity-actions" id="bomMaturityActions">' +
      '<button type="button" class="bom-btn bom-btn-secondary bom-btn-compact" id="btnChangeMaturity">Alterar maturidade</button>' +
      '<p class="bom-maturity-hint" id="bomMaturityHint"></p>' +
      '</div>';
    bindMaturityAction(active);
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = { ok: false, message: text || 'Resposta inválida' };
        }
        return { response: response, data: data };
      });
    });
  }

  function formatVisualizationBlockMessage(data, code) {
    var attempts = (data.diagnostics && data.diagnostics.attempts) || [];
    var hasShapes = attempts.some(function (a) {
      return (a.shapeCount && a.shapeCount > 0) || String(a.step || '').indexOf('3DShape') >= 0;
    });
    if (code === 'NO_WEB_VIEWABLE_FORMAT' || (hasShapes && code === 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED')) {
      return (
        'Representação 3D web não disponível neste tenant. ' +
        'Foram encontrados objetos 3DShape, mas nenhum Derived Output GLB/glTF/OBJ/STL foi retornado.'
      );
    }
    if (code === 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED') {
      return (
        'Representação 3D web não disponível neste tenant. ' +
        'O backend tentou dseng/dsdo/ds3sh/dsxcad sem obter arquivo renderizável.'
      );
    }
    return data.message || 'Representação 3D web não disponível para este item.';
  }

  function formatMaturityBlockHint(data, active) {
    var state = (data.item && data.item.currentState) || active.activeMaturity || '—';
    if (data.code === 'LIFECYCLE_TRANSITIONS_UNAVAILABLE' || data.code === 'OFFICIAL_LIFECYCLE_API_REQUIRED') {
      return (
        'Maturidade indisponível: o tenant/API não retornou transições oficiais para este item. Estado atual: ' +
        state
      );
    }
    return data.message || 'Nenhuma transição retornada.';
  }

  function setMaturityButtonBlocked(blocked) {
    var btn = byId('btnChangeMaturity');
    if (!btn) return;
    btn.disabled = !!blocked;
    btn.title = blocked
      ? 'Maturidade indisponível neste tenant — API não retornou transições oficiais.'
      : 'Alterar maturidade no 3DEXPERIENCE';
  }

  function loadVisualizationForRowWaf(active) {
    if (!active || !active.activeReferenceId || !w.__waf3dxClient) return;
    var reqId = ++activeVisualizationRequestId;
    if (w.Bom3DViewer && w.Bom3DViewer.showLoading) {
      w.Bom3DViewer.showLoading(active.activeTitle);
    }
    w.__waf3dxClient
      .find3DGeometrySource(active.activeReferenceId)
      .then(function (geo) {
        if (reqId !== activeVisualizationRequestId) return;
        if (!geo.geometrySourceFound) {
          if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
            w.Bom3DViewer.showMessage(
              geo.blocker || geo.requiredAdminAction || 'Geometria real não encontrada via WAFData.',
              geo.derivedOutputFound === false ? 'NO_DERIVED_OUTPUT' : 'NO_REPRESENTATION'
            );
          }
          return null;
        }
        return w.__waf3dxClient.downloadGeometry(geo);
      })
      .then(function (dl) {
        if (reqId !== activeVisualizationRequestId || !dl) return;
        if (!dl.ok) {
          if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
            w.Bom3DViewer.showMessage(dl.error || 'Download geometria falhou via WAFData.', 'DOWNLOAD_FAILED');
          }
          return;
        }
        return w.__waf3dxClient.convertGeometryIfNeeded(dl).then(function (conv) {
          if (reqId !== activeVisualizationRequestId) return;
          if (conv.conversionOk || /^GLB|GLTF|OBJ|STL$/i.test(s(dl.format))) {
            var blobUrl = conv.blobUrl;
            if (!blobUrl && dl.arrayBuffer) {
              try {
                var mime = /GLB/i.test(dl.format) ? 'model/gltf-binary' : 'application/octet-stream';
                blobUrl = w.URL.createObjectURL(new Blob([dl.arrayBuffer], { type: mime }));
              } catch (eBlob) {}
            }
            if (w.__waf3dxClient.renderGeometryInThree) {
              return w.__waf3dxClient.renderGeometryInThree(
                { blobUrl: blobUrl, format: conv.format || dl.format },
                { title: active.activeTitle }
              );
            }
            if (w.Bom3DViewer && w.Bom3DViewer.show && blobUrl) {
              w.Bom3DViewer.show({ modelUrl: blobUrl, format: s(conv.format || dl.format).toLowerCase(), title: active.activeTitle });
            }
            return;
          }
          if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
            w.Bom3DViewer.showMessage(
              conv.blocker || conv.recommendation || 'STEP disponível mas conversão não configurada.',
              'STEP_CONVERSION_REQUIRED'
            );
          }
        });
      })
      .catch(function () {
        if (reqId !== activeVisualizationRequestId) return;
        if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
          w.Bom3DViewer.showMessage('Falha na cadeia 3DView via WAFData session.', 'WAF_3DVIEW_FAILED');
        }
      });
  }

  function loadVisualizationForRow(active) {
    if (isWafSessionMode()) {
      return loadVisualizationForRowWaf(active);
    }
    if (!active || !active.activeReferenceId) return;
    var reqId = ++activeVisualizationRequestId;
    if (w.Bom3DViewer && w.Bom3DViewer.showLoading) {
      w.Bom3DViewer.showLoading(active.activeTitle);
    }
    postJson(VIZ_URL, {
      referenceId: active.activeReferenceId,
      physicalId: active.activePhysicalId,
      instanceId: active.activeInstanceId,
      title: active.activeTitle,
      name: active.activeName,
      type: active.activeType,
      path: active.activePath,
      mode: 'dseng-official'
    })
      .then(function (result) {
        if (reqId !== activeVisualizationRequestId) return;
        var data = result.data || {};
        if (data.ok && data.modelUrl) {
          if (w.Bom3DViewer && w.Bom3DViewer.show) {
            w.Bom3DViewer.show({
              modelUrl: data.modelUrl,
              format: data.format,
              title: active.activeTitle
            });
          }
          return;
        }
        var code = data.code || (data.error && data.error.code) || 'OFFICIAL_3D_REPRESENTATION_API_REQUIRED';
        var msg = formatVisualizationBlockMessage(data, code);
        if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
          w.Bom3DViewer.showMessage(msg, code);
        }
      })
      .catch(function () {
        if (reqId !== activeVisualizationRequestId) return;
        if (w.Bom3DViewer && w.Bom3DViewer.showMessage) {
          w.Bom3DViewer.showMessage(
            'Representação 3D web não disponível neste tenant. Falha na chamada ao backend.',
            'VISUALIZATION_REQUEST_FAILED'
          );
        }
      });
  }

  function updateMaturityHint(text, kind) {
    var hint = byId('bomMaturityHint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.className = 'bom-maturity-hint';
    if (kind === 'err') hint.classList.add('bom-maturity-hint-err');
    if (kind === 'ok') hint.classList.add('bom-maturity-hint-ok');
  }

  function loadLifecycleForRowWaf(active) {
    if (!active || !active.activeReferenceId || !w.__waf3dxClient) return;
    var reqId = ++activeLifecycleRequestId;
    updateMaturityHint('Consultando maturidade via sessão WAFData…', 'ok');
    w.__waf3dxClient
      .getAllowedMaturityTransitions(active.activeReferenceId)
      .then(function (data) {
        if (reqId !== activeLifecycleRequestId) return;
        w.__bomActiveLifecycleData = {
          ok: data.transitionsLoaded,
          transitions: (data.transitions || []).map(function (state, idx) {
            return { id: 't' + idx, label: state, to: state, action: 'promote' };
          }),
          item: { currentState: data.current || active.activeMaturity }
        };
        if (!data.transitionsLoaded) {
          updateMaturityHint(data.recommendation || formatMaturityBlockHint({ code: 'LIFECYCLE_TRANSITIONS_UNAVAILABLE' }, active), 'warn');
          setMaturityButtonBlocked(true);
          return;
        }
        setMaturityButtonBlocked(false);
        updateMaturityHint(data.transitions.length + ' transição(ões) via sessão WAFData.', 'ok');
      })
      .catch(function () {
        if (reqId !== activeLifecycleRequestId) return;
        updateMaturityHint('Falha ao consultar maturidade via WAFData.', 'err');
        setMaturityButtonBlocked(true);
      });
  }

  function loadLifecycleForRow(active) {
    if (isWafSessionMode()) {
      return loadLifecycleForRowWaf(active);
    }
    if (!active || !active.activeReferenceId) return;
    var reqId = ++activeLifecycleRequestId;
    updateMaturityHint('Consultando transições permitidas…', 'ok');
    postJson(LIFECYCLE_TRANSITIONS_URL, {
      referenceId: active.activeReferenceId,
      physicalId: active.activePhysicalId,
      currentState: active.activeMaturity || active.activeState,
      type: active.activeType,
      mode: 'dseng-official'
    })
      .then(function (result) {
        if (reqId !== activeLifecycleRequestId) return;
        var data = result.data || {};
        if (data.code === 'OFFICIAL_LIFECYCLE_API_REQUIRED' || data.code === 'LIFECYCLE_TRANSITIONS_UNAVAILABLE') {
          updateMaturityHint(formatMaturityBlockHint(data, active), 'warn');
          setMaturityButtonBlocked(true);
          return;
        }
        setMaturityButtonBlocked(false);
        if (data.ok && data.transitions && data.transitions.length) {
          updateMaturityHint(data.transitions.length + ' transição(ões) disponível(is).', 'ok');
          setMaturityButtonBlocked(false);
          return;
        }
        if (data.ok) {
          updateMaturityHint('Transições consultadas.', 'ok');
          return;
        }
        updateMaturityHint(data.message || 'Nenhuma transição retornada.', 'warn');
      })
      .catch(function () {
        if (reqId !== activeLifecycleRequestId) return;
        updateMaturityHint('Falha ao consultar transições de maturidade.', 'err');
      });
  }

  function closeMaturityModal() {
    var modal = byId('bomMaturityModal');
    if (modal) modal.remove();
  }

  function openMaturityModal(active, lifecycleData) {
    closeMaturityModal();
    lifecycleData = lifecycleData || {};
    var current =
      (lifecycleData.item && lifecycleData.item.currentState) ||
      active.activeMaturity ||
      active.activeState ||
      '—';
    var transitions = Array.isArray(lifecycleData.transitions)
      ? lifecycleData.transitions.filter(function (t) {
          return !t.inferred;
        })
      : [];
    if (!transitions.length && lifecycleData.code) {
      var status = byId('bomMaturityModalStatus');
      if (status) {
        status.textContent =
          lifecycleData.message ||
          'Maturidade indisponível: o tenant/API não retornou transições oficiais para este item.';
      }
    }
    var modal = document.createElement('div');
    modal.id = 'bomMaturityModal';
    modal.className = 'bom-maturity-modal';
    var transitionsHtml = '';
    if (transitions.length) {
      transitionsHtml =
        '<label class="bom-filter-item"><span>Transição permitida</span>' +
        '<select id="bomMaturityTransition" class="bom-input">' +
        transitions
          .map(function (t, idx) {
            return (
              '<option value="' +
              idx +
              '">' +
              escapeHtml(t.label || t.to || t.action) +
              (t.inferred ? ' (validar)' : '') +
              '</option>'
            );
          })
          .join('') +
        '</select></label>';
    } else {
      transitionsHtml =
        '<p class="bom-maturity-warning">Maturidade indisponível: o tenant/API não retornou transições oficiais para este item. Operação bloqueada.</p>';
    }
    modal.innerHTML =
      '<div class="bom-maturity-modal-card" role="dialog" aria-modal="true">' +
      '<h3>Alterar maturidade (PLM)</h3>' +
      '<p><strong>Item:</strong> ' +
      escapeHtml(active.activeTitle) +
      '</p>' +
      '<p><strong>Revisão:</strong> ' +
      escapeHtml(active.activeRevision || '—') +
      '</p>' +
      '<p><strong>Estado atual:</strong> ' +
      escapeHtml(current) +
      '</p>' +
      transitionsHtml +
      '<p class="bom-maturity-warning">Operação oficial no 3DEXPERIENCE. Requer confirmação e permissão PLM.</p>' +
      '<div class="bom-maturity-modal-actions">' +
      '<button type="button" class="bom-btn bom-btn-secondary" id="bomMaturityCancel">Cancelar</button>' +
      '<button type="button" class="bom-btn bom-btn-primary" id="bomMaturityConfirm">Confirmar mudança</button>' +
      '</div>' +
      '<p class="bom-maturity-modal-status" id="bomMaturityModalStatus"></p>' +
      '</div>';
    uiRoot().appendChild(modal);
    var cancelBtn = byId('bomMaturityCancel');
    var confirmBtn = byId('bomMaturityConfirm');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        closeMaturityModal();
      });
    }
    if (confirmBtn) {
      if (!transitions.length) {
        confirmBtn.disabled = true;
      }
      confirmBtn.addEventListener('click', function () {
        var target = '';
        var transition = '';
        var action = '';
        var selectEl = byId('bomMaturityTransition');
        if (selectEl && transitions.length) {
          var picked = transitions[Number(selectEl.value)] || transitions[0];
          target = s(picked.to || picked.targetState);
          transition = s(picked.id || picked.label);
          action = s(picked.action || 'promote');
        } else {
          target = s(byId('bomMaturityTargetState') && byId('bomMaturityTargetState').value);
        }
        var statusEl = byId('bomMaturityModalStatus');
        if (!transitions.length) {
          if (statusEl) statusEl.textContent = 'Nenhuma transição oficial disponível.';
          return;
        }
        if (!target && !transition) {
          if (statusEl) statusEl.textContent = 'Selecione uma transição ou informe o estado destino.';
          return;
        }
        if (statusEl) statusEl.textContent = isWafSessionMode() ? 'Executando mudança via WAFData…' : 'Executando mudança via backend…';
        if (isWafSessionMode() && w.__waf3dxClient) {
          w.__waf3dxClient
            .changeMaturity(active.activeReferenceId, { to: target, action: action, transition: transition })
            .then(function (data) {
              if (statusEl) {
                statusEl.textContent = data.success
                  ? 'Maturidade alterada e verificada: ' + data.stateBefore + ' → ' + data.stateAfter
                  : data.error || data.blocker || 'Mudança não verificada por releitura.';
              }
              if (data.success) {
                if (activeEbomRow) {
                  activeEbomRow.activeMaturity = data.stateAfter || target;
                  activeEbomRow.activeState = data.stateAfter || target;
                }
                closeMaturityModal();
                loadLifecycleForRow(active);
              }
            })
            .catch(function (err) {
              if (statusEl) statusEl.textContent = 'Falha WAFData: ' + (err.message || err);
            });
          return;
        }
        postJson(LIFECYCLE_CHANGE_URL, {
          referenceId: active.activeReferenceId,
          physicalId: active.activePhysicalId,
          currentState: current,
          targetState: target,
          transition: transition,
          action: action,
          confirm: true,
          mode: 'dseng-official'
        })
          .then(function (result) {
            var data = result.data || {};
            if (data.ok) {
              if (statusEl) statusEl.textContent = 'Maturidade atualizada. Recarregando dashboard…';
              closeMaturityModal();
              if (activeEbomRow) {
                activeEbomRow.activeMaturity = data.newState || target;
                activeEbomRow.activeState = data.newState || target;
              }
              refreshBom().catch(function () {});
              return;
            }
            var code = data.code || (data.error && data.error.code) || 'LIFECYCLE_ERROR';
            var msg = data.message || 'Transição não permitida ou API oficial indisponível.';
            if (statusEl) statusEl.textContent = code + ': ' + msg;
            updateMaturityHint(code + ': ' + msg, 'err');
          })
          .catch(function () {
            if (statusEl) statusEl.textContent = 'Falha na chamada de lifecycle.';
          });
      });
    }
  }

  function bindMaturityAction(active) {
    var btn = byId('btnChangeMaturity');
    if (!btn || btn.__BOM_MATURITY_BOUND__) return;
    btn.__BOM_MATURITY_BOUND__ = true;
    btn.addEventListener('click', function () {
      postJson(LIFECYCLE_TRANSITIONS_URL, {
        referenceId: active.activeReferenceId,
        physicalId: active.activePhysicalId,
        currentState: active.activeMaturity || active.activeState,
        type: active.activeType,
        mode: 'dseng-official'
      })
        .then(function (result) {
          openMaturityModal(active, result.data || {});
        })
        .catch(function () {
          openMaturityModal(active, {
            code: 'LIFECYCLE_REQUEST_FAILED',
            item: { currentState: active.activeMaturity || active.activeState }
          });
        });
    });
  }

  function handleEbomRowSelect(node) {
    if (!node) return;
    var skaRow = findSkaRowForNode(node);
    activeEbomRow = buildActiveEbomRow(node, skaRow);
    w.__bomActiveEbomRow = activeEbomRow;

    var refs = w.PartPreview && w.PartPreview.ensureRefs && w.PartPreview.ensureRefs();
    if (!refs || !refs.panel) return;

    if (refs.hintEl) refs.hintEl.style.display = 'none';
    if (refs.titleEl) refs.titleEl.textContent = activeEbomRow.activeTitle || activeEbomRow.activeName || 'Peça';
    renderEbomSidePanel(node, activeEbomRow, refs);
    refs.panel.classList.add('bom-preview-active');
    loadVisualizationForRow(activeEbomRow);
    loadLifecycleForRow(activeEbomRow);
  }

  function patchPartPreviewForSka() {
    if (!w.PartPreview || w.PartPreview.__SKA_EBOM_PATCHED__) return;
    var origShow = w.PartPreview.show;
    var origClear = w.PartPreview.clear;
    w.PartPreview.show = function (node) {
      if (w.__BOM_DATA_SOURCE__ !== DATA_SOURCE) {
        return origShow.apply(this, arguments);
      }
      handleEbomRowSelect(node);
    };
    w.PartPreview.clear = function () {
      activeEbomRow = null;
      w.__bomActiveEbomRow = null;
      if (w.Bom3DViewer && w.Bom3DViewer.clear) w.Bom3DViewer.clear();
      return origClear.apply(this, arguments);
    };
    w.PartPreview.__SKA_EBOM_PATCHED__ = true;
    if (w.Bom3DViewer && w.Bom3DViewer.init) {
      w.Bom3DViewer.init('#partPreviewImage');
    }
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
        msg = 'Build ' + BUILD + ' | SKA BOM Service — use Sincronizar com Product Explorer.';
        kind = kind === 'error' ? 'error' : 'ok';
      }
      if (w.__bomSkaLastPayload && w.__BOM_DATA_SOURCE__ === DATA_SOURCE) {
        if (/^Snapshot:/i.test(String(msg || '')) || /^Estrutura:/i.test(String(msg || ''))) {
          return;
        }
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

  function isPayloadPaginated(payload) {
    return !!(payload && payload.page && payload.page.hasMore);
  }

  function getSkaExpectedTotal(payload) {
    /* Payload paginado: usa rows retornadas nesta pagina, nao o total completo */
    if (isPayloadPaginated(payload)) {
      return Number(payload.rows ? payload.rows.length : 0);
    }
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
    var refs = {};
    var instanceCount = 0;
    var pathCount = 0;
    (rows || []).forEach(function (row) {
      var level = Number(row.level || 0);
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      var ref = s(row.referenceId || row.physicalId);
      if (ref) refs[ref] = true;
      if (row.instanceId) instanceCount += 1;
      if (row.path && row.path.length) pathCount += 1;
    });
    var occurrenceCount = (rows || []).filter(function (row) {
      return Number(row.level || 0) > 0;
    }).length;
    return {
      totalRows: (rows || []).length,
      loadedRows: (rows || []).length,
      occurrenceCount: occurrenceCount,
      referenceCount: Object.keys(refs).length,
      uniqueReferenceCount: Object.keys(refs).length,
      instanceCount: instanceCount,
      pathCount: pathCount,
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
    payload.scope = {
      mode: mode === 'incremental' || mode === 'dashboard-row' ? 'dashboard-row' : mode || 'root',
      source: 'dseng',
      item: (payload.root && (payload.root.title || payload.root.id)) || '',
      rootId: (payload.root && payload.root.id) || dynamicState.lastResolvedRootId || '',
      expandStrategy: 'expand-item',
      expandDepth: payload.counts.depth || dynamicState.lastDepth || DEFAULT_DEPTH,
      isPartial: true
    };
    payload.partial = true;
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
    return fetchStructureChildren({
      rootId: w.__bomWafExpandRootId || parentRef,
      parentReferenceId: parentRef,
      expandDepth: 1,
      pageSize: 100
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

  function isWafSessionMode() {
    return (
      w.__BOM_DATA_SOURCE__ === 'wafdata-session' ||
      w.__BOM_LOADER_MODE__ === 'wafdata-session' ||
      DATA_SOURCE === 'wafdata-session'
    );
  }

  function isLegacySkaMode() {
    return w.__BOM_DATA_SOURCE__ === LEGACY_SKA_SOURCE;
  }

  function normalizeWafExpandPayload(payload, rootId) {
    if (typeof w.normalizeExpandItemPayload === 'function') {
      var normalized = w.normalizeExpandItemPayload(payload);
      if (normalized && normalized.rows && normalized.rows.length) return normalized;
    }
    payload = payload || {};
    var members = payload.member || payload.data || (payload.data && payload.data.member) || [];
    if (!Array.isArray(members)) members = [];
    var rows = [];
    var seen = {};
    members.forEach(function (m, idx) {
      if (!m) return;
      var refId = s(m.id || m.physicalid || m.physicalId);
      if (!refId || seen[refId]) return;
      seen[refId] = true;
      rows.push({
        rowKey: refId,
        level: refId === s(rootId) ? 0 : 1,
        parentReferenceId: refId === s(rootId) ? '' : s(rootId),
        referenceId: refId,
        physicalId: s(m.name || m.physicalid || refId),
        title: s(m.title || m.name || refId),
        name: s(m.name || m.title || refId),
        revision: s(m.revision),
        owner: s(m.owner),
        maturity: s(m.state || m.maturity),
        state: s(m.state || m.maturity),
        type: s(m.type || 'VPMReference'),
        source: 'wafdata-expand'
      });
    });
    return { rows: rows, visualRowsCount: rows.length, includesRoot: true, fallback: true };
  }

  function buildWafPayloadFromExpand(opts, rootRes, expRes, normalized) {
    opts = opts || {};
    rootRes = rootRes || {};
    expRes = expRes || {};
    normalized = normalized || { rows: [] };
    var rows = normalized.rows || [];
    var depth = opts.depth == null ? DEFAULT_DEPTH : opts.depth;
    var counts = rebuildDynamicCounts(rows, normalized.includesRoot !== false, depth);
    return {
      ok: true,
      source: DATA_SOURCE,
      mode: 'dseng-official',
      strategy: 'expand-item',
      root: { id: opts.rootId, title: rootRes.title || opts.title || '' },
      rows: rows,
      counts: counts,
      scope: { mode: 'root', expandDepth: depth, isPartial: depth <= 1 },
      expandDepth: depth,
      diagnostics: {
        status: rows.length ? 'OK' : 'EMPTY',
        expandVariant: WAF_EXPAND_VARIANT,
        rawRows: expRes.rowsDetected || rows.length,
        endpointsUsed: [
          { method: 'GET', endpoint: '/dseng:EngItem/' + opts.rootId, status: rootRes.status },
          {
            method: 'POST',
            endpoint: '/dseng:EngItem/' + opts.rootId + '/expand',
            status: expRes.status,
            variant: WAF_EXPAND_VARIANT
          }
        ],
        durationMs: 0,
        warnings:
          opts.source === 'KNOWN_ROOT_FALLBACK' || opts.knownRootFallback
            ? ['KNOWN_ROOT fallback CJ MESA — dev/regression only, not silent production default']
            : [],
        errors: rows.length ? [] : ['Expand returned 0 normalized rows']
      }
    };
  }

  function loadBomViaWafSession(opts) {
    opts = opts || {};
    recordWafRuntimeProof('loadBomViaWafSession-start', opts.rootId || '');
    var client = w.__waf3dxClient;
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    if (!opts.rootId || !isValidDsengPhysicalId(opts.rootId)) {
      if (syncBtn) syncBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
      return Promise.reject(new Error('ROOT_ID_REQUIRED'));
    }
    if (!client) {
      if (syncBtn) syncBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
      return Promise.reject(new Error('WAF3DX client not loaded'));
    }

    clearStateBeforeSkaApply();
    w.__BOM_SKA_EMPTY_STATE__ = false;
    if (!opts.silent) setStatus('Carregando E-BOM via sessão WAFData (dseng expand)…', 'info');
    w.__bomWafExpandRootId = opts.rootId;

    var depth = opts.depth == null ? DEFAULT_DEPTH : opts.depth;

    return client
      .detectWafData()
      .then(function (detect) {
        if (!detect.wafAvailable) {
          throw new Error(
            'WAFData indisponível neste frame — abra o widget no 3DDashboard Web Page Reader com usuário logado.'
          );
        }
        return client
          .resolveEngItemRootId({
            physicalId: opts.rootId,
            title: opts.title || lastSyncTitle,
            name: opts.rootName || ''
          })
          .then(function (resolved) {
            if (!resolved.ok) {
              throw new Error(resolved.error || resolved.recommendation || 'ROOT_RESOLVE_FAILED');
            }
            opts.rootId = resolved.rootId;
            if (resolved.title) opts.title = resolved.title;
            if (resolved.source && resolved.source !== 'DIRECT_DSENG_ID') {
              var resolveNote =
                'Root resolvido: ' +
                (resolved.physicalId || 'contexto') +
                ' → ' +
                resolved.rootId +
                ' (' +
                resolved.source +
                ')';
              opts.fallbackWarning = opts.fallbackWarning ? opts.fallbackWarning + ' · ' + resolveNote : resolveNote;
            }
            return client.getEngItem(opts.rootId).then(function (rootRes) {
          if (!rootRes.canReadRoot) {
            throw new Error('GET root falhou HTTP ' + rootRes.status + ': ' + (rootRes.error || ''));
          }
          return client.expandEngItem(opts.rootId, {
            expandDepth: depth,
            variantLabel: WAF_EXPAND_VARIANT
          }).then(function (expRes) {
            if (!expRes.expandOk) {
              throw new Error('POST expand falhou HTTP ' + expRes.status + ': ' + (expRes.error || ''));
            }
            var normalized = normalizeWafExpandPayload(expRes.data, opts.rootId);
            if (!normalized.rows || !normalized.rows.length) {
              throw new Error(
                'Expand retornou 0 linhas normalizadas (raw members: ' + (expRes.rowsDetected || 0) + ').'
              );
            }
            var payload = buildWafPayloadFromExpand(opts, rootRes, expRes, normalized);
            lastSyncRootId = opts.rootId;
            lastSyncDepth = depth;
            lastSyncTitle = payload.root.title || opts.title || '';
            payload.__skaSyncMeta = {
              source: opts.source || 'WAF_SESSION',
              dataSource: DATA_SOURCE,
              expandVariant: WAF_EXPAND_VARIANT,
              eventType: 'wafdata-expand',
              rootId: opts.rootId,
              depth: depth,
              rawRows: expRes.rowsDetected || normalized.rows.length,
              displayRows: normalized.rows.length,
              lastSyncAt: new Date().toISOString(),
              validationStatus: 'VALID',
              fallbackWarning: opts.fallbackWarning || '',
              knownRootFallback: !!opts.knownRootFallback
            };
            lastContextMeta = {
              source: opts.source || 'WAF_SESSION',
              title: lastSyncTitle,
              candidateRootId: opts.rootName || opts.title || opts.rootId,
              rootIdUsed: opts.rootId,
              validationStatus: 'VALID',
              fallbackWarning: opts.fallbackWarning || ''
            };
            if (opts.fallbackWarning) showFallbackBanner(opts.fallbackWarning);
            resetDynamicState(payload, depth > 1 ? 'depth-' + depth : 'initial', { manualRootId: opts.rootId });
            persistLastGoodContext(payload, {
              rootId: opts.rootId,
              rootTitle: lastSyncTitle,
              rootName: opts.rootName || '',
              depth: depth,
              expandDepth: depth
            });
            return applySkaPayloadToUI(payload).then(function (applied) {
              var rowCount = getSkaExpectedTotal(payload);
              recordWafRuntimeProof('loadBomViaWafSession-ok', {
                rows: rowCount,
                expandVariant: WAF_EXPAND_VARIANT,
                rootId: opts.rootId
              });
              w.__BOM_WAF_EBOM_RUNTIME__ = w.__BOM_WAF_EBOM_RUNTIME__ || {};
              w.__BOM_WAF_EBOM_RUNTIME__.rows = rowCount;
              w.__BOM_WAF_EBOM_RUNTIME__.expandVariant = WAF_EXPAND_VARIANT;
              w.__BOM_WAF_EBOM_RUNTIME__.lastLoader = 'loadBomViaWafSession';
              try {
                console.info('[BOM Analytics] wafdata-session rows=' + rowCount);
              } catch (eRows) {}
              return applied;
            });
          });
            });
        });
      })
      .catch(function (err) {
        if (opts.source === 'LAST_GOOD_CONTEXT') {
          return Promise.reject(err);
        }
        var normalized = normalizeSkaError(err);
        renderEmptySkaState(normalized.code === 'ROOT_NOT_FOUND' ? 'ROOT_NOT_FOUND' : 'ERROR', {
          contextMeta: lastContextMeta,
          errorCode: normalized.code || 'WAF_SESSION_FAILED',
          statusMessage: err.message || normalized.message,
          statusKind: 'error',
          bannerMessage: err.message || normalized.message,
          preserveGoodState: true
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

  function fetchStructureRoot(opts) {
    opts = opts || {};
    return fetch(STRUCTURE_ROOT_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rootId: opts.rootId,
        expandDepth: opts.expandDepth || 1,
        includeRoot: opts.includeRoot !== false,
        pageSize: opts.pageSize || 100,
        cursor: opts.cursor || null
      })
    }).then(function (response) {
      return response.text().then(function (text) {
        return parseSkaHttpResponse(response, text);
      });
    });
  }

  function fetchStructureChildren(opts) {
    opts = opts || {};
    return fetch(STRUCTURE_CHILDREN_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rootId: opts.rootId || '',
        parentReferenceId: opts.parentReferenceId,
        parentInstanceId: opts.parentInstanceId || '',
        path: opts.path || [],
        expandDepth: opts.expandDepth || 1,
        pageSize: opts.pageSize || 100,
        cursor: opts.cursor || null
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
    /* Payload paginado: count mismatch e esperado — nao validar */
    if (isPayloadPaginated(payload)) return true;
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
    var line = formatDsengCountLine(w.__bomSkaLastPayload, total);
    var syncMeta = w.__bomSkaLastPayload.__skaSyncMeta || {};
    var mode = getScopeModeFromPayload(w.__bomSkaLastPayload);
    var extra =
      mode === 'root' &&
      syncMeta.selectionSource !== 'DS/Selection/Selection.getSelection' &&
      syncMeta.selectionSource !== 'PlatformAPI.getSelection' &&
      syncMeta.source !== 'ADVANCED_MANUAL'
        ? ' · Explorer visual pode diferir do recorte dseng'
        : '';
    pager.textContent = line + extra;
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
    var isWafPayload =
      payload.source === DATA_SOURCE ||
      syncMeta.dataSource === DATA_SOURCE ||
      syncMeta.eventType === 'wafdata-expand' ||
      isWafSessionMode();
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
        ' · selecao PSE nao disponivel por API oficial; usando root atual · Product Explorer expandido pode listar mais objetos do que o depth carregado';
    } else if (payloadMode === 'root') {
      selectionNote = ' · root depth parcial · Explorer expandido pode listar mais objetos';
    } else if (payloadMode === 'selected-branch') {
      selectionNote = ' · ramo selecionado via API oficial';
    } else if (payloadMode === 'dashboard-row') {
      selectionNote = ' · expansao incremental por linha na dashboard';
    } else if (payloadMode === 'global') {
      selectionNote = ' · expansao global de todos os ramos carregados';
    }
    var summary;
    if (isWafPayload) {
      var rawRows = syncMeta.rawRows || (diag.rawRows != null ? diag.rawRows : expected);
      summary =
        'Fonte: wafdata-session · expand: ' +
        (syncMeta.expandVariant || diag.expandVariant || WAF_EXPAND_VARIANT) +
        ' · linhas: ' +
        expected +
        (rawRows !== expected ? ' · rawRows=' + rawRows : '') +
        ' · VALID';
    } else {
      summary =
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
    }
    var detail =
      (isWafPayload ? 'dataSource=' + DATA_SOURCE + ' | ' : '') +
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
    if (isPayloadPaginated(payload)) {
      var totalKnown = (payload.counts && payload.counts.totalKnownRows) || '?';
      var pager = byId('tablePager');
      if (pager) {
        pager.textContent = expected + ' de ' + totalKnown + ' linhas (parcial)';
      }
    }
    renderSkaKpiSummary(payload);
    renderSkaDiagnostics(payload, false);
    updateSyncBanner(payload);
    syncBuild();
    patchUiLabels();
    if (!assertSkaCountIntegrity(payload)) return false;
    try {
      persistLastGoodContext(payload, {
        rootId: (payload.root && payload.root.id) || lastSyncRootId,
        rootTitle: (payload.root && payload.root.title) || lastSyncTitle,
        depth: lastSyncDepth,
        expandDepth: lastSyncDepth
      });
    } catch (persistErr) {
      logWaf('persistLastGoodContext skipped: ' + (persistErr && persistErr.message));
    }
    scheduleSkaUiReapply(payload);
    if (payload.source === DATA_SOURCE || (payload.__skaSyncMeta && payload.__skaSyncMeta.dataSource === DATA_SOURCE)) {
      try {
        console.info('[BOM Analytics] wafdata-session rows=' + expected);
      } catch (logErr) {}
      setStatus('E-BOM carregada via wafdata-session — ' + expected + ' linhas.', 'ok');
    }
    return true;
  }

  function logWaf(msg) {
    try {
      console.log('[BOM wafdata-session]', msg);
    } catch (e) {}
  }

  function applySkaPayloadToUI(payload) {
    var items = prepareSkaRowsForSnapshot(payload);
    var expected = getSkaExpectedTotal(payload);
    var paginated = isPayloadPaginated(payload);

    if (!items.length) {
      return Promise.reject(new Error('SKA BOM Service retornou 0 linhas.'));
    }

    /* Payload nao paginado: validar contagem estrita */
    if (!paginated && items.length !== expected) {
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
        /* Para payload paginado, COUNT_MISMATCH e esperado — nao rejeitar */
        if (!paginated) {
          return Promise.reject(new Error('COUNT_MISMATCH'));
        }
      }
      if (paginated) {
        renderLoadMoreIndicator(payload);
      }
      return payload;
    });
  }

  function renderLoadMoreIndicator(payload) {
    var page = payload && payload.page;
    if (!page || !page.hasMore) return;
    var totalKnown = (payload.counts && payload.counts.totalKnownRows) || '?';
    var returned = page.returned || (payload.rows && payload.rows.length) || 0;
    var nextCursor = page.nextCursor || '';
    var rootId = (payload.root && payload.root.id) || (payload.scope && payload.scope.rootId) || '';

    /* Mostrar banner informativo de paginacao */
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.remove('bom-hidden');
      banner.innerHTML = escapeHtml(
        'Estrutura parcial: ' + returned + ' de ' + totalKnown + ' linhas carregadas. ' +
        'Clique em "Carregar mais" para continuar.'
      );
      banner.classList.add('bom-banner-info');
      banner.classList.remove('bom-banner-warn', 'bom-banner-error');
    }

    /* Adicionar/atualizar botao Carregar mais */
    var loadMoreId = 'btnLoadMoreRows';
    var existing = byId(loadMoreId);
    if (existing) existing.parentNode && existing.parentNode.removeChild(existing);

    var btn = document.createElement('button');
    btn.id = loadMoreId;
    btn.className = 'bom-btn bom-btn-secondary bom-load-more-btn';
    btn.textContent = 'Carregar mais (' + returned + '/' + totalKnown + ')';
    btn.setAttribute('data-cursor', nextCursor);
    btn.setAttribute('data-root-id', rootId);
    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Carregando…';
      var cursor = btn.getAttribute('data-cursor');
      var rId = btn.getAttribute('data-root-id');
      if (!rId || !cursor) {
        btn.textContent = 'Erro: cursor invalido';
        return;
      }
      w.fetchStructureRoot({
        rootId: rId,
        pageSize: 100,
        cursor: cursor,
        expandDepth: 1,
        includeRoot: false
      }).then(function (nextPayload) {
        if (nextPayload && nextPayload.rows && nextPayload.rows.length) {
          /* Mesclar rows na payload atual e reaplicar */
          var merged = JSON.parse(JSON.stringify(w.__bomSkaLastPayload || {}));
          merged.rows = (merged.rows || []).concat(nextPayload.rows);
          merged.page = nextPayload.page;
          merged.counts = nextPayload.counts || merged.counts;
          if (merged.counts) {
            merged.counts.totalRows = merged.rows.length;
            merged.counts.returnedRows = merged.rows.length;
          }
          w.__bomSkaLastPayload = merged;
          btn.parentNode && btn.parentNode.removeChild(btn);
          return applySkaPayloadToUI(merged);
        }
        btn.textContent = 'Sem mais linhas';
        btn.disabled = true;
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Erro ao carregar — tentar novamente';
        setStatus('Erro ao carregar mais linhas: ' + (err && err.message || err), 'error');
      });
    };

    /* Inserir botao no pager ou após a tabela */
    var pager = byId('tablePager');
    var tableSection = byId('tableSection') || byId('bomTableWrapper');
    if (pager && pager.parentNode) {
      pager.parentNode.insertBefore(btn, pager.nextSibling);
    } else if (tableSection) {
      tableSection.appendChild(btn);
    }
  }

  function suggestKnownRootIfApplicable(ctx) {
    ctx = ctx || {};
    var idEl = byId('explorerObjectId');
    if (!idEl || s(idEl.value)) return false;
    var title = s(ctx.title || ctx.name || lastSyncTitle || '');
    if (title.indexOf(KNOWN_ROOT_TITLE_HINT) < 0) return false;
    idEl.value = KNOWN_ROOT_ID;
    setStatus(
        'Modo wafdata-session: Product Explorer nao forneceu rootId dseng para a estrutura atual. Selecione/expanda a estrutura no Explorer e clique Atualizar estrutura novamente.',
      'info'
    );
    return true;
  }

  function updateExplorerContextStatus(ctx) {
    var el = byId('explorerContextStatus');
    if (!el) return;
    ctx = ctx || (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext()) || {};
    var saved = loadLastGoodContext();
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
    /* Avancado so recebe rootId se contexto atual tiver ID dseng valido */
    if (adv && ctx.rootId && isValidDsengPhysicalId(ctx.rootId) && !s(adv.value)) adv.value = ctx.rootId;
  }

  function getDepthFromInput() {
    var el = byId('skaDepthInput');
    var d = el ? Number(el.value) : DEFAULT_DEPTH;
    return isFinite(d) && d > 0 ? d : DEFAULT_DEPTH;
  }

  function resolveRootForBomLoad(opts) {
    opts = opts || {};
    var ctx =
      opts.ctx ||
      (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext && w.ProductExplorerSyncProvider.getContext()) ||
      {};
    var manual = opts.ignoreManual ? '' : s(opts.manualRootId || (byId('explorerObjectId') && byId('explorerObjectId').value));
    var depth = opts.depth != null ? opts.depth : getDepthFromInput();
    var saved = opts.allowLastGoodFallback === true ? loadLastGoodContext() : null;
    var title = s(ctx.title || ctx.name || ctx.productName || lastSyncTitle);

    if (manual && isValidDsengPhysicalId(manual)) {
      return {
        ok: true,
        rootId: manual,
        depth: depth,
        title: s(ctx.title) || lastSyncTitle || (saved && saved.rootTitle) || '',
        source: 'ADVANCED_MANUAL',
        useResolveSelection: false,
        saved: saved
      };
    }

    if (isValidDsengPhysicalId(ctx.rootId)) {
      return {
        ok: true,
        rootId: s(ctx.rootId),
        depth: depth,
        title: title || lastSyncTitle,
        source: ctx.source || 'PRODUCT_EXPLORER_CONTEXT',
        useResolveSelection: false,
        saved: saved
      };
    }

    var knownRegistry = opts.allowKnownRootFallback === true ? resolveKnownExplorerRoot(ctx) : null;
    if (knownRegistry && isValidDsengPhysicalId(knownRegistry.rootId)) {
      return {
        ok: true,
        rootId: knownRegistry.rootId,
        depth: depth,
        title: knownRegistry.title || title || lastSyncTitle,
        source: knownRegistry.source || 'EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT',
        useResolveSelection: false,
        expansionAvailable: true,
        saved: saved
      };
    }

    var prdHint = s(ctx.physicalId || ( /^prd-/i.test(s(ctx.rootId)) ? ctx.rootId : ''));
    if (prdHint && /^prd-/i.test(prdHint) && isWafSessionMode()) {
      return {
        ok: false,
        needsWafUqlResolve: true,
        physicalId: prdHint,
        rootId: prdHint,
        depth: depth,
        title: title || s(ctx.title || ctx.name) || lastSyncTitle,
        rootName: s(ctx.name || ctx.rootName),
        source: 'PRODUCT_EXPLORER_PRD',
        useResolveSelection: false,
        saved: saved
      };
    }

    /* allowKnownRootFallback por titulo removido — sem fallback hardcoded por projeto */

    var pseNorm = normalizeCandidateRootId(ctx, '');
    if (pseNorm.ok) {
      return {
        ok: true,
        rootId: pseNorm.rootId,
        depth: depth,
        title: pseNorm.title || lastSyncTitle,
        source: pseNorm.source || 'PRODUCT_EXPLORER_CONTEXT',
        useResolveSelection: false,
        saved: saved
      };
    }

    var hasPseHints =
      !!s(ctx.title) ||
      !!s(ctx.name) ||
      !!s(ctx.selectedId) ||
      (ctx.selectedCandidates && ctx.selectedCandidates.length);
    if (hasPseHints && opts.allowResolveSelection !== false && !opts.preferSaved) {
      return {
        ok: false,
        rootId: '',
        depth: depth,
        title: s(ctx.title) || s(ctx.name) || lastSyncTitle,
        source: 'RESOLVE_SELECTION',
        useResolveSelection: true,
        saved: saved,
        pseNorm: pseNorm
      };
    }

    if (opts.allowLastGoodFallback === true && saved && isValidDsengPhysicalId(saved.rootId)) {
      return {
        ok: true,
        rootId: saved.rootId,
        depth: saved.depth || depth,
        expandDepth: saved.expandDepth || saved.depth || depth,
        title: saved.rootTitle || lastSyncTitle,
        rootName: saved.rootName || '',
        source: 'LAST_GOOD_CONTEXT',
        useResolveSelection: false,
        saved: saved,
        fallbackWarning:
          'Product Explorer não forneceu rootId dseng oficial. Usando último root válido salvo: ' +
          (saved.rootTitle || saved.rootId) +
          '.'
      };
    }

    return {
      ok: false,
      rootId: '',
      depth: depth,
      title: pseNorm.title || lastSyncTitle,
      source: 'NONE',
      useResolveSelection: false,
      saved: saved,
      pseNorm: pseNorm
    };
  }

  function loadBomViaStructureWithRoot(opts) {
    opts = opts || {};
    if (isWafSessionMode()) {
      return loadBomViaWafSession(opts);
    }
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    if (!opts.rootId || !isValidDsengPhysicalId(opts.rootId)) {
      if (syncBtn) syncBtn.disabled = false;
      if (refreshBtn) refreshBtn.disabled = false;
      return Promise.reject(new Error('ROOT_ID_REQUIRED'));
    }

    clearStateBeforeSkaApply();
    w.__BOM_SKA_EMPTY_STATE__ = false;
    if (!opts.silent) setStatus('Carregando E-BOM via Render / SKA BOM Service (structure/root)…', 'info');

    return fetchStructureRoot({
      rootId: opts.rootId,
      expandDepth: opts.expandDepth == null ? (opts.depth == null ? DEFAULT_DEPTH : opts.depth) : opts.expandDepth,
      includeRoot: opts.includeRoot !== false,
      pageSize: 100
    })
      .then(function (payload) {
        lastSyncRootId = opts.rootId;
        lastSyncDepth = opts.depth == null ? DEFAULT_DEPTH : opts.depth;
        lastSyncTitle = (payload.root && payload.root.title) || opts.title || '';
        payload.__skaSyncMeta = {
          source: opts.source || 'STRUCTURE_ROOT',
          eventType: 'structure-root',
          rootId: opts.rootId,
          depth: opts.depth,
          lastSyncAt: new Date().toISOString(),
          validationStatus: 'VALID',
          fallbackWarning: opts.fallbackWarning || ''
        };
        lastContextMeta = {
          source: opts.source || 'STRUCTURE',
          title: lastSyncTitle,
          candidateRootId: opts.rootName || opts.title || opts.rootId,
          rootIdUsed: opts.rootId,
          validationStatus: 'VALID',
          fallbackWarning: opts.fallbackWarning || ''
        };
        if (opts.fallbackWarning) showFallbackBanner(opts.fallbackWarning);
        resetDynamicState(payload, opts.depth > 1 ? 'depth-' + opts.depth : 'initial', {
          manualRootId: opts.rootId
        });
        persistLastGoodContext(payload, {
          rootId: opts.rootId,
          rootTitle: lastSyncTitle,
          rootName: opts.rootName || '',
          depth: opts.depth,
          expandDepth: opts.expandDepth
        });
        return applySkaPayloadToUI(payload);
      })
      .catch(function (err) {
        if (opts.source === 'LAST_GOOD_CONTEXT') {
          return Promise.reject(err);
        }
        return tryLoadFromLastGoodContext({ silent: opts.silent }, err, 'structure falhou').then(function (loaded) {
          if (loaded) return loaded;
          var normalized = normalizeSkaError(err);
          renderEmptySkaState(normalized.code === 'ROOT_NOT_FOUND' ? 'ROOT_NOT_FOUND' : 'ERROR', {
            contextMeta: lastContextMeta,
            errorCode: normalized.code,
            statusMessage: normalized.message,
            statusKind: 'error',
            bannerMessage: normalized.message,
            preserveGoodState: true
          });
          return Promise.reject(err);
        });
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

  function tryLoadFromLastGoodContext(opts, priorErr, reason) {
    opts = opts || {};
    var saved = loadLastGoodContext();
    if (!saved || !isValidDsengPhysicalId(saved.rootId)) {
      if (priorErr) return Promise.reject(priorErr);
      return Promise.resolve(null);
    }
    if (hasRenderableSkaPayload() && lastSyncRootId === saved.rootId) {
      return Promise.resolve(w.__bomSkaLastPayload);
    }
    var warning =
      'Product Explorer não forneceu rootId dseng oficial. Usando último root válido salvo: ' +
      (saved.rootTitle || saved.rootId) +
      (reason ? ' (' + reason + ').' : '.');
    applyLastGoodContextToUi(saved, warning);
    if (!opts.silent) setStatus(warning, 'info');
    return loadBomViaStructureWithRoot({
      rootId: saved.rootId,
      depth: saved.depth || getDepthFromInput(),
      expandDepth: saved.expandDepth || saved.depth || getDepthFromInput(),
      source: 'LAST_GOOD_CONTEXT',
      title: saved.rootTitle,
      rootName: saved.rootName || '',
      silent: opts.silent,
      fallbackWarning: warning
    }).catch(function (err) {
      if (priorErr) return Promise.reject(priorErr);
      return Promise.reject(err);
    });
  }

  function loadBomWithRootResolution(opts) {
    opts = opts || {};
    var resolved = resolveRootForBomLoad(opts);

    if (resolved.useResolveSelection) {
      return loadBomViaResolveSelection(opts).catch(function (err) {
        if (opts.allowLastGoodFallback !== true) return Promise.reject(err);
        return tryLoadFromLastGoodContext(opts, err, 'resolve-selection falhou');
      });
    }

    if (resolved.needsWafUqlResolve && w.__waf3dxClient && w.__waf3dxClient.resolveEngItemRootId) {
      if (!opts.silent) {
        setStatus('Resolvendo prd-* → dseng:EngItem via UQL search (WAFData)…', 'info');
      }
      return w.__waf3dxClient
        .resolveEngItemRootId({
          physicalId: resolved.physicalId || resolved.rootId,
          title: resolved.title,
          name: resolved.rootName || ''
        })
        .then(function (uql) {
          if (!uql.ok) {
            if (opts.allowLastGoodFallback !== true) {
              return Promise.reject(new Error(uql.error || 'UQL resolve failed'));
            }
            return tryLoadFromLastGoodContext(opts, new Error(uql.error || 'UQL resolve failed'), 'UQL falhou');
          }
          var idEl = byId('explorerObjectId');
          if (idEl) idEl.value = uql.rootId;
          return loadBomViaStructureWithRoot({
            rootId: uql.rootId,
            depth: resolved.depth,
            expandDepth: resolved.expandDepth || resolved.depth,
            source: uql.source || resolved.source || 'WAF_UQL_RESOLVE',
            title: uql.title || resolved.title,
            rootName: uql.name || resolved.rootName || '',
            silent: opts.silent,
            fallbackWarning:
              'prd ' +
              (uql.physicalId || resolved.physicalId) +
              ' → dseng ' +
              uql.rootId +
              ' (' +
              (uql.source || 'UQL') +
              ')'
          });
        })
        .catch(function (err) {
          if (opts.allowLastGoodFallback !== true) return Promise.reject(err);
          return tryLoadFromLastGoodContext(opts, err, 'UQL resolve exception');
        });
    }

    if (resolved.ok && resolved.rootId) {
      return loadBomViaStructureWithRoot({
        rootId: resolved.rootId,
        depth: resolved.depth,
        expandDepth: resolved.expandDepth || resolved.depth,
        source: resolved.source,
        title: resolved.title,
        rootName: resolved.rootName || '',
        silent: opts.silent,
        fallbackWarning: resolved.fallbackWarning || ''
      });
    }

    var fallbackAttempt =
      opts.allowLastGoodFallback === true
        ? tryLoadFromLastGoodContext(opts, null, 'contexto sem rootId')
        : Promise.resolve(null);
    return fallbackAttempt.then(function (loaded) {
      if (loaded) return loaded;
      var msg =
        'Contexto sem rootId dseng válido. Informe Root Physical ID em Avançado ou sincronize com estrutura válida no Product Explorer.';
      renderEmptySkaState('CONTEXT_INVALID', {
        contextMeta: lastContextMeta || resolved.pseNorm || {},
        preserveGoodState: false,
        skipLastGoodRetry: true,
        title: resolved.title,
        statusMessage: msg,
        statusKind: 'error',
        bannerMessage: msg
      });
      return Promise.reject(new Error('ROOT_UNRESOLVED'));
    });
  }

  function bootLoadFromContextOrPersisted() {
    if (hasRenderableSkaPayload()) return;
    renderInitialEmptyState();
  }

  function resolveSyncParams(opts) {
    opts = opts || {};
    var ctx =
      (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext && w.ProductExplorerSyncProvider.getContext()) ||
      {};
    var manual = opts.forceManual ? s(byId('explorerObjectId') && byId('explorerObjectId').value) : '';
    if (!manual && opts.advancedOnly) manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
    var norm = normalizeCandidateRootId(ctx, manual);
    if (!norm.ok && !manual && opts.allowLastGoodFallback === true) {
      var saved = loadLastGoodContext();
      if (saved && isValidDsengPhysicalId(saved.rootId)) {
        norm = normalizeCandidateRootId({ title: saved.rootTitle }, saved.rootId);
        norm.source = 'LAST_GOOD_CONTEXT';
      } else if (lastSyncRootId && isValidDsengPhysicalId(lastSyncRootId)) {
        norm = normalizeCandidateRootId({}, lastSyncRootId);
        norm.source = 'LAST_SYNC';
      }
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
    if (isWafSessionMode()) {
      var params = resolveSyncParams({ forceManual: !!opts.forceManual, advancedOnly: !!opts.advancedOnly });
      if (!params.rootId || !params.validation || !params.validation.ok) {
        var invMsg = 'Informe um Root Physical ID dseng válido em Avançado.';
        renderEmptySkaState('CONTEXT_INVALID', {
          contextMeta: lastContextMeta,
          title: params.title,
          statusMessage: invMsg,
          statusKind: 'error',
          bannerMessage: invMsg,
          preserveGoodState: true
        });
        return Promise.reject(new Error('CONTEXT_INVALID'));
      }
      return loadBomViaWafSession({
        rootId: params.rootId,
        depth: params.depth,
        source: params.source || 'ADVANCED_MANUAL',
        title: params.title,
        silent: opts.silent
      });
    }
    var params = resolveSyncParams({ forceManual: true, advancedOnly: true });
    if (!params.rootId || !params.validation || !params.validation.ok) {
      var invMsg = 'Informe um Root Physical ID dseng válido em Avançado.';
      renderEmptySkaState('CONTEXT_INVALID', {
        contextMeta: lastContextMeta,
        title: params.title,
        statusMessage: invMsg,
        statusKind: 'error',
        bannerMessage: invMsg,
        preserveGoodState: true
      });
      return Promise.reject(new Error('CONTEXT_INVALID'));
    }
    return loadBomViaStructureWithRoot({
      rootId: params.rootId,
      depth: params.depth,
      expandDepth: params.depth,
      source: params.source || 'ADVANCED_MANUAL',
      title: params.title,
      silent: opts.silent
    });
  }

  function loadBomViaResolveSelection(opts) {
    opts = opts || {};
    if (isWafSessionMode()) {
      var wafCtx =
        opts.ctx ||
        (w.ProductExplorerSyncProvider &&
          w.ProductExplorerSyncProvider.getContext &&
          w.ProductExplorerSyncProvider.getContext()) ||
        {};
      var resolved = resolveRootForBomLoad({
        allowResolveSelection: false,
        ctx: wafCtx,
        ignoreManual: opts.ignoreManual !== false,
        allowLastGoodFallback: opts.allowLastGoodFallback === true,
        allowKnownRootFallback: opts.allowKnownRootFallback === true
      });
      if (resolved.ok && resolved.rootId) {
        return loadBomViaWafSession({
          rootId: resolved.rootId,
          depth: resolved.depth,
          expandDepth: resolved.expandDepth || resolved.depth,
          source: resolved.source || 'PRODUCT_EXPLORER_CONTEXT',
          title: resolved.title,
          rootName: resolved.rootName || '',
          silent: opts.silent,
          fallbackWarning: resolved.fallbackWarning || '',
          knownRootFallback: !!resolved.knownRootFallback
        });
      }
      if (resolved.needsWafUqlResolve) {
        return loadBomViaWafSession({
          rootId: resolved.physicalId || resolved.rootId,
          depth: resolved.depth,
          expandDepth: resolved.expandDepth || resolved.depth,
          source: resolved.source || 'PRODUCT_EXPLORER_PRD',
          title: resolved.title,
          rootName: resolved.rootName || '',
          silent: opts.silent
        });
      }
      var wafMsg =
        'Modo wafdata-session: Product Explorer nao forneceu rootId dseng para a estrutura atual. Selecione/expanda a estrutura no Explorer e clique Atualizar estrutura novamente.';
      if (opts.allowKnownRootFallback === true) suggestKnownRootIfApplicable(wafCtx);
      renderEmptySkaState('SELECTION_NOT_RESOLVED', {
        contextMeta: lastContextMeta,
        statusMessage: wafMsg,
        statusKind: 'error',
        bannerMessage: wafMsg,
        preserveGoodState: false,
        skipLastGoodRetry: true
      });
      return Promise.reject(new Error('SELECTION_NOT_RESOLVED'));
    }
    opts = opts || {};
    var syncBtn = byId('btnSyncExplorer');
    var refreshBtn = byId('btnRefreshBom');
    if (syncBtn) syncBtn.disabled = true;
    if (refreshBtn) refreshBtn.disabled = true;

    var manual = opts.forceManual ? s(byId('explorerObjectId') && byId('explorerObjectId').value) : '';
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
        persistLastGoodContext(payload, {
          rootId: resolvedRoot,
          rootTitle: lastSyncTitle,
          rootName: selectionPayload.normalized.name || '',
          depth: depth,
          expandDepth: depth
        });
        return applySkaPayloadToUI(payload);
      })
      .catch(function (err) {
        if (opts.allowLastGoodFallback !== true) {
          var normalizedNoFallback = normalizeSkaError(err);
          var codeNoFallback = normalizedNoFallback.code || '';
          var errPayloadNoFallback = err && err.payload ? err.payload : null;
          renderEmptySkaState(codeNoFallback === 'SELECTION_NOT_RESOLVED' ? 'SELECTION_NOT_RESOLVED' : 'ERROR', {
            contextMeta: lastContextMeta,
            errorCode: codeNoFallback,
            statusMessage: normalizedNoFallback.message,
            statusKind: 'error',
            bannerMessage: normalizedNoFallback.message,
            preserveGoodState: false,
            skipLastGoodRetry: true
          });
          if (codeNoFallback === 'SELECTION_NOT_RESOLVED') {
            renderSelectionNotResolved(errPayloadNoFallback, lastContextMeta);
          }
          return Promise.reject(err);
        }
        return tryLoadFromLastGoodContext(opts, err, 'resolve-selection falhou').then(function (loaded) {
          if (loaded) return loaded;
          var normalized = normalizeSkaError(err);
          var code = normalized.code || '';
          var errPayload = err && err.payload ? err.payload : null;
          renderEmptySkaState(code === 'SELECTION_NOT_RESOLVED' ? 'SELECTION_NOT_RESOLVED' : 'ERROR', {
            contextMeta: lastContextMeta,
            errorCode: code,
            statusMessage: normalized.message,
            statusKind: 'error',
            bannerMessage: normalized.message,
            preserveGoodState: true
          });
          if (code === 'SELECTION_NOT_RESOLVED') {
            renderSelectionNotResolved(errPayload, lastContextMeta);
          }
          return Promise.reject(err);
        });
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
    return loadBomWithRootResolution(opts);
  }

  function syncWithProductExplorer(opts) {
    opts = opts || {};
    if (!w.ProductExplorerSyncProvider || !w.ProductExplorerSyncProvider.refresh) {
      return loadBomWithRootResolution(opts);
    }
    return w.ProductExplorerSyncProvider.refresh('manual-sync').then(function (ctx) {
      updateExplorerContextStatus(ctx);
      lastContextMeta = {
        source: ctx.source || 'PRODUCT_EXPLORER_CONTEXT',
        title: ctx.title,
        candidateRootId: ctx.selectedId || ctx.physicalId || ctx.rootId,
        rootIdUsed: isValidDsengPhysicalId(ctx.rootId) ? ctx.rootId : '',
        validationStatus: isValidDsengPhysicalId(ctx.rootId) ? 'VALID' : 'RESOLVE_PENDING'
      };
      return loadBomWithRootResolution({
        ctx: ctx,
        silent: opts.silent,
        ignoreManual: true,
        allowLastGoodFallback: false,
        allowKnownRootFallback: false
      });
    });
  }

  function refreshBom() {
    if (isWafSessionMode()) {
      if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.refresh) {
        return w.ProductExplorerSyncProvider.refresh('manual-refresh').then(function (ctx) {
          updateExplorerContextStatus(ctx);
          return loadBomWithRootResolution({
            ctx: ctx,
            ignoreManual: true,
            allowLastGoodFallback: false,
            allowKnownRootFallback: false
          });
        });
      }
      return loadBomWithRootResolution({
        ignoreManual: true,
        allowLastGoodFallback: false,
        allowKnownRootFallback: false
      });
    }
    if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.refresh) {
      return w.ProductExplorerSyncProvider.refresh('manual-refresh').then(function (ctx) {
        updateExplorerContextStatus(ctx);
        if (ctx && ctx.selectionMode === 'selected-branch') {
          return loadBomViaResolveSelection({
            payloadMode: 'selected-branch',
            ctx: ctx,
            ignoreManual: true,
            allowLastGoodFallback: false,
            allowKnownRootFallback: false
          });
        }
        return loadBomWithRootResolution({
          ctx: ctx,
          ignoreManual: true,
          allowLastGoodFallback: false,
          allowKnownRootFallback: false
        });
      });
    }
    return loadBomWithRootResolution({
      ignoreManual: true,
      allowLastGoodFallback: false,
      allowKnownRootFallback: false
    });
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
      advanced.classList.remove('bom-hidden');
      advanced.removeAttribute('hidden');
      advanced.style.display = '';
    }
    if (w.__waf3dxClient && w.__waf3dxClient.ensureAdvancedVisible) {
      w.__waf3dxClient.ensureAdvancedVisible();
    }
    var nextBtn = byId('btnLoadNextLevel');
    if (nextBtn) {
      nextBtn.classList.add('bom-hidden');
      nextBtn.style.display = 'none';
    }
  }

  function reapplySkaUiChrome(payload) {
    payload = payload || w.__bomSkaLastPayload;
    if (!payload || w.__BOM_DATA_SOURCE__ !== DATA_SOURCE) return;
    hideEndUserChrome();
    applyRightPanelState();
    renderSkaKpiSummary(payload);
    renderSkaDiagnostics(payload);
    updateTablePager(getSkaExpectedTotal(payload));
    apply3dxProductDashboardLayout();
    var expected = getSkaExpectedTotal(payload);
    var statusEl = byId('statusBar');
    if (statusEl) {
      statusEl.textContent = formatDsengCountLine(payload, expected) + ' · Explorer visual pode diferir do recorte dseng';
      statusEl.className = 'bom-st bom-st-ok';
    }
  }

  function scheduleSkaUiReapply(payload) {
    reapplySkaUiChrome(payload);
    [120, 400, 900].forEach(function (ms) {
      setTimeout(function () {
        reapplySkaUiChrome(payload);
      }, ms);
    });
  }

  function neutralizeLayoutFitFor3dx() {
    if (!w.LayoutFit || w.LayoutFit.__BOM_3DX_LAYOUT_PATCHED__) return;
    var origApply = w.LayoutFit.apply;
    w.LayoutFit.apply = function () {
      var page = uiRoot().querySelector && uiRoot().querySelector('.bom-layout-page.bom-3dx-product-dashboard');
      if (page) {
        apply3dxProductDashboardLayout();
        if (w.ChartsManager && w.ChartsManager.scheduleResize) {
          try {
            w.ChartsManager.scheduleResize();
          } catch (e) {}
        }
        return;
      }
      return origApply.apply(this, arguments);
    };
    w.LayoutFit.__BOM_3DX_LAYOUT_PATCHED__ = true;
  }

  function apply3dxProductDashboardLayout() {
    /* Layout controlado inteiramente pelo CSS (grid-template-areas).
     * Esta funcao nao reescreve gridTemplateColumns, gridTemplateRows,
     * nem aplica padding ou height fixo nas zonas.
     * Apenas dispara resize dos graficos apos qualquer reflow. */
    if (w.ChartsManager && w.ChartsManager.scheduleResize) {
      try { w.ChartsManager.scheduleResize(); } catch (e) {}
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
    if (badge) badge.textContent = isWafSessionMode() ? 'Fonte: WAFData session / dseng' : 'Fonte: SKA BOM Service / dseng';
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
    if (w.__waf3dxClient && w.__waf3dxClient.installExecutorUi) {
      w.__waf3dxClient.installExecutorUi();
    }
    if (w.__waf3dxClient && w.__waf3dxClient.installDiagnosticUi) {
      w.__waf3dxClient.installDiagnosticUi();
    }
  }

  function bindSyncButtons() {
    reassertWafSessionOwnership();
    bindSyncButtonsForce();
  }

  function bindSyncButtonsForce() {
    function wireButton(id, handler) {
      var old = byId(id);
      if (!old || !old.parentNode) return;
      if (old.__BOM_WAF_SYNC_WIRED__ === RELEASE_COMMIT) return;
      var clone = old.cloneNode(true);
      clone.__BOM_WAF_SYNC_WIRED__ = RELEASE_COMMIT;
      old.parentNode.replaceChild(clone, old);
      clone.addEventListener(
        'click',
        function (ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          }
          handler();
        },
        true
      );
    }
    wireButton('btnSyncExplorer', function () {
      recordWafRuntimeProof('sync-button', 'syncWithProductExplorer');
      syncWithProductExplorer().catch(function (err) {
        recordWafRuntimeProof('sync-error', err && err.message);
      });
    });
    wireButton('btnRefreshBom', function () {
      recordWafRuntimeProof('refresh-button', 'refreshBom');
      refreshBom().catch(function (err) {
        recordWafRuntimeProof('refresh-error', err && err.message);
      });
    });
  }

  function recordWafRuntimeProof(stage, detail) {
    var proof = w.__BOM_WAF_EBOM_RUNTIME__ || {};
    proof.build = BUILD;
    proof.releaseCommit = RELEASE_COMMIT;
    proof.dataSource = DATA_SOURCE;
    proof.stage = stage;
    proof.detail = detail;
    proof.at = new Date().toISOString();
    proof.loadViaExplorerSync = w.loadViaExplorerSync === syncWithProductExplorer ? 'syncWithProductExplorer' : String(w.loadViaExplorerSync);
    proof.refreshBomFromSka = w.refreshBomFromSka === refreshBom ? 'refreshBom' : String(w.refreshBomFromSka);
    w.__BOM_WAF_EBOM_RUNTIME__ = proof;
    renderWafRuntimeProof(proof);
    try {
      console.info('[BOM Analytics] waf-ebom-runtime', stage, detail || '');
    } catch (eLog) {}
  }

  function renderWafRuntimeProof(proof) {
    proof = proof || w.__BOM_WAF_EBOM_RUNTIME__ || {};
    var el = byId('wafEbomRuntimeProof');
    if (!el) return;
    el.textContent =
      'cache=' +
      (proof.releaseCommit || RELEASE_COMMIT) +
      ' | source=' +
      (proof.dataSource || DATA_SOURCE) +
      ' | loader=' +
      (proof.lastLoader || proof.stage || 'boot') +
      (proof.rows != null ? ' | rows=' + proof.rows : '') +
      (proof.expandVariant ? ' | expand=' + proof.expandVariant : '');
  }

  function mountWafRuntimeProofPanel() {
    var host = byId('bomRulesPanel');
    if (!host || host.querySelector('#wafEbomRuntimeProof')) return;
    var box = document.createElement('div');
    box.id = 'wafEbomRuntimeProofWrap';
    box.className = 'bom-waf-ebom-proof-wrap';
    box.innerHTML =
      '<p class="bom-waf-ebom-proof-title"><strong>Runtime E-BOM</strong></p>' +
      '<p id="wafEbomRuntimeProof" class="bom-waf-ebom-proof-line">cache=' +
      RELEASE_COMMIT +
      ' | source=wafdata-session | loader=boot</p>';
    host.insertBefore(box, host.firstChild);
    recordWafRuntimeProof('boot', 'hotfix-installed');
  }

  function reassertWafSessionOwnership() {
    if (!isWafSessionMode()) return;
    w.__BOM_DATA_SOURCE__ = DATA_SOURCE;
    w.__BOM_LOADER_MODE__ = DATA_SOURCE;
    w.__BOM_HOTFIX_MODE__ = DATA_SOURCE;
    w.loadViaExplorerSync = syncWithProductExplorer;
    w.refreshBomFromSka = refreshBom;
    w.loadViaSkaService = syncWithProductExplorer;
    if (typeof w.__bomRootStabilityLoad === 'function') {
      w.__bomRootStabilityLoad = function () {
        recordWafRuntimeProof('blocked-root-stability', 'delegated-to-waf');
        return syncWithProductExplorer();
      };
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
          msg = 'Build ' + BUILD + ' | SKA BOM Service — use Sincronizar com Product Explorer.';
          kind = kind === 'error' ? 'error' : 'ok';
        }
        if (w.__bomSkaLastPayload && w.__BOM_DATA_SOURCE__ === DATA_SOURCE) {
          if (/^Snapshot:/i.test(String(msg || '')) || /^Estrutura:/i.test(String(msg || ''))) {
            return;
          }
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
            scheduleSkaUiReapply(w.__bomSkaLastPayload);
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
          reassertWafSessionOwnership();
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
    neutralizeLayoutFitFor3dx();
    patchAppHooks();
    patchPartPreviewForSka();
    installExplorerSync();
    patchUiLabels();
    bindSyncButtons();
    patchOrchestrator();
    patchScanner();
    installResponsiveMode();
    installLabelGuard();
    setTimeout(bindSyncButtons, 400);
    setTimeout(function () {
      reassertWafSessionOwnership();
      bindSyncButtons();
      syncBuild();
      patchUiLabels();
      patchPartPreviewForSka();
      if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.refresh) {
        w.ProductExplorerSyncProvider.refresh('post-boot');
      }
      setTimeout(bootLoadFromContextOrPersisted, BOOT_CONTEXT_WAIT_MS);
    }, 1500);
    /* Boot limpo — não carrega lastGoodContext automaticamente.
     * Usuario deve clicar Sincronizar com Product Explorer. */
    renderInitialEmptyState();
    applyTopbarCompactLabels();
    bindTestRootButton();
    bindCopyContextDiagnosticsButton();
    mountWafRuntimeProofPanel();
    reassertWafSessionOwnership();
    setStatus('Build ' + BUILD + ' | cache ' + RELEASE_COMMIT + ' | wafdata-session', 'ok');
  }

  w.__BOM_ASSERT_WAF_EBOM__ = function () {
    return {
      ok: isWafSessionMode(),
      build: BUILD,
      releaseCommit: RELEASE_COMMIT,
      dataSource: w.__BOM_DATA_SOURCE__,
      loadViaExplorerSync: w.loadViaExplorerSync === syncWithProductExplorer,
      refreshBomFromSka: w.refreshBomFromSka === refreshBom,
      runtime: w.__BOM_WAF_EBOM_RUNTIME__ || null,
      defaultSpaceUrlDefined: typeof DEFAULT_SPACE_URL === 'string' && DEFAULT_SPACE_URL.length > 0
    };
  };

  w.__bomSkaServiceInstall = install;
  w.fetchBomStructureFromSkaService = fetchBomStructureFromSkaService;
  w.fetchStructureRoot = fetchStructureRoot;
  w.fetchStructureChildren = fetchStructureChildren;
  w.fetchResolveSelectionFromSkaService = fetchResolveSelectionFromSkaService;
  w.mapSkaRowsToImportItems = mapSkaRowsToImportItems;
  w.prepareSkaRowsForSnapshot = prepareSkaRowsForSnapshot;
  w.getSkaExpectedTotal = getSkaExpectedTotal;
  w.loadViaSkaService = syncWithProductExplorer;
  w.syncWithProductExplorer = syncWithProductExplorer;
  w.refreshBomFromSka = refreshBom;
  w.assertSkaCountIntegrity = assertSkaCountIntegrity;
  w.normalizeCandidateRootId = normalizeCandidateRootId;
  w.resolveRootForBomLoad = resolveRootForBomLoad;
  w.loadLastGoodContext = loadLastGoodContext;
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
  w.getActiveEbomRow = function () {
    return activeEbomRow;
  };

  /* install deferred — runtime calls __bomSkaServiceInstall */
})();
