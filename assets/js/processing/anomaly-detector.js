/**
 * @file processing/anomaly-detector.js
 * Detecção de estruturas incompletas, sem aprovação e inconsistentes.
 */
var AnomalyDetector = (function () {
  'use strict';

  function detect(index) {
    var nodes = Object.keys(index).map(function (k) { return index[k]; });
    var duplicateMap = {};
    var issues = [];

    nodes.forEach(function (n) {
      var key = n.duplicateKey || n.name;
      if (!duplicateMap[key]) duplicateMap[key] = [];
      duplicateMap[key].push(n.physicalid);
    });

    Object.keys(duplicateMap).forEach(function (key) {
      if (duplicateMap[key].length > 1) {
        issues.push({
          type: 'duplicate',
          severity: 'warning',
          message: 'Item duplicado na estrutura: ' + key,
          physicalids: duplicateMap[key]
        });
      }
    });

    nodes.forEach(function (n) {
      if (n.isAssembly && n.loaded && n.childrenIds.length === 0) {
        issues.push({
          type: 'incomplete',
          severity: 'info',
          message: 'Assembly sem filhos: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      var appr = String(n.approval || '').toLowerCase();
      if (appr.indexOf('pending') >= 0 || appr === 'unknown' || appr === '') {
        issues.push({
          type: 'no_approval',
          severity: 'warning',
          message: 'Sem aprovação: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      if (!n.hasPhysicalProduct && !n.isAssembly) {
        issues.push({
          type: 'no_physical_product',
          severity: 'warning',
          message: 'Sem Physical Product: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }

      var mat = AttributeService.classifyMaturity(n.state);
      if (mat === 'obsolete' && n.childrenIds.length > 0) {
        issues.push({
          type: 'inconsistent',
          severity: 'error',
          message: 'Item obsoleto com filhos ativos: ' + (n.name || n.physicalid),
          physicalid: n.physicalid
        });
      }
    });

    var summary = {
      duplicates: issues.filter(function (i) { return i.type === 'duplicate'; }).length,
      incomplete: issues.filter(function (i) { return i.type === 'incomplete'; }).length,
      noApproval: issues.filter(function (i) { return i.type === 'no_approval'; }).length,
      noPhysicalProduct: issues.filter(function (i) { return i.type === 'no_physical_product'; }).length,
      inconsistent: issues.filter(function (i) { return i.type === 'inconsistent'; }).length,
      total: issues.length
    };

    return { issues: issues, summary: summary };
  }

  return { detect: detect };
})();
