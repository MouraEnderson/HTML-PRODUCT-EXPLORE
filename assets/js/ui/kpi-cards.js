/**
 * @file ui/kpi-cards.js
 */
var KpiCards = (function () {
  'use strict';

  var container;

  function init(selector) {
    container = (typeof qs3dx === 'function' ? qs3dx(selector) : document.querySelector(selector));
  }

  function render(metrics, anomalies) {
    if (!container) return;
    var cards = [
      { label: 'Total de Itens', value: metrics.totalItems, cls: 'kpi-primary' },
      { label: 'Aprovados / Released', value: metrics.released, cls: 'kpi-success' },
      { label: 'Em Desenvolvimento', value: metrics.inWork, cls: 'kpi-warning' },
      { label: 'Obsoletos', value: metrics.obsolete, cls: 'kpi-danger' },
      { label: 'Physical Products', value: metrics.physicalProducts, cls: 'kpi-info' },
      { label: 'Sem Physical Product', value: metrics.withoutPhysicalProduct, cls: 'kpi-neutral' },
      { label: 'Sem Aprovação', value: anomalies.summary.noApproval, cls: 'kpi-warning' },
      { label: 'Inconsistências', value: anomalies.summary.inconsistent, cls: 'kpi-danger' }
    ];

    container.innerHTML = cards.map(function (c) {
      return (
        '<div class="kpi-card ' + c.cls + '">' +
        '<span class="kpi-value">' + formatNum(c.value) + '</span>' +
        '<span class="kpi-label">' + c.label + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function formatNum(n) {
    return (n || 0).toLocaleString('pt-BR');
  }

  return { init: init, render: render };
})();
