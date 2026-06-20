/* BOM Analytics — root stability overlay for bom20260617d
 * Purpose: keep E-BOM stable when Product Explorer exposes only partial context.
 * No 3DPlay, no DOM scraping, no credentials in storage.
 */
(function (w) {
  'use strict';

  var BUILD = 'bom20260617d';
  var DATA_SOURCE = 'ska-bom-service';
  var SKA_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/structure';
  var RESOLVE_URL = 'https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection';
  var LAST_GOOD_CONTEXT_KEY = 'bomAnalytics:lastGoodContext:' + BUILD;
  var DEFAULT_SPACE_URL = 'https://r1132100929518-us1-space.3dexperience.3ds.com/enovia';
  var DEFAULT_DEPTH = 1;
  var installed = false;
  var lastRootId = '';
  var lastRootTitle = '';

  function s(v) { return v == null ? '' : String(v).trim(); }
  function lower(v) { return s(v).toLowerCase(); }
  function byId(id) {
    var root = w.__3DX_UI_ROOT__ || (w.widget && w.widget.body) || document;
    return root && root.querySelector ? root.querySelector('#' + id) : document.getElementById(id);
  }
  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function isDsengId(id) {
    id = s(id);
    if (!id || id.length < 16) return false;
    if (/^prd-/i.test(id)) return false;
    if (/\s/.test(id)) return false;
    return /^[0-9A-F]{24,32}$/i.test(id);
  }
  function tenantSlug() {
    var m = DEFAULT_SPACE_URL.match(/\/\/(r\d+-[a-z0-9]+)-space\./i);
    return m ? m[1].toLowerCase() : 'r1132100929518-us1';
  }
  function storageGet(key) {
    try { return w.localStorage ? w.localStorage.getItem(key) : null; } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { if (w.localStorage) w.localStorage.setItem(key, value); } catch (e) {}
  }
  function readLastGoodContext() {
    var raw = storageGet(LAST_GOOD_CONTEXT_KEY);
    if (!raw) return null;
    try {
      var ctx = JSON.parse(raw);
      if (!ctx || typeof ctx !== 'object') return null;
      if (ctx.build && ctx.build !== BUILD) return null;
      if (ctx.tenant && ctx.tenant !== tenantSlug()) return null;
      if (!isDsengId(ctx.rootId)) return null;
      return ctx;
    } catch (e) {
      return null;
    }
  }
  function writeLastGoodContext(payload, meta) {
    payload = payload || {};
    meta = meta || {};
    var rows = payload.rows || [];
    var root = payload.root || {};
    var rootId = s(meta.rootId || root.id || lastRootId);
    if (!isDsengId(rootId) || !rows.length) return false;
    var record = {
      build: BUILD,
      tenant: tenantSlug(),
      spaceUrl: DEFAULT_SPACE_URL,
      rootId: rootId,
      rootTitle: s(meta.rootTitle || root.title || lastRootTitle),
      rootName: s(meta.rootName || ''),
      mode: 'dseng-official',
      expandStrategy: 'expand-item',
      depth: Number(meta.depth || DEFAULT_DEPTH),
      expandDepth: Number(meta.expandDepth || meta.depth || DEFAULT_DEPTH),
      includeRoot: true,
      lastSuccessAt: new Date().toISOString()
    };
    storageSet(LAST_GOOD_CONTEXT_KEY, JSON.stringify(record));
    lastRootId = record.rootId;
    lastRootTitle = record.rootTitle;
    return true;
  }
  function setStatus(msg, kind) {
    var el = byId('statusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bom-st';
    if (kind === 'ok') el.className += ' bom-st-ok';
    if (kind === 'error') el.className += ' bom-st-err';
  }
  function showBanner(msg) {
    var banner = byId('syncBanner');
    if (!banner || !msg) return;
    banner.classList.remove('bom-hidden');
    banner.innerHTML = escapeHtml(msg);
  }
  function hasRenderablePayload() {
    return !!(w.__bomSkaLastPayload && w.__bomSkaLastPayload.rows && w.__bomSkaLastPayload.rows.length);
  }
  function setContextStatus(text, title, kind) {
    var el = byId('explorerContextStatus');
    if (!el) return;
    el.textContent = text;
    el.title = title || '';
    el.className = 'bom-explorer-context-status ' + (kind || '');
  }
  function getProviderContext() {
    var provider = w.ProductExplorerSyncProvider;
    if (!provider || !provider.getContext) return {};
    try { return provider.getContext() || {}; } catch (e) { return {}; }
  }
  function getRawContext() {
    var provider = w.ProductExplorerSyncProvider;
    if (!provider) return { source: 'NONE', selected: {}, normalized: getProviderContext(), selectedCandidates: [] };
    try {
      if (provider.getRawSelectionContext) return provider.getRawSelectionContext() || {};
    } catch (e) {}
    return { source: 'ProductExplorerSyncProvider.getContext', selected: {}, normalized: getProviderContext(), selectedCandidates: [] };
  }
  function refreshProvider(reason) {
    var provider = w.ProductExplorerSyncProvider;
    if (provider && provider.refresh) {
      try {
        return provider.refresh(reason || 'root-stability').then(function (ctx) { return ctx || getProviderContext(); })['catch'](function () { return getProviderContext(); });
      } catch (e) {}
    }
    return Promise.resolve(getProviderContext());
  }
  function titleMatchesSaved(ctx, saved) {
    if (!saved) return false;
    var a = lower(ctx && (ctx.title || ctx.productName || ctx.rootName || ctx.name));
    var b = lower(saved.rootTitle);
    if (!a || !b) return false;
    return a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
  }
  function getDepth() {
    var el = byId('skaDepthInput');
    var d = el ? Number(el.value) : DEFAULT_DEPTH;
    return isFinite(d) && d > 0 ? d : DEFAULT_DEPTH;
  }
  function getManualRoot(forceManual) {
    if (!forceManual) return '';
    var el = byId('explorerObjectId');
    return s(el && el.value);
  }
  function resolveRoot(ctx, opts) {
    ctx = ctx || {};
    opts = opts || {};
    var depth = opts.depth || getDepth();
    var saved = readLastGoodContext();
    var manual = getManualRoot(!!opts.forceManual);
    var ctxId = s(ctx.rootId || ctx.selectedId || ctx.physicalId || ctx.id);
    var ctxTitle = s(ctx.title || ctx.productName || ctx.rootName || ctx.name || ctx.label);

    if (manual && isDsengId(manual)) {
      return { kind: 'structure', rootId: manual, depth: depth, title: ctxTitle || lastRootTitle, source: 'ADVANCED_MANUAL' };
    }
    if (isDsengId(ctxId)) {
      return { kind: 'structure', rootId: ctxId, depth: depth, title: ctxTitle || lastRootTitle, source: ctx.source || 'PRODUCT_EXPLORER_CONTEXT' };
    }
    if (saved && (opts.preferSaved || !ctxTitle || titleMatchesSaved(ctx, saved))) {
      return {
        kind: 'structure',
        rootId: saved.rootId,
        depth: saved.depth || depth,
        expandDepth: saved.expandDepth || saved.depth || depth,
        title: saved.rootTitle,
        rootName: saved.rootName,
        source: 'LAST_GOOD_CONTEXT',
        warning: 'Product Explorer não forneceu rootId dseng oficial. Usando último root válido salvo: ' + (saved.rootTitle || saved.rootId) + '.'
      };
    }
    if (ctxTitle || s(ctx.name) || s(ctx.selectedId) || (ctx.selectedCandidates && ctx.selectedCandidates.length)) {
      return { kind: 'resolve-selection', depth: depth, ctx: ctx, source: ctx.source || 'EXPLORER_CONTEXT', saved: saved };
    }
    if (saved) {
      return {
        kind: 'structure',
        rootId: saved.rootId,
        depth: saved.depth || depth,
        expandDepth: saved.expandDepth || saved.depth || depth,
        title: saved.rootTitle,
        rootName: saved.rootName,
        source: 'LAST_GOOD_CONTEXT',
        warning: 'Sem contexto oficial do Product Explorer. Usando último root válido salvo: ' + (saved.rootTitle || saved.rootId) + '.'
      };
    }
    return { kind: 'unresolved', depth: depth, title: ctxTitle, source: ctx.source || 'NONE' };
  }
  function fetchJson(url, body) {
    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        try { payload = text ? JSON.parse(text) : null; } catch (e) { payload = null; }
        if (!response.ok || !payload || payload.ok === false) {
          var err = new Error((payload && payload.error && payload.error.message) || ('HTTP ' + response.status));
          err.status = response.status;
          err.payload = payload;
          err.code = payload && payload.error && payload.error.code;
          throw err;
        }
        return payload;
      });
    });
  }
  function buildSelectionPayload(ctx) {
    var rawCtx = getRawContext();
    var normalized = ctx || rawCtx.normalized || getProviderContext();
    var payloadMode = normalized.selectionMode || (normalized.selectedId && isDsengId(normalized.selectedId) ? 'selected-branch' : 'fallback');
    return {
      selection: {
        raw: rawCtx.selected || {},
        normalized: normalized,
        source: rawCtx.source || normalized.source || 'ExplorerContext',
        payloadMode: payloadMode
      },
      payloadMode: payloadMode,
      selectedCandidates: rawCtx.selectedCandidates || normalized.selectedCandidates || []
    };
  }
  function fetchStructure(resolved) {
    return fetchJson(SKA_URL, {
      rootId: resolved.rootId,
      depth: resolved.depth || DEFAULT_DEPTH,
      expandDepth: resolved.expandDepth || resolved.depth || DEFAULT_DEPTH,
      includeRoot: true,
      mode: 'dseng-official',
      expandStrategy: 'expand-item'
    }).then(function (payload) {
      payload.__skaSyncMeta = payload.__skaSyncMeta || {};
      payload.__skaSyncMeta.source = resolved.source || 'STRUCTURE';
      payload.__skaSyncMeta.rootId = resolved.rootId;
      payload.__skaSyncMeta.payloadMode = 'root';
      payload.__skaSyncMeta.selectionSource = resolved.source || '';
      payload.__skaSyncMeta.lastSyncAt = new Date().toISOString();
      payload.__skaSyncMeta.fallbackWarning = resolved.warning || '';
      return applyPayload(payload, resolved);
    });
  }
  function fetchResolveSelection(resolved) {
    var payload = buildSelectionPayload(resolved.ctx || {});
    return fetchJson(RESOLVE_URL, {
      selection: payload.selection,
      depth: resolved.depth || DEFAULT_DEPTH,
      expandDepth: resolved.depth || DEFAULT_DEPTH,
      includeRoot: true,
      mode: 'dseng-official',
      expandStrategy: 'expand-item',
      payloadMode: payload.payloadMode
    }).then(function (res) {
      var rootId = s((res.resolution && res.resolution.rootId) || (res.root && res.root.id));
      var rootTitle = s((res.resolution && res.resolution.rootTitle) || (res.root && res.root.title));
      res.__skaSyncMeta = res.__skaSyncMeta || {};
      res.__skaSyncMeta.source = resolved.source || 'RESOLVE_SELECTION';
      res.__skaSyncMeta.payloadEndpoint = '/api/3dx/bom/resolve-selection';
      res.__skaSyncMeta.payloadMode = payload.payloadMode;
      res.__skaSyncMeta.selectionSource = resolved.source || '';
      res.__skaSyncMeta.selectedCandidates = payload.selectedCandidates;
      res.__skaSyncMeta.selectedItemLabel = rootTitle || s((resolved.ctx || {}).title);
      res.__skaSyncMeta.rootId = rootId;
      res.__skaSyncMeta.lastSyncAt = new Date().toISOString();
      return applyPayload(res, { rootId: rootId, rootTitle: rootTitle, depth: resolved.depth, source: 'RESOLVE_SELECTION' });
    });
  }
  function rowsToItems(payload) {
    return (payload.rows || []).map(function (row, idx) {
      var refId = row.physicalId || row.referenceId || '';
      return {
        level: Number(row.level || 0),
        physicalid: row.physicalId || row.instanceId || row.rowKey || ('ska_' + idx),
        name: row.instanceName || row.name || row.title || ('Item ' + idx),
        title: row.title || row.name || row.instanceName || ('Item ' + idx),
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
        isAssembly: true,
        loaded: false,
        expanded: !!row.__expanded
      };
    });
  }
  function snapshotFromPayload(payload, items) {
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
  function updateDiagnostics(payload, meta) {
    var panel = byId('skaBomDiagnostics');
    var rows = payload && payload.rows ? payload.rows.length : 0;
    var root = payload && payload.root ? payload.root : {};
    var source = (payload.__skaSyncMeta && (payload.__skaSyncMeta.selectionSource || payload.__skaSyncMeta.source)) || (meta && meta.source) || 'STRUCTURE';
    if (panel) {
      panel.classList.remove('bom-hidden', 'bom-ska-diag-expanded');
      panel.classList.add('bom-ska-diagnostics', 'bom-ska-diagnostics-compact');
      panel.title = 'rootId=' + (root.id || meta.rootId || '') + ' | source=' + source + ' | lastGoodContext=' + LAST_GOOD_CONTEXT_KEY;
      panel.innerHTML = '<span class="bom-ska-diag-summary">Fonte: dseng · modo: root · source: ' + escapeHtml(source) + ' · item: ' + escapeHtml(root.title || meta.rootTitle || meta.title || '-') + ' · linhas: ' + escapeHtml(String(rows)) + ' · root estável</span>';
    }
    if (meta && meta.warning) showBanner(meta.warning);
  }
  function updateLabels(payload, meta) {
    var root = (payload && payload.root) || {};
    var title = root.title || (meta && (meta.rootTitle || meta.title)) || 'E-BOM';
    var total = payload && payload.rows ? payload.rows.length : 0;
    var sel = byId('selectionLabel');
    var tableLbl = byId('tableProductLabel');
    var pager = byId('tablePager');
    if (sel) sel.textContent = title;
    if (tableLbl) tableLbl.textContent = title;
    if (pager) pager.textContent = total + ' linhas dseng · root · expandDepth ' + ((meta && (meta.expandDepth || meta.depth)) || DEFAULT_DEPTH) + ' · estrutura parcial';
    setContextStatus('Contexto restaurado', title, 'bom-explorer-context-ok');
  }
  function applyPayload(payload, meta) {
    meta = meta || {};
    var rows = payload && payload.rows ? payload.rows : [];
    if (!rows.length) {
      var err = new Error('SKA BOM Service retornou 0 linhas. Estado anterior preservado.');
      err.code = 'EMPTY_ROWS';
      throw err;
    }
    if (!w.BomSnapshot || !w.BomSnapshot.applyPayload) {
      throw new Error('Pipeline de importação indisponível (BomSnapshot).');
    }
    var items = rowsToItems(payload);
    var snap = snapshotFromPayload(payload, items);
    if (w.ChartsManager && w.ChartsManager.destroyAll) {
      try { w.ChartsManager.destroyAll(); } catch (e) {}
    }
    if (w.BomService && w.BomService.reset) {
      try { w.BomService.reset(); } catch (e2) {}
    }
    w.__BOM_SKA_EMPTY_STATE__ = false;
    w.__bomSkaLastPayload = payload;
    return w.BomSnapshot.applyPayload(snap).then(function () {
      if (w.App && w.App.refreshUI) w.App.refreshUI();
      updateLabels(payload, meta);
      updateDiagnostics(payload, meta);
      writeLastGoodContext(payload, meta);
      setStatus('E-BOM carregada: ' + rows.length + ' linhas dseng.', 'ok');
      return payload;
    });
  }
  function preserveOnError(err, fallbackMessage) {
    if (hasRenderablePayload()) {
      setStatus(fallbackMessage || 'Falha no refresh. Mantendo última estrutura carregada.', 'error');
      showBanner(fallbackMessage || 'Falha no refresh. Mantendo última estrutura carregada.');
      return Promise.resolve(w.__bomSkaLastPayload);
    }
    var saved = readLastGoodContext();
    if (saved) {
      return fetchStructure({
        rootId: saved.rootId,
        depth: saved.depth || DEFAULT_DEPTH,
        expandDepth: saved.expandDepth || saved.depth || DEFAULT_DEPTH,
        title: saved.rootTitle,
        rootName: saved.rootName,
        source: 'LAST_GOOD_CONTEXT',
        warning: fallbackMessage || 'Falha no contexto atual. Usando último root válido salvo: ' + (saved.rootTitle || saved.rootId) + '.'
      });
    }
    setStatus((err && err.message) || 'Não foi possível carregar a E-BOM.', 'error');
    throw err;
  }
  function loadWithResolution(opts) {
    opts = opts || {};
    return refreshProvider(opts.reason || 'root-stability').then(function (ctx) {
      var resolved = resolveRoot(ctx, opts);
      if (resolved.kind === 'structure') return fetchStructure(resolved);
      if (resolved.kind === 'resolve-selection') {
        return fetchResolveSelection(resolved)['catch'](function (err) {
          return preserveOnError(err, 'Não foi possível resolver a seleção do Product Explorer. Mantendo/recuperando último root válido.');
        });
      }
      return preserveOnError(new Error('ROOT_UNRESOLVED'), 'Contexto sem rootId dseng válido. Mantendo/recuperando último root válido.');
    })['catch'](function (err) {
      return preserveOnError(err, 'Falha ao carregar E-BOM. Último estado válido preservado quando disponível.');
    });
  }
  function replaceButton(id, handler) {
    var old = byId(id);
    if (!old || !old.parentNode) return;
    var clone = old.cloneNode(true);
    old.parentNode.replaceChild(clone, old);
    clone.addEventListener('click', function (ev) {
      if (ev) ev.preventDefault();
      handler();
    });
  }
  function installHandlers() {
    replaceButton('btnSyncExplorer', function () { loadWithResolution({ reason: 'manual-sync' }); });
    replaceButton('btnRefreshBom', function () { loadWithResolution({ reason: 'manual-refresh' }); });
    replaceButton('btnTestRootId', function () { loadWithResolution({ reason: 'advanced-root', forceManual: true }); });
  }
  function install() {
    if (installed) return;
    if (!byId('bomTable') || !w.BomSnapshot || !w.BomSnapshot.applyPayload) return;
    installed = true;
    w.__BOM_ROOT_STABILITY_BUILD__ = BUILD;
    w.__BOM_ROOT_STABILITY_KEY__ = LAST_GOOD_CONTEXT_KEY;
    w.__bomRootStabilityLoad = loadWithResolution;
    w.refreshBomFromSka = function () { return loadWithResolution({ reason: 'manual-refresh' }); };
    w.loadViaExplorerSync = function () { return loadWithResolution({ reason: 'manual-sync' }); };
    w.loadViaSkaService = w.loadViaExplorerSync;
    installHandlers();
    var saved = readLastGoodContext();
    if (saved) {
      lastRootId = saved.rootId;
      lastRootTitle = saved.rootTitle || '';
      setContextStatus('Último root salvo disponível', saved.rootTitle || saved.rootId, 'bom-explorer-context-warn');
    }
    setTimeout(function () {
      if (!hasRenderablePayload()) loadWithResolution({ reason: 'post-boot', preferSaved: !!saved })['catch'](function () {});
    }, 1200);
  }
  function waitAndInstall() {
    if (!installed) install();
    if (!installed) setTimeout(waitAndInstall, 250);
  }

  waitAndInstall();
  var originalInstall = w.__bomSkaServiceInstall;
  if (typeof originalInstall === 'function' && !originalInstall.__ROOT_STABILITY_WRAPPED__) {
    var wrapped = function () {
      var result = originalInstall.apply(this, arguments);
      setTimeout(waitAndInstall, 0);
      return result;
    };
    wrapped.__ROOT_STABILITY_WRAPPED__ = true;
    w.__bomSkaServiceInstall = wrapped;
  }
})(window);
