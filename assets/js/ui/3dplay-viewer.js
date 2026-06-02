/**
 * @file ui/3dplay-viewer.js
 * Sprint 3 — painel 3DPlay na zona de preview (clique E-BOM).
 */
var ThreeDPlayViewer = (function () {
  'use strict';

  var hostEl = null;
  var statusEl = null;
  var thumbEl = null;
  var currentNode = null;

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function bind(container) {
    if (typeof container === 'string') {
      hostEl = uiRoot().querySelector(container);
    } else {
      hostEl = container;
    }
    if (!hostEl) return false;
    if (!hostEl.querySelector('.bom-3dplay-host')) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-shell">' +
        '<div class="bom-3dplay-host" id="bom3DPlayHost" aria-label="Visualizador 3DPlay"></div>' +
        '<p class="bom-3dplay-status" id="bom3DPlayStatus"></p>' +
        '<div class="bom-3dplay-thumb" id="bom3DPlayThumb"></div>' +
        '</div>';
    }
    hostEl = hostEl.querySelector('.bom-3dplay-host') || hostEl.querySelector('#bom3DPlayHost') || hostEl;
    statusEl = uiRoot().querySelector('#bom3DPlayStatus');
    thumbEl = uiRoot().querySelector('#bom3DPlayThumb');
    return !!hostEl;
  }

  function init(containerSelector) {
    var wrap = uiRoot().querySelector(containerSelector || '#partPreviewImage');
    if (!wrap) return;
    bind(wrap);
  }

  function renderStatus(text, kind) {
    if (!statusEl) statusEl = uiRoot().querySelector('#bom3DPlayStatus');
    if (!statusEl) return;
    statusEl.textContent = String(text || '');
    statusEl.className = 'bom-3dplay-status';
    if (kind === 'ok') statusEl.classList.add('bom-3dplay-status-ok');
    if (kind === 'warn') statusEl.classList.add('bom-3dplay-status-warn');
    if (kind === 'err') statusEl.classList.add('bom-3dplay-status-err');
  }

  function renderThumb(node) {
    if (!thumbEl) thumbEl = uiRoot().querySelector('#bom3DPlayThumb');
    if (!thumbEl || !node) return;
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      thumbEl.innerHTML = '<div class="bom-3dplay-thumb-inner"></div>';
      PartImage.mountThumb(thumbEl.querySelector('.bom-3dplay-thumb-inner'), node, 'bom-thumb-sm');
    } else {
      thumbEl.innerHTML = '';
    }
  }

  function show(node) {
    if (!hostEl) init('#partPreviewImage');
    if (!hostEl) return;
    currentNode = node;
    if (!node) {
      clear();
      return;
    }

    var playable = typeof ThreeDPlayBridge !== 'undefined' &&
      ThreeDPlayBridge.isPlayableId &&
      ThreeDPlayBridge.isPlayableId(ThreeDPlayBridge.resolvePhysicalId(node));

    if (!playable) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-empty">' +
        '<p>Pré-visualização 3D indisponível para esta linha.</p>' +
        '<p class="bom-3dplay-empty-sub">IDs de importação (INP_/grid_) só mostram miniatura 2D. ' +
        'Para 3D real, carregue via Explorer/API (prd-).</p>' +
        '</div>';
      renderStatus('Sem ID 3D — só metadados.', 'warn');
      renderThumb(node);
      return;
    }

    hostEl.innerHTML = '<div class="bom-3dplay-loading">A preparar 3DPlay…</div>';
    renderStatus('A carregar modelo 3D…', '');

    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.showPart) {
      ThreeDPlayBridge.showPart(node, { container: hostEl }, function (st) {
        if (!st) return;
        if (st.mode === 'embedded' && st.ok) {
          renderStatus('3DPlay embutido', 'ok');
        } else if (st.ok) {
          renderStatus(st.message || 'Enviado para 3DPlay', 'ok');
        } else {
          renderStatus(st.message || '3DPlay indisponível', 'warn');
        }
      });
    }
    renderThumb(node);
  }

  function clear() {
    currentNode = null;
    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.clear) {
      ThreeDPlayBridge.clear();
    }
    if (hostEl) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-empty">' +
        '<p>Clique numa linha da E-BOM para visualizar em 3DPlay.</p>' +
        '</div>';
    }
    renderStatus('', '');
    if (thumbEl) thumbEl.innerHTML = '';
  }

  return { init: init, show: show, clear: clear, bind: bind };
})();
