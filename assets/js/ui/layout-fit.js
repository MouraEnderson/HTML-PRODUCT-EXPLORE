/**
 * @file ui/layout-fit.js
 * Ajuste dinâmico ao iframe 3DDashboard — E-BOM sempre visível, gráficos limitados.
 */
var LayoutFit = (function () {
  'use strict';

  var bound = false;
  var NARROW_W = 620;
  var COMPACT_H = 780;
  var MIN_EBOM_RATIO = 0.36;
  var CHARTS_MAX_OPEN = 168;

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
  }

  function squeezeCharts(host, neededPx, vp) {
    var charts = host.querySelector('#chartsSection');
    if (!charts || !charts.open) return;
    var row = charts.querySelector('.bom-charts-row');
    var maxH = Math.max(96, Math.min(CHARTS_MAX_OPEN, Math.floor(vp.h * 0.24) - neededPx));
    charts.style.maxHeight = maxH + 'px';
    charts.style.overflowY = 'auto';
    if (row) {
      row.style.maxHeight = Math.max(72, maxH - 36) + 'px';
      row.style.overflowY = 'auto';
    }
  }

  function resetChartsStyle(host) {
    var charts = host.querySelector('#chartsSection');
    if (!charts) return;
    if (!charts.open) {
      charts.style.maxHeight = '';
      charts.style.overflowY = '';
    }
    var row = charts.querySelector('.bom-charts-row');
    if (row && !charts.open) {
      row.style.maxHeight = '';
      row.style.overflowY = '';
    }
  }

  function applyChartsCap(host, vp) {
    var charts = host.querySelector('#chartsSection');
    if (!charts) return;
    if (!charts.open) {
      resetChartsStyle(host);
      return;
    }
    var cap = Math.min(CHARTS_MAX_OPEN, Math.floor(vp.h * 0.26));
    charts.style.maxHeight = cap + 'px';
    charts.style.overflowY = 'auto';
    var row = charts.querySelector('.bom-charts-row');
    if (row) {
      row.style.maxHeight = Math.max(80, cap - 38) + 'px';
      row.style.overflowY = 'auto';
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

    var hostBox = host.getBoundingClientRect();
    var viewportBottom = hostBox.top + vp.h;
    var head = ebom.querySelector('.bom-ebom-head');
    var headH = head ? head.offsetHeight : 0;
    var minEbom = Math.max(130, Math.floor(vp.h * MIN_EBOM_RATIO));

    var ebomTop = ebom.getBoundingClientRect().top;
    var ebomAvail = Math.floor(viewportBottom - ebomTop - 8);

    if (ebomAvail < minEbom) {
      squeezeCharts(host, minEbom - ebomAvail, vp);
      ebomTop = ebom.getBoundingClientRect().top;
      ebomAvail = Math.floor(viewportBottom - ebomTop - 8);
    }
    if (ebomAvail < minEbom) {
      ebomAvail = minEbom;
    }

    ebom.style.flex = '1 1 auto';
    ebom.style.minHeight = minEbom + 'px';
    ebom.style.maxHeight = ebomAvail + 'px';
    ebom.style.height = ebomAvail + 'px';

    var splitH = Math.max(100, ebomAvail - headH);
    split.style.flex = '1 1 auto';
    split.style.height = splitH + 'px';
    split.style.minHeight = splitH + 'px';
    split.style.maxHeight = splitH + 'px';

    var preview = host.querySelector('#partPreviewPanel');
    var previewH = 0;
    var narrow = host.classList.contains('bom-widget-narrow');
    if (preview && preview.offsetParent !== null) {
      if (narrow) {
        if (preview.classList.contains('bom-preview-active') && preview.open) {
          previewH = Math.min(preview.offsetHeight, Math.floor(splitH * 0.45));
        } else {
          var summary = preview.querySelector('.bom-preview-summary');
          previewH = summary ? summary.offsetHeight : 36;
        }
      } else {
        previewH = 0;
      }
    }

    var listH = Math.max(80, splitH - previewH);
    list.style.flex = '1 1 auto';
    list.style.minHeight = listH + 'px';
    list.style.maxHeight = listH + 'px';
    list.style.height = listH + 'px';

    var pagerH = pager ? pager.offsetHeight : 28;
    var tableH = Math.max(64, listH - pagerH);
    tableWrap.style.flex = '1 1 auto';
    tableWrap.style.height = tableH + 'px';
    tableWrap.style.maxHeight = tableH + 'px';
    tableWrap.style.minHeight = '64px';
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
      main.style.overflowY = 'auto';
      main.style.overflowX = 'hidden';
    }

    bindCharts(host);
    applyMode(host, vp);
    applyChartsCap(host, vp);
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
