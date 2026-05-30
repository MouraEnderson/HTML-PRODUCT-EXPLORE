/**
 * @file ui/part-preview.js
 * Painel de preview 2D ao clicar numa linha da E-BOM monitorada.
 */
var PartPreview = (function () {
  'use strict';

  var panel;
  var imageWrap;
  var metaEl;
  var titleEl;
  var hintEl;

  function init(selector) {
    panel = document.querySelector(selector);
    if (!panel) return;
    imageWrap = panel.querySelector('#partPreviewImage') || panel.querySelector('.bom-preview-image');
    metaEl = panel.querySelector('#partPreviewMeta') || panel.querySelector('.bom-preview-meta');
    titleEl = panel.querySelector('#partPreviewTitle') || panel.querySelector('.bom-preview-title');
    hintEl = panel.querySelector('.bom-preview-hint');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function ownerText(node) {
    if (typeof MetricsEngine !== 'undefined' && MetricsEngine.ownerLabel) {
      return MetricsEngine.ownerLabel(node.owner);
    }
    return String(node.owner || '—');
  }

  function maturityText(node) {
    return String(node.maturity || node.state || '—').trim() || '—';
  }

  function placeholderHtml(node) {
    var name = escapeHtml(node.title || node.name || 'Peça');
    var initial = name.charAt(0).toUpperCase();
    return (
      '<div class="bom-preview-ph">' +
      '<div class="bom-preview-ph-icon">' + initial + '</div>' +
      '<p>Preview 2D</p>' +
      '<p class="bom-preview-ph-sub">3DPlay na próxima fase</p></div>'
    );
  }

  function buildGetPictureUrl(physicalId) {
    var pid = String(physicalId || '').trim();
    if (!pid || pid.indexOf('IMP_') === 0 || pid.indexOf('grid_') === 0 || pid.indexOf('snap_') === 0) {
      return '';
    }
    var space = '';
    if (typeof CompassServices !== 'undefined' && CompassServices.getVerifiedSpaceUrl) {
      space = CompassServices.getVerifiedSpaceUrl() || '';
    }
    if (!space && APP_CONFIG && APP_CONFIG.spaceHost) {
      space = 'https://' + APP_CONFIG.spaceHost + '/3dspace';
    }
    if (!space) return '';
    var tenant = (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId) || 'R1132100929518';
    return space.replace(/\/$/, '') +
      '/resources/getpicture?tenant=' + encodeURIComponent(tenant) +
      '&pid=' + encodeURIComponent(pid);
  }

  function resolveImageUrl(node) {
    if (node.iconUrl) return String(node.iconUrl);
    return buildGetPictureUrl(node.physicalid);
  }

  function renderMeta(node) {
    if (!metaEl) return;
    metaEl.innerHTML =
      '<dl class="bom-preview-dl">' +
      '<dt>Revisão</dt><dd>' + escapeHtml(node.revision || '—') + '</dd>' +
      '<dt>Tipo</dt><dd>' + escapeHtml(node.type || node.displayType || '—') + '</dd>' +
      '<dt>Proprietário</dt><dd>' + escapeHtml(ownerText(node)) + '</dd>' +
      '<dt>Maturidade</dt><dd>' + escapeHtml(maturityText(node)) + '</dd>' +
      '<dt>ID</dt><dd class="bom-preview-id">' + escapeHtml(node.physicalid || '—') + '</dd>' +
      '</dl>';
  }

  function showImage(node, url) {
    if (!imageWrap) return;
    if (!url) {
      imageWrap.innerHTML = placeholderHtml(node);
      return;
    }
    imageWrap.innerHTML =
      '<img class="bom-preview-img" alt="' + escapeHtml(node.title || node.name) + '" src="' +
      escapeHtml(url) + '" />';
    var img = imageWrap.querySelector('img');
    if (img) {
      img.onerror = function () {
        imageWrap.innerHTML = placeholderHtml(node);
      };
    }
  }

  function show(node) {
    if (!panel) return;
    if (!node) {
      clear();
      return;
    }
    if (hintEl) hintEl.style.display = 'none';
    if (titleEl) {
      titleEl.textContent = node.title || node.name || 'Peça';
    }
    renderMeta(node);
    showImage(node, resolveImageUrl(node));
    panel.classList.add('bom-preview-active');
  }

  function clear() {
    if (!panel) return;
    panel.classList.remove('bom-preview-active');
    if (titleEl) titleEl.textContent = 'Visualização';
    if (metaEl) metaEl.innerHTML = '';
    if (imageWrap) {
      imageWrap.innerHTML =
        '<span class="bom-preview-placeholder">Clique numa peça na lista à esquerda</span>';
    }
    if (hintEl) hintEl.style.display = 'block';
  }

  return { init: init, show: show, clear: clear };
})();
