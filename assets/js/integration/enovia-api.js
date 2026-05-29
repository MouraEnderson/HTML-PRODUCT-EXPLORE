/**
 * @file integration/enovia-api.js
 * Endpoints REST ENOVIA — Engineering Item, BOM, Physical Product.
 */
var EnoviaApi = (function () {
  'use strict';

  var restBase = null;

  function init(spaceUrl) {
    restBase = CompassServices.buildRestBase(spaceUrl);
    return restBase;
  }

  function engItemUrl(physicalId) {
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.ENG_ITEM + '/' + m.ENG_ITEM_TYPE + '/' + encodeURIComponent(physicalId);
  }

  function engInstanceChildrenUrl(parentPhysicalId, skip, top) {
    skip = skip || 0;
    top = top || APP_CONFIG.BOM_LAZY_BATCH_SIZE;
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.ENG_ITEM + '/' + parentPhysicalId +
      '/dseng:EngInstance?$skip=' + skip + '&$top=' + top
    );
  }

  function physicalProductSearchUrl(relatedEngId) {
    var m = APP_CONFIG.MODELERS;
    return (
      restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE +
      '?$filter=dseng:engItem.physicalid eq \'' + relatedEngId + '\''
    );
  }

  function vpmReferenceUrl(physicalId) {
    return restBase + '/dsxcad/dsxcad:VPMReference/' + encodeURIComponent(physicalId);
  }

  function physicalProductUrl(physicalId) {
    var m = APP_CONFIG.MODELERS;
    return restBase + '/' + m.PHYSICAL_PRODUCT + '/' + m.PHYS_PRODUCT_TYPE + '/' + encodeURIComponent(physicalId);
  }

  function getEngItem(physicalId, expand) {
    var url = engItemUrl(physicalId);
    if (expand) {
      url += '?$expand=' + encodeURIComponent(expand);
    }
    return WafClient.get(url);
  }

  function getVpmReference(physicalId, expand) {
    var url = vpmReferenceUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  function getPhysicalProduct(physicalId, expand) {
    var url = physicalProductUrl(physicalId);
    if (expand) url += '?$expand=' + encodeURIComponent(expand);
    return WafClient.get(url);
  }

  /** Tenta carregar raiz por VPMReference, Physical Product ou EngItem. */
  function getProductRoot(physicalId, expand) {
    return getVpmReference(physicalId, expand)
      .catch(function () { return getPhysicalProduct(physicalId, expand); })
      .catch(function () { return getEngItem(physicalId, expand); });
  }

  function getEngItemBomExpand(physicalId) {
    return getEngItem(physicalId, APP_CONFIG.EXPAND.BOM_CHILDREN);
  }

  function getEngInstanceChildren(parentPhysicalId, skip, top) {
    return WafClient.get(engInstanceChildrenUrl(parentPhysicalId, skip, top));
  }

  function getPhysicalProductsForEngItem(engPhysicalId) {
    return WafClient.get(physicalProductSearchUrl(engPhysicalId));
  }

  function extractMembers(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (Array.isArray(response.member)) return response.member;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.infos)) return response.infos;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.items)) return response.items;
    if (response.member && Array.isArray(response.member.member)) return response.member.member;
    if (response.data && Array.isArray(response.data.items)) return response.data.items;
    if (response.data && Array.isArray(response.data.member)) return response.data.member;
    return [];
  }

  return {
    init: init,
    getEngItem: getEngItem,
    getVpmReference: getVpmReference,
    getPhysicalProduct: getPhysicalProduct,
    getProductRoot: getProductRoot,
    getEngItemBomExpand: getEngItemBomExpand,
    getEngInstanceChildren: getEngInstanceChildren,
    getPhysicalProductsForEngItem: getPhysicalProductsForEngItem,
    extractMembers: extractMembers,
    engItemUrl: engItemUrl
  };
})();
