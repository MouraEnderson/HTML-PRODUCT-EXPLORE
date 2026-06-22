/*
 * BOM Analytics official operational controller.
 * This is the only product path for root resolution, WAFData loading and E-BOM rendering.
 */
(function (global) {
  'use strict';

  var CJ_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var CJ_PHYSICAL_ID = 'prd-R1132100929518-01103695';
  var CJ_ENG_ITEM_ID = '63FC553465A62400699E0792000086AB';
  var state = {
    booted: false,
    loading: false,
    generation: 0,
    root: null,
    context: null,
    rows: [],
    selectedRowKey: '',
    counts: emptyCounts(),
    diagnostics: [],
    failures: [],
    status: 'Aguardando atualizacao da estrutura.'
  };

  function emptyCounts() {
    return {
      displayRows: 0,
      occurrenceCount: 0,
      uniqueReferenceCount: 0,
      rawRows: 0,
      expandDepth: 0,
      partial: false,
      failures: 0
    };
  }

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function normalized(value) {
    return text(value).replace(/\s+/g, ' ').toLowerCase();
  }

  function ownRoot() {
    return global.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = ownRoot();
    return root && root.querySelector ? root.querySelector('#' + id) : null;
  }

  function escapeHtml(value) {
    var node = document.createElement('div');
    node.textContent = text(value);
    return node.innerHTML;
  }

  function isSecretKey(key) {
    return /cookie|token|authorization|password|secret|bearer|csrf/i.test(String(key || ''));
  }

  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 4) return '[max-depth]';
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length > 300 ? value.slice(0, 300) + '...' : value;
    if (Array.isArray(value)) return value.slice(0, 30).map(function (item) { return sanitize(item, depth + 1); });
    if (typeof value !== 'object') return String(value);
    var out = {};
    Object.keys(value).slice(0, 40).forEach(function (key) {
      if (!isSecretKey(key)) out[key] = sanitize(value[key], depth + 1);
    });
    return out;
  }

  function diagnostic(level, event, detail) {
    state.diagnostics.push({
      at: new Date().toISOString(),
      level: level,
      event: event,
      detail: sanitize(detail || {})
    });
    if (state.diagnostics.length > 160) state.diagnostics.shift();
    if (level === 'error' && global.console && console.error) console.error('[BOM session]', event, detail || '');
    else if (global.console && console.info) console.info('[BOM session]', event, detail || '');
  }

  function setStatus(message, tone) {
    state.status = text(message);
    var bar = byId('statusBar');
    if (bar) {
      bar.textContent = state.status;
      bar.className = 'bom-st' + (tone ? ' bom-st-' + tone : '');
    }
    var banner = byId('syncBanner');
    if (banner) banner.textContent = state.status;
  }

  function setLoading(on) {
    state.loading = !!on;
    var overlay = byId('loadingOverlay');
    if (overlay) overlay.classList.toggle('bom-hidden', !on);
  }

  function isPrdId(value) {
    return /^prd-R\d+-/i.test(text(value));
  }

  function isEngItemId(value) {
    return /^[0-9A-F]{24,64}$/i.test(text(value));
  }

  function isCjContext(context) {
    var title = normalized(context && (context.title || context.name || context.label));
    var ids = [
      context && context.physicalId,
      context && context.selectedId,
      context && context.rootId
    ].map(text);
    return title === normalized(CJ_TITLE) || ids.indexOf(CJ_PHYSICAL_ID) >= 0;
  }

  function initRuntime() {
    if (typeof WafBootstrap === 'undefined' || !WafBootstrap.ensure) {
      return Promise.reject(new Error('WAFData bootstrap indisponivel.'));
    }
    return WafBootstrap.ensure()
      .then(function () { return PlatformContext.init(); })
      .then(function (platform) {
        if (!platform || !platform.securityContext) throw new Error('SecurityContext indisponivel.');
        return CompassServices.ensure3DSpaceServiceUrl(platform.platformId);
      })
      .then(function (spaceUrl) {
        EnoviaApi.init(spaceUrl);
        return CompassServices.fetchCsrfToken(spaceUrl).then(function (token) {
          if (!token) throw new Error('CSRF indisponivel.');
          return spaceUrl;
        });
      });
  }

  function resolveOfficialContext() {
    if (typeof ProductExplorerSyncProvider === 'undefined' || !ProductExplorerSyncProvider.refresh) {
      return Promise.reject(new Error('Provider oficial de selecao indisponivel.'));
    }
    return ProductExplorerSyncProvider.refresh('manual-controller').then(function (context) {
      context = context || {};
      /* Never trust a provider rootId from a registry/config as the active selection. */
      var selectedId = text(context.physicalId || context.selectedId);
      var title = text(context.title || context.name || context.label);
      var out = {
        selectedId: selectedId,
        physicalId: text(context.physicalId),
        title: title,
        name: text(context.name),
        label: text(context.label),
        source: text(context.selectionSource || context.source),
        raw: sanitize(context)
      };
      if (!out.selectedId && !out.title) throw new Error('Nenhuma montagem ativa detectada. Abra uma estrutura no Product Explorer e clique Sincronizar.');
      state.context = out;
      diagnostic('info', 'official-context', { source: out.source, selectedId: out.selectedId, title: out.title });
      return out;
    });
  }

  function membersOf(response) {
    if (typeof EnoviaApi !== 'undefined' && EnoviaApi.extractMembers) return EnoviaApi.extractMembers(response);
    if (response && Array.isArray(response.member)) return response.member;
    if (Array.isArray(response)) return response;
    return [];
  }

  function exactSearch(title) {
    var expected = normalized(title);
    if (!expected) return Promise.reject(new Error('Titulo da montagem ausente para busca dseng.'));
    return EnoviaApi.getEngItemUqlSearch('label:"' + text(title).replace(/"/g, '\\"') + '"', 40)
      .then(function (response) {
        var matches = membersOf(response).filter(function (member) {
          return [member.name, member.title, member.label, member.displayName]
            .some(function (value) { return normalized(value) === expected; });
        });
        var ids = {};
        matches.forEach(function (member) {
          var id = text(member.id || member.physicalid || member.physicalId);
          if (isEngItemId(id)) ids[id] = true;
        });
        var candidates = Object.keys(ids);
        if (candidates.length > 1) throw new Error('Multiplos candidatos encontrados para a montagem atual.');
        if (!candidates.length) throw new Error('Nenhum candidato dseng exato encontrado para a montagem atual.');
        return candidates[0];
      });
  }

  function resolveCurrentRoot() {
    return initRuntime().then(function () {
      return resolveOfficialContext();
    }).then(function (context) {
      var selected = text(context.selectedId || context.physicalId);
      var title = text(context.title || context.name || context.label);
      var cj = isCjContext(context);
      if (!cj && (normalized(title).indexOf('ska_endersw') >= 0 || (selected && selected !== CJ_PHYSICAL_ID))) {
        diagnostic('info', 'cj-registry-blocked', { title: title, selectedId: selected });
      }

      if (isEngItemId(selected)) {
        return EnoviaApi.getEngItem(selected).then(function () {
          return { internalId: selected, source: 'PlatformAPI/DSSelection EngItem', title: title || selected, physicalId: selected };
        });
      }
      if (isPrdId(selected)) {
        return EnoviaApi.resolveEngItemMember(selected, title).then(function (member) {
          var id = text(member && (member.id || member.physicalid || member.physicalId));
          if (!isEngItemId(id)) throw new Error('Objeto selecionado nao resolveu para EngItem dseng.');
          return { internalId: id, source: 'PlatformAPI/DSSelection prd->dseng', title: title || selected, physicalId: selected };
        });
      }
      if (cj) {
        return { internalId: CJ_ENG_ITEM_ID, source: 'CJ registry (confirmed context)', title: CJ_TITLE, physicalId: CJ_PHYSICAL_ID };
      }
      if (title) {
        return exactSearch(title).then(function (id) {
          return { internalId: id, source: 'dseng exact search', title: title, physicalId: '' };
        });
      }
      throw new Error('Nao foi possivel resolver a montagem atual para root dseng.');
    }).then(function (root) {
      state.root = root;
      diagnostic('info', 'root-resolved', root);
      return root;
    }).catch(function (error) {
      state.root = null;
      diagnostic('error', 'root-resolution-failed', { message: error.message });
      throw error;
    });
  }

  function objectValue(object, keys) {
    if (!object || typeof object !== 'object') return '';
    for (var i = 0; i < keys.length; i++) {
      var value = object[keys[i]];
      if (value != null && value !== '') return text(value);
    }
    return '';
  }

  function nestedValue(object, keys) {
    var direct = objectValue(object, keys);
    if (direct) return direct;
    var nested = [object && object.reference, object && object.referredObject, object && object['dseng:EngItem'], object && object.member];
    for (var i = 0; i < nested.length; i++) {
      direct = objectValue(nested[i], keys);
      if (direct) return direct;
    }
    return '';
  }

  function looksLikeOccurrence(object) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
    var id = nestedValue(object, ['instanceId', 'relationshipId', 'relId', 'physicalid', 'physicalId', 'id']);
    var label = nestedValue(object, ['title', 'name', 'label', 'displayName']);
    var type = nestedValue(object, ['type', 'displayType']);
    return !!id && (!!label || /VPM(?:Rep)?(?:Reference|Instance)|EngItem|EngInstance/i.test(type));
  }

  function collectObjects(payload) {
    var found = [];
    var seen = [];
    function walk(value, depth) {
      if (!value || typeof value !== 'object' || depth > 12 || seen.indexOf(value) >= 0) return;
      seen.push(value);
      if (looksLikeOccurrence(value)) found.push(value);
      if (Array.isArray(value)) {
        value.forEach(function (item) { walk(item, depth + 1); });
        return;
      }
      Object.keys(value).forEach(function (key) {
        if (!isSecretKey(key)) walk(value[key], depth + 1);
      });
    }
    walk(payload, 0);
    return found;
  }

  function parseLevel(value, fallback) {
    var level = parseInt(value, 10);
    return isNaN(level) ? fallback : Math.max(0, level);
  }

  function nodeFromRaw(raw, index, root) {
    var type = nestedValue(raw, ['type', 'displayType', 'objectType']);
    var rawId = nestedValue(raw, ['id', 'physicalid', 'physicalId']);
    var instanceId = nestedValue(raw, ['instanceId', 'relationshipId', 'relId', 'instancePhysicalId']);
    if (!instanceId && /VPM(?:Rep)?Instance|EngInstance/i.test(type)) instanceId = rawId;
    var referenceId = nestedValue(raw, ['referenceId', 'referredObjectId', 'referencePhysicalId', 'physicalid', 'physicalId']);
    if (!referenceId && !instanceId) referenceId = rawId;
    var parentReferenceId = nestedValue(raw, ['parentReferenceId', 'parentId', 'parentPhysicalId', 'parent']);
    var path = nestedValue(raw, ['path', 'instancePath', 'treePath']);
    var level = parseLevel(nestedValue(raw, ['level', 'depth']), path ? Math.max(1, path.split(/[\\/|>]/).filter(Boolean).length - 1) : 1);
    var rowKey = [instanceId || 'ref:' + referenceId, parentReferenceId || 'root', path || index].join('|');
    var member = typeof AttributeService !== 'undefined' && AttributeService.extractFromMember ? AttributeService.extractFromMember(raw) : {};
    return {
      rowKey: rowKey,
      referenceId: referenceId,
      instanceId: instanceId,
      parentReferenceId: parentReferenceId,
      parentRowKey: '',
      level: level,
      path: path,
      name: nestedValue(raw, ['name', 'title', 'label', 'displayName']) || member.name || referenceId,
      title: nestedValue(raw, ['title', 'name', 'label', 'displayName']) || member.title || referenceId,
      description: nestedValue(raw, ['description']) || member.description,
      revision: nestedValue(raw, ['revision', 'majorrevision']) || member.revision,
      owner: nestedValue(raw, ['owner', 'creator']) || member.owner,
      maturity: nestedValue(raw, ['maturity', 'state', 'current', 'status']) || member.maturity,
      state: nestedValue(raw, ['state', 'current', 'status']) || member.state,
      type: type || member.type,
      displayType: nestedValue(raw, ['displayType', 'type']) || member.displayType,
      quantity: Number(nestedValue(raw, ['quantity', 'qty']) || 1),
      physicalid: referenceId || instanceId || rawId,
      isAssembly: /Reference|EngItem|Assembly/i.test(type),
      raw: raw
    };
  }

  function rootRow(root, rootResponse) {
    var member = typeof AttributeService !== 'undefined' && AttributeService.extractFromMember
      ? AttributeService.extractFromMember(rootResponse && (rootResponse.member || rootResponse)) : {};
    return {
      rowKey: 'root|' + root.internalId,
      referenceId: root.internalId,
      instanceId: '',
      parentReferenceId: '',
      parentRowKey: '',
      level: 0,
      path: root.internalId,
      name: root.title || member.name || root.internalId,
      title: root.title || member.title || root.internalId,
      description: member.description || '',
      revision: member.revision || '',
      owner: member.owner || '',
      maturity: member.maturity || member.state || '',
      state: member.state || '',
      type: member.type || 'dseng:EngItem',
      displayType: member.displayType || 'Engineering Item',
      quantity: 1,
      physicalid: root.internalId,
      isAssembly: true,
      raw: rootResponse || {}
    };
  }

  function normalizeExpansion(root, rootResponse, expansion) {
    var rawObjects = collectObjects(expansion);
    var rows = [rootRow(root, rootResponse)];
    rawObjects.forEach(function (raw, index) {
      var node = nodeFromRaw(raw, index, root);
      if (!node.instanceId && node.referenceId === root.internalId && node.level === 0) return;
      rows.push(node);
    });
    var firstByReference = {};
    rows.forEach(function (row) {
      if (row.referenceId && !firstByReference[row.referenceId]) firstByReference[row.referenceId] = row.rowKey;
    });
    rows.forEach(function (row) {
      if (row.parentReferenceId) row.parentRowKey = firstByReference[row.parentReferenceId] || '';
    });
    rows.sort(function (left, right) { return left.level - right.level; });
    return { rows: rows, rawRows: rawObjects.length };
  }

  function computeCounts(rows, rawRows, failures) {
    var refs = {};
    var maxLevel = 0;
    rows.forEach(function (row) {
      if (row.referenceId) refs[row.referenceId] = true;
      maxLevel = Math.max(maxLevel, Number(row.level) || 0);
    });
    return {
      displayRows: rows.length,
      occurrenceCount: Math.max(0, rows.length - 1),
      uniqueReferenceCount: Object.keys(refs).length,
      rawRows: rawRows,
      expandDepth: maxLevel,
      partial: failures.length > 0,
      failures: failures.length
    };
  }

  function renderCounters() {
    var c = state.counts;
    var meta = c.displayRows + ' linhas exibidas · ' + c.occurrenceCount + ' ocorrencias · ' +
      c.uniqueReferenceCount + ' refs unicas · rawRows ' + c.rawRows + ' · depth ' + c.expandDepth +
      (c.partial ? ' · PARTIAL · ' + c.failures + ' falhas' : ' · VALID');
    var pager = byId('tablePager');
    var ebomMeta = byId('ebomMeta');
    if (pager) pager.textContent = meta;
    if (ebomMeta) {
      ebomMeta.textContent = meta;
      ebomMeta.classList.remove('bom-hidden');
    }
  }

  function renderSelection(row) {
    var image = byId('partPreviewImage');
    var meta = byId('partPreviewMeta');
    if (image) image.innerHTML = '<span class="bom-preview-placeholder">3DView: aguardando linha real e geometry resolver.</span>';
    if (meta) {
      meta.innerHTML = '<dl class="bom-preview-details">' +
        '<dt>Reference ID</dt><dd>' + escapeHtml(row.referenceId || '-') + '</dd>' +
        '<dt>Instance ID</dt><dd>' + escapeHtml(row.instanceId || '-') + '</dd>' +
        '<dt>Revisao</dt><dd>' + escapeHtml(row.revision || '-') + '</dd>' +
        '<dt>Proprietario</dt><dd>' + escapeHtml(row.owner || '-') + '</dd>' +
        '<dt>Maturidade</dt><dd>' + escapeHtml(row.maturity || row.state || '-') + '</dd>' +
        '<dt>Nivel</dt><dd>' + escapeHtml(row.level) + '</dd>' +
        '<dt>Path</dt><dd>' + escapeHtml(row.path || '-') + '</dd>' +
        '<dt>3DView</dt><dd>Aguardando geometry resolver.</dd>' +
        '<dt>Maturidade write</dt><dd>Leitura somente; write nao habilitado.</dd>' +
        '<dd><button type="button" disabled="disabled">Ver 3D real</button> <button type="button" disabled="disabled">Alterar maturidade</button></dd>' +
        '</dl>';
    }
  }

  function render() {
    var label = byId('tableProductLabel');
    var selection = byId('selectionLabel');
    if (label) label.textContent = state.root ? state.root.title : '-';
    if (selection) selection.textContent = state.root ? state.root.title : '-';
    if (typeof DataTable !== 'undefined') {
      DataTable.init('#bomTable');
      DataTable.onRowSelect(function (row) { selectRow(row.rowKey); });
      DataTable.setData(state.rows);
    }
    var metrics = typeof MetricsEngine !== 'undefined' ? MetricsEngine.computeFromFlat(state.rows) : null;
    if (metrics && typeof KpiCards !== 'undefined') {
      KpiCards.init('#kpiGrid');
      KpiCards.render(metrics, []);
    }
    if (metrics && typeof ChartsManager !== 'undefined') ChartsManager.render(metrics);
    renderCounters();
  }

  function selectRow(rowKey) {
    var row = state.rows.filter(function (item) { return item.rowKey === rowKey; })[0];
    if (!row) return null;
    state.selectedRowKey = row.rowKey;
    renderSelection(row);
    diagnostic('info', 'row-selected', { rowKey: row.rowKey, referenceId: row.referenceId, instanceId: row.instanceId });
    return row;
  }

  function loadStructure(root) {
    root = root || state.root;
    if (!root) return Promise.reject(new Error('Nao foi possivel resolver a montagem atual para root dseng.'));
    var requestGeneration = state.generation;
    return EnoviaApi.getEngItem(root.internalId)
      .then(function (rootResponse) {
        return EnoviaApi.expandEngItem(root.internalId, { expandDepth: -1 }).then(function (expansion) {
          return { rootResponse: rootResponse, expansion: expansion };
        });
      })
      .then(function (payload) {
        if (requestGeneration !== state.generation) return null;
        var normalizedRows = normalizeExpansion(root, payload.rootResponse, payload.expansion);
        if (!normalizedRows.rows.length) throw new Error('Expand dseng retornou sem ocorrencias utilizaveis.');
        state.rows = normalizedRows.rows;
        state.failures = [];
        state.counts = computeCounts(state.rows, normalizedRows.rawRows, state.failures);
        render();
        if (state.rows.length) selectRow(state.rows[0].rowKey);
        setStatus('E-BOM carregada por WAFData session controller. ' + state.counts.displayRows + ' linhas.', 'success');
        diagnostic('info', 'structure-loaded', { root: root.internalId, counts: state.counts });
        return state.rows;
      });
  }

  function sync() {
    if (state.loading) return Promise.resolve(state.rows);
    state.generation += 1;
    state.rows = [];
    state.counts = emptyCounts();
    state.failures = [];
    setLoading(true);
    setStatus('Resolvendo montagem atual pelo contexto oficial...', 'info');
    return resolveCurrentRoot()
      .then(function (root) { return loadStructure(root); })
      .catch(function (error) {
        state.rows = [];
        state.counts = emptyCounts();
        state.failures = [text(error.message || error)];
        state.counts.failures = 1;
        state.counts.partial = true;
        render();
        setStatus(text(error.message || 'Nao foi possivel resolver a montagem atual para root dseng.'), 'error');
        throw error;
      })
      .finally(function () { setLoading(false); });
  }

  function refresh() {
    return sync();
  }

  function bindControllerButton(id, handler) {
    var current = byId(id);
    if (!current || !current.parentNode) return;
    var replacement = current.cloneNode(true);
    current.parentNode.replaceChild(replacement, current);
    replacement.addEventListener('click', function (event) {
      event.preventDefault();
      handler().catch(function () {});
    });
    diagnostic('info', 'button-owned-by-controller', { id: id });
  }

  function boot() {
    if (state.booted) return Promise.resolve(state);
    state.booted = true;
    if (typeof DataTable !== 'undefined') DataTable.init('#bomTable');
    bindControllerButton('btnImportPaste', refresh);
    bindControllerButton('btnSyncExplorer', sync);
    bindControllerButton('btnRefreshBom', refresh);
    bindControllerButton('btnRefresh', refresh);
    setStatus('Pronto. Abra ou selecione uma montagem no Product Explorer e clique Atualizar estrutura.', 'info');
    diagnostic('info', 'controller-booted', { version: 'bom20260621e' });
    return Promise.resolve(state);
  }

  function getState() {
    return {
      controller: 'bom-waf-session-controller-bom20260621e',
      activeEntrypoint: (global.APP_CONFIG && global.APP_CONFIG.ACTIVE_ENTRYPOINT) || 'widget-v3.html',
      activeBuild: global.__BOM_BUILD_ID__ || (global.APP_CONFIG && global.APP_CONFIG.BUILD) || '',
      bundleLoaded: global.__BOM_BUNDLE_LOADED__ === true,
      legacyOperationalHandlers: 0,
      booted: state.booted,
      loading: state.loading,
      root: sanitize(state.root),
      context: sanitize(state.context),
      rows: state.rows.map(function (row) {
        var copy = Object.assign({}, row);
        delete copy.raw;
        return copy;
      }),
      counts: Object.assign({}, state.counts),
      failures: state.failures.slice(),
      status: state.status
    };
  }

  function exportDiagnostics() {
    return JSON.stringify({
      controller: 'bom-waf-session-controller-bom20260621e',
      state: getState(),
      diagnostics: state.diagnostics.map(sanitize)
    }, null, 2);
  }

  global.__bomWafSessionController = {
    boot: boot,
    sync: sync,
    refresh: refresh,
    resolveCurrentRoot: resolveCurrentRoot,
    loadStructure: loadStructure,
    selectRow: selectRow,
    getState: getState,
    exportDiagnostics: exportDiagnostics,
    __test: {
      isCjContext: isCjContext,
      normalizeExpansion: normalizeExpansion,
      computeCounts: computeCounts,
      sanitize: sanitize
    }
  };
})(window);
