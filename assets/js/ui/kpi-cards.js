/**
 * @file ui/kpi-cards.js
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

  function overallHealthLabel(goodPct) {
    if (goodPct >= 70) return { text: 'Estrutura saudável', cls: 'health-ok' };
    if (goodPct >= 40) return { text: 'Estrutura moderada — revisar itens em trabalho', cls: 'health-warn' };
    return { text: 'Estrutura em atenção — muitos itens não aprovados', cls: 'health-bad' };
  }

  function renderHealth(metrics) {
    var total = metrics.totalItems || 0;
    if (!total) return '';
    var good = metrics.released || 0;
    var mod = metrics.inWork || 0;
    var bad = metrics.obsolete || 0;
    var other = (metrics.byMaturity && metrics.byMaturity.other) || 0;
    var goodPct = pct(good, total);
    var health = overallHealthLabel(goodPct);
    return (
      '<section class="maturity-health">' +
      '<div class="mh-card mh-good">' +
      '<span class="mh-face" aria-hidden="true">&#128522;</span>' +
      '<span class="mh-pct">' + goodPct + '%</span>' +
      '<span class="mh-label">Bom — Aprovado / Released</span>' +
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
      '<span class="mh-label">Ruim — Obsoleto / sem classificar</span>' +
      '<span class="mh-count">' + formatNum(bad + other) + ' peças</span>' +
      '</div>' +
      '</section>' +
      '<p class="bom-health-verdict ' + health.cls + '">' + health.text + ' (' + goodPct + '% aprovadas)</p>'
    );
  }

  function renderRules(metrics, anomalies) {
    var rules = (APP_CONFIG && APP_CONFIG.MATURITY_RULES_STATIC) || [];
    var total = metrics.totalItems || 0;
    var appr = metrics.byApproval || {};
    var list = rules.map(function (r) {
      return (
        '<li class="rule-' + r.level + '"><strong>' + escapeHtml(r.label) + ':</strong> ' +
        escapeHtml(r.states) + '</li>'
      );
    }).join('');

    return (
      '<div class="bom-rules-panel">' +
      '<h3 class="bom-rules-title">Regras de classificação (estáticas)</h3>' +
      '<ul class="bom-rules-list">' + list + '</ul>' +
      '<h3 class="bom-rules-title">Indicadores calculados agora</h3>' +
      '<ul class="bom-rules-stats">' +
      '<li><strong>Total de peças na E-BOM:</strong> ' + formatNum(total) + '</li>' +
      '<li><strong>Assemblies:</strong> ' + formatNum(metrics.totalAssemblies) +
      ' | <strong>Partes:</strong> ' + formatNum(metrics.totalParts) + '</li>' +
      '<li><strong>Profundidade máxima:</strong> nível ' + formatNum(metrics.maxLevel) + '</li>' +
      '<li><strong>Aprovação pendente:</strong> ' + formatNum(appr.pending) +
      ' | <strong>Sem aprovação (anomalia):</strong> ' + formatNum(anomalies.summary.noApproval) + '</li>' +
      '<li><strong>Com Physical Product:</strong> ' + formatNum(metrics.physicalProducts) +
      ' | <strong>Sem PP:</strong> ' + formatNum(metrics.withoutPhysicalProduct) + '</li>' +
      '</ul>' +
      '<p class="bom-rules-note">Classificação via <code>AttributeService.classifyMaturity()</code> ' +
      'comparando o campo Estado/Maturidade de cada linha com <code>MATURITY_STATES</code> em config.js.</p>' +
      '</div>'
    );
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
        { label: 'Obsoletas (Ruim)', value: metrics.obsolete, cls: 'kpi-danger' },
        { label: 'Assemblies', value: metrics.totalAssemblies, cls: 'kpi-info' },
        { label: 'Partes', value: metrics.totalParts, cls: 'kpi-neutral' },
        { label: 'Aprovação pendente', value: (metrics.byApproval && metrics.byApproval.pending) || 0, cls: 'kpi-warning' },
        { label: 'Inconsistências', value: anomalies.summary.inconsistent, cls: 'kpi-danger' }
      ];
      html += '<div class="kpi-row kpi-row-8">' + cards.map(function (c) {
        return (
          '<div class="kpi-card ' + c.cls + '">' +
          '<span class="kpi-value">' + formatNum(c.value) + '</span>' +
          '<span class="kpi-label">' + c.label + '</span>' +
          '</div>'
        );
      }).join('') + '</div>';
      container.innerHTML = html;
      if (rulesEl) rulesEl.innerHTML = renderRules(metrics, anomalies);
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
