/**
 * @file processing/metrics-engine.js
 * KPIs e agregações gerenciais/técnicas.
 */
var MetricsEngine = (function () {
  'use strict';

  function aggregateNodes(nodes) {
    var byMaturity = { released: 0, in_work: 0, obsolete: 0, other: 0 };
    var byType = {};
    var byRevision = {};
    var byApproval = { approved: 0, pending: 0, other: 0 };
    var byOwner = {};
    var assemblies = 0;
    var parts = 0;
    var totalQty = 0;
    var withPP = 0;
    var withoutPP = 0;
    var maxLevel = 0;

    nodes.forEach(function (n) {
      var mat = AttributeService.classifyMaturity(n.maturity || n.state);
      byMaturity[mat] = (byMaturity[mat] || 0) + 1;

      var t = n.type || 'Unknown';
      byType[t] = (byType[t] || 0) + 1;

      var rev = n.revision || 'N/A';
      byRevision[rev] = (byRevision[rev] || 0) + 1;

      var appr = String(n.approval || '').toLowerCase();
      var matLabel = String(n.maturity || n.state || '').toLowerCase();
      if (
        (appr.indexOf('approv') >= 0 && appr.indexOf('pending') < 0) ||
        matLabel.indexOf('aprov') >= 0 ||
        matLabel === 'released' ||
        matLabel === 'frozen'
      ) {
        byApproval.approved++;
      } else if (appr.indexOf('pending') >= 0) byApproval.pending++;
      else byApproval.other++;

      if (n.isAssembly) assemblies++;
      else parts++;

      totalQty += n.quantity || 1;
      if (n.hasPhysicalProduct) withPP++;
      else withoutPP++;

      if (n.level > maxLevel) maxLevel = n.level;

      var ownerKey = ownerLabel(n.owner);
      byOwner[ownerKey] = (byOwner[ownerKey] || 0) + 1;
    });

    return aggregateResult(nodes, byMaturity, byType, byRevision, byApproval, byOwner, assemblies, parts, totalQty, withPP, withoutPP, maxLevel);
  }

  function aggregateResult(nodes, byMaturity, byType, byRevision, byApproval, byOwner, assemblies, parts, totalQty, withPP, withoutPP, maxLevel) {
    return {
      totalItems: nodes.length,
      totalAssemblies: assemblies,
      totalParts: parts,
      totalQuantity: totalQty,
      maxLevel: maxLevel,
      byMaturity: byMaturity,
      byType: byType,
      byRevision: byRevision,
      byApproval: byApproval,
      byOwner: byOwner,
      physicalProducts: withPP,
      withoutPhysicalProduct: withoutPP,
      released: byMaturity.released,
      inWork: byMaturity.in_work,
      obsolete: byMaturity.obsolete
    };
  }

  function compute(index) {
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    return aggregateNodes(nodes);
  }

  /** KPIs/gráficos sobre linhas filtradas (dinâmico com filtros). */
  function computeFromFlat(flatNodes) {
    return aggregateNodes(flatNodes || []);
  }

  function ownerLabel(raw) {
    var o = String(raw || '').trim();
    if (!o) return 'Sem proprietário';
    if (o.charAt(0) === '{') {
      try {
        var j = JSON.parse(o);
        o = j.label || j.name || j.displayName || o;
      } catch (e) {
        var m = o.match(/"label"\s*:\s*"([^"]+)"/i);
        if (m) o = m[1];
      }
    }
    if (o.length > 36) o = o.slice(0, 36) + '…';
    return o;
  }

  function groupOwnersForChart(byOwner, topN) {
    topN = topN || 8;
    var keys = Object.keys(byOwner || {}).sort(function (a, b) {
      return (byOwner[b] || 0) - (byOwner[a] || 0);
    });
    var legend = keys.map(function (k) {
      return { label: k, value: byOwner[k] || 0 };
    });
    var chartLabels = [];
    var chartValues = [];
    keys.slice(0, topN).forEach(function (k) {
      chartLabels.push(k);
      chartValues.push(byOwner[k] || 0);
    });
    var rest = keys.slice(topN);
    if (rest.length) {
      var otherSum = rest.reduce(function (acc, k) {
        return acc + (byOwner[k] || 0);
      }, 0);
      chartLabels.push('Outros (' + rest.length + ')');
      chartValues.push(otherSum);
    }
    return {
      chart: { labels: chartLabels, values: chartValues },
      legend: legend
    };
  }

  function chartDatasets(metrics) {
    var owners = metrics.byOwner || {};
    var grouped = groupOwnersForChart(owners, 8);
    return {
      owners: grouped.chart,
      ownersLegend: grouped.legend,
      maturity: {
        labels: ['Bom (Aprovado)', 'Moderado (Em trabalho)', 'Ruim (Obsoleto)', 'Outros'],
        values: [
          metrics.byMaturity.released,
          metrics.byMaturity.in_work,
          metrics.byMaturity.obsolete,
          metrics.byMaturity.other
        ]
      },
      type: {
        labels: Object.keys(metrics.byType),
        values: Object.values(metrics.byType)
      },
      revision: {
        labels: Object.keys(metrics.byRevision),
        values: Object.values(metrics.byRevision)
      },
      approval: {
        labels: ['Approved', 'Pending', 'Other'],
        values: [
          metrics.byApproval.approved,
          metrics.byApproval.pending,
          metrics.byApproval.other
        ]
      }
    };
  }

  return {
    compute: compute,
    computeFromFlat: computeFromFlat,
    chartDatasets: chartDatasets,
    ownerLabel: ownerLabel
  };
})();
