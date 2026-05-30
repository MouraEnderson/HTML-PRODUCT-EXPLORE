/**
 * @file ui/part-preview.js
 * Painel de preview 2D ao clicar numa linha da E-BOM monitorada.
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

  function showImage(node, r) {
    if (!r.imageWrap) return;
    if (typeof PartImage !== 'undefined' && PartImage.mountThumb) {
      r.imageWrap.innerHTML = '<div class="bom-preview-visual"></div>' +
        '<p class="bom-preview-ph-sub">Preview 2D · 3DPlay em breve</p>';
      var visual = r.imageWrap.querySelector('.bom-preview-visual');
      PartImage.mountThumb(visual, node, 'bom-thumb-lg');
      return;
    }
    r.imageWrap.innerHTML = '<span class="bom-preview-placeholder">Preview indisponível</span>';
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
    showImage(node, r);
    r.panel.classList.add('bom-preview-active');
  }

  function clear() {
    var r = ensureRefs();
    if (!r || !r.panel) return;
    r.panel.classList.remove('bom-preview-active');
    if (r.titleEl) r.titleEl.textContent = 'Visualização';
    if (r.metaEl) r.metaEl.innerHTML = '';
    if (r.imageWrap) {
      r.imageWrap.innerHTML =
        '<span class="bom-preview-placeholder">Clique numa peça na lista à esquerda</span>';
    }
    if (r.hintEl) r.hintEl.style.display = 'block';
  }

  return { init: init, show: show, clear: clear, ensureRefs: ensureRefs };
})();
