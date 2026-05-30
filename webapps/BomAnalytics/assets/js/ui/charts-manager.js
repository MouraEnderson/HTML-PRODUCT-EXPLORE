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

  function doughnut(canvasId, labels, values, title) {
    var ctx = (typeof byId3dx === 'function' ? byId3dx(canvasId) : document.getElementById(canvasId));
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: APP_CONFIG.CHART_COLORS.palette,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: !!title, text: title },
          legend: { position: 'bottom' }
        }
      }
    });
  }

  function bar(canvasId, labels, values, title) {
    var ctx = (typeof byId3dx === 'function' ? byId3dx(canvasId) : document.getElementById(canvasId));
    if (!ctx || typeof Chart === 'undefined') return;
    if (charts[canvasId]) charts[canvasId].destroy();
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
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function render(metrics) {
    var ds = MetricsEngine.chartDatasets(metrics);
    doughnut('chartMaturity', ds.maturity.labels, ds.maturity.values, 'Por Maturidade');
    bar('chartType', ds.type.labels.slice(0, 12), ds.type.values.slice(0, 12), 'Por Tipo');
    bar('chartRevision', ds.revision.labels, ds.revision.values, 'Por Revisão');
    doughnut('chartApproval', ds.approval.labels, ds.approval.values, 'Aprovação');
  }

  return { init: init, render: render, destroyAll: destroyAll };
})();
