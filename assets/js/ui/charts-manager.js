/**
 * @file ui/charts-manager.js
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};

  function init() {}

  function destroyAll() {
    Object.keys(charts).forEach(function (k) {
      if (charts[k]) charts[k].destroy();
    });
    charts = {};
  }

  function themeColors() {
    if (typeof DashboardTheme !== 'undefined' && DashboardTheme.getChartColors) {
      return DashboardTheme.getChartColors();
    }
    return window.__BOM_CHART_THEME__ || { text: '#455a64', title: '#263238', grid: '#cfd8dc', legend: '#607d8b' };
  }

  function doughnut(canvasId, labels, values, title, colors) {
    var ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
          legend: { position: 'bottom', labels: { color: th.legend, font: { size: 12 }, boxWidth: 14 } }
        }
      }
    });
  }

  function horizontalBar(canvasId, labels, values, title) {
    var ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: '#1565c0',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title, color: th.title, font: { size: 15, weight: '600' } },
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, ticks: { color: th.text, font: { size: 12 } }, grid: { color: th.grid } },
          y: { ticks: { color: th.text, font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  function render(metrics) {
    var ds = MetricsEngine.chartDatasets(metrics);
    var healthColors = (APP_CONFIG.CHART_COLORS && APP_CONFIG.CHART_COLORS.maturityHealth) ||
      ['#43a047', '#ffb300', '#e53935', '#78909c'];

    if (APP_CONFIG && APP_CONFIG.UI_CLEAN) {
      doughnut(
        'chartMaturity',
        ['Bom', 'Moderado', 'Ruim', 'Outros'],
        [
          metrics.released || 0,
          metrics.inWork || 0,
          metrics.obsolete || 0,
          (metrics.byMaturity && metrics.byMaturity.other) || 0
        ],
        'Saúde da Maturidade',
        healthColors
      );
      var owners = ds.owners || { labels: [], values: [] };
      if (!owners.labels.length) {
        owners = { labels: ['—'], values: [0] };
      }
      horizontalBar('chartOwners', owners.labels, owners.values, 'Lista de Proprietários');
      return;
    }
    doughnut('chartMaturity', ds.maturity.labels, ds.maturity.values, 'Por Maturidade');
    horizontalBar('chartOwners', ds.owners.labels, ds.owners.values, 'Proprietários');
  }

  return { init: init, render: render, destroyAll: destroyAll };
})();
