/**
 * @file ui/3dplay-viewer.js
 * Sprint 3 — painel de preview ao clicar numa linha da E-BOM (2D WAF + tentativa 3DPlay).
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

  function cfg() {
    return (APP_CONFIG && APP_CONFIG.THREE_DPLAY) || {};
  }

  function prefer2dPanel() {
    if (cfg().PREFER_2D_IN_PANEL === true) return true;
    if (cfg().EMBED_PLAYER === false) return true;
    try {
      if (typeof location !== 'undefined' && location.hostname.indexOf('github.io') >= 0) return true;
    } catch (e) { /* */ }
    return false;
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

  function renderThumb(node, sizeClass) {
    if (!thumbEl) thumbEl = uiRoot().querySelector('#bom3DPlayThumb');
    if (!thumbEl || !node) return;
    sizeClass = sizeClass || 'bom-thumb-sm';
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      thumbEl.innerHTML = '<div class="bom-3dplay-thumb-inner"></div>';
      PartImage.mountThumb(thumbEl.querySelector('.bom-3dplay-thumb-inner'), node, sizeClass);
    } else {
      thumbEl.innerHTML = '';
    }
  }

  function show2dInHost(node) {
    if (!hostEl) return;
    hostEl.innerHTML = '<div class="bom-3dplay-2d-panel"></div>';
    var panel = hostEl.querySelector('.bom-3dplay-2d-panel');
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb && panel) {
      PartImage.mountThumb(panel, node, 'bom-thumb-xl');
    } else if (panel) {
      panel.innerHTML = '<p class="bom-3dplay-empty">Miniatura indisponível.</p>';
    }
    renderThumb(node, 'bom-thumb-sm');
  }

  function showUnavailable(node, sub) {
    if (!hostEl) return;
    hostEl.innerHTML =
      '<div class="bom-3dplay-empty">' +
      '<p>Pré-visualização 3D indisponível para esta linha.</p>' +
      '<p class="bom-3dplay-empty-sub">' + (sub || '') + '</p>' +
      '</div>';
    renderThumb(node);
  }

  function show(node) {
    if (!hostEl) init('#partPreviewImage');
    if (!hostEl) return;
    currentNode = node;
    if (!node) {
      clear();
      return;
    }

    var resolvedId = typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.resolvePhysicalId
      ? ThreeDPlayBridge.resolvePhysicalId(node)
      : String(node.sourcePhysicalId || node.physicalid || '');
    var playable = typeof ThreeDPlayBridge !== 'undefined' &&
      ThreeDPlayBridge.isPlayableId &&
      ThreeDPlayBridge.isPlayableId(resolvedId);

    if (!playable) {
      showUnavailable(
        node,
        'IDs de importação (IMP_/grid_) só mostram metadados. Carregue com Ctrl+C para obter prd-.'
      );
      renderStatus('Sem ID 3D — só metadados.', 'warn');
      return;
    }

    if (prefer2dPanel()) {
      show2dInHost(node);
      renderStatus(
        cfg().WIDGET_HINT || 'Pré-visualização 2D no painel (3DPlay embutido indisponível no Additional App).',
        'warn'
      );
      return;
    }

    hostEl.innerHTML = '<div class="bom-3dplay-loading">A preparar 3DPlay…</div>';
    renderStatus('A carregar modelo 3D…', '');

    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.showPart) {
      ThreeDPlayBridge.showPart(node, { container: hostEl }, function (st) {
        if (!st) return;
        if (st.mode === 'embedded' && st.ok) {
          renderStatus('3DPlay embutido', 'ok');
          renderThumb(node);
          return;
        }
        show2dInHost(node);
        renderStatus(st.message || 'Pré-visualização 2D (3DPlay indisponível)', 'warn');
      });
    } else {
      show2dInHost(node);
      renderStatus('Pré-visualização 2D', 'warn');
    }
  }

  function clear() {
    currentNode = null;
    if (typeof ThreeDPlayBridge !== 'undefined' && ThreeDPlayBridge.clear) {
      ThreeDPlayBridge.clear();
    }
    if (hostEl) {
      hostEl.innerHTML =
        '<div class="bom-3dplay-empty">' +
        '<p>Clique numa linha da E-BOM para visualizar a peça.</p>' +
        '</div>';
    }
    renderStatus('', '');
    if (thumbEl) thumbEl.innerHTML = '';
  }

  return { init: init, show: show, clear: clear, bind: bind };
})();
