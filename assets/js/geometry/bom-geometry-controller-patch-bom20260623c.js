/*
 * BOM Analytics — Fase 3 controller patch.
 * Adds a real-geometry action to the selected-row panel without changing E-BOM loading.
 */
(function (global) {
  'use strict';

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

  function getSelectedRow() {
    var controller = getController();
    if (!controller || !controller.getState) return null;
    var state = controller.getState();
    var selected = text(state && state.selectedRowKey);
    var rows = (state && state.rows) || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].rowKey === selected) return rows[i];
    }
    return rows[0] || null;
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

  function installButton() {
    var meta = byId('partPreviewMeta');
    if (!meta || byId('btnResolveRealGeometry')) return;
    var holder = document.createElement('div');
    holder.className = 'bom-geometry-actions';
    holder.innerHTML = '<button type="button" id="btnResolveRealGeometry" class="bom-btn bom-btn-secondary">Resolver 3D real</button>';
    meta.appendChild(holder);
    var btn = byId('btnResolveRealGeometry');
    if (!btn) return;
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      var row = getSelectedRow();
      if (!row) {
        renderGeometryResult({
          geometrySourceFound: false,
          blocker: 'Nenhuma linha E-BOM real selecionada.',
          evidence: [{ step: 'selected-row', ok: false, detail: {} }]
        });
        return;
      }
      if (typeof BomGeometryResolver === 'undefined' || !BomGeometryResolver.find3DGeometrySource) {
        renderGeometryResult({
          referenceId: row.referenceId,
          instanceId: row.instanceId,
          geometrySourceFound: false,
          blocker: 'BomGeometryResolver nao carregado.',
          evidence: [{ step: 'resolver-loaded', ok: false, detail: {} }]
        });
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Resolvendo 3D real...';
      BomGeometryResolver.find3DGeometrySource(row)
        .then(renderGeometryResult)
        .catch(function (error) {
          renderGeometryResult({
            referenceId: row.referenceId,
            instanceId: row.instanceId,
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

  function patchController() {
    var controller = getController();
    if (!controller || controller.__geometryPatchInstalled) return false;
    if (!controller.selectRow) return false;
    var original = controller.selectRow;
    controller.selectRow = function () {
      var result = original.apply(controller, arguments);
      window.setTimeout(installButton, 0);
      return result;
    };
    controller.__geometryPatchInstalled = true;
    window.setTimeout(installButton, 0);
    return true;
  }

  function boot() {
    if (patchController()) return;
    window.setTimeout(boot, 200);
  }

  boot();
})(window);
