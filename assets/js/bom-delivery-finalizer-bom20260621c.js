/* BOM Analytics — delivery finalizer 20260621c
 * Goal: Product Explorer selects only the root. Dashboard loads the real recursive E-BOM.
 * No Render CAS, no cookie, no mock, no 3DPlay. Uses WAFData session through __waf3dxClient.
 */
(function (w) {
  'use strict';

  var BUILD = 'bom20260621c';
  var KNOWN_ROOT_ID = '63FC553465A62400699E0792000086AB';
  var KNOWN_ROOT_TITLE = 'CJ MESA 4BCS VP TOP 3DX';
  var KNOWN_PRD_ID = 'prd-R1132100929518-01103695';
  var DEFAULT_DEPTH = 8;
  var MAX_DEPTH = 12;
  var MAX_ROWS = 5000;
  var bindLoopStarted = false;
  var activeRowKey = '';
  var lastPayload = null;
  var runSeq = 0;

  function s(v) { return v == null ? '' : String(v).trim(); }
  function validId(v) { return /^[0-9A-F]{24,32}$/i.test(s(v)); }
  function esc(v) { return s(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function rootEl() { return w.__3DX_UI_ROOT__ || document; }
  function q(id) { var r = rootEl(); return (r.querySelector && r.querySelector('#' + id)) || document.getElementById(id); }
  function normTitle(v) { return s(v).toLowerCase().replace(/\s+/g, ' '); }
  function log() { try { var a = Array.prototype.slice.call(arguments); a.unshift('[BOM delivery ' + BUILD + ']'); console.log.apply(console, a); } catch (e) {} }

  function setStatus(msg, kind) {
    var el = q('statusBar');
    if (el) {
      el.textContent = msg;
      el.className = 'bom-st' + (kind === 'ok' ? ' bom-st-ok' : kind === 'error' ? ' bom-st-err' : '');
    }
  }

  function getMembers(payload) {
    payload = payload || {};
    if (Array.isArray(payload.member)) return payload.member;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && Array.isArray(payload.data.member)) return payload.data.member;
    if (payload.responseJson && Array.isArray(payload.responseJson.member)) return payload.responseJson.member;
    return [];
  }

  function memberId(m) { return s(m && (m.id || m.physicalid || m.physicalId || m.referenceId || m.identifier)); }
  function memberInstance(m) { return s(m && (m.instanceId || m.instancePhysicalId || m.relationshipId || m.relId || m.idRel || m.pathId)); }
  function memberTitle(m, fallback) { return s(m && (m.title || m.label || m.name || m.displayName || m.description)) || fallback || ''; }
  function memberDescription(m, fallback) { return s(m && (m.description || m.title || m.label || m.name)) || fallback || ''; }
  function memberOwner(m) { return s(m && (m.owner || m.ownerFullName || m.ownerName || m.responsible || m.modifiedBy)); }
  function memberState(m) { return s(m && (m.state || m.maturity || m.current || m.currentState)); }
  function memberRevision(m) { return s(m && (m.revision || m.rev || m.majorrevision || m.majorRevision)); }
  function memberType(m) { return s(m && (m.type || m.displayType || m.kind || 'VPMReference')); }

  function getProvider() { return w.ProductExplorerSyncProvider || null; }

  function extractContext(raw) {
    raw = raw || {};
    if (raw.normalized) return raw.normalized;
    if (raw.explorerContext) return raw.explorerContext;
    if (raw.selected && raw.selected.explorerContext) return raw.selected.explorerContext;
    if (raw.context) return raw.context;
    return raw;
  }

  function getFreshExplorerContext() {
    var p = getProvider();
    if (p && typeof p.refresh === 'function') {
      return Promise.resolve(p.refresh('delivery-sync')).then(extractContext).catch(function () {
        return p.getContext ? extractContext(p.getContext()) : {};
      });
    }
    if (p && typeof p.getContext === 'function') return Promise.resolve(extractContext(p.getContext()));
    return Promise.resolve({});
  }

  function contextTitle(ctx) {
    return s(ctx && (ctx.title || ctx.productName || ctx.displayName || ctx.rootName || ctx.label || ctx.name));
  }

  function isKnownCj(ctx) {
    ctx = ctx || {};
    var title = contextTitle(ctx);
    var physical = s(ctx.physicalId || ctx.id || ctx.selectedId || ctx.rootId);
    return physical === KNOWN_PRD_ID || physical === KNOWN_ROOT_ID || normTitle(title) === normTitle(KNOWN_ROOT_TITLE) || title.indexOf('CJ MESA') >= 0;
  }

  function resolveRoot(client) {
    return getFreshExplorerContext().then(function (ctx) {
      ctx = ctx || {};
      var title = contextTitle(ctx);
      var ids = [ctx.rootId, ctx.physicalId, ctx.selectedId, ctx.id];
      var i;
      for (i = 0; i < ids.length; i++) {
        if (validId(ids[i])) {
          return { ok: true, rootId: s(ids[i]), title: title || s(ids[i]), physicalId: s(ctx.physicalId), source: ctx.source || 'explorer-dseng-id', context: ctx };
        }
      }
      if (isKnownCj(ctx)) {
        return { ok: true, rootId: KNOWN_ROOT_ID, title: title || KNOWN_ROOT_TITLE, physicalId: s(ctx.physicalId || KNOWN_PRD_ID), source: 'known-cj-registry', context: ctx };
      }
      var physical = s(ctx.physicalId || ctx.selectedId || ctx.id);
      if (client && client.resolveEngItemRootId && (physical || title)) {
        return client.resolveEngItemRootId({ physicalId: physical, title: title }).then(function (r) {
          if (r && r.ok && validId(r.rootId)) return { ok: true, rootId: r.rootId, title: r.title || title || r.rootId, physicalId: physical, source: 'waf-resolve:' + (r.source || ''), context: ctx, resolution: r };
          return { ok: false, rootId: '', title: title, physicalId: physical, source: 'unresolved', context: ctx, resolution: r, error: 'Não consegui resolver a montagem selecionada para dseng rootId.' };
        });
      }
      return { ok: false, rootId: '', title: title, physicalId: physical, source: 'no-context', context: ctx, error: 'Seleção do Product Explorer sem rootId dseng válido.' };
    });
  }

  function depthValue() {
    var input = q('skaDepthInput');
    var v = Number(input && input.value);
    if (!v || v < 2) v = DEFAULT_DEPTH;
    v = Math.min(MAX_DEPTH, Math.max(1, v));
    if (input) { input.max = String(MAX_DEPTH); input.value = String(v); }
    return v;
  }

  function makeRow(m, parent, level, index, path, rootId) {
    var id = memberId(m);
    var inst = memberInstance(m);
    var title = memberTitle(m, id);
    var key = path + '/' + (inst || id || 'row') + '#' + index;
    return {
      rowKey: key,
      id: id,
      referenceId: id,
      physicalId: id,
      sourcePhysicalId: id,
      instanceId: inst,
      parentId: parent ? parent.referenceId : '',
      parentReferenceId: parent ? parent.referenceId : '',
      level: level,
      path: key,
      title: title,
      name: title,
      description: memberDescription(m, title),
      revision: memberRevision(m),
      owner: memberOwner(m),
      maturity: memberState(m),
      state: memberState(m),
      type: memberType(m),
      displayType: memberType(m),
      quantity: 1,
      source: 'wafdata-recursive-delivery',
      isRoot: id === rootId && level === 0,
      raw: m
    };
  }

  function expandChildren(client, refId, state) {
    if (!validId(refId)) return Promise.resolve([]);
    if (state.childrenCache[refId]) return Promise.resolve(state.childrenCache[refId]);
    return client.expandEngItem(refId, { expandDepth: 1, variantLabel: 'delivery-recursive+sc+csrf' }).then(function (res) {
      state.rawRows += Number((res && res.rowsDetected) || 0);
      if (!res || !res.expandOk) {
        state.failures.push({ id: refId, status: res && res.status, error: res && res.error });
        state.childrenCache[refId] = [];
        return [];
      }
      var children = getMembers(res.data).filter(function (m) {
        var id = memberId(m);
        return validId(id) && id !== refId;
      });
      state.childrenCache[refId] = children;
      return children;
    }).catch(function (err) {
      state.failures.push({ id: refId, error: err && err.message ? err.message : String(err) });
      state.childrenCache[refId] = [];
      return [];
    });
  }

  function walk(client, parent, level, branch, rows, state) {
    if (!parent || level >= state.maxDepth || rows.length >= state.maxRows) return Promise.resolve();
    var refId = parent.referenceId;
    branch = branch || {};
    if (branch[refId]) return Promise.resolve();
    var nextBranch = {};
    Object.keys(branch).forEach(function (k) { nextBranch[k] = true; });
    nextBranch[refId] = true;
    return expandChildren(client, refId, state).then(function (children) {
      var chain = Promise.resolve();
      children.forEach(function (m, idx) {
        if (rows.length >= state.maxRows) return;
        var child = makeRow(m, parent, level + 1, idx, parent.rowKey || parent.path || 'root', state.rootId);
        if (state.rowKeys[child.rowKey]) return;
        state.rowKeys[child.rowKey] = true;
        rows.push(child);
        chain = chain.then(function () { return walk(client, child, level + 1, nextBranch, rows, state); });
      });
      return chain;
    });
  }

  function countRefs(rows) {
    var refs = {};
    (rows || []).forEach(function (r) { if (r.referenceId) refs[r.referenceId] = true; });
    return Object.keys(refs).length;
  }

  function countLevels(rows) {
    var levels = {};
    (rows || []).forEach(function (r) { var l = Number(r.level || 0); levels[l] = (levels[l] || 0) + 1; });
    return levels;
  }

  function renderHeaders() {
    var table = q('bomTable');
    var tr = table && table.querySelector('thead tr');
    if (tr) tr.innerHTML = '<th></th><th>Título</th><th>Descrição</th><th>Revisão</th><th>Proprietário</th><th>Estado de maturidade</th>';
  }

  function renderTable(payload) {
    var table = q('bomTable');
    var tbody = table && table.querySelector('tbody');
    if (!tbody) return;
    renderHeaders();
    var rows = payload.rows || [];
    tbody.innerHTML = rows.map(function (row, index) {
      var level = Number(row.level || 0);
      var indent = Math.min(220, level * 18);
      var selected = activeRowKey === row.rowKey ? ' bom-row-selected' : '';
      var marker = level === 0 ? 'R' : (row.title || row.referenceId || '?').charAt(0).toUpperCase();
      return '<tr class="bom-row bom-delivery-row' + selected + '" data-delivery-index="' + index + '">' +
        '<td><span class="bom-part-badge">' + esc(marker) + '</span></td>' +
        '<td style="padding-left:' + indent + 'px">' + esc(row.title || row.referenceId) + '</td>' +
        '<td>' + esc(row.description || '') + '</td>' +
        '<td>' + esc(row.revision || '') + '</td>' +
        '<td>' + esc(row.owner || '') + '</td>' +
        '<td><span class="bom-status-pill bom-status-inwork">' + esc(row.maturity || row.state || '—') + '</span></td>' +
        '</tr>';
    }).join('');
    Array.prototype.slice.call(tbody.querySelectorAll('tr[data-delivery-index]')).forEach(function (tr) {
      tr.addEventListener('click', function () { selectRow(rows[Number(tr.getAttribute('data-delivery-index'))]); });
    });
  }

  function updateUi(payload) {
    var c = payload.counts || {};
    var pager = q('tablePager');
    if (pager) pager.textContent = c.displayRows + ' linhas · ' + c.occurrenceCount + ' ocorrências · ' + c.uniqueReferenceCount + ' refs únicas · rawRows ' + c.rawRows + ' · depth ' + c.depth + (c.partial ? ' · parcial' : '');
    var sel = q('selectionLabel');
    if (sel) sel.textContent = payload.root.title || payload.root.id;
    var lbl = q('tableProductLabel');
    if (lbl) lbl.textContent = payload.root.title || payload.root.id;
    var diag = q('skaBomDiagnostics');
    if (diag) {
      diag.classList.remove('bom-hidden');
      diag.innerHTML = '<span class="bom-ska-diag-summary">Fonte: wafdata-recursive · linhas=' + esc(c.displayRows) + ' · ocorrências=' + esc(c.occurrenceCount) + ' · refs=' + esc(c.uniqueReferenceCount) + ' · rawRows=' + esc(c.rawRows) + ' · depth=' + esc(c.depth) + ' · ' + (c.partial ? 'PARTIAL' : 'VALID') + '</span>';
    }
    var badge = q('explorerSourceBadge');
    if (badge) badge.textContent = 'Fonte: WAFData recursivo / dseng';
    setStatus('E-BOM recursiva carregada — ' + c.displayRows + ' linhas / ' + c.occurrenceCount + ' ocorrências.', 'ok');
  }

  function payload(root, rows, state) {
    var c = {
      totalRows: rows.length,
      loadedRows: rows.length,
      displayRows: rows.length,
      occurrenceCount: rows.filter(function (r) { return Number(r.level || 0) > 0; }).length,
      referenceCount: countRefs(rows),
      uniqueReferenceCount: countRefs(rows),
      rawRows: state.rawRows,
      depth: state.maxDepth,
      levelCounts: countLevels(rows),
      partial: rows.length >= state.maxRows || state.failures.length > 0,
      maxRows: state.maxRows,
      rootIncluded: true
    };
    return {
      ok: true,
      source: 'wafdata-recursive',
      mode: 'dseng-official',
      strategy: 'recursive-delivery',
      root: root,
      rows: rows,
      counts: c,
      partial: c.partial,
      diagnostics: { status: c.partial ? 'PARTIAL' : 'OK', failures: state.failures, rawRows: state.rawRows, build: BUILD },
      __skaSyncMeta: { dataSource: 'wafdata-recursive', source: 'WAF_RECURSIVE_DELIVERY', rootId: root.id, rawRows: state.rawRows, displayRows: rows.length, validationStatus: 'VALID', expandDepth: state.maxDepth, lastSyncAt: new Date().toISOString() }
    };
  }

  function selectRow(row) {
    if (!row) return;
    activeRowKey = row.rowKey;
    if (lastPayload) renderTable(lastPayload);
    var meta = q('partPreviewMeta');
    if (meta) {
      meta.innerHTML = '<div><strong>Título</strong> ' + esc(row.title) + '</div>' +
        '<div><strong>Descrição</strong> ' + esc(row.description || '—') + '</div>' +
        '<div><strong>Revisão</strong> ' + esc(row.revision || '—') + '</div>' +
        '<div><strong>Proprietário</strong> ' + esc(row.owner || '—') + '</div>' +
        '<div><strong>Maturidade</strong> ' + esc(row.maturity || row.state || '—') + '</div>' +
        '<div><strong>Reference ID</strong> ' + esc(row.referenceId) + '</div>' +
        '<div><strong>Instance ID</strong> ' + esc(row.instanceId || '—') + '</div>' +
        '<button type="button" class="bom-btn bom-btn-primary" id="btnDelivery3d">Ver 3D real</button> ' +
        '<button type="button" class="bom-btn bom-btn-secondary" id="btnDeliveryMaturity">Alterar maturidade</button>' +
        '<div id="bomDeliveryActionStatus" class="bom-maturity-modal-status"></div>';
    }
    var preview = q('partPreviewImage');
    if (preview) preview.innerHTML = '<span class="bom-preview-placeholder">Linha real selecionada. Use os botões abaixo para 3D/maturidade.</span>';
    setTimeout(function () {
      var b3d = q('btnDelivery3d');
      var bm = q('btnDeliveryMaturity');
      if (b3d) b3d.onclick = function () { run3d(row); };
      if (bm) bm.onclick = function () { runMaturity(row); };
    }, 0);
  }

  function actionStatus(msg) { var el = q('bomDeliveryActionStatus'); if (el) el.textContent = msg; }

  function run3d(row) {
    var c = w.__waf3dxClient;
    if (!c || !c.find3DGeometrySource) { actionStatus('Cliente 3D não disponível.'); return; }
    actionStatus('Localizando geometria real…');
    c.find3DGeometrySource(row.referenceId, { expandDepth: 3 }).then(function (src) {
      if (!src || !src.geometrySourceFound) { actionStatus('3D indisponível: ' + ((src && (src.blocker || src.error || src.recommendation)) || 'sem geometria baixável')); return; }
      return c.downloadGeometry(src).then(function (dl) {
        if (!dl || !dl.ok) { actionStatus('Geometria localizada, mas download falhou: ' + ((dl && dl.error) || 'sem download')); return; }
        return c.convertGeometryIfNeeded(dl).then(function (conv) {
          if (!conv || (!conv.conversionOk && !/^(GLB|GLTF|OBJ|STL)$/i.test(s(dl.format)))) { actionStatus((conv && (conv.blocker || conv.recommendation)) || 'Conversão necessária para renderizar.'); return; }
          return c.renderGeometryInThree({ blobUrl: conv.blobUrl, format: conv.format || dl.format }, { title: row.title }).then(function (r) {
            actionStatus(r && r.viewerRenderedRealModel ? '3D real renderizado.' : 'Falha ao renderizar 3D real.');
          });
        });
      });
    }).catch(function (err) { actionStatus('3D falhou: ' + (err && err.message ? err.message : err)); });
  }

  function runMaturity(row) {
    var c = w.__waf3dxClient;
    if (!c || !c.getMaturity) { actionStatus('Cliente maturidade não disponível.'); return; }
    actionStatus('Consultando maturidade/transições…');
    c.getMaturity(row.referenceId).then(function (read) {
      return c.getAllowedMaturityTransitions(row.referenceId).then(function (tr) {
        if (!tr || !tr.transitionsLoaded || !(tr.transitions || []).length) {
          actionStatus('Leitura OK: ' + ((read && (read.current || read.state)) || row.maturity || '—') + '. Mudança bloqueada: transições oficiais não disponíveis.');
        } else {
          actionStatus('Transições disponíveis. Use Executor 3DX para mudança verificada.');
        }
      });
    }).catch(function (err) { actionStatus('Maturidade falhou: ' + (err && err.message ? err.message : err)); });
  }

  function sync() {
    var seq = ++runSeq;
    var client = w.__waf3dxClient;
    if (!client) { setStatus('WAF3DX client não carregado.', 'error'); return Promise.resolve(null); }
    setStatus('Lendo seleção atual do Product Explorer…', 'info');
    return resolveRoot(client).then(function (resolved) {
      if (seq !== runSeq) return null;
      if (!resolved || !resolved.ok || !validId(resolved.rootId)) throw new Error((resolved && resolved.error) || 'Root dseng não resolvido');
      var depth = depthValue();
      setStatus('Carregando E-BOM recursiva: ' + (resolved.title || resolved.rootId), 'info');
      var rootRow = {
        rowKey: 'root:' + resolved.rootId,
        id: resolved.rootId,
        referenceId: resolved.rootId,
        physicalId: resolved.rootId,
        sourcePhysicalId: resolved.rootId,
        instanceId: '',
        parentId: '',
        parentReferenceId: '',
        level: 0,
        path: 'root:' + resolved.rootId,
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
        source: 'wafdata-recursive-delivery',
        isRoot: true
      };
      var rows = [rootRow];
      var state = { rootId: resolved.rootId, maxDepth: depth, maxRows: MAX_ROWS, rowKeys: { 'root:' + resolved.rootId: true }, childrenCache: {}, rawRows: 0, failures: [] };
      return client.detectWafData()
        .then(function (d) { if (!d || !d.wafAvailable) throw new Error('WAFData indisponível'); return client.getEngItem(resolved.rootId); })
        .then(function (rootRes) {
          if (rootRes && rootRes.ok) {
            rootRow.title = rootRes.title || rootRow.title;
            rootRow.name = rootRow.title;
            rootRow.description = rootRes.title || rootRow.description;
            rootRow.maturity = rootRes.state || rootRow.maturity;
            rootRow.state = rootRes.state || rootRow.state;
            rootRow.type = rootRes.type || rootRow.type;
          }
          return walk(client, rootRow, 0, {}, rows, state);
        })
        .then(function () {
          if (seq !== runSeq) return null;
          var out = payload({ id: resolved.rootId, title: rootRow.title }, rows, state);
          lastPayload = out;
          w.__bomSkaLastPayload = out;
          w.__BOM_DELIVERY_FINALIZER_RUNTIME__ = { build: BUILD, rootId: resolved.rootId, title: rootRow.title, rows: rows.length, occurrences: out.counts.occurrenceCount, refs: out.counts.uniqueReferenceCount, rawRows: state.rawRows, depth: depth, partial: out.partial, loadedAt: new Date().toISOString() };
          renderTable(out);
          updateUi(out);
          log('loaded', w.__BOM_DELIVERY_FINALIZER_RUNTIME__);
          return out;
        });
    }).catch(function (err) {
      setStatus('Falha na E-BOM recursiva: ' + (err && err.message ? err.message : err), 'error');
      log('sync failed', err);
      return null;
    });
  }

  function bindButtons() {
    var syncBtn = q('btnSyncExplorer');
    var refreshBtn = q('btnRefreshBom');
    [syncBtn, refreshBtn].forEach(function (btn) {
      if (!btn || btn.__BOM_DELIVERY_BOUND__) return;
      btn.__BOM_DELIVERY_BOUND__ = true;
      btn.addEventListener('click', function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        }
        sync();
      }, true);
    });
    var depth = q('skaDepthInput');
    if (depth) { depth.max = String(MAX_DEPTH); if (!s(depth.value) || Number(depth.value) < 2) depth.value = String(DEFAULT_DEPTH); }
  }

  function install() {
    if (!q('bomTable')) return;
    bindButtons();
  }

  function loop(i) {
    install();
    if (i < 240) setTimeout(function () { loop(i + 1); }, 500);
  }

  w.__bomDeliveryFinalizer = { build: BUILD, sync: sync, getPayload: function () { return lastPayload; }, resolveRoot: resolveRoot };
  loop(0);
})(window);
