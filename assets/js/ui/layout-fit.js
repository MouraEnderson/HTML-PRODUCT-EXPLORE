/**
 * @file ui/layout-fit.js
 * Ajuste dinâmico ao tamanho do iframe do 3DDashboard.
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var SHORT_H = 520;

  function hostEl() {
    return window.__3DX_UI_ROOT__ || document.body;
  }

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 640,
      h: window.innerHeight || document.documentElement.clientHeight || 640
    };
  }

  function applyMode(host, vp) {
    var narrow = vp.w < NARROW_W;
    var shortH = vp.h < SHORT_H;
    host.classList.toggle('bom-widget-narrow', narrow);
    host.classList.toggle('bom-widget-wide', !narrow);
    host.classList.toggle('bom-widget-short', shortH);

    var panel = host.querySelector('#partPreviewPanel');
    if (panel && typeof panel.open === 'boolean') {
      if (!narrow) {
        panel.open = true;
      } else if (!panel.classList.contains('bom-preview-active')) {
        panel.open = false;
      }
    }
  }

  function applyEbom(host, vp) {
    var main = host.querySelector('.bom-main');
    var ebom = host.querySelector('.bom-ebom-block');
    var split = host.querySelector('.bom-ebom-split');
    var list = host.querySelector('.bom-ebom-list');
    var tableWrap = host.querySelector('.bom-table-wrap');
    var pager = host.querySelector('.bom-table-pager');
    if (!main || !ebom || !split || !list || !tableWrap) return;

    var head = ebom.querySelector('.bom-ebom-head');
    var headH = head ? head.offsetHeight : 0;
    var mainRect = main.getBoundingClientRect();
    var ebomTop = ebom.getBoundingClientRect().top;
    var ebomAvail = Math.floor(mainRect.bottom - ebomTop - 6);
    if (ebomAvail < 160) ebomAvail = Math.max(160, vp.h - ebomTop - 6);

    ebom.style.flex = '1 1 auto';
    ebom.style.minHeight = ebomAvail + 'px';
    ebom.style.maxHeight = ebomAvail + 'px';

    var splitH = Math.max(120, ebomAvail - headH);
    split.style.height = splitH + 'px';
    split.style.minHeight = splitH + 'px';
    split.style.maxHeight = splitH + 'px';

    var preview = host.querySelector('#partPreviewPanel');
    var previewH = 0;
    if (preview && preview.offsetParent !== null) {
      previewH = preview.classList.contains('bom-preview-active') ? preview.offsetHeight : 0;
      if (host.classList.contains('bom-widget-narrow') && !preview.classList.contains('bom-preview-active')) {
        var summary = preview.querySelector('.bom-preview-summary');
        previewH = summary ? summary.offsetHeight : 0;
      }
    }

    var listH = Math.max(100, splitH - previewH);
    list.style.minHeight = listH + 'px';
    list.style.maxHeight = listH + 'px';
    list.style.height = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 32;
    var tableH = Math.max(80, listH - pagerH);
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
    tableWrap.style.minHeight = '80px';
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var vp = viewport();

    if (host.classList && host.classList.contains('bom-widget-body')) {
      host.style.height = vp.h + 'px';
      host.style.maxHeight = vp.h + 'px';
      host.style.overflow = 'hidden';
      host.style.boxSizing = 'border-box';
    }

    var root = host.querySelector ? host.querySelector('.bom-root') : null;
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.boxSizing = 'border-box';
    }

    applyMode(host, vp);
    applyEbom(host, vp);

    if (typeof ChartsManager !== 'undefined' && ChartsManager.scheduleResize) {
      ChartsManager.scheduleResize();
    }
  }

  function init() {
    if (bound) {
      apply();
      return;
    }
    bound = true;
    apply();
    window.addEventListener('resize', apply);
    if (typeof ResizeObserver !== 'undefined') {
      try {
        var obs = new ResizeObserver(function () { apply(); });
        obs.observe(document.documentElement);
        var host = hostEl();
        if (host && host.parentElement) obs.observe(host.parentElement);
      } catch (e) { /* iframe */ }
    }
    window.setTimeout(apply, 200);
    window.setTimeout(apply, 800);
    window.setTimeout(apply, 1600);
  }

  return { init: init, apply: apply };
})();
