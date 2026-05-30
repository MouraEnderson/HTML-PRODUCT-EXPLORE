/**
 * @file ui/kpi-cards.js
 */
var KpiCards = (function () {
  'use strict';

  var container;

  function init(selector) {
    container = (typeof qs3dx === 'function' ? qs3dx(selector) : document.querySelector(selector));
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  }

  function renderHealth(metrics) {
    var total = metrics.totalItems || 0;
    if (!total) return '';
    var good = metrics.released || 0;
    var mod = metrics.inWork || 0;
    var bad = metrics.obsolete || 0;
    var other = (metrics.byMaturity && metrics.byMaturity.other) || 0;
    return (
      '<section class="maturity-health">' +
      '<div class="mh-card mh-good">' +
      '<span class="mh-face" aria-hidden="true">&#128522;</span>' +
      '<span class="mh-pct">' + pct(good, total) + '%</span>' +
      '<span class="mh-label">Bom — Aprovado</span>' +
      '<span class="mh-count">' + formatNum(good) + ' peças</span>' +
      '</div>' +
      '<div class="mh-card mh-moderate">' +
      '<span class="mh-face" aria-hidden="true">&#128528;</span>' +
      '<span class="mh-pct">' + pct(mod, total) + '%</span>' +
      '<span class="mh-label">Moderado — Em trabalho</span>' +
      '<span class="mh-count">' + formatNum(mod) + ' peças</span>' +
      '</div>' +
      '<div class="mh-card mh-bad">' +
      '<span class="mh-face" aria-hidden="true">&#128543;</span>' +
      '<span class="mh-pct">' + pct(bad + other, total) + '%</span>' +
      '<span class="mh-label">Ruim — Obsoleto / outro</span>' +
      '<span class="mh-count">' + formatNum(bad + other) + ' peças</span>' +
      '</div>' +
      '</section>'
    );
  }

  function render(metrics, anomalies) {
    if (!container) return;
    var clean = APP_CONFIG && APP_CONFIG.UI_CLEAN;
    var html = '';

    if (clean) {
      html += renderHealth(metrics);
      var cards = [
        { label: 'Total de peças', value: metrics.totalItems, cls: 'kpi-primary' },
        { label: 'Aprovadas (Bom)', value: metrics.released, cls: 'kpi-success' },
        { label: 'Em trabalho (Moderado)', value: metrics.inWork, cls: 'kpi-warning' },
        { label: 'Obsoletas (Ruim)', value: metrics.obsolete, cls: 'kpi-danger' }
      ];
      html += '<div class="kpi-row">' + cards.map(function (c) {
        return (
          '<div class="kpi-card ' + c.cls + '">' +
          '<span class="kpi-value">' + formatNum(c.value) + '</span>' +
          '<span class="kpi-label">' + c.label + '</span>' +
          '</div>'
        );
      }).join('') + '</div>';
      container.innerHTML = html;
      return;
    }

    var legacy = [
      { label: 'Total de Itens', value: metrics.totalItems, cls: 'kpi-primary' },
      { label: 'Aprovados / Released', value: metrics.released, cls: 'kpi-success' },
      { label: 'Em trabalho', value: metrics.inWork, cls: 'kpi-warning' },
      { label: 'Obsoletos', value: metrics.obsolete, cls: 'kpi-danger' },
      { label: 'Physical Products', value: metrics.physicalProducts, cls: 'kpi-info' },
      { label: 'Sem Physical Product', value: metrics.withoutPhysicalProduct, cls: 'kpi-neutral' },
      { label: 'Sem Aprovação', value: anomalies.summary.noApproval, cls: 'kpi-warning' },
      { label: 'Inconsistências', value: anomalies.summary.inconsistent, cls: 'kpi-danger' }
    ];
    container.innerHTML = legacy.map(function (c) {
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
