/**
 * @file ui/layout-fit.js
 * Layout 5 zonas — grid interno (não no .bom-main flex).
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var COMPACT_H = 780;
  var MID_ROW_RATIO = 0.30;

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
    var compact = vp.h < COMPACT_H || vp.w < 680;
    host.classList.toggle('bom-widget-narrow', narrow);
    host.classList.toggle('bom-widget-wide', !narrow);
    host.classList.toggle('bom-widget-compact', compact);
    host.classList.toggle('bom-widget-short', vp.h < 520);
  }

  function applyGrid(host, vp) {
    var grid = host.querySelector('.bom-layout-grid');
    if (!grid) return;

    var hostBox = host.getBoundingClientRect();
    var viewportBottom = hostBox.top + vp.h;
    var top = grid.getBoundingClientRect().top;
    var avail = Math.max(160, Math.floor(viewportBottom - top - 2));

    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(10, minmax(0, 1fr))';
    grid.style.width = '100%';
    grid.style.boxSizing = 'border-box';
    grid.style.flex = '1 1 auto';
    grid.style.minHeight = '0';
    grid.style.height = avail + 'px';
    grid.style.maxHeight = avail + 'px';
    grid.style.overflow = 'hidden';

    var midH = Math.max(84, Math.min(Math.floor(avail * MID_ROW_RATIO), 170));
    var botH = Math.max(96, avail - midH - 4);
    grid.style.gridTemplateRows = midH + 'px ' + botH + 'px';

    grid.querySelectorAll('.bom-zone-2').forEach(function (el) {
      el.style.gridColumn = '1 / 6';
      el.style.gridRow = '1';
    });
    grid.querySelectorAll('.bom-zone-3').forEach(function (el) {
      el.style.gridColumn = '6 / 11';
      el.style.gridRow = '1';
    });
    grid.querySelectorAll('.bom-zone-4').forEach(function (el) {
      el.style.gridColumn = '1 / 7';
      el.style.gridRow = '2';
    });
    grid.querySelectorAll('.bom-zone-5').forEach(function (el) {
      el.style.gridColumn = '7 / 11';
      el.style.gridRow = '2';
    });

    applyEbom(host, botH);
    applyView3d(host, botH);
  }

  function applyEbom(host, rowH) {
    var list = host.querySelector('.bom-zone-4 .bom-ebom-list');
    var tableWrap = host.querySelector('.bom-zone-4 .bom-table-wrap');
    var pager = host.querySelector('.bom-zone-4 .bom-table-pager');
    var head = host.querySelector('.bom-zone-4 .bom-ebom-head');
    if (!list || !tableWrap) return;

    var headH = head ? head.offsetHeight : 0;
    var listH = Math.max(56, rowH - headH - 6);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 22;
    var tableH = Math.max(44, listH - pagerH);
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
  }

  function applyView3d(host, rowH) {
    var body = host.querySelector('.bom-zone-5 .bom-preview-body');
    var image = host.querySelector('.bom-zone-5 .bom-preview-image');
    if (!body) return;
    var bodyH = Math.max(64, rowH - 4);
    body.style.height = bodyH + 'px';
    body.style.maxHeight = bodyH + 'px';
    if (image) {
      var imgH = Math.max(40, bodyH - 56);
      image.style.minHeight = imgH + 'px';
      image.style.maxHeight = imgH + 'px';
    }
  }

  function apply() {
    var host = hostEl();
    if (!host) return;
    var vp = viewport();

    if (host.classList.contains('bom-widget-body')) {
      host.style.height = vp.h + 'px';
      host.style.maxHeight = vp.h + 'px';
      host.style.overflow = 'hidden';
      host.style.padding = '0';
      host.style.margin = '0';
      host.style.boxSizing = 'border-box';
    }

    var root = host.querySelector('.bom-root');
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
      root.style.padding = '0';
      root.style.margin = '0';
    }

    var header = host.querySelector('.bom-zone-header');
    if (header) {
      header.style.flexShrink = '0';
      header.style.margin = '0';
    }

    var main = host.querySelector('.bom-main');
    if (main) {
      main.style.flex = '1 1 auto';
      main.style.minHeight = '0';
      main.style.overflow = 'hidden';
      main.style.display = 'flex';
      main.style.flexDirection = 'column';
      main.style.padding = '0';
      main.style.margin = '0';
    }

    applyMode(host, vp);
    applyGrid(host, vp);

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
