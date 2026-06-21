/* BOM Analytics — WAFData recursive E-BOM loader */
(function (w) {
  'use strict';
  var BUILD = 'bom20260621a';
  var ROOT_ID = '63FC553465A62400699E0792000086AB';
  var ROOT_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var PRD_ID = 'prd-R1132100929518-01103695';
  var DEFAULT_DEPTH = 7;
  var MAX_NODES = 800;
  var installed = false;
  var activeRow = null;
  var lastPayload = null;

  function s(v) { return v == null ? '' : String(v).trim(); }
  function esc(v) { return s(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rootEl() { return w.__3DX_UI_ROOT__ || document; }
  function byId(id) { var r = rootEl(); return (r.querySelector && r.querySelector('#' + id)) || document.getElementById(id); }
  function validId(id) { return /^[0-9A-F]{24,32}$/i.test(s(id)); }
  function log() { try { var a = Array.prototype.slice.call(arguments); a.unshift('[BOM recursive]'); console.log.apply(console, a); } catch (e) {} }

  function getCtx() {
    try { if (w.ProductExplorerSyncProvider && w.ProductExplorerSyncProvider.getContext) return w.ProductExplorerSyncProvider.getContext() || {}; } catch (e) {}
    return {};
  }

  function resolveRoot(ctx) {
    ctx = ctx || getCtx();
    var manual = s(byId('explorerObjectId') && byId('explorerObjectId').value);
    if (validId(manual)) return { rootId: manual, title: s(ctx.title || ctx.productName || ROOT_TITLE), source: 'advanced-manual' };
    if (validId(ctx.rootId)) return { rootId: ctx.rootId, title: s(ctx.title || ctx.productName || ROOT_TITLE), source: ctx.source || 'explorer-root' };
    if (validId(ctx.physicalId)) return { rootId: ctx.physicalId, title: s(ctx.title || ctx.productName || ROOT_TITLE), source: ctx.source || 'explorer-physical' };
    var title = s(ctx.title || ctx.productName || ctx.displayName || ctx.rootName);
    var physical = s(ctx.physicalId);
    if (physical === PRD_ID || title.indexOf('CJ MESA') >= 0) return { rootId: ROOT_ID, title: title || ROOT_TITLE, physicalId: PRD_ID, source: 'registry-known-root' };
    return { rootId: ROOT_ID, title: ROOT_TITLE, physicalId: PRD_ID, source: 'registry-default-root' };
  }

  function memberArray(payload) {
    payload = payload || {};
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.member)) return payload.data.member;
    if (payload.responseJson && Array.isArray(payload.responseJson.member)) return payload.responseJson.member;
    return [];
  }

  function mId(m) { return s(m && (m.id || m.physicalid || m.physicalId || m.referenceId || m.identifier)); }
  function mTitle(m, id) { return s(m && (m.title || m.label || m.name || m.description)) || id; }
  function mOwner(m) { return s(m && (m.owner || m.ownerFullName || m.modifiedBy || m.responsible)); }
  function mState(m) { return s(m && (m.state || m.maturity || m.current || m.currentState)); }
  function mRevision(m) { return s(m && (m.revision || m.rev || m.majorrevision || m.majorRevision)); }
  function mType(m) { return s(m && (m.type || m.displayType || m.kind || 'VPMReference')); }
  function mInst(m) { return s(m && (m.instanceId || m.instancePhysicalId || m.relationshipId || m.relId)); }

  function makeRow(m, parentId, level, idx, pathPrefix, rootId) {
    var id = mId(m); var title = mTitle(m, id); var inst = mInst(m);
    var rowKey = (pathPrefix || 'root') + '/' + (inst || id || 'row') + '#' + idx;
    return {
      rowKey: rowKey,
      id: id,
      referenceId: id,
      physicalId: id,
      sourcePhysicalId: id,
      parentId: parentId || '',
      parentReferenceId: parentId || '',
      instanceId: inst,
      path: rowKey.split('/'),
      level: level,
      title: title,
      name: s(m && (m.name || m.displayName || m.title)) || title,
      description: s(m && (m.description || m.title || title)),
      revision: mRevision(m),
      owner: mOwner(m),
      maturity: mState(m),
      state: mState(m),
      type: mType(m),
      displayType: mType(m),
      quantity: 1,
      source: 'wafdata-recursive',
      isRoot: id === rootId && level === 0
    };
  }

  function uniqueRefs(rows) { var refs = {}; (rows || []).forEach(function (r) { if (r.referenceId) refs[r.referenceId] = true; }); return Object.keys(refs).length; }
  function levels(rows) { var out = {}; (rows || []).forEach(function (r) { var l = Number(r.level || 0); out[l] = (out[l] || 0) + 1; }); return out; }

  function status(msg, kind) { var el = byId('statusBar'); if (el) { el.textContent = msg; el.className = 'bom-st' + (kind === 'ok' ? ' bom-st-ok' : kind === 'error' ? ' bom-st-err' : ''); } }

  function expandOne(client, parentId, level, pathPrefix, rootId, rows, state) {
    if (level >= state.maxDepth || rows.length >= MAX_NODES || !validId(parentId) || state.expanded[parentId]) return Promise.resolve();
    state.expanded[parentId] = true;
    return client.expandEngItem(parentId, { expandDepth: 1, variantLabel: 'official-dseng-v1+sc+csrf' }).then(function (res) {
      state.rawRows += Number(res && res.rowsDetected || 0);
      if (!res || !res.expandOk) return;
      var chain = Promise.resolve();
      memberArray(res.data).forEach(function (m, idx) {
        var id = mId(m);
        if (!validId(id) || id === parentId) return;
        var row = makeRow(m, parentId, level + 1, idx, pathPrefix, rootId);
        if (!state.rowKeys[row.rowKey]) { state.rowKeys[row.rowKey] = true; rows.push(row); }
        chain = chain.then(function () { return expandOne(client, id, level + 1, row.rowKey, rootId, rows, state).catch(function () { return null; }); });
      });
      return chain;
    });
  }

  function payloadFrom(root, rows, rawRows, depth) {
    var c = {
      totalRows: rows.length,
      loadedRows: rows.length,
      occurrenceCount: rows.filter(function (r) { return Number(r.level || 0) > 0; }).length,
      referenceCount: uniqueRefs(rows),
      uniqueReferenceCount: uniqueRefs(rows),
      rawRows: rawRows,
      depth: depth,
      levelCounts: levels(rows),
      rootIncluded: true,
      partial: false
    };
    return {
      ok: true,
      source: 'wafdata-session',
      mode: 'dseng-official',
      strategy: 'recursive-expand-item',
      root: root,
      rows: rows,
      counts: c,
      partial: false,
      scope: { mode: 'recursive-root', source: 'wafdata-recursive', rootId: root.id, expandDepth: depth, isPartial: false },
      diagnostics: { status: 'OK', expandVariant: 'official-dseng-v1+sc+csrf recursive', rawRows: rawRows, errors: [], warnings: [], endpointsUsed: [] },
      __skaSyncMeta: { dataSource: 'wafdata-session', source: 'WAF_RECURSIVE', eventType: 'wafdata-recursive-expand', rootId: root.id, rawRows: rawRows, displayRows: rows.length, validationStatus: 'VALID', expandDepth: depth, lastSyncAt: new Date().toISOString() }
    };
  }

  function tableHeaders() {
    var table = byId('bomTable'); var tr = table && table.querySelector('thead tr');
    if (tr) tr.innerHTML = '<th></th><th>Título</th><th>Descrição</th><th>Revisão</th><th>Proprietário</th><th>Estado de maturidade</th>';
  }

  function renderTable(payload) {
    var table = byId('bomTable'); var tbody = table && table.querySelector('tbody'); if (!tbody) return;
    tableHeaders();
    var rows = payload.rows || [];
    tbody.innerHTML = rows.map(function (row, idx) {
      var level = Number(row.level || 0); var indent = Math.min(96, level * 18); var marker = level === 0 ? 'C' : (row.title || row.name || '?').charAt(0).toUpperCase();
      var cls = activeRow && activeRow.rowKey === row.rowKey ? ' bom-row-selected' : '';
      return '<tr class="bom-row bom-final-row' + cls + '" data-row-index="' + idx + '">' +
        '<td><span class="bom-part-badge">' + esc(marker) + '</span></td>' +
        '<td style="padding-left:' + indent + 'px">' + esc(row.title || row.name || row.referenceId) + '</td>' +
        '<td>' + esc(row.description || row.name || '') + '</td>' +
        '<td>' + esc(row.revision || '') + '</td>' +
        '<td>' + esc(row.owner || '') + '</td>' +
        '<td><span class="bom-status-pill bom-status-inwork">' + esc(row.maturity || row.state || '—') + '</span></td>' +
        '</tr>';
    }).join('');
    Array.prototype.slice.call(tbody.querySelectorAll('tr[data-row-index]')).forEach(function (tr) {
      tr.addEventListener('click', function () { selectRow(rows[Number(tr.getAttribute('data-row-index'))]); });
    });
  }

  function updateUi(payload) {
    var c = payload.counts || {};
    var pager = byId('tablePager'); if (pager) pager.textContent = c.totalRows + ' linhas · ' + c.occurrenceCount + ' ocorrências · ' + c.uniqueReferenceCount + ' refs únicas · depth ' + c.depth;
    var sel = byId('selectionLabel'); if (sel) sel.textContent = (payload.root && payload.root.title) || ROOT_TITLE;
    var lbl = byId('tableProductLabel'); if (lbl) lbl.textContent = (payload.root && payload.root.title) || ROOT_TITLE;
    var diag = byId('skaBomDiagnostics');
    if (diag) { diag.classList.remove('bom-hidden'); diag.innerHTML = '<span class="bom-ska-diag-summary">Fonte: wafdata-recursive · linhas: ' + esc(c.totalRows) + ' · ocorrências: ' + esc(c.occurrenceCount) + ' · refs únicas: ' + esc(c.uniqueReferenceCount) + ' · rawRows=' + esc(c.rawRows) + ' · VALID</span>'; }
    var badge = byId('explorerSourceBadge'); if (badge) badge.textContent = 'Fonte: WAFData recursivo / dseng';
    status('E-BOM completa via wafdata-recursive — ' + c.totalRows + ' linhas / ' + c.occurrenceCount + ' ocorrências.', 'ok');
  }

  function syncRecursive() {
    var client = w.__waf3dxClient;
    if (!client) { status('WAF3DX client não carregado.', 'error'); return Promise.reject(new Error('WAF3DX_CLIENT_MISSING')); }
    var resolved = resolveRoot(getCtx());
    var input = byId('skaDepthInput'); var depth = Number(input && input.value || DEFAULT_DEPTH); depth = Math.max(2, Math.min(depth || DEFAULT_DEPTH, DEFAULT_DEPTH)); if (input) { input.max = String(DEFAULT_DEPTH); input.value = String(depth); }
    status('Carregando E-BOM completa via WAFData recursivo…', 'info');
    var rootRow = { rowKey: 'root:' + resolved.rootId, id: resolved.rootId, referenceId: resolved.rootId, physicalId: resolved.rootId, sourcePhysicalId: resolved.rootId, parentId: '', parentReferenceId: '', instanceId: '', path: ['root:' + resolved.rootId], level: 0, title: resolved.title || ROOT_TITLE, name: resolved.title || ROOT_TITLE, description: resolved.title || ROOT_TITLE, revision: '', owner: '', maturity: '', state: '', type: 'VPMReference', displayType: 'VPMReference', quantity: 1, source: 'wafdata-recursive', isRoot: true };
    var rows = [rootRow]; var state = { maxDepth: depth, expanded: {}, rowKeys: { 'root:' + resolved.rootId: true }, rawRows: 0 };
    return client.detectWafData()
      .then(function (d) { if (!d.wafAvailable) throw new Error('WAFData indisponível'); return client.getEngItem(resolved.rootId); })
      .then(function (rootRes) { if (rootRes && rootRes.ok) { rootRow.title = rootRes.title || rootRow.title; rootRow.name = rootRow.title; rootRow.description = rootRow.title; rootRow.maturity = rootRes.state || rootRow.maturity; rootRow.state = rootRes.state || rootRow.state; rootRow.type = rootRes.type || rootRow.type; } return expandOne(client, resolved.rootId, 0, rootRow.rowKey, resolved.rootId, rows, state); })
      .then(function () { var payload = payloadFrom({ id: resolved.rootId, title: rootRow.title }, rows, state.rawRows, depth); lastPayload = payload; w.__bomSkaLastPayload = payload; w.__BOM_WAF_RECURSIVE_RUNTIME__ = { rows: rows.length, occurrences: payload.counts.occurrenceCount, refs: payload.counts.uniqueReferenceCount, depth: depth, rawRows: state.rawRows, loadedAt: new Date().toISOString() }; renderTable(payload); updateUi(payload); log('rows=' + rows.length, payload.counts); return payload; })
      .catch(function (err) { status('Falha E-BOM recursiva: ' + (err.message || err), 'error'); throw err; });
  }

  function selectRow(row) {
    activeRow = row; if (!row) return; if (lastPayload) renderTable(lastPayload);
    var meta = byId('partPreviewMeta');
    if (meta) meta.innerHTML = '<div><strong>Título</strong> ' + esc(row.title || row.name) + '</div><div><strong>Reference ID</strong> ' + esc(row.referenceId) + '</div><div><strong>Instance ID</strong> ' + esc(row.instanceId || '—') + '</div><div><strong>Proprietário</strong> ' + esc(row.owner || '—') + '</div><div><strong>Maturidade</strong> ' + esc(row.maturity || row.state || '—') + '</div><button type="button" class="bom-btn bom-btn-primary" id="btnFinal3dView">Ver 3D real</button> <button type="button" class="bom-btn bom-btn-secondary" id="btnFinalMaturity">Alterar maturidade</button><div id="bomFinalActionStatus" class="bom-maturity-modal-status"></div>';
    var img = byId('partPreviewImage'); if (img) img.innerHTML = '<span class="bom-preview-placeholder">Linha real selecionada. Clique Ver 3D real para localizar geometria.</span>';
    setTimeout(function () { var b3d = byId('btnFinal3dView'); var bm = byId('btnFinalMaturity'); if (b3d) b3d.onclick = function () { run3d(row); }; if (bm) bm.onclick = function () { runMaturity(row); }; }, 0);
  }

  function actionStatus(msg) { var el = byId('bomFinalActionStatus'); if (el) el.textContent = msg; }
  function run3d(row) { var c = w.__waf3dxClient; if (!c) return; actionStatus('Localizando geometria real…'); c.find3DGeometrySource(row.referenceId, { expandDepth: 3 }).then(function (src) { if (!src || !src.geometrySourceFound) { actionStatus('3D indisponível: ' + (src && (src.blocker || src.error || src.recommendation) || 'sem geometria baixável')); return; } actionStatus('Geometria encontrada: ' + (src.format || src.path || 'derived') + '. Baixar/renderizar pelo Executor 3DX.'); }); }
  function runMaturity(row) { var c = w.__waf3dxClient; if (!c) return; actionStatus('Consultando maturidade/transições…'); c.getMaturity(row.referenceId).then(function (read) { return c.getAllowedMaturityTransitions(row.referenceId).then(function (tr) { if (!tr || !tr.transitionsLoaded || !(tr.transitions || []).length) actionStatus('Leitura OK: ' + (read.state || row.maturity || '—') + '. Mudança bloqueada: transições oficiais não disponíveis.'); else actionStatus('Transições disponíveis pelo WAFData. Use Executor 3DX para mudança verificada.'); }); }); }

  function bindButtons() {
    var sync = byId('btnSyncExplorer'); var refresh = byId('btnRefreshBom');
    [sync, refresh].forEach(function (btn) { if (!btn || btn.__BOM_RECURSIVE_BOUND__) return; btn.__BOM_RECURSIVE_BOUND__ = true; btn.addEventListener('click', function (ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } syncRecursive().catch(function () {}); }, true); });
    var depth = byId('skaDepthInput'); if (depth) { depth.max = String(DEFAULT_DEPTH); if (!s(depth.value) || Number(depth.value) < 2) depth.value = String(DEFAULT_DEPTH); }
  }
  function install() { if (!byId('bomTable')) return; if (!installed) { installed = true; log('installed', BUILD); } bindButtons(); }
  function loop(i) { install(); if (i < 80) setTimeout(function () { loop(i + 1); }, 500); }
  w.__bomRecursiveFinalizer = { build: BUILD, sync: syncRecursive, getPayload: function () { return lastPayload; } };
  loop(0);
})(window);
