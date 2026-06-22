/* BOM Analytics — WAFData recursive E-BOM loader
 * Purpose: Product Explorer is only a root selector. This loader owns E-BOM loading.
 * It never defaults to CJ MESA unless the selected context is explicitly CJ MESA/known prd id.
 */
(function (w) {
  'use strict';

  var BUILD = 'bom20260621b';
  var KNOWN_ROOT_ID = '63FC553465A62400699E0792000086AB';
  var KNOWN_ROOT_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var KNOWN_PRD_ID = 'prd-R1132100929518-01103695';
  var DEFAULT_DEPTH = 7;
  var MAX_DEPTH = 10;
  var MAX_NODES = 1000;
  var installed = false;
  var activeRow = null;
  var lastPayload = null;
  var loadRunId = 0;

  function s(v) { return v == null ? '' : String(v).trim(); }
  function n(v) { return Number(v || 0); }
  function esc(v) { return s(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rootEl() { return w.__3DX_UI_ROOT__ || document; }
  function byId(id) { var r = rootEl(); return (r.querySelector && r.querySelector('#' + id)) || document.getElementById(id); }
  function validId(id) { return /^[0-9A-F]{24,32}$/i.test(s(id)); }
  function log() { try { var a = Array.prototype.slice.call(arguments); a.unshift('[BOM recursive]'); console.log.apply(console, a); } catch (e) {} }

  function memberArray(payload) {
    payload = payload || {};
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.member)) return payload.data.member;
    if (payload.responseJson && Array.isArray(payload.responseJson.member)) return payload.responseJson.member;
    return [];
  }

  function mId(m) { return s(m && (m.id || m.physicalid || m.physicalId || m.referenceId || m.identifier)); }
  function mTitle(m, id) { return s(m && (m.title || m.label || m.name || m.description || m.displayName)) || id; }
  function mOwner(m) { return s(m && (m.owner || m.ownerFullName || m.modifiedBy || m.responsible || m.ownerName)); }
  function mState(m) { return s(m && (m.state || m.maturity || m.current || m.currentState)); }
  function mRevision(m) { return s(m && (m.revision || m.rev || m.majorrevision || m.majorRevision)); }
  function mType(m) { return s(m && (m.type || m.displayType || m.kind || 'VPMReference')); }
  function mInst(m) { return s(m && (m.instanceId || m.instancePhysicalId || m.relationshipId || m.relId || m.idRel)); }
  function normalizeTitle(v) { return s(v).toLowerCase().replace(/\s+/g, ' ').trim(); }

  function getProvider() { return w.ProductExplorerSyncProvider || null; }

  function getFreshContext() {
    var p = getProvider();
    if (p && typeof p.refresh === 'function') {
      return Promise.resolve(p.refresh('manual-sync')).catch(function () {
        return p.getContext ? p.getContext() : {};
      });
    }
    if (p && typeof p.getContext === 'function') return Promise.resolve(p.getContext() || {});
    return Promise.resolve({});
  }

  function contextTitle(ctx) {
    ctx = ctx || {};
    return s(ctx.title || ctx.productName || ctx.displayName || ctx.rootName || ctx.label || ctx.name);
  }

  function isKnownCjContext(ctx) {
    ctx = ctx || {};
    var physical = s(ctx.physicalId || ctx.id || ctx.selectedId);
    var title = contextTitle(ctx);
    return physical === KNOWN_PRD_ID || normalizeTitle(title) === normalizeTitle(KNOWN_ROOT_TITLE) || title.indexOf('CJ MESA') >= 0;
  }

  function resolveRootAsync(client) {
    return getFreshContext().then(function (ctx) {
      ctx = ctx || {};
      var title = contextTitle(ctx);
      var candidates = [ctx.rootId, ctx.physicalId, ctx.selectedId, ctx.id];
      var i;
      for (i = 0; i < candidates.length; i++) {
        if (validId(candidates[i])) {
          return {
            ok: true,
            rootId: s(candidates[i]),
            title: title || s(ctx.name) || s(candidates[i]),
            physicalId: s(ctx.physicalId),
            source: ctx.source || 'product-explorer-context',
            context: ctx
          };
        }
      }

      if (isKnownCjContext(ctx)) {
        return {
          ok: true,
          rootId: KNOWN_ROOT_ID,
          title: title || KNOWN_ROOT_TITLE,
          physicalId: KNOWN_PRD_ID,
          source: 'registry-known-cj-mesa',
          context: ctx
        };
      }

      var physical = s(ctx.physicalId || ctx.selectedId || ctx.id);
      if (client && client.resolveEngItemRootId && (title || physical)) {
        return client.resolveEngItemRootId({ physicalId: physical, title: title }).then(function (res) {
          if (res && res.ok && validId(res.rootId)) {
            return {
              ok: true,
              rootId: res.rootId,
              title: res.title || title || res.rootId,
              physicalId: physical,
              source: 'waf-uql-root-resolution:' + (res.source || ''),
              context: ctx,
              resolution: res
            };
          }
          return {
            ok: false,
            rootId: '',
            title: title,
            physicalId: physical,
            source: 'unresolved-context',
            context: ctx,
            resolution: res,
            error: 'Não consegui resolver a seleção do Product Explorer para dseng rootId.'
          };
        });
      }

      return {
        ok: false,
        rootId: '',
        title: title,
        physicalId: physical,
        source: 'missing-context',
        context: ctx,
        error: 'Seleção sem rootId dseng. Selecione o root no Product Explorer e clique Sincronizar.'
      };
    });
  }

  function makeRow(m, parentRow, level, idx, pathPrefix, rootId) {
    var id = mId(m);
    var title = mTitle(m, id);
    var inst = mInst(m);
    var rowKey = (pathPrefix || 'root') + '/' + (inst || id || 'row') + '#' + idx;
    return {
      rowKey: rowKey,
      id: id,
      referenceId: id,
      physicalId: id,
      sourcePhysicalId: id,
      parentId: parentRow ? parentRow.referenceId : '',
      parentReferenceId: parentRow ? parentRow.referenceId : '',
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
      isRoot: id === rootId && level === 0,
      raw: m
    };
  }

  function uniqueRefs(rows) {
    var refs = {};
    (rows || []).forEach(function (r) { if (r.referenceId) refs[r.referenceId] = true; });
    return Object.keys(refs).length;
  }

  function levels(rows) {
    var out = {};
    (rows || []).forEach(function (r) { var l = Number(r.level || 0); out[l] = (out[l] || 0) + 1; });
    return out;
  }

  function status(msg, kind) {
    var el = byId('statusBar');
    if (!el) return;
    el.textContent = msg;
    el.className = 'bom-st' + (kind === 'ok' ? ' bom-st-ok' : kind === 'error' ? ' bom-st-err' : '');
  }

  function expandReference(client, referenceId, state) {
    referenceId = s(referenceId);
    if (!validId(referenceId)) return Promise.resolve([]);
    if (state.childrenCache[referenceId]) return Promise.resolve(state.childrenCache[referenceId]);
    return client.expandEngItem(referenceId, { expandDepth: 1, variantLabel: 'official-dseng-v1+sc+csrf' }).then(function (res) {
      state.rawRows += Number((res && res.rowsDetected) || 0);
      if (!res || !res.expandOk) {
        state.expandFailures.push({ id: referenceId, status: res && res.status, error: res && res.error });
        state.childrenCache[referenceId] = [];
        return [];
      }
      var members = memberArray(res.data).filter(function (m) {
        var id = mId(m);
        return validId(id) && id !== referenceId;
      });
      state.childrenCache[referenceId] = members;
      return members;
    }).catch(function (err) {
      state.expandFailures.push({ id: referenceId, error: err && err.message ? err.message : String(err) });
      state.childrenCache[referenceId] = [];
      return [];
    });
  }

  function buildTree(client, parentRow, level, pathPrefix, branchRefs, rows, state) {
    if (!parentRow || level >= state.maxDepth || rows.length >= state.maxNodes) return Promise.resolve();
    var refId = parentRow.referenceId;
    branchRefs = branchRefs || {};
    if (branchRefs[refId]) return Promise.resolve();
    var nextBranch = {};
    Object.keys(branchRefs).forEach(function (k) { nextBranch[k] = true; });
    nextBranch[refId] = true;

    return expandReference(client, refId, state).then(function (members) {
      var chain = Promise.resolve();
      members.forEach(function (m, idx) {
        if (rows.length >= state.maxNodes) return;
        var child = makeRow(m, parentRow, level + 1, idx, pathPrefix, state.rootId);
        if (state.rowKeys[child.rowKey]) return;
        state.rowKeys[child.rowKey] = true;
        rows.push(child);
        chain = chain.then(function () {
          return buildTree(client, child, level + 1, child.rowKey, nextBranch, rows, state);
        });
      });
      return chain;
    });
  }

  function payloadFrom(root, rows, state) {
    var c = {
      totalRows: rows.length,
      loadedRows: rows.length,
      displayRows: rows.length,
      occurrenceCount: rows.filter(function (r) { return Number(r.level || 0) > 0; }).length,
      referenceCount: uniqueRefs(rows),
      uniqueReferenceCount: uniqueRefs(rows),
      rawRows: state.rawRows,
      depth: state.maxDepth,
      levelCounts: levels(rows),
      rootIncluded: true,
      partial: rows.length >= state.maxNodes || state.expandFailures.length > 0,
      maxNodes: state.maxNodes
    };
    return {
      ok: true,
      source: 'wafdata-session',
      mode: 'dseng-official',
      strategy: 'recursive-expand-item',
      root: root,
      rows: rows,
      counts: c,
      partial: c.partial,
      scope: { mode: 'recursive-root', source: 'wafdata-recursive', rootId: root.id, expandDepth: state.maxDepth, isPartial: c.partial },
      diagnostics: { status: c.partial ? 'PARTIAL' : 'OK', expandVariant: 'official-dseng-v1+sc+csrf recursive', rawRows: state.rawRows, errors: [], warnings: state.expandFailures, endpointsUsed: [] },
      __skaSyncMeta: { dataSource: 'wafdata-session', source: 'WAF_RECURSIVE', eventType: 'wafdata-recursive-expand', rootId: root.id, rawRows: state.rawRows, displayRows: rows.length, validationStatus: 'VALID', expandDepth: state.maxDepth, lastSyncAt: new Date().toISOString() }
    };
  }

  function tableHeaders() {
    var table = byId('bomTable');
    var tr = table && table.querySelector('thead tr');
    if (tr) tr.innerHTML = '<th></th><th>Título</th><th>Descrição</th><th>Revisão</th><th>Proprietário</th><th>Estado de maturidade</th>';
  }

  function renderTable(payload) {
    var table = byId('bomTable');
    var tbody = table && table.querySelector('tbody');
    if (!tbody) return;
    tableHeaders();
    var rows = payload.rows || [];
    tbody.innerHTML = rows.map(function (row, idx) {
      var level = Number(row.level || 0);
      var indent = Math.min(160, level * 18);
      var marker = level === 0 ? 'R' : (row.title || row.name || '?').charAt(0).toUpperCase();
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
    var pager = byId('tablePager');
    if (pager) pager.textContent = c.displayRows + ' linhas exibidas · ' + c.occurrenceCount + ' ocorrências · ' + c.uniqueReferenceCount + ' refs únicas · rawRows ' + c.rawRows + ' · depth ' + c.depth + (c.partial ? ' · parcial' : '');
    var sel = byId('selectionLabel');
    if (sel) sel.textContent = (payload.root && payload.root.title) || '';
    var lbl = byId('tableProductLabel');
    if (lbl) lbl.textContent = (payload.root && payload.root.title) || '';
    var diag = byId('skaBomDiagnostics');
    if (diag) {
      diag.classList.remove('bom-hidden');
      diag.innerHTML = '<span class="bom-ska-diag-summary">Fonte: wafdata-recursive · linhas: ' + esc(c.displayRows) + ' · ocorrências: ' + esc(c.occurrenceCount) + ' · refs únicas: ' + esc(c.uniqueReferenceCount) + ' · rawRows=' + esc(c.rawRows) + ' · depth=' + esc(c.depth) + ' · ' + (c.partial ? 'PARTIAL' : 'VALID') + '</span>';
    }
    var badge = byId('explorerSourceBadge');
    if (badge) badge.textContent = 'Fonte: WAFData recursivo / dseng';
    status('E-BOM completa via WAFData recursivo — ' + c.displayRows + ' linhas / ' + c.occurrenceCount + ' ocorrências.', 'ok');
  }

  function depthValue() {
    var input = byId('skaDepthInput');
    var v = Number(input && input.value);
    if (!v || v < 2) v = DEFAULT_DEPTH;
    v = Math.max(1, Math.min(v, MAX_DEPTH));
    if (input) { input.max = String(MAX_DEPTH); input.value = String(v); }
    return v;
  }

  function syncRecursive() {
    var runId = ++loadRunId;
    var client = w.__waf3dxClient;
    if (!client) { status('WAF3DX client não carregado.', 'error'); return Promise.reject(new Error('WAF3DX_CLIENT_MISSING')); }
    status('Lendo seleção atual do Product Explorer…', 'info');
    return resolveRootAsync(client).then(function (resolved) {
      if (runId !== loadRunId) return null;
      if (!resolved || !resolved.ok || !validId(resolved.rootId)) {
        status((resolved && resolved.error) || 'Seleção inválida no Product Explorer.', 'error');
        throw new Error((resolved && resolved.error) || 'ROOT_NOT_RESOLVED');
      }
      var depth = depthValue();
      status('Carregando E-BOM completa via WAFData recursivo… ' + resolved.title, 'info');
      var rootRow = {
        rowKey: 'root:' + resolved.rootId,
        id: resolved.rootId,
        referenceId: resolved.rootId,
        physicalId: resolved.rootId,
        sourcePhysicalId: resolved.rootId,
        parentId: '',
        parentReferenceId: '',
        instanceId: '',
        path: ['root:' + resolved.rootId],
        level: 0,
        title: resolved.title || resolved.rootId,
        name: resolved.title || resolved.rootId,
        description: resolved.title || resolved.rootId,
        revision: '',
        owner: '',
        maturity: '',
        state: '',
        type: 'VPMReference',
        displayType: 'VPMReference',
        quantity: 1,
        source: 'wafdata-recursive',
        isRoot: true
      };
      var rows = [rootRow];
      var state = { rootId: resolved.rootId, maxDepth: depth, maxNodes: MAX_NODES, childrenCache: {}, rowKeys: { 'root:' + resolved.rootId: true }, rawRows: 0, expandFailures: [] };
      return client.detectWafData()
        .then(function (d) { if (!d.wafAvailable) throw new Error('WAFData indisponível'); return client.getEngItem(resolved.rootId); })
        .then(function (rootRes) {
          if (rootRes && rootRes.ok) {
            rootRow.title = rootRes.title || rootRow.title;
            rootRow.name = rootRow.title;
            rootRow.description = rootRow.title;
            rootRow.maturity = rootRes.state || rootRow.maturity;
            rootRow.state = rootRes.state || rootRow.state;
            rootRow.type = rootRes.type || rootRow.type;
          }
          return buildTree(client, rootRow, 0, rootRow.rowKey, {}, rows, state);
        })
        .then(function () {
          if (runId !== loadRunId) return null;
          var payload = payloadFrom({ id: resolved.rootId, title: rootRow.title }, rows, state);
          lastPayload = payload;
          w.__bomSkaLastPayload = payload;
          w.__BOM_WAF_RECURSIVE_RUNTIME__ = { rootId: resolved.rootId, title: rootRow.title, rows: rows.length, occurrences: payload.counts.occurrenceCount, refs: payload.counts.uniqueReferenceCount, depth: depth, rawRows: state.rawRows, loadedAt: new Date().toISOString(), partial: payload.partial };
          renderTable(payload);
          updateUi(payload);
          log('rows=' + rows.length, payload.counts);
          return payload;
        });
    }).catch(function (err) {
      status('Falha E-BOM recursiva: ' + (err && err.message ? err.message : err), 'error');
      throw err;
    });
  }

  function actionStatus(msg) { var el = byId('bomFinalActionStatus'); if (el) el.textContent = msg; }

  function selectRow(row) {
    activeRow = row;
    if (!row) return;
    if (lastPayload) renderTable(lastPayload);
    var meta = byId('partPreviewMeta');
    if (meta) {
      meta.innerHTML = '<div><strong>Título</strong> ' + esc(row.title || row.name) + '</div>' +
        '<div><strong>Reference ID</strong> ' + esc(row.referenceId) + '</div>' +
        '<div><strong>Instance ID</strong> ' + esc(row.instanceId || '—') + '</div>' +
        '<div><strong>Proprietário</strong> ' + esc(row.owner || '—') + '</div>' +
        '<div><strong>Maturidade</strong> ' + esc(row.maturity || row.state || '—') + '</div>' +
        '<button type="button" class="bom-btn bom-btn-primary" id="btnFinal3dView">Ver 3D real</button> ' +
        '<button type="button" class="bom-btn bom-btn-secondary" id="btnFinalMaturity">Alterar maturidade</button>' +
        '<div id="bomFinalActionStatus" class="bom-maturity-modal-status"></div>';
    }
    var img = byId('partPreviewImage');
    if (img) img.innerHTML = '<span class="bom-preview-placeholder">Linha real selecionada. Clique Ver 3D real para localizar geometria.</span>';
    setTimeout(function () {
      var b3d = byId('btnFinal3dView');
      var bm = byId('btnFinalMaturity');
      if (b3d) b3d.onclick = function () { run3d(row); };
      if (bm) bm.onclick = function () { runMaturity(row); };
    }, 0);
  }

  function run3d(row) {
    var c = w.__waf3dxClient;
    if (!c) return;
    actionStatus('Localizando geometria real…');
    c.find3DGeometrySource(row.referenceId, { expandDepth: 3 }).then(function (src) {
      if (!src || !src.geometrySourceFound) {
        actionStatus('3D indisponível: ' + ((src && (src.blocker || src.error || src.recommendation)) || 'sem geometria baixável'));
        return;
      }
      return c.downloadGeometry(src).then(function (dl) {
        if (!dl || !dl.ok) {
          actionStatus('Geometria localizada, mas download falhou: ' + ((dl && dl.error) || 'sem download'));
          return;
        }
        return c.convertGeometryIfNeeded(dl).then(function (conv) {
          if (!conv || (!conv.conversionOk && !/^(GLB|GLTF|OBJ|STL)$/i.test(s(dl.format)))) {
            actionStatus((conv && (conv.blocker || conv.recommendation)) || 'Conversão necessária para renderizar.');
            return;
          }
          return c.renderGeometryInThree({ blobUrl: conv.blobUrl, format: conv.format || dl.format }, { title: row.title }).then(function (r) {
            actionStatus(r && r.viewerRenderedRealModel ? '3D real renderizado.' : 'Falha ao renderizar 3D real.');
          });
        });
      });
    }).catch(function (err) { actionStatus('3D falhou: ' + (err && err.message ? err.message : err)); });
  }

  function runMaturity(row) {
    var c = w.__waf3dxClient;
    if (!c) return;
    actionStatus('Consultando maturidade/transições…');
    c.getMaturity(row.referenceId).then(function (read) {
      return c.getAllowedMaturityTransitions(row.referenceId).then(function (tr) {
        if (!tr || !tr.transitionsLoaded || !(tr.transitions || []).length) {
          actionStatus('Leitura OK: ' + ((read && read.current) || row.maturity || '—') + '. Mudança bloqueada: transições oficiais não disponíveis.');
        } else {
          actionStatus('Transições disponíveis pelo WAFData. Use Executor 3DX para mudança verificada.');
        }
      });
    }).catch(function (err) { actionStatus('Maturidade falhou: ' + (err && err.message ? err.message : err)); });
  }

  function bindButtons() {
    var sync = byId('btnSyncExplorer');
    var refresh = byId('btnRefreshBom');
    [sync, refresh].forEach(function (btn) {
      if (!btn || btn.__BOM_RECURSIVE_BOUND__) return;
      btn.__BOM_RECURSIVE_BOUND__ = true;
      btn.addEventListener('click', function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }
        syncRecursive().catch(function () {});
      }, true);
    });
    var depth = byId('skaDepthInput');
    if (depth) { depth.max = String(MAX_DEPTH); if (!s(depth.value) || Number(depth.value) < 2) depth.value = String(DEFAULT_DEPTH); }
  }

  function install() {
    if (!byId('bomTable')) return;
    if (!installed) { installed = true; log('installed', BUILD); }
    bindButtons();
  }

  function loop(i) {
    install();
    if (i < 120) setTimeout(function () { loop(i + 1); }, 500);
  }

  w.__bomRecursiveFinalizer = { build: BUILD, sync: syncRecursive, getPayload: function () { return lastPayload; }, resolveRootAsync: resolveRootAsync };
  loop(0);
})(window);
