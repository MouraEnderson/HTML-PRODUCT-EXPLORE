/**
 * @file ui/layout-fit.js
 * Layout 3DDashboard — grid 2×2: filtros/KPIs | gráficos / E-BOM | 3D view.
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var COMPACT_H = 780;
  var TOP_ROW_RATIO = 0.36;

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
    var grid = host.querySelector('.bom-grid-quad');
    if (!grid) return;

    var hostBox = host.getBoundingClientRect();
    var viewportBottom = hostBox.top + vp.h;
    var top = grid.getBoundingClientRect().top;
    var avail = Math.max(200, Math.floor(viewportBottom - top - 4));

    grid.style.flex = '1 1 auto';
    grid.style.minHeight = '0';
    grid.style.height = avail + 'px';
    grid.style.maxHeight = avail + 'px';
    grid.style.overflow = 'hidden';

    var topRow = Math.max(120, Math.min(Math.floor(avail * TOP_ROW_RATIO), 220));
    var bottomRow = Math.max(140, avail - topRow - 8);
    grid.style.gridTemplateRows = topRow + 'px ' + bottomRow + 'px';

    applyEbom(host, bottomRow);
    applyView3d(host, bottomRow);
  }

  function applyEbom(host, quadH) {
    var block = host.querySelector('.bom-quad-ebom .bom-ebom-block');
    var list = host.querySelector('.bom-quad-ebom .bom-ebom-list');
    var tableWrap = host.querySelector('.bom-quad-ebom .bom-table-wrap');
    var pager = host.querySelector('.bom-quad-ebom .bom-table-pager');
    if (!block || !list || !tableWrap) return;

    var head = block.querySelector('.bom-ebom-head');
    var headH = head ? head.offsetHeight : 0;
    var listH = Math.max(80, quadH - headH - 12);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 26;
    var tableH = Math.max(64, listH - pagerH);
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
  }

  function applyView3d(host, quadH) {
    var preview = host.querySelector('.bom-quad-view3d .bom-preview-body');
    var image = host.querySelector('.bom-quad-view3d .bom-preview-image');
    if (!preview) return;
    var labelH = 28;
    var bodyH = Math.max(100, quadH - labelH - 8);
    preview.style.height = bodyH + 'px';
    preview.style.maxHeight = bodyH + 'px';
    if (image) {
      var imgH = Math.max(80, bodyH - 60);
      image.style.minHeight = imgH + 'px';
      image.style.maxHeight = imgH + 'px';
    }
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

    var root = host.querySelector('.bom-root');
    if (root) {
      root.style.height = '100%';
      root.style.minHeight = '0';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.overflow = 'hidden';
    }

    var main = host.querySelector('.bom-main');
    if (main) {
      main.style.flex = '1 1 auto';
      main.style.minHeight = '0';
      main.style.overflow = 'hidden';
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
