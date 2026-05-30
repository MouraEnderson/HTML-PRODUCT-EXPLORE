/**
 * @file ui/kpi-cards.js
 * Marcadores estatísticos (formato cards da referência).
 */
var KpiCards = (function () {
  'use strict';

  var container;
  var rulesEl;

  function init(selector) {
    container = (typeof qs3dx === 'function' ? qs3dx(selector) : document.querySelector(selector));
    rulesEl = document.getElementById('bomRulesPanel');
  }

  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  }

  function renderRules(metrics, anomalies) {
    var rules = (APP_CONFIG && APP_CONFIG.MATURITY_RULES_STATIC) || [];
    var list = rules.map(function (r) {
      return (
        '<li class="rule-' + r.level + '"><strong>' + escapeHtml(r.label) + ':</strong> ' +
        escapeHtml(r.states) + '</li>'
      );
    }).join('');
    return (
      '<div class="bom-rules-panel">' +
      '<ul class="bom-rules-list">' + list + '</ul>' +
      '<p class="bom-rules-stats">' +
      formatNum(metrics.totalItems) + ' peças · ' +
      formatNum(metrics.totalAssemblies) + ' assemblies · prof. ' + formatNum(metrics.maxLevel) +
      '</p></div>'
    );
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Cards no estilo da referência: rótulo em cima, número grande colorido. */
  function renderStatMarkers(metrics, anomalies) {
    var total = metrics.totalItems || 0;
    var goodPct = pct(metrics.released, total);
    var pending = (metrics.byApproval && metrics.byApproval.pending) || 0;
    var atRisk = (metrics.inWork || 0) + (metrics.obsolete || 0) +
      ((metrics.byMaturity && metrics.byMaturity.other) || 0);

    var markers = [
      { tone: 'blue', label: 'Total de Peças', value: metrics.totalItems },
      { tone: 'green', label: 'Média Saúde (Bom %)', value: goodPct, suffix: '%' },
      { tone: 'red', label: 'Peças em Risco', value: atRisk },
      { tone: 'purple', label: 'Aprovação Pendente', value: pending }
    ];

    return markers.map(function (m) {
      var display = formatNum(m.value) + (m.suffix || '');
      return (
        '<div class="stat-marker stat-marker-' + m.tone + '">' +
        '<span class="stat-marker-label">' + escapeHtml(m.label) + '</span>' +
        '<span class="stat-marker-value">' + display + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function render(metrics, anomalies) {
    if (!container) return;
    var clean = APP_CONFIG && APP_CONFIG.UI_CLEAN;

    if (clean) {
      container.innerHTML = renderStatMarkers(metrics, anomalies);
      if (rulesEl) rulesEl.innerHTML = renderRules(metrics, anomalies);
      return;
    }

    var legacy = [
      { label: 'Total de Itens', value: metrics.totalItems, cls: 'kpi-primary' },
      { label: 'Aprovados', value: metrics.released, cls: 'kpi-success' },
      { label: 'Em trabalho', value: metrics.inWork, cls: 'kpi-warning' },
      { label: 'Obsoletos', value: metrics.obsolete, cls: 'kpi-danger' }
    ];
    container.innerHTML = legacy.map(function (c) {
      return (
        '<div class="kpi-card ' + c.cls + '">' +
        '<span class="kpi-value">' + formatNum(c.value) + '</span>' +
        '<span class="kpi-label">' + c.label + '</span></div>'
      );
    }).join('');
  }

  function formatNum(n) {
    if (typeof n === 'number' && n % 1 !== 0) {
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return (n || 0).toLocaleString('pt-BR');
  }

  return { init: init, render: render };
})();
