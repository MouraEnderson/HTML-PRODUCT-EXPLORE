/**
 * @file ui/layout-fit.js
 * Layout 3DDashboard: E-BOM principal (esquerda) + painel lateral (KPIs, filtros, gráficos, preview).
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var COMPACT_H = 780;
  var MIN_EBOM_RATIO = 0.48;
  var CHARTS_MAX_OPEN = 200;

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

    var panel = host.querySelector('#partPreviewPanel');
    if (panel && typeof panel.open === 'boolean') {
      if (!narrow) {
        panel.open = true;
      } else if (!panel.classList.contains('bom-preview-active')) {
        panel.open = false;
      }
    }

    var filters = host.querySelector('#filtersPanel');
    if (filters && typeof filters.open === 'boolean') {
      filters.open = !narrow && !compact;
    }
  }

  function applyChartsCap(host, vp) {
    var charts = host.querySelector('#chartsSection');
    if (!charts) return;
    if (!charts.open) {
      charts.style.maxHeight = '';
      charts.style.overflowY = '';
      var rowOff = charts.querySelector('.bom-charts-row');
      if (rowOff) {
        rowOff.style.maxHeight = '';
        rowOff.style.overflowY = '';
      }
      return;
    }
    var cap = Math.min(CHARTS_MAX_OPEN, Math.floor(vp.h * 0.28));
    charts.style.maxHeight = cap + 'px';
    charts.style.overflowY = 'auto';
    var row = charts.querySelector('.bom-charts-row');
    if (row) {
      row.style.maxHeight = Math.max(88, cap - 40) + 'px';
      row.style.overflowY = 'auto';
    }
  }

  function applyWorkspace(host, vp) {
    var workspace = host.querySelector('.bom-workspace');
    var workMain = host.querySelector('.bom-work-main');
    var workSide = host.querySelector('.bom-work-side');
    if (!workspace || !workMain) return;

    var hostBox = host.getBoundingClientRect();
    var viewportBottom = hostBox.top + vp.h;
    var top = workspace.getBoundingClientRect().top;
    var avail = Math.max(180, Math.floor(viewportBottom - top - 4));

    workspace.style.flex = '1 1 auto';
    workspace.style.minHeight = '0';
    workspace.style.height = avail + 'px';
    workspace.style.maxHeight = avail + 'px';
    workspace.style.overflow = 'hidden';

    workMain.style.flex = '1 1 auto';
    workMain.style.minHeight = '0';
    workMain.style.height = '100%';
    workMain.style.maxHeight = avail + 'px';
    workMain.style.overflow = 'hidden';

    if (workSide) {
      workSide.style.height = '100%';
      workSide.style.maxHeight = avail + 'px';
      workSide.style.overflowY = 'auto';
      workSide.style.overflowX = 'hidden';
    }

    applyEbom(host, vp, avail);
  }

  function applyEbom(host, vp, workspaceAvail) {
    var ebom = host.querySelector('.bom-ebom-block');
    var list = host.querySelector('.bom-ebom-list');
    var tableWrap = host.querySelector('.bom-table-wrap');
    var pager = host.querySelector('.bom-table-pager');
    if (!ebom || !list || !tableWrap) return;

    var narrow = host.classList.contains('bom-widget-narrow');
    var head = ebom.querySelector('.bom-ebom-head');
    var headH = head ? head.offsetHeight : 0;
    var minEbom = Math.max(140, Math.floor(vp.h * MIN_EBOM_RATIO));

    var ebomAvail = workspaceAvail;
    if (narrow) {
      ebomAvail = Math.max(minEbom, Math.floor(workspaceAvail * 0.58));
    }

    ebom.style.flex = '1 1 auto';
    ebom.style.minHeight = minEbom + 'px';
    ebom.style.height = ebomAvail + 'px';
    ebom.style.maxHeight = ebomAvail + 'px';

    var listH = Math.max(100, ebomAvail - headH);
    list.style.height = listH + 'px';
    list.style.maxHeight = listH + 'px';
    list.style.minHeight = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 28;
    var tableH = Math.max(72, listH - pagerH);
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
    tableWrap.style.minHeight = '72px';
  }

  function bindCharts(host) {
    var charts = host.querySelector('#chartsSection');
    if (!charts || charts.__3DX_LAYOUT_BOUND__) return;
    charts.__3DX_LAYOUT_BOUND__ = true;
    charts.addEventListener('toggle', function () {
      window.setTimeout(apply, 0);
      window.setTimeout(apply, 120);
    });
  }

  function bindFilters(host) {
    var filters = host.querySelector('#filtersPanel');
    if (!filters || filters.__3DX_LAYOUT_BOUND__) return;
    filters.__3DX_LAYOUT_BOUND__ = true;
    filters.addEventListener('toggle', function () {
      window.setTimeout(apply, 0);
    });
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

    bindCharts(host);
    bindFilters(host);
    applyMode(host, vp);
    applyChartsCap(host, vp);
    applyWorkspace(host, vp);

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
