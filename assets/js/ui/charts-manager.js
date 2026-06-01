/**
 * @file ui/charts-manager.js
 * Gráficos de pizza (Chart.js ou fallback CSS) — sempre visíveis no 3DDashboard.
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};
  var OWNER_COLORS = [
    '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f',
    '#c62828', '#4527a0', '#558b2f', '#ad1457', '#0277bd', '#4e342e', '#37474f'
  ];

  function init() {}

  function destroyAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k] && charts[k].destroy) charts[k].destroy();
    });
    charts = {};
    document.querySelectorAll('.chart-fallback').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    var leg = document.getElementById('ownersLegendScroll');
    if (leg) leg.innerHTML = '';
    var matLeg = document.getElementById('maturityLegendScroll');
    if (matLeg) matLeg.innerHTML = '';
  }

  function themeColors() {
    if (typeof DashboardTheme !== 'undefined' && DashboardTheme.getChartColors) {
      return DashboardTheme.getChartColors();
    }
    return window.__BOM_CHART_THEME__ || { text: '#455a64', title: '#263238', grid: '#cfd8dc', legend: '#607d8b' };
  }

  function panelForCanvas(canvasId) {
    var canvas = document.getElementById(canvasId);
    return canvas ? canvas.closest('.bom-chart-panel') : null;
  }

  function showFallback(canvasId, title, html) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) canvas.style.display = 'none';
    var fb = panel.querySelector('.chart-fallback');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'chart-fallback';
      panel.appendChild(fb);
    }
    fb.innerHTML = '<h4 class="chart-fallback-title">' + title + '</h4>' + html;
    fb.style.display = 'block';
  }

  function clampCanvasBox(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var box = canvas.closest('.bom-chart-canvas-box');
    if (!box) return;
    box.style.height = '110px';
    box.style.maxHeight = '110px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.maxHeight = '110px';
    canvas.style.display = 'block';
    var wrap = box.firstElementChild;
    if (wrap && wrap !== canvas) {
      wrap.style.position = 'absolute';
      wrap.style.left = '0';
      wrap.style.top = '0';
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.style.maxHeight = '110px';
    }
    if (charts[canvasId] && charts[canvasId].resize) {
      charts[canvasId].resize();
    }
  }

  function showCanvas(canvasId) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) {
      canvas.style.display = 'block';
      if (canvas.closest('.bom-chart-canvas-box')) {
        canvas.style.height = '100%';
        canvas.style.width = '100%';
      } else {
        canvas.style.height = '180px';
        canvas.style.width = '100%';
      }
    }
    var fb = panel.querySelector('.chart-fallback');
    if (fb) fb.style.display = 'none';
  }

  function filterSlices(labels, values, colors) {
    var outL = [];
    var outV = [];
    var outC = [];
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      if (v > 0 && lbl) {
        outL.push(lbl);
        outV.push(v);
        outC.push((colors && colors[i]) || OWNER_COLORS[outC.length % OWNER_COLORS.length]);
      }
    });
    return { labels: outL, values: outV, colors: outC };
  }

  function emptySlice() {
    return { labels: ['Sem dados'], values: [1], colors: ['#cfd8dc'] };
  }

  function fallbackPieHtml(labels, values, colors) {
    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) slices = emptySlice();

    var total = slices.values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var gradientParts = [];
    var acc = 0;
    var legend = '';

    slices.labels.forEach(function (lbl, i) {
      var v = slices.values[i];
      var pct = (v / total) * 100;
      var end = acc + pct;
      gradientParts.push(slices.colors[i] + ' ' + acc.toFixed(2) + '% ' + end.toFixed(2) + '%');
      acc = end;
      var pctLabel = Math.round(pct * 10) / 10;
      legend +=
        '<div class="cf-pie-item">' +
        '<span class="cf-pie-dot" style="background:' + slices.colors[i] + '"></span>' +
        '<span class="cf-pie-lbl">' + lbl + '</span>' +
        '<span class="cf-pie-val">' + v + ' (' + pctLabel + '%)</span></div>';
    });

    return (
      '<div class="cf-pie-wrap">' +
      '<div class="cf-pie" style="background:conic-gradient(' + gradientParts.join(', ') + ')">' +
      '<div class="cf-pie-hole">' + total + '</div></div>' +
      '<div class="cf-pie-legend cf-pie-legend-scroll">' + legend + '</div></div>'
    );
  }

  function legendItemsHtml(items, total, colorAt) {
    if (!items || !items.length) return '';
    total = total || items.reduce(function (a, it) {
      return a + (it.value != null ? it.value : 0);
    }, 0) || 1;
    return items.map(function (it, i) {
      var val = it.value != null ? it.value : 0;
      var pct = Math.round((val / total) * 1000) / 10;
      var c = colorAt(i, it);
      return (
        '<div class="owners-legend-item">' +
        '<span class="cf-pie-dot" style="background:' + c + '"></span>' +
        '<span class="owners-legend-name">' + it.label + '</span>' +
        '<span class="owners-legend-val">' + val + ' (' + pct + '%)</span></div>'
      );
    }).join('');
  }

  function renderOwnersLegend(items, total) {
    var el = document.getElementById('ownersLegendScroll');
    if (!el) return;
    if (!items || !items.length) { el.innerHTML = ''; return; }
    el.innerHTML = legendItemsHtml(items, total, function (i) {
      return OWNER_COLORS[i % OWNER_COLORS.length];
    });
  }

  function renderMaturityLegend(labels, values, colors) {
    var el = document.getElementById('maturityLegendScroll');
    if (!el) return;
    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) { el.innerHTML = ''; return; }
    var items = slices.labels.map(function (lbl, i) {
      return { label: lbl, value: slices.values[i] };
    });
    var total = slices.values.reduce(function (a, b) { return a + b; }, 0) || 1;
    el.innerHTML = legendItemsHtml(items, total, function (i) {
      return slices.colors[i];
    });
  }

  function pieChart(canvasId, labels, values, title, colors, opts) {
    opts = opts || {};
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;

    var slices = filterSlices(labels, values, colors);
    if (!slices.labels.length) slices = emptySlice();

    if (typeof Chart === 'undefined') {
      showFallback(canvasId, title, fallbackPieHtml(slices.labels, slices.values, slices.colors));
      return false;
    }

    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: slices.labels,
          datasets: [{ data: slices.values, backgroundColor: slices.colors, borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '52%',
          animation: { duration: 450, animateRotate: true, animateScale: true },
          plugins: {
            title: {
              display: opts.hideTitle !== true,
              text: title,
              color: th.title,
              font: { size: 14, weight: '600' },
              padding: { top: 2, bottom: 4 }
            },
            legend: {
              display: opts.hideLegend !== true,
              position: 'bottom',
              labels: { color: th.legend, font: { size: 13 }, boxWidth: 14, padding: 10 }
            },
            tooltip: {
              callbacks: {
                label: function (c) {
                  var sum = c.dataset.data.reduce(function (a, b) { return a + b; }, 0) || 1;
                  var pct = Math.round((c.raw / sum) * 1000) / 10;
                  return c.label + ': ' + c.raw + ' (' + pct + '%)';
                }
              }
            }
          }
        }
      });
      return true;
    } catch (e) {
      showFallback(canvasId, title, fallbackPieHtml(slices.labels, slices.values, slices.colors));
      return false;
    } finally {
      clampCanvasBox(canvasId);
    }
  }

  function ownerColors(count) {
    var list = [];
    for (var i = 0; i < count; i++) list.push(OWNER_COLORS[i % OWNER_COLORS.length]);
    return list;
  }

  function scheduleResize() {
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        clampCanvasBox(k);
      });
      resetChartsScroll();
    }, 120);
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        clampCanvasBox(k);
      });
      resetChartsScroll();
    }, 400);
  }

  function resetChartsScroll() {
    var sc = document.querySelector('.bom-zone-3 .bom-charts-unified-scroll');
    if (sc) sc.scrollTop = 0;
  }

  function render(metrics) {
    var healthColors = (APP_CONFIG.CHART_COLORS && APP_CONFIG.CHART_COLORS.maturityHealth) ||
      ['#43a047', '#ffb300', '#e53935', '#78909c'];
    var matLabels = ['Bom', 'Moderado', 'Ruim', 'Outros'];
    var matValues = [
      metrics.released || 0,
      metrics.inWork || 0,
      metrics.obsolete || 0,
      (metrics.byMaturity && metrics.byMaturity.other) || 0
    ];

    var ds = MetricsEngine.chartDatasets(metrics);
    var owners = ds.owners || { labels: [], values: [] };
    var ownersLegend = ds.ownersLegend || [];
    if (!owners.labels.length) {
      owners = { labels: ['Sem proprietário'], values: [metrics.totalItems || 0] };
      ownersLegend = [{ label: 'Sem proprietário', value: metrics.totalItems || 0 }];
    }
    if (!owners.values.some(function (v) { return v > 0; })) {
      owners = { labels: ['Sem proprietário'], values: [metrics.totalItems || 1] };
    }

    var quadCharts = !!document.querySelector('.bom-charts-row-quad');
    var chartOpts = quadCharts ? { hideLegend: true, hideTitle: true } : {};

    pieChart('chartMaturity', matLabels, matValues, 'Saúde da Maturidade', healthColors, chartOpts);
    pieChart(
      'chartOwners',
      owners.labels,
      owners.values,
      'Proprietários',
      ownerColors(owners.labels.length),
      chartOpts
    );
    if (quadCharts) {
      renderMaturityLegend(matLabels, matValues, healthColors);
    } else {
      var matLeg = document.getElementById('maturityLegendScroll');
      if (matLeg) matLeg.innerHTML = '';
    }
    renderOwnersLegend(ownersLegend, metrics.totalItems || 0);
    resetChartsScroll();
    scheduleResize();
  }

  return { init: init, render: render, destroyAll: destroyAll, scheduleResize: scheduleResize };
})();
