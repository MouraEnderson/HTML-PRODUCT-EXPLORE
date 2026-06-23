/*
 * BOM Analytics — Fase 3 controller patch bom20260623d.
 * Geometry actions are only available after a real E-BOM row is selected.
 * No selected row, no 3D button, no fake blocker panel.
 */
(function (global) {
  'use strict';

  var lastSelectedRow = null;
  var pollTimer = null;

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function escapeHtml(value) {
    var node = document.createElement('div');
    node.textContent = text(value);
    return node.innerHTML;
  }

  function ownRoot() {
    return global.__3DX_UI_ROOT__ || document;
  }

  function byId(id) {
    var root = ownRoot();
    return root && root.querySelector ? root.querySelector('#' + id) : null;
  }

  function getController() {
    return global.__bomWafSessionController;
  }

  function getState() {
    var controller = getController();
    if (!controller || !controller.getState) return null;
    try { return controller.getState(); } catch (e) { return null; }
  }

  function isRealBomRow(row) {
    if (!row || typeof row !== 'object') return false;
    if (!text(row.rowKey)) return false;
    if (!text(row.referenceId || row.physicalid)) return false;
    return true;
  }

  function getSelectedRowStrict() {
    if (isRealBomRow(lastSelectedRow)) return lastSelectedRow;
    var state = getState();
    var selected = text(state && state.selectedRowKey);
    var rows = (state && Array.isArray(state.rows)) ? state.rows : [];
    if (!selected || !rows.length) return null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].rowKey === selected && isRealBomRow(rows[i])) return rows[i];
    }
    return null;
  }

  function removeButton() {
    var btn = byId('btnResolveRealGeometry');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    var holder = byId('bomGeometryActions');
    if (holder && holder.parentNode && !holder.children.length) holder.parentNode.removeChild(holder);
  }

  function renderNoBomState() {
    removeButton();
    var image = byId('partPreviewImage');
    var cell = byId('viewStatusCell');
    if (cell) cell.textContent = 'Carregue a E-BOM real e selecione uma linha.';
    if (image) {
      image.innerHTML =
        '<div class="bom-3d-canvas-empty bom-geometry-proof bom-geometry-proof-blocked">' +
        '<h3>3D real aguardando E-BOM</h3>' +
        '<p>Carregue a E-BOM real primeiro. O Geometry Resolver s\u00f3 habilita com Reference ID real selecionado.</p>' +
        '</div>';
    }
  }

  function prettyEvidence(result) {
    var evidence = (result && result.evidence) || [];
    if (!evidence.length) return '<p>Sem evidencias retornadas.</p>';
    return '<ol class="bom-geometry-evidence">' + evidence.map(function (item) {
      var ok = item.ok ? 'PASS' : 'FAIL';
      return '<li><strong>' + escapeHtml(ok + ' · ' + item.step) + '</strong><pre>' +
        escapeHtml(JSON.stringify(item.detail || {}, null, 2)) + '</pre></li>';
    }).join('') + '</ol>';
  }

  function renderGeometryResult(result) {
    var image = byId('partPreviewImage');
    var cell = byId('viewStatusCell');
    if (cell) {
      cell.textContent = result.geometrySourceFound
        ? 'Fonte de geometria real encontrada (' + (result.format || 'formato detectado') + ').'
        : 'Bloqueado: ' + (result.blocker || 'geometria real nao encontrada');
    }
    if (!image) return;
    if (result.geometrySourceFound) {
      var first = result.files && result.files[0];
      image.innerHTML =
        '<div class="bom-3d-canvas-empty bom-geometry-proof bom-geometry-proof-ok">' +
        '<h3>Geometry Resolver: fonte real encontrada</h3>' +
        '<p><strong>Reference ID:</strong> ' + escapeHtml(result.referenceId || '-') + '</p>' +
        '<p><strong>Instance ID:</strong> ' + escapeHtml(result.instanceId || '-') + '</p>' +
        '<p><strong>Formato:</strong> ' + escapeHtml(result.format || '-') + '</p>' +
        '<p><strong>Arquivo:</strong> ' + escapeHtml(first && first.name || '-') + '</p>' +
        '<p class="bom-preview-hint">Render Three.js ainda requer loader/download ticket valido para este formato. Nenhum sucesso visual sera marcado sem render real.</p>' +
        prettyEvidence(result) +
        '</div>';
      return;
    }
    image.innerHTML =
      '<div class="bom-3d-canvas-empty bom-geometry-proof bom-geometry-proof-blocked">' +
      '<h3>Geometry Resolver: bloqueio provado</h3>' +
      '<p><strong>Reference ID:</strong> ' + escapeHtml(result.referenceId || '-') + '</p>' +
      '<p><strong>Instance ID:</strong> ' + escapeHtml(result.instanceId || '-') + '</p>' +
      '<p><strong>Blocker:</strong> ' + escapeHtml(result.blocker || 'No downloadable or convertible geometry source found') + '</p>' +
      prettyEvidence(result) +
      '</div>';
  }

  function ensureButtonForSelectedRow() {
    var row = getSelectedRowStrict();
    if (!row) {
      renderNoBomState();
      return;
    }
    var meta = byId('partPreviewMeta');
    if (!meta) return;
    var holder = byId('bomGeometryActions');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'bomGeometryActions';
      holder.className = 'bom-geometry-actions';
      meta.appendChild(holder);
    }
    var btn = byId('btnResolveRealGeometry');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnResolveRealGeometry';
      btn.className = 'bom-btn bom-btn-secondary';
      btn.textContent = 'Resolver 3D real';
      holder.appendChild(btn);
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        var currentRow = getSelectedRowStrict();
        if (!currentRow) {
          renderNoBomState();
          return;
        }
        if (typeof BomGeometryResolver === 'undefined' || !BomGeometryResolver.find3DGeometrySource) {
          renderGeometryResult({
            referenceId: currentRow.referenceId,
            instanceId: currentRow.instanceId,
            geometrySourceFound: false,
            blocker: 'BomGeometryResolver nao carregado.',
            evidence: [{ step: 'resolver-loaded', ok: false, detail: {} }]
          });
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Resolvendo 3D real...';
        BomGeometryResolver.find3DGeometrySource(currentRow)
          .then(renderGeometryResult)
          .catch(function (error) {
            renderGeometryResult({
              referenceId: currentRow.referenceId,
              instanceId: currentRow.instanceId,
              geometrySourceFound: false,
              blocker: text(error && error.message) || 'Erro no Geometry Resolver.',
              evidence: [{ step: 'resolver-exception', ok: false, detail: { message: text(error && error.message) } }]
            });
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Resolver 3D real';
          });
      });
    }
  }

  function patchController() {
    var controller = getController();
    if (!controller || controller.__geometryPatchInstalledD) return false;
    if (!controller.selectRow) return false;
    var original = controller.selectRow;
    controller.selectRow = function () {
      var result = original.apply(controller, arguments);
      lastSelectedRow = isRealBomRow(result) ? result : null;
      window.setTimeout(ensureButtonForSelectedRow, 0);
      return result;
    };
    controller.__geometryPatchInstalledD = true;
    window.setTimeout(ensureButtonForSelectedRow, 0);
    if (!pollTimer) {
      pollTimer = window.setInterval(function () {
        var state = getState();
        var rows = state && Array.isArray(state.rows) ? state.rows : [];
        if (!rows.length) lastSelectedRow = null;
        ensureButtonForSelectedRow();
      }, 1200);
    }
    return true;
  }

  function boot() {
    if (patchController()) return;
    window.setTimeout(boot, 200);
  }

  boot();
})(window);
