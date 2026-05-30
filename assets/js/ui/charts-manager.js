/**
 * @file ui/charts-manager.js
 */
var ChartsManager = (function () {
  'use strict';

  var charts = {};

  function init() {
    /* Chart.js instances criados no render */
  }

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
    var ctx = (typeof byId3dx === 'function' ? byId3dx(canvasId) : document.getElementById(canvasId));
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors || APP_CONFIG.CHART_COLORS.palette,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: !!title, text: title, color: th.title, font: { size: 14, weight: '600' } },
          legend: { position: 'bottom', labels: { color: th.legend, font: { size: 12 }, boxWidth: 14 } }
        }
      }
    });
  }

  function bar(canvasId, labels, values, title) {
    var ctx = (typeof byId3dx === 'function' ? byId3dx(canvasId) : document.getElementById(canvasId));
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
    var th = themeColors();
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: title || '',
          data: values,
          backgroundColor: APP_CONFIG.CHART_COLORS.primary,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: !!title, text: title, color: th.title, font: { size: 14, weight: '600' } },
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: th.text, font: { size: 11 } }, grid: { color: th.grid } },
          y: { beginAtZero: true, ticks: { color: th.text, font: { size: 11 } }, grid: { color: th.grid } }
        }
      }
    });
  }

  function render(metrics) {
    var ds = MetricsEngine.chartDatasets(metrics);
    var healthColors = (APP_CONFIG.CHART_COLORS && APP_CONFIG.CHART_COLORS.maturityHealth) ||
      ['#43a047', '#ffb300', '#e53935', '#78909c'];

    if (APP_CONFIG && APP_CONFIG.UI_CLEAN) {
      var matLabels = ['Bom (Aprovado)', 'Moderado (Em trabalho)', 'Ruim (Obsoleto)', 'Outros'];
      var matValues = [
        metrics.released || 0,
        metrics.inWork || 0,
        metrics.obsolete || 0,
        (metrics.byMaturity && metrics.byMaturity.other) || 0
      ];
      doughnut('chartMaturity', matLabels, matValues, 'Maturidade (Bom / Moderado / Ruim)', healthColors);
      bar('chartType', ds.type.labels.slice(0, 10), ds.type.values.slice(0, 10), 'Quantidade por tipo');
      bar('chartRevision', ds.revision.labels.slice(0, 10), ds.revision.values.slice(0, 10), 'Quantidade por revisão');
      doughnut('chartApproval', ds.approval.labels, ds.approval.values, 'Status de aprovação', healthColors);
      return;
    }
    doughnut('chartMaturity', ds.maturity.labels, ds.maturity.values, 'Por Maturidade');
    bar('chartType', ds.type.labels.slice(0, 12), ds.type.values.slice(0, 12), 'Por Tipo');
    bar('chartRevision', ds.revision.labels, ds.revision.values, 'Por Revisão');
    doughnut('chartApproval', ds.approval.labels, ds.approval.values, 'Aprovação');
  }

  return { init: init, render: render, destroyAll: destroyAll };
})();
