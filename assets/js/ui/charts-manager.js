/**
 * @file ui/charts-manager.js
 * Gráficos Chart.js com fallback HTML (sempre visível no 3DDashboard).
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};

  function init() {}

  function destroyAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k] && charts[k].destroy) charts[k].destroy();
    });
    charts = {};
    document.querySelectorAll('.chart-fallback').forEach(function (el) {
      el.parentNode.removeChild(el);
    });
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

  function showCanvas(canvasId) {
    var panel = panelForCanvas(canvasId);
    if (!panel) return;
    var canvas = document.getElementById(canvasId);
    if (canvas) {
      canvas.style.display = 'block';
      canvas.style.height = '220px';
      canvas.style.width = '100%';
    }
    var fb = panel.querySelector('.chart-fallback');
    if (fb) fb.style.display = 'none';
  }

  function fallbackMaturityHtml(labels, values, colors) {
    var total = values.reduce(function (a, b) { return a + b; }, 0) || 1;
    var bars = '';
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      var pct = Math.round((v / total) * 1000) / 10;
      var c = colors[i] || '#90a4ae';
      bars +=
        '<div class="cf-row">' +
        '<span class="cf-lbl">' + lbl + '</span>' +
        '<div class="cf-track"><div class="cf-fill" style="width:' + pct + '%;background:' + c + '"></div></div>' +
        '<span class="cf-val">' + v + ' (' + pct + '%)</span></div>';
    });
    return '<div class="cf-bars">' + bars + '</div>';
  }

  function fallbackOwnersHtml(labels, values) {
    var max = Math.max.apply(null, values.concat([1]));
    var rows = '';
    labels.forEach(function (lbl, i) {
      var v = values[i] || 0;
      var pct = Math.round((v / max) * 100);
      rows +=
        '<div class="cf-owner-row">' +
        '<span class="cf-owner-name">' + lbl + '</span>' +
        '<div class="cf-track"><div class="cf-fill cf-fill-blue" style="width:' + pct + '%"></div></div>' +
        '<span class="cf-val">' + v + '</span></div>';
    });
    return '<div class="cf-owners">' + rows + '</div>';
  }

  function doughnut(canvasId, labels, values, title, colors) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;
    if (typeof Chart === 'undefined') {
      showFallback(canvasId, title, fallbackMaturityHtml(labels, values, colors));
      return false;
    }
    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          animation: { duration: 400 },
          plugins: {
            title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
            legend: { position: 'bottom', labels: { color: th.legend, font: { size: 11 }, boxWidth: 12 } }
          }
        }
      });
      return true;
    } catch (e) {
      showFallback(canvasId, title, fallbackMaturityHtml(labels, values, colors));
      return false;
    }
  }

  function horizontalBar(canvasId, labels, values, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return false;
    if (typeof Chart === 'undefined') {
      showFallback(canvasId, title, fallbackOwnersHtml(labels, values));
      return false;
    }
    showCanvas(canvasId);
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    try {
      charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{ data: values, backgroundColor: '#1565c0', borderRadius: 4 }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true, ticks: { color: th.text, font: { size: 11 } }, grid: { color: th.grid } },
            y: { ticks: { color: th.text, font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
      return true;
    } catch (e) {
      showFallback(canvasId, title, fallbackOwnersHtml(labels, values));
      return false;
    }
  }

  function scheduleResize() {
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        if (charts[k] && charts[k].resize) charts[k].resize();
      });
    }, 120);
    window.setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        if (charts[k] && charts[k].resize) charts[k].resize();
      });
    }, 400);
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
    var total = matValues.reduce(function (a, b) { return a + b; }, 0);
    if (total < 1) {
      matValues = [0, 0, 0, 1];
      matLabels = ['Sem dados', '', '', ''];
    }

    var ds = MetricsEngine.chartDatasets(metrics);
    var owners = ds.owners || { labels: ['Sem proprietário'], values: [total || 0] };
    if (!owners.labels.length) {
      owners = { labels: ['Sem proprietário'], values: [total || 0] };
    }

    doughnut('chartMaturity', matLabels, matValues, 'Saúde da Maturidade', healthColors);
    horizontalBar('chartOwners', owners.labels, owners.values, 'Lista de Proprietários');
    scheduleResize();
  }

  return { init: init, render: render, destroyAll: destroyAll, scheduleResize: scheduleResize };
})();
