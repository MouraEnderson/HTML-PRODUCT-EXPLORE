/**
 * @file services/physical-product-service.js
 * Resolução Engineering Item ↔ Physical Product.
 */
var PhysicalProductService = (function () {
  'use strict';

  var cache = {};

  function extractPhysicalIds(response) {
    var members = EnoviaApi.extractMembers(response);
    return members.map(function (m) {
      return {
        physicalid: m.physicalid || m.id,
        name: m.name || m.title || '',
        revision: m.revision || '',
        state: m.state || m.current || ''
      };
    });
  }

  function enrichNodes(index, options) {
    options = options || {};
    var batchSize = options.batchSize || 20;
    var ids = Object.keys(index);
    var queue = ids.filter(function (id) { return !cache[id]; });
    var results = {};

    function processBatch(start) {
      var slice = queue.slice(start, start + batchSize);
      if (!slice.length) return Promise.resolve(results);

      return Promise.all(slice.map(function (engId) {
        if (APP_CONFIG.DEMO_MODE) {
          var mock = index[engId].level % 3 !== 0;
          cache[engId] = mock ? [{ physicalid: 'PP_' + engId, name: 'PP-' + index[engId].name }] : [];
          return cache[engId];
        }
        return EnoviaApi.getPhysicalProductsForEngItem(engId)
          .then(extractPhysicalIds)
          .catch(function () { return []; })
          .then(function (pps) {
            cache[engId] = pps;
            return pps;
          });
      })).then(function () {
        return processBatch(start + batchSize);
      });
    }

    return processBatch(0).then(function () {
      sliceApply(index);
      return index;
    });

    function sliceApply(idx) {
      Object.keys(idx).forEach(function (id) {
        var pps = cache[id] || [];
        idx[id].physicalProductIds = pps.map(function (p) { return p.physicalid; });
        idx[id].hasPhysicalProduct = pps.length > 0;
        idx[id].physicalProductCount = pps.length;
      });
    }
  }

  function clearCache() {
    cache = {};
  }

  return {
    enrichNodes: enrichNodes,
    clearCache: clearCache
  };
})();
