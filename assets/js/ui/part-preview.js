/**
 * @file ui/part-preview.js
 * Painel de visualização 3D (3DPlay) + metadados ao clicar numa linha da E-BOM.
 */
var PartPreview = (function () {
  'use strict';

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function bindRefs() {
    var panel = uiRoot().querySelector('#partPreviewPanel');
    if (!panel) return null;
    return {
      panel: panel,
      bodyEl: panel.querySelector('.bom-preview-body') || panel,
      imageWrap: panel.querySelector('#partPreviewImage') || panel.querySelector('.bom-preview-image'),
      metaEl: panel.querySelector('#partPreviewMeta') || panel.querySelector('.bom-preview-meta'),
      titleEl: panel.querySelector('#partPreviewTitle') || panel.querySelector('.bom-preview-title'),
      hintEl: panel.querySelector('.bom-preview-hint')
    };
  }

  var refs = null;

  function init(selector) {
    refs = bindRefs();
    if (!refs && selector) {
      refs = { panel: uiRoot().querySelector(selector) };
      if (refs.panel) {
        refs.imageWrap = refs.panel.querySelector('#partPreviewImage');
        refs.metaEl = refs.panel.querySelector('#partPreviewMeta');
        refs.titleEl = refs.panel.querySelector('#partPreviewTitle');
        refs.hintEl = refs.panel.querySelector('.bom-preview-hint');
      }
    }
    if (typeof ThreeDPlayViewer !== 'undefined') {
      ThreeDPlayViewer.init('#partPreviewImage');
    }
  }

  function isNarrowLayout() {
    var host = uiRoot();
    return !!(host && host.classList && host.classList.contains('bom-widget-narrow'));
  }

  function reflow() {
    if (typeof LayoutFit !== 'undefined' && LayoutFit.apply) {
      window.setTimeout(function () { LayoutFit.apply(); }, 0);
      window.setTimeout(function () { LayoutFit.apply(); }, 120);
    }
  }

  function openPanel(r) {
    if (!r || !r.panel) return;
    if (typeof r.panel.open === 'boolean') r.panel.open = true;
  }

  function closePanel(r) {
    if (!r || !r.panel) return;
    if (isNarrowLayout() && typeof r.panel.open === 'boolean') r.panel.open = false;
  }

  function ensureRefs() {
    if (!refs || !refs.panel || !document.body.contains(refs.panel)) {
      refs = bindRefs();
    }
    return refs;
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

  function renderMeta(node, r) {
    if (!r.metaEl) return;
    r.metaEl.innerHTML =
      '<dl class="bom-preview-dl">' +
      '<dt>Revisão</dt><dd>' + escapeHtml(node.revision || '—') + '</dd>' +
      '<dt>Tipo</dt><dd>' + escapeHtml(node.type || node.displayType || '—') + '</dd>' +
      '<dt>Proprietário</dt><dd>' + escapeHtml(ownerText(node)) + '</dd>' +
      '<dt>Maturidade</dt><dd>' + escapeHtml(maturityText(node)) + '</dd>' +
      '<dt>ID</dt><dd class="bom-preview-id">' + escapeHtml(node.physicalid || '—') + '</dd>' +
      '</dl>';
  }

  function showVisual(node, r) {
    if (!r.imageWrap) return;
    if (typeof ThreeDPlayViewer !== 'undefined' && ThreeDPlayViewer.show) {
      ThreeDPlayViewer.show(node);
      return;
    }
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      r.imageWrap.innerHTML = '<div class="bom-preview-visual"></div>';
      PartImage.mountThumb(r.imageWrap.querySelector('.bom-preview-visual'), node, 'bom-thumb-lg');
      return;
    }
    r.imageWrap.innerHTML = '<span class="bom-preview-placeholder">Visualização indisponível</span>';
  }

  function show(node) {
    var r = ensureRefs();
    if (!r || !r.panel) return;
    if (!node) {
      clear();
      return;
    }
    if (r.hintEl) r.hintEl.style.display = 'none';
    if (r.titleEl) r.titleEl.textContent = node.title || node.name || 'Peça';
    renderMeta(node, r);
    showVisual(node, r);
    r.panel.classList.add('bom-preview-active');
    openPanel(r);
    reflow();
  }

  function clear() {
    var r = ensureRefs();
    if (!r || !r.panel) return;
    r.panel.classList.remove('bom-preview-active');
    closePanel(r);
    if (r.titleEl) r.titleEl.textContent = 'Visualização da peça';
    if (r.metaEl) r.metaEl.innerHTML = '';
    if (typeof ThreeDPlayViewer !== 'undefined' && ThreeDPlayViewer.clear) {
      ThreeDPlayViewer.clear();
    } else if (r.imageWrap) {
      r.imageWrap.innerHTML =
        '<span class="bom-preview-placeholder">Clique numa linha da E-BOM para visualização 3D</span>';
    }
    if (r.hintEl) r.hintEl.style.display = 'block';
    reflow();
  }

  return { init: init, show: show, clear: clear, ensureRefs: ensureRefs };
})();
